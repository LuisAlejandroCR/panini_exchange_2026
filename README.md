# Panini Exchange 2026 ⚽

Open-source sticker inventory manager and bundle negotiation tool for Panini FIFA World Cup 2026 collectors.

Import your own collection, track availability, generate WhatsApp bundle offers, and coordinate with a partner in real time — no account, no cloud.

---

## Quick Start

1. **Open the app** — [panini-exchange-2026.vercel.app](https://panini-exchange-2026.vercel.app) or `index.html` locally
2. **Download the template** — tap "Descargar plantilla Excel" to get a 2-tab `.xlsx` file
3. **Fill in your stickers** — open the **Láminas** tab, add your stickers and prices, save
4. **Import your file** — drag and drop the filled `.xlsx` (or a `.csv`) onto the drop zone
5. **Inventario tab** — manage sticker status, search, and filter
6. **Negociar tab** — build bundle offers and copy a WhatsApp-ready message

> A 5-step tour appears automatically on first visit to guide you through the app.

> Works offline after first load. Data is saved in your browser's localStorage.

---

## Your Inventory File

Download the blank template from the import screen. It is an Excel file (`.xlsx`) with two tabs:

| Tab | Purpose |
|-----|---------|
| **Instrucciones** | Column guide — required fields, optional fields, Spanish aliases, examples |
| **Láminas** | Data — headers row + 2 example rows. Fill this tab and import it. |

The app also accepts plain `.csv` files with the same columns.

### Required columns

| Column | Description |
|--------|-------------|
| `sticker` | Sticker name — e.g. `ARG01 Messi` |
| `price_low` | Minimum price you will accept (your cost floor — private, only you see it) |
| `publish_low` | Price you ask the buyer |

### Optional columns

| Column | Description | Default |
|--------|-------------|---------|
| `id` | Unique identifier | Auto-generated |
| `category` | Badge label: Jugador, Escudo, Especial, Museum, WE ARE… | — |
| `price_high` | Maximum selling price | 0 |
| `publish_high` | Maximum listed price (shows a range) | 0 |
| `status` | Initial status | `Available` |
| `quantity` | Units in stock | 1 |
| `condition` | Physical condition | — |
| `notes` | Free text notes | — |

**Status values:** `Available` · `Reserved` · `Sold`

**Spanish column names are also accepted:** `lamina` · `vender_low` · `publicar_low` · `estado` · `cantidad` · `notas`

---

## Inventory Management

Each sticker card has two actions:

| Card state | Status button | Second button |
|------------|--------------|---------------|
| Available | Tap → Reserved | `+` adds to bundle |
| Reserved | Tap → Available (deal fell through) | `✓ Vender` marks as Sold |
| Sold | Tap → Available | — |

Status changes persist across reloads via localStorage.

**Export current state:** tap the 📤 button in the header to download a dated CSV (`panini_exchange_YYYY-MM-DD.csv`) with all current statuses baked in. Share via WhatsApp with a partner; they import it and get the same inventory state.

---

## Bundle Negotiation

Select 2 or more stickers from Inventario and switch to the **Negociar** tab. Each device has its own independent bundle — two users can negotiate separate deals simultaneously without interfering.

### Discount tiers

| Stickers | Discount |
|----------|----------|
| 2 – 3 | 5% |
| 4 – 6 | 10% |
| 7+ | 12% |

### Pricing formula

```
offer  = MAX( ROUND(sum(publish_low) × (1 – discount)), sum(price_low) )
floor  = MAX( sum(price_low), ROUND(offer × 0.93) )
```

**"No bajes de"** — shown privately only to you. The lowest counter-offer you should accept: your cost total or 7% below your offer, whichever is higher. Maximum total exposure is ~19% off published on large bundles.

### WhatsApp message

Tap **"Copiar oferta WhatsApp"** to copy a ready-to-send message:

> *"Estas 3 láminas publicadas suman $179.900. ¡Te las dejo en $170.905! ¿Le damos? 🤝"*

Your floor stays private — only the offer is shared with the buyer.

Tap **"Marcar todo como Reservado"** to reserve all selected stickers and clear the bundle.

---

## Real-Time Sync (P2P, no login)

Two devices can share inventory state in real time without any account or cloud service. Data flows directly between devices via WebRTC (PeerJS).

> **Important:** Device A must import its inventory file **before** creating a session. The session transmits Device A's full inventory to Device B on connect — if no file has been imported, session creation is blocked.

### How to connect

**Device A (host) — must have inventory loaded first:**
1. Import your Excel/CSV file
2. Tap the 🔗 button in the header
3. Tap **"Crear sesión"** → a join link is generated
4. Tap **"Enviar por WhatsApp"** → native share sheet opens; after sharing, the browser returns to the foreground automatically (iOS/Android)
5. Keep the app tab active while Device B connects

**Device B (guest):**
1. Tap the link received via WhatsApp → the app opens and connects automatically — no code to type
2. A spinner shows while waiting; the app retries every 6 seconds for up to 60 seconds if the host is not yet ready
3. Once connected, the full inventory syncs instantly (no file needed on Device B)

> On the import screen (no file loaded), the sync panel shows **join-only** — "Crear sesión" is hidden since Device B doesn't need a file to join.

### What syncs

| Action | Syncs? |
|--------|--------|
| Status change (Available / Reserved / Sold) | ✅ both devices see it instantly |
| "Marcar todo como Reservado" | ✅ those items show Reserved everywhere |
| Sticker added to bundle | 🔒 other device sees amber **🤝 En negociación** badge — card is locked |
| Bundle contents and offer price | ❌ local only — each user negotiates independently |

### Negotiation lock

When a sticker is in someone's active bundle, the other device sees it with an amber left border and a **🤝 En negociación** badge. Both the status button and the `+` button are disabled. The lock releases automatically when the user removes the sticker from their bundle, marks it Reserved/Sold, or disconnects.

### Mobile tab suspension

Mobile browsers suspend background tabs. The app handles this automatically:

- **Device A (host):** peer is silently recreated with the same session code when the tab becomes active again
- **Device B (guest):** retries the connection every 6 seconds for up to 60 seconds, reconnecting as soon as Device A's peer is live

---

## File Structure

```
panini_exchange_2026/
├── index.html          # App shell + 5-step demo tour
├── css/
│   └── app.css         # Styles — vanilla/green light theme
├── js/
│   ├── parsers.js      # CSV and XLSX parsers (zero local dependencies)
│   ├── store.js        # State, localStorage, bundle and discount logic
│   ├── views.js        # DOM rendering
│   ├── sync.js         # WebRTC P2P sync (PeerJS)
│   └── main.js         # Navigation, file import, template/export download, tour
└── README.md
```

**External dependencies (CDN):**
- [PeerJS](https://peerjs.com) `peerjs@1.5.4` — real-time P2P sync
- [SheetJS](https://sheetjs.com) `xlsx@0.18.5` — generates the 2-tab Excel template on download

---

## Browser Support

| Feature | Minimum version |
|---------|----------------|
| XLSX parser (`DecompressionStream`) | Chrome 80 · Firefox 113 · Safari 16.4 |
| Real-time sync (`RTCPeerConnection`) | Chrome 56 · Firefox 44 · Safari 11 |
| Native share sheet (`navigator.share`) | iOS Safari 12.1 · Android Chrome 61 |

For older browsers, export your Excel file as CSV before importing. The WhatsApp share button falls back to a direct `wa.me` link on desktop browsers that do not support `navigator.share`.

---

## License

MIT — free to use, fork, and adapt.
