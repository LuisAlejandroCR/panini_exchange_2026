# AppSheet Current Config

## Tables
- Cards
- Buyers
- Offers
- OfferItems

## Hidden Views
- OfferItems position = ref

## Key Columns
- Cards.cardID
- Buyers.BuyerID
- Offers.OfferID
- OfferItems.OfferItemID

## Ref Columns
- Offers.BuyerID → Buyers
- OfferItems.OfferID → Offers, IsPartOf ON
- OfferItems.cardID → Cards

## Main Views
- Buyers
- Inventory
- New Offer
- Offers