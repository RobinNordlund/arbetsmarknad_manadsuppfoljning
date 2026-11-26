# CLAUDE.md – [Projektnamn]

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
- Beställare:
- Frågeställning:
- Leverans: webbapp (app/) eller rapport (rapport/)
- Planerad publicering:

## Struktur
```
R/01_hamta_data.R      Hämtning (pxweb, filer i data/raw/)
R/05_geometrier.R      shp i data/raw/geo/ -> GeoJSON i geo/
R/10_bearbeta.R        Bearbetning till data/processed/
R/98_validera.R        Validering – stoppar vid fel
R/99_exportera_json.R  Export till app/data/ eller rapport/data/
geo/                   Geometrier (GeoJSON, WGS84)
app/ eller rapport/    Utdata (den andra är borttagen)
```
<!-- Lägg till nya skript och mappar här när de skapas. -->

## Data
<!-- En rad per källa: källa, tabell/vy, år, geografisk nivå,
     hur den hämtas och var den ligger. -->
| Källa | Tabell/vy | År | Nivå | Hämtas med | Fil |
|-------|-----------|----|------|------------|-----|
|       |           |    |      |            |     |

- Data från MONA: [ja/nej]. Är svaret ja, gäller reglerna om
  röjandekontroll i den överordnade CLAUDE.md.

## Mått och definitioner
<!-- Hur varje mått räknas: täljare, nämnare, population, referensår.
     Det är här avvikelser mot källans definitioner dokumenteras. -->
| Mått | Definition | Täljare | Nämnare | Kommentar |
|------|------------|---------|---------|-----------|
|      |            |         |         |           |

## Validering
<!-- Förväntade värden som ställs in överst i R/98_validera.R. -->
- Geografisk nivå och förväntat antal områden:
- Förväntade år:
- Summor som stäms av mot källan:

## Design
- Göteborgs Stads grafiska profil (skillen goteborg-visualisering);
  färger, typsnitt och talformat finns i app/src/theme.js eller
  rapportens tema
- Källrad i varje diagram och tabell
- Utgå gärna från komponenterna i app/src/components/charts/. Egna
  diagram går bra, men färger och typsnitt hämtas alltid från theme.js
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

# Rapport
quarto preview rapport
```
- Webbappen är vanlig JavaScript och d3 utan byggsteg och utan
  Node.js. d3 och Open Sans laddas från jsdelivr; d3-versionen styrs i
  app/src/d3.js
- Exportera aldrig till app/ eller rapport/ om 98_validera.R inte går
  igenom
- Publicering till GitHub Pages startas bara manuellt (Actions > Run
  workflow), aldrig automatiskt vid push. Starta den inte utan att
  Robin bett om det
