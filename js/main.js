// ── Navigation ────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('pane-' + name).classList.add('active');
  document.getElementById('tab-'  + name).classList.add('active');
}

function launchApp() {
  document.getElementById('import-screen').hidden = true;
  document.getElementById('app').hidden = false;
  renderInventory();
  refreshBundleUI();
}

function confirmReset() {
  if (!confirm('¿Importar nuevo archivo? Se perderán el estado y las selecciones actuales.')) return;
  clearStorage();
  document.getElementById('app').hidden = true;
  document.getElementById('import-screen').hidden = false;
}

// ── File import ───────────────────────────────────────────────
async function importFile(file) {
  const errEl = document.getElementById('import-error');
  errEl.style.display = 'none';

  const dz = document.getElementById('drop-zone');
  dz.innerHTML = `<div class="spinner"></div><div class="dz-label">Procesando…</div>`;

  try {
    let rows;
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'csv') {
      rows = parseCSV(await file.text());
    } else if (ext === 'xlsx' || ext === 'xls') {
      rows = await parseXLSX(await file.arrayBuffer());
    } else {
      throw new Error('Formato no soportado. Usa .csv o .xlsx');
    }

    if (!rows || rows.length === 0) throw new Error('El archivo está vacío o sin datos.');

    const sample = normalizeRow(rows[0]);
    if (!sample.sticker)
      throw new Error('Columna "sticker" (o "lamina") no encontrada.');
    if (!sample.price_low && !sample.publish_low)
      throw new Error('Se requiere al menos "price_low" o "publish_low".');

    const data = buildStickers(rows);
    if (data.length === 0) throw new Error('No se encontraron láminas válidas.');

    stickers     = data;
    stickerState = {};
    bundleSet    = new Set();
    for (const s of stickers) {
      stickerState[s.id] = ['Available', 'Reserved', 'Sold'].includes(s.status)
        ? s.status : 'Available';
    }

    localStorage.setItem(SK.data, JSON.stringify(stickers));
    saveState();
    launchApp();

  } catch (e) {
    errEl.textContent = '❌ ' + e.message;
    errEl.style.display = 'block';
    resetDropZone();
  }
}

// ── Drop zone ─────────────────────────────────────────────────
function resetDropZone() {
  document.getElementById('drop-zone').innerHTML = `
    <input type="file" id="file-input" accept=".csv,.xlsx,.xls">
    <div class="dz-icon">📂</div>
    <div class="dz-label">Arrastra tu archivo aquí</div>
    <div class="dz-hint">o toca para elegir · CSV o Excel (.xlsx)</div>`;
  wireDropZone();
}

function wireDropZone() {
  const zone  = document.getElementById('drop-zone');
  const input = document.getElementById('file-input');
  if (!zone || !input) return;

  zone.addEventListener('click',     () => input.click());
  input.addEventListener('change',   e  => { if (e.target.files[0]) importFile(e.target.files[0]); });
  zone.addEventListener('dragover',  e  => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) importFile(e.dataTransfer.files[0]);
  });
}

// ── Template download ─────────────────────────────────────────
function downloadTemplate() {
  const lines = [
    '# PANINI EXCHANGE 2026 — Plantilla de inventario',
    '# Columnas requeridas: sticker, price_low, publish_low',
    '# También acepta nombres en español: lamina, vender_low, publicar_low, estado, cantidad, notas',
    '#',
    '# id          → (opcional) identificador único — se genera automáticamente si se omite',
    '# sticker     → (requerido) nombre de la lámina — ej: ARG01 Messi',
    '# category    → (opcional) tipo: Jugador, Escudo, Especial, Museum, WE ARE, otro',
    '# price_low   → (requerido) tu precio mínimo aceptable (tu costo real, solo tú lo ves)',
    '# price_high  → (opcional) precio máximo de venta',
    '# publish_low → (requerido) precio que publicas al comprador',
    '# publish_high→ (opcional) precio publicado máximo (muestra rango)',
    '# status      → (opcional) Available / Reserved / Sold  — por defecto: Available',
    '# quantity    → (opcional) cuántas unidades tienes — por defecto: 1',
    '# condition   → (opcional) estado físico de la lámina',
    '# notes       → (opcional) notas libres',
    'id,sticker,category,price_low,price_high,publish_low,publish_high,status,quantity,condition,notes',
    'S1,ARG01 Messi,Jugador,3000,5000,10000,15000,Available,1,,',
    'S2,BRA07 Vinicius,Jugador,2000,3000,8000,12000,Available,1,,',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'panini_exchange_template.csv' });
  a.click();
  URL.revokeObjectURL(url);
}

// ── Export current state ──────────────────────────────────────
function exportCurrentState() {
  if (stickers.length === 0) return;
  const headers = 'id,sticker,category,price_low,price_high,publish_low,publish_high,status,quantity,condition,notes';
  const rows = stickers.map(s => [
    s.id,
    `"${(s.sticker   || '').replace(/"/g, '""')}"`,
    `"${(s.category  || '').replace(/"/g, '""')}"`,
    s.price_low   || '',
    s.price_high  || '',
    s.publish_low || '',
    s.publish_high || '',
    stickerState[s.id] || 'Available',
    s.quantity  || 1,
    `"${(s.condition || '').replace(/"/g, '""')}"`,
    `"${(s.notes     || '').replace(/"/g, '""')}"`
  ].join(','));
  const csv  = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a    = Object.assign(document.createElement('a'), {
    href: url, download: `panini_exchange_${date}.csv`
  });
  a.click();
  URL.revokeObjectURL(url);
}

// ── Demo tour ─────────────────────────────────────────────────
const TOUR_TOTAL = 5;
let _tourStep = 1;

function initTour() {
  if (localStorage.getItem('px26-tour-done')) return;
  _tourStep = 1;
  _tourRenderDots();
  document.getElementById('tour-overlay').hidden = false;
}

function tourNext() {
  document.getElementById(`tour-step-${_tourStep}`).hidden = true;
  _tourStep++;
  if (_tourStep > TOUR_TOTAL) { tourClose(); return; }
  document.getElementById(`tour-step-${_tourStep}`).hidden = false;
  _tourRenderDots();
  document.getElementById('tour-btn-next').textContent =
    _tourStep === TOUR_TOTAL ? '¡Empezar! ✓' : 'Siguiente →';
}

function tourClose() {
  localStorage.setItem('px26-tour-done', '1');
  document.getElementById('tour-overlay').hidden = true;
}

function _tourRenderDots() {
  const el = document.getElementById('tour-dots');
  el.innerHTML = '';
  for (let i = 1; i <= TOUR_TOTAL; i++) {
    const d = document.createElement('span');
    d.className = 'tour-dot' + (i === _tourStep ? ' active' : '');
    el.appendChild(d);
  }
}

// ── Deep-link join (?join=CODE) ───────────────────────────────
function _checkJoinParam() {
  const code = new URLSearchParams(location.search).get('join');
  if (!code || code.length < 6) return;
  history.replaceState(null, '', location.pathname); // clean URL so refresh doesn't re-trigger
  openSyncPanel();
  syncJoinSession(code);
}

// ── Init ──────────────────────────────────────────────────────
loadStorage();
wireDropZone();
if (stickers.length > 0) launchApp();
else {
  document.getElementById('import-screen').hidden = false;
  initTour();
}
_checkJoinParam();
