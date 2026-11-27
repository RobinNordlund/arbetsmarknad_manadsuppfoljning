# Plan: Arbetsmarknad, månadsuppföljning

## Syfte
Löpande månadsuppföljning av arbetsmarknaden i Göteborg jämfört med
Stockholm, Malmö, SKR:s större städer och riket. Internt bruk,
Analysenheten.

## Leverans
Webbapp (app/) på GitHub Pages. När appen är godkänd uppdateras den
automatiskt varje månad.

## Steg
- [x] 1. Städa mallens rester (geometrier och R/05_geometrier.R, inga
      kartor behövs)
- [x] 2. Hämta data i R/01_hamta_data.R: pxweb för ArbStatusM,
      ArbStatFAT12 och ArbStDoNMNN, hela serien från 2020M01
- [x] 3. Bearbeta i R/10_bearbeta.R:
  - 65–74 år = 65–69 + 70–74
  - andelar räknas om för 65–74 år
  - andel förankrade på arbetsmarknaden
  - förändring mot föregående månad och mot samma månad föregående år
- [x] 4. Validera i R/98_validera.R med kontrollerna i CLAUDE.md
- [x] 5. Exportera JSON i R/99_exportera_json.R:
  - meta.json (senaste månad, uppdateringsdatum, källrader, listor över
    regioner och mått)
  - oversikt.json
  - tidsserier.json (kompakt format: dimensioner en gång, en array per
    kombination; delas per mått om filen blir för stor)
  - branscher.json
- [x] 6. Bygg appen med vyerna:
  - Översikt: senaste månaden för Göteborg med förändringar och
    jämförelse med Stockholm, Malmö, större städer och riket
  - Utveckling över tid: Göteborg förvald, fler kommuner kan läggas
    till; riket och större städer bara för andelar
  - Jämförelse mellan kommuner: stapeldiagram med alla 27 regioner,
    Göteborg markerad
  - Branscher: sysselsatta per bransch i Göteborg efter arbetsställe
    och bostad, förändring mot samma månad förra året
  - Om statistiken: definitioner, källor, senaste period
- [x] 7. Tidsserie för branscher: utvecklingen över tid för
      sysselsatta per bransch i Göteborg (arbetsställe och bostad).
      Kräver att R exporterar alla månader för branscherna (i dag har
      branscher.json bara senaste månaden)
- [x] 8. Granska siffror och text
- [x] 9. Publicera manuellt och godkänn appen
- [ ] 10. Sätt upp den schemalagda körningen (vardagar, kontroll av ny
      månad, skydd mot att GitHub stänger av schemat efter 60 dagar
      utan aktivitet) och aktivera den

## Beslut
- Inga kartor (2026-11-27)
- Hela serien hämtas vid varje uppdatering (2026-11-27)
- Automatisk månadspublicering när appen är godkänd; körningen ändrar
  bara data, aldrig appens kod (2026-11-27)
- Månadskörningen går varje vardag och publicerar bara när SCB har en
  ny månad, eftersom SCB kan publicera vilken vardag som helst
  (2026-11-27)
- Tidsserier: Göteborg förvald, fler kommuner kan läggas till. Riket
  och större städer visas bara för andelar (2026-11-27)
- SKR:s större städer visas bara som enskilda kommuner, ingen
  sammanslagen grupp (2026-11-27)
- En JSON-fil per vy, tidsserierna i kompakt format (2026-11-27)
- 65–74 år visar bara de mått SCB redovisar; arbetslöshet och
  arbetskraftsdeltagande visas inte för 65–74, och Om statistiken
  förklarar varför (2026-11-27)
- Studerande 65–74 år visas inte, eftersom värdet är 0 i alla celler
  (2026-11-27)
- SCB:s delar summerar inte exakt till totalerna, eftersom SCB
  skyddar statistiken med CKM (högst 24 personers avvikelse i
  serien). Summakontrollerna i valideringen godkänner avvikelser upp
  till 50 personer (2026-11-27)
- Utseendet följer Robins designsystem, mörkt tema som förval
  (2026-11-27)
