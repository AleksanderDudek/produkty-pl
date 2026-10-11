# Przepisy — quick high-protein recipes built from real products

Date: 2026-10-10
Status: decided autonomously on the user's instruction ("analyze current system,
use best practices, pick recommended, finish on your own").

## What was asked

A "Przepisy" tab with quick, tasty, high-protein recipes — the user's examples:
skyr + protein powder + frozen raspberries; skyr + protein + water +
strawberries + spices in a blender; protein + milk; protein + water; or a ready
product such as a protein bar.

- **The rule: always more protein than carbohydrate and more protein than fat.**
- For anything with several bought ingredients, **all of them must be
  available in one store**.

## What the data allows (measured)

| Ingredient | with nutrition | with a store (raw OFF) |
|---|---|---|
| skyr | 154 | 30 |
| protein powder | 196 | **4** |
| cottage cheese (serek wiejski) | 97 | 22 |
| quark (twaróg) | 229 | ~40 |
| protein bars | 108 | 19 |
| frozen raspberries | 9 | 0 |

Store tags are typed by OFF users and cover 17% of products, so "one store" on
raw data would leave almost nothing. Two decisions follow.

### 1. Private-label brands give their store

A supermarket's own brand is sold only there, and the data confirms it:
Delikate 39/39 tagged products at Biedronka, Pilos 49/49 at Lidl, Go Active
39/39 at Biedronka, K-Classic 49/50 at Kaufland, Fruvita 30/30 at Biedronka.
`scripts/lib/stores.ts` gets a curated `PRIVATE_LABELS` map (brand key -> chain
key) and every product of such a brand is given that chain in `stores`, in the
pipeline, so the product browser's store filter benefits too. Only brands whose
tagged products point at one chain are listed; national brands sold everywhere
(Piątnica, Mlekovita) are not inferred — the data cannot say where they are.

### 2. Three ingredient roles

| Role | Examples | In "one store" |
|---|---|---|
| `store` | skyr, quark, cottage cheese, protein yogurt, tuna, cooked chicken, oats | must be found in that store's data |
| `staple` | milk, kefir, eggs, frozen fruit, vegetables | every Polish supermarket sells them; a store product is used when known, otherwise typical values |
| `pantry` | protein powder, cocoa, spices, coffee, water | bought once, kept at home; the store's own is used when it has one (Go Active at Biedronka), otherwise the most popular one |

Protein powder is pantry on purpose: it is the centre of the user's examples,
is bought online or in sport shops, and only 4 of 196 have any store at all.

## The rule

`protein > carbs && protein > fat`, both strict, on the recipe's per-serving
totals computed from the products actually chosen. A recipe variant that fails
is not offered in that store; a user's own product swap that breaks it is
allowed but flagged in red. Ready products are judged per 100 g by the same
function.

## Recipes

Curated in `src/recipes/catalog.ts` (one serving each, 1–7 minutes): skyr
bowl with raspberries; strawberry skyr shake; protein + milk; protein + water;
cocoa quark pudding; cottage cheese with tomato and chives; tuna and cottage
cheese salad; protein yogurt with blueberries; overnight protein oats; iced
protein coffee; egg-white omelette with spinach; chicken with cottage cheese;
kefir protein shake; raspberry "nice cream". Each carries amounts in grams with
a household measure ("1 miarka", "szklanka"), the tool, the time, and steps.

Every ingredient also carries TYPICAL per-100 g values. They are the fallback
for staples and the baseline of a test that checks every recipe passes the rule
before any product is chosen — a recipe that only passes with a lucky product
is a bad recipe.

## Choosing products

For each ingredient, candidates are products matching its category/name rules
with sanity bounds (plain skyr: protein >= 9 g, sugars <= 5 g; lean quark:
fat <= 2 g; tuna: in brine, fat <= 3 g; protein powder: protein >= 60 g) and
all four macros known. Ranked by popularity (scans: well-known products), then
protein per 100 kcal. Per store, the best candidate sold there is used.

