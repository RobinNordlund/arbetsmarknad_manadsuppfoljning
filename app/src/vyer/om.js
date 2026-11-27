// Om statistiken: källor, definitioner och förbehåll. Perioder,
// regioner och måttnamn kommer från meta.json; resten är fast text.
// Definitionerna följer SCB:s Statistikens framställning för BAS,
// preliminär statistik baserad på månatliga uppgifter (version 2,
// 2026-05-28). Övrigt bygger på projektets CLAUDE.md och plan.md.

function el(tagg, klass, text) {
  const e = document.createElement(tagg);
  if (klass) e.className = klass;
  if (text !== undefined) e.textContent = text;
  return e;
}

// Kort med rubrik och stycken
function kort(rubrik, ...innehall) {
  const k = el("section", "ds-kort om-kort");
  k.append(el("h2", null, rubrik), ...innehall.map((x) =>
    (typeof x === "string" ? el("p", null, x) : x)));
  return k;
}

// Definitionslista: [[term, beskrivning], ...]
function definitioner(par) {
  const dl = el("dl", "om-definitioner");
  for (const [term, text] of par) {
    dl.append(el("dt", null, term), el("dd", null, text));
  }
  return dl;
}

export function ritaOm(element, { meta }) {
  const m = meta.meta;
  const d = meta.data;
  const forsta = d.manadsnamn[0];
  const regioner = (grupp) => d.regioner
    .filter((x) => x.grupp === grupp)
    .map((x) => x.region)
    .sort((a, b) => a.localeCompare(b, "sv"))
    .join(", ");
  const mattnamn = (kod) => d.matt.find((x) => x.kod === kod)?.namn ?? kod;

  element.replaceChildren();
  const avsnitt = el("section", "avsnitt om");
  avsnitt.append(
    el("h2", null, "Om statistiken"),
    el("p", "avsnitt-text",
      `Statistiken gäller ${forsta}–${m.senaste_text}. Uppgifterna ` +
      // Hårda bindestreck (U+2011) så att datumet inte bryts
      `uppdaterades ${m.uppdaterad.replaceAll("-", "‑")}.`),
  );

  avsnitt.append(
    kort("Källa",
      "Statistiken kommer från SCB:s Befolkningens arbetsmarknadsstatus " +
      "(BAS), preliminär statistik baserad på månatliga uppgifter. BAS " +
      "bygger enbart på administrativa uppgifter från myndigheter och " +
      "omfattar den folkbokförda befolkningen 15–74 år. Appen använder " +
      "tre tabeller i SCB:s statistikdatabas: arbetsmarknadsstatus " +
      "efter månad (ArbStatusM), efter arbetsrelaterad inkomstnivå " +
      "(ArbStatFAT12) och sysselsatta efter bransch (ArbStDoNMNN).",
      "SCB publicerar en ny månad ungefär två månader efter månadens " +
      "slut. Tidigare månader kan revideras, och appen hämtar därför " +
      "hela serien från SCB vid varje uppdatering. SCB publicerar " +
      "senare också en slutlig statistik som kan skilja sig från den " +
      "preliminära; appen visar bara den preliminära.",
      "Bearbetningen görs av Analysenheten, Stadsledningskontoret, " +
      "Göteborgs Stad. Mer om statistiken finns på SCB:s webbplats, " +
      "scb.se/AM0210."),

    kort("Arbetsmarknadsstatus",
      "Varje person får en status per månad. Statusarna går i ordning: " +
      "den som har varit sysselsatt någon gång under månaden räknas som " +
      "sysselsatt, den som inte har varit sysselsatt men arbetslös " +
      "räknas som arbetslös, och så vidare.",
      definitioner([
        ["Sysselsatt",
          "Har under månaden fått lön eller annan ersättning för " +
          "arbete enligt arbetsgivarens månadsdeklaration till " +
          "Skatteverket, eller driver ett verksamt företag. Även den " +
          "som har arbetat under det senaste året och sedan dess har " +
          "till exempel föräldrapenning eller sjukpenning räknas som " +
          "sysselsatt."],
        ["Arbetslös",
          "Har någon gång under månaden varit inskriven hos " +
          "Arbetsförmedlingen som öppet arbetslös eller i program med " +
          "aktivitetsstöd. Gäller bara personer som är 16–66 år."],
        ["Studerande",
          "Har fått studiestöd, studiehjälp eller " +
          "omställningsstudiestöd från CSN under månaden."],
        ["Pensionär", "Har fått pension från Pensionsmyndigheten."],
        ["Sjuk",
          "Har fått till exempel sjukersättning eller sjukpenning från " +
          "Försäkringskassan."],
        ["Övrig", "Har ingen av statusarna ovan."],
      ]),
      "Sysselsatta och arbetslösa utgör tillsammans arbetskraften. " +
      "Studerande, pensionärer, sjuka och övriga står utanför den."),

    kort("Mått",
      definitioner([
        [mattnamn("arbetsloshet"),
          "Arbetslösa i procent av arbetskraften."],
        [mattnamn("sysselsattningsgrad"),
          "Sysselsatta i procent av befolkningen i åldersgruppen."],
        [mattnamn("arbetskraftsdeltagande"),
          "Arbetskraften i procent av befolkningen i åldersgruppen " +
          "(SCB kallar måttet även relativt arbetskraftstal)."],
        [mattnamn("forankrade"),
          "Sysselsatta vars inkomst från arbete och arbetsrelaterade " +
          "ersättningar under de senaste tolv månaderna är minst tre " +
          "inkomstbasbelopp, i procent av befolkningen i åldersgruppen. " +
          "Beräknas från SCB:s indelning efter arbetsrelaterad " +
          "inkomstnivå."],
        [mattnamn("totalt"),
          "Alla folkbokförda personer i åldersgruppen, oavsett status."],
      ]),
      "Arbetslöshet, sysselsättningsgrad och arbetskraftsdeltagande för " +
      "20–64 år är SCB:s egna värden. Förankrade på arbetsmarknaden " +
      "beräknas av Analysenheten."),

    kort("Förändringar",
      "Förändringar visas mot föregående månad och mot samma månad " +
      "föregående år. För andelar anges förändringen i procentenheter " +
      "och för antal i procent. Andelar och förändringar avrundas till " +
      "en decimal och antal till heltal. Där föregående antal är 0 går " +
      "förändringen inte att beräkna och visas som –.",
      "Appen visar värdena som SCB redovisar dem och säsongsjusterar " +
      "dem inte. Förändringen mot föregående månad kan därför till stor " +
      "del bero på säsong. Tydligast syns det för studerande, som är " +
      "betydligt färre under sommarmånaderna. Förändringen mot samma " +
      "månad föregående år påverkas mindre av säsong."),

    kort("Åldersgrupper",
      "Standard är 20–64 år. Åldersgruppen 65–74 år är summan av " +
      "SCB:s grupper 65–69 och 70–74 år, och sysselsättningsgraden för " +
      "den beräknas av Analysenheten.",
      "Arbetslös som status gäller bara personer som är 16–66 år. SCB " +
      "redovisar därför inte arbetslösa och arbetskraften för 65–69 och " +
      "70–74 år, och appen visar inte heller arbetslöshet eller " +
      "arbetskraftsdeltagande för 65–74 år. Studerande är 0 i hela " +
      "statistiken för de åldrarna och visas inte.",
      "Branscherna redovisas av SCB för 15–74 år, och där går ålder " +
      "inte att välja."),

    kort("Branscher",
      "Sysselsatta delas in i branscher enligt SNI 2007, med SCB:s " +
      "sammanslagningar. Diagrammen använder korta namn; tabellerna " +
      "visar SCB:s namn.",
      definitioner([
        ["Arbetar i Göteborg",
          "Sysselsatta efter arbetsställets belägenhet: alla vars " +
          "huvudsakliga arbetsställe ligger i Göteborg, oavsett var de " +
          "bor."],
        ["Bor i Göteborg",
          "Sysselsatta efter bostadens belägenhet: alla som är " +
          "folkbokförda i Göteborg, oavsett var de arbetar."],
      ]),
      "Den som har flera jobb räknas till arbetsstället och branschen " +
      "för det jobb som ger högst inkomst. För anställda som oftast " +
      "börjar arbetet hemifrån, till exempel resande försäljare, kan " +
      "arbetsstället vara detsamma som bostaden. Arbetsställe är inte " +
      "samma sak som var personen befinner sig under dagen."),

    kort("Regioner",
      definitioner([
        ["Riket", "Hela Sverige."],
        ["Storstäder", regioner("Storstad") +
          " (SKR:s kommungrupp A1)."],
        ["Större städer", regioner("Större stad") +
          " (SKR:s kommungrupp B3)."],
      ]),
      "Kommungrupperna följer SKR:s kommungruppsindelning 2023. De " +
      "större städerna visas alltid var för sig, aldrig som en " +
      "sammanslagen grupp."),

    kort("Skydd av statistiken",
      "SCB skyddar uppgifterna om enskilda med en metod (CKM) som lägger " +
      "till ett litet positivt eller negativt heltal på statistikvärden " +
      "som är större än noll, även på totaler. Därför summerar delarna, " +
      "till exempel kvinnor och män, statusgrupper eller branscher, inte " +
      "alltid exakt till totalen. Appen använder SCB:s totaler där det " +
      "går i stället för att summera delarna.",
      "Påverkan är större för små tal än för stora. Andelar och " +
      "förändringar som bygger på få personer, till exempel för 65–74 " +
      "år eller utrikes födda i en mindre kommun, bör tolkas med " +
      "försiktighet. Värden som appen summerar, som 65–74 år, har " +
      "något större osäkerhet än SCB:s egna värden."),
  );

  element.append(avsnitt);
}
