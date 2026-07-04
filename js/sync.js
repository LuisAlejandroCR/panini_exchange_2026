// ── Real-time sync (WebRTC / PeerJS) ─────────────────────────
// Requires internet for the initial handshake only.
// After that, data flows directly device-to-device (P2P).
// Option B (PartyKit / Liveblocks) would add offline resilience if needed.

const SYNC_PREFIX = 'px26-';

let _peer = null;
let _conn = null;

// ── Outbound broadcasts ───────────────────────────────────────
function syncBroadcastStatus(id, status) {
  _send({ t: 's', id, st: status });
}

function syncBroadcastBundle() {
  _send({ t: 'b', ids: [...bundleSet] });
}

function syncBroadcastFull() {
  _send({ t: 'f', states: stickerState, bundle: [...bundleSet] });
}

function _send(msg) {
  if (_conn && _conn.open) _conn.send(msg);
}

// ── Inbound apply ─────────────────────────────────────────────
function _apply(msg) {
  if (msg.t === 'f') {
    Object.assign(stickerState, msg.states);
    bundleSet = new Set(msg.bundle);
    saveState();
    renderInventory();
    refreshChipCounts();
    refreshBundleUI();
  } else if (msg.t === 's') {
    stickerState[msg.id] = msg.st;
    if (msg.st === 'Sold') bundleSet.delete(msg.id);
    saveState();
    refreshCard(msg.id);
    refreshChipCounts();
    refreshBundleUI();
  } else if (msg.t === 'b') {
    bundleSet = new Set(msg.ids);
    saveState();
    renderInventory();
    refreshBundleUI();
  }
}

// ── Host ──────────────────────────────────────────────────────
function syncCreateSession() {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  _peer = new Peer(SYNC_PREFIX + code, { debug: 0 });

  _peer.on('open', () => _showCode(code));
  _peer.on('error', e => {
    if (e.type === 'unavailable-id') syncCreateSession();
    else _showError('Error al crear sesión. Verifica tu conexión.');
  });
  _peer.on('connection', c => {
    _conn = c;
    c.on('open',  () => { syncBroadcastFull(); _showConnected('Dispositivo conectado'); });
    c.on('data',  _apply);
    c.on('close', _onDisconnect);
    c.on('error', _onDisconnect);
  });
}

// ── Guest ─────────────────────────────────────────────────────
function syncJoinSession(code) {
  if (!code || code.trim().length < 6) return;
  _showJoining();
  _peer = new Peer({ debug: 0 });

  _peer.on('open', () => {
    _conn = _peer.connect(SYNC_PREFIX + code.trim().toUpperCase());
    _conn.on('open',  () => _showConnected('Conectado al anfitrión'));
    _conn.on('data',  _apply);
    _conn.on('close', _onDisconnect);
    _conn.on('error', () => _showError('Código no encontrado o sesión expirada.'));
  });
  _peer.on('error', () => _showError('Error de conexión. Verifica el código.'));
}

// ── Disconnect ────────────────────────────────────────────────
function syncDisconnect() {
  if (_conn)  { try { _conn.close();   } catch {} _conn  = null; }
  if (_peer)  { try { _peer.destroy(); } catch {} _peer = null; }
  _onDisconnect();
}

function _onDisconnect() {
  _conn = null;
  _setState('sync-idle');
  const btn = document.getElementById('btn-sync');
  if (btn) btn.classList.remove('sync-active');
}

// ── Panel UI states ───────────────────────────────────────────
function openSyncPanel()  {
  document.getElementById('sync-panel').hidden   = false;
  document.getElementById('sync-overlay').hidden = false;
}

function closeSyncPanel() {
  document.getElementById('sync-panel').hidden   = true;
  document.getElementById('sync-overlay').hidden = true;
}

function syncRetry() { _setState('sync-idle'); }

function _showCode(code) {
  document.getElementById('sync-code-val').textContent  = code;
  document.getElementById('sync-status-msg').textContent = 'Esperando conexión…';
  _setState('sync-hosting');
}

function _showJoining() {
  document.getElementById('sync-code-val').textContent  = '——';
  document.getElementById('sync-status-msg').textContent = 'Conectando…';
  _setState('sync-hosting');
}

function _showConnected(msg) {
  document.getElementById('sync-connected-msg').textContent = msg;
  _setState('sync-connected');
  document.getElementById('btn-sync').classList.add('sync-active');
  closeSyncPanel();
}

function _showError(msg) {
  document.getElementById('sync-error-msg').textContent = msg;
  _setState('sync-error');
}

function _setState(activeId) {
  ['sync-idle', 'sync-hosting', 'sync-connected', 'sync-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.hidden = (id !== activeId);
  });
}

async function syncCopyCode() {
  const code = document.getElementById('sync-code-val').textContent;
  const btn  = document.getElementById('sync-copy-btn');
  try {
    await navigator.clipboard.writeText(code);
    btn.textContent = '✅ ¡Copiado!';
    setTimeout(() => { btn.textContent = '📋 Copiar código'; }, 2000);
  } catch {
    prompt('Comparte este código:', code);
  }
}
