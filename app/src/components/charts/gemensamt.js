// Gemensamma delar för alla diagram enligt Robins designsystem:
// diagramkort (figure.ds-diagram) med rubrik, urval, verktyg, meta,
// svg.ds-plot, hjälptext, källrad och utfällbar tabell.
// Inga färger sätts här; de kommer från klasserna i komponenter.css.

import { skapaKallrad } from "../kallrad.js";

// Diagrammen ritas i ett fast koordinatsystem och skalas med CSS
export const BREDD = 760;
export const HOJD = 320;

function el(tagg, klass, text) {
  const e = document.createElement(tagg);
  if (klass) e.className = klass;
  if (text !== undefined) e.textContent = text;
  return e;
}

// Skapar diagramkortet. knappar = [{ text, vidKlick }].
// Returnerar delarna som diagrammet och vyn fyller.
export function skapaDiagramkort(element, {
  titel, urvalstext, metatext, kalla, hjalptext, knappar = [],
  tabelltitel = "Visa värden i tabell",
}) {
  const figur = el("figure", "ds-diagram");
  figur.style.position = "relative";

  const huvud = el("div", "ds-diagram-huvud");
  const rubrik = el("div");
  rubrik.append(el("h3", null, titel));
  if (urvalstext) rubrik.append(el("p", "ds-diagram-urval", urvalstext));
  huvud.append(rubrik);
  if (knappar.length > 0) {
    const grupp = el("div", "ds-knappgrupp");
    for (const k of knappar) {
      const knapp = el("button", "ds-knapp", k.text);
      knapp.type = "button";
      knapp.addEventListener("click", k.vidKlick);
      grupp.append(knapp);
    }
    huvud.append(grupp);
  }
  figur.append(huvud);
  if (metatext) figur.append(el("p", "ds-diagram-meta", metatext));

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "ds-plot");
  svg.setAttribute("viewBox", `0 0 ${BREDD} ${HOJD}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", titel);
  figur.append(svg);

  if (hjalptext) figur.append(el("p", "ds-diagram-meta hjalptext", hjalptext));
  figur.append(skapaKallrad(kalla));

  const utfallbar = el("details", "ds-utfallbar");
  const tabell = el("div", "tabellrulle");
  utfallbar.append(el("summary", null, tabelltitel), tabell);
  figur.append(utfallbar);

  element.append(figur);
  return { figur, svg, tabell };
}

// Diskret rad med förändringarna för varje serie (mot föregående månad
// och samma månad föregående år),
// mellan metaraden och diagrammet. Allt kommer färdigformaterat.
// serier = [{ namn, klass: "s1",
//             forandringar: [{ varde: "+0,2", text: "p.e. mot juli 2026" }] }]
export function laggTillNyckelrad({ figur, svg }, serier, rubrik) {
  const rad = el("div", "nyckelrad");
  rad.setAttribute("role", "group");
  rad.setAttribute("aria-label", rubrik);
  for (const s of serier) {
    const del = el("div", "nyckelrad-serie");
    const namn = el("p", "nyckelrad-namn");
    namn.append(el("span", `nyckelrad-markor ${s.klass}`), s.namn);
    namn.firstChild.setAttribute("aria-hidden", "true");
    del.append(namn);
    for (const f of s.forandringar) {
      const p = el("p", "nyckelrad-forandring");
      p.append(el("b", null, f.varde), ` ${f.text}`);
      del.append(p);
    }
    rad.append(del);
  }
  figur.insertBefore(rad, svg);
}

// Verktygstips inuti diagramkortet (div.ds-tips)
export function skapaTips(figur) {
  const tips = el("div", "ds-tips");
  tips.setAttribute("role", "tooltip");
  tips.hidden = true;
  figur.append(tips);
  return {
    visa(innehall, x, y) {
      tips.replaceChildren(...innehall);
      tips.hidden = false;
      // Placera till höger om punkten, eller till vänster nära kanten
      const bredd = tips.offsetWidth;
      const vanster = x + 16 + bredd > figur.clientWidth
        ? x - 16 - bredd : x + 16;
      tips.style.left = `${Math.max(0, vanster)}px`;
      tips.style.top = `${y}px`;
    },
    dolj() {
      tips.hidden = true;
    },
  };
}

// Laddar ner rader som CSV (semikolon, decimalkomma, som Excel vill ha)
export function laddaNerCsv(filnamn, rubriker, rader) {
  const cell = (v) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "number" ? String(v).replace(".", ",") : String(v);
    return /[;"\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const text = [rubriker, ...rader]
    .map((rad) => rad.map(cell).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
  const lank = document.createElement("a");
  lank.href = URL.createObjectURL(blob);
  lank.download = filnamn;
  lank.click();
  URL.revokeObjectURL(lank.href);
}
