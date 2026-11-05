# Platform Rules: Etsy, eBay, Amazon

## Purpose

This file is the Phase 1 rules reference for Listing Photos Generator. It records what Etsy, eBay and Amazon actually require for listing images, titles, tags or keywords, and digital products, so the generator does not invent a platform rule.

Scope: Etsy first, eBay second, Amazon third and Phase 2. Structure stays open for Shopify, Walmart and Facebook Marketplace later as added packs. Those later platforms are not covered here.

How to read this file:

- Every rule gives a source URL and a check date of 2026-11-05.
- Sources are official only: Etsy Help, Etsy Seller Handbook and Etsy legal policy pages; eBay Help, eBay Seller Center and eBay Developer docs; Amazon Seller Central help and Seller Central staff posts on sellercentral.amazon.com.
- Competitor blogs and third party guides were used only as leads to an official page. They are not cited as the source for a rule.
- A rule marked UNVERIFIED was not verified on an official page in this check. Do not build generator logic on it. Do not guess a number for it.
- Where official sources disagree, both versions are recorded. Do not pick one silently.
- Check date is 2026-11-05 for every rule below, unless a source page itself gives a different last updated date, in which case that date is also noted.

Product principle that sits above all three platforms: Listing Photos Generator turns a real digital product into a listing pack without inventing product facts. Reconciliation is mandatory: tab count, price, format and claims must match the real product. Crisp render rule: contain fit, centred, no stretch, no colour change, no crop unless the seller approves.

## Summary table

Amazon is strictest. Its main image rule is a hard compliance rule with suppression as the stated consequence, while Etsy and eBay are more flexible on background and on text in later images. Etsy is the only platform in this file with a native digital download listing flow verified on an official help page.

| Platform | Image size | Aspect ratio | Max images | Title length |
|---|---|---|---|---|
| Etsy | Recommended at least 2000 px width and height. First photo at least 635 px width and height to avoid showing up lower in search. | First photo horizontal (landscape) or square. No single mandatory ratio verified. | Up to 20 photos and 2 videos, 5 to 15 seconds each. | Up to 140 characters. Consider less than 15 words. |
| eBay | Minimum 500 px on the longest side. Recommended about 1600 by 1600 px. | 1:1 or 16:9 look best. | Up to 24 pictures. At least 1 picture required. | Up to 80 characters. |
| Amazon | 500 to 10,000 px on the longest side. Larger than 1,000 px on the longest side preferred for zoom. | UNVERIFIED: no mandatory ratio found on an official page in this check. Square 1:1 is a working practice only, not a verified rule. | UNVERIFIED hard maximum. Official recommendation is at least 1 main image plus at least 6 additional images and 1 video. Third party guides say 7 or 9 slots, not verified here. | Must not exceed 200 characters including spaces. Conflict recorded below: a 2026 Seller Central discussion reports a split into Item name 75 characters plus Item highlights 125 characters. |

## 1. Etsy

Platform order: first. Proven for digital products. Test product in this project is the Maid of Honor Planner, a Google Sheets product.

### 1.1 Image sizes and aspect ratios

- Recommended: listing photos at least 2000 px width and height. Source: https://help.etsy.com/hc/en-gb/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop , checked 2026-11-05.
- First photo minimum for search visibility: first listing photo at least 635 px width and height to avoid showing up lower in searches. Source: https://help.etsy.com/hc/en-gb/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop , checked 2026-11-05. Same rule repeated here: https://www.etsy.com/seller-handbook/article/1347574487014 , checked 2026-11-05.
- First photo orientation: first photo should be horizontal (landscape) or square, so the centre focal point appears in cropped thumbnail views. Source: https://help.etsy.com/hc/en-gb/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop , checked 2026-11-05.
- Thumbnails crop: use the listing thumbnail adjustment tool to set and preview how the image may look across Etsy. Make sure thumbnail images have enough of a border that they can be cropped to square, portrait and landscape thumbnails without losing some of the product. Source: https://help.etsy.com/hc/en-gb/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop , checked 2026-11-05.
- Note on a tension inside one official page: the same help page says first photo should be horizontal or square, and in its thumbnail section says avoid square crops and upload horizontal or landscape images. Both statements are recorded here. Generator implication: use a landscape or square master, keep the product centred with a safe border, and do not rely on edge text surviving a crop. Source: https://help.etsy.com/hc/en-gb/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop , checked 2026-11-05.
- UNVERIFIED: a single mandatory aspect ratio for Etsy listing images. No such ratio was stated on the official pages opened in this check.

### 1.2 Minimum and recommended pixels

- Recommended minimum: at least 2000 px on width and height. Source: https://help.etsy.com/hc/en-gb/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop , checked 2026-11-05.
- First photo floor: at least 635 px width and height. Source: https://www.etsy.com/seller-handbook/article/1347574487014 , checked 2026-11-05.
- Troubleshooting note on the same point: Etsy recommends images be at least 2000 px wide, and an error message "Listings look best with photos at least 2000 pixels wide" appears when images are less than 2000 px wide. The page says this error is only a suggestion and publishing can continue. Source: https://help.etsy.com/hc/en-us/articles/115015628707-How-to-Create-a-Listing?segment=selling , checked 2026-11-05.

### 1.3 Maximum number of images

- Up to 20 photos and 2 videos that are 5 to 15 seconds in length per listing. Source: https://help.etsy.com/hc/en-us/articles/115015628707-How-to-Create-a-Listing?segment=selling , checked 2026-11-05.
- Note on an older version: a search excerpt of an older version of the same help page said up to 20 photos and 1 video. The current page opened in this check says 2 videos. Record both, and use the current page value of 2 videos. Source for current value: https://help.etsy.com/hc/en-us/articles/115015628707-How-to-Create-a-Listing?segment=selling , checked 2026-11-05.

