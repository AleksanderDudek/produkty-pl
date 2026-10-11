# produkty-pl Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local web app that browses the ~29 000 named Open Food Facts products sold in Poland, with photos, nutrition, prices from Open Prices, and sorting/filtering by every characteristic the data supports.

**Architecture:** Node scripts turn the 105 MB tab-separated dump (plus Open Prices and OFF taxonomies) into one compact `public/data/products.json`. A Vite + React app loads it once and does all searching, faceting, sorting and pagination in memory through pure, unit-tested modules in `src/lib/`. All screen state lives in the URL.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), lucide-react icons, Vitest + Testing Library + jsdom, tsx for scripts, pnpm.

Spec: `docs/superpowers/specs/2026-10-10-produkty-pl-design.md`.

---

## File structure

```
scripts/
  fetch-prices.ts          download all PLN prices -> data/raw/prices.json
  fetch-taxonomies.ts      download 4 OFF taxonomies -> data/raw/taxonomies/
  prepare-data.ts          CSV + prices + taxonomies -> public/data/products.json
  lib/
    tsv.ts                 header -> row object; line splitting
    transform.ts           one row -> Product draft (all cleaning rules)
    stores.ts              free-text store -> {key,label}, chains folded
    taxonomy.ts            tag -> Polish/English/humanised name
    prices.ts              Open Prices items -> newest price per code
src/
  lib/
    types.ts               Product, Dataset, grade unions (shared with scripts)
    text.ts                diacritic folding, entity decoding, tag humanising
    filters.ts             Filters model, per-dimension predicates
    browse.ts              one pass: results + disjunctive facet counts
    sort.ts                sort keys, nulls-last comparator
    url-state.ts           ViewState <-> URLSearchParams
    format.ts              pl-PL numbers, prices, dates
    grades.ts              grade colours and labels
  hooks/
    useDataset.ts          fetch + loading/error state + search text index
    useViewState.ts        URL-backed state, replace vs push, popstate
  components/              presentational pieces (one per file)
  App.tsx, main.tsx, index.css
```

`src/lib/types.ts` and `src/lib/text.ts` are imported by the scripts too, so the
data contract has one definition.

---

### Task 0: Scaffold

**Files:** create the Vite react-ts project in `~/Projects/produkty-pl`, `.gitignore`, `vite.config.ts`, `src/test/setup.ts`, `package.json` scripts.

- [ ] Scaffold with `pnpm create vite` (react-ts template) into a temp dir and move it in (the repo already holds `docs/`).
- [ ] `pnpm add lucide-react` and `pnpm add -D tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event tsx @types/node`.
- [ ] `vite.config.ts`: plugins `react()`, `tailwindcss()`; `test: { environment: "jsdom", setupFiles: ["src/test/setup.ts"], include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"] }`.
- [ ] `src/index.css`: `@import "tailwindcss";`.
- [ ] `.gitignore` adds `data/raw/` and `public/data/`.
- [ ] package.json scripts: `test: vitest run`, `data:prices: tsx scripts/fetch-prices.ts`, `data:taxonomies: tsx scripts/fetch-taxonomies.ts`, `data:prepare: tsx scripts/prepare-data.ts`, `data: pnpm data:taxonomies && pnpm data:prices && pnpm data:prepare`.
- [ ] `tsconfig.node.json` includes `scripts` with `types: ["node"]`.
- [ ] Verify `pnpm build` and `pnpm lint` pass on the template. Commit `chore: scaffold`.

### Task 1: Shared types and text helpers

**Files:** `src/lib/types.ts`, `src/lib/text.ts`, `src/lib/text.test.ts`

Types exactly as in the spec ("Data model"), plus:

```ts
export const NUTRI_GRADES = ["a", "b", "c", "d", "e"] as const;
export const ECO_GRADES = ["a-plus", "a", "b", "c", "d", "e", "f"] as const;
export const NOVA_GROUPS = [1, 2, 3, 4] as const;
export const NUTRIENTS = ["kcal", "fat", "saturatedFat", "carbs", "sugars", "fiber", "protein", "salt"] as const;
export interface IndexedProduct extends Product { searchText: string }
```

- [ ] Write `text.test.ts`:

