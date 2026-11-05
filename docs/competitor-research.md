# Listing Photos Generator: Competitor Research

Date: 2026-11-05
Scope: Phase 1 docs only. v1 is Etsy only, digital products only, per Ali 2026-11-05 21:00. eBay second, Amazon third, later platforms stay in backlog only. Structure must stay open so expansion does not hurt later: shared platform neutral core, platform packs as versioned config not code branches, platform neutral data model, all sizes limits and rules admin editable with preview and rollback. Later platforms shortlist, built later not v1, per Ali 2026-11-05 20:58: after Amazon, Shopify, TikTok Shop, Facebook Marketplace and Instagram Shopping, then Walmart Marketplace, Google Shopping and Pinterest Shopping, then Shopee, Lazada, Daraz, plus WooCommerce as a store platform pack. Rules for each to be verified from official sources before that platform is built.
Crisp Quality Gate, standing per Ali 2026-11-05 21:01: high quality crisp outputs only, not AI junk. Real product renders only at high DPI from source, never AI fake product screenshots, never upscale a low resolution source to fill a frame, block or warn on low resolution instead of silent blurry export, no stretch, no colour change, no crop unless approved, text sharp and legible, no garbled AI text or invented content, export at Etsy 2000px shortest side, AI only for layout and copy, never to invent product content. Proof example is the Maid of Honor Planner PDF by PDF workflow at 300 dpi.
Test product in this file: Maid of Honor Planner, a Google Sheets planner, 12 tabs. Price in earlier work: USD 13.97 list, USD 9.78 launch. That price and tab count are task supplied, not independently rechecked here. Do not invent new facts about the test product.

## How to read this file

1. Prices are in USD unless stated otherwise.
2. A price is marked VERIFIED VIA SECONDARY SOURCE when a named secondary source states that it read the vendor pricing page on a stated date, and that secondary page was re-fetched on 2026-11-05. It is not a direct live check of the vendor pricing page on 2026-11-05.
3. A price is marked NOT DIRECTLY RECHECKED ON 2026-11-05 when no live browser check of the vendor pricing page was possible in this task. This subagent had no live browser. Do not quote a price from this file to a seller or on a sales page until a live browser check confirms it on the vendor pricing page.
4. A claim is marked UNVERIFIED when sources conflict or no source was found. Do not use an unverified claim as a fact.
5. All review scores are small or skewed samples unless stated otherwise. Trustpilot skews toward billing complaints. Chrome Web Store and G2 skew toward day to day product use.
6. No em dashes and no en dashes are used in this file, per the style rule for this project.

## NVConsult dossier note

Before writing this file, the NVConsult competitor dossier at `~/workspace/goals/nvconsult-consultation-business-launch/files/competitor-comparative-data-2026-10-24.md` was read, per the standing AGENTS.md rule. Applied insights from that dossier:

- No unverified numbers, no success rates, no approval percentages, no outcome timelines. That matches the Listing Photos Generator reconciliation rule: tab count, price, format and claims must match the real product.
- Every page must give the visitor a task or a clear next step in the first screen. That supports a 60 second style eligibility or product check as the front door, not a slogan only hero.
- Transparent pricing beats hidden pricing. Jobbatical was the only competitor in that dossier with a real public fee table. Listing Photos Generator should publish its free limit and paid price in plain words, not hide them behind a trial.
- Checkable trust beats counters. IAS accreditation logos and CanApprove named licence were the checkable exceptions in that dossier. For Listing Photos Generator, the checkable proof is the reconciliation checklist itself, not a claim such as "sellers earn more".
- The NVConsult dossier is about immigration consultancy, not listing tools. Its market patterns were used as method only. No NVConsult competitor fact was copied into a listing tool finding.

## Platform image rules that decide the product

These rules are the reason Listing Photos Generator needs platform specific exports, not one generic image set.

### Etsy

- Up to 20 photos per listing.
- Etsy recommends at least 2000 pixels on the shortest side, and at least 2000 pixels wide and high in its help wording. The first photo must be at least 635 pixels on each side, or the listing can show up lower in search.
- Files over 1 MB may upload slowly or fail on a slow connection. That is guidance, not a stated hard cap in the sources read.
- Accepted types in the sources read: JPG, GIF, PNG, SVG, HEIC. No animated GIFs. Transparent parts of a PNG appear black on Etsy.
- Etsy Seller Policy effective 2026-07-09, as summarised in secondary sources: listing photos generally need to document the actual finished item, and sellers should use original photos of the actual product buyers will receive, not renderings or stock photos. Limited exceptions exist for custom goods and some products made with production partners.
- Source: https://mockitreal.com/blog/etsy-listing-photo-requirements and https://nightjar.so/blog/ai-product-photos-for-etsy-shop and https://kive.ai/learn/etsy-listing-photo-size

### Amazon, Phase 2, strictest

- Main image: pure white background, RGB 255,255,255. Product fills about 85 percent of the frame, fully visible, nothing cut off.
- Longest side at least 500 pixels, at most 10000 pixels. At least 1000 pixels enables zoom. A practical target in the sources is 2000 by 2000 pixels.
- Main image only: no text, logos, watermarks, borders, props, packaging, pricing or accessories not included with the product. No added graphics.
- Formats: JPEG, TIFF, PNG, non-animated GIF. Colour mode RGB.
- A listing with no compliant main image can be temporarily removed from search until one is provided, per Amazon Seller Central help as quoted in secondary sources.
- Secondary images can use coloured backgrounds, lifestyle shots, infographics and comparison charts. Only the main image carries the pure white rule.
- Source: https://blog.sellermagnet.com/post/amazon-product-image-requirements-2026/en and https://www.backgroundless.io/blog/amazon-main-image-requirements and https://www.listing-lint.com/

### eBay

- Minimum 500 pixels on the longest side. Recommended about 1600 by 1600 pixels.
- Up to 24 photos per listing. Up to 12 MB per photo in the sources read.
- White backgrounds are generally best, and a darker background can suit shiny or reflective items. White is recommended, not forced, unlike Amazon.
- No added borders, text, artwork, marketing, watermarks or placeholder images. No stock or catalog photos for an item listed as used.
- Source: https://snipbare.cybermax-tools.workers.dev/ebay-photo-requirements/ and http://instasize.com/learn/ebay-listing-photos

## Summary table

Prices in this table are VERIFIED VIA SECONDARY SOURCE unless marked otherwise. The secondary check date is in the detail section for each tool. Do not quote from this table alone.

