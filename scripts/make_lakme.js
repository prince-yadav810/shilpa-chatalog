const fs = require('fs');

const rawData = `
[Serums]
Lakme Glycolic Illuminate Serum
27850, 30ml, 749
27851, 15ml, 399
Lakme Perfect Radiance Serum
23414, 30ml, 599
27571, 15ml, 325
Lakme Vitamin C Pro Brilliance Serum with 10% Vitamin C Complex
27439, 30ml, 799
27551, 15ml, 399
27863, 7ml, 149
Lakme Vitamin C Brilliance Serum with 2% Vit Complex
27923, 30ml, 649
27924, 15ml, 325
Lakme Hyaluronic Dewy Serum
27272, 30ml, 799
27570, 15ml, 399
Lakme Lumi Smooth AHA Serum
27763, 30ml, 449
27764, 15ml, 249
Lakme Dew Drama 6% Vit E + B3 + F Serum with Pro-Ceramide
27765, 30ml, 499
27766, 15ml, 249
Lakme 9to5 CC Tinted Serum Naturelle
27927, 30ml, 699
Lakme 9to5 CC Tinted Serum Creme
27928, 30ml, 699
Lakme 9to5 CC Tinted Serum Dolce
27929, 30ml, 699
Lakme 9to5 CC Tinted Serum Latte
27930, 30ml, 699
Lakme Retinol Contour Serum
23049, 30ml, 999
27572, 15ml, 499
Lakme Absolute Perfect Radiance Argan Oil-In-Serum
24004, 50ml, 799
Lakme Hyaluronic Dewy Essence
27895, 100ml, 699
Pond's Bright Beauty Anti-Pigmentation Serum
27484, 28ml, 545
27741, 14ml, 249
Pond's Hydra Light Hyaluronic Acid Complex 2% Serum
27802, 28ml, 599
27803, 14ml, 299
Pond's Bright Beauty Vit C Serum
27869, 28ml, 599
27870, 14ml, 299

[Premium Skin Lightening]
Lakme Glycolic Illuminate Day Cream
27852, 50g, 699
27853, 15g, 349
Lakme Glycolic Illuminate Night Cream
27856, 50g, 729
27857, 15g, 399
Lakme Dew Drama Cream
27858, 50g, 349
Lakme Perfect Radiance Day Cream
22362, 50g, 375
27266, 30g, 260
22490, 15g, 99
Lakme Perfect Radiance Night Creme
22749, 50g, 575
Lakme Perfect Radiance Light Creme
23423, 50g, 575
Lakme 9 to 5 CC Mousse
27717, 25g, 499 (Beige)
27718, 25g, 499 (Bronze)
27719, 25g, 499 (Frappe)
27720, 25g, 499 (Almond)
Lakme Lumi Cream Silver
27655, 60g, 599
27512, 30g, 325
Lakme Lumi Cream Gold
27810, 60g, 599
27809, 30g, 325
Lakme Lumi Cream Rose
27812, 60g, 599
27811, 30g, 325
Lakme 9 to 5 CC Cream Honey
12916, 30g, 375
12986, 9g, 99
Lakme 9 to 5 CC Cream Almond
12917, 30g, 375
27652, 9g, 99
Lakme 9 to 5 CC Cream Beige
22998, 30g, 375
27343, 20g, 250
23787, 9g, 99
Lakme 9 to 5 CC Cream Bronze
22999, 30g, 375
27344, 20g, 250
23788, 9g, 99
Lakme CC Frappe
27659, 30g, 375
Lakme CC Caramel
27660, 30g, 375
Lakme Lumi Smooth AHA Cream
27859, 50g, 349
Lakme Lumi Lit Lotion Gold
27925, 100g, 549
Lakme Lumi Lit Lotion Bronze
27926, 100g, 549
Pond's White Beauty BB Cream
27182, 30g, 275
12732, 18g, 165
12731, 9g, 84
Pond's White Beauty BB+ Cream Medium
27183, 30g, 275
27028, 18g, 160
27027, 9g, 84
Pond's Bright Beauty Vit C Gel Creme
27871, 50g, 349
27872, 23g, 99

[Sun Protection]
Lakme Sun Expert SPF 50 Sunscreen
12685, 100ml, 575
12882, 50ml, 365
27000, 18ml, 110
Lakme Sun Expert Gel SPF 50 Sunscreen
12904, 100g, 599
12903, 50g, 365
Lakme Sun Expert SPF 24 Sunscreen
19642, 100ml, 430
19644, 50ml, 269
Lakme Sun Expert SPF 30 Sunscreen
22581, 100ml, 449
22580, 50ml, 299
Lakme Sun Expert Tinted SPF 50 Sunscreen
27307, 100g, 625
27313, 50g, 365
27502, 18ml, 125
Lakme Sunstooper Hya Sunscreen Gel
27886, 56ml, 499
Lakme Sunstooper Drytouch Sunscreen Gel
27912, 50g, 649
Lakme Sunstooper Nia-Vit C Sunscreen Gel
27901, 56ml, 499
Pond's SPF 35 Sunscreen Cream
27724, 50g, 249
27723, 15g, 75
Pond's SPF 55 Sunscreen Cream
27726, 100g, 525
27725, 50g, 299
Pond's SPF 50 Sunscreen Gel
27728, 100g, 575
27727, 50g, 339

[Moisturisers]
Lakme Hyaluronic Dewy Gel Creme
27271, 50g, 799
27419, 15g, 249
Lakme Hyaluronic Dewy Overnight Gel
27273, 50g, 849
Lakme Absolute Perfect Radiance Argan Under Eye Cream
27206, 15g, 749
Lakme Absolute Argan Oil Radiance Oil-In-Creme
24003, 50ml, 899
Lakme Absolute Argan Oil Radiance Oil-In-Gel
12979, 50ml, 849
Lakme Peach Milk Intense Bottles
21777, 120ml, 199
19832, 60ml, 99
Lakme Peach Milk Moisturiser Bottles
22628, 200ml, 435
22626, 120ml, 250
22625, 60ml, 125
Lakme Peach Milk Moisturiser SPF 24 - Bottles
23137, 200ml, 520
23136, 120ml, 299
23135, 60ml, 140
Lakme Peach Milk Soft Creme
27837, 300g, 599
27033, 200g, 499
27032, 100g, 245
12893, 50g, 120
27031, 25g, 59
27841, 12g, 20
Lakme Peach Milk Ultra Light Gel
27309, 98g, 260
27308, 50g, 130
27503, 25g, 65

[Face Cleansing]
Lakme Blush & Glow Kiwi Face Wash
27128, 100g, 259
27127, 50g, 125
Lakme Blush & Glow Strawberry Facewash
27072, 150g, 490
19701, 100g, 259
19698, 50g, 125
Lakme Blush & Glow Lemon Face Wash
12959, 100g, 259
12958, 50g, 125
Lakme Deep Cleanser
19991, 120ml, 299
19336, 60ml, 150
Pond's Pure Detox Clay Mask
27415, 90g, 275
Pond's Detan Facewash
27779, 100g, 220
27786, 50g, 115
Lakme Dew Drama Facewash
27887, 100g, 249
Lakme Dewy Facewash
27896, 50ml, 399
Lakme Lumi Smooth Facewash
27888, 100g, 249
Lakme Perfect Radiance Fairness Facewash
27877, 100g, 295
22361, 50g, 175
Lakme Glycolic Illuminate Facewash
27855, 100g, 329
27854, 50g, 199
Lakme Makeup Remover
27707, 200ml, 550
27706, 100ml, 280
Lakme Micellar Facewash
27776, 100g, 299
27775, 50g, 149
Lakme Micellar Water
27705, 200ml, 450
27704, 100ml, 230
Lakme Strawberry Cream Facewash
12826, 100g, 260
12825, 50g, 130
Pond's Super Light Gel Cleanser
27496, 100g, 299
Pond's Bright Beauty Vit C Gel Cleanser
27874, 100ml, 225
27875, 50ml, 110
Pond's Youthful Miracle Face Cleanser
27914, 100ml, 399
Dove Beauty Moisture Face Wash
12645, 50g, 199
Simple Skin To Skin Refreshing Facial Wash
27714, 100ml, 259
Simple To Kind Moisturising Facial Wash
46014, 100ml, 259
Simple Protect N Glow Vitamin C Glow Facial Wash
27829, 100ml, 259

[Sheet Masks]
Lakme Blush & Glow Lemon Sheet Mask
27141, 20ml, 100
Lakme Blush & Glow Kiwi Sheet Mask
27138, 20ml, 100
Lakme Blush & Glow Strawberry Sheet Mask
27148, 20ml, 100
Lakme Blush & Glow Watermelon Sheet Mask
27140, 100g, 100
Lakme Blush & Glow Pomegranate Sheet Mask
27139, 20ml, 100
Lakme Solution Sheet Mask Hydrating
27668, 25ml, 150
Lakme Solution Sheet Mask Rejuvenating
27669, 25ml, 150
Lakme Solution Sheet Mask Revitalizing
27670, 25ml, 150
Lakme Solution Sheet Mask Brightening
27667, 25ml, 150
Pond's Sheet Mask Detoxing Charcoal
27429, 25ml, 75
Pond's Sheet Mask Hydrating Coconut
27430, 25ml, 75
Pond's Sheet Mask Brighten Pineapple
27426, 25ml, 75
Pond's Sheet Mask Nourishing Avocado
27428, 25ml, 75

[Lip Care]
Lakme Lip Love Gelato Berry Mint
24622, 4.5g, 199
Lakme Lip Love Gelato Raspberry
24623, 4.5g, 199
Lakme Lip Love Gelato Bubblegum
24624, 4.5g, 199
Lakme Lip Love Gelato Fresh Orange
24625, 4.5g, 199
Lakme Lip Love Chapstick Cherry
27047, 4.5g, 175
Lakme Lip Love Chapstick Strawberry
27048, 4.5g, 175
Lakme Lip Love Chapstick Mango
27049, 4.5g, 175
Lakme Lip Love Chapstick Apricot
27050, 4.5g, 175
Lakme Lip Love Chapstick Caramel
27051, 4.5g, 175
Lakme Lip Love Chapstick Insta Pink
27052, 4.5g, 175
Lakme Lip Love Chapstick Purlipcare
27053, 4.5g, 175
Lakme Lip Love Lip & Cheek Fiery Red
27795, 4.5g, 349
Lakme Lip Love Lip & Cheek Downtown Nude
27796, 4.5g, 349
Lakme Lip Love Lip & Cheek Deep Red
27797, 4.5g, 349
Lakme Lip Love Lip & Cheek Pretty Pink
27798, 4.5g, 349
Lakme Lip Love Mask
27799, 13g, 349
Lakme Lip Love Scrub
27800, 15g, 349

[Anti Ageing]
Lakme Retinol Contour Day Cream
23046, 50g, 999
Lakme Retinol Contour Night Cream
23048, 50g, 1099
Ponds Youthful Miracle Daily Resurfacing Cream
12205, 50g, 899
12557, 30g, 599
12907, 20g, 299
12571, 10g, 135
Pond's Youthful Miracle Serum
27843, 28ml, 899
Pond's Youthful Miracle Night Creme
27876, 20g, 305

[Body Lotion]
Vaseline Deep Moisture Body Cream
27842, 200g, 499
Vaseline Light Hydrate Lotion
27847, 180g, 499
Vaseline Gluta Hya Flawless Glow
27753, 200ml, 325
Vaseline Gluta Hya Radiance Glow
27754, 200ml, 325
Vaseline Healthy Bright & Clean Spf 15 Serum Spray
27557, 90ml, 219
Vaseline Sun Protect & Clean Spf 15 Serum Lotion
27555, 90ml, 140
Dove Nourished Radiance Lotion
12688, 100ml, 110
Dove Supple Bounce Lotion
27403, 400ml, 499
27404, 100ml, 130
Dove Light Hydration Lotion
27407, 400ml, 475
27408, 100ml, 110

[Novology]
Novology Acne Spot Corrector Gel
27680, 30g, 700
Novology Spf Pigment Ss
27681, 30g, 850
Novology Dry Skin Repair Cream
27684, 50g, 400
Novology Anti Acne Serum
27685, 30ml, 850
Novology Pigmentation Serum
27687, 30ml, 850
Novology Ha Dry Skin Serum
27688, 30ml, 750
Novology Anti Acne Cleanser
27679, 150g, 650
Novology Sensitive Skin Cleanser
27683, 180g, 450

[Face Talc]
Pond's Natural Pink BB
27317, 30g, 125
Pond's Natural Beige BB
27318, 30g, 125
`;

