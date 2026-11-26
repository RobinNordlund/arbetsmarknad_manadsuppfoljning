# mall-analysprojekt

Mallrepo för analysprojekt på Analysenheten, Stadsledningskontoret,
Göteborgs Stad. Ett nytt projekt startar härifrån och får samma
struktur, validering och grafiska profil.

## Det här är en mall, inte ett projekt

Mallen ska göra oss lite mer effektiva, inte bestämma allt. Den ger en
gemensam struktur, validering och grafisk profil. Resten väljer varje
projekt själv. Exempelskripten och exempeldatan (folkmängd per
primärområde) finns bara för att visa hur delarna hänger ihop.

## Skapa ett nytt projekt

1. Gå till mallen på GitHub och klicka **Use this template > Create a
   new repository**. Välj ägare, organisationen
   `goteborg-statistik-och-analys` eller ditt eget konto, och om repot
   ska vara publikt eller privat. GitHub Pages fungerar bara i publika
   repon på organisationens gratisplan.
2. Klona det nya repot och öppna mappen i VS Code eller RStudio.
3. Gör följande innan analysen börjar:
   - **Välj app eller rapport.** Behåll `app/` eller `rapport/` och ta
     bort den andra, tillsammans med dess workflow i
     `.github/workflows/` (`publicera-app.yml` eller
     `publicera-rapport.yml`).
   - **Ta bort eller ersätt exempelskripten och exempeldatan.** Skript
     märkta `EXEMPEL` i `R/` och JSON-filerna i `app/data/` eller
     `rapport/data/` hör till exemplet. Behåll strukturen och
     valideringen, inte innehållet.
   - **Fyll i `CLAUDE.md`** (syfte, data, mått och definitioner).
   - **Lägg in planen i `plan.md`** när den är framtagen i chatten. Till
     dess ligger mallens tomma plan kvar.
   - **Ställ in förväntade värden** överst i `R/98_validera.R`.

## Det här behövs på datorn

| Verktyg | Till | Kommentar |
|---------|------|-----------|
| R med tidyverse, here, pxweb, sf, jsonlite | All databearbetning | |
| VS Code med tillägget Live Server | Granska webbappen | Ingen Node.js behövs |
| Quarto | Rapporten | Följer med RStudio |

## Köra R-skripten

Kör från projektets rotmapp, i nummerordning:

```
Rscript R/01_hamta_data.R      # hämtar data till data/raw/
Rscript R/10_bearbeta.R        # bearbetar till data/processed/
Rscript R/98_validera.R        # kontrollerar, stoppar vid fel
Rscript R/99_exportera_json.R  # validerar och skriver JSON
```

`99_exportera_json.R` kör alltid valideringen först och exporterar
ingenting om den inte går igenom.

**Kartor:** geometrierna för stadsområden, mellanområden och
primärområden ligger färdiga i `geo/` (GeoJSON, WGS84). Bara den som
ska uppdatera dem behöver köra `R/05_geometrier.R`, som läser stadens
shp-filer i `data/raw/geo/`. Shp-filerna ligger inte i repot.

## Granska lokalt

- **Webbapp:** högerklicka på `app/index.html` i VS Code och välj
  **Open with Live Server**. Filen går inte att öppna direkt från
  disken, eftersom webbläsaren då stoppar JavaScript-modulerna.
- **Rapport:** kör `quarto preview rapport` i terminalen.

## Publicera

Ingenting publiceras automatiskt. Du bestämmer när appen eller
rapporten är klar att publiceras.

1. En gång per projekt: på GitHub, gå till **Settings > Pages** och
   välj **Source: GitHub Actions**. Organisationen har GitHubs
   gratisplan, så Pages fungerar bara om projektets repo är **publikt**.
2. Exportera med `R/99_exportera_json.R`, committa JSON-filerna och
   pusha till `main`.
3. Starta publiceringen: fliken **Actions > Publicera app** (eller
   **Publicera rapport**) **> Run workflow**. Adressen syns under
   **Settings > Pages** när körningen är klar. Kör den igen varje gång
   en ny version ska ut.

R körs inte på GitHub. Allt räknas och kontrolleras lokalt; GitHub
publicerar bara de färdiga filerna.

## Struktur

```
R/                  Numrerade R-skript (hämta, bearbeta, validera, exportera)
data/raw/           Rådata – committas aldrig
data/processed/     Bearbetade data – committas aldrig
output/             Mellanresultat – committas inte
geo/                Geometrier (GeoJSON, WGS84) för kartor
app/                Webbapp: JavaScript + d3, utan byggsteg
  src/theme.js      Färger och typsnitt enligt grafiska profilen
  src/format.js     Svensk talformatering
  src/components/   Källrad och diagram (linje, stapel, karta)
  data/             JSON från R
rapport/            Quarto-rapport med OJS/d3-diagram
  theme.js          Samma färger som appen
  data/             JSON från R
.github/workflows/  Publicering till GitHub Pages
```

## Diagram

Utgå gärna från komponenterna i `app/src/components/charts/`. Egna
diagram går bra, men färger och typsnitt hämtas alltid från
`theme.js`. Följ Göteborgs Stads grafiska profil och ha en källrad
under varje diagram och tabell.

## Data och sekretess

`data/raw/`, `data/processed/` och `output/` ignoreras av git. Endast
färdiga, kontrollerade JSON-filer för webbappen eller rapporten får
committas. Data från MONA committas aldrig, inte heller aggregerade
tabeller före röjandekontroll.
