// Utveckling över tid: ett mått månad för månad sedan 2020M01.
// Göteborg visas alltid och fler regioner kan läggas till (högst fyra
// linjer, designsystemets gräns i mörkt tema). Riket och SKR:s större
// städer kan bara läggas till för andelar; för antal finns Stockholm
// och Malmö (beslut 2026-11-27). Alla värden kommer färdiga från
// tidsserier.json.

import { linjediagram } from "../components/charts/linjediagram.js";
import {
  skapaDiagramkort, laddaNerCsv, laggTillNyckelrad, zoomknapp, ZOOMTEXT,
} from "../components/charts/gemensamt.js";
import {
  formatTal, formatProcent, formatForandring, svenskLocale,
} from "../format.js";

const GOTEBORG = "1480";
const MAX_REGIONER = 4;
const ANTAL_REGIONER = ["1480", "0180", "1280"];

// Valen lever kvar när det gemensamma urvalet ändras
const tillstand = {
  matt: "arbetsloshet", regioner: [GOTEBORG], zoom: false,
};

// Bygger ett uppslag på region, kön, födelseregion, ålder och mått
export function indexeraTidsserier(serier) {
  const index = new Map();
  for (const s of serier) {
    index.set([s.region, s.kon, s.fodelseregion, s.alder, s.matt].join("|"),
      s.varden);
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

// Kort månadsnamn: "januari 2020" -> "jan 2020"
function kortManad(text) {
  const [manad, ar] = text.split(" ");
  return `${manad.slice(0, 3)} ${ar}`;
}

export function ritaUtveckling(element, {
  meta, tidsserier, index, oversikt, oversiktIndex, urval,
}) {
  const m = tidsserier.meta;
  const { manader } = tidsserier.data;
  const manadsnamn = meta.data.manadsnamn;
  const regioner = meta.data.regioner;
  const regionnamn = (kod) =>
    regioner.find((x) => x.region_kod === kod)?.region ?? kod;

  // Mått som finns för vald ålder; byt till första om valt saknas
  const mattLista = meta.data.matt
    .filter((x) => x.aldrar.includes(urval.alder));
  if (!mattLista.some((x) => x.kod === tillstand.matt)) {
    tillstand.matt = mattLista[0].kod;
  }
  const matt = mattLista.find((x) => x.kod === tillstand.matt);
  const arAndel = matt.typ === "andel";

  // Regioner som går att välja för måttet
  const tillatna = arAndel
    ? regioner.map((x) => x.region_kod) : ANTAL_REGIONER;
  tillstand.regioner = tillstand.regioner
    .filter((kod) => tillatna.includes(kod));

  const rita = () => ritaUtveckling(element,
    { meta, tidsserier, index, oversikt, oversiktIndex, urval });

  element.replaceChildren();

  // --- Rubrik ---
  const avsnitt = el("section", "avsnitt");
  avsnitt.append(
    el("h2", null, "Utveckling över tid"),
    el("p", "avsnitt-text",
      `Månad för månad från ${manadsnamn[0]} till ${m.senaste_text}. ` +
      "Göteborg visas alltid. Lägg till upp till tre regioner att " +
      "jämföra med."),
  );

  // --- Val av mått och regioner ---
  const kort = el("div", "ds-kort urvalskort");
  const form = el("form", "ds-urval");
  form.addEventListener("submit", (h) => h.preventDefault());

  const mattFalt = el("label", "ds-falt");
  const mattVal = el("select");
  for (const [typ, rubrik] of [["andel", "Andelar"], ["antal", "Antal"]]) {
    const grupp = el("optgroup");
    grupp.label = rubrik;
    for (const x of mattLista.filter((x) => x.typ === typ)) {
      const o = el("option", null, x.namn);
      o.value = x.kod;
      o.selected = x.kod === tillstand.matt;
      grupp.append(o);
    }
    if (grupp.children.length > 0) mattVal.append(grupp);
  }
  mattVal.addEventListener("change", () => {
    tillstand.matt = mattVal.value;
    rita();
  });
  mattFalt.append("Mått", mattVal);

  const regionFalt = el("label", "ds-falt");
  const regionVal = el("select");
  const fullt = tillstand.regioner.length >= MAX_REGIONER;
  const forsta = el("option", null,
    fullt ? "Högst fyra regioner" : "Välj region …");
  forsta.value = "";
  regionVal.append(forsta);
  regionVal.disabled = fullt;
  for (const grupp of ["Riket", "Storstad", "Större stad"]) {
    const og = el("optgroup");
    og.label = grupp === "Storstad" ? "Storstäder"
      : grupp === "Större stad" ? "Större städer (SKR)" : "Riket";
    regioner
      .filter((x) => x.grupp === grupp && tillatna.includes(x.region_kod) &&
        !tillstand.regioner.includes(x.region_kod))
      .sort((a, b) => a.region.localeCompare(b.region, "sv"))
      .forEach((x) => {
        const o = el("option", null, x.region);
        o.value = x.region_kod;
        og.append(o);
      });
    if (og.children.length > 0) regionVal.append(og);
  }
  regionVal.addEventListener("change", () => {
    if (!regionVal.value) return;
    tillstand.regioner.push(regionVal.value);
    rita();
    element.querySelector(".valda-regioner button:last-child")?.focus();
  });
  regionFalt.append("Lägg till region", regionVal);

  form.append(mattFalt, regionFalt);

  // Valda regioner som knappar; Göteborg går inte att ta bort
  const valda = el("div", "valda-regioner");
  valda.setAttribute("aria-label", "Valda regioner");
  for (const kod of tillstand.regioner) {
    if (kod === GOTEBORG) {
      valda.append(el("span", "region-markering", regionnamn(kod)));
      continue;
    }
    const knapp = el("button", "ds-knapp", `${regionnamn(kod)} ✕`);
    knapp.type = "button";
    knapp.setAttribute("aria-label", `Ta bort ${regionnamn(kod)}`);
    knapp.addEventListener("click", () => {
      tillstand.regioner = tillstand.regioner.filter((x) => x !== kod);
      rita();
      element.querySelector(".ds-falt select:not([disabled])")?.focus();
    });
    valda.append(knapp);
  }
  kort.append(form, valda);
  if (!arAndel) {
    kort.append(el("p", "urvalstips",
      "För antal kan Stockholm och Malmö läggas till. Välj en andel för " +
      "att jämföra med riket och de större städerna."));
  }

  // --- Diagram ---
  const serier = tillstand.regioner.map((kod, i) => ({
    kod,
    namn: regionnamn(kod),
    klass: `s${i + 1}`,
    varden: index.get([kod, urval.kon, urval.fodelseregion, urval.alder,
      matt.kod].join("|")) ?? manader.map(() => null),
  }));
  const format = arAndel ? formatProcent : formatTal;
  const urvalstext = [
    `Ålder: ${namn(meta.data.alder, urval.alder)}`,
    namn(meta.data.kon, urval.kon) === "Totalt" ? "Kvinnor och män"
      : namn(meta.data.kon, urval.kon),
    urval.fodelseregion === "tot" ? "Inrikes och utrikes födda"
      : namn(meta.data.fodelseregion, urval.fodelseregion),
  ].join(" · ");
  const period = `${kortManad(manadsnamn[0])}–` +
    `${kortManad(manadsnamn.at(-1))}`;

  const diagramplats = el("div", "diagramplats");
  const delar = skapaDiagramkort(diagramplats, {
    titel: arAndel ? `${matt.namn}, procent` : `${matt.namn}, antal personer`,
    urvalstext,
    metatext: `${serier.map((s) => s.namn).join(", ")} · ${period}` +
      (tillstand.zoom ? ` · ${ZOOMTEXT}` : ""),
    hjalptext: "För muspekaren över diagrammet, eller markera det och " +
      "använd vänster- och högerpil, för att se värdena för en månad.",
    kalla: m.kalla,
    knappar: [zoomknapp(tillstand.zoom, (z) => {
      tillstand.zoom = z;
      rita();
    }), {
      text: "Ladda ner",
      vidKlick: () => laddaNerCsv(`${matt.kod}_${urval.alder}.csv`,
        ["Månad", ...serier.map((s) => s.namn)],
        manader.map((man, i) => [man, ...serier.map((s) => s.varden[i])])),
    }],
  });

  avsnitt.append(kort, diagramplats);
  element.append(avsnitt);

  // Förändringarna per region, färdiga från
  // oversikt.json (procentenheter för andelar, procent för antal)
  const om = oversikt.meta;
  const enhet = arAndel ? "p.e." : "%";
  laggTillNyckelrad(delar, serier.map((s) => {
    const r = oversiktIndex.get([s.kod, urval.kon, urval.fodelseregion,
      urval.alder, matt.kod].join("|"));
    return {
      namn: s.namn,
      klass: s.klass,
      forandringar: [
        { varde: formatForandring(r?.forandring_manad),
          text: `${enhet} mot ${om.jamfor_manad_text}` },
        { varde: formatForandring(r?.forandring_ar),
          text: `${enhet} mot ${om.jamfor_ar_text}` },
      ],
    };
  }), `Senaste månaden, ${om.senaste_text}`);

  linjediagram(delar, {
    manader,
    manadsnamn,
    serier,
    format,
    zoom: tillstand.zoom,
    axelformat: arAndel
      ? (v) => `${svenskLocale.format(",~f")(v)} %`
      : svenskLocale.format(",.0f"),
  });

  // Tabell med värdena, senaste månaden först
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
      ...serier.map((s) => el("td", "tal", format(s.varden[i]))));
  }
  delar.tabell.append(tabell);
}
