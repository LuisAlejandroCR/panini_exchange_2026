// ── Filter state ──────────────────────────────────────────────
let activeFilter = 'all';
let searchQuery  = '';

// ══════════════════════════════════════════════════════════════
// INVENTORY VIEW
// ══════════════════════════════════════════════════════════════
function renderInventory() {
  const list = document.getElementById('sticker-list');
  list.querySelectorAll('.sticker-card').forEach(c => c.remove());
  for (const s of stickers) list.appendChild(buildCard(s));
  applyFilters();
  refreshChipCounts();
}

function buildCard(s) {
  const st       = getStatus(s.id);
  const inBundle = bundleSet.has(s.id);
  const isSold   = st === 'Sold';

  const card = document.createElement('div');
  card.className = `sticker-card${inBundle ? ' in-bundle' : ''}${isSold ? ' sold' : ''}`;
  card.dataset.id     = s.id;
  card.dataset.status = st;
  card.dataset.search = s.sticker.toLowerCase();

  const pubTxt = s.publish_high > s.publish_low
    ? `Pub ${fmtShort(s.publish_low)}–${fmtShort(s.publish_high)}`
    : `Pub ${fmtShort(s.publish_low)}`;

  card.innerHTML = `
    <div class="card-info">
      <span class="card-name">${s.sticker}</span>
      <div class="card-meta">
        ${s.category ? `<span class="cat-badge ${catClass(s.category)}">${s.category}</span>` : ''}
        <span class="card-price">${pubTxt} &middot; Mín ${fmtShort(s.price_low)}</span>
      </div>
    </div>
    <div class="card-actions">
      <button class="status-btn ${STATUS_CLASS[st]}"
              onclick="onCycleStatus('${s.id}')">${st === 'Reserved' ? '↩ ' : ''}${STATUS_LABELS[st]}</button>
      ${st === 'Reserved'
        ? `<button class="add-btn sell-confirm" onclick="onMarkSold('${s.id}')">✓ Vender</button>`
        : `<button class="add-btn${inBundle ? ' in-bundle' : ''}"
                   onclick="onToggleBundle('${s.id}')"
                   ${isSold ? 'disabled' : ''}>${inBundle ? '✓' : '+'}</button>`
      }
    </div>`;
  return card;
}

function refreshCard(id) {
  const s   = stickers.find(x => x.id === id);
  const old = document.querySelector(`.sticker-card[data-id="${id}"]`);
  if (!s || !old) return;
  const updated = buildCard(s);
  old.replaceWith(updated);
  applyCardVisibility(updated);
}

function applyCardVisibility(card) {
  const vis = (activeFilter === 'all' || card.dataset.status === activeFilter)
           && (!searchQuery || card.dataset.search.includes(searchQuery));
  card.style.display = vis ? '' : 'none';
}

function applyFilters() {
  searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
  let visible = 0;
  document.querySelectorAll('.sticker-card').forEach(c => {
    applyCardVisibility(c);
    if (c.style.display !== 'none') visible++;
  });
  document.getElementById('no-results').style.display = visible === 0 ? 'block' : 'none';
}

function setFilter(f) {
  activeFilter = f;
  document.querySelectorAll('.chip').forEach(c =>
    c.classList.toggle('active', c.dataset.filter === f));
  applyFilters();
}

function refreshChipCounts() {
  const counts = { all: stickers.length, Available: 0, Reserved: 0, Sold: 0 };
  for (const s of stickers) { const st = getStatus(s.id); if (st in counts) counts[st]++; }
  document.querySelector('[data-filter="all"]').textContent       = `Todo (${counts.all})`;
  document.querySelector('[data-filter="Available"]').textContent = `Disponible (${counts.Available})`;
  document.querySelector('[data-filter="Reserved"]').textContent  = `Reservado (${counts.Reserved})`;
  document.querySelector('[data-filter="Sold"]').textContent      = `Vendido (${counts.Sold})`;
}

// ══════════════════════════════════════════════════════════════
// BUNDLE VIEW
// ══════════════════════════════════════════════════════════════
function refreshBundleUI() {
  const count = bundleSet.size;
  const badge = document.getElementById('bundle-badge');
  badge.textContent  = count || '';
  badge.dataset.count = count;

  document.getElementById('bundle-empty').hidden  = count > 0;
  document.getElementById('bundle-filled').hidden = count === 0;
  if (count === 0) return;

  const { items, sumPubLow, sumPubHigh, sumPriceLow, discount, offer, floored } = calcBundle();

  // Item list
  const list = document.getElementById('bundle-list');
  list.innerHTML = '';
  for (const s of items) {
    const el = document.createElement('div');
    el.className = 'bundle-item';
    el.innerHTML = `
      <span class="bi-name">${s.sticker}</span>
      <span class="bi-price">${fmtFull(s.publish_low)}</span>
      <button class="bi-remove" onclick="onRemoveBundle('${s.id}')">✕</button>`;
    list.appendChild(el);
  }

  // Summary
  document.getElementById('sum-count').textContent =
    `${count} lámina${count !== 1 ? 's' : ''}`;
  document.getElementById('discount-pill').textContent =
    discount > 0 ? `${discount * 100 | 0}% descuento` : 'Sin descuento';

  document.getElementById('sum-pub').textContent = sumPubHigh > sumPubLow
    ? `${fmtFull(sumPubLow)} – ${fmtFull(sumPubHigh)}`
    : fmtFull(sumPubLow);

  const offerEl = document.getElementById('sum-offer');
  offerEl.textContent = fmtFull(offer);
  offerEl.className   = 'sum-offer-val' + (floored ? ' floored' : '');

  const floorNeg = Math.max(sumPriceLow, Math.round(offer * 0.93));
  document.getElementById('sum-min').textContent = fmtFull(floorNeg);

  document.getElementById('floor-warning').classList.toggle('show', floored);
}

// ══════════════════════════════════════════════════════════════
// EVENT HANDLERS (called from inline onclick)
// ══════════════════════════════════════════════════════════════
function onCycleStatus(id) {
  cycleStatus(id);
  refreshCard(id);
  refreshChipCounts();
  refreshBundleUI();
}

function onToggleBundle(id) {
  toggleBundle(id);
  refreshCard(id);
  refreshBundleUI();
}

function onRemoveBundle(id) {
  removeFromBundle(id);
  refreshCard(id);
  refreshBundleUI();
}

async function onCopyOffer() {
  const { count, sumPubLow, offer, sumPriceLow } = calcBundle();
  if (count < 2) return;

  const msg =
    `Estas ${count} láminas publicadas suman ${fmtFull(sumPubLow)}. ` +
    `¡Te las dejo en ${fmtFull(offer)}! ` +
    `¿Le damos? 🤝`;

  const btn = document.getElementById('btn-wa');
  try {
    await navigator.clipboard.writeText(msg);
    btn.classList.add('copied');
    btn.textContent = '✅  ¡Copiado!';
  } catch {
    prompt('Copia este mensaje:', msg);
  }
  setTimeout(() => {
    btn.classList.remove('copied');
    btn.innerHTML = '📋&nbsp; Copiar oferta WhatsApp';
  }, 2500);
}

function onMarkSold(id) {
  markAsSold(id);
  refreshCard(id);
  refreshChipCounts();
  refreshBundleUI();
}

function onReserveBundle() {
  reserveBundle();
  renderInventory();
  refreshChipCounts();
  refreshBundleUI();
  switchTab('inventory');
}