| Tool | Main job | Listing photos or mockups | Titles, tags, description | Free limit | Cheapest paid, monthly billing unless noted |
|---|---|---|---|---|---|
| Canva | General design | Yes, templates, mockups inside Canva, background remover on Pro | No Etsy title or tag engine | Free, 5 GB, up to 20 AI uses a month | Pro USD 18 a month, or USD 144 a year |
| eRank | Etsy SEO | No, audits only, no mockup maker | Yes, keyword, title and tag help, listing audit, AI Listing Helper | 5 keyword lookups a day, 5 audits a day, 1 AI use a day, 1 shop, 50 listings | Basic USD 5.99 a month |
| Marmalead | Etsy keyword | No | Yes, keyword, listing grade, AI title, tag and description critique | No free plan found | USD 19 a month |
| Alura | Etsy all in one | No dedicated mockup maker, A/B tests thumbnails on Growth | Yes, AI titles, tags, descriptions, publishes to Etsy | 5 keyword and 5 product searches a day, 10 listings, 1 shop | Basic USD 11.99 a month, or USD 7.99 a month billed yearly |
| EverBee | Etsy product research | No | Yes, keyword and Tag Analyzer, AI actions on paid plans | Hobby free, 10 keyword searches, views, reviews, favorites only | Growth USD 39 a month, or USD 24.99 a month billed yearly |
| Sale Samurai | Etsy keyword, long tail | No | Yes, keyword and tag research, Listing Creator | Freemium, 20 keyword searches a month, 10 listing analyses a month | USD 19.99 a month, or USD 16.65 a month billed yearly |
| Vela, now Stocksmith | Bulk edit and crosslist Etsy, Shopify, eBay, Faire | Yes, AI Photo Studio, listing scores F- to A+ | Yes, AI photo, title, description and pricing tools | No free plan found, 7 day trial | CONFLICT, see Vela section, USD 19.95 to USD 29.95 in different sources |
| Placeit | Mockups and video | Yes, largest lifestyle mockup library in this set | No | Small free slice, mostly watermarked previews | USD 14.95 a month, or USD 89.69 a year |
| Smartmockups, now Canva Mockups | Device and product mockups | Yes, device frames, 5K export on paid plans | No | About 200 free mockups, low resolution | Now inside Canva, Pro USD 144 a year, standalone price no longer applies, UNVERIFIED as a standalone price |
| Mockey | POD mockups | Yes, apparel and product mockups, bulk style | No | Free, 1000+ templates, unlimited JPG downloads | Pro USD 9.99 a month, or USD 7.40 a month billed yearly |
| Photoroom, listed in the task as Foto | Product photo editing | Yes, background removal, AI backgrounds, shadows, resize | No | Free for personal, non-commercial use only, watermark and export count CONFLICT, see Photoroom section | Pro USD 12.99 a month, or USD 89.99 a year |
| InkFrog | eBay templates and bulk listing | Templates only, no AI listing generation | No, templates and bulk edit, no meaningful SEO | Was free for 10 listings | CLOSED 2026-06-01, historical USD 11 a month, do not use as a live competitor |
| Helium 10 | Amazon and Walmart suite | No mockup maker, Listing Builder for copy | Yes, Listing Builder, Scribbles, Listing Analyzer, AI listing | Limited free plan, Listing Builder not included | Platinum USD 129 a month, or USD 99 a month billed yearly |
| Jungle Scout | Amazon research | No | Yes, Listing Builder from Growth Accelerator up | No free plan, no free trial found | Starter USD 49 a month, or USD 29 a month billed yearly |
| Sellerise | Amazon operations | No | Limited, keyword tools, no listing photo maker | 7 day trial reported, free plan reported in one source, CONFLICT | Starter about USD 19.99 a month, VERIFIED VIA SECONDARY SOURCE only |
| EHunt, formerly EtsyHunt | Etsy product and keyword research | Yes, mockup creation listed in paid suite in one source, UNVERIFIED in detail | Yes, title and description AI generation in paid suite | Free plan reported | Price NOT PUBLICLY LISTED on its pricing page when checked 2026-10-19 |

## Etsy SEO and listing copy tools

### eRank

What it does well: the cheapest credible Etsy SEO starting point in this set, and the most generous free plan for keyword work. Long standing default for Etsy sellers. Says it is trusted by over 2 million sellers, UNVERIFIED as an independent fact, it is a vendor claim.
Listing photos, mockups, titles, tags: no mockup maker and no photo maker. It does keyword research, listing audits, trend data, competitor tracking with estimated daily sales, rank checker, Trend Buzz, and an AI Listing Helper. It helps with titles and tags through keyword data and audits, not by generating a full listing pack.
Price: Basic USD 5.99 a month, Pro USD 9.99 a month, Expert USD 29.99 a month. Annual billing lowers these to USD 65.99, USD 94.99 and USD 269.99 a year. VERIFIED VIA SECONDARY SOURCE: Outrank, prices checked 2026-10-19 on each vendor pricing page, re-fetched 2026-11-05. Source: https://www.outrank.so/blog/etsy-seo-tools
Free limits: Free plan, 5 keyword searches a day, 5 listing audits a day, 1 AI Listing Helper use a day, 1 shop, up to 50 active listings analysed. No card needed in the sources read.
Billing and cancellation complaints: limited evidence found. RevenueGeeks reports a 14 day money back guarantee applies to annual billing only, and monthly payments are non-refundable. Trustpilot score 3.4 from 3 reviews in one source, too small to use as a pattern. No billing complaint pattern was found in the sources read. Mark that as no pattern found, not as no complaints exist.
What is missing for Listing Photos Generator: eRank does not make photos, mockups or a full listing pack, and does not check the listing against the real product.

### Marmalead

What it does well: focused keyword decisions, seasonality and forecasting. MarmaMeters rate engagement and competition. Side by side keyword comparison, listing grades, AI critique of descriptions, pricing ranges, competitor shop keywords and tags.
Listing photos, mockups, titles, tags: no mockup maker and no photo maker. It does keyword suggestions, listing grades, AI title, tag and description help through Boost SEO and the Marma extension, which can fill Etsy editor fields for the seller to save. It does not publish to Etsy itself.
Price: USD 19 a month, USD 53 a quarter, USD 190 a year, or USD 300 one time for lifetime. VERIFIED VIA SECONDARY SOURCE: Alura comparison, facts checked 2026-10-15, re-fetched 2026-11-05, and Outrank, checked 2026-10-19. Source: https://www.alura.io/vs/marmalead and https://www.outrank.so/blog/etsy-seo-tools
Free limits: no free plan. A 14 day money back guarantee is promised on its Marma page, while its terms say the current billing period is not refunded. A free tools page offers a 14 day trial when you sign up with email, per Alura. That trial wording conflict is UNVERIFIED and needs a live check.
Billing and cancellation complaints: pattern found. Trustpilot 2.0 out of 5 from 11 reviews, read 2026-10-15 per Alura. Reviewers from 2023 to September 2026 describe being charged after a trial or after cancelling, and two say a refund was refused within 14 days. Reviewers in March and September 2026 saw no SEO gains, and one called the listing scores misleading. Small sample, 11 reviews, so treat the pattern as a warning, not a proven rate. Source: https://www.alura.io/vs/marmalead
What is missing for Listing Photos Generator: no photos, no mockups, no reconciliation, no full pack, and no free entry.

### Alura

