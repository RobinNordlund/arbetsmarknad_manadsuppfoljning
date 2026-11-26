// EXEMPEL: ersätt med projektets innehåll.
// Visar ett nyckeltal, ett linjediagram, ett stapeldiagram och en karta
// med val av nivå. Alla siffror kommer färdiga från R; inget räknas här.

import { lasData } from "./data.js";
import { formatTal } from "./format.js";
import { skapaKallrad } from "./components/kallrad.js";
import { linjediagram } from "./components/charts/linjediagram.js";
import { stapeldiagram } from "./components/charts/stapeldiagram.js";
import { karta } from "./components/charts/karta.js";

const $ = (id) => document.querySelector(id);

// Kör en del av sidan och visar felet i stället för innehållet
async function visa(id, rita) {
  try {
    await rita($(id));
  } catch (fel) {
    $(id).textContent = fel.message;
    console.error(fel);
  }
}

visa("#nyckeltal", async (el) => {
  const { meta, data } = await lasData("befolkning_goteborg.json");
  const senaste = data.at(-1);
  el.innerHTML = `<h2>Folkmängd i Göteborg ${senaste.ar}</h2>
    <p class="stort-tal">${formatTal(senaste.folkmangd)}</p>`;
  el.append(skapaKallrad(meta.kalla));
});

const stadsomraden = lasData("befolkning_stadsomrade.json");

visa("#linjediagram", async (el) => {
  const { meta, data } = await stadsomraden;
  el.replaceChildren();
  linjediagram(el, {
    data, x: "ar", y: "folkmangd", serie: "namn",
    titel: meta.titel, underrubrik: "Antal invånare 31 december",
    kalla: meta.kalla,
  });
});

visa("#stapeldiagram", async (el) => {
  const { meta, data } = await stadsomraden;
  const ar = Math.max(...data.map((d) => d.ar));
  el.replaceChildren();
  stapeldiagram(el, {
    data: data.filter((d) => d.ar === ar),
    kategori: "namn", varde: "folkmangd",
    titel: `${meta.titel} ${ar}`, kalla: meta.kalla,
  });
});

const ritaKarta = (niva) => visa("#karta", async (el) => {
  const { meta, data } = await lasData(`forandring_${niva}.json`);
  el.replaceChildren();
  await karta(el, {
    niva, data, varde: "forandring_procent",
    klassgranser: meta.klassgranser,
    titel: meta.titel, underrubrik: "Förändring i procent",
    kalla: meta.kalla,
  });
});

$("#nivaval").addEventListener("change", (h) => ritaKarta(h.target.value));
ritaKarta($("#nivaval input:checked").value);