```ts
import { foldDiacritics, normalizeForSearch, decodeEntities, humanizeTag, tokenize } from "./text";

test("folds Polish diacritics including ł, which NFD does not decompose", () => {
  expect(foldDiacritics("Żółta łódź ĄĘ")).toBe("Zolta lodz AE");
});
test("normalizes for search: lower case and folded", () => {
  expect(normalizeForSearch("  Masło ŚMIETANKOWE ")).toBe("maslo smietankowe");
});
test("tokenize splits on whitespace and drops empties", () => {
  expect(tokenize("  żółty   ser ")).toEqual(["zolty", "ser"]);
});
test("decodes named and numeric HTML entities", () => {
  expect(decodeEntities("M&amp;M&#39;s &quot;x&quot; &lt;3 &#x41;")).toBe(`M&M's "x" <3 A`);
});
test("humanizes a tag: strips language prefix, dashes to spaces, capitalises", () => {
  expect(humanizeTag("pl:twarogi-polskie")).toBe("Twarogi polskie");
  expect(humanizeTag("en:")).toBe("");
});
```

- [ ] Run `pnpm test src/lib/text.test.ts` -> FAIL (module missing). Implement. Run -> PASS. Commit.

### Task 2: Store normalisation

**Files:** `scripts/lib/stores.ts`, `scripts/lib/stores.test.ts`

```ts
import { storeKey, parseStores } from "./stores";

test("folds a chain's spellings into one key", () => {
  expect(storeKey("biedronka")).toEqual({ key: "biedronka", label: "Biedronka" });
  expect(storeKey(" Biedronka ")).toEqual({ key: "biedronka", label: "Biedronka" });
  expect(storeKey("carrefour.fr")?.key).toBe("carrefour");
  expect(storeKey("Carrefour Market")?.key).toBe("carrefour");
  expect(storeKey("zabka")).toEqual({ key: "zabka", label: "Żabka" });
  expect(storeKey("Żabka")?.key).toBe("zabka");
});
test("keeps an unknown store under a slug with its own spelling", () => {
  expect(storeKey("Sklep u Ani")).toEqual({ key: "sklep-u-ani", label: "Sklep u Ani" });
});
test("rejects empty and junk-long values", () => {
  expect(storeKey("  ")).toBeNull();
  expect(storeKey("x".repeat(61))).toBeNull();
});
test("parseStores splits, normalises and de-duplicates", () => {
  expect(parseStores("Lidl, lidl,Auchan").map((s) => s.key)).toEqual(["lidl", "auchan"]);
});
```

Chains: biedronka, lidl, kaufland, auchan, carrefour, zabka (Żabka), dino, netto, aldi, tesco, rossmann, stokrotka, lewiatan, intermarche (Intermarché), polomarket (POLOmarket), spar, leclerc (E.Leclerc), makro, selgros, hebe, delikatesy-centrum (Delikatesy Centrum), frisco (Frisco). Match on the folded, lower-cased value starting with the chain's stem after stripping a `.pl/.fr/.de/.com` suffix.

- [ ] Test fails -> implement -> passes -> commit.

### Task 3: Taxonomy names

**Files:** `scripts/lib/taxonomy.ts`, `scripts/lib/taxonomy.test.ts`

```ts
import { makeNamer } from "./taxonomy";
const tax = { "en:dairies": { name: { en: "Dairies", pl: "Nabiał" } }, "en:yogurts": { name: { en: "Yogurts" } } };

test("prefers Polish, then English, then the humanised tag; capitalises", () => {
  const name = makeNamer(tax);
  expect(name("en:dairies")).toBe("Nabiał");
  expect(name("en:yogurts")).toBe("Yogurts");
  expect(name("pl:twarogi")).toBe("Twarogi");
});
test("works with no taxonomy at all", () => {
  expect(makeNamer(null)("en:no-gluten")).toBe("No gluten");
});
test("capitalises lower-case Polish names", () => {
  expect(makeNamer({ "en:yogurts": { name: { pl: "jogurty" } } })("en:yogurts")).toBe("Jogurty");
});
```

- [ ] Test fails -> implement -> passes -> commit.

### Task 4: Row transform

**Files:** `scripts/lib/tsv.ts`, `scripts/lib/transform.ts`, `scripts/lib/transform.test.ts`

`rowToProduct(row: Record<string, string>): { ok: true; product: Product; brandLabels: [string, string][]; storeLabels: [string, string][] } | { ok: false; reason: "no-code" | "no-name" }`.

Test with a `row({...overrides})` helper that fills every used column with `""`:

```ts
test("skips a row with no name", () => expect(rowToProduct(row({ code: "1" }))).toEqual({ ok: false, reason: "no-name" }));
test("decodes entities in the name", () => expect(product({ product_name: "M&amp;M white" }).name).toBe("M&M white"));
test("empty numbers are null, not zero", () => expect(product({}).nutrition.kcal).toBeNull());
test("parses numbers", () => expect(product({ "energy-kcal_100g": "63", proteins_100g: "11.0" }).nutrition).toMatchObject({ kcal: 63, protein: 11 }));
test("derives kcal from kJ when kcal is missing", () => expect(product({ "energy-kj_100g": "418.4" }).nutrition.kcal).toBe(100));
test("drops impossible values", () => {
  const p = product({ "energy-kcal_100g": "3000", fat_100g: "120", sugars_100g: "-1" });
  expect([p.nutrition.kcal, p.nutrition.fat, p.nutrition.sugars]).toEqual([null, null, null]);
});
test("grades: unknown and not-applicable are null", () => {
  expect(product({ nutriscore_grade: "unknown" }).nutriscore).toBeNull();
  expect(product({ nutriscore_grade: "b", nova_group: "4", environmental_score_grade: "a-plus" })).toMatchObject({ nutriscore: "b", nova: 4, ecoscore: "a-plus" });
});
test("diet from analysis tags, upgraded by labels", () => {
  expect(product({ ingredients_analysis_tags: "en:palm-oil-free,en:non-vegan,en:vegetarian" })).toMatchObject({ vegan: "no", vegetarian: "yes", palmOil: "free" });
  expect(product({ labels_tags: "en:vegan" })).toMatchObject({ vegan: "yes", vegetarian: "yes" });
});
test("lists split on commas", () => expect(product({ categories_tags: "en:dairies,en:yogurts", allergens: "en:milk" })).toMatchObject({ categories: ["en:dairies", "en:yogurts"], allergens: ["en:milk"] }));
test("brands keyed by tag with original spelling", () => {
  const r = rowToProduct(row({ code: "1", product_name: "x", brands: "Piątnica", brands_tags: "piatnica" }));
  expect(r.ok && r.product.brands).toEqual(["piatnica"]);
  expect(r.ok && r.brandLabels).toEqual([["piatnica", "Piątnica"]]);
});
test("stores normalised", () => expect(product({ stores: "biedronka, Lidl" }).stores).toEqual(["biedronka", "lidl"]));
test("only https image URLs are kept", () => expect(product({ image_url: "javascript:alert(1)" }).images.front).toBeNull());
```

`tsv.ts`: `splitLine(line) = line.split("\t")`, `toRow(header, fields)` -> object; a field-count mismatch returns `null`.

- [ ] Test fails -> implement -> passes -> commit.

### Task 5: Prices

**Files:** `scripts/lib/prices.ts`, `scripts/lib/prices.test.ts`

```ts
test("keeps the newest PLN price per product code and counts reports", () => {
  const m = latestPricesByCode([
    item({ code: "1", price: 4.29, date: "2026-10-01", store: "Lidl" }),
    item({ code: "1", price: 4.99, date: "2026-10-08", store: "Biedronka" }),
    item({ code: "2", price: 2, date: "2026-01-01" }),
  ]);
  expect(m.get("1")).toMatchObject({ value: 4.99, date: "2026-10-08", store: "Biedronka", count: 2 });
  expect(m.get("2")?.count).toBe(1);
});
test("ignores items with no product code or another currency", () => {
  expect(latestPricesByCode([item({ code: null }), item({ code: "3", currency: "EUR" })]).size).toBe(0);
});
test("flags per-kg and discounted prices", () => {
  expect(latestPricesByCode([item({ code: "4", per: "KILOGRAM", discounted: true })]).get("4")).toMatchObject({ perKg: true, discounted: true });
});
```

- [ ] Test fails -> implement -> passes -> commit.

### Task 6: Data scripts, run on the real data

**Files:** `scripts/fetch-taxonomies.ts`, `scripts/fetch-prices.ts`, `scripts/prepare-data.ts`

- [ ] `fetch-taxonomies.ts`: download categories/labels/allergens/additives from `https://static.openfoodfacts.org/data/taxonomies/<name>.json` to `data/raw/taxonomies/`.
- [ ] `fetch-prices.ts`: `GET https://prices.openfoodfacts.org/api/v1/prices?currency=PLN&size=100&page=N&order_by=-date`, `User-Agent: produkty-pl/0.1 (personal local browser)`, 300 ms between pages, one retry; stop at `pages`; write `{ fetchedAt, total, items }`.
- [ ] `prepare-data.ts`: stream the CSV with `readline`; skip malformed lines; de-duplicate codes; attach prices; build the six dictionaries for tags actually used; write minified JSON; print read/kept/dropped-by-reason/priced counts.
- [ ] Symlink `data/raw/off_poland.csv` -> `~/Downloads/off_poland.csv`; run `pnpm data`. Expect ~29 000 products, a few hundred to a thousand priced. Commit.

### Task 7: Filters + browse (results and facets in one pass)

**Files:** `src/lib/filters.ts`, `src/lib/browse.ts`, `src/lib/browse.test.ts`

`Filters` as in the spec; `EMPTY_FILTERS`; `RANGE_KEYS = ["kcal","protein","fat","carbs","sugars","salt","fiber","price","additives"]`.
`browse(products: IndexedProduct[], filters): { results: IndexedProduct[]; facets: Facets }`, where a product failing exactly one dimension contributes to that dimension's facet counts only (disjunctive faceting), and toggle counts say how many would remain if that toggle were on.

