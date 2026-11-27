# CLAUDE.md – Arbetsmarknad, månadsuppföljning

Projektspecifika instruktioner. Allmänna regler (kodstil, data och
sekretess, presentation av siffror, GitHub) finns i den överordnade
CLAUDE.md och upprepas inte här. Fyll i rubrikerna nedan vid
projektstart och håll dem aktuella.

## Vid projektstart
- Exempelskripten i R/ och exempeldatan (folkmängd per primärområde,
  JSON i app/data/ och rapport/data/) kommer från mallen. Ta bort eller
  ersätt dem med projektets egna; behåll strukturen och valideringen
- Behåll app/ eller rapport/ och ta bort den andra med dess workflow
- Fyll i den här filen tillsammans med Robin: fråga efter syfte, data
  och mått i stället för att gissa
- Rör inte plan.md: planen tas fram i chatten och läggs in av Robin,
  eller av Claude när Robin ber om det. Till dess ligger den tomma
  planen kvar

## Syfte
<!-- Vad ska projektet besvara? Vem är beställare och mottagare? -->
- Beställare: Analysenheten, för internt bruk
- Frågeställning: löpande månadsuppföljning av arbetsmarknaden i
  Göteborg jämfört med Stockholm, Malmö, SKR:s större städer och riket
- Leverans: webbapp (app/)
- Publicering: GitHub Pages (publikt repo). Uppdateras automatiskt
  med GitHub Actions när SCB publicerar en ny månad; R körs i Actions
  (avsteg från mallen, där R bara körs lokalt)

## Struktur
```
R/00_installningar.R   Regioner, tabelladresser, källrad, etiketter
R/01_hamta_data.R      Hämtning (pxweb, filer i data/raw/)
R/10_bearbeta.R        Bearbetning till data/processed/
R/98_validera.R        Validering – stoppar vid fel
R/99_exportera_json.R  Export till app/data/
app/                   Webbapp (JavaScript + d3)
```
<!-- Lägg till nya skript och mappar här när de skapas. -->

## Data
<!-- En rad per källa: källa, tabell/vy, år, geografisk nivå,
     hur den hämtas och var den ligger. -->
| Källa | Tabell | Period | Nivå | Hämtas med | Fil |
|-------|--------|--------|------|------------|-----|
| SCB BAS, prel. | AM0210A/ArbStatusM | 2020M01– | kommun, riket | pxweb | data/raw/ |
| SCB BAS, prel. | AM0210A/ArbStatFAT12 | 2020M01– | kommun, riket | pxweb | data/raw/ |
| SCB BAS, prel. | AM0210B/ArbStDoNMNN | 2020M01– | kommun, riket | pxweb | data/raw/ |

- Endast preliminär månadsstatistik (ingen blandning med slutlig)
- Regioner (27 st, alla finns i de tre tabellerna):
  - Riket: 00
  - Storstäder, SKR A1: 0180 Stockholm, 1280 Malmö, 1480 Göteborg
  - Större stad, SKR B3 (kommungruppsindelning 2023, 23 kommuner):
    0181 Södertälje, 0380 Uppsala, 0484 Eskilstuna, 0580 Linköping,
    0581 Norrköping, 0680 Jönköping, 0780 Växjö, 0880 Kalmar,
    1281 Lund, 1283 Helsingborg, 1290 Kristianstad, 1380 Halmstad,
    1488 Trollhättan, 1490 Borås, 1780 Karlstad, 1880 Örebro,
    1980 Västerås, 2081 Borlänge, 2180 Gävle, 2281 Sundsvall,
    2380 Östersund, 2480 Umeå, 2580 Luleå
  - Källa: SKR, Kommungruppsindelning 2023 (PDF på extra.skr.se)
- Uppdelningar: kön (1, 2, 1+2) och födelseregion (tot, in, ut)
- Data från MONA: nej

## Mått och definitioner
<!-- Hur varje mått räknas: täljare, nämnare, population, referensår.
     Det är här avvikelser mot källans definitioner dokumenteras. -->
Ålder: 20–64 år är standard. 65–74 år är ett aktivt val (utsnitt)
och visar de mått som SCB redovisar för åldersgruppen. SCB redovisar
inte arbetslösa, arbetskraften, arbetslöshet eller
arbetskraftsdeltagande för 65–69 och 70–74 år; de visas inte för
65–74 år, och Om statistiken förklarar varför (beslut 2026-11-27).
Studerande 65–74 år är 0 i alla celler och visas inte heller.