What it does well: the most complete Etsy all in one in this set for copy and publishing. Product research in a 100 million plus listing database on Growth, keyword finder, AI listing optimisation, buyer follow up messages, Pinterest marketing, listing A/B tests, Etsy Ads optimiser, profit dashboard.
Listing photos, mockups, titles, tags: no dedicated mockup maker. It does AI titles, tags and descriptions, uses AI credits, scores listings, creates new listings and publishes approved rewrites to Etsy. A/B tests cover thumbnails, titles and prices on Growth. That thumbnail test is a photo adjacent feature, not a mockup generator.
Price: Free USD 0. Basic USD 11.99 a month, or USD 7.99 a month billed yearly. Growth USD 29.99 a month, or USD 14.99 a month billed yearly. Professional USD 69.99 a month, or USD 29.99 a month billed yearly. VERIFIED VIA SECONDARY SOURCE: Alura comparison, facts checked 2026-10-15, re-fetched 2026-11-05. Source: https://www.alura.io/vs/marmalead
Free limits: Free gives 5 keyword and 5 product searches a day, 2 shop searches, 10 listings to optimise, and the Chrome extension. No time limit stated.
Billing and cancellation complaints: no billing complaint pattern was found for Alura in the sources read for this file. Trustpilot 3.9 out of 5 from 434 reviews, read 2026-10-15 per Alura. Every Alura plan comes with a 7 day money back guarantee: ask within 7 days of buying and the last payment is refunded, per Alura. Mark the absence of a found pattern as no pattern found, not as proof of clean billing.
What is missing for Listing Photos Generator: no mockup or real product render, no reconciliation check, and AI drafts still need the seller product knowledge. One independent test in the sources read found the description generator occasionally invents material claims. That is a direct gap Listing Photos Generator is built to close. Source for that test claim: https://www.ecomstackhub.com/ai-tools-for-etsy-listings

### EverBee

What it does well: product research before making anything. Chrome extension overlays estimated monthly sales and revenue on Etsy search pages. Keyword Score, Tag Analyzer, trend data, shop analytics, email product, storefront builder.
Listing photos, mockups, titles, tags: no mockup maker and no photo maker. It does keyword research and tag analysis, and AI actions on paid plans, 100 a month on Growth, unlimited on Business. It does not write a full title, description and tag pack as its core job.
Price: Hobby free. Growth USD 39 a month, or USD 24.99 a month billed yearly, USD 299 a year. Business USD 99 a month, or USD 69 a month billed yearly, USD 828 a year. VERIFIED VIA SECONDARY SOURCE: ConversionGems, from EverBee pricing page, checked 2026-11-02 with monthly and annual views, re-fetched 2026-11-05. Source: https://www.conversiongems.com/tools/everbee . Note: some older secondary sources quote Growth at USD 29.99 monthly and USD 19.99 yearly. The 2026-11-02 check is the later figure and is used here. The older figure is a price change or an error, UNVERIFIED which.
Free limits: Hobby free forever, no card needed. It shows views, reviews and favorites, allows 10 keyword searches, basic filters, and saves up to 5 keywords and 5 shops. Sales, revenue, conversion rate, trends, unlimited keywords and Tag Analyzer start on Growth. No free trial of paid plans.
Billing and cancellation complaints: clear pattern found. Trustpilot 3.2 out of 5 from 55 reviews, 49 percent 5 star, 40 percent 1 star, per RevenueGeeks. Annual plans auto renew with no reminder email, and the refund window is 3 days for a monthly plan. Annual plans get a pro rated refund up to 8 months. One Trustpilot reviewer on 2026-10-03 reported going from USD 9 a month to an annual USD 240 charge, and getting only a pro rated amount after cancelling 8 days after the charge, with access removed at once. EverBee replied and offered to restore access for the remaining months. Another reviewer reported a 50 percent off cancellation offer that did not apply as expected, and loss of export access. Source: https://www.trustpilot.com/review/everbee.io and https://revenuegeeks.com/software/everbee
What is missing for Listing Photos Generator: no photos, no mockups, no listing pack, and sales figures are estimates extrapolated from public signals, not real Etsy sales. Accuracy drifts on low volume listings in the sources read.

### Sale Samurai

What it does well: long tail keyword depth, search volume and trends, competitor tag analysis, Chrome extension, A/B tester on the single paid plan, Listing Creator.
Listing photos, mockups, titles, tags: no mockup maker and no photo maker. It does keyword volume, competition, long tail suggestions, tag suggestions, and a Listing Creator tool. It does not generate listing photos.
Price: Freemium USD 0. Paid USD 19.99 a month, or USD 16.65 a month billed yearly, USD 199.90 a year. VERIFIED VIA SECONDARY SOURCE: Allable, read from salesamurai.io/pricing on 2026-10-05, and Alura comparison, checked 2026-10-15. Source: https://www.allable.ai/blog/etsy-seo-tools/ and https://www.alura.io/vs/sale-samurai
Free limits: Freemium, 20 keyword searches a month, 10 listing analyses a month, no payment method needed. A 3 day trial opens every paid tool and needs no card to sign up.
Billing and cancellation complaints: no billing complaint pattern was found for Sale Samurai in the sources read. Mark that as no pattern found, not as proof of clean billing. One pricing warning was found: a leading affiliate roundup advertised Sale Samurai at USD 9.99 a month, while the vendor live page said USD 19.99 monthly. That is a secondary source accuracy warning, not a vendor billing complaint. Source: https://www.allable.ai/blog/etsy-seo-tools/
What is missing for Listing Photos Generator: no photos, no mockups, no reconciliation, and the free allowance is a test, not a working plan.

### EHunt, formerly EtsyHunt

What it does well: budget product, shop and keyword research, trending products and shops, Chrome extension overlay on Etsy pages.
Listing photos, mockups, titles, tags: a paid listing optimisation suite is reported to include title and description AI generation and mockup creation, per a GitHub rules file summarising EHunt. Detail on the mockup tool, formats, device frames and export sizes was not found in the sources read. Mark mockup detail UNVERIFIED.
Price: NOT PUBLICLY LISTED. Outrank states prices were not shown on its pricing page when checked 2026-10-19. Secondary reviews give a range of about USD 3.99 to USD 7.99 a month for Basic, and about USD 15.99 to USD 19.99 a month for Pro or Premium. That range is UNVERIFIED and must not be quoted as a price.
Free limits: free plan reported, with expanded limits on paid plans. Exact free limits were not found in the sources read. Mark UNVERIFIED.
Billing and cancellation complaints: no pattern found in the sources read. Outrank notes refunds are limited to narrow cases, per its pricing FAQ. Mark that as a single secondary note, not a complaint pattern.
Source: https://www.outrank.so/blog/etsy-seo-tools

## Bulk, crosslist and multi marketplace tools

### Vela, now Stocksmith

