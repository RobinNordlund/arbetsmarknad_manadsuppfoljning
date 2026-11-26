// Kopia av app/src/theme.js – rapportens diagram hämtar färger här.
// Ändras färgerna: ändra i båda, eller ta bort den mapp som inte används.

// theme.js
// Göteborgs Stads grafiska profil för webbappen: färger, typsnitt och
// standardvärden för diagram. Källa: goteborg.se/grafisk-profil
//
// Absoluta regler (gäller alla diagram i appen):
// - Stapeldiagram startar alltid på noll
// - Inga dubbla y-axlar, aldrig 3D
// - Max 7 kategorier per diagram, max 5 segment i cirkeldiagram
// - Text är alltid svart (#1f1f1f) eller vit (#ffffff)
// - Inga egna toningar och ingen genomskinlighet på färgerna
// - Göteborgsblå används för profilelement, inte för datavärden

export const farger = {
  // Huvudfärg – profilerande element (sidhuvud, länkar), inte data
  goteborgsbla: "#0077bc",

  // Mörka komplementfärger – datavärden, linjer, staplar
  morkbla: "#3f5564",
  turkos: "#008391",
  gron: "#008767",
  gul: "#ffcd37",
  rod: "#d24723",
  rosa: "#d53878",
  lila: "#674b99",

  // Ljusa komplementfärger – bakgrunder och markeringar
  gra: "#d1d9dc",
  ljusbla: "#c0e4f2",
  ljusgron: "#b8e1c8",
  ljusgul: "#fff3b0",
  aprikos: "#fbcfb9",
  ljusrosa: "#f8ccdc",
  violett: "#e1d1e8",

  // Text
  svart: "#1f1f1f",
  vit: "#ffffff",
};

// Kompisfärger: mörk och ljus variant som hör ihop
export const kompisfarger = {
  morkbla: farger.ljusbla,
  turkos: farger.ljusbla,
  gron: farger.ljusgron,
  gul: farger.ljusgul,
  rod: farger.aprikos,
  rosa: farger.ljusrosa,
  lila: farger.violett,
};

// Kategorisk palett för upp till 7 grupper, i den ordning de används.
// Gul har låg kontrast mot vit bakgrund: använd den inte för tunna
// linjer eller text, och märk alltid direkt.
export const kategorisk = [
  farger.morkbla,
  farger.turkos,
  farger.gron,
  farger.lila,
  farger.rod,
  farger.rosa,
  farger.gul,
];

// Klassindelad skala för kartor (lågt -> högt värde).
// Bara profilens egna färger, inga skapade toningar. Fungerar i
// gråskala och för färgblinda eftersom ljusheten ökar stegvis.
// Behövs fler klasser: be Visuell kommunikation om den utökade
// kartpaletten.
export const kartklasser = [
  farger.ljusbla,
  farger.turkos,
  farger.morkbla,
];

// Områden som saknar värde
export const kartaSaknas = farger.gra;

export const typsnitt = {
  familj: "'Open Sans', Arial, sans-serif",
  vikt: {
    normal: 400,
    fet: 700,
    rubrik: 800, // Open Sans Extrabold
  },
  storlek: {
    rubrik: 28,
    underrubrik: 20,
    brodtext: 16,
    etikett: 14,
    kallrad: 13,
  },
};

// Standardvärden för d3-diagram
export const diagram = {
  marginal: { top: 16, right: 24, bottom: 40, left: 64 },
  hojd: 360,
  rutnat: farger.gra,
  axeltext: farger.svart,
  linjebredd: 2.5,
  punktradie: 4,
  maxKategorier: 7,
};
