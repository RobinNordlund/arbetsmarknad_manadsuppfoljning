// Linjediagram för utveckling över tid, en eller flera serier (max 7).
// Serierna märks direkt vid linjens slut i stället för med förklaring.
//
// linjediagram(element, {
//   data,                 // rader från JSON
//   x: "ar",              // kolumn med år (heltal)
//   y: "folkmangd",       // kolumn med värde
//   serie: "namn",        // kolumn som delar upp i linjer (valfri)
//   titel, underrubrik, kalla,
//   format: formatTal,    // format för värden i tips och etiketter
//   nollbaslinje: false,  // true = y-axeln börjar på noll
// })

import {
  scaleLinear, axisBottom, axisLeft, line, extent, max, min, groups,
} from "../../d3.js";
import { farger, kategorisk, diagram, typsnitt } from "../../theme.js";
import { formatTal, axelTal } from "../../format.js";
import {
  BREDD, skapaFigur, visaTips, doljTips, text,
} from "./gemensamt.js";

export function linjediagram(element, alternativ) {
  const {
    data, x, y, serie = null, titel, underrubrik, kalla,
    format = formatTal, nollbaslinje = false,
  } = alternativ;

  const serier = serie
    ? groups(data, (d) => d[serie])
    : [[null, data]];
  if (serier.length > diagram.maxKategorier) {
    console.warn(`Linjediagram: ${serier.length} serier, max är ` +
      `${diagram.maxKategorier} enligt grafiska profilen`);
  }

  const hojd = diagram.hojd;
  // Extra marginal till höger för direktmärkning av serierna
  const m = { ...diagram.marginal, right: serie ? 130 : 24 };
  const { svg } = skapaFigur(element, { titel, underrubrik, kalla, hojd });

  const xSkala = scaleLinear()
    .domain(extent(data, (d) => d[x]))
    .range([m.left, BREDD - m.right]);

  const yMin = nollbaslinje ? 0 : min(data, (d) => d[y]);
  const ySkala = scaleLinear()
    .domain([yMin, max(data, (d) => d[y])]).nice()
    .range([hojd - m.bottom, m.top]);

  // Rutnät och axlar. År formateras utan tusentalsavgränsare.
  svg.append("g")
    .attr("class", "rutnat")
    .attr("transform", `translate(${m.left},0)`)
    .call(axisLeft(ySkala).ticks(5)
      .tickSize(-(BREDD - m.left - m.right)).tickFormat(""))
    .call((g) => g.select(".domain").remove())
    .selectAll("line").attr("stroke", diagram.rutnat);

  svg.append("g")
    .attr("transform", `translate(0,${hojd - m.bottom})`)
    .call(axisBottom(xSkala).ticks(Math.min(10, serier[0][1].length))
      .tickFormat((d) => String(d)));

  svg.append("g")
    .attr("transform", `translate(${m.left},0)`)
    .call(axisLeft(ySkala).ticks(5).tickFormat(axelTal))
    .call((g) => g.select(".domain").remove());

  const linje = line().x((d) => xSkala(d[x])).y((d) => ySkala(d[y]));

  serier.forEach(([namn, rader], i) => {
    const farg = kategorisk[i % kategorisk.length];
    const sorterade = rader.slice().sort((a, b) => a[x] - b[x]);
    const g = svg.append("g");

    g.append("path")
      .datum(sorterade)
      .attr("fill", "none")
      .attr("stroke", farg)
      .attr("stroke-width", diagram.linjebredd)
      .attr("d", linje);

    g.selectAll("circle")
      .data(sorterade)
      .join("circle")
      .attr("cx", (d) => xSkala(d[x]))
      .attr("cy", (d) => ySkala(d[y]))
      .attr("r", diagram.punktradie)
      .attr("fill", farg)
      .on("mousemove", (h, d) => visaTips(h,
        `${namn ? `<strong>${text(namn)}</strong><br>` : ""}` +
        `${text(d[x])}: ${text(format(d[y]))}`))
      .on("mouseleave", doljTips);

    // Direktmärkning vid sista punkten
    if (namn) {
      const sista = sorterade.at(-1);
      g.append("text")
        .attr("x", xSkala(sista[x]) + 8)
        .attr("y", ySkala(sista[y]))
        .attr("dy", "0.35em")
        .attr("fill", farger.svart)
        .attr("font-size", typsnitt.storlek.etikett)
        .text(namn);
    }
  });
}