### 1.4 Main image background and text rules

- First thumbnail: avoid text overlays, collages, or using a collection of images for the first thumbnail when optimising the first listing for search. Source: https://www.etsy.com/seller-handbook/article/1347574487014 , checked 2026-11-05.
- Background: keep the background simple, a clean neutral background ensures the focus stays on the product. This is guidance in the Seller Handbook article, not a pure white background rule. Source: https://www.etsy.com/seller-handbook/article/1347574487014 , checked 2026-11-05.
- First photo clarity: make the first listing photo the clearest, most realistic representation of the item buyers will receive. Source: https://help.etsy.com/hc/en-gb/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop , checked 2026-11-05.
- Accuracy: all images must accurately reflect the item's true appearance, including colour, condition, scale and materials. Source: https://www.etsy.com/uk/legal/policy/listing-image-requirements/253962679005 , checked 2026-11-05. That policy page states last updated on 05 Nov, 2026.
- Unedited photo: for most products, include at least one unedited photo of the actual item against a real background. This photo does not need to be the first image. Videos can complement photos but do not replace the required unedited photo. See rules by product type for exceptions. Source: https://www.etsy.com/uk/legal/policy/listing-image-requirements/253962679005 , checked 2026-11-05.
- Editing on other images: outside the required unedited photo, photo editing tools including AI may be used to adjust lighting or colour, crop or resize images, or change backgrounds, provided the final result remains an accurate representation. Do not use editing to hide flaws, conceal damage, or edit an item's appearance to make it look different from what the buyer will receive. Do not use images that create false expectations. Source: https://help.etsy.com/hc/en-gb/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop , checked 2026-11-05.
- Watermark note on the unedited photo: the policy page says a seller is allowed to crop, add a watermark, resize, or change the file format of the unedited photo, but must not use AI powered tools to do so, otherwise systems may flag the photo as AI edited. Source: https://www.etsy.com/uk/legal/policy/listing-image-requirements/253962679005 , checked 2026-11-05.
- Consequence for misleading images: if the item received is materially different from the image, Etsy may issue the buyer a refund and the seller may be responsible for the refund amount. Etsy may remove misleading listings. Repeated violations may result in additional enforcement action, up to and including shop removal. Source: https://www.etsy.com/uk/legal/policy/listing-image-requirements/253962679005 , checked 2026-11-05.

### 1.5 File types and file size limits

- Image file types: all images in the shop should be one of .jpg, .gif, .png, .svg, or .heic. These are the only image file types Etsy supports. Animated .gif files and transparent .png files are not supported. If a file contains transparency, the transparent parts will appear black on Etsy. Source: https://help.etsy.com/hc/en-gb/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop , checked 2026-11-05.
- Practical upload warning: images larger than 1MB in file size may not finish uploading, especially on a slower internet connection. Source: https://help.etsy.com/hc/en-gb/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop , checked 2026-11-05.
- UNVERIFIED: a hard maximum file size in MB for Etsy listing images. The official page gives the 1MB upload warning above, not a hard cap. Do not state a hard cap as an Etsy rule.
- Colour profile: convert images to sRGB using image editing software before uploading to ensure colours on the site match the originals. Etsy converts images to use the sRGB colour profile. CMYK colour profile is for print only. Source: https://help.etsy.com/hc/en-gb/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop , checked 2026-11-05.
- UNVERIFIED: a stated maximum pixel dimension for Etsy listing images. No upper pixel limit was stated on the official pages opened in this check.

### 1.6 Title length

- Maximum: a listing title can be up to 140 characters long. Consider using less than 15 words when including the traits that make the item special. Clearly state what the item is and any key details. Avoid repetition as well as subjective words, for example "perfect". There is no need to add information about price or shipping to the title. Only include holidays, special occasions, or recipient types if they are essential to what the item is, for example "Halloween costume". Source: https://help.etsy.com/hc/en-us/articles/115015628707-How-to-Create-a-Listing?segment=selling , checked 2026-11-05.
- Same guidance in the Seller Handbook: consider using less than 15 words, include the most important traits upfront, move subjective words like "perfect" or "beautiful" to the description, try not to repeat words, do not add price, shipping, or sales information. Source: https://www.etsy.com/seller-handbook/article/1347574487014 , checked 2026-11-05.

### 1.7 Tags and keywords rules

- Count: add up to 13 tags that describe the item. Source: https://help.etsy.com/hc/en-us/articles/115015628707-How-to-Create-a-Listing?segment=selling , checked 2026-11-05.
- Length per tag: each tag can contain up to 20 characters. Source: https://help.etsy.com/hc/en-us/articles/360000336307-Using-Tags-to-Get-Found-in-Search , checked 2026-11-05.
- Characters allowed: tags can only include spaces, letters, numbers. A seller is able to use the apostrophe and hyphen within words and phrases, but cannot start a tag with these characters. Source: https://help.etsy.com/hc/en-us/articles/360000336307-Using-Tags-to-Get-Found-in-Search , checked 2026-11-05.
- Use: use up to 13 tags per listing. A single tag can be a short descriptive phrase, for example "silver earrings" or "minimalist jewelry". Tags should use accurate and relevant words and phrases. Use a diverse array of tags. Source: https://help.etsy.com/hc/en-us/articles/360000336307-Using-Tags-to-Get-Found-in-Search , checked 2026-11-05.
- Handbook advice: add 13 tags to all listings. Tags should be multi-word phrases and use natural sounding language. Source: https://www.etsy.com/seller-handbook/article/1347574487014 , checked 2026-11-05.
- Attributes: attributes also act like tags and can help an item match with a shopper's search. If a phrase appears in attributes, it does not need to be added as a separate tag. Source: https://www.etsy.com/seller-handbook/article/1347574487014 , checked 2026-11-05.
- Description keywords: Etsy search considers keywords and phrases within listing descriptions when ranking listings. Aim to incorporate relevant keywords in the first few sentences. Avoid copying the title verbatim or simply listing top keywords. Source: https://www.etsy.com/seller-handbook/article/1347574487014 , checked 2026-11-05.
- UNVERIFIED: an official Etsy description character limit. No description length cap was stated on the official pages opened in this check.

