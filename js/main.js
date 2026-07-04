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

// ── Init ──────────────────────────────────────────────────────
loadStorage();
wireDropZone();
if (stickers.length > 0) launchApp();
else document.getElementById('import-screen').hidden = false;
