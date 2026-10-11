# Dieta — a daily nutrition planner that adapts to what really happens

Date: 2026-10-11
Status: decided autonomously ("analyze current system, use best practices, pick
recommended, finish on your own").

## What was asked

From the user's reduction plan (an Excel workbook) and their words:

1. Know the base energy expenditure, start and target weight.
2. Log what is eaten.
3. Adapt the diet every day: the plan breaks on travel and surprises, or one
   simply wants something else — what are today's options then?
4. Advise the best choice by macros (best options marked), with diet profiles
   (KETO, LOW CARB, SPORTOWA…) that say what fits and what does not.
5. Show today's default plan, and let any item be swapped for one of similar
   calories.
6. Take the user's real results whatever the plan said, and adapt to the
   calorie goal.

Overall: help decide what to eat from what is really available in nearby (or
farther) shops, and make the user aware where their choices leave a macro
short or in excess.

## The workbook, read

The user's plan workbook (personal; never committed, and none of its values
appear in this repository - the tests use made-up numbers):

- **PANEL**: start date, start and target weight, height, age, sex, activity
  multiplier (1.28: desk job + 2 trainings), base steps 4000, step goal
  10 000, 0.4 kcal per 1000 steps per kg, 7500 kcal per kg of body mass, and
  the planned daily kcal. BMR = Mifflin-St Jeor; TDEE = BMR × multiplier +
  steps above base × weight × 0.4/1000 + extra weekly exercise / 7.
- **WARIANTY**: day templates (1A…7B), each with several variants of 1–5
  items with kcal (a catering pack, a skyr shake added up from its parts…)
  and the variant's protein/carbs/fat. Every variant of a day lands within a
  few dozen kcal of the others: swapping a variant does not move the forecast.
- **PLAN 91 DNI**: per day the template, the chosen variant, ✓/✗ per item,
  "extra kcal", steps, morning weight; a weight forecast by plan and a "real"
  one from what was eaten and walked.
- **DANIA / DODATKI**: macros of the catering dishes (½ or 1 pack), olive oil
  per preparation, ready-made protein pizzas (with the shops that sell them),
  and add-ons per 100 g.

The app reproduces this model and lets the workbook be imported.

## Decisions

| Question | Decision | Why |
|---|---|---|
| Where | A fourth tab "Dieta" (`/dieta`) in the same PWA | Suggestions draw on the products, recipes and nearby shops already here. |
| Storage | IndexedDB via Dexie, on the device only; JSON export/import as backup | Health data stays local; localStorage is too small and shared with the shop cache. Same choice as teleo. |
| Energy model | The workbook's, exactly (BMR Mifflin-St Jeor, multiplier, steps term, 7500 kcal/kg, day-by-day forecast) | It is the user's own model; tests reproduce its numbers (BMR 2035, TDEE 2861.6, day 2 forecast 106.85712). |
| Plan | Import the workbook client-side (fflate + DOMParser, no 1 MB spreadsheet library); without a plan, "Ułóż dzień" builds one from recipes and products | The personal plan never enters the repository or a public build. |
| Diet profiles | Redukcja wysokobiałkowa (default), Zbilansowana, Low carb, Keto, Sportowa | Each gives macro targets in grams and judges any food as great / ok / avoid with a reason. |
| Adapting | Today's target = base target corrected by this week's surplus or deficit, spread over the days left and capped at ±10 % | Takes real intake, not the plan, and never asks for a starvation day to repay a party. |
| "Best" | A transparent score: fits the meal-sized share of what is left, closes the protein gap, fits the profile, is sold nearby; top three starred, each with its reasons | A ranking the user can understand and disagree with. |
| Swaps | Alternatives within ±12 % kcal, most similar macros first, profile fit and nearby availability considered | "Similar calories" as asked; macros so a swap does not wreck the day. |
| Nearby | Uses the last "W pobliżu" answer cached on the device (no new request) or a chosen store | Decoupled from the map page; works offline. |

