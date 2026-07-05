# Panini Exchange 2026 ⚽

Open-source sticker inventory manager and bundle negotiation tool for Panini FIFA World Cup 2026 collectors.

Import your own collection, track availability, generate WhatsApp bundle offers, and coordinate with a partner in real time — no account, no cloud.

---

## Quick Start

1. **Open the app** — [panini-exchange-2026.vercel.app](https://panini-exchange-2026.vercel.app) or `index.html` locally
2. **Import your file** — drag and drop your CSV or Excel file onto the drop zone
3. **Inventario tab** — manage sticker status, search, and filter
4. **Negociar tab** — build bundle offers and copy a WhatsApp-ready message

> Works offline after first load. Data is saved in your browser's localStorage.

---

## Your Inventory File

Download the blank template from the import screen. It is a CSV file with a description row explaining each column. Fill it in and drag it back into the app.

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
offer      = MAX( ROUND(sum(publish_low) × (1 – discount)), sum(price_low) )
floor      = MAX( sum(price_low), ROUND(offer × 0.93) )
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

> **Important:** Device A must import its CSV file before creating a session. The session transmits Device A's current inventory to Device B on connect — if no file has been imported, Device B will receive an empty inventory.

### How to connect

**Device A (host) — must have inventory loaded first:**
1. Import your CSV file
2. Tap the 🔗 button in the header (also available on the import screen)
3. Tap **"Crear sesión"** → a join link is generated
4. Tap **"Enviar por WhatsApp"** → native share sheet opens; after sharing, the browser returns to the foreground automatically
5. Keep the app tab open while Device B connects

**Device B (guest):**
1. Tap the link received via WhatsApp → the app opens and connects automatically
2. A spinner shows while waiting for Device A — retries for up to 60 seconds if the host is not yet ready
3. Once connected, the full inventory syncs instantly (no CSV needed on Device B)

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

Mobile browsers suspend background tabs. If you switch away from the app (e.g. to check WhatsApp), the connection may drop. The app handles this automatically:

- **Device A (host):** peer is silently recreated with the same session code when the tab becomes active again
- **Device B (guest):** retries the connection every 6 seconds for up to 60 seconds, so it reconnects as soon as Device A's tab is active

### Requirements

- Both devices must be online (internet required for the initial WebRTC handshake)
- Device A must import its inventory file before creating the session
- Keep the app tab active on both devices during an active session
- One active connection per session (one host, one guest)

---

## File Structure

```
panini_exchange_2026/
├── index.html          # App shell
├── css/
│   └── app.css         # Styles — vanilla/green light theme
├── js/
│   ├── parsers.js      # CSV and XLSX parsers (zero local dependencies)
│   ├── store.js        # State, localStorage, bundle and discount logic
│   ├── views.js        # DOM rendering
│   ├── sync.js         # WebRTC P2P sync (PeerJS)
│   └── main.js         # Navigation, file import, template/export download
└── README.md
```

External dependency: [PeerJS](https://peerjs.com) CDN (`peerjs@1.5.4`) — loaded only for sync; the rest of the app works without it.

---

## Browser Support

| Feature | Minimum version |
|---------|----------------|
| XLSX parser (`DecompressionStream`) | Chrome 80 · Firefox 113 · Safari 16.4 |
| Real-time sync (`RTCPeerConnection`) | Chrome 56 · Firefox 44 · Safari 11 |
| Native share sheet (`navigator.share`) | iOS Safari 12.1 · Android Chrome 61 |

For older browsers, export your Excel file as CSV before importing. The WhatsApp share button falls back to a direct `wa.me` link on desktop.

---

## License

MIT — free to use, fork, and adapt.
