// Jämförelse mellan kommuner: ett mått för de 26 kommunerna senaste
// månaden, sorterat, med Göteborg markerad och riket som referenslinje.
// Bara andelar jämförs, eftersom kommunerna är olika stora. Värden och
// förändringar kommer färdiga från oversikt.json (senaste månaden för
// alla regioner); här sorteras och formateras de bara.

import { stapeldiagram } from "../components/charts/stapeldiagram.js";
import {
  skapaDiagramkort, laddaNerCsv,
} from "../components/charts/gemensamt.js";
import { formatProcent, formatForandring, svenskLocale } from "../format.js";

const GOTEBORG = "1480";
const RIKET = "00";

// Valen lever kvar när det gemensamma urvalet ändras
const tillstand = { matt: "arbetsloshet", visa: "varde" };

function el(tagg, klass, text) {
  const e = document.createElement(tagg);
  if (klass) e.className = klass;
  if (text !== undefined) e.textContent = text;
  return e;
}

function namn(lista, kod) {
  return lista.find((x) => x.kod === kod)?.namn ?? kod;
}

// Segmentknappar med aria-pressed
function segment(etikett, alternativ, valt, vidVal) {
  const falt = el("div", "ds-falt");
  const rubrik = el("span", null, etikett);
  rubrik.id = `jamf-${etikett.toLowerCase().replace(/\W+/g, "-")}`;
  const grupp = el("div", "ds-segment");
  grupp.setAttribute("role", "group");
  grupp.setAttribute("aria-labelledby", rubrik.id);
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

export function ritaJamforelse(element, { meta, oversikt, index, urval }) {
  const m = oversikt.meta;
  const hamta = (region, matt) => index.get([region, urval.kon,
    urval.fodelseregion, urval.alder, matt].join("|"));

  // Andelar som finns för vald ålder
  const mattLista = meta.data.matt
    .filter((x) => x.typ === "andel" && x.aldrar.includes(urval.alder));
  if (!mattLista.some((x) => x.kod === tillstand.matt)) {
    tillstand.matt = mattLista[0].kod;
  }
  const matt = mattLista.find((x) => x.kod === tillstand.matt);

  const visaAlternativ = [
    { kod: "varde", namn: "Andel", falt: "varde" },
    { kod: "manad", namn: `Förändring mot ${m.jamfor_manad_text}`,
      falt: "forandring_manad" },
    { kod: "ar", namn: `Förändring mot ${m.jamfor_ar_text}`,
      falt: "forandring_ar" },
  ];
  const visa = visaAlternativ.find((x) => x.kod === tillstand.visa);
  const arForandring = visa.kod !== "varde";
  const format = arForandring
    ? (v) => formatForandring(v)
    : formatProcent;

  const rita = () => ritaJamforelse(element,
    { meta, oversikt, index, urval });

  // Kommunerna sorterade efter visat värde, högst först
  const kommuner = meta.data.regioner
    .filter((x) => x.region_kod !== RIKET)
    .map((x) => ({ kod: x.region_kod, namn: x.region,
      rad: hamta(x.region_kod, matt.kod) }))
    .sort((a, b) => (b.rad?.[visa.falt] ?? -Infinity) -
      (a.rad?.[visa.falt] ?? -Infinity));
  const riket = hamta(RIKET, matt.kod);

  element.replaceChildren();

  const avsnitt = el("section", "avsnitt");
  avsnitt.append(
    el("h2", null, "Jämförelse mellan kommuner"),
    el("p", "avsnitt-text",
      `Göteborg, Stockholm, Malmö och SKR:s 23 större städer i ` +
      `${m.senaste_text}, sorterade från högst till lägst. Den streckade ` +
      "linjen visar riket."),
  );

  // --- Val av mått och visning ---
  const kort = el("div", "ds-kort urvalskort");
  const form = el("div", "ds-urval");
  form.append(
    segment("Mått", mattLista, tillstand.matt, (kod) => {
      tillstand.matt = kod;
      rita();
    }),
    segment("Visa", visaAlternativ, tillstand.visa, (kod) => {
      tillstand.visa = kod;
      rita();
    }),
  );
  kort.append(form);

  // --- Diagram ---
  const urvalstext = [
    `Ålder: ${namn(meta.data.alder, urval.alder)}`,
    urval.kon === "1+2" ? "Kvinnor och män" : namn(meta.data.kon, urval.kon),
    urval.fodelseregion === "tot" ? "Inrikes och utrikes födda"
      : namn(meta.data.fodelseregion, urval.fodelseregion),
  ].join(" · ");
  const titel = arForandring
    ? `${matt.namn}, ${visa.namn.toLowerCase()}, procentenheter`
    : `${matt.namn}, procent`;

  const diagramplats = el("div", "diagramplats");
  const delar = skapaDiagramkort(diagramplats, {
    titel,
    urvalstext,
    metatext: `26 kommuner · ${m.senaste_text}`,
    hjalptext: "För muspekaren över en stapel för att se värdet och " +
      "förändringarna. Alla värden finns i tabellen under diagrammet.",
    kalla: m.kalla,
    knappar: [{
      text: "Ladda ner",
      vidKlick: () => laddaNerCsv(
        `${matt.kod}_${m.senaste_manad}_${urval.alder}.csv`,
        ["Region", "Andel (procent)",
          `Förändring mot ${m.jamfor_manad_text} (procentenheter)`,
          `Förändring mot ${m.jamfor_ar_text} (procentenheter)`],
        [...kommuner, { namn: "Riket", rad: riket }].map((k) => [k.namn,
          k.rad?.varde, k.rad?.forandring_manad, k.rad?.forandring_ar])),
    }],
  });
  avsnitt.append(kort, diagramplats);
  element.append(avsnitt);

  const pe = "procentenheter";
  stapeldiagram(delar, {
    rader: kommuner.map((k) => ({
      namn: k.namn,
      varde: k.rad?.[visa.falt] ?? null,
      markerad: k.kod === GOTEBORG,
      tips: [
        `${matt.namn}: ${formatProcent(k.rad?.varde)}`,
        `${formatForandring(k.rad?.forandring_manad, pe)} mot ` +
          m.jamfor_manad_text,
        `${formatForandring(k.rad?.forandring_ar, pe)} mot ` +
          m.jamfor_ar_text,
      ],
    })),
    format,
    axelformat: arForandring
      ? (v) => (v === 0 ? "0" : svenskLocale.format("+,~f")(v))
      : (v) => `${svenskLocale.format(",~f")(v)} %`,
    referens: riket?.[visa.falt] === null || riket === undefined ? null : {
      text: `Riket ${format(riket[visa.falt])}`,
      varde: riket[visa.falt],
    },
  });

  // Tabell i samma ordning som diagrammet, riket sist
  const tabell = el("table", "ds-tabell");
  const huvud = tabell.createTHead().insertRow();
  for (const [text, klass] of [["Region", null], ["Andel", "tal"],
    [`Mot ${m.jamfor_manad_text}`, "tal"],
    [`Mot ${m.jamfor_ar_text}`, "tal"]]) {
    const th = el("th", klass, text);
    th.scope = "col";
    huvud.append(th);
  }
  const kropp = tabell.createTBody();
  for (const k of [...kommuner, { kod: RIKET, namn: "Riket", rad: riket }]) {
    const rad = kropp.insertRow();
    if (k.kod === GOTEBORG) rad.className = "markerad";
    const th = el("th", null, k.namn);
    th.scope = "row";
    rad.append(th,
      el("td", "tal", formatProcent(k.rad?.varde)),
      el("td", "tal", formatForandring(k.rad?.forandring_manad, "p.e.")),
      el("td", "tal", formatForandring(k.rad?.forandring_ar, "p.e.")));
  }
  delar.tabell.append(tabell);
}
