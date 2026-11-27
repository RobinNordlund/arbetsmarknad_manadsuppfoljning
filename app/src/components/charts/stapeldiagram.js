// Liggande stapeldiagram enligt Robins designsystem, t.ex. alla
// regioner för ett mått. Staplarna börjar alltid på noll; negativa
// värden (förändringar) går åt vänster från nollinjen. Färger kommer
// från klasserna .stapel och .stapel.markerad i styles.css, så
// diagrammet byter tema utan att ritas om.
//
// stapeldiagram({ svg, figur }, {
//   rader: [{ namn, varde, markerad, tips: ["rad 1", ...] }],  // i ordning
//   format: formatProcent,        // värdeetiketter vid staplarna
//   axelformat: (v) => "...",     // x-axelns etiketter
//   referens: { text, varde },    // valfri lodrät linje, t.ex. riket
//   vanstermarginal: 112,         // plats för namnen till vänster
// })

import {
  select, scaleLinear, scaleBand, axisTop, min, max,
} from "../../d3.js";
import { BREDD, skapaTips } from "./gemensamt.js";

const STANDARD = { top: 32, right: 64, bottom: 28, left: 112 };
const RADHOJD = 22;

export function stapeldiagram({ svg, figur }, alternativ) {
  const {
    rader, format, axelformat, referens = null, vanstermarginal = 112,
  } = alternativ;
  const MARGINAL = { ...STANDARD, left: vanstermarginal };
  const hojd = MARGINAL.top + rader.length * RADHOJD + MARGINAL.bottom;
  svg.setAttribute("viewBox", `0 0 ${BREDD} ${hojd}`);
  const rot = select(svg);
  rot.selectAll("*").remove();

  const varden = rader.map((r) => r.varde).filter((v) => v !== null);
  if (referens) varden.push(referens.varde);
  // Negativa staplar får sin värdeetikett till vänster; lämna plats för
  // den så att den inte krockar med regionnamnen
  const minsta = Math.min(0, min(varden));
  const x = scaleLinear()
    .domain([minsta, Math.max(0, max(varden))]).nice()
    .range([MARGINAL.left + (minsta < 0 ? 48 : 0), BREDD - MARGINAL.right]);
  const y = scaleBand()
    .domain(rader.map((r) => r.namn))
    .range([MARGINAL.top, hojd - MARGINAL.bottom])
    .padding(0.25);

  // Rutnät (lodrätt eftersom staplarna ligger) och axeletiketter överst
  rot.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${MARGINAL.top})`)
    .call(axisTop(x).ticks(5).tickFormat(axelformat)
      .tickSize(-(hojd - MARGINAL.top - MARGINAL.bottom)).tickPadding(8))
    .call((g) => g.select(".domain").remove());

  // Staplarna, från noll
  const tips = skapaTips(figur);
  const staplar = rot.append("g");
  for (const r of rader) {
    if (r.varde === null) continue;
    const g = staplar.append("g").attr("class", "stapelrad");
    g.append("rect")
      .attr("class", r.markerad ? "stapel markerad" : "stapel")
      .attr("x", Math.min(x(0), x(r.varde)))
      .attr("y", y(r.namn))
      .attr("width", Math.abs(x(r.varde) - x(0)))
      .attr("height", y.bandwidth());

    // Värdet vid stapelns ände
    const negativ = r.varde < 0;
    g.append("text")
      .attr("class", r.markerad ? "varde markerad" : "varde")
      .attr("x", x(r.varde) + (negativ ? -6 : 6))
      .attr("y", y(r.namn) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", negativ ? "end" : "start")
      .text(format(r.varde));

    // Hela raden reagerar på muspekaren, inte bara stapeln
    g.append("rect")
      .attr("class", "traffyta")
      .attr("x", 0).attr("width", BREDD)
      .attr("y", y(r.namn) - (y.step() - y.bandwidth()) / 2)
      .attr("height", y.step())
      .on("pointermove", (h) => {
        const rubrik = document.createElement("strong");
        rubrik.textContent = r.namn;
        const delar = r.tips.map((t) => {
          const d = document.createElement("div");
          d.textContent = t;
          return d;
        });
        const ruta = figur.getBoundingClientRect();
        tips.visa([rubrik, ...delar], h.clientX - ruta.left,
          h.clientY - ruta.top + 12);
      })
      .on("pointerleave", () => tips.dolj());
  }

  // Nollinje när det finns negativa värden
  if (x.domain()[0] < 0) {
    rot.append("line").attr("class", "nollinje")
      .attr("x1", x(0)).attr("x2", x(0))
      .attr("y1", MARGINAL.top).attr("y2", hojd - MARGINAL.bottom);
  }

  // Regionnamn till vänster
  rot.append("g").selectAll("text")
    .data(rader)
    .join("text")
    .attr("class", (r) => r.markerad ? "etikett markerad" : "etikett")
    .attr("x", MARGINAL.left - 8)
    .attr("y", (r) => y(r.namn) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .text((r) => r.namn);

  // Referenslinje, t.ex. riket
  if (referens) {
    rot.append("line").attr("class", "referens")
      .attr("x1", x(referens.varde)).attr("x2", x(referens.varde))
      .attr("y1", MARGINAL.top - 4).attr("y2", hojd - MARGINAL.bottom);
    rot.append("text").attr("class", "referens-text")
      .attr("x", x(referens.varde) + 4)
      .attr("y", hojd - 8)
      .text(referens.text);
  }
}
