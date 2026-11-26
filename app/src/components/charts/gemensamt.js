// Gemensamma delar för alla diagram: ram med rubrik och källrad,
// verktygstips och standardmått.

import { select } from "../../d3.js";
import { skapaKallrad } from "../kallrad.js";
import { diagram } from "../../theme.js";

// Diagrammen ritas i ett fast koordinatsystem och skalas med CSS.
export const BREDD = 640;

// Skapar <figure> med rubrik, underrubrik, svg och källrad.
// Returnerar d3-urval för svg och för figuren.
export function skapaFigur(element, { titel, underrubrik, kalla, hojd }) {
  const figur = select(element).append("figure").attr("class", "diagram");

  if (titel) figur.append("h3").text(titel);
  if (underrubrik) figur.append("p").attr("class", "underrubrik")
    .text(underrubrik);

  const svg = figur.append("svg")
    .attr("viewBox", `0 0 ${BREDD} ${hojd ?? diagram.hojd}`)
    .attr("role", "img")
    .attr("aria-label", titel ?? "");

  figur.node().append(skapaKallrad(kalla));
  return { figur, svg };
}

// Verktygstips som följer muspekaren. Ett per sida räcker.
let tips = null;
export function visaTips(handelse, html) {
  if (!tips) {
    tips = select("body").append("div").attr("class", "tips")
      .attr("role", "tooltip");
  }
  tips.html(html)
    .style("left", `${handelse.pageX + 12}px`)
    .style("top", `${handelse.pageY + 12}px`)
    .style("display", "block");
}
export function doljTips() {
  if (tips) tips.style("display", "none");
}

// Escapar text som sätts in i verktygstips
export function text(varde) {
  return String(varde)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
