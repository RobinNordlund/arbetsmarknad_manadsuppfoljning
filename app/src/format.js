// format.js
// Svensk talformatering: mellanslag som tusentalsavgränsare och
// decimalkomma. Alla siffror är färdigberäknade i R; här formateras de
// bara för visning.

import { formatLocale } from "./d3.js";

// Hårt mellanslag (U+00A0) så att tal inte bryts över två rader
const MELLANSLAG = " ";

// d3-locale för axlar och etiketter i d3-diagram
export const svenskLocale = formatLocale({
  decimal: ",",
  thousands: MELLANSLAG,
  grouping: [3],
  currency: ["", `${MELLANSLAG}kr`],
  minus: "−",
});

// Heltal eller tal med valfritt antal decimaler: 613276 -> "613 276"
export function formatTal(varde, decimaler = 0) {
  if (varde === null || varde === undefined || Number.isNaN(varde)) {
    return "–";
  }
  return svenskLocale.format(`,.${decimaler}f`)(varde);
}

// Andel som redan är i procent (0–100) från R: 12.34 -> "12,3 %"
// Standard är en decimal enligt stadens riktlinjer.
export function formatProcent(varde, decimaler = 1) {
  if (varde === null || varde === undefined || Number.isNaN(varde)) {
    return "–";
  }
  return `${formatTal(varde, decimaler)}${MELLANSLAG}%`;
}

// Förändring med tecken: 0.2 -> "+0,2", -1.25 -> "−1,3" (en decimal).
// enhet läggs efter talet, t.ex. "procentenheter" eller "%".
export function formatForandring(varde, enhet = "", decimaler = 1) {
  if (varde === null || varde === undefined || Number.isNaN(varde)) {
    return "–";
  }
  const tal = varde === 0
    ? formatTal(0, decimaler)
    : svenskLocale.format(`+,.${decimaler}f`)(varde);
  return enhet ? `${tal}${MELLANSLAG}${enhet}` : tal;
}

// Kompakt axelformat för stora tal: 613276 -> "613 276"
export const axelTal = svenskLocale.format(",.0f");