| Mått | Källa | Täljare | Nämnare | Kommentar |
|------|-------|---------|---------|-----------|
| Antal sysselsatta, arbetslösa, arbetskraften, studerande, sjuka, pensionärer, övriga, totalt | ArbStatusM | – | – | 20–64 direkt; 65–74 = 65–69 + 70–74 (ej arbetslösa och arbetskraften) |
| Arbetslöshet | ArbStatusM | arbetslösa | arbetskraften | 20–64: SCB:s värde; 65–74: redovisas inte |
| Arbetskraftsdeltagande | ArbStatusM | arbetskraften | antal totalt | 20–64: SCB:s värde; 65–74: redovisas inte |
| Sysselsättningsgrad | ArbStatusM | sysselsatta | antal totalt | 20–64: SCB:s värde; 65–74: beräknas i R |
| Förankrade på arbetsmarknaden | ArbStatFAT12 | sysselsatta med ≥ 3 inkomstbasbelopp (FAT12m = 3) | hela befolkningen i åldersgruppen (antal totalt, summerat över alla inkomstnivåer) | beräknas i R; 65–74 finns direkt i tabellen |
| Sysselsatta per bransch | ArbStDoNMNN | – | – | 15–74 år, SNI 2007; både arbetsställets och bostadens belägenhet |

Förändring visas mot föregående månad och mot samma månad föregående
år (procentenheter för andelar, procent för antal).

## Validering
<!-- Förväntade värden som ställs in överst i R/98_validera.R. -->
- Förväntat antal regioner: 27 (riket + 3 storstäder + 23 större)
- Förväntade månader: 2020M01 t.o.m. senaste månad i SCB, utan luckor
- 65–69 + 70–74 summerar till rimliga antal; andelar 0–100
- Summan av inkomstnivåer stäms av mot antal i ArbStatusM
- Summan av branscher = Total (A-U+US)
- SCB skyddar statistiken med CKM, så enskilda celler summerar inte
  exakt till totalerna (kön, födelseregion, statusgrupper,
  inkomstnivåer, branscher). Summakontrollerna godkänner avvikelser
  upp till 50 personer (tolerans_antal i 98_validera.R, beslut
  2026-11-27). Använd SCB:s totalceller i stället för att summera
  delar där det går

## JSON-format (app/data/)
Alla filer har `{ meta: { titel, kalla, enhet, uppdaterad,
senaste_manad }, data }`. Koder för region, kön, födelseregion, ålder,
mått och bransch; texterna finns i meta.json. Formatet beskrivs i
detalj överst i R/99_exportera_json.R.

| Fil | data |
|-----|------|
| meta.json | koder och texter (regioner, kön, födelseregion, ålder, mått med typ/enhet/åldrar, branscher, belägenhet) och alla månader |
| oversikt.json | senaste månaden: en rad per region × kön × födelseregion × ålder × mått med varde, forandring_manad, forandring_ar |
| tidsserier.json | `{ manader, serier }`; varje serie (region, kon, fodelseregion, alder, matt) har `varden` i samma ordning som `manader` |
| branscher.json | senaste månaden: en rad per region × kön × födelseregion × bransch × belägenhet med förändringar |
| bransch_tidsserier.json | bara Göteborg: `{ manader, serier }`; varje serie (region, kon, fodelseregion, bransch, belagenhet) har `varden` (antal) i samma ordning som `manader` |

Avrundning görs i R: andelar och förändringar med en decimal, antal
heltal. Förändring som inte går att räkna (föregående antal 0) är null.

## Design
- Robins designsystem (skillen robins-designsystem): app/src/tokens.css
  och app/src/komponenter.css är ordagranna kopior och ändras inte här.
  Projektets egna stilar ligger i app/src/styles.css och använder bara
  variablerna. Profilens regler gäller fortfarande
  (goteborg-visualisering)
- Mörkt tema är förval (beslut 2026-11-27); ljust kan väljas med
  växlaren och sparas i localStorage. Kontrollera båda teman
- Hårdkoda aldrig färger, varken i css eller d3: serier får klasserna
  .s1–.s7 (Göteborg alltid s1), i mörkt tema max 4 serier med
  direktetiketter
- Källrad i varje diagram och tabell
- Diagramkomponenterna i app/src/components/charts/ är mallens och
  hämtar färger från theme.js; de görs om efter designsystemet
  (ds-diagram, ds-plot) när första diagrammet byggs
<!-- Projektspecifika val: diagramtyper, färgsättning av kategorier,
     ordning på områden, avsteg från profilen och varför. -->

## Bygga och köra
```
# R: kör i ordning från projektroten
Rscript R/01_hamta_data.R
Rscript R/10_bearbeta.R
Rscript R/98_validera.R
Rscript R/99_exportera_json.R

# Webbapp: öppna app/index.html med Live Server i VS Code
# (ES-moduler fungerar inte om filen öppnas direkt från disk)

```
- Webbappen är vanlig JavaScript och d3 utan byggsteg och utan
  Node.js. d3 och Open Sans laddas från jsdelivr; d3-versionen styrs i
  app/src/d3.js
- Exportera aldrig till app/ om 98_validera.R inte går
  igenom
- Under utvecklingen startas publicering till GitHub Pages bara
  manuellt (Actions > Run workflow), aldrig vid push, och inte utan att
  Robin bett om det
- När appen är godkänd aktiveras en schemalagd månadskörning: hämta,
  bearbeta, validera, exportera och publicera. Den körningen ändrar
  bara data, aldrig appens kod. Stoppar valideringen publiceras inget
  och den tidigare versionen ligger kvar
