# produkty-pl — a local browser for food products sold in Poland

Date: 2026-10-10
Status: approved (sections 1 by the user; sections 2-4 decided autonomously on
the user's instruction "use best practices, pick recommended, finish on your own")

## Goal

A local web app that lists the ~29 000 named food products Open Food Facts
records as sold in Poland, with photos, calories, macronutrients, a
description, a price where one exists, and sorting and filtering by every
characteristic the data supports. One user, one machine, no server.

## Decisions already made

| Question | Answer |
|---|---|
| Where it runs | Locally, for one person, in a browser |
| Prices | Imported from Open Prices (PLN entries only) |
| Layout | Card grid by default, one-click switch to a table |
| Architecture | Static Vite app + one prepared JSON file, filtering in the browser |

## What the data can and cannot give

Measured on `off_poland.csv` (34 631 rows, 211 tab-separated columns):

| Field | Usable share |
|---|---|
| name | 84% (the other 16% are dropped: nothing to show) |
| front photo | 69% |
| kcal / protein / fat / carbs | ~66% |
| sugars / salt / fiber | 61% / 55% / 38% |
| brand / category | 71% / 51% |
| Nutri-Score A-E | ~33% (the column is 99.7% filled, 63% of it the word `unknown`) |
| NOVA 1-4 / Eco-Score | 32% / ~27% |
| ingredients text | 34% |
| stores | 17% |
| price | 0% in the dump; Open Prices has 2044 PLN entries |
| description | no such field; `generic_name` is 6% |

So "description" is composed from what exists: `generic_name`, the category
path and the ingredients text. A missing number is `null`, never `0` — a
product with unknown calories must not sort as the lowest-calorie item.

## 1. Project layout and data preparation

```
produkty-pl/
  scripts/
    fetch-prices.ts       Open Prices -> data/raw/prices.json
    fetch-taxonomies.ts   OFF taxonomies -> data/raw/taxonomies/*.json
    prepare-data.ts       off_poland.csv + the above -> public/data/products.json
    lib/                  pure, tested: tsv, transform, prices, taxonomy, stores
  src/                    the React app
    lib/                  pure, tested: types, filter, sort, facets, url-state,
                          search, format
  data/raw/               inputs, not in git
  public/data/            generated JSON, not in git
```

- Scripts run on demand (`pnpm data`), never at app start.
- `prepare-data.ts` takes the CSV path as its first argument
  (default `data/raw/off_poland.csv`).
- Open Prices is fetched politely: a `User-Agent` naming the app, 100 per page,
  a pause between pages. An entry with no product code (loose produce priced
  by category) is skipped. The newest entry per code wins; the count of
  entries is kept beside it.
- Taxonomies supply Polish names (`en:dairies` -> "Nabiał",
  `en:e330` -> "E330 - Kwas cytrynowy"). Fallback order: Polish name ->
  English name -> the tag humanised (`pl:twarogi` -> "Twarogi"). The app works
  without taxonomies, only less Polish.

### Cleaning rules (all in `scripts/lib/transform.ts`, unit-tested)

- HTML entities are decoded (`M&amp;M` -> `M&M`).
- Numbers: empty or unparseable -> `null`. Grams per 100 g outside 0-100 and
  kcal outside 0-900 -> `null` (crowd-sourced junk; a 3000 kcal yoghurt is a
  typo, not a product).
- kcal missing but kJ present -> kcal = kJ / 4.184, rounded.
- Grades: `unknown` / `not-applicable` / empty -> `null`.
- Diet comes from `ingredients_analysis_tags` and labels together: a product
  is vegan if the analysis says `en:vegan` OR it carries the `en:vegan` label.
- Stores are free text, so they are keyed by a slug with known Polish chains
  folded together (`carrefour.fr`, `Carrefour Market` -> Carrefour;
  `zabka` -> Żabka).
- Brands are keyed by `brands_tags`, displayed with the first original spelling.

### Output shape

```ts
interface Dataset {
  generatedAt: string;
  sources: { products: string; prices: string | null; taxonomies: boolean };
  dictionaries: {          // tag -> display name, so products carry keys only
    categories: Record<string, string>;
    labels: Record<string, string>;
    allergens: Record<string, string>;
    additives: Record<string, string>;
    brands: Record<string, string>;
    stores: Record<string, string>;
  };
  products: Product[];
}
```

Filtering is done on keys, display goes through the dictionaries. Keys are
stable; display names are not.

## 2. Data model

```ts
type NutriGrade = "a" | "b" | "c" | "d" | "e";
type EcoGrade = "a-plus" | "a" | "b" | "c" | "d" | "e" | "f";
type Tri = "yes" | "no" | "maybe" | null;

interface Product {
  code: string;
  name: string;
  genericName: string | null;
  brands: string[];            // brand keys
  quantity: string | null;     // "500 g" as printed on the pack
  servingSize: string | null;
  images: { front: string | null; frontSmall: string | null;
            ingredients: string | null; nutrition: string | null };
  categories: string[];        // full hierarchy, so a parent matches its children
  mainCategory: string | null;
  nutrition: {                 // per 100 g / 100 ml
    kcal: number | null; fat: number | null; saturatedFat: number | null;
    carbs: number | null; sugars: number | null; fiber: number | null;
    protein: number | null; salt: number | null;
  };
  nutriscore: NutriGrade | null;
  nova: 1 | 2 | 3 | 4 | null;
  ecoscore: EcoGrade | null;
  vegan: Tri; vegetarian: Tri; palmOil: "free" | "contains" | "maybe" | null;
  labels: string[];
  allergens: string[];
  traces: string[];
  additives: string[];
  additivesCount: number | null;
  ingredientsText: string | null;
  stores: string[];
  popularity: number | null;   // unique_scans_n
  price: { value: number; currency: "PLN"; date: string; store: string | null;
           city: string | null; perKg: boolean; discounted: boolean;
           count: number } | null;
}
```

## 3. The app

**Toolbar:** search, result count, sort, view switch (Karty / Tabela), and a
"Filtry" button that opens the panel on narrow screens.

**Search** matches every word against name + brand + code, ignoring case and
Polish diacritics, so `zolty` finds "żółty". `ł` is mapped by hand: it does not
decompose under NFD, which is the usual reason accent-folding misses Polish.

**Filter panel** (left on desktop, drawer on mobile):

| Group | Control | Semantics |
|---|---|---|
| Data present | toggles: photo, price, nutrition values | must have |
| Nutri-Score, NOVA, Eco-Score | chips with counts | any of the selected |
| Diet | vegan, vegetarian, no palm oil | must be `yes` / `free` |
| Allergens | "bez: gluten, mleko, ..." | excludes products declaring it or its trace; **also hides products whose ingredients are unknown**, said on screen — an unknown composition is not allergen-free |
| Labels | searchable list with counts | must have all selected |
| Category, brand, store | searchable lists with counts | any of the selected |
| Ranges | min/max: kcal, protein, fat, carbs, sugars, salt, fiber, price, additive count | a set bound excludes products with no value |

Counts are **disjunctive facets**: each group counts against every other active
filter but not its own, so ticking "A" does not make "B" read zero.

**Sort:** popularity (default), name, kcal, protein, fat, sugars, salt, price,
Nutri-Score, NOVA, Eco-Score, each both directions. Products with no value go
last in either direction. Ties break on name then code so pages are stable.
In the table, a column header click sorts by that column.

**Cards:** photo (lazy-loaded small image, placeholder when missing or
broken), name, brand, quantity, kcal, P/F/C, Nutri-Score badge in the official
colours, price if any. **Table:** thumbnail plus the same numbers as columns.
Both paginate at 48; 29 000 DOM nodes would freeze the tab.

**Detail** (native `<dialog>`: focus trap and Esc for free): photo gallery
(front / ingredients / nutrition), the full per-100 g table, description,
ingredients, allergens and traces, additives with names, labels, diet, scores,
stores, price with store, city, date and how many price reports exist, and a
link to the product on openfoodfacts.org.

**State in the URL:** search, filters, sort, view, page and the open product.
Reloading or sharing a link reproduces the screen; Back closes an open product.
Filter changes replace the history entry, opening a product pushes one.

**Footer:** data from Open Food Facts (ODbL), photos CC BY-SA, prices from
Open Prices, with the generation date.

## 4. Errors and tests

- `products.json` missing -> a screen saying which command creates it.
- Image fails to load -> placeholder, never a broken-image icon.
- No results -> say so, with "Wyczyść filtry".
- Scripts fail loudly on a missing CSV and report counts at the end
  (read, kept, dropped and why, prices matched).

Tests (Vitest):
- pure units: transform, prices, stores, taxonomy, filter, sort, facets,
  url-state round trip, search normalisation, formatting;
- components (Testing Library on a fixture): search narrows the list, a
  Nutri-Score chip filters, the view switch shows the table, a card opens the
  detail;
- the real thing: run the scripts on the real CSV, open the app in a browser
  and check it by eye.

Gate: `pnpm test`, `pnpm build` (includes `tsc`) and `pnpm lint` all pass.

## Changes made during implementation

- **Priced products without the Poland tag are included.** A PLN price on Open
  Prices means the product is sold in Poland whether or not anyone tagged the
  country, and about half of the 1493 priced products were missing from the
  `countries_tags` extract. `scripts/extract-priced.ts` pulls those rows from
  the full dump (a 30-second scan reading only the first column); 263 named
  products were added, taking the priced count from 693 to 956.
- **Images are stored as compact paths**, not URLs. All of them share the
  `https://images.openfoodfacts.org/images/products/` prefix and the sizes
  differ only in the `.400.jpg` / `.200.jpg` suffix, so `frontSmall` was
  dropped and `src/lib/images.ts` builds the URL at the size each view needs.
  That took 7 MB out of the JSON (final size ~23 MB for 29 249 products).
- **`Price.regularValue`** keeps the undiscounted price Open Prices reports
  beside a promotional one; the card shows it struck through.

## Out of scope

Barcode scanning, favourites, comparing products, accounts, hosting, editing
data. Each is easy to add later on this structure; none was asked for.
