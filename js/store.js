// ── Storage keys ─────────────────────────────────────────────
const SK = { data: 'panini_data', states: 'panini_states', bundle: 'panini_bundle' };

// ── App state ─────────────────────────────────────────────────
let stickers        = [];
let stickerState    = {};        // { id: 'Available'|'Reserved'|'Sold' }
let bundleSet       = new Set(); // local negotiation workspace
let remoteBundleSet = new Set(); // stickers locked by the other device

// ── Persistence ───────────────────────────────────────────────
function saveState() {
  localStorage.setItem(SK.states, JSON.stringify(stickerState));
  localStorage.setItem(SK.bundle, JSON.stringify([...bundleSet]));
}

function loadStorage() {
  try {
    const d = localStorage.getItem(SK.data);   if (d) stickers     = JSON.parse(d);
    const s = localStorage.getItem(SK.states); if (s) stickerState = JSON.parse(s);
    const b = localStorage.getItem(SK.bundle); if (b) bundleSet     = new Set(JSON.parse(b));
  } catch { /* corrupted — start fresh */ }
}

function clearStorage() {
  [SK.data, SK.states, SK.bundle].forEach(k => localStorage.removeItem(k));
  stickers = []; stickerState = {}; bundleSet = new Set();
}

// ── Column aliases ────────────────────────────────────────────
// Accepts both English and Spanish column names
const ALIASES = {
  id:           ['id', 'laminaid', 'sticker_id', 'card_id'],
  sticker:      ['sticker', 'lamina', 'name', 'nombre', 'card', 'tarjeta'],
  category:     ['category', 'categoria', 'cat'],
  type:         ['type', 'tipo'],
  price_low:    ['price_low', 'vender_low', 'sell_low', 'min_price', 'precio_min'],
  price_high:   ['price_high', 'vender_high', 'sell_high', 'max_price', 'precio_max'],
  publish_low:  ['publish_low', 'publicar_low', 'pub_low', 'list_low'],
  publish_high: ['publish_high', 'publicar_high', 'pub_high', 'list_high'],
  status:       ['status', 'estado', 'state'],
  quantity:     ['quantity', 'cantidad', 'qty'],
  condition:    ['condition', 'condicion'],
  notes:        ['notes', 'notas', 'note']
};

function normalizeRow(raw) {
  const lower = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toLowerCase().trim(), v]));
  const out = {};
  for (const [field, aliases] of Object.entries(ALIASES)) {
    for (const a of aliases) {
      if (lower[a] !== undefined) { out[field] = lower[a]; break; }
    }
  }
  return out;
}

function buildStickers(rows) {
  return rows.map((row, i) => {
    const n = normalizeRow(row);
    return {
      id:           n.id || `S${i + 1}`,
      sticker:      (n.sticker || '').trim(),
      category:     (n.category || '').trim(),
      type:         (n.type || '').trim(),
      price_low:    parseFloat(n.price_low)    || 0,
      price_high:   parseFloat(n.price_high)   || 0,
      publish_low:  parseFloat(n.publish_low)  || 0,
      publish_high: parseFloat(n.publish_high) || 0,
      status:       n.status || 'Available',
      quantity:     parseInt(n.quantity) || 1,
      condition:    (n.condition || '').trim(),
      notes:        (n.notes || '').trim()
    };
  }).filter(s => s.sticker && (s.price_low > 0 || s.publish_low > 0));
}

// ── Status helpers ────────────────────────────────────────────
const STATUS_CYCLE  = { Available: 'Reserved', Reserved: 'Available', Sold: 'Available' };
const STATUS_LABELS = { Available: 'Disponible', Reserved: 'Reservado', Sold: 'Vendido' };
const STATUS_CLASS  = { Available: 's-available', Reserved: 's-reserved', Sold: 's-sold' };

function getStatus(id) { return stickerState[id] || 'Available'; }

function cycleStatus(id) {
  stickerState[id] = STATUS_CYCLE[getStatus(id)];
  if (stickerState[id] === 'Sold') bundleSet.delete(id);
  saveState();
  if (typeof syncBroadcastStatus === 'function') syncBroadcastStatus(id, stickerState[id]);
}

function markAsSold(id) {
  stickerState[id] = 'Sold';
  bundleSet.delete(id);
  saveState();
  if (typeof syncBroadcastStatus === 'function') syncBroadcastStatus(id, 'Sold');
}

// ── Bundle helpers ────────────────────────────────────────────
function toggleBundle(id) {
  if (getStatus(id) === 'Sold') return;
  if (remoteBundleSet.has(id) && !bundleSet.has(id)) return; // locked by another device
  bundleSet.has(id) ? bundleSet.delete(id) : bundleSet.add(id);
  saveState();
  if (typeof syncBroadcastLock === 'function') syncBroadcastLock();
}

function removeFromBundle(id) {
  bundleSet.delete(id);
  saveState();
  if (typeof syncBroadcastLock === 'function') syncBroadcastLock();
}

function reserveBundle() {
  const ids = [...bundleSet];
  for (const id of ids) stickerState[id] = 'Reserved';
  bundleSet.clear();
  saveState();
  if (typeof syncBroadcastStatus === 'function') {
    for (const id of ids) syncBroadcastStatus(id, 'Reserved');
  }
  if (typeof syncBroadcastLock === 'function') syncBroadcastLock(); // release locks
}

// ── Discount logic ────────────────────────────────────────────
function getDiscount(n) {
  if (n >= 7) return 0.12;
  if (n >= 4) return 0.10;
  if (n >= 2) return 0.05;
  return 0;
}

function calcBundle() {
  const items       = stickers.filter(s => bundleSet.has(s.id));
  const count       = items.length;
  const sumPubLow   = items.reduce((a, s) => a + s.publish_low,  0);
  const sumPubHigh  = items.reduce((a, s) => a + s.publish_high, 0);
  const sumPriceLow = items.reduce((a, s) => a + s.price_low,    0);
  const discount    = getDiscount(count);
  const suggested   = Math.round(sumPubLow * (1 - discount));
  const offer       = Math.max(suggested, sumPriceLow);
  const floored     = suggested < sumPriceLow;
  return { items, count, sumPubLow, sumPubHigh, sumPriceLow, discount, offer, floored };
}

// ── Formatting ────────────────────────────────────────────────
const fmtFull  = n => '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const fmtShort = n => (n >= 1000) ? '$' + Math.round(n / 1000) + 'K' : '$' + (n || 0);

// ── Category badge class ──────────────────────────────────────
function catClass(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('jugador') || c.includes('player'))   return 'cat-jugador';
  if (c.includes('escudo')  || c.includes('shield'))   return 'cat-escudo';
  if (c.includes('especial') || c.includes('extra'))   return 'cat-especial';
  if (c.includes('museum')  || c.includes('museo'))    return 'cat-museum';
  if (c.includes('we are'))                            return 'cat-weare';
  return 'cat-other';
}
