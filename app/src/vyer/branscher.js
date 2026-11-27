// Branscher: sysselsatta 15–74 år per bransch i Göteborg senaste
// månaden, efter arbetsställets belägenhet (de som arbetar i Göteborg)
// och bostadens belägenhet (de som bor i Göteborg). Värden och
// förändringar kommer färdiga från branscher.json. Ålder väljs inte
// här; SCB redovisar branscherna för 15–74 år.

import { stapeldiagram } from "../components/charts/stapeldiagram.js";
import { linjediagram } from "../components/charts/linjediagram.js";
import { skapaKallrad } from "../components/kallrad.js";
import {
  skapaDiagramkort, laddaNerCsv, laggTillNyckelrad,
} from "../components/charts/gemensamt.js";
import { formatTal, formatForandring, svenskLocale } from "../format.js";

const GOTEBORG = "1480";
const TOTAL = "A-U+US";
const SAKNAS = "US";

// Valen lever kvar när det gemensamma urvalet ändras
const tillstand = {
  belagenhet: "arbetsstalle", visa: "varde", tsBransch: "A-U+US",
};

export function indexeraBranscher(rader) {
  const index = new Map();
  for (const r of rader) {
    index.set([r.region, r.kon, r.fodelseregion, r.bransch, r.belagenhet]
      .join("|"), r);
  }
  return index;
}

function el(tagg, klass, text) {
  const e = document.createElement(tagg);
  if (klass) e.className = klass;
  if (text !== undefined) e.textContent = text;
  return e;
}

function namn(lista, kod) {
  return lista.find((x) => x.kod === kod)?.namn ?? kod;
}

function segment(id, etikett, alternativ, valt, vidVal) {
  const falt = el("div", "ds-falt");
  const rubrik = el("span", null, etikett);
  rubrik.id = id;
  const grupp = el("div", "ds-segment");
  grupp.setAttribute("role", "group");
  grupp.setAttribute("aria-labelledby", id);
  for (const a of alternativ) {
    const knapp = el("button", null, a.namn);
    knapp.type = "button";
    knapp.setAttribute("aria-pressed", String(a.kod === valt));
    knapp.addEventListener("click", () => vidVal(a.kod));
    grupp.append(knapp);
  }
  falt.append(rubrik, grupp);
  return falt;
}

// "<b>+1,2</b> % mot juli 2026"
function forandringsrad(varde, mot) {
  const p = el("p", "ds-forandring");
  p.append(el("b", null, formatForandring(varde)), ` % mot ${mot}`);
  return p;
}