What it does well: bulk editing, copying and publishing listings for Etsy, Shopify, eBay and Faire. Profiles, CSV import and export, scheduling, inventory sync between connected shops. AI listing scoring F- to A+, with 100 plus AI tools to optimise photos, titles, descriptions and pricing, per Shopify App Store copy.
Listing photos, mockups, titles, tags: yes, AI Photo Studio is listed on paid plans. It scores listings and offers AI photo, title, description and pricing optimisation. It is not a dedicated mockup library in the Placeit sense. It does not state a reconciliation check against the real product in the sources read.
Price: CONFLICT, NOT DIRECTLY RECHECKED ON 2026-11-05. Three different figures appear in 2026 sources:
- Listadum, prices from each tool own pages as of 2026-10-14: Lite USD 29.95 a month per shop for up to 500 listings, Plus USD 39.95. No yearly plan and no free plan, one week free trial. Source: https://www.listadum.com/blog/best-etsy-seller-tools
- Shopify App Store, in search results: Vela Lite USD 19.95 a month, Vela Plus USD 29.95 a month, 7 day free trial. That may be an older Shopify listing or a different channel price. Mark as conflicting.
- Older tiered pricing in Outfy and Adnabu: USD 10 a month for 0 to 250 listings, rising to USD 40 for 7.5K to 10K listings. That appears outdated against the 2026-10-14 check. Mark as outdated, not current.
- The tool renamed itself Stocksmith on 2026-07-01, with no changes to pricing, features or Etsy connections, per Editorialge. Source: https://editorialge.com/inventory-apps-for-etsy-and-handmade-sellers/
Do not quote a Vela price from this file until a live check on its own pricing page resolves the conflict.
Free limits: no free plan found in the 2026-10-14 source. 7 day free trial reported.
Billing and cancellation complaints: pattern found in Shopify App Store reviews as summarised in secondary sources. Vela holds 4.5 out of 5 from 238 Shopify App Store reviews, with 20 of those at 1 star, several about billing, per Editorialge. ShopDigest summarises user frustration over the transition from free to paid, feeling misled or unfairly charged. That is a secondary summary, not a direct review count by this research. Source: https://editorialge.com/inventory-apps-for-etsy-and-handmade-sellers/ and https://www.shopdigest.com/shopify/apps/vela
What is missing for Listing Photos Generator: Vela is a bulk editor and crosslister for sellers with many listings, not a one product listing pack maker. It does not state a tab count, price or format reconciliation, and its entry price is far above a one product digital seller need.

### InkFrog

Status: CLOSED. InkFrog shut down on 2026-06-01, per Nventory, updated 2026-08-18. Source: https://dev.nventory.io/guides/best-inventory-sync-for-ebay . A Shopify App Store review on 2026-06-01 says "I love InkFrog, I am so sad that WIX is shutting it down." Do not treat InkFrog as a live competitor.
What it did well: eBay listing templates, bulk listing, inventory management, Amazon to eBay listing tool, multi account support.
Listing photos, mockups, titles, tags: templates and bulk edit only. No AI listing generation, no meaningful SEO capability, per Frooition and 3Dsellers comparisons.
Historical price, for record only: free for 10 listings, Small USD 11 a month for 300 listings, Basic USD 19 a month for 1500 listings, Professional USD 29 a month for unlimited listings, higher tiers USD 49 and USD 79 a month. Source: https://www.trustradius.com/products/inkfrog/pricing . 3Dsellers lists a Premium tier at USD 79.65 a month for 15 accounts. Those figures are historical, not current.
Free limits, historical: free for 10 listings.
Billing and cancellation complaints: no complaint pattern was searched for a closed tool in this file. Mark UNVERIFIED for complaints, and do not use InkFrog complaints to judge live tools.
Replacement note: 3Dsellers positions itself as an InkFrog replacement, with AI listing generation from a product URL or photo, title, description, item specifics, category and price suggestion, for eBay, Amazon, Shopify, BigCommerce, Walmart, Etsy, TikTok Shop and Facebook and Instagram Shops. Its pricing in that comparison is USD 16 to USD 29 a month on annual billing for Starter and Pro, with account add ons at USD 10 a month. That is a vendor comparison page, not an independent check. Mark 3Dsellers pricing UNVERIFIED for direct quoting. Source: https://www.3dsellers.com/promo/inkfrog-vs-3dsellers-lp

## Amazon tools, Phase 2

### Helium 10

What it does well: the most complete Amazon and Walmart suite in this set, 20 plus tools, strong keyword research, PPC included on paid plans, product research, listing, profit and inventory tools under one login.
Listing photos, mockups, titles, tags: no mockup maker and no photo maker. It does Listing Builder, Scribbles, Listing Analyzer, Cerebro and Magnet keyword tools, and AI listing help. It builds copy from keyword data, not from a real product render. It does not state a reconciliation check against the real product.
Price: Free USD 0. Platinum USD 129 a month, or USD 99 a month billed yearly. Diamond USD 359 a month, or USD 279 a month billed yearly. Enterprise custom, from USD 1499 a month in one source. Starter plan was retired for new subscribers in 2026, so Platinum is now the entry paid plan. VERIFIED VIA SECONDARY SOURCE: multiple 2026 sources agree on Platinum and Diamond, including OpenPR November 2026 and SwitchTools updated 2026-11-03. Source: https://www.openpr.com/news/4678517/helium-10-promo-code-and-black-friday-2026-guide-the-tools and https://www.switchtools.io/tool/helium-10
Free limits: limited free plan, limited daily Magnet searches, restricted Xray extension use, tracking for 2 products. Cerebro, unlimited Magnet and Helium 10 Ads stay locked on Free. Listing Builder is not included on Free.
Billing and cancellation complaints: no billing complaint pattern was found for Helium 10 in the sources read for this file. Mark that as no pattern found, not as proof of clean billing. The main complaint pattern in the sources is price, not billing: Platinum at USD 99 to USD 129 a month is a meaningful fixed cost for sellers under USD 2000 a month in revenue, and the 2026 price rise and Starter retirement removed the cheap entry tier.
What is missing for Listing Photos Generator: no photos, no mockups, no Amazon main image compliance check in the listing builder itself, and the entry price is far above a one product digital seller need. Helium 10 is physical product and PPC first, not digital listing pack first.

### Jungle Scout

What it does well: Amazon product research, Product Database, Opportunity Finder, Sales Estimator, Product Tracker, Keyword Scout, Chrome extension, supplier database.
Listing photos, mockups, titles, tags: no mockup maker and no photo maker. Listing Builder appears only from Growth Accelerator up. Starter cannot use it at all. Listing Analyzer is capped at 50 uses a month on Growth Accelerator and 300 on Brand Owner, and AI Assist at 100 and 500 a month in one source.
Price: Catalyst Starter USD 49 a month, or USD 29 a month billed yearly, USD 348 a year. Growth Accelerator USD 79 a month, or USD 49 a month billed yearly, USD 588 a year. Brand Owner plus Competitive Intelligence USD 149 a month, or USD 129 a month billed yearly, USD 1548 a year. Cobalt custom, demo only, no public price. VERIFIED VIA SECONDARY SOURCE: Retailpresso, prices verified on each vendor own pricing page as of September 2026, and Findstack, captured July 2026. Source: https://retailpresso.com/blog/helium-10-vs-jungle-scout and https://findstack.com/products/jungle-scout/reviews?page=12
Free limits: no free plan, no free trial found. 7 day money back guarantee reported.
Billing and cancellation complaints: no billing complaint pattern was found for Jungle Scout in the sources read. Mark that as no pattern found. A pricing page inconsistency was found by Findstack: the visible page said Brand Owner includes 3 users, while JSON-LD structured data on the same page said it includes 10 users, a USD 3213 gap at USD 459 per extra seat per year. That is a vendor page accuracy issue, not a billing complaint. Extra seats cost about USD 459 a year on upper plans.
What is missing for Listing Photos Generator: no photos, no mockups, research first, listing second, and Starter has no data export and only 30 days of history. Sales estimates are modelled from sales rank, not verified order data.

### Sellerise

