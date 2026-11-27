# Arbetsmarknad – månadsuppföljning

Webbapp för löpande uppföljning av arbetsmarknaden i Göteborg jämfört
med Stockholm, Malmö, SKR:s 23 större städer och riket. Internt bruk,
Analysenheten, Stadsledningskontoret, Göteborgs Stad.

Källa: SCB, Befolkningens arbetsmarknadsstatus (BAS), preliminär
statistik baserad på månatliga uppgifter (tabellerna ArbStatusM,
ArbStatFAT12 och ArbStDoNMNN), från januari 2020.

## Innehåll

Appen har fem flikar:

| Flik | Visar |
|------|-------|
| Översikt | Senaste månaden för Göteborg, jämförelse med Stockholm, Malmö och riket, befolkningen efter status |
| Utveckling över tid | Ett mått månad för månad; Göteborg och upp till tre regioner till |
| Jämförelse mellan kommuner | Andelar för de 26 kommunerna, Göteborg markerad, riket som referens |
| Branscher | Sysselsatta per bransch i Göteborg efter arbetsställe och bostad |
| Om statistiken | Källa, definitioner och förbehåll |

Ålder (20–64 eller 65–74 år), kön och födelseregion väljs gemensamt
för flikarna. Mått, definitioner och JSON-format beskrivs i
`CLAUDE.md`; planen och besluten finns i `plan.md`.

## Köra R-skripten

Kör från projektets rotmapp, i nummerordning:

```
Rscript R/01_hamta_data.R      # hämtar från SCB till data/raw/
Rscript R/10_bearbeta.R        # bearbetar till data/processed/
Rscript R/98_validera.R        # kontrollerar, stoppar vid fel
Rscript R/99_exportera_json.R  # validerar och skriver JSON till app/data/
```

Regioner, tabelladresser, källrad och etiketter ligger i
`R/00_installningar.R`. `99_exportera_json.R` kör alltid valideringen
först och exporterar ingenting om den inte går igenom.

Paket: tidyverse, here, pxweb, jsonlite (och httpuv för att granska
appen lokalt).

## Granska lokalt

Appen är vanlig JavaScript och d3 utan byggsteg. Den måste visas via
en webbserver, eftersom webbläsaren stoppar JavaScript-moduler som
öppnas direkt från disken. Antingen:

- högerklicka på `app/index.html` i VS Code och välj **Open with Live
  Server**, eller
- kör `Rscript -e "httpuv::runStaticServer('app', port = 8765)"` och
  öppna http://localhost:8765.

## Utseende

Appen följer Robins designsystem (ljust och mörkt tema, mörkt är
förval) och Göteborgs Stads grafiska profil. `app/src/tokens.css` och
`app/src/komponenter.css` kommer ordagrant från designsystemet och
ändras inte här; projektets egna stilar ligger i `app/src/styles.css`.
Färger sätts aldrig direkt i koden, bara via variablerna och
klasserna i designsystemet.

## Publicera

Appen ligger på
https://robinnordlund.github.io/arbetsmarknad_manadsuppfoljning/.

**Månadskörning** (`.github/workflows/manadskorning.yml`): varje
vardag kl. 09:00 UTC kontrollerar `R/02_ny_manad.R` om SCB har
publicerat en ny månad. Finns en ny månad hämtas, bearbetas,
valideras och exporteras data i GitHub Actions, och sedan committas
bara `app/data/*.json` till `main` och appen publiceras. Stoppar
valideringen publiceras inget och den tidigare versionen ligger kvar;
GitHub mejlar då om den misslyckade körningen. Körningen kan också
startas för hand: **Actions > Månadskörning > Run workflow**.

**Ändringar i appen** publiceras manuellt med
`.github/workflows/publicera-app.yml`: **Actions > Publicera app >
Run workflow**.

## Struktur

```
R/                    Numrerade R-skript (inställningar, hämta,
                      bearbeta, validera, exportera)
data/raw/             Rådata – committas aldrig
data/processed/       Bearbetade data – committas aldrig
app/                  Webbapp: JavaScript + d3, utan byggsteg
  index.html          Sidan med flikarna
  src/main.js         Urval, flikar, tema och inläsning av data
  src/vyer/           En fil per flik
  src/components/     Källrad och diagram (linje, stapel)
  src/format.js       Svensk talformatering
  src/tokens.css      Designsystemets variabler (ändras inte här)
  src/komponenter.css Designsystemets komponenter (ändras inte här)
  src/styles.css      Projektets egna stilar
  data/               JSON från R
.github/workflows/    Publicering till GitHub Pages
```

## Data och sekretess

Statistiken är SCB:s publicerade och skyddade tabeller; ingen data
från MONA används. `data/raw/` och `data/processed/` ignoreras av git.
Endast de färdiga, validerade JSON-filerna i `app/data/` committas.
