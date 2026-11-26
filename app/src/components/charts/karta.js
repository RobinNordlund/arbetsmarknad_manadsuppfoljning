// Koropletkarta med tre klasser enligt theme.js (kartklasser).
// Klassgränserna räknas i R och kommer från meta.klassgranser i JSON.
//
// await karta(element, {
//   niva: "primaromrade",   // "stadsomrade" | "mellanomrade" | "primaromrade"
//   data,                   // rader från JSON, en per område
//   kod: "kod",             // kolumn som matchar geometrins "kod"
//   namn: "namn",
//   varde: "forandring_procent",
//   klassgranser,           // t.ex. [2.6, 10.9]
//   titel, underrubrik, kalla,
//   format: formatProcent,  // format för värden i tips och förklaring
// })
//
// Geometrin läses från data/geo/ (kopieras dit av R/99_exportera_json.R).

import {
  geoArea, geoMercator, geoPath, scaleThreshold,
} from "../../d3.js";
import { farger, kartklasser, kartaSaknas, typsnitt } from "../../theme.js";
import { formatProcent } from "../../format.js";
import {
  BREDD, skapaFigur, visaTips, doljTips, text,
} from "./gemensamt.js";

export const GEOFILER = {
  stadsomrade: "geo/stadsomraden.geojson",
  mellanomrade: "geo/mellanomraden.geojson",
  primaromrade: "geo/primaromraden.geojson",
};

const cache = new Map();

// Läser geometrin för en nivå. d3 kräver medurs ytterringar; en polygon
// som ritas åt fel håll täcker hela jorden utom sig själv. Därför vänds
// varje polygon vars yta är större än en halv sfär.
export async function lasGeo(niva) {
  if (!cache.has(niva)) {
    const svar = await fetch(`data/${GEOFILER[niva]}`);
    if (!svar.ok) throw new Error(`Kunde inte läsa ${GEOFILER[niva]}`);
    const geo = await svar.json();
    geo.features.forEach(vandRingar);
    cache.set(niva, geo);
  }
  return cache.get(niva);
}

function vandRingar(feature) {
  const g = feature.geometry;
  const vand = (polygon) =>
    geoArea({ type: "Polygon", coordinates: polygon }) > 2 * Math.PI
      ? polygon.map((ring) => ring.slice().reverse())
      : polygon;
  if (g.type === "Polygon") g.coordinates = vand(g.coordinates);
  if (g.type === "MultiPolygon") g.coordinates = g.coordinates.map(vand);
}

export async function karta(element, alternativ) {
  const {
    niva, data, kod = "kod", namn = "namn", varde,
    klassgranser, titel, underrubrik, kalla, format = formatProcent,
  } = alternativ;

  if (klassgranser.length !== kartklasser.length - 1) {
    throw new Error(`Karta: ${klassgranser.length} klassgränser, ` +
      `förväntat ${kartklasser.length - 1}`);
  }

  const geo = await lasGeo(niva);
  const varden = new Map(data.map((d) => [String(d[kod]), d]));

  const hojd = 560;
  const forklaringBredd = 170;
  const { svg } = skapaFigur(element, { titel, underrubrik, kalla, hojd });

  const projektion = geoMercator()
    .fitSize([BREDD - forklaringBredd, hojd], geo);
  const sokvag = geoPath(projektion);
  const klass = scaleThreshold().domain(klassgranser).range(kartklasser);
  const fyllning = (d) =>
    d == null || d[varde] == null ? kartaSaknas : klass(d[varde]);

  svg.append("g")
    .selectAll("path")
    .data(geo.features)
    .join("path")
    .attr("d", sokvag)
    .attr("fill", (f) => fyllning(varden.get(f.properties.kod)))
    .attr("stroke", farger.vit)
    .attr("stroke-width", 0.75)
    .on("mousemove", (h, f) => {
      const d = varden.get(f.properties.kod);
      const v = d?.[varde] == null ? "Uppgift saknas" : format(d[varde]);
      visaTips(h, `<strong>${text(d?.[namn] ?? f.properties.namn)}</strong>` +
        `<br>${text(v)}`);
    })
    .on("mouseleave", doljTips);

  ritaForklaring(svg, {
    x: BREDD - forklaringBredd + 16,
    klassgranser,
    format,
    harSaknade: geo.features.some((f) =>
      varden.get(f.properties.kod)?.[varde] == null),
  });
}

// Förklaring: en ruta per klass med intervall i text
function ritaForklaring(svg, { x, klassgranser, format, harSaknade }) {
  const [a, b] = klassgranser;
  const rader = [
    { farg: kartklasser[2], text: `${format(b)} eller mer` },
    { farg: kartklasser[1], text: `${format(a)} till ${format(b)}` },
    { farg: kartklasser[0], text: `Under ${format(a)}` },
  ];
  if (harSaknade) rader.push({ farg: kartaSaknas, text: "Uppgift saknas" });

  const g = svg.append("g").attr("transform", `translate(${x},24)`);
  const rad = g.selectAll("g")
    .data(rader)
    .join("g")
    .attr("transform", (_, i) => `translate(0,${i * 28})`);

  rad.append("rect")
    .attr("width", 18).attr("height", 18)
    .attr("fill", (d) => d.farg);
  rad.append("text")
    .attr("x", 26).attr("y", 9).attr("dy", "0.35em")
    .attr("fill", farger.svart)
    .attr("font-size", typsnitt.storlek.etikett)
    .text((d) => d.text);
}