- **Store chosen** -> that store's variant, or the recipe is not shown.
- **No store chosen** -> each card uses the best store that covers it (stores
  ordered by how many recipes they cover) and lists the others as switchable
  chips. Only when no single store covers it is a mixed variant shown, labelled
  "różne sklepy".
- Each ingredient line lets the user swap the product for another candidate in
  the same store; macros recompute, the rule is re-checked.

## Ready products ("Gotowe")

Protein bars, protein drinks, protein yogurts/puddings/skyr, quark and cottage
cheese that pass the rule per 100 g, grouped, filtered by the chosen store,
best protein density first. They open the existing product detail.

## Navigation

Two tabs, "Produkty" and "Przepisy", on paths `/` and `/przepisy`. Each page
keeps its own state in the query string; the existing URL hook is generalised
so both pages share the replace-vs-push and Back-closes-detail behaviour.

## Tests

Pure: private-label inference, ingredient matchers, ranking, resolution per
store (store / staple / pantry, unavailable, mixed), the rule, macro sums, the
catalog baseline, ready-product grouping. UI: switching tabs, store chips, a
swap that breaks the rule shows the warning. Real data: a check script prints
per-store coverage, and the result is looked at in the browser.

## Out of scope

Prices per recipe (3% of products are priced), shopping lists, user-made
recipes, portions other than one.

## Changes after review

- **No mixed-store variant.** A recipe that needs a shop is shown only with a
  store that has every store ingredient; when none does, it is not shown. The
  earlier "różne sklepy" fallback was exactly what the requirement rules out.
- **With no store chosen, staples use typical values.** The most popular milk
  or frozen fruit overall can be one chain's own brand, which would put a
  Carrefour-only product under "Składniki są w każdym sklepie".
- **Pantry items can be swapped to anything**: the store's own comes first,
  but the protein powder at home is the point of the role.
- **Store chips need 3 recipes that need a shop** (was 2): the
  "staples are everywhere" assumption is weakest in a convenience store.
- Candidates and the store ranking are cached per product list
  (`recipeIndex`), so switching tabs does not recompute them; each tab
  returns to the query string it was left with.

## Time tiers and servings

Date: 2026-10-11. Asked: more protein options; the quick ones must stay and be
marked; more categories, including ones that take a bit longer at home — the
quick ones as now, ones a bit longer but still quick, and ones that can take
longer.

### Three tiers, derived from the minutes

`src/recipes/tiers.ts`: **Szybkie** (≤ 7 min), **Chwilę dłużej** (8–20 min),
**Dłużej, w domu** (> 20 min). The tier is computed from `recipe.minutes`,
never stored, so a recipe cannot sit in a tier its own time contradicts. Seven
is where the tab's promise already stood (every original recipe is 1–7 min);
twenty is "the stove, but no oven and no waiting".

- Every card carries a tier badge. The quick one is the one that stands out
  (amber, a filled lightning bolt); the other two are a quiet grey label, so
  "marked" means the quick ones are findable at a glance, not that everything
  shouts.
- A "Czas:" chip row filters by tier, kept in the URL as `czas=` (Polish keys:
  `szybkie`, `chwila`, `dluzej`). Unknown values are dropped with
  `Object.hasOwn`, the same guard as `typ=`. It combines with the kind and
  store filters.
- The list is ordered quick first, then by minutes (`byTime`); equal times keep
  the catalog's order. The W pobliżu page keeps its own distance ordering.

### Servings

`Recipe.servings` is optional (1 when absent). **Ingredient grams are for the
whole recipe** — a pot of chili is cooked for three — and `ResolvedRecipe`
gains `perServing` (`total / servings`). `total` keeps meaning the whole
recipe. The rule is judged on `perServing`: dividing every macro by the same
number cannot change the verdict, but it is the number on the card, so the
code says what it means. `perServing` is deliberately not rounded — rounding
to a hundredth could turn a 10.00 > 9.99 total into a 3.33 = 3.33 tie.

The card shows macros per serving with "na porcję (przepis na N porcje)" and,
above the ingredients, "Ilości na cały przepis, czyli N porcje". A test keeps
multi-serving recipes in the longest tier: splitting a 5-minute snack in two
would only make its numbers look smaller.

