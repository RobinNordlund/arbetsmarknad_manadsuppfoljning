// Arbetsmarknad – månadsuppföljning.
// Alla siffror kommer färdiga från R (app/data/); inget räknas här.
// Komponenter finns i components/ (källrad, linje, stapel), vyer i vyer/.
// Utseendet följer Robins designsystem (tokens.css, komponenter.css).

import { lasData } from "./data.js";
import { ritaOversikt, indexeraOversikt } from "./vyer/oversikt.js";
import {
  ritaUtveckling, indexeraTidsserier,
} from "./vyer/utveckling.js";
import { ritaJamforelse } from "./vyer/jamforelse.js";
import {
  ritaBranscher, indexeraBranscher, indexeraBranschserier,
} from "./vyer/branscher.js";
import { ritaOm } from "./vyer/om.js";

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

// Segmentknappar: markerar valt värde med aria-pressed
function markera(grupp, varde) {
  for (const knapp of grupp.querySelectorAll("button")) {
    knapp.setAttribute("aria-pressed", String(knapp.dataset.varde === varde));
  }
}

// Fyller en segmentgrupp med { kod, namn }. Returnerar en funktion som
// ger valt värde; vidChange anropas när användaren byter.
function fyllSegment(grupp, alternativ, forval, vidChange) {
  let valt = forval;
  grupp.replaceChildren(...alternativ.map((a) => {
    const knapp = document.createElement("button");
    knapp.type = "button";
    knapp.dataset.varde = a.kod;
    knapp.textContent = a.namn;
    knapp.addEventListener("click", () => {
      valt = a.kod;
      markera(grupp, valt);
      vidChange();
    });
    return knapp;
  }));
  markera(grupp, valt);
  return () => valt;
}

// Temaväxlare: mörkt är förval, ett eget val sparas
function startaTema() {
  const grupp = $("#val-tema");
  markera(grupp, document.documentElement.dataset.theme);
  for (const knapp of grupp.querySelectorAll("button")) {
    knapp.addEventListener("click", () => {
      const tema = knapp.dataset.varde;
      document.documentElement.dataset.theme = tema;
      markera(grupp, tema);
      try {
        localStorage.setItem("tema", tema);
      } catch (e) {
        // Utan localStorage gäller valet bara tills sidan laddas om
      }
    });
  }
}

// Flikar enligt WAI-ARIA: en vald flik i taget, pilar mellan flikarna,
// vald flik syns i adressen (#utveckling) så att länkar och bakåt fungerar
function startaFlikar() {
  const flikar = [...document.querySelectorAll('[role="tab"]')];
  const namnPa = (flik) => flik.id.replace("flik-", "");

  function valj(namn, { fokus = false } = {}) {
    const vald = flikar.find((f) => namnPa(f) === namn) ?? flikar[0];
    for (const flik of flikar) {
      const aktiv = flik === vald;
      flik.setAttribute("aria-selected", String(aktiv));
      flik.tabIndex = aktiv ? 0 : -1;
      $(`#${flik.getAttribute("aria-controls")}`).hidden = !aktiv;
    }
    const panel = $(`#${vald.getAttribute("aria-controls")}`);
    $("#urval").hidden = panel.hasAttribute("data-utan-urval");
    $("#falt-alder").hidden = panel.hasAttribute("data-utan-alder");
    if (fokus) vald.focus();
  }

  for (const flik of flikar) {
    flik.addEventListener("click", () => {
      history.replaceState(null, "", `#${namnPa(flik)}`);
      valj(namnPa(flik));
    });
    flik.addEventListener("keydown", (h) => {
      const i = flikar.indexOf(flik);
      const nasta = {
        ArrowRight: flikar[(i + 1) % flikar.length],
        ArrowLeft: flikar[(i - 1 + flikar.length) % flikar.length],
        Home: flikar[0],
        End: flikar.at(-1),
      }[h.key];
      if (!nasta) return;
      h.preventDefault();
      history.replaceState(null, "", `#${namnPa(nasta)}`);
      valj(namnPa(nasta), { fokus: true });
    });
  }
  addEventListener("hashchange", () => valj(location.hash.slice(1)));
  valj(location.hash.slice(1));
}

startaTema();
startaFlikar();

// Det gemensamma urvalet (ålder, kön, födelseregion) styr alla vyer.
// Varje vy läser sin egen JSON-fil och ritas om när urvalet ändras.
visa("#vy-oversikt", async () => {
  const meta = await lasData("meta.json");
  const vyer = [];

  const urval = () => ({
    alder: val.alder(),
    kon: val.kon(),
    fodelseregion: val.fodelseregion(),
  });
  const ritaAlla = () => vyer.forEach((rita) => rita(urval()));
  const val = {
    alder: fyllSegment($("#val-alder"), meta.data.alder, "20-64", ritaAlla),
    kon: fyllSegment($("#val-kon"), meta.data.kon, "1+2", ritaAlla),
    fodelseregion: fyllSegment($("#val-fodelseregion"),
      meta.data.fodelseregion, "tot", ritaAlla),
  };

  // Lägger till en vy: läser data, ritar och ritar om vid nytt urval
  const laggTill = (id, las) => visa(id, async (element) => {
    const rita = await las(element);
    vyer.push((u) => visa(id, () => rita(u)));
    rita(urval());
  });

  // oversikt.json används av både Översikt och Jämförelse; läs en gång
  const oversiktData = lasData("oversikt.json").then((oversikt) => ({
    oversikt, index: indexeraOversikt(oversikt.data),
  }));

  await Promise.all([
    laggTill("#vy-oversikt", async (element) => {
      const { oversikt, index } = await oversiktData;
      $("#senaste").replaceChildren(
        "Preliminär statistik t.o.m. ",
        Object.assign(document.createElement("strong"),
          { textContent: oversikt.meta.senaste_text }),
        ".",
      );
      return (u) => ritaOversikt(element, { meta, oversikt, index, urval: u });
    }),
    laggTill("#vy-utveckling", async (element) => {
      const tidsserier = await lasData("tidsserier.json");
      const index = indexeraTidsserier(tidsserier.data.serier);
      // Senaste värdet och förändringarna kommer från oversikt.json
      const { oversikt, index: oversiktIndex } = await oversiktData;
      return (u) => ritaUtveckling(element, {
        meta, tidsserier, index, oversikt, oversiktIndex, urval: u,
      });
    }),
    // Om statistiken beror inte på urvalet men ritas om med de andra
    laggTill("#vy-om", async (element) => () => ritaOm(element, { meta })),
    laggTill("#vy-branscher", async (element) => {
      const [branscher, bts] = await Promise.all([
        lasData("branscher.json"), lasData("bransch_tidsserier.json"),
      ]);
      const index = indexeraBranscher(branscher.data);
      const btsIndex = indexeraBranschserier(bts.data.serier);
      return (u) => ritaBranscher(element,
        { meta, branscher, index, bts, btsIndex, urval: u });
    }),
    laggTill("#vy-jamforelse", async (element) => {
      const { oversikt, index } = await oversiktData;
      return (u) => ritaJamforelse(element,
        { meta, oversikt, index, urval: u });
    }),
  ]);
});

export { lasData, visa };