export function ritaBranscher(element, {
  meta, branscher, index, bts, btsIndex, urval,
}) {
  const m = branscher.meta;
  const hamta = (bransch, belagenhet) => index.get([GOTEBORG, urval.kon,
    urval.fodelseregion, bransch, belagenhet].join("|"));
  const rita = () => ritaBranscher(element,
    { meta, branscher, index, bts, btsIndex, urval });

  const belagenheter = [
    { kod: "arbetsstalle", namn: "Arbetar i Göteborg" },
    { kod: "bostad", namn: "Bor i Göteborg" },
  ];
  const visaAlternativ = [
    { kod: "varde", namn: "Antal", falt: "varde" },
    { kod: "ar", namn: `Förändring mot ${m.jamfor_ar_text}`,
      falt: "forandring_ar" },
    { kod: "manad", namn: `Förändring mot ${m.jamfor_manad_text}`,
      falt: "forandring_manad" },
  ];
  const visa = visaAlternativ.find((x) => x.kod === tillstand.visa);
  const belagenhet = belagenheter
    .find((x) => x.kod === tillstand.belagenhet);
  const arForandring = visa.kod !== "varde";

  const urvalsdelar = [
    "Ålder: 15–74 år",
    urval.kon === "1+2" ? "Kvinnor och män" : namn(meta.data.kon, urval.kon),
    urval.fodelseregion === "tot" ? "Inrikes och utrikes födda"
      : namn(meta.data.fodelseregion, urval.fodelseregion),
  ];

  element.replaceChildren();

  // --- Nyckeltal: totalt efter arbetsställe och bostad ---
  const avsnitt = el("section", "avsnitt");
  avsnitt.append(
    el("h2", null, `Sysselsatta per bransch i Göteborg, ${m.senaste_text}`),
    el("p", "avsnitt-text",
      "Antal sysselsatta 15–74 år, " +
      `${urvalsdelar.slice(1).join(", ").toLowerCase()}. ` +
      "Arbetar i Göteborg räknar alla med arbetsställe i Göteborg, " +
      "oavsett var de bor. Bor i Göteborg räknar alla som bor i " +
      "Göteborg, oavsett var de arbetar."),
  );
  const nyckeltal = el("div", "ds-nyckeltal");
  for (const b of belagenheter) {
    const r = hamta(TOTAL, b.kod);
    const kpi = el("article", "ds-kpi");
    kpi.append(
      el("h3", null, `${b.namn}, alla branscher`),
      el("p", "ds-kpi-varde", formatTal(r?.varde)),
      forandringsrad(r?.forandring_manad, m.jamfor_manad_text),
      forandringsrad(r?.forandring_ar, m.jamfor_ar_text),
    );
    nyckeltal.append(kpi);
  }

  // --- Val ---
  const kort = el("div", "ds-kort urvalskort");
  const form = el("div", "ds-urval");
  form.append(
    segment("bransch-belagenhet", "Sysselsatta som", belagenheter,
      tillstand.belagenhet, (kod) => {
        tillstand.belagenhet = kod;
        rita();
      }),
    segment("bransch-visa", "Visa", visaAlternativ, tillstand.visa,
      (kod) => {
        tillstand.visa = kod;
        rita();
      }),
  );
  kort.append(form);

  // --- Diagram: branscherna sorterade, uppgift saknas sist ---
  const lista = meta.data.branscher.filter((b) => b.kod !== TOTAL);
  const rader = lista
    .map((b) => ({ b, rad: hamta(b.kod, belagenhet.kod) }))
    .sort((a, b) => {
      if (a.b.kod === SAKNAS) return 1;
      if (b.b.kod === SAKNAS) return -1;
      return (b.rad?.[visa.falt] ?? -Infinity) -
        (a.rad?.[visa.falt] ?? -Infinity);
    });

  const titel = arForandring
    ? `${belagenhet.namn}, ${visa.namn.toLowerCase()}, procent`
    : `${belagenhet.namn}, antal sysselsatta per bransch`;
  const diagramplats = el("div", "diagramplats");
  const delar = skapaDiagramkort(diagramplats, {
    titel,
    urvalstext: urvalsdelar.join(" · "),
    metatext: `Göteborg · ${m.senaste_text} · branscher enligt SNI 2007`,
    hjalptext: "För muspekaren över en stapel för att se antalet och " +
      "förändringarna. Hela branschnamnen och sysselsatta utan uppgift " +
      "om bransch finns i tabellen.",
    kalla: m.kalla,
    knappar: [{
      text: "Ladda ner",
      vidKlick: () => laddaNerCsv(`branscher_${m.senaste_manad}.csv`,
        ["Bransch", "Arbetar i Göteborg",
          `Förändring mot ${m.jamfor_ar_text} (procent)`,
          "Bor i Göteborg", `Förändring mot ${m.jamfor_ar_text} (procent)`],
        meta.data.branscher.map((b) => {
          const a = hamta(b.kod, "arbetsstalle");
          const s = hamta(b.kod, "bostad");
          return [b.namn, a?.varde, a?.forandring_ar, s?.varde,
            s?.forandring_ar];
        })),
    }],
  });
  avsnitt.append(nyckeltal, skapaKallrad(m.kalla), kort, diagramplats);
  element.append(avsnitt);

  // Uppgift saknas är en liten restgrupp vars procentförändring drar ut
  // skalan; den visas bara i tabellen
  stapeldiagram(delar, {
    vanstermarginal: 220,
    rader: rader.filter(({ b }) => b.kod !== SAKNAS).map(({ b, rad }) => ({
      namn: b.kort,
      varde: rad?.[visa.falt] ?? null,
      markerad: false,
      tips: [
        b.namn,
        `${formatTal(rad?.varde)} sysselsatta`,
        `${formatForandring(rad?.forandring_manad, "%")} mot ` +
          m.jamfor_manad_text,
        `${formatForandring(rad?.forandring_ar, "%")} mot ` +
          m.jamfor_ar_text,
      ],
    })),
    format: arForandring
      ? (v) => formatForandring(v, "%")
      : (v) => formatTal(v),
    axelformat: arForandring
      ? (v) => (v === 0 ? "0" : `${svenskLocale.format("+,~f")(v)} %`)
      : svenskLocale.format(",.0f"),
  });

  // Tabell: båda belägenheterna sida vid sida, totalen sist
  const tabell = el("table", "ds-tabell");
  const huvud = tabell.createTHead().insertRow();
  for (const [text, klass] of [["Bransch (SNI 2007)", null],
    ["Arbetar i Göteborg", "tal"], [`Mot ${m.jamfor_ar_text}`, "tal"],
    ["Bor i Göteborg", "tal"], [`Mot ${m.jamfor_ar_text}`, "tal"]]) {
    const th = el("th", klass, text);
    th.scope = "col";
    huvud.append(th);
  }
  const kropp = tabell.createTBody();
  const ordning = [...rader.map((x) => x.b),
    meta.data.branscher.find((b) => b.kod === TOTAL)];
  for (const b of ordning) {
    const a = hamta(b.kod, "arbetsstalle");
    const s = hamta(b.kod, "bostad");
    const rad = kropp.insertRow();
    if (b.kod === TOTAL) rad.className = "markerad";
    const th = el("th", null, b.kod === TOTAL ? "Alla branscher" : b.namn);
    th.scope = "row";
    rad.append(th,
      el("td", "tal", formatTal(a?.varde)),
      el("td", "tal", formatForandring(a?.forandring_ar, "%")),
      el("td", "tal", formatTal(s?.varde)),
      el("td", "tal", formatForandring(s?.forandring_ar, "%")));
  }
  delar.tabell.append(tabell);

  ritaBranschutveckling(avsnitt, {
    meta, bts, btsIndex, urval, urvalsdelar, belagenhet, rita,
    senaste: hamta(tillstand.tsBransch, belagenhet.kod),
    jamfor: branscher.meta,
  });
}

