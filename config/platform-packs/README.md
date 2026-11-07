# Later platform packs (placeholder only)

Version 1 ships the Etsy pack only: `etsy.v1.json`.

No eBay pack and no Amazon pack exists in code yet. Later platforms stay in backlog only, in this order per PROMPT.md section 13.3: eBay second, Amazon third, then Shopify, TikTok Shop, Facebook Marketplace, Instagram Shopping, Walmart Marketplace, Google Shopping, Pinterest Shopping, Shopee, Lazada, Daraz, plus WooCommerce as a store platform pack.

Do not invent rules for any later platform. Each later pack is added only after its rules are verified from official sources and recorded in `docs/platform-rules.md` with a source URL and a new check date, following the same versioned pack format as `etsy.v1.json`.

Known planning notes from `docs/platform-rules.md`, check date 2026-11-05, no pack built from them yet:

- eBay digital is blocked pending a live check in the eBay sell flow. Do not build an eBay digital download pack as a standard Buy It Now listing.
- Amazon has no verified standard digital download listing flow equivalent to the Etsy instant download flow. The Amazon pack must be treated as a physical presentation pack first, unless a separate verified digital route is found and recorded.
- Amazon main image rules are strict: pure white background, product fill at least 85 percent, no text on the main image. A device frame mockup is not a compliant Amazon main image.
