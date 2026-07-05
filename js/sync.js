// ── Real-time sync (WebRTC / PeerJS) ─────────────────────────
// Requires internet for the initial handshake only.
// After that, data flows directly device-to-device (P2P).

const SYNC_PREFIX   = 'px26-';
const SK_SESSION    = 'px26-session'; // persists role+code across tab suspensions

let _peer = null;
let _conn = null;

// ── Outbound broadcasts ───────────────────────────────────────
function syncBroadcastStatus(id, status) {
  _send({ t: 's', id, st: status });
}

function syncBroadcastFull() {
  // bundle is intentionally excluded — each device keeps its own negotiation workspace
  _send({ t: 'f', stickers, states: stickerState });
}

function syncBroadcastLock() {
  _send({ t: 'lock', ids: [...bundleSet] });
}

function _send(msg) {
  if (_conn && _conn.open) _conn.send(msg);
}

// ── Inbound apply ─────────────────────────────────────────────
function _apply(msg) {
  if (msg.t === 'f') {
    if (msg.stickers && msg.stickers.length > 0) {
      stickers = msg.stickers;
      localStorage.setItem(SK.data, JSON.stringify(stickers));
    }
    Object.assign(stickerState, msg.states);
    // bundle intentionally not applied — each device keeps its own negotiation workspace
    saveState();
    const onImport = !document.getElementById('import-screen').hidden;
    if (onImport) {
      launchApp();
    } else {
      renderInventory();
      refreshChipCounts();
      refreshBundleUI();
    }
  } else if (msg.t === 's') {
    stickerState[msg.id] = msg.st;
    if (msg.st === 'Sold') bundleSet.delete(msg.id); // remove from local bundle if sold remotely
    remoteBundleSet.delete(msg.id);                  // release remote lock when status finalised
    saveState();
    refreshCard(msg.id);
    refreshChipCounts();
    refreshBundleUI();
  } else if (msg.t === 'lock') {
    const prev = remoteBundleSet;
    remoteBundleSet = new Set(msg.ids);
    // refresh cards that changed lock state
    const changed = new Set([...prev, ...remoteBundleSet]);
    changed.forEach(id => refreshCard(id));
  }
}

// ── Host ──────────────────────────────────────────────────────
function syncCreateSession() {
  if (stickers.length === 0) {
    _showError('Primero importa tu inventario. El otro dispositivo lo recibirá al conectarse.');
    return;
  }
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  localStorage.setItem(SK_SESSION, JSON.stringify({ role: 'host', code }));
  _createHost(code);
}

function _createHost(code) {
  if (_peer) { try { _peer.destroy(); } catch {} _peer = null; }
  _conn = null;
  _peer = new Peer(SYNC_PREFIX + code, { debug: 0 });

  _peer.on('open', () => _showCode(code));
  _peer.on('error', e => {
    if (e.type === 'unavailable-id') {
      // Code collision — generate new one and try again
      const newCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      localStorage.setItem(SK_SESSION, JSON.stringify({ role: 'host', code: newCode }));
      _createHost(newCode);
    } else {
      _showError('Error al crear sesión. Verifica tu conexión.');
    }
  });
  _peer.on('connection', c => {
    _conn = c;
    c.on('open',  () => { syncBroadcastFull(); syncBroadcastLock(); _showConnected('Dispositivo conectado'); });
    c.on('data',  _apply);
    c.on('close', _onDisconnect);
    c.on('error', _onDisconnect);
  });
}

// ── Guest ─────────────────────────────────────────────────────
// Retries up to MAX_JOIN_ATTEMPTS if the host peer is not yet available.
// This covers the window where User A is switching back to the app
// and the host auto-reconnect hasn't completed yet.
const MAX_JOIN_ATTEMPTS = 10;
const JOIN_RETRY_MS     = 6000; // 6 s × 10 = ~60 s total window

function syncJoinSession(code) {
  if (!code || code.trim().length < 6) return;
  const normalized = code.trim().toUpperCase();
  localStorage.setItem(SK_SESSION, JSON.stringify({ role: 'guest', code: normalized }));
  _joinAttempt(normalized, 1);
}

function _joinAttempt(code, attempt) {
  _showJoining(attempt);
  if (_peer) { try { _peer.destroy(); } catch {} _peer = null; }
  _conn = null;
  _peer = new Peer({ debug: 0 });

  _peer.on('open', () => {
    _conn = _peer.connect(SYNC_PREFIX + code);
    _conn.on('open',  () => { syncBroadcastLock(); _showConnected('Conectado al anfitrión'); });
    _conn.on('data',  _apply);
    _conn.on('close', _onDisconnect);
    _conn.on('error', () => _retryOrFail(code, attempt, 'Código incorrecto o sesión expirada.'));
  });
  _peer.on('error', e => {
    if (e.type === 'peer-unavailable') {
      // Host not ready yet (app suspended or reconnecting) — retry silently
      _retryOrFail(code, attempt, 'El anfitrión no está disponible. Pídele que abra la app.');
    } else {
      _showError('Error de conexión. Verifica tu red.');
    }
  });
}

function _retryOrFail(code, attempt, finalMsg) {
  if (attempt < MAX_JOIN_ATTEMPTS) {
    if (_peer) { try { _peer.destroy(); } catch {} _peer = null; }
    setTimeout(() => _joinAttempt(code, attempt + 1), JOIN_RETRY_MS);
  } else {
    _showError(finalMsg);
  }
}

// ── Auto-reconnect after mobile tab suspension ────────────────
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;           // tab going to background — nothing to do
  if (_conn && _conn.open) return;       // still connected — fine

  const saved = _getSavedSession();
  if (!saved || saved.role !== 'host') return;

  // Tab returned from background and host peer is dead — silently re-create with same code
  // The other device will reconnect automatically when the peer is ready
  _createHost(saved.code);
});

function _getSavedSession() {
  try { return JSON.parse(localStorage.getItem(SK_SESSION)); } catch { return null; }
}

// ── Disconnect ────────────────────────────────────────────────
function syncDisconnect() {
  localStorage.removeItem(SK_SESSION);
  if (_conn)  { try { _conn.close();   } catch {} _conn  = null; }
  if (_peer)  { try { _peer.destroy(); } catch {} _peer = null; }
  _onDisconnect();
}

function _onDisconnect() {
  _conn = null;
  // release all remote negotiation locks
  remoteBundleSet = new Set();
  renderInventory();
  _setState('sync-idle');
  const btn = document.getElementById('btn-sync');
  if (btn) btn.classList.remove('sync-active');
}

// ── Panel UI states ───────────────────────────────────────────
function openSyncPanel() {
  // Hide "Crear sesión" when no inventory is loaded — device can only join as guest
  document.getElementById('sync-host-section').hidden = (stickers.length === 0);
  document.getElementById('sync-panel').hidden   = false;
  document.getElementById('sync-overlay').hidden = false;
}

function closeSyncPanel() {
  document.getElementById('sync-panel').hidden   = true;
  document.getElementById('sync-overlay').hidden = true;
}

function syncRetry() { _setState('sync-idle'); }

function _showCode(code) {
  document.getElementById('sync-code-val').textContent   = code;
  document.getElementById('sync-status-msg').textContent = 'Esperando conexión…';
  _setState('sync-hosting');
}

function _showJoining(attempt) {
  document.getElementById('sync-join-msg').textContent = attempt > 1
    ? `Esperando al anfitrión… (${attempt}/${MAX_JOIN_ATTEMPTS})`
    : 'Conectando…';
  _setState('sync-joining');
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
  ['sync-idle', 'sync-hosting', 'sync-joining', 'sync-connected', 'sync-error'].forEach(id => {
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

async function syncShareWhatsApp() {
  const code    = document.getElementById('sync-code-val').textContent;
  const baseUrl = location.origin + location.pathname.replace(/index\.html$/, '');
  const joinUrl = `${baseUrl}?join=${code}`;
  const shareText = `Únete a mi inventario Panini Exchange 🃏\n${joinUrl}`;

  // Native share sheet (mobile) — browser stays in foreground after sharing
  if (navigator.share) {
    try {
      await navigator.share({ text: shareText });
      return;
    } catch { /* user cancelled or share failed — fall through */ }
  }

  // Desktop fallback: open WhatsApp directly
  window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
}