## Model

- **Profile**: sex, age, height, start/target weight, start date, activity
  multiplier, base/target steps, kcal per 1000 steps per kg, extra weekly
  exercise kcal, kcal per kg, daily kcal target, diet profile, preferred store.
- **Day**: date, morning weight, steps, training, chosen variant, item swaps,
  skipped items, notes.
- **Entry** (what was eaten): date, time, name, kcal/protein/carbs/fat as a
  SNAPSHOT (history must not change when a product's data does), source
  (product code, recipe id, plan item, custom food, quick kcal), amount.
- **Plan**: name, start date, cycle of template keys, templates → variants →
  items (name, kcal, macros when derivable), the foods the items are made of.
- **Custom food**: name, per-portion macros, portion label.

## Calculations (pure, tested)

- `energy.ts`: BMR, TDEE (with steps), deficit, pace, forecast by plan and by
  reality (the workbook's columns AA/AB), day the target weight is reached;
  warnings when the target is below BMR.
- `profiles.ts`: macro targets per profile from kcal and target weight; food
  fit per profile from energy shares.
- `day.ts`: totals, remaining, per-macro status (brak / ok / nadmiar), the
  weekly adjustment and its explanation.
- `plan.ts`: template of a date, items of a day with swaps/skips applied.
- `excel.ts`: workbook → cells; cells → profile parameters + plan; item macros
  derived from the dishes/extras tables; checked against each variant's own
  protein/carbs/fat.
- `foods.ts`: one shape for products, recipes, plan foods, custom foods.
- `suggest.ts`: ranking with reasons; swaps; "Ułóż dzień" (deterministic per
  date, re-rollable).

## Screens

- **Dziś**: kcal and macro bars against today's (adjusted) target with status
  colours; the warnings that matter ("Białka brakuje 48 g — najlepiej: …");
  today's plan with ✓ zjadłem / Zamień / Pomiń and the variant picker; what was
  eaten, removable; "Dodaj" (search products, recipes, plan foods, own foods,
  or just kcal); "Co teraz?" ranked suggestions; weight, steps, training.
- **Plan**: this week by template and variant with kcal; import the workbook.
- **Postęp**: weight chart (measured, forecast by plan, forecast by reality),
  pace, deviation; last 14 days' kcal against target; average macros against
  targets — where the user is chronically short or over.
- **Profil**: parameters with live BMR/TDEE/deficit/pace; the diet profiles
  with what each allows; export/import backup; delete all data.

## Tests

Unit tests for every calculation (including the workbook's numbers), the
importer on a synthetic workbook built in the test, ranking and swaps; Dexie
via fake-indexeddb; UI flows: first run → profile → log a food → totals and
suggestions update; swap a plan item; import; weekly adjustment shown.

## Implementation notes (what changed while building it)

- **Pair swaps.** A whole catering pack (1280 kcal) had one single equal in
  the real plan. When singles are few and the item is a meal (≥450 kcal),
  pairs of foods that add up to it within ±12% are offered as well, built from
  the 40 most protein-dense candidates. Singles are always listed first, under
  their own heading: a pair matched the macros more closely and kept winning on
  score, but one thing in place of one thing is the swap a person means.
- **Staples-only recipes name no chain.** A dinner made only of staples
  resolves at every chain, so the nearest one was a Żabka. These recipes are
  "w każdym większym sklepie" instead (`Food.everywhere`).
- **Macro averages only over complete days.** A day logged as "650 kcal"
  alone counts for calories, not as 0 g of protein.
- **Weight projection from the scale.** Besides the plan line and the model of
  what was eaten, the chart projects from the last weighing, eating to plan.
- **The clock is a hook** (`useClock`, re-read every minute), so rendering
  stays pure and a page left open past midnight moves on to the new day.
- **The diet and map tabs are lazy-loaded**; both chunks are precached, and
  the diet tab was checked to work offline on a first visit.