- Navigering mellan vyerna med flikar överst (2026-11-27)
- Linjediagrammen börjar på noll som standard och kan zoomas in
  (2026-11-27)

## Nästa steg
Steg 1 klart (2026-11-27): geometrierna i geo/ och app/data/geo/,
R/05_geometrier.R och kartkomponenten karta.js är borttagna, liksom
kopieringen av geometrier i R/99_exportera_json.R. README.md är
fortfarande mallens och behöver skrivas om för projektet.

Steg 2 klart (2026-11-27): R/01_hamta_data.R hämtar de tre tabellerna
(2020M01–2026M08, 27 regioner) till data/raw/*.rds i lång form med
koder. Regioner och tabelladresser ligger i R/00_installningar.R.
Koderna är kontrollerade mot API:ts metadata och radantalen stämmer
med frågorna. ArbStatusM hämtas med alla elva tabellinnehåll, även
antal övriga, så att statusgrupperna kan stämmas av mot antal totalt.

Steg 3–4 klara (2026-11-27): R/10_bearbeta.R ger
data/processed/arbetsmarknad.rds (20–64 och 65–74 år, antal och
andelar med förändringar) och data/processed/bransch.rds.
Procentförändring blir NA när föregående antal är 0. R/98_validera.R
har 28 kontroller och alla går igenom.

Steg 5 klart (2026-11-27): R/99_exportera_json.R validerar först och
skriver sedan meta.json (6 kB), oversikt.json (645 kB),
tidsserier.json (2,1 MB) och branscher.json (1,2 MB) till app/data/.
Formatet står i CLAUDE.md (JSON-format) och överst i skriptet. Efter
exporten kontrolleras att varje serie har ett värde per månad och att
alla rader finns. Etiketter och källrad ligger i R/00_installningar.R.
oversikt.json och branscher.json innehåller bara senaste månaden.
Behövs fler månader för branscher läggs de till i steg 6.

Steg 6 påbörjat (2026-11-27): Översikt är byggd (app/src/vyer/
oversikt.js). Den har val av ålder, kön och födelseregion och tre
delar: nyckeltal för Göteborg med förändringar, en tabell som jämför
med Stockholm, Malmö och riket, och befolkningen i Göteborg efter
status. För 65–74 år visas bara de mått som finns, med en fotnot.
Månadstexterna ("augusti 2026" och jämförelsemånaderna) skrivs av R i
meta. Appen kan granskas lokalt med R-paketet httpuv; konfigurationen
ligger i .claude/launch.json (port 8765).

Design (2026-11-27): appen följer Robins designsystem i mörkt tema
(förval, ljust kan väljas). tokens.css och komponenter.css är
kopierade ordagrant från skillen; styles.css har bara projektets egna
stilar. Översikt är omgjord: urval med segmentknappar, nyckeltal i
kort, jämförelsetabellen har regionerna som rader (Göteborg fet) med
förändring mot året under värdet. Diagramkomponenterna görs om efter
designsystemet när linjediagrammet byggs.

Utveckling över tid klar (2026-11-27): app/src/vyer/utveckling.js med
linjediagram enligt designsystemet (components/charts/linjediagram.js,
färger via klasserna s1–s4, direktetiketter, verktygstips med alla
regioner, tangentbord med pilar). Val av mått och upp till tre regioner
utöver Göteborg; för antal bara Stockholm och Malmö. Ladda ner ger CSV,
och värdena finns i en utfällbar tabell. Det gemensamma urvalet styr
båda vyerna. gemensamt.js är omskriven; stapeldiagram.js från mallen
använder den gamla versionen och görs om i nästa vy.

Flikar (2026-11-27): vyerna ligger i flikar överst (Översikt,
Utveckling över tid, Jämförelse mellan kommuner, Branscher, Om
statistiken). Vald flik syns i adressen (#utveckling osv.), pilarna
byter flik, och det gemensamma urvalet döljs under Om statistiken. De
tre flikar som inte är byggda visar en notis.

Jämförelse mellan kommuner klar (2026-11-27): app/src/vyer/
jamforelse.js med liggande stapeldiagram (components/charts/
stapeldiagram.js, omskrivet efter designsystemet). De 26 kommunerna
sorteras från högst till lägst, Göteborg är markerad och riket visas
som streckad referenslinje. Bara andelar jämförs. Visa: andel eller
förändring mot föregående månad eller samma månad förra året.
Verktygstips, Ladda ner (CSV) och tabell med alla värden finns.
Vyn använder oversikt.json, som redan har senaste månaden för alla
regioner, i stället för en egen fil; filen läses en gång.

Branscher klar (2026-11-27): app/src/vyer/branscher.js. Nyckeltal för
alla branscher (arbetar respektive bor i Göteborg), val mellan
arbetsställe och bostad samt antal eller förändring mot samma månad
förra året eller föregående månad. Liggande stapeldiagram med
branscherna sorterade; Uppgift saknas visas bara i tabellen, eftersom
den lilla gruppens förändring drar ut skalan. Tabellen visar båda
belägenheterna sida vid sida med SCB:s branschnamn. Åldersvalet döljs
på fliken (branscherna finns bara för 15–74 år). Korta branschnamn för
diagrammet ligger i R/00_installningar.R (etikett_bransch$kort) och
exporteras i meta.json. lasData hämtar nu filerna med cache:
"no-cache", så att en ny månad syns direkt.

Steg 6 klart (2026-11-27): Om statistiken (app/src/vyer/om.js) har
källa och tabeller, preliminär statistik, definitioner av måtten,
förändringar och avrundning, åldersgrupperna (varför 65–74 år saknar
vissa mått), branscher och belägenhet, regionerna med SKR:s
kommungrupper samt CKM. Perioder, regioner och måttnamn läses från
meta.json. Texten bygger på CLAUDE.md och besluten i planen och bör
granskas i steg 8.

Steg 7 (tidsserie för branscher) lades till 2026-11-27 på Robins
begäran.

Steg 8 påbörjat (2026-11-27), granskning av flikarna som finns:
- Stickprov mot SCB:s API, hämtade oberoende av projektets skript:
  35 av 35 stämmer (andelar och förändring mot året för Göteborg,
  Stockholm, Malmö och riket; sysselsatta och förändring mot månaden;
  65–74 år för kvinnor; förankrade för utrikes födda; tre branscher
  efter arbetsställe och bostad). Senaste månad i SCB är 2026M08.
- SCB:s text för inkomstnivå 3 är "3 inkomstbasbelopp eller mer",
  vilket stämmer med definitionen av förankrade i Om statistiken.
- Studerande 20–64 år i Göteborg har ett tydligt säsongsmönster
  (få under juni–augusti), så den stora förändringen mot juli är
  säsong. Om statistiken och statustabellen i Översikt säger nu att
  värdena inte är säsongsjusterade.
- Rättat: källrad saknades under nyckeltalen i Branscher.
- README.md är omskriven för projektet.
- Inte kontrollerat: appen på mobil (emuleringen släpptes när panelen
  ändrade bredd) och Om statistikens formuleringar mot SCB:s egen
  beskrivning av BAS. app/src/theme.js används inte längre av någon
  komponent; den ligger kvar tills vidare.

Steg 7 klart (2026-11-27): R/99_exportera_json.R skriver
bransch_tidsserier.json (155 kB) med alla månader för Göteborg i samma
kompakta format som tidsserier.json, och kontrollerar att varje serie
har ett värde per månad och att alla serier finns. Formatet står i
CLAUDE.md. Fliken Branscher har fått delen Utveckling över tid: val av
bransch (alla branscher förvalt) och ett linjediagram med tabell och
Ladda ner. Linjediagrammet följer samma val som stapeldiagrammet,
arbetar eller bor i Göteborg, och visar en linje (ändrat på Robins
begäran 2026-11-27). Kön och födelseregion styr diagrammet. branscher.json innehåller fortfarande
alla 27 regioner (1,2 MB) fast appen bara visar Göteborg; den kan
krympas om laddningstiden blir ett problem.

Nyckeltalsrad i linjediagrammen (2026-11-27, Robins begäran): i
Utveckling över tid och i Branscher visar diagramkortet en diskret rad
mellan metaraden och diagrammet med förändringen mot föregående månad
och samma månad föregående år (utan senaste värdet, som tog för stor
plats), en per linje med
en liten markering i linjens färg. Värdena kommer färdiga från
oversikt.json och branscher.json (laggTillNyckelrad i
components/charts/gemensamt.js).

Steg 8 klart (2026-11-27):
- Branschernas tidsserie stämd mot SCB:s API: 96 av 96 värden stämmer
  (Göteborg; alla branscher, byggverksamhet, vård och omsorg; totalt
  och kvinnor; alla och utrikes födda; arbetsställe och bostad;
  2020M01, 2022M06, 2024M12, 2026M08).
- Om statistiken är omskriven efter SCB:s Statistikens framställning
  för preliminär BAS (version 2, 2026-05-28). Nytt: definitioner av
  statusarna (månadsbaserade och i ordning), att arbetslös bara gäller
  16–66 år (förklarar varför 65–74 år saknar arbetslöshet), att
  inkomstnivån gäller de senaste tolv månaderna, att arbetsstället är
  det huvudsakliga, att SCB publicerar ungefär två månader efter
  månadens slut och reviderar tidigare månader, och SCB:s egen
  beskrivning av skyddsmetoden med försiktighet för små tal.
  Dokumentet nämner inte säsongsjustering; texten säger därför bara
  att appen inte säsongsjusterar.
- Mobil (375 px): segmentknapparna i Jämförelse gjorde sidan bredare.
  Segmenten får nu brytas, och rubrik, luft och kort är mindre under
  600 px. Ingen del sticker längre ut på någon flik. Datorvyn är
  oförändrad.

Steg 1–8 är committade och sammanslagna med main (PR #1, 2026-11-27).
Repot är publikt.

Nollbaslinje i linjediagrammen (2026-11-27, Robins begäran): y-axeln
börjar på noll som standard, med en nollinje. Knappen Zooma in i
diagramkortet anpassar axeln efter värdena, och metaraden säger då
att y-axeln inte börjar på noll; Visa från noll går tillbaka. Gäller
Utveckling över tid och linjediagrammet i Branscher
(zoomknapp i components/charts/gemensamt.js). Inte committat.

PR #2 (nollbaslinje och zoom) är sammanslagen med main.

Steg 9 påbörjat (2026-11-27): Robin har ställt in GitHub Pages och
publicerat manuellt (Publicera app, körning 45997284322, lyckad).
Appen ligger på
https://robinnordlund.github.io/arbetsmarknad_manadsuppfoljning/ och
är kontrollerad: alla fem flikar laddar, senaste månad är augusti
2026, zoomknappen finns och konsolen visar inga fel. Robin godkände
appen 2026-11-27. Steg 9 klart.

Steg 10 påbörjat (2026-11-27): .github/workflows/manadskorning.yml
och R/02_ny_manad.R. Varje vardag 09:00 UTC (och manuellt):
1. aktiverar workflowet via GitHubs API (skydd mot att schemat stängs
   av efter 60 dagar; att anropet nollställer gränsen är inte
   verifierat, så kontrollera under Actions efter första månaden)
2. 02_ny_manad.R jämför senaste månaden i alla tre tabellerna med
   meta.json (testat lokalt: 2026M08 i både SCB och appen, ingen ny
   månad)
3. vid ny månad: 01, 10 och 99 (validerar först), commit av bara
   app/data/*.json till main (stoppar om något annat ändrats) och
   publicering på GitHub Pages

Nästa: committa på branchen manadskorning, PR och sammanslagning.
Robin kontrollerar sedan Settings > Actions > General > Workflow
permissions (läs och skriv) och att main tar emot push från Actions,
och provkör Actions > Månadskörning > Run workflow. Steg 10 bockas av
när en provkörning har gått igenom.

## Öppna frågor
Inga just nu.
