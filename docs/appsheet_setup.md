# AppSheet setup: Panini Exchange 2026

## 1. Data source

Use `panini_exchange_2026_appsheet_template.xlsx` as your source file. Upload it to Google Drive and open it as Google Sheets.

Recommended AppSheet tables:

| Table | Key | Label |
|---|---|---|
| Laminas | LaminaID | lamina |
| Buyers | BuyerID | nombre |
| Offers | OfferID | BuyerID |
| OfferItems | OfferItemID | LaminaID |
| Settings | discount_rule_id | label |

## 2. Required references

Configure these columns as `Ref`:

| Table | Column | Ref table |
|---|---|---|
| Offers | BuyerID | Buyers |
| OfferItems | OfferID | Offers |
| OfferItems | LaminaID | Laminas |

This lets each offer have many offer items and each offer item point to one selected sticker.

## 3. Virtual columns

Add these virtual columns.

### OfferItems

`V_PublicarLow`

```appsheet
[LaminaID].[publicar_low] * [qty]
```

`V_PublicarHigh`

```appsheet
[LaminaID].[publicar_high] * [qty]
```

`V_VenderLow`

```appsheet
[LaminaID].[vender_low] * [qty]
```

### Offers

`V_ItemCount`

```appsheet
SUM([Related OfferItems][qty])
```

`V_DiscountPct`

```appsheet
IFS(
  [V_ItemCount] >= 7, 0.15,
  [V_ItemCount] >= 4, 0.10,
  [V_ItemCount] >= 2, 0.05,
  TRUE, 0
)
```

`V_PublicarTotalLow`

```appsheet
SUM([Related OfferItems][V_PublicarLow])
```

`V_PublicarTotalHigh`

```appsheet
SUM([Related OfferItems][V_PublicarHigh])
```

`V_SellerMin`

```appsheet
SUM([Related OfferItems][V_VenderLow])
```

`V_FinalOffer`

```appsheet
MAX(
  LIST(
    [V_SellerMin],
    ROUND([V_PublicarTotalLow] * (1 - [V_DiscountPct]))
  )
)
```

`V_WhatsAppURL`

```appsheet
CONCATENATE(
  "https://wa.me/",
  SUBSTITUTE([BuyerID].[whatsapp], "+", ""),
  "?text=",
  ENCODEURL(
    CONCATENATE(
      "Hola ", [BuyerID].[nombre],
      ", estas láminas suman $", TEXT([V_PublicarTotalLow]),
      ". Te las dejo en $", TEXT([V_FinalOffer]),
      ". Precio mínimo: $", TEXT([V_SellerMin]),
      "."
    )
  )
)
```

## 4. Main action

Create an action on `Offers`:

- Name: `Send WhatsApp Offer`
- Type: `External: go to a website`
- Target: `[V_WhatsAppURL]`
- Launch External: ON

## 5. Views

Recommended views:

| View | Table | Type | Position |
|---|---|---|---|
| Inventario | Laminas | Deck or Table | Primary |
| Ofertas | Offers | Deck or Table | Primary |
| Nueva Oferta | Offers | Form | Primary/Menu |
| Detalle Oferta | Offers | Detail | Other |
| Compradores | Buyers | Table | Menu |

## 6. Negotiation rule

Use `V_FinalOffer` as your first offer. Do not accept under `V_SellerMin`.

Suggested verbal offer:

> Estas láminas publicadas suman $X. Te las dejo en $Y por llevar varias. Mi mínimo es $Z.