```ts
test("no filters returns everything", () => expect(browse(all, EMPTY_FILTERS).results).toHaveLength(all.length));
test("search matches every word, diacritics-insensitive", () => expect(names(browse(all, f({ q: "zolty ser" })))).toEqual(["Żółty ser"]));
test("grade filters are OR within a group, AND across groups", ...);
test("labels must all be present", ...);
test("a range bound excludes products with no value", ...);
test("allergen exclusion also hides products with unknown ingredients", ...);
test("vegan toggle requires yes, not maybe", ...);
test("facet counts ignore their own group but respect the others", () => {
  const { facets } = browse(all, f({ nutriscore: ["a"], vegan: true }));
  expect(facets.nutriscore.b).toBe(/* vegan products graded b */);
});
test("toggle counts say how many would remain", ...);
```

(Each `...` test is written in full against a 6-product fixture in `src/test/fixtures.ts`; the fixture is shared by the component tests.)

- [ ] Tests fail -> implement -> pass -> commit.

### Task 8: Sort

**Files:** `src/lib/sort.ts`, `src/lib/sort.test.ts`

```ts
test("nulls go last in both directions", ...);
test("grades sort A first ascending; eco a-plus before a", ...);
test("ties break on Polish collation of name, then code", ...);
test("name sort uses Polish collation (ł after l, ż after z)", ...);
test("price sorts by value", ...);
```

- [ ] Fail -> implement -> pass -> commit.

### Task 9: URL state and formatting

**Files:** `src/lib/url-state.ts`, `src/lib/url-state.test.ts`, `src/lib/format.ts`, `src/lib/format.test.ts`

```ts
test("default state serialises to an empty query", () => expect(toSearchParams(DEFAULT_VIEW_STATE).toString()).toBe(""));
test("round-trips a full state", () => expect(fromSearchParams(toSearchParams(full))).toEqual(full));
test("drops unknown values instead of failing", () => expect(fromSearchParams(new URLSearchParams("ns=z,a&sort=bogus&page=-3")).filters.nutriscore).toEqual(["a"]));
test("ranges: min only, max only, both", ...);
```

Format: `formatNumber(1.5) === "1,5"`, `formatPrice(4.29) === "4,29 zł"` (with a non-breaking space; compare with `/4,29\s?zł/`), `formatDate("2026-10-08") === "8 paź 2026"`.

- [ ] Fail -> implement -> pass -> commit.

### Task 10: Hooks

**Files:** `src/hooks/useDataset.ts`, `src/hooks/useViewState.ts`

- [ ] `useDataset()` -> `{ status: "loading" } | { status: "error", message } | { status: "ready", dataset, products: IndexedProduct[] }`; 404 gives a message naming `pnpm data`.
- [ ] `useViewState()` -> `[state, update(partial, { push?: boolean })]`; reads `location.search` once, writes with `replaceState` (or `pushState` when `push`), listens to `popstate`. Any filter/sort change resets `page` to 1.

### Task 11: Components

**Files (one each in `src/components/`):** `GradeBadge`, `ProductImage`, `NutritionLine`, `ProductCard`, `ProductGrid`, `ProductTable`, `Pagination`, `Toolbar`, `FilterPanel`, `FacetList`, `ChipGroup`, `RangeInput`, `ActiveFilters`, `ProductDetail`, `EmptyState`, `Footer`; then `App.tsx`.

Behaviour as in the spec, section 3. Notes that matter:
- `ProductImage`: `loading="lazy"`, `decoding="async"`, fixed aspect box, placeholder on missing or `onError`.
- `FacetList`: shows top 12, a "Pokaż więcej" expander, and a filter box when it has more than 12 entries; selected entries always visible.
- `ProductDetail`: native `<dialog>`, `showModal()` in an effect, closes on Esc/backdrop/button, `onClose` pops the URL entry.
- `App`: `useDeferredValue(state)` before `browse` so typing stays responsive.

### Task 12: Component tests

**Files:** `src/App.test.tsx`

Mock `fetch` to return the fixture dataset; assert: the grid shows all fixture names; typing `zolty` leaves one card; clicking Nutri-Score A narrows the list and puts `ns=a` in the URL; the Tabela button renders a `<table>`; clicking a card opens the dialog with the product name as its heading.

- [ ] Fail -> make pass -> commit.

### Task 13: Verify for real

- [ ] `pnpm test && pnpm lint && pnpm build` all pass.
- [ ] `pnpm dev`, open in the browser pane, check: cards with photos, search, each filter group, sort, table view, pagination, detail dialog, Back closes it, reload keeps state, mobile width.
- [ ] Fix what is found, with a test where the bug was logic.
- [ ] `README.md`: what it is, `pnpm install`, `pnpm data`, `pnpm dev`, data licences. Commit.
