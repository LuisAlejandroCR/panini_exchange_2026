# Panini Exchange 2026 ⚽

Open-source sticker inventory manager and bundle negotiation tool for Panini FIFA World Cup 2026 collectors.

Import your own collection, track availability, and generate WhatsApp offers in seconds.

---

## Quick Start

1. **Open `index.html`** in any modern mobile browser (Chrome, Safari, Firefox)
2. **Import your file** — drag and drop your CSV or Excel file
3. Use the **Inventario** tab to manage sticker status
4. Use the **Negociar** tab to build bundle offers and copy WhatsApp messages

> **Tip:** Works offline — no server needed. Data is saved in your browser's localStorage.

---

## Your Inventory File

Download the blank template from the import screen, fill it in, and import it.

### Required columns

| Column | Description |
|--------|-------------|
| `sticker` | Display name of the sticker / card |
| `price_low` | Minimum price you will accept (floor) |
| `publish_low` | Minimum listed / published price |

### Optional columns

| Column | Description | Default |
|--------|-------------|---------|
| `id` | Unique identifier | Auto-generated |
| `category` | Category label shown as a badge | — |
| `type` | Sticker type (Normal, Holográfica, etc.) | — |
| `price_high` | Maximum selling price | 0 |
| `publish_high` | Maximum listed price | 0 |
| `status` | Initial status | `Available` |
| `quantity` | Units in stock | 1 |
| `condition` | Physical condition | — |
| `notes` | Free text notes | — |

**Status values:** `Available` · `Reserved` · `Sold`

**Spanish column names are also accepted:** `lamina`, `vender_low`, `publicar_low`, `estado`, `cantidad`, `notas`, etc.

---

## Bundle Negotiation

Select 2 or more stickers from Inventario and switch to the **Negociar** tab.

| Stickers selected | Discount |
|-------------------|----------|
| 2 – 3 | 5% |
| 4 – 6 | 10% |
| 7+ | 15% |

**Offer price** = `sum(publish_low) × (1 – discount)`, floored at `sum(price_low)`.

Tap **"Copiar oferta WhatsApp"** to copy a ready-to-send message:

> *"Estas 4 láminas publicadas suman $180.000. Te las dejo en $160.000. Precio mínimo: $135.000."*

Tap **"Marcar todo como Reservado"** to update the status of all selected stickers at once.

---

## AppSheet Integration

Use the provided Excel template (`template/panini_exchange_2026_template.xlsx`) to manage your collection in Google AppSheet:

1. Upload the template to **Google Drive**
2. Open as **Google Sheets** (File → Open with → Google Sheets)
3. Go to [appsheet.com](https://www.appsheet.com) → **New App → From your own data**
4. Connect your Google Sheet
5. Configure virtual columns using the expressions in `data/settings_discount_rules.csv`

---

## File Structure

```
panini_exchange_2026/
├── index.html                                  # Web app (no dependencies)
├── template/
│   └── panini_exchange_2026_template.xlsx      # Blank template for your collection
├── data/
│   ├── laminas.csv                             # Sample inventory (64 stickers)
│   ├── buyers.csv                              # Sample buyers
│   ├── offers.csv                              # Sample offers
│   ├── offer_items.csv                         # Sample offer line items
│   └── settings_discount_rules.csv             # Discount tier configuration
└── README.md
```

---

## Data Columns Reference

### `data/laminas.csv`
`id · sticker · category · type · selection · price_low · price_high · publish_low · publish_high · status · quantity · condition · image_url · notes`

### `data/buyers.csv`
`id · name · whatsapp · city · notes`

### `data/offers.csv`
`id · buyer_id · date · status · notes · created_by`

Offer status: `Draft` · `Sent` · `Accepted` · `Rejected` · `Paid`

### `data/offer_items.csv`
`id · offer_id · sticker_id · quantity · notes`

---

## Bundle Pricing Formula

```
discount = 5%  if 2–3 stickers
         = 10% if 4–6 stickers
         = 15% if 7+  stickers

offer = MAX(
  ROUND(sum(publish_low) × (1 – discount)),
  sum(price_low)   ← floor: never go below this
)
```

---

## Browser Support

The built-in XLSX parser uses `DecompressionStream` (Chrome 80+, Firefox 113+, Safari 16.4+).
For older browsers, export your Excel file as CSV before importing.

---

## License

MIT — free to use, fork, and adapt.