let products = [];
let current_subcat = "";
let current_name = "";

for (let line of rawData.split("\n")) {
    line = line.trim();
    if (!line) continue;
    
    if (line.startsWith("[") && line.endsWith("]")) {
        current_subcat = line.substring(1, line.length - 1);
    } else if (!line.includes(",")) {
        current_name = line;
    } else {
        const parts = line.split(",").map(p => p.trim());
        const sku = parts[0];
        const variant = parts[1];
        
        const price_str = parts[2].split("(")[0].trim();
        const price = parseInt(price_str, 10);
        
        let brand = "Lakme";
        const lower_name = current_name.toLowerCase();
        if (lower_name.includes("pond's") || lower_name.includes("ponds")) {
            brand = "Pond's";
        } else if (lower_name.includes("dove")) {
            brand = "Dove";
        } else if (lower_name.includes("vaseline")) {
            brand = "Vaseline";
        } else if (lower_name.includes("novology")) {
            brand = "Novology";
        } else if (lower_name.includes("simple")) {
            brand = "Simple";
        }
        
        let name = current_name;
        name = name.replace("Ponds ", "Pond's ");
            
        if (parts[2].includes("(")) {
            const shade = parts[2].split("(")[1].replace(")", "").trim();
            name = name + " " + shade;
        }

        products.push({
            sku: "LKM-" + sku,
            name: name,
            category: "Skin Care",
            subcategory: current_subcat,
            brand: brand,
            price: price,
            variant: variant,
            description: null,
            imageUrl: null,
            inStock: true
        });
    }
}

const output = {
    source: "Lakme PRO Skin TBF",
    sourceDate: "2024-10-03",
    notes: "Extracted from the SEGMENTS section (Pages 45-85) which serves as a complete price list. Used segment headers as subcategory. Prefixed all codes with LKM- as per prompt instruction 27850 -> LKM-27850.",
    products: products
};

fs.writeFileSync("data/catalog/lakme-pro-skin.json", JSON.stringify(output, null, 2));
console.log("Done. Extracted " + products.length + " products.");