// --- Utveckling över tid för en bransch. Följer valet arbetar/bor i
// Göteborg ovanför stapeldiagrammet. ---
function ritaBranschutveckling(forfader, {
  meta, bts, btsIndex, urval, urvalsdelar, belagenhet, rita, senaste,
  jamfor,
}) {
  const m = bts.meta;
  const { manader } = bts.data;
  const manadsnamn = meta.data.manadsnamn;
  const kortManad = (text) => {
    const [manad, ar] = text.split(" ");
    return `${manad.slice(0, 3)} ${ar}`;
  };
  const bransch = meta.data.branscher
    .find((b) => b.kod === tillstand.tsBransch);

  const del = el("div", "underavsnitt");
  del.append(
    el("h3", null, "Utveckling över tid"),
    el("p", "avsnitt-text",
      `Sysselsatta i en bransch månad för månad från ${manadsnamn[0]}. ` +
      "Diagrammet följer valet av arbetar eller bor i Göteborg ovan."),
  );

  const kort = el("div", "ds-kort urvalskort");
  const falt = el("label", "ds-falt");
  const val = el("select");
  for (const b of meta.data.branscher) {
    const o = el("option", null, b.kod === TOTAL ? "Alla branscher" : b.kort);
    o.value = b.kod;
    o.selected = b.kod === tillstand.tsBransch;
    val.append(o);
  }
  val.addEventListener("change", () => {
    tillstand.tsBransch = val.value;
    rita();
    forfader.querySelector(".underavsnitt select")?.focus();
  });
  falt.append("Bransch", val);
  const form = el("div", "ds-urval");
  form.append(falt);
  kort.append(form);

  const serier = [{
    namn: belagenhet.namn,
    klass: "s1",
    varden: btsIndex.get([GOTEBORG, urval.kon, urval.fodelseregion,
      tillstand.tsBransch, belagenhet.kod].join("|")) ??
      manader.map(() => null),
  }];

  const branschnamn = bransch.kod === TOTAL ? "Alla branscher" : bransch.kort;
  const diagramplats = el("div", "diagramplats");
  const delar = skapaDiagramkort(diagramplats, {
    // "Arbetar i Göteborg" -> "arbetar i Göteborg" (bara första ordet)
    titel: `${branschnamn}, antal sysselsatta som ` +
      belagenhet.namn.replace(/^\S+/, (ord) => ord.toLowerCase()),
    urvalstext: urvalsdelar.join(" · "),
    metatext: `Göteborg · ${kortManad(manadsnamn[0])}–` +
      `${kortManad(manadsnamn.at(-1))}`,
    hjalptext: "För muspekaren över diagrammet, eller markera det och " +
      "använd vänster- och högerpil, för att se värdena för en månad.",
    kalla: m.kalla,
    knappar: [{
      text: "Ladda ner",
      vidKlick: () => laddaNerCsv(
        `bransch_${bransch.kod}_${belagenhet.kod}_tidsserie.csv`,
        ["Månad", ...serier.map((s) => s.namn)],
        manader.map((man, i) => [man, ...serier.map((s) => s.varden[i])])),
    }],
  });
  del.append(kort, diagramplats);
  forfader.append(del);

  // Förändringarna, färdiga från branscher.json
  laggTillNyckelrad(delar, [{
    namn: serier[0].namn,
    klass: serier[0].klass,
    forandringar: [
      { varde: formatForandring(senaste?.forandring_manad),
        text: `% mot ${jamfor.jamfor_manad_text}` },
      { varde: formatForandring(senaste?.forandring_ar),
        text: `% mot ${jamfor.jamfor_ar_text}` },
    ],
  }], `Senaste månaden, ${jamfor.senaste_text}`);

  linjediagram(delar, {
    manader,
    manadsnamn,
    serier,
    format: (v) => formatTal(v),
    axelformat: svenskLocale.format(",.0f"),
  });

  const tabell = el("table", "ds-tabell");
  const huvud = tabell.createTHead().insertRow();
  for (const [text, klass] of [["Månad", null],
    ...serier.map((s) => [s.namn, "tal"])]) {
    const th = el("th", klass, text);
    th.scope = "col";
    huvud.append(th);
  }
  const kropp = tabell.createTBody();
  for (let i = manader.length - 1; i >= 0; i--) {
    const rad = kropp.insertRow();
    const th = el("th", null, manadsnamn[i]);
    th.scope = "row";
    rad.append(th,
      ...serier.map((s) => el("td", "tal", formatTal(s.varden[i]))));
  }
  delar.tabell.append(tabell);
}

// Uppslag för bransch_tidsserier.json: region|kön|födelseregion|
// bransch|belägenhet -> värden per månad
export function indexeraBranschserier(serier) {
  const index = new Map();
  for (const s of serier) {
    index.set([s.region, s.kon, s.fodelseregion, s.bransch, s.belagenhet]
      .join("|"), s.varden);
  }
  return index;
}