What it does well: Amazon daily operations, profit visibility, alerts, reviews, reimbursements, keyword tracking, basic PPC reporting. Lower cost operations layer, not deep research.
Listing photos, mockups, titles, tags: no listing photo maker and no mockup maker. It does keyword tools, review management, reimbursement filing, sales and profit analysis. It does not build a listing pack.
Price: Starter about USD 19.99 a month, Growing about USD 39.99, Advanced about USD 99.99, Pro-Seller about USD 299.99, Top-Seller about USD 599.99, Agency custom. VERIFIED VIA SECONDARY SOURCE only: RevenueGeeks pricing guide, updated 2026-07-13. Source: https://revenuegeeks.com/software/sellerise/pricing . No annual pricing option is reported in that source, unlike Helium 10. Mark the absence of an annual option as reported, not independently confirmed.
Free limits: CONFLICT. One source reports a free plan available. Another reports a 7 day free trial with no card required. The Starter tier is reported to give full access to all tools except the Reimbursement suite, with usage limits on keyword tools and a cap on Amazon orders processed. Exact order limits were not confirmed in the sources read. Mark free plan and order limits UNVERIFIED.
Billing and cancellation complaints: no billing complaint pattern was found for Sellerise in the sources read. Mark that as no pattern found.
What is missing for Listing Photos Generator: no photos, no mockups, no listing copy pack, and no product research. It is an operations tool for sellers already live on Amazon, not a listing creation tool for a new digital product.

## Design and mockup tools

### Canva

What it does well: the general design default. Drag and drop editor, huge template and stock library, Brand Kits, Magic Resize, background remover, social scheduling, team features. The most familiar tool for a non designer seller.
Listing photos, mockups, titles, tags: yes for photos, no for Etsy SEO. Canva has Etsy listing templates, mockups inside Canva, formerly Smartmockups, and background removal on Pro. It does not generate Etsy titles, tags or descriptions from keyword data, and does not check a listing against the real product. A seller still designs each image by hand, one at a time.
Price: Free USD 0. Pro USD 18 a month, or USD 144 a year for one person. Business USD 25 a month per person, or USD 250 a year per person. Enterprise quoted. VERIFIED VIA SECONDARY SOURCE: multiple October 2026 checks of Canva US pricing page, including SaasCRMReview read 2026-10-27, and Designers Choice checked 2026-10-22. Source: https://saascrmreview.com/canva-pricing/ and https://designers-choice.net/how-much-is-canva-pro/
Free limits: Free includes 1.6 million plus templates, 4.7 million plus free photos and graphics, 5 GB cloud storage, 1 Brand Kit with 3 colours, and up to 20 Standard or Premium AI uses a month. Pro adds 3.6 million plus templates including premium, 141 million plus premium photos, videos and audio, 5 Brand Kits, 100 GB storage, background remover, Magic Resize, social scheduling, and up to 200 Premium AI uses or 20 Ultra AI uses a month. Pro marked elements show a crown and need payment or Pro to use without a watermark path.
Billing and cancellation complaints: pattern found. Trustpilot 4.0 out of 5 from about 7900 reviews in one October 2026 sample, with 50 percent 5 star and 30 percent 1 star. In a 100 review sample, support appeared in 17 reviews, 10 negative, billing in 11, cancellation in 10, and every billing or cancellation review was 1 or 2 stars. Themes: charged after believing they had cancelled, refund refused, cancellation did not go through first time, paused subscription resuming and charging on 2026-10-23, support hard to reach, no public phone number. Canva Help Centre states: "In most cases, Canva subscriptions are not refundable, as outlined in our Terms of Use." Apple subscriptions are refunded by Apple, not Canva. Source: https://professionalstoolkit.com/articles/is-canva-legit and https://www.trustpilot.com/review/canva.com?page=2 and https://quality-saving.com/comparisons/canva-pro-pricing
What is missing for Listing Photos Generator: Canva does not know the product. It will happily stretch, crop or recolour a render, use a Pro element the buyer cannot reuse, or add text that does not match the real product. It has no reconciliation, no pre publish checklist, and no Etsy, eBay or Amazon export preset as a single pack.

### Placeit, by Envato

What it does well: the largest lifestyle mockup library in this set, with real models, settings, apparel, mugs, posters, packaging, branding, logos, videos and design templates in one subscription. Fast for a seller who needs a model shot without a photoshoot.
Listing photos, mockups, titles, tags: yes for mockups, no for titles, tags or descriptions. Upload a PNG, pick a scene and shirt colour, download a listing image or short video. Commercial licence included in the subscription.
Price: Unlimited USD 14.95 a month, or USD 89.69 a year, about USD 7.47 a month on annual billing. Single template downloads USD 7.95 each in one July 2026 source. VERIFIED VIA SECONDARY SOURCE: Teeinblue, prices checked October 2026 on its official pricing page, and AIOptools Mockey versus Placeit comparison. Source: https://teeinblue.com/blogs/en/best-etsy-app-for-custom-t-shirts and https://www.aitoptools.net/compare/mockey-vs-placeit/
Free limits: free account can browse and download a small slice of the library, mostly watermarked previews and a few free assets. No bulk generation engine in the sources read. One mockup at a time, which becomes a bottleneck for sellers producing 50 plus listings a month, per CreativeVault.
Billing and cancellation complaints: no billing complaint pattern was found for Placeit in the sources read. Mark that as no pattern found.
What is missing for Listing Photos Generator: Placeit is apparel and lifestyle first. Its templates are familiar across Etsy, which weakens differentiation. It has no device frame pack for a Google Sheets planner, no laptop plus phone hero as a single preset, no title, tag or description pack, and no reconciliation against the real product. It also has no bulk pack for one product in all platform sizes.

### Smartmockups, now Canva Mockups

Status: STANDALONE GONE. Smartmockups was acquired by Canva in February 2021. Its address now redirects to Canva Mockups, which is used inside the Canva editor with a Canva account. Source: https://www.usetools.design/tools/smartmockups and https://resources.rework.com/tools/ai-design/best-ai-mockup-generators-2026
What it did well: fastest device and product mockups, drop a design into a realistic product or device scene in seconds, exports up to 5K resolution, URL screenshot feature that puts a live website into a device frame, Canva and Dropbox integrations.
Listing photos, mockups, titles, tags: yes for mockups, no for titles or tags. Device frames, apparel, mugs, packaging, social mockups.
Price: standalone price no longer applies. Older sources quote Premium USD 14 a month, or USD 9 a month billed yearly, and Pro USD 24 a month for video mockups and custom uploads. Those figures are historical and UNVERIFIED as current. Current cost is Canva Pro, USD 144 a year, per Canva pricing above.
Free limits: free tier reported as about 200 mockups, low resolution downloads, limited templates. Some sources say 5000 plus free mockups, others say 200 plus free mockups with no watermark. That count conflict is UNVERIFIED.
Billing and cancellation complaints: no pattern found for Smartmockups as a standalone product in the sources read.
What is missing for Listing Photos Generator: Smartmockups is now a feature inside Canva, not a listing pack tool. It does not generate titles, tags, descriptions or a checklist, and it does not check the mockup against the real product.

### Mockey

