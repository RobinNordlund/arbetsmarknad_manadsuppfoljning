// Översikt: senaste månaden för Göteborg, jämförelse med Stockholm,
// Malmö och riket samt befolkningen efter arbetsmarknadsstatus.
// Alla siffror och förändringar kommer färdiga från oversikt.json;
// här slås de bara upp och formateras. Klasserna kommer från Robins
// designsystem (komponenter.css).

import { skapaKallrad } from "../components/kallrad.js";
import { formatTal, formatProcent, formatForandring } from "../format.js";

const GOTEBORG = "1480";
const JAMFOR = ["1480", "0180", "1280", "00"];

// Bygger ett uppslag på region, kön, födelseregion, ålder och mått
export function indexeraOversikt(rader) {
  const index = new Map();
  for (const r of rader) {
    index.set(nyckel(r.region, r.kon, r.fodelseregion, r.alder, r.matt), r);
  }
  return index;
}

function nyckel(region, kon, fodelseregion, alder, matt) {
  return [region, kon, fodelseregion, alder, matt].join("|");
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

// Rubrik på bakgrunden och kort med innehållet under
function avsnitt(rubrik, underrubrik) {
  const s = el("section", "avsnitt");
  s.append(el("h2", null, rubrik), el("p", "avsnitt-text", underrubrik));
  return s;
}

// "<b>+0,2</b> procentenheter mot juli 2026"
function forandringsrad(varde, enhet, mot) {
  const p = el("p", "ds-forandring");
  p.append(el("b", null, formatForandring(varde)), ` ${enhet} mot ${mot}`);
  return p;
}

// Tabellcell med värde och förändring mot året under
function talcell(varde, forandring, enhet) {
  const td = el("td", "tal");
  td.append(
    el("span", "cellvarde", varde),
    el("span", "cellforandring", `${formatForandring(forandring)} ${enhet}`),
  );
  return td;
}

// Ritar vyn i element. urval = { alder, kon, fodelseregion }
export function ritaOversikt(element, { meta, oversikt, index, urval }) {
  const m = oversikt.meta;
  const hamta = (region, matt) => index.get(
    nyckel(region, urval.kon, urval.fodelseregion, urval.alder, matt));

  const mattForAlder = meta.data.matt
    .filter((x) => x.aldrar.includes(urval.alder));
  const andelar = mattForAlder.filter((x) => x.typ === "andel");
  const antal = mattForAlder.filter((x) => x.typ === "antal");
  const saknas = meta.data.matt
    .filter((x) => !x.aldrar.includes(urval.alder));
  const regionnamn = (kod) => meta.data.regioner
    .find((x) => x.region_kod === kod)?.region ?? kod;

  // T.ex. "20–64 år, kvinnor och män, inrikes och utrikes födda"
  const urvalstext = [
    namn(meta.data.alder, urval.alder),
    urval.kon === "1+2" ? "kvinnor och män"
      : namn(meta.data.kon, urval.kon).toLowerCase(),
    urval.fodelseregion === "tot" ? "inrikes och utrikes födda"
      : namn(meta.data.fodelseregion, urval.fodelseregion).toLowerCase(),
  ].join(", ");

  element.replaceChildren();

  // --- Nyckeltal för Göteborg ---
  const sektion1 = avsnitt(`Göteborg i ${m.senaste_text}`,
    `Andel i procent, ${urvalstext}.`);
  const kort = el("div", "ds-nyckeltal");
  for (const matt of andelar) {
    const r = hamta(GOTEBORG, matt.kod);
    const k = el("article", "ds-kpi");
    k.append(
      el("h3", null, matt.namn),
      el("p", "ds-kpi-varde", formatProcent(r?.varde)),
      forandringsrad(r?.forandring_manad, "procentenheter",
        m.jamfor_manad_text),
      forandringsrad(r?.forandring_ar, "procentenheter", m.jamfor_ar_text),
    );
    kort.append(k);
  }
  sektion1.append(kort, skapaKallrad(m.kalla));

  // --- Jämförelse med Stockholm, Malmö och riket ---
  const sektion2 = avsnitt("Jämfört med Stockholm, Malmö och riket",
    `Andel i procent, ${urvalstext}, ${m.senaste_text}. Under värdet: ` +
    `förändring i procentenheter mot ${m.jamfor_ar_text}.`);
  const kort2 = el("div", "ds-kort");
  const tabell = el("table", "ds-tabell");
  const huvud = tabell.createTHead().insertRow();
  const hornCell = el("th", null, "Region");
  hornCell.scope = "col";
  huvud.append(hornCell);
  for (const matt of andelar) {
    const th = el("th", "tal", matt.namn);
    th.scope = "col";
    huvud.append(th);
  }
  const kropp = tabell.createTBody();
  for (const region of JAMFOR) {
    const rad = kropp.insertRow();
    if (region === GOTEBORG) rad.className = "markerad";
    const th = el("th", null, regionnamn(region));
    th.scope = "row";
    rad.append(th);
    for (const matt of andelar) {
      const r = hamta(region, matt.kod);
      rad.append(talcell(formatProcent(r?.varde), r?.forandring_ar, "p.e."));
    }
  }
  kort2.append(el("div", "tabellrulle", undefined), skapaKallrad(m.kalla));
  kort2.firstChild.append(tabell);
  sektion2.append(kort2);

  // --- Befolkningen efter status ---
  const sektion3 = avsnitt(
    "Befolkningen i Göteborg efter arbetsmarknadsstatus",
    `Antal personer, ${urvalstext}, ${m.senaste_text}. Förändring i ` +
    "procent. Förändringen mot föregående månad påverkas av säsong, " +
    "särskilt för studerande.");
  const kort3 = el("div", "ds-kort");
  const tabell2 = el("table", "ds-tabell");
  const huvud2 = tabell2.createTHead().insertRow();
  for (const [text, klass] of [
    ["Status", null], ["Antal", "tal"],
    [`Mot ${m.jamfor_manad_text}`, "tal"], [`Mot ${m.jamfor_ar_text}`, "tal"],
  ]) {
    const th = el("th", klass, text);
    th.scope = "col";
    huvud2.append(th);
  }
  const kropp2 = tabell2.createTBody();
  for (const matt of antal) {
    const r = hamta(GOTEBORG, matt.kod);
    const rad = kropp2.insertRow();
    // Arbetskraften (sysselsatta + arbetslösa) och befolkningen är
    // summor och markeras med fet stil
    if (["arbetskraften", "totalt"].includes(matt.kod)) {
      rad.className = "markerad";
    }
    const th = el("th", null, matt.namn);
    th.scope = "row";
    rad.append(
      th,
      el("td", "tal", formatTal(r?.varde)),
      el("td", "tal", formatForandring(r?.forandring_manad, "%")),
      el("td", "tal", formatForandring(r?.forandring_ar, "%")),
    );
  }
  kort3.append(el("div", "tabellrulle"), skapaKallrad(m.kalla));
  kort3.firstChild.append(tabell2);
  sektion3.append(kort3);

  element.append(sektion1, sektion2, sektion3);

  // --- Mått som inte redovisas för åldersgruppen ---
  if (saknas.length > 0) {
    const namnlista = saknas.map((x) => x.namn.toLowerCase()).join(", ");
    element.append(el("p", "ds-notis fotnot",
      `För ${namn(meta.data.alder, urval.alder)} redovisas inte ` +
      `${namnlista}. SCB redovisar inte arbetslösa och arbetskraften för ` +
      "åldrarna, och därmed inte heller arbetslöshet eller " +
      "arbetskraftsdeltagande. Studerande är 0 i hela statistiken för " +
      "åldrarna och visas inte."));
  }
}
