// Linjediagram för månadsserier enligt Robins designsystem.
// Färg och linjebredd kommer från klasserna .s1–.s7 i komponenter.css,
// så diagrammet byter tema utan att ritas om. Serierna märks direkt
// vid sista punkten; verktygstipset visar alla seriers värden.
//
// linjediagram({ svg, figur }, {
//   manader: ["2020M01", ...],         // x-axeln
//   manadsnamn: ["januari 2020", ...], // texter för tips och tangentbord
//   serier: [{ namn, klass: "s1", varden: [...] }],  // max 4 i mörkt tema
//   format: formatProcent,             // värden i tips
//   axelformat: (v) => "...",          // y-axelns etiketter
// })

import {
  select, scaleTime, scaleLinear, axisBottom, axisLeft, line, min, max,
  timeYear, pointer, bisectCenter,
} from "../../d3.js";
import { BREDD, HOJD, skapaTips } from "./gemensamt.js";

const MARGINAL = { top: 16, right: 150, bottom: 32, left: 56 };
const ETIKETT_AVSTAND = 15;

// "2020M01" -> Date
export function manadTillDatum(manad) {
  return new Date(Number(manad.slice(0, 4)), Number(manad.slice(5)) - 1, 1);
}

// Flyttar isär etiketter som hamnar för nära varandra i höjdled
function spridEtiketter(etiketter) {
  const sorterade = etiketter.slice().sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorterade.length; i++) {
    const forra = sorterade[i - 1];
    if (sorterade[i].y - forra.y < ETIKETT_AVSTAND) {
      sorterade[i].y = forra.y + ETIKETT_AVSTAND;
    }
  }
  // Skjut tillbaka uppåt om sista etiketten hamnat under ritytan
  const golv = HOJD - MARGINAL.bottom;
  for (let i = sorterade.length - 1; i >= 0; i--) {
    const tak = i === sorterade.length - 1
      ? golv : sorterade[i + 1].y - ETIKETT_AVSTAND;
    sorterade[i].y = Math.min(sorterade[i].y, tak);
  }
  return etiketter;
}

export function linjediagram({ svg, figur }, alternativ) {
  const { manader, manadsnamn, serier, format, axelformat } = alternativ;
  const datum = manader.map(manadTillDatum);
  const rot = select(svg);
  rot.selectAll("*").remove();

  const alla = serier.flatMap((s) => s.varden).filter((v) => v !== null);
  const x = scaleTime()
    .domain([datum[0], datum.at(-1)])
    .range([MARGINAL.left, BREDD - MARGINAL.right]);
  const y = scaleLinear()
    .domain([min(alla), max(alla)]).nice(5)
    .range([HOJD - MARGINAL.bottom, MARGINAL.top]);

  // Rutnät, bara horisontellt, och y-axelns etiketter
  rot.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${MARGINAL.left},0)`)
    .call(axisLeft(y).ticks(5).tickSize(-(BREDD - MARGINAL.left -
      MARGINAL.right)).tickFormat(axelformat).tickPadding(8))
    .call((g) => g.select(".domain").remove());

  // x-axeln: ett streck per år, utan axellinje
  rot.append("g")
    .attr("transform", `translate(0,${HOJD - MARGINAL.bottom})`)
    .call(axisBottom(x).ticks(timeYear.every(1))
      .tickFormat((d) => String(d.getFullYear())).tickSize(0)
      .tickPadding(10))
    .call((g) => g.select(".domain").remove());

  // Linjerna. Saknade värden ger ett avbrott i linjen.
  const linje = line()
    .defined((d) => d.v !== null)
    .x((d) => x(d.d))
    .y((d) => y(d.v));
  for (const s of serier) {
    const punkter = s.varden.map((v, i) => ({ d: datum[i], v }));
    rot.append("path")
      .attr("class", `serie ${s.klass}`)
      .attr("d", linje(punkter));
  }

  // Direktetiketter vid sista värdet
  const etiketter = spridEtiketter(serier.map((s) => {
    const i = s.varden.findLastIndex((v) => v !== null);
    return { s, y: y(s.varden[i]), x: x(datum[i]) };
  }));
  for (const e of etiketter) {
    rot.append("text")
      .attr("class", "etikett")
      .attr("x", e.x + 10)
      .attr("y", e.y)
      .attr("dy", "0.35em")
      .text(e.s.namn);
  }

  // Markör för vald månad: lodrät linje och punkter
  const markor = rot.append("g").attr("class", "markor")
    .style("display", "none");
  markor.append("line").attr("class", "referens")
    .attr("y1", MARGINAL.top).attr("y2", HOJD - MARGINAL.bottom);
  const prickar = serier.map((s) => markor.append("circle")
    .attr("class", s.klass).attr("r", 4));

  const tips = skapaTips(figur);
  const sorteradeSerier = (i) => serier.slice()
    .sort((a, b) => (b.varden[i] ?? -Infinity) - (a.varden[i] ?? -Infinity));

  function visa(i) {
    const xPos = x(datum[i]);
    markor.style("display", null);
    markor.select("line").attr("x1", xPos).attr("x2", xPos);
    serier.forEach((s, j) => {
      const v = s.varden[i];
      prickar[j].style("display", v === null ? "none" : null)
        .attr("cx", xPos).attr("cy", v === null ? 0 : y(v));
    });

    const rubrik = document.createElement("strong");
    rubrik.textContent = manadsnamn[i];
    const rader = sorteradeSerier(i).map((s) => {
      const rad = document.createElement("div");
      rad.textContent = `${s.namn}: ${format(s.varden[i])}`;
      return rad;
    });
    // Tipset placeras i figurens koordinater
    const ruta = svg.getBoundingClientRect();
    const fig = figur.getBoundingClientRect();
    const skala = ruta.width / BREDD;
    tips.visa([rubrik, ...rader],
      ruta.left - fig.left + xPos * skala,
      ruta.top - fig.top + MARGINAL.top * skala);
  }
  function dolj() {
    markor.style("display", "none");
    tips.dolj();
  }

  // Mus och pekskärm
  let aktuell = datum.length - 1;
  rot.on("pointermove", (h) => {
    const [mx] = pointer(h, svg);
    aktuell = bisectCenter(datum, x.invert(mx));
    visa(aktuell);
  }).on("pointerleave", dolj);

  // Tangentbord: fokusera diagrammet, vänster/höger pil
  svg.setAttribute("tabindex", "0");
  rot.on("focus", () => visa(aktuell))
    .on("blur", dolj)
    .on("keydown", (h) => {
      if (h.key === "ArrowLeft") aktuell = Math.max(0, aktuell - 1);
      else if (h.key === "ArrowRight") {
        aktuell = Math.min(datum.length - 1, aktuell + 1);
      } else if (h.key === "Home") aktuell = 0;
      else if (h.key === "End") aktuell = datum.length - 1;
      else return;
      h.preventDefault();
      visa(aktuell);
    });
}