What it does well: cheap, high volume POD mockups, browser based, 27000 plus mockup templates claimed, free tier that is genuinely usable for casual sellers.
Listing photos, mockups, titles, tags: yes for mockups, no for titles, tags or descriptions. Apparel, mugs, posters and product mockups, professional backgrounds on Pro, AI background tools on Max.
Price: Free USD 0. Pro USD 9.99 a month, or USD 7.40 a month billed yearly, USD 88.80 a year. Max USD 23.30 a month billed yearly, USD 279.60 a year, adds 200 AI credits a month plus AI background remover, blurrer and generator. Lifetime Pro USD 199 one time. VERIFIED VIA SECONDARY SOURCE: AIOptools, verified 2026 pricing from each tool official site. Source: https://www.aitoptools.net/compare/mockey-vs-placeit/
Free limits: Free gives 1000 plus free templates, unlimited downloads, weekly new additions, JPG format. PNG export, 1600 by 2000 max resolution, mockup packs, professional backgrounds and no ads need Pro.
Billing and cancellation complaints: no billing complaint pattern was found for Mockey in the sources read. Mark that as no pattern found.
What is missing for Listing Photos Generator: Mockey is POD apparel first, not digital product first. No device frame pack for Sheets, no laptop plus phone hero preset, no title, tag or description pack, no reconciliation, and JPG only on free.

### Photoroom, listed in the task as Foto

Note on the name: the task lists "Foto". No tool called Foto with a distinct listing photo product was found in the sources read. Photoroom is the closest match in this category, a product photo editor, and is covered here as Foto, Photoroom. If Ali meant a different Foto tool, mark that as UNVERIFIED and do not assume it is Photoroom.
What it does well: background removal, AI backgrounds, shadows, retouching, resize to marketplace sizes, batch editing, mobile and web apps, API on Business.
Listing photos, mockups, titles, tags: yes for product photos, no for mockups in the device frame sense, and no for titles, tags or descriptions. It edits a photo the seller already has. It does not generate a listing pack.
Price: Pro USD 12.99 a month, or USD 89.99 a year, with 8000 AI credits and 1000 exports. Max USD 34.99 a month, or USD 250 a year, with 25000 credits and 3000 exports. Ultra USD 99 a month, or USD 990 a year, with 75000 credits and 10000 exports. VERIFIED VIA SECONDARY SOURCE: Photta, prices checked on photoroom.com on 2026-10-08. Source: https://www.photta.app/pricing-and-reviews/photoroom . Some sources quote Pro at about USD 7.50 a month billed yearly. That conflicts with USD 89.99 a year, about USD 7.50 a month, so the monthly and yearly figures are consistent when read as USD 12.99 monthly versus USD 89.99 yearly. Treat the USD 7.50 figure as the yearly equivalent, not a separate monthly price.
Free limits: CONFLICT, UNVERIFIED in detail. Sources disagree on three points:
- Watermark: some sources say free exports are watermarked, others say free has no watermark but is for personal, non-commercial use only.
- Export count: 50, 100, 250 exports a month are all quoted in different 2026 sources.
- Commercial use: Photta and Micks state the free plan is for personal, non-commercial use only, and using free images to sell needs a paid plan. That licence limit is the most consistent finding.
Do not quote a Photoroom free export count from this file until a live check confirms it.
Billing and cancellation complaints: no billing complaint pattern was found for Photoroom in the sources read. Mark that as no pattern found.
What is missing for Listing Photos Generator: Photoroom edits one photo at a time, it does not build a device frame pack, it does not write titles or tags, and its free plan cannot run a shop because of the non-commercial licence. Its AI backgrounds can also change the product look, which breaks the crisp render rule.

### Other mockup tools found

Dynamic Mockups: template plus API, bulk and automation, 100 plus templates plus AI scenes, 50 starter credits, USD 15 a month billed yearly, USD 19 monthly, per Trendlytic October 2026. Good for catalogues, not for a one product digital pack. Credit rules differ across its page in that source. Mark credit detail UNVERIFIED.
MockupHQ: free tier with 5 credits, Starter USD 9 a month, Creator USD 19 a month, Pro USD 49 a month, per MakerPipeline checked November 2026. Fast product mockups, credit based plans, seller focused library. Source: https://www.makerpipeline.com/compare/best-mockup-tools/
Printful mockup generator: free with an account, Printful catalog only. Useful only if the product is a Printful product. Not relevant to a Google Sheets planner.
ListingLint: a checker, not a maker. Checks if a product photo passes Amazon, eBay and Etsy rules, Amazon rules checked 2026-10-31 against Amazon Product image guide. No price was found in the sources read. Mark price UNVERIFIED. Useful as a model for a pre publish checklist, not as a listing pack competitor. Source: https://www.listing-lint.com/
Pixelcut: mentioned in secondary sources as having watermark free free exports, unusually generous versus Photoroom. No price was checked in this file. Mark UNVERIFIED, do not quote.

## What free limits convert, with evidence

Free limits that convert are the ones that let a seller finish one real listing, then hit a clear wall on the second or third listing.

- eRank Free: 5 keyword lookups a day, 5 audits a day, 1 AI use a day. That is enough to fix one listing, not to run a shop. The wall is daily, not watermarked. Sellers upgrade to Basic at USD 5.99 when they pass 30 listings or need 100 lookups a day. That is a clean conversion design.
- EverBee Hobby: free forever, no card, but sales and revenue columns are hidden. The free plan shows views, reviews and favorites only. The wall is data, not time. Sellers pay Growth to see the numbers that decide what to make. That wall is also the complaint: free users call the useful data locked behind pay.
- Alura Free: 5 searches a day, 10 listings to optimise. Enough to test the AI rewrite on one product, then the wall is listing count and search count. AI credits add a second wall on paid plans.
- Sale Samurai Freemium: 20 keyword searches a month, 10 listing analyses a month. That is about one product a month. The wall is monthly, and the 3 day trial with no card is the real conversion step, not the freemium plan.
- Canva Free: the editor is free, but Pro elements carry a crown, and background remover and Magic Resize are Pro only. The wall is per element and per export, not per day. A seller can design for free, then pays to remove a background or resize for Etsy.
- Placeit free: mostly watermarked previews. The wall is the download itself. A seller can browse for free, but cannot use the result.
- Photoroom free: the wall is licence, not count. Free is personal, non-commercial use only, so a seller cannot legally use a free export in a listing. That is a hard wall, and it is clearer than a watermark.
- Mockey free: the most generous free mockup tier in this set, 1000 plus templates, unlimited JPG downloads. The wall is format and resolution, PNG and 1600 by 2000 need Pro. That converts sellers who need a clean PNG, not sellers who need any mockup.
- Helium 10 and Jungle Scout: Helium 10 Free excludes Listing Builder, the tool a seller actually needs for copy. Jungle Scout has no free plan at all. Both convert by research first, listing second, which is the opposite order to Listing Photos Generator.

Lesson for Listing Photos Generator: give one complete listing pack free, with no watermark and with commercial use, then charge for the second pack, for more platforms, or for higher volume. Do not give a free pack that cannot be published, because that is the Placeit and Photoroom complaint pattern. Do not hide the useful data behind pay, because that is the EverBee complaint pattern. Make the free limit a count, such as one pack, not a watermark or a licence trap.

## Where users complain about paywalls or locked downloads

