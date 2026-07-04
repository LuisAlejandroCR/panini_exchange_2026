# Negotiation logic

## Inputs

- `publish_low`: low public asking price.
- `publish_high`: high public asking price.
- `price_low`: lowest acceptable price.
- `price_high`: faster-sale high range.

## Discounts

| Quantity | Discount |
|---:|---:|
| 2-3 | 5% |
| 4-6 | 10% |
| 7+ | 15% |

## Rule

Use the discounted `publish_low` as the offer, but never go below the sum of `price_low`.

```text
candidate_offer = publish_total_low * (1 - discount_pct)
final_offer = max(seller_min, rounded_candidate_offer)
```

## App behavior

1. Select buyer.
2. Add multiple `OfferItems`.
3. App calculates totals.
4. Tap WhatsApp action.
5. If accepted, change offer status to `Accepted`.
6. Mark stickers as `Reserved` or `Sold`.
