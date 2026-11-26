// Liggande stapeldiagram för att jämföra värden mellan kategorier.
// Startar alltid på noll (grafiska profilen). Värdet skrivs vid stapeln.
//
// stapeldiagram(element, {
//   data,                    // rader från JSON
//   kategori: "namn",        // kolumn med kategorinamn
//   varde: "folkmangd",      // kolumn med värde (inga negativa)
//   titel, underrubrik, kalla,
//   format: formatTal,       // format för värdeetiketter
//   sortera: true,           // största först
//   farg: farger.morkbla,
// })

import { scaleLinear, scaleBand, axisLeft, max } from "../../d3.js";
import { farger, diagram, typsnitt } from "../../theme.js";
import { formatTal } from "../../format.js";
import { BREDD, skapaFigur } from "./gemensamt.js";

const RADHOJD = 36;

export function stapeldiagram(element, alternativ) {
  const {
    data, kategori, varde, titel, underrubrik, kalla,
    format = formatTal, sortera = true, farg = farger.morkbla,
  } = alternativ;

  if (data.length > diagram.maxKategorier) {
    console.warn(`Stapeldiagram: ${data.length} kategorier, max är ` +
      `${diagram.maxKategorier} enligt grafiska profilen`);
  }

  const rader = sortera
    ? data.slice().sort((a, b) => b[varde] - a[varde])
    : data;

  const m = { top: 8, right: 80, bottom: 8, left: 140 };
  const hojd = m.top + m.bottom + rader.length * RADHOJD;
  const { svg } = skapaFigur(element, { titel, underrubrik, kalla, hojd });

  // Nollbaslinje: domänen börjar alltid på 0
  const xSkala = scaleLinear()
    .domain([0, max(rader, (d) => d[varde])])
    .range([m.left, BREDD - m.right]);

  const ySkala = scaleBand()
    .domain(rader.map((d) => d[kategori]))
    .range([m.top, hojd - m.bottom])
    .padding(0.25);

  svg.append("g")
    .attr("transform", `translate(${m.left},0)`)
    .call(axisLeft(ySkala).tickSize(0).tickPadding(8))
    .call((g) => g.select(".domain").remove())
    .selectAll("text").attr("font-size", typsnitt.storlek.etikett);

  svg.append("g")
    .selectAll("rect")
    .data(rader)
    .join("rect")
    .attr("x", xSkala(0))
    .attr("y", (d) => ySkala(d[kategori]))
    .attr("width", (d) => xSkala(d[varde]) - xSkala(0))
    .attr("height", ySkala.bandwidth())
    .attr("fill", farg);

  // Värdeetiketter i svart till höger om stapeln
  svg.append("g")
    .selectAll("text")
    .data(rader)
    .join("text")
    .attr("x", (d) => xSkala(d[varde]) + 6)
    .attr("y", (d) => ySkala(d[kategori]) + ySkala.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("fill", farger.svart)
    .attr("font-size", typsnitt.storlek.etikett)
    .text((d) => format(d[varde]));

  // Nollinje
  svg.append("line")
    .attr("x1", xSkala(0)).attr("x2", xSkala(0))
    .attr("y1", m.top).attr("y2", hojd - m.bottom)
    .attr("stroke", farger.svart);
}