- EverBee: sales, revenue, conversion rate, trends and Tag Analyzer are locked behind Growth. Free users in reviews call that the biggest weakness. Annual renewal with no reminder and a 3 day refund window is the loudest billing complaint, with Trustpilot 3.2 from 55 reviews.
- Canva: too much of the library is Pro only, per Trustpilot reviewers. Premium templates and elements need Pro, background remover and Magic Resize need Pro, and refunds are mostly not given. Cancellation friction is reported, including charges after a believed cancellation and a paused subscription resuming.
- Marmalead: no free plan at all, and Trustpilot reviewers report being charged after a trial or after cancelling, with refunds refused within 14 days. The product itself is paid from the first use.
- Photoroom: free exports are watermarked in some sources and non-commercial in others, so the free tier cannot run a shop. Pro is mandatory for a professional listing, per multiple reviews.
- Placeit: most mockups need the subscription. Free templates are a small slice, mostly watermarked previews. The download is the paywall.
- Helium 10: Listing Builder, full Cerebro and PPC are locked on Free. The 2026 Starter retirement removed the cheap entry tier, so the first paid step is now Platinum at USD 99 to USD 129 a month.
- Jungle Scout: Listing Builder starts only on Growth Accelerator, not Starter. A Starter seller pays for research, then still writes the listing elsewhere.
- eRank: the free wall is daily count, not a locked download. That is the least complained about pattern in this set, because the free work is usable.
- Vela: Shopify reviewers report frustration over the transition from free to paid, feeling misled or unfairly charged, per ShopDigest summary. That is a secondary summary, not a direct count.

## Which mockup and template sets are genuinely different

- Placeit: genuinely different for lifestyle and model shots. Real models, real settings, video mockups, apparel, mugs, packaging, branding. No other tool in this set has the same depth of human lifestyle scenes. Weakness: familiar templates across Etsy, no device frame pack for digital products, no bulk generation.
- Smartmockups, now Canva Mockups: genuinely different for device frames. Laptop, phone, tablet and website in a frame, 5K export, URL screenshot. That is the closest existing model to the Listing Photos Generator mockup library, but it is now inside Canva, not a listing pack.
- Mockey: genuinely different for cheap high volume POD mockups. Free JPG tier is usable, Pro is cheaper than Placeit annual on the figures read. Weakness: apparel first, no digital product device pack.
- Dynamic Mockups: genuinely different for API and bulk catalogues. A seller can push a whole drop to Etsy or Shopify. Weakness: credit rules are unclear in the sources read, and it is catalogue first, not one product pack first.
- Photoroom: genuinely different for background and scene editing on a real photo. Background removal, AI backgrounds, shadows, batch editing. Weakness: it edits a photo, it does not place a real digital product inside a device frame with a crisp render rule.
- Canva: genuinely different for breadth, not depth. Templates, mockups, logos, videos, social posts and decks in one editor. Weakness: breadth means no single listing pack, and Pro elements create licence and watermark traps.
- Vela AI Photo Studio: genuinely different for listing optimisation at scale, with scores F- to A+ and 100 plus AI tools. Weakness: bulk and crosslist first, not one product pack, and price is high and conflicting.
- Printful: genuinely different only for Printful products. Free mockups for its own catalog, with commercial use. Not a general mockup library.

No tool in this set was found to offer all of the following together: laptop, phone, tablet, laptop plus phone hero, and flat frame, for a real digital product render, with a contain fit, centred, no stretch, no colour change and no crop unless the seller approves. That combination is the mockup gap.

## What is missing that Listing Photos Generator could fill

1. Reconciliation against the real product. No competitor in this set checks tab count, price, format or claims against the real product before publishing. Alura and EverBee use estimates. One independent test found an AI description generator inventing material claims. Listing Photos Generator should make reconciliation the product, not a feature: a pre publish checklist that blocks a pack when the tab count, price, format or a claim does not match the real product. For the test product, that means 12 tabs, Google Sheets format, and USD 13.97 list and USD 9.78 launch as given, with no new facts invented.
2. No invented claims in titles, descriptions or tags. Competitors generate copy from keyword data or from a text prompt, not from verified product facts. Listing Photos Generator should generate copy only from facts the seller confirms, and should flag any keyword that would add a false claim, such as a format, a tab count or a use the product does not have.
3. Crisp real product renders. Competitors stretch, crop, recolour or replace the product with a stock scene. Listing Photos Generator should enforce contain fit, centred, no stretch, no colour change, and no crop unless the seller approves. That rule should be visible in the export, not just in a help page.
4. One listing pack, not scattered subscriptions. A seller currently needs Canva or Placeit for photos, eRank or Marmalead for keywords, Alura for copy, and EverBee for research, at USD 5.99 plus USD 19 plus USD 11.99 plus USD 24.99 a month on the cheapest paid tiers in this file. Listing Photos Generator should deliver images, title, description, tags and a pre publish checklist as one pack for one product, in Etsy sizes first.
5. Platform specific exports in one pass. Etsy needs 2000 pixels on the shortest side and a clean first photo. eBay needs about 1600 by 1600 and up to 24 photos. Amazon Phase 2 needs pure white RGB 255,255,255, 85 percent fill and no text on the main image. No Etsy first tool in this set exports all three correctly from the same real product render. Listing Photos Generator should build the Etsy pack first, then eBay, then Amazon, with the Amazon main image rule enforced as a separate export, not as a recolour of the Etsy hero.
6. A free pack that can actually be published. The converting free limits in this set are count based and usable, such as eRank 5 a day. The complained about free limits are watermarked, non-commercial or data hidden, such as Placeit, Photoroom and EverBee. Listing Photos Generator should give one complete, watermark free, commercially usable pack free, then charge for more packs or more platforms. That avoids the paywall complaint pattern found for EverBee, Canva and Photoroom.
7. Transparent billing, learned from the complaint patterns. EverBee annual renewal with no reminder and a 3 day refund window, Marmalead charges after trial or cancellation with refunds refused, and Canva refunds mostly not given and cancellation friction, are the three clearest billing patterns in this file. Listing Photos Generator should state renewal, refund and cancellation in plain words before payment, send a renewal reminder, and not use a trial that converts silently.
8. Digital product device frames. Placeit and Mockey are apparel and lifestyle first. Smartmockups is device first but is now inside Canva and has no listing pack. Listing Photos Generator should own the digital product device set: laptop, phone, tablet, laptop plus phone hero, and flat frame, all from the same real Sheets render, with no stretch and no crop unless approved.
9. Shopify, Walmart and Facebook Marketplace structure, kept open, with the wider later shortlist in backlog only. No tool in this set was found to offer a single listing pack that starts on Etsy and then reuses the same verified facts for Shopify, TikTok Shop, Facebook Marketplace, Instagram Shopping, Walmart Marketplace, Google Shopping, Pinterest Shopping, Shopee, Lazada, Daraz and WooCommerce without retyping. Listing Photos Generator should keep the product facts in one place, so a later platform export does not invent new claims. That structure should be built in Phase 1, even if the exports ship later. v1 is Etsy only, digital products only.
10. A checklist, not just images. ListingLint is a checker, not a maker. Vela scores listings F- to A+. Neither delivers a full pack with a checklist that a seller can sign off. Listing Photos Generator should deliver the checklist with the pack, with each item tied to a real product fact, such as tab count, price, format and platform image size.

## Unverified items, full list

Do not quote or publish any item in this list as a fact until a live check confirms it.

