# Panini Exchange 2026 ⚽

Open-source sticker inventory manager and bundle negotiation tool for Panini FIFA World Cup 2026 collectors.

Import your own collection, track availability, and generate WhatsApp offers in seconds.

---

## Quick Start

1. **Open `(https://panini-exchange-2026.vercel.app/)`** in mobile browser
2. **Import your file** — drag and drop your CSV or Excel file
3. Use the **Inventario** tab to manage sticker status
4. Use the **Negociar** tab to build bundle offers and copy WhatsApp messages

> Works offline — no server needed. Data is saved in your browser's localStorage.

---

## Your Inventory File

Download the blank template from the import screen. It is a CSV file with a description row explaining each column. Fill it in with your collection and drag it back into the app.

### Required columns

| Column | Description |
|--------|-------------|
| `sticker` | Sticker name — e.g. `ARG01 Messi` |
| `price_low` | Minimum price you will accept (your cost floor) |
| `publish_low` | Price you ask the buyer |

### Optional columns

| Column | Description | Default |
|--------|-------------|---------|
| `id` | Unique identifier | Auto-generated |
| `category` | Badge label: Jugador, Escudo, Especial… | — |
| `price_high` | Maximum selling price | 0 |
| `publish_high` | Maximum listed price (shows a range) | 0 |
| `status` | Initial status | `Available` |
| `quantity` | Units in stock | 1 |
| `condition` | Physical condition | — |
| `notes` | Free text notes | — |

**Status values:** `Available` · `Reserved` · `Sold`

**Spanish column names are also accepted:** `lamina` · `vender_low` · `publicar_low` · `estado` · `cantidad` · `notas`

---

## Bundle Negotiation

Select 2 or more stickers from Inventario and switch to the **Negociar** tab.

### Discount tiers

| Stickers | Discount |
|----------|----------|
| 2 – 3 | 5% |
| 4 – 6 | 10% |
| 7+ | 12% |

### Pricing formula

```
offer  = MAX( ROUND(sum(publish_low) × (1 – discount)), sum(price_low) )
floor  = MAX( sum(price_low), ROUND(offer × 0.93) )   ← shown privately as "No bajes de"
```

The **"No bajes de"** row is private — it shows the lowest you should accept in a counter-offer: your real cost total or 7% below the offer, whichever is higher. Maximum total exposure is ~19% off published on large bundles.

### WhatsApp message

Tap **"Copiar oferta WhatsApp"** to copy a ready-to-send message:

> *"Estas 3 láminas publicadas suman $179.900. ¡Te las dejo en $170.905! ¿Le damos? 🤝"*

Your floor stays private — only the offer is shared.

Tap **"Marcar todo como Reservado"** to reserve all selected stickers and clear the bundle.

---

## File Structure

```
panini_exchange_2026/
├── index.html        # App shell
├── css/
│   └── app.css       # Styles — vanilla/green light theme
├── js/
│   ├── parsers.js    # CSV and XLSX parsers (zero dependencies)
│   ├── store.js      # State, localStorage, bundle and discount logic
│   ├── views.js      # DOM rendering
│   └── main.js       # Navigation, file import, template download
└── README.md
```

---

## Browser Support

The built-in XLSX parser uses `DecompressionStream` (Chrome 80+, Firefox 113+, Safari 16.4+).
For older browsers, export your Excel file as CSV before importing.

---

## License

MIT — free to use, fork, and adapt.
