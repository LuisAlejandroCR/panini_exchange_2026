# Panini Exchange 2026

No-code AppSheet app scaffold for negotiating Panini World Cup 2026 sticker bundles in Colombia.

## Goal

Manage inventory, create offers with 2+ stickers, apply automatic bundle discounts, protect your minimum acceptable price, and send a WhatsApp-ready negotiation message.

## Data model

- `Laminas`: sticker inventory and pricing.
- `Buyers`: buyer contact info.
- `Offers`: one negotiation or quote.
- `OfferItems`: stickers included in each quote.
- `Settings`: bundle discount rules.
- `AppSheet_Config`: column type mapping for AppSheet.
- `AppSheet_Expressions`: virtual columns and action expressions.
- `UX_Views`: recommended AppSheet views.

## Quick start

1. Upload `appsheet_template.xlsx` to Google Drive.
2. Open it with Google Sheets.
3. Create an AppSheet app from the Google Sheet.
4. Add all tabs as tables.
5. Set Ref columns:
   - `Offers[BuyerID]` -> `Buyers`
   - `OfferItems[OfferID]` -> `Offers`
   - `OfferItems[LaminaID]` -> `Laminas`
6. Add the virtual columns and action in `schema/appsheet_expressions.csv`.
7. Build views using `schema/ux_views.csv`.

## Bundle pricing logic

- 2-3 cards: 5% discount.
- 4-6 cards: 10% discount.
- 7+ cards: 15% discount.
- The final offer never goes below the sum of `vender_low`.

Formula idea:

```appsheet
MAX(
  LIST(
    [V_SellerMin],
    ROUND([V_PublicarTotalLow] * (1 - [V_DiscountPct]))
  )
)
```


