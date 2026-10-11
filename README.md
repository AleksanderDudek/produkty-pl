# Produkty PL

Lokalna przeglądarka produktów spożywczych sprzedawanych w Polsce, na danych
[Open Food Facts](https://world.openfoodfacts.org) i cenach z
[Open Prices](https://prices.openfoodfacts.org).

- ~29 tys. produktów: zdjęcia, kalorie, białko / tłuszcz / węglowodany, cukry, sól, błonnik, skład, alergeny, dodatki
- widok kart albo tabeli, sortowanie po każdej wartości (brak danych zawsze na końcu)
- filtry z licznikami: Nutri-Score, NOVA, Eco-Score, dieta (wegańskie, wegetariańskie, bez oleju palmowego), kategoria, marka, sklep, etykiety (bio, bez glutenu…), wykluczanie alergenów, zakresy wartości odżywczych, ceny i liczby dodatków
- wyszukiwanie po nazwie, marce i kodzie kreskowym, bez względu na polskie znaki (`zolty` znajdzie „żółty”)
- cały stan ekranu jest w adresie URL: link albo odświeżenie odtwarza ten sam widok, a Wstecz zamyka otwarty produkt
- przepisy białkowe w trzech grupach czasu (szybkie, chwilę dłużej, dłużej w domu), sklepy w pobliżu na mapie i zakładka Dieta: profil, plan z Excela, dziennik jedzenia i dzień, który dopasowuje się do tego, co naprawdę zjedzone

## Przepisy białkowe (`/przepisy`)

Przepisy, w których **zawsze jest więcej białka niż węglowodanów i więcej
białka niż tłuszczu**. Zasada jest liczona na porcję z prawdziwych produktów,
a nie z szacunków.

Przepisy mają trzy kategorie czasu (filtr „Czas”, w adresie `czas=`):

- **Szybkie** (do 7 minut), oznaczone błyskawicą: shake'i, skyr, twaróg,
  serek wiejski, łosoś wędzony.
- **Chwilę dłużej** (8–20 minut): patelnia i garnek, np. kurczak z papryką,
  krewetki czosnkowe, jajecznica na białkach, placki twarogowe, burrito bowl.
- **Dłużej, w domu** (ponad 20 minut): piekarnik i duszenie, np. łosoś z
  brokułami, kurczak curry na skyrze, chili z indyka, pulpety, gulasz, sernik
  proteinowy. Zwykle na 2–3 porcje, a sernik na 8 kawałków.

Szybkie są zawsze na początku listy, dalej według czasu. Gramatury są na cały
przepis. Białko, kalorie i zasada są liczone na porcję, a karta pisze wtedy
„na porcję (przepis na 3 porcje)”. Rodzaje: Szybki mix, Shake, Na słodko,
Na słono i Obiad.

- Każda karta pokazuje sklep, w którym kupisz **wszystkie** składniki naraz,
  z możliwością przełączenia na inny sklep.
- Każdy składnik można zamienić na inny produkt z tego samego sklepu. Jeśli
  zamiana złamie zasadę, karta pokaże to na czerwono.
- Białko w proszku, oliwa, przyprawy i woda to rzeczy, które masz w domu.
  Jeśli sklep ma własne białko (np. Go Active w Biedronce), zostanie użyte.
  Tłuszcz z oliwy zawsze się liczy.
- Mleko, jajka, owoce i warzywa, a także surowe mięso i ryby (filet z
  kurczaka, mielony indyk, łosoś, dorsz), passata, ryż czy fasola z puszki są w
  każdym supermarkecie. Gdy brak danych o produkcie, liczone są z wartości
  typowych. Krewetki i wędzony łosoś muszą być w danych sklepu.
- Niżej są gotowe produkty spełniające zasadę na 100 g: batony, napoje, skyry,
  twarogi i białko w proszku.

Sklepy pochodzą z danych OFF i z marek własnych sieci, np. Pilos → Lidl,
Go Active / Delikate → Biedronka, K-Classic → Kaufland. Przepisy są w
`src/recipes/catalog.ts`. Pokrycie na aktualnych danych pokazuje:

```bash
pnpm recipes:check
```

## W pobliżu (`/w-poblizu`) i aplikacja PWA

Aplikacja **otwiera się na mapie**. Po otwarciu:

1. Szuka Twojej lokalizacji. Gdy przeglądarka odmówi, wystarczy kliknąć na
   mapie, gdzie jesteś.
2. Pobiera sklepy spożywcze z OpenStreetMap w wybranym promieniu (suwak:
   500 m – 10 km).
3. Pokazuje przepisy, które zrobisz, odwiedzając jeden pobliski sklep, np.
   „Wszystko kupisz w: Żabka · 250 m · Marszałkowska 10”.

Twoja pozycja, zaokrąglona do ok. 100 m, trafia do serwera Overpass z danymi
OpenStreetMap (overpass-api.de, a zapasowo overpass.private.coffee). Oglądany
fragment mapy pobierany jest z tile.openstreetmap.org. Pozycji nie ma w adresie
URL, a ostatnie miejsce zostaje tylko na tym urządzeniu. Odpowiedzi są
zapamiętywane na dobę, więc mniejszy promień i krótki spacer nie wymagają
nowego zapytania.

Gdy przeglądarka nie poda lokalizacji, kliknij na mapie. Gdy lokalizacja już
jest, zmienisz ją przytrzymaniem palca (prawym klikiem na komputerze) albo
przyciskiem „Ustaw środek mapy jako moją lokalizację”.

Aplikację można zainstalować (PWA). Działa też offline, od pierwszej wizyty
(komunikat o tym pojawia się dopiero wtedy, gdy dane są już zapisane). Dane
produktów mają wersję w adresie (`data/manifest.json`), więc 23 MB pobiera się
ponownie tylko po `pnpm data:prepare`, a nie przy każdym otwarciu. Oglądane
zdjęcia i kafelki mapy też są zapamiętywane. Nowa wersja aplikacji instaluje
się dopiero po kliknięciu „Odśwież”.

```bash
pnpm build && pnpm preview   # wersja produkcyjna z service workerem
pnpm icons                   # ikony z public/icons/mark.svg
```

**Na telefonie potrzebny jest HTTPS.** Bez niego przeglądarka nie udostępni
lokalizacji ani instalacji (wyjątkiem jest `localhost`), dlatego aplikacja
jest na GitHub Pages: **https://aleksanderdudek.github.io/produkty-pl/**.

Publikacja: `pnpm deploy:pages`. Skrypt buduje lokalnie z
`BASE_PATH=/produkty-pl/` i wypycha `dist/` na gałąź `gh-pages` jako jeden
commit. Lokalnie, bo dane produktów (`public/data`) powstają z wielogigabajtowego
eksportu Open Food Facts i nie ma ich w repozytorium, więc build w GitHub
Actions nie miałby czego serwować.

## Dieta (`/dieta`)

Plan żywienia, który się nagina. Wszystkie dane (profil, zapisy jedzenia,
pomiary, plan) są **tylko na tym urządzeniu** (IndexedDB w przeglądarce) i nic
nie jest wysyłane. Kopię zapasową pobierzesz w „Profil → Twoje dane”.

- **Profil.** Płeć, wiek, wzrost, waga startowa i docelowa, aktywność i kroki.
  Na bieżąco liczy podstawowe spalanie (BMR, wzór Mifflina-St Jeora, jak w
  arkuszu), spalanie dzienne, deficyt, tempo i datę osiągnięcia celu. Ostrzega,
  gdy cel kalorii jest poniżej BMR albo tempo przekracza 1% masy ciała na
  tydzień. Przyciski ustawiają cel kalorii według tempa (0,25–1 kg/tydz.).
- **Sposób odżywiania.** Do wyboru: redukcja wysokobiałkowa, zbilansowana,
  low carb (do 100 g węglowodanów), keto (do 30 g) i sportowa. Każdy profil
  wyznacza dzienne cele makro i ocenia jedzenie: „pasuje”, „może być” albo
  „nie pasuje”, zawsze z powodem.
- **Plan z Excela.** „Wczytaj plan z Excela” czyta arkusz w przeglądarce: dni
  wzorcowe, warianty, potrawy z kaloriami i makro oraz parametry z panelu.
  Plik nigdzie nie trafia, zostaje tylko odczytany plan.
- **Dziś.** Bilans dnia z paskami kalorii, białka, węglowodanów i tłuszczu.
  Pokazuje, czego brakuje, a czego jest za dużo. Pozycje planu można odhaczyć,
  pominąć albo **zamienić** na coś o podobnej kaloryczności (±12%). Najpierw
  idą pojedyncze zamienniki, potem zestawy z dwóch rzeczy, a najbliższe makro
  są na górze. Bez planu „Propozycja dnia” układa posiłki z tego, co jest w
  pobliżu i w domu („Inny zestaw” losuje kolejny).
- **Liczy się to, co zjedzone.** „Dodaj zjedzone” szuka w produktach,
  przepisach, pozycjach planu i Twoim jedzeniu. Gramaturę można zmienić. Dla
  obiadu na mieście wystarczą same kalorie. Cel dnia koryguje się według
  tygodnia: nadwyżka jest rozkładana na kolejne dni (najwyżej 10% celu
  dziennie), a niedojedzone kalorie wracają.
- **Co teraz?** Propozycje na resztę dnia, z gwiazdką przy najlepszych i
  powodem: ile uzupełniają białka, czy mieszczą się w budżecie, gdzie je
  kupić. Sklepy w pobliżu są brane z ostatniego wyszukiwania w „W pobliżu”,
  zapisanego na urządzeniu. Zakładka Dieta sama nie łączy się z siecią.
- **Postęp.** Wykres wagi z pomiarami, linią planu, prognozą od ostatniego
  ważenia i celem. Do tego kalorie z 14 dni i średnie makro z tygodnia wobec
  celów profilu (makro liczone tylko z dni z pełnymi danymi).

## Uruchomienie

```bash
pnpm install
pnpm data          # taksonomie + ceny + przygotowanie products.json
pnpm dev
```

`pnpm data` czyta `data/raw/off_poland.csv`, czyli wyciąg produktów z
`countries_tags` = `en:poland` z pełnego zrzutu Open Food Facts. Można go zrobić
poleceniem:

```bash
LC_ALL=C awk -F'\t' 'NR==1 || $41 ~ /(^|,)en:poland(,|$)/' en.openfoodfacts.org.products.csv > data/raw/off_poland.csv
```

Opcjonalnie, żeby dołączyć produkty z ceną w PLN, które nie mają tagu kraju
(około 260 dodatkowych):

```bash
pnpm data:prices
pnpm data:extract-priced ścieżka/do/en.openfoodfacts.org.products.csv
pnpm data:prepare
```

Poszczególne kroki: `data:taxonomies` (polskie nazwy kategorii, etykiet,
alergenów i dodatków), `data:prices` (wszystkie ceny w PLN), `data:prepare`
(składa `public/data/products.json`). Pliki w `data/raw/` i `public/data/` nie
trafiają do gita.

## Rozwój

```bash
pnpm test     # Vitest: logika danych, filtrów, sortowania, URL i komponenty
pnpm lint     # oxlint
pnpm build    # tsc + build produkcyjny
```

Logika jest w czystych modułach (`src/lib/`, `scripts/lib/`) z testami.
Komponenty w `src/components/` tylko wyświetlają. Projekt:
`docs/superpowers/specs/2026-10-10-produkty-pl-design.md`.

## Licencje danych

Baza Open Food Facts: ODbL. Zdjęcia: CC BY-SA. Dane tworzą użytkownicy, więc
mogą być niepełne lub błędne. Wartości poza fizycznym zakresem (np. 3000 kcal
w 100 g) są odrzucane jako `null`.