### 1.8 Digital product specific rules

- Two categories: instant downloads (ready-made files the buyer can access immediately upon purchase) and made-to-order downloads (custom files made to a buyer's specification, sent upon completion). Source: https://help.etsy.com/hc/en-gb/articles/115015628347-How-to-Manage-Your-Digital-Listings , checked 2026-11-05.
- Digital files count and size: upload up to five digital files. The maximum size for each file is 20 MB. This applies to instant downloads at listing creation and to made-to-order files at order completion. Source: https://help.etsy.com/hc/en-gb/articles/115015628347-How-to-Manage-Your-Digital-Listings , checked 2026-11-05.
- Digital file types: .bmp, .doc, .gif, .jpeg, .jpg, .mobi, .mov, .mp3, .mpeg, .pdf, .png, .psp, .rtf, .stl, .txt, .zip, .ePUB, .iBook. Source: https://help.etsy.com/hc/en-gb/articles/115015628347-How-to-Manage-Your-Digital-Listings , checked 2026-11-05.
- File names: file names are limited to 70 alphanumeric characters, periods, underscores, or hyphens. The file names buyers see are the same ones uploaded. There is no way of editing the name after uploading. Source: https://help.etsy.com/hc/en-gb/articles/115015628347-How-to-Manage-Your-Digital-Listings , checked 2026-11-05.
- No file, no publish: a seller will be unable to publish or save an instant digital listing if there is no file attached to it. Source: https://help.etsy.com/hc/en-gb/articles/115015628347-How-to-Manage-Your-Digital-Listings , checked 2026-11-05.
- Variations: no variations for digital items. Variations are unavailable for digital listings. Source: https://help.etsy.com/hc/en-gb/articles/115015628347-How-to-Manage-Your-Digital-Listings , checked 2026-11-05, and https://help.etsy.com/hc/en-us/articles/115015628707-How-to-Create-a-Listing?segment=selling , checked 2026-11-05.
- Digital delivery: if the listing is for a digital item, buyers will download the files uploaded immediately after purchase. Source: https://help.etsy.com/hc/en-us/articles/115015628707-How-to-Create-a-Listing?segment=selling , checked 2026-11-05.
- Digital image rule: some digital items, like audio files, do not have visual elements. For those listings, representative imagery may be used, including AI generated images, as long as it does not mislead buyers about what they are purchasing. All other digital downloads should include a visual preview or excerpt of the content buyers will receive. Source: https://www.etsy.com/uk/legal/policy/listing-image-requirements/253962679005 , checked 2026-11-05.
- Generator implication for the Maid of Honor Planner: the pack must show a real visual preview or excerpt of the actual Sheets content, not only a device frame with placeholder text. Mockups are supporting images, not a substitute for a true preview. The preview must match the real tab count, price, format and claims in the reconciliation check.

## 2. eBay

Platform order: second. Physical focus in normal listings. Digital products are restricted, see section 2.8.

### 2.1 Image sizes and aspect ratios

- Minimum: photos must be at least 500 px on the longest side. Source: https://www.ebay.com/help/policies/listing-policies/picture-policy?id=4370 , checked 2026-11-05.
- Recommended: images should have a minimum resolution of 500 by 500 px but eBay recommends images that are about 1600 by 1600 px. Source: https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148 , checked 2026-11-05.
- Aspect ratio: generally, photos in a 1:1 or 16:9 aspect ratio look best in listings, search results and other placements. Source: https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148 , checked 2026-11-05.

### 2.2 Minimum and recommended pixels

- Minimum: 500 px on the longest side, and 500 by 500 px in the photo tips section. Source: https://www.ebay.com/help/policies/listing-policies/picture-policy?id=4370 , checked 2026-11-05, and https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148 , checked 2026-11-05.
- Recommended: about 1600 by 1600 px. Source: https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148 , checked 2026-11-05.
- Quality note: upload high resolution, larger photos that are not blurry or pixelated. Small photos get blurry when enlarged. Source: https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148 , checked 2026-11-05.
- UNVERIFIED: a pixel size that enables zoom on eBay. Third party guides cite 800 by 800 px or 1600 by 1600 px for zoom, but no zoom threshold was stated on the official pages opened in this check.

### 2.3 Maximum number of images

- Up to 24 pictures per listing. At least one picture is required. The first picture added, called the main photo, appears next to the item title in search results. Source: https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148 , checked 2026-11-05.
- Same count in Best Match guidance: include up to 24 pictures for free. Source: https://www.ebay.com/help/selling/listings/creating-managing-listings/optimizing-listings-best-match?id=4166 , checked 2026-11-05.
- Storage note: eBay stores copies of photos and they stay in completed listings for up to 90 days. Source: https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148 , checked 2026-11-05.

### 2.4 Main image background and text rules

- Background: display items in an uncluttered space against a neutral backdrop. White backgrounds are generally best, but for shiny or reflective items like a piece of jewelry, a darker background may work better. Source: https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148 , checked 2026-11-05.
- Background tool: eBay offers a background enhancement tool that can replace the background with a solid white colour. Source: https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148 , checked 2026-11-05.
- Main photo content: main photo should show the whole item face-on. It will be the photo that appears in search results. Source: https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148 , checked 2026-11-05.
- No added text: photos with added text, artwork or marketing material are not allowed. Source: https://www.ebay.com/help/policies/listing-policies/picture-policy?id=4370 , checked 2026-11-05.
- No added borders: photos with added borders are not allowed. Source: https://www.ebay.com/help/policies/listing-policies/picture-policy?id=4370 , checked 2026-11-05.
- No watermarks: watermarks of any type are not allowed, including those used for ownership attributions. Source: https://www.ebay.com/help/policies/listing-policies/picture-policy?id=4370 , checked 2026-11-05.
- No graphics: do not add graphics to images such as badges, logos, copyright notices or watermarks, as they can affect listing placement in search results. Source: https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148 , checked 2026-11-05.
- Accuracy: photos that do not accurately represent the item are not allowed. Placeholder images used to convey messages are not allowed. Stock photos for used, damaged, or defective items are not allowed. Source: https://www.ebay.com/help/policies/listing-policies/picture-policy?id=4370 , checked 2026-11-05.
- Single item and bundle: for single items, main photos should not include any variations. For bundles, the main photo should show all items for sale. Source: https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148 , checked 2026-11-05.
- Used items: a catalog or stock photo cannot be used if listing an item as used. Source: https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148 , checked 2026-11-05.

### 2.5 File types and file size limits

- Accepted formats: JPEG, PNG, GIF, TIFF, BMP, WEBP, HEIC, or AVIF. Source: https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148 , checked 2026-11-05.
- Maximum file size: maximum 12MB each. The same limit is stated in the upload steps and in the problems section. Source: https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148 , checked 2026-11-05.
- UNVERIFIED: a stated maximum pixel dimension for eBay images. No upper pixel limit was stated on the official pages opened in this check.

### 2.6 Title length

- Maximum: 80 characters. eBay Seller Center guidance says: "You have got 80 characters to use, so use as many as you can in your title. Include the brand, model or type, color, style, and even the model number. Avoid using special characters or irrelevant words." Source: https://www.ebay.com/sellercenter/listings/3d-seller , checked 2026-11-05.
- Same limit in Best Match guidance: write a clear and concise title with correct spelling and no more than 80 characters. Source: https://www.ebay.com/help/selling/listings/creating-managing-listings/optimizing-listings-best-match?id=4166 , checked 2026-11-05.
- Subtitle: maximum length 55 characters. A subtitle is a paid optional listing upgrade, displayed on the View Item page and in search results. Source: https://developer.ebay.com/api-docs/user-guides/static/trading-user-guide/listing-title.html , checked 2026-11-05. This is an eBay Developer doc, not a seller help page, and it is recorded as such.
- Title style: avoid writing entire words in capital letters or with asterisks and other markers between words. These practices can lower listing ranking in search results. Source: https://export.ebay.com/in/growth/promotion-strategies/how-to-optimize-your-listings/ , checked 2026-11-05.

### 2.7 Tags and keywords rules

- UNVERIFIED: a separate Etsy style tag field for eBay, with a tag count and a per tag character limit. No such field was stated on the official eBay pages opened in this check. Do not generate 13 tags for eBay by copying the Etsy rule.
- What is verified: keywords belong in the title, subtitle, item specifics and description. eBay Best Match guidance says to write a clear title, add an accurate description, and complete item specifics. Source: https://www.ebay.com/help/selling/listings/creating-managing-listings/optimizing-listings-best-match?id=4166 , checked 2026-11-05.
- Item specifics: complete and accurate listings help Best Match ranking. Better item specifics can help deliver more traffic, according to eBay community and Seller Center material, but no fixed traffic multiplier was verified on the official help page opened in this check. Do not quote a multiplier as an official figure. Source for the completeness point: https://www.ebay.com/help/selling/listings/creating-managing-listings/optimizing-listings-best-match?id=4166 , checked 2026-11-05.
- Description: add an accurate description, using product details from the eBay catalog wherever possible. Source: https://www.ebay.com/help/selling/listings/creating-managing-listings/optimizing-listings-best-match?id=4166 , checked 2026-11-05.

### 2.8 Digital product specific rules

- Definition: electronically delivered goods are products that exist in a digital format and can be delivered to customers via email or a download link. Examples include music files, software, digital art, electronic books, video files, training materials, electronic tickets, and PDF files with original content. Source: https://export.ebay.com/en/first-steps/manage-listings/how-to-list-and-deliver-digital-items-on-ebay/ , checked 2026-11-05.
- Approval rule as stated on eBay's export site: sellers need to be eBay approved to list electronically delivered items outside of the Everything Else, Information Products category. Sellers not approved by eBay to list electronically delivered items need to list their items in the Everything Else, Information Products category in the classified ad format. Source: https://export.ebay.com/en/first-steps/manage-listings/how-to-list-and-deliver-digital-items-on-ebay/ , checked 2026-11-05.
- Not allowed examples in the same source: software keys the seller is not authorized to sell, and digital copies or codes of movies that were included as part of purchasing a physical movie item, where the seller needs to include the physical disk with the sale. Source: https://export.ebay.com/en/first-steps/manage-listings/how-to-list-and-deliver-digital-items-on-ebay/ , checked 2026-11-05.
- Physical media route in the same source: a seller can sell digital files via auctions or Buy It Now listings when the file is delivered on a disk or a thumb drive. List the item in the category that best describes the item and provide a valid shipping method. Source: https://export.ebay.com/en/first-steps/manage-listings/how-to-list-and-deliver-digital-items-on-ebay/ , checked 2026-11-05.
- CONFLICT and UNVERIFIED current availability: third party reporting in 2026 says eBay removed the ability to create new Classified Ads in non-vehicle categories, while eBay help material still carries older language about the classified ad route for electronically delivered items. This check did not resolve that conflict on an official eBay page. Do not build an eBay digital download pack as a standard Buy It Now listing. Treat eBay digital as blocked pending a live check in the eBay sell flow. Source for the conflict note: the eBay export page above, checked 2026-11-05, plus the unresolved third party report, which is not cited as a rule source.
- Generator implication: for Phase 1, eBay is a second platform for physical delivery or for a physical media version only, not a direct equivalent of the Etsy instant download flow. A Google Sheets planner sold on eBay would need either eBay approval, the classified ad route if still available, or delivery on physical media, none of which is assumed in this file.

## 3. Amazon

Platform order: third, Phase 2. Strictest image rules. Physical focus. The Amazon Seller Central help page for the product image guide did not render full text in this check: https://sellercentral.amazon.co.uk/help/hub/reference/external/1881 returned only a feedback form when opened on 2026-11-05. Rules below are therefore cited to Seller Central staff posts on sellercentral.amazon.com that reproduce the guide, and to the UK guide search excerpt where noted. Do not treat a staff forum summary as the full standalone help page. Recheck the standalone guide in Seller Central before building the Amazon pack.

### 3.1 Image sizes and aspect ratios

- Range: 500 to 10,000 px on the longest side. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/4b3c4c39-6f8c-4312-aa0e-99982eb8f5e1 , checked 2026-11-05. This is a Seller Central staff post by Manny_Amazon reproducing the Product Image Requirements page.
- Zoom threshold: prefer images larger than 1,000 px on the longest side to allow for zoom. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/4b3c4c39-6f8c-4312-aa0e-99982eb8f5e1 , checked 2026-11-05.
- Same zoom point in the Prime Day listing post: images should be 1,000 px or larger on the longest side to enable zoom. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/932a3e7b-ba4e-4383-99ab-142149087754 , checked 2026-11-05.
- Optimal size: 1,600 px or more is called optimal in Seller Central forum material. This value appears in search excerpts of Seller Central posts, not in the two staff posts opened in full in this check. Record it as reported in Seller Central material, not as a standalone help page rule verified in full here. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/0149bdb3-2056-42ce-b0bb-9eef94e3d2b8 , checked 2026-11-05.
- UNVERIFIED: a mandatory aspect ratio for Amazon listing images. No mandatory ratio was stated in the Seller Central posts opened in this check. Square 1:1 is a common working practice in third party guides, not a verified Amazon rule. Do not enforce a ratio as an Amazon rule.
- UNVERIFIED: a stated minimum on the shortest side for Amazon images in the posts opened in full. A separate Seller Central forum excerpt says images must be at least 1,000 px on the longest side and at least 500 px on the shortest side to be zoomable. That excerpt was not opened in full in this check, so the shortest side part is UNVERIFIED here.

### 3.2 Minimum and recommended pixels

- Minimum: 500 px on the longest side. Files under 500 px cannot be uploaded, according to the guide summary. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/4b3c4c39-6f8c-4312-aa0e-99982eb8f5e1 , checked 2026-11-05.
- Recommended for zoom: larger than 1,000 px on the longest side. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/4b3c4c39-6f8c-4312-aa0e-99982eb8f5e1 , checked 2026-11-05.
- Maximum: 10,000 px on the longest side. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/4b3c4c39-6f8c-4312-aa0e-99982eb8f5e1 , checked 2026-11-05.
- Quality: images must be clear with no pixelation or jagged edges. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/4b3c4c39-6f8c-4312-aa0e-99982eb8f5e1 , checked 2026-11-05.
- Resolution note, reported only: a Seller Central forum post on product photography standards dated 2026-02-03 lists at least 72 dpi. That post was found by search, not opened in full in this check. Record it as reported, not as a fully verified standalone rule. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/0149bdb3-2056-42ce-b0bb-9eef94e3d2b8 , checked 2026-11-05.

### 3.3 Maximum number of images

- Recommendation, not a hard cap verified here: every product must have at least one image. Amazon recommends having at least six images and one video of the product. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/4b3c4c39-6f8c-4312-aa0e-99982eb8f5e1 , checked 2026-11-05.
- Same recommendation in the UK guide search excerpt: every product requires at least one compliant main image. Amazon recommends uploading at least six additional images and one video. Source: https://sellercentral.amazon.co.uk/help/hub/reference/external/1881 , checked 2026-11-05. Note: the page did not render full text when opened, so this is a search excerpt from that official URL, not a full page read.
- UNVERIFIED hard maximum: third party guides say up to 7 images, or up to 9 images with only 7 shown on the detail page. No hard maximum was stated in the official Seller Central posts opened in this check. Do not build a hard Amazon image cap of 7 or 9 into the generator until the standalone guide is rechecked.

### 3.4 Main image background and text rules

- Background: pure white background, RGB 255, 255, 255, for main images. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/932a3e7b-ba4e-4383-99ab-142149087754 , checked 2026-11-05, and UK guide search excerpt at https://sellercentral.amazon.co.uk/help/hub/reference/external/1881 , checked 2026-11-05.
- Product fill: product must fill at least 85 percent of the image frame. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/932a3e7b-ba4e-4383-99ab-142149087754 , checked 2026-11-05.
- Product shown: main image shows the product only, whole, with one unit plus any accessories included in the purchase. Show the entire product within the frame, not cutting off any part. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/759f82d5-d4d3-4eff-bda6-e536390ad295 , checked 2026-11-05. This is a Seller Central forum post reproducing the guide, found by search and cited here as a reproduction, not as a full standalone help page read.
- No text or graphics on main image: main image must not include text, logos, borders, colour blocks, watermarks, or other graphics covering the product or in the background. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/759f82d5-d4d3-4eff-bda6-e536390ad295 , checked 2026-11-05.
- No packaging unless important: main images must show products outside their packaging. Boxes, bags or cases should not appear unless they are an important product feature. Source: search excerpt of Seller Central material at https://sellercentral.amazon.com/seller-forums/discussions/t/ab884127-f9b4-4053-8096-4991e1d60d1f , checked 2026-11-05.
- No props or excluded accessories: show only what is included in the purchase, no props or accessories that are not part of the order. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/0149bdb3-2056-42ce-b0bb-9eef94e3d2b8 , checked 2026-11-05.
- Accuracy and suppression: images that do not meet standards may be rejected, removed, or altered. Non-compliant images can lead to product listing suppression from search results. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/4b3c4c39-6f8c-4312-aa0e-99982eb8f5e1 , checked 2026-11-05.
- All images: all product images must accurately represent the product being sold and match the product title. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/759f82d5-d4d3-4eff-bda6-e536390ad295 , checked 2026-11-05.
- CONFLICT on text in additional images: one Seller Central forum thread notes contradicting information across Amazon style guides on whether text is allowed on secondary images, with one page saying no text or pricing details (Swatch only) and another source saying text may be allowed if it is not the main image. This check did not resolve that conflict. Do not put marketing text on any Amazon image until the category style guide is checked. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/4b3c4c39-6f8c-4312-aa0e-99982eb8f5e1 , checked 2026-11-05, comments section.
- Category rules: category specific style guides can add rules. Treat the category style guide in Seller Central as the final word for a given product. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/932a3e7b-ba4e-4383-99ab-142149087754 , checked 2026-11-05.

### 3.5 File types and file size limits

- Accepted formats: JPEG (.jpg or .jpeg), TIFF (.tif), PNG (.png), or non-animated GIF (.gif). JPEG is preferred. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/4b3c4c39-6f8c-4312-aa0e-99982eb8f5e1 , checked 2026-11-05.
- DISPUTED and UNVERIFIED file size cap: many third party guides state a 10 MB maximum per image. A separate third party analysis of the official guide says Amazon publishes no file size cap for listing images, and that the 10 MB figure is most likely a misreading of the A+ Content limit, which is 2 MB. This check did not find a file size cap in MB on the official Seller Central posts opened in full. Record both versions. Do not enforce 10 MB as a verified Amazon rule. Source for the dispute note: third party guides only, not cited as a rule source. Official source checked for formats and pixels: https://sellercentral.amazon.com/seller-forums/discussions/t/4b3c4c39-6f8c-4312-aa0e-99982eb8f5e1 , checked 2026-11-05.
- Colour: RGB is listed as preferred rather than required in the guide summary, according to third party reporting of the official guide. UNVERIFIED as a direct official read in this check. Do not enforce a colour profile as a hard Amazon rule until rechecked.

### 3.6 Title length

- Maximum: titles must not exceed 200 characters including spaces. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/932a3e7b-ba4e-4383-99ab-142149087754 , checked 2026-11-05.
- Same limit in the January 2025 title update: for most product categories, titles may not exceed 200 characters, including spaces. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/b2b15728-0d43-453e-974f-59eb63f73059 , checked 2026-11-05.
- Title rules: do not include promotional phrases such as "free shipping" or "100% quality guaranteed". Avoid restricted special characters (!, $, ?, _, {, }, ^, and similar). Do not repeat the same word more than twice. Include the minimum information needed to clearly identify the product: brand, product type, key differentiator. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/932a3e7b-ba4e-4383-99ab-142149087754 , checked 2026-11-05.
- CONFLICT, June 2026 split: a Seller Central forum discussion reports that, with the Item name and Item highlights update, the 200 characters are split between Item name (75 characters) and Item highlights (125 characters), and that Item highlights display beneath the Item name. This was reported in a Seller Central forum discussion found by search, not verified on a standalone help page in this check. Record both the 200 character total and the reported 75 plus 125 split. Do not build Amazon title logic on the 200 character total alone without rechecking the current Seller Central title fields. Source: https://sellercentral.amazon.com/seller-forums/discussions?dateRange=threeMonths&replies=repliesAll&categories%5B0%5D=amzn1.spce.category.8b1ad9d2&contentType=ALL , checked 2026-11-05.
- Category exceptions: the Prime Day post links to "Title length criteria exceptions". Exceptions by category were not verified in this check. Mark category specific title limits as UNVERIFIED.

### 3.7 Tags and keywords rules

- Bullet points: use all 5 available bullet points. Begin each bullet with a capital letter. Format as sentence fragments, no end punctuation needed. Highlight key features, materials, dimensions and use cases. Never include promotional, pricing, or shipping information. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/932a3e7b-ba4e-4383-99ab-142149087754 , checked 2026-11-05.
- Attributes: fill in all required and recommended attributes for the category. Use accurate values, incorrect attributes can lead to suppression. Review the category specific style guide. Source: https://sellercentral.amazon.com/seller-forums/discussions/t/932a3e7b-ba4e-4383-99ab-142149087754 , checked 2026-11-05.
- UNVERIFIED: backend search terms limit of less than 250 bytes. Secondary guides quote Amazon Seller Central help as saying "We limit the length of the Generic Keyword attribute to less than 250 bytes." That official help page was not opened in full in this check, so the 250 byte limit is UNVERIFIED here. Do not build Amazon keyword logic on 250 bytes until the official "Use search terms effectively" page is opened and read. Source for the secondary report only, not a rule source: https://blog.sellermagnet.com/post/amazon-backend-search-terms-2026/en , checked 2026-11-05.
- UNVERIFIED: Amazon description length and bullet point character limits. No description or bullet character limit was verified on an official page in this check.

### 3.8 Digital product specific rules

- UNVERIFIED and NOT APPLICABLE as a direct equivalent: no standard Amazon digital download listing flow, equivalent to the Etsy instant download flow, was verified on an official Seller Central page in this check. Amazon in this file is a physical product marketplace with strict main image rules.
- Do not assume a Google Sheets planner, a PDF, or a ZIP file can be listed on Amazon as a downloadable product in the same way as on Etsy. A separate Amazon digital route check is required in Phase 2, for example Kindle Direct Publishing, Amazon Digital Services, or a physical media version, before any Amazon digital pack is built.
- Generator implication: the Amazon pack in Phase 2 must be treated as a physical presentation pack first, with a pure white main image, product fill at least 85 percent, and no text on the main image, unless a separate verified digital route is found and recorded here.

## 4. Cross platform generator implications

These are design implications from the verified rules above, not extra platform rules.

- Master image: export a square master at 2000 by 2000 px or larger, in sRGB, as JPEG. That size meets the Etsy recommended 2000 px, the eBay recommended 1600 by 1600 px, and the Amazon zoom preference of larger than 1000 px on the longest side. It does not by itself meet the Amazon pure white main image rule, which depends on background and content, not only on size.
- Contain fit: use contain fit, centred, no stretch, no colour change, no crop unless the seller approves. This is the project crisp render rule. It conflicts in practice with Etsy thumbnail cropping and with the Amazon 85 percent fill rule, so the generator must leave a safe border on the master and must flag any platform crop or fill requirement that would cut the product, rather than silently cropping.
- Mockup library: real product render inside device frames (laptop, phone, tablet, laptop plus phone hero, flat frame). Mockups are supporting images on Etsy and eBay, where a clean main image is still required, and they are not a compliant Amazon main image, which must show the product alone on pure white. Do not use a device frame mockup as the Amazon main image.
- Text on images: Etsy first image, avoid text overlays and collages. eBay, no added text, artwork, marketing material, borders, or watermarks on any listing photo. Amazon main image, no text, logos, borders, colour blocks, watermarks, or other graphics. Put feature text, tab lists, prices and claims in the listing copy and in later supporting images only where the platform allows it, and always reconcile that text against the real product.
- Reconciliation check: before export, check tab count, price, format and claims against the real product. Etsy requires a visual preview or excerpt of digital content. eBay requires photos that accurately represent the item. Amazon requires all images to accurately represent the product and match the title. A mismatch is a platform risk on all three, not only a quality issue.
- Titles: do not reuse one title across platforms. Etsy allows 140 characters, eBay allows 80 characters, Amazon allows 200 characters in total with a reported 75 plus 125 split. Generate a separate title per platform from the same verified product facts.
- Tags: do not reuse Etsy tags on eBay or Amazon. Etsy uses up to 13 tags, each up to 20 characters. eBay has no verified separate tag field in this check. Amazon backend search terms are UNVERIFIED in this check at less than 250 bytes. Generate keywords per platform, from the title, item specifics or attributes, and description, as each platform defines them.

## 5. Conflicts and disagreements recorded

- Etsy video count: current help page says 2 videos, an older excerpt said 1 video. Use 2 videos, per the current page opened on 2026-11-05.
- Etsy first photo shape: help page says horizontal or square, and in the thumbnail section says avoid square crops and upload horizontal or landscape images. Both are recorded in section 1.1.
- Amazon file size: third party guides say 10 MB per image, a separate analysis says Amazon publishes no cap for listing images and 10 MB is most likely a misreading of the A+ Content 2 MB limit. No MB cap was found in the official posts opened in full. Recorded as disputed and UNVERIFIED in section 3.5.
- Amazon title: 200 character total is verified in Seller Central posts, and a June 2026 discussion reports a split into Item name 75 characters plus Item highlights 125 characters. Both are recorded in section 3.6.
- Amazon text in additional images: Seller Central forum comments note contradicting guidance on text in secondary images. Recorded as unresolved in section 3.4.
- Amazon max images: recommendation of 1 plus at least 6 images is verified, hard caps of 7 or 9 images in third party guides are not verified. Recorded in section 3.3.
- eBay digital route: eBay export material still describes the classified ad route for electronically delivered items, while third party reporting says Classified Ads were removed in non-vehicle categories in 2026. Recorded as unresolved in section 2.8.
- Amazon shortest side: a forum excerpt says at least 500 px on the shortest side to be zoomable, but that part was not opened in full. Recorded as UNVERIFIED in section 3.1.

## 6. Unverified items

Do not build generator logic on these items until each is verified on an official page and this file is updated with a source URL and a new check date.

1. Etsy: hard maximum file size in MB for listing images. Only a 1MB upload warning is verified.
2. Etsy: maximum pixel dimension for listing images.
3. Etsy: single mandatory aspect ratio for listing images.
4. Etsy: description character limit.
5. eBay: pixel size that enables zoom. Third party guides cite 800 by 800 px, not verified on an official page here.
6. eBay: maximum pixel dimension for listing images.
7. eBay: separate tag field, tag count, and per tag character limit. No such field was verified on official eBay pages opened here.
8. eBay: video duration and file size limits for listing videos. The 150MB video limit appeared only in a search excerpt of the images and text policy, not in a full page read here.
9. eBay: current availability of the Classified Ads route for electronically delivered items in the Everything Else, Information Products category. Conflict recorded in section 2.8.
10. eBay: approval process and eligibility for approved digital resellers, including any US address requirement. Not verified on an official page in this check.
11. Amazon: hard maximum number of images per listing. Only the recommendation of at least 1 main plus at least 6 additional images and 1 video is verified. Third party caps of 7 or 9 are not verified.
12. Amazon: file size cap in MB for listing images. The widely repeated 10 MB figure is disputed and UNVERIFIED here.
13. Amazon: mandatory aspect ratio. Square 1:1 is a working practice only, not a verified rule.
14. Amazon: shortest side minimum of 500 px to be zoomable. Reported in a forum excerpt, not opened in full here.
15. Amazon: 72 dpi minimum. Reported in a Seller Central forum post dated 2026-02-03, found by search, not opened in full here.
16. Amazon: 1,600 px as optimal size. Reported in Seller Central material, not verified in a full standalone help page read here.
17. Amazon: backend search terms limit of less than 250 bytes. Secondary guides quote the official help page, but that page was not opened in full here.
18. Amazon: description length limit and bullet point character limits.
19. Amazon: category specific title length exceptions.
20. Amazon: category specific image style guide rules for the product category that will be used in Phase 2.
21. Amazon: standard digital download listing flow equivalent to Etsy instant downloads. No such flow was verified here.
22. Amazon: colour profile requirement for listing images. RGB preferred was reported in third party summaries, not verified as a direct official read here.
23. All platforms: any rule that changed after 2026-11-05. Recheck every rule in Seller Central, eBay Help and Etsy Help before a Phase 2 build or a live publish.

## Sources

Official pages opened or found by search on 2026-11-05. Full URLs are given in each section above. The list below is a compact index only.

- Etsy Help, Requirements and Best Practices for Images in Your Etsy Shop: https://help.etsy.com/hc/en-gb/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop
- Etsy Help, How to Create a Listing: https://help.etsy.com/hc/en-us/articles/115015628707-How-to-Create-a-Listing?segment=selling
- Etsy Help, How to Manage Your Digital Listings: https://help.etsy.com/hc/en-gb/articles/115015628347-How-to-Manage-Your-Digital-Listings
- Etsy Help, How to Use Tags to Get Found in Search: https://help.etsy.com/hc/en-us/articles/360000336307-Using-Tags-to-Get-Found-in-Search
- Etsy Seller Handbook, The Anatomy of a Well-Crafted Etsy Listing: https://www.etsy.com/seller-handbook/article/1347574487014
- Etsy legal policy, Listing Image Requirements: https://www.etsy.com/uk/legal/policy/listing-image-requirements/253962679005
- eBay Help, Adding pictures to your listings: https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148
- eBay Help, Picture policy: https://www.ebay.com/help/policies/listing-policies/picture-policy?id=4370
- eBay Help, Optimize listings for Best Match: https://www.ebay.com/help/selling/listings/creating-managing-listings/optimizing-listings-best-match?id=4166
- eBay Seller Center, Create great listings: https://www.ebay.com/sellercenter/listings/3d-seller
- eBay Developer docs, Listing title: https://developer.ebay.com/api-docs/user-guides/static/trading-user-guide/listing-title.html
- eBay export site, How to list and deliver digital items on eBay: https://export.ebay.com/en/first-steps/manage-listings/how-to-list-and-deliver-digital-items-on-ebay/
- Amazon Seller Central UK, Product image guide: https://sellercentral.amazon.co.uk/help/hub/reference/external/1881 (page did not render full text when opened on 2026-11-05, only a feedback form; content used here is from its search excerpt and from Seller Central staff posts below)
- Amazon Seller Central, Listings Lounge: Product Image Requirements, staff post by Manny_Amazon: https://sellercentral.amazon.com/seller-forums/discussions/t/4b3c4c39-6f8c-4312-aa0e-99982eb8f5e1
- Amazon Seller Central, Prime Day Prep: Build a Listing That Converts, staff post by Manny_Amazon: https://sellercentral.amazon.com/seller-forums/discussions/t/932a3e7b-ba4e-4383-99ab-142149087754
- Amazon Seller Central, Product Photography Standards post: https://sellercentral.amazon.com/seller-forums/discussions/t/0149bdb3-2056-42ce-b0bb-9eef94e3d2b8
- Amazon Seller Central, image requirements discussion reproducing the guide: https://sellercentral.amazon.com/seller-forums/discussions/t/759f82d5-d4d3-4eff-bda6-e536390ad295
- Amazon Seller Central, title requirements update January 2025: https://sellercentral.amazon.com/seller-forums/discussions/t/b2b15728-0d43-453e-974f-59eb63f73059

Check date for all rules in this file: 2026-11-05.