### Kinds

New kind `obiad` ("Obiad") for main dishes. `miska` was relabelled from "Na
łyżkę" to **"Na słodko"**: protein pancakes and a baked cheesecake now share it
with the skyr bowls, and what they have in common is that they are sweet (the
URL key `typ=miska` is unchanged).

### Eighteen new recipes

| Tier | Recipes |
|---|---|
| Szybkie | łosoś wędzony z serkiem wiejskim (4 min), roladki z szynki drobiowej z twarożkiem (5) |
| Chwilę dłużej | jajecznica na białkach z łososiem (8), omlet z twarożkiem (10), twarożek z rzodkiewką i jajkiem (12), krewetki czosnkowe z cukinią (12), placki twarogowe z borówkami (15), kurczak z papryką i cukinią (15), makaron z soczewicy z tuńczykiem (15), burrito bowl z indykiem (20) |
| Dłużej, w domu | łosoś z brokułami i sosem koperkowym (25, ×2), kurczak curry na skyrze (30, ×2), dorsz w pomidorach (35, ×2), chili z indyka (40, ×3), pieczony kurczak z warzywami (45, ×2), pulpety z indyka (45, ×3), sernik proteinowy (70, ×8), gulasz wołowy (90, ×3) |

Every one passes the rule per serving on typical values (`catalog.test.ts`)
and is available in at least Biedronka or needs no shop at all
(`pnpm recipes:check`). Portions were designed for it: oil is weighed (it is
pantry, but a tablespoon is as much fat as an egg), rice and pasta are a
garnish rather than the base, the pasta is made of lentils, the beans in the
chili are half a can, and plain turkey mince (7.5 g fat) is the typical value
rather than the leaner breast-only kind.

### New ingredients and their roles

- **Raw meat and fish are `staple`**: chicken breast fillet, turkey mince, lean
  beef, salmon fillet, cod/pollock fillet. Every supermarket sells them, while
  Open Food Facts barely knows them — fresh meat is weighed at a counter
  without a barcode. As `store` they would hide a chicken dinner from Kaufland
  because nobody scanned its chicken. Turkey mince, salmon and white fish have
  matchers (the data has clean candidates); **raw chicken and beef have none**:
  the "Filet z piersi kurczaka" products are mostly deli-counter items (in-store
  `2…` codes, no category), a butter-flavoured cold cut has a raw fillet's
  macros, and naming a cold cut for a roast is worse than typical values.
- **`store`: shrimp and smoked salmon.** Both have candidates in at least two
  big chains (shrimp: Biedronka, Lidl, Auchan; smoked salmon: Biedronka,
  Auchan, Carrefour), neither is in every shop, and smoked salmon's fat ranges
  10–18 g, so the product matters the way it does for skyr. Salmon belly
  (18 g fat) is outside the bounds.
- **`staple`** with matchers: passata, canned tomatoes (the olive-oil kind is
  out), red kidney beans (canned), white rice, lentil/chickpea pasta (wheat
  "protein" pasta, 19 g protein to 63 g carbs, is out), broccoli, mushrooms,
  parmesan/grana padano. Without matchers: onion, garlic, pepper, zucchini,
  radish, dill, lemon.
- **`pantry`**: oil (olive or rapeseed, sunflower out; its fat always counts),
  spices, curry, potato starch, and erythritol — counted as 100 g carbs per
  100 g, as EU labels count polyols, so the cheesecake passes even when they
  count.

### Known limits

- Staple-only dinners (kurczak z papryką, dorsz, chili, gulasz…) are offered
  at every chain, convenience stores included. That is the existing "staples
  are everywhere" assumption, and raw meat is where it is weakest; the
  three-recipe threshold for a store chip is unchanged.
- The catalog's text adds ~27 kB to the main chunk, which now crosses Vite's
  500 kB advisory warning (481 → 508 kB). Splitting the W pobliżu page
  (Leaflet) into its own chunk would bring it back under; not done here.