1. Direct vendor pricing page recheck on 2026-11-05: NOT DONE. This subagent had no live browser. All prices in this file are VERIFIED VIA SECONDARY SOURCE, with the secondary check date stated, or marked as conflict or not publicly listed. A live browser check is needed before any price is quoted to a seller or on a sales page.
2. Canva Pro monthly price: secondary sources agree on USD 18 a month and USD 144 a year, but Canva prices vary by country and tax. The USD figures are US prices, before tax. Non US prices were not checked.
3. Marmalead trial: a 14 day money back guarantee, a 14 day trial on a free tools page, and terms saying the current period is not refunded, all appear in different sources. Which applies to a new buyer is UNVERIFIED.
4. Alura AI credits: the number of credits per title, tag or description generation, and the credit allowance per plan, were not found in a consistent form in the sources read. Mark UNVERIFIED.
5. EverBee Growth price: USD 39 monthly and USD 24.99 yearly in the 2026-11-02 check, versus USD 29.99 monthly and USD 19.99 yearly in older sources. The later figure is used here, but the change date and reason are UNVERIFIED.
6. Sale Samurai price history: USD 9.99 a month in an affiliate roundup versus USD 19.99 on the vendor page. Which was correct at which date is UNVERIFIED.
7. Vela price: USD 19.95, USD 29.95 and USD 39.95 all appear for Lite and Plus in different 2026 sources, plus older tiered USD 10 to USD 40 pricing. Current price is UNVERIFIED until a live check resolves the conflict. The Stocksmith rename on 2026-07-01 is reported, but the current pricing page URL was not directly checked.
8. InkFrog shutdown: shutdown on 2026-06-01 is reported by Nventory and by a Shopify review, but no InkFrog own shutdown notice was read in this file. Treat as reported, not as a direct vendor confirmation.
9. Helium 10 Enterprise price: USD 1499 a month from one source, custom in others. Mark UNVERIFIED.
10. Jungle Scout Brand Owner user count: visible page says 3 users, JSON-LD says 10 users, per Findstack July 2026. Which is correct is UNVERIFIED.
11. Sellerise free plan: one source reports a free plan, another reports only a 7 day trial. Free plan existence and order limits are UNVERIFIED.
12. EHunt price: NOT PUBLICLY LISTED on its pricing page when checked 2026-10-19. The USD 3.99 to USD 19.99 range in reviews is UNVERIFIED.
13. Placeit template count: 29000 plus assets, 40000 plus templates, and 50000 plus templates are all quoted in different sources. Count is UNVERIFIED.
14. Smartmockups free count: 200, 5000 plus and 200 plus free mockups are all quoted. Count is UNVERIFIED. Standalone pricing is historical only.
15. Photoroom free plan: watermark, export count and commercial licence conflict across sources. Free export count is UNVERIFIED. The non-commercial licence limit is the most consistent finding, but the exact watermark rule is UNVERIFIED.
16. Mockey template count: 27000 plus templates is a vendor claim in a secondary comparison. Count is UNVERIFIED as an independent fact.
17. eRank seller count: over 2 million sellers is a vendor claim. Count is UNVERIFIED as an independent fact.
18. Alura database size: 100 million plus listings on Growth, 1 million sample on Free and Basic, per Alura own comparison. Size is a vendor claim, UNVERIFIED as an independent fact.
19. EverBee accuracy: about 80 percent accuracy is a vendor claim in secondary sources. Accuracy is UNVERIFIED as an independent measurement.
20. Foto name: the task lists "Foto". No distinct tool called Foto was found. Photoroom is covered as the closest match, but that identification is UNVERIFIED. If Ali meant a different Foto tool, that tool is not covered in this file.
21. 3Dsellers pricing: USD 16 to USD 29 a month on annual billing, from its own InkFrog comparison page. Price is UNVERIFIED for direct quoting.
22. Dynamic Mockups credit rules: credit rules differ across its page in the source read. Credit cost per mockup is UNVERIFIED.
23. MockupHQ pricing: USD 9, USD 19 and USD 49 a month, from MakerPipeline checked November 2026. That is a secondary check, not a direct vendor page recheck on 2026-11-05.
24. Trustpilot scores: all Trustpilot scores in this file are as reported in secondary sources on the dates stated, with small samples for Marmalead, 11 reviews, eRank, 3 reviews, and EverBee, 55 reviews. They are not a fresh Trustpilot read on 2026-11-05.
25. Test product price: USD 13.97 list and USD 9.78 launch are task supplied from earlier work. They were not independently rechecked against a live Etsy listing in this file. Do not use them as a verified live price.

## Sources, main pages re-fetched 2026-11-05

- https://www.outrank.so/blog/etsy-seo-tools
- https://www.conversiongems.com/tools/everbee
- https://www.alura.io/vs/marmalead
- https://www.alura.io/vs/sale-samurai
- https://www.alura.io/vs/everbee
- https://revenuegeeks.com/etsy/seller-tools
- https://revenuegeeks.com/software/everbee
- https://www.trustpilot.com/review/everbee.io
- https://www.trustpilot.com/review/canva.com?page=2
- https://professionalstoolkit.com/articles/is-canva-legit
- https://saascrmreview.com/canva-pricing/
- https://designers-choice.net/how-much-is-canva-pro/
- https://www.listadum.com/blog/best-etsy-seller-tools
- https://editorialge.com/inventory-apps-for-etsy-and-handmade-sellers/
- https://www.3dsellers.com/promo/inkfrog-vs-3dsellers-lp
- https://dev.nventory.io/guides/best-inventory-sync-for-ebay
- https://www.trustradius.com/products/inkfrog/pricing
- https://www.openpr.com/news/4678517/helium-10-promo-code-and-black-friday-2026-guide-the-tools
- https://www.switchtools.io/tool/helium-10
- https://retailpresso.com/blog/helium-10-vs-jungle-scout
- https://findstack.com/products/jungle-scout/reviews?page=12
- https://revenuegeeks.com/software/sellerise/pricing
- https://teeinblue.com/blogs/en/best-etsy-app-for-custom-t-shirts
- https://www.aitoptools.net/compare/mockey-vs-placeit/
- https://www.photta.app/pricing-and-reviews/photoroom
- https://www.makerpipeline.com/compare/best-mockup-tools/
- https://www.usetools.design/tools/smartmockups
- https://resources.rework.com/tools/ai-design/best-ai-mockup-generators-2026
- https://mockitreal.com/blog/etsy-listing-photo-requirements
- https://nightjar.so/blog/ai-product-photos-for-etsy-shop
- https://kive.ai/learn/etsy-listing-photo-size
- https://blog.sellermagnet.com/post/amazon-product-image-requirements-2026/en
- https://www.backgroundless.io/blog/amazon-main-image-requirements
- https://www.listing-lint.com/
- https://snipbare.cybermax-tools.workers.dev/ebay-photo-requirements/
- http://instasize.com/learn/ebay-listing-photos
- https://www.allable.ai/blog/etsy-seo-tools/
- https://www.ecomstackhub.com/ai-tools-for-etsy-listings

## Next check before use

1. Live browser recheck of each vendor pricing page, in order: eRank, Marmalead, Alura, EverBee, Sale Samurai, Canva, Placeit, Photoroom, Helium 10, Jungle Scout, Sellerise, Vela or Stocksmith.
2. Resolve the Vela price conflict and the Photoroom free export conflict on the vendor pages.
3. Confirm the Foto name with Ali: Photoroom, or a different Foto tool.
4. Do not publish any price from this file until step 1 is done.
