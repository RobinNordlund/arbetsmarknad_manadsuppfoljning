// Läser en JSON-fil från data/ (skriven av R/99_exportera_json.R).
// Returnerar { meta, data }. Kastar ett fel om filen inte går att läsa.

export async function lasData(filnamn) {
  // no-cache: webbläsaren frågar alltid servern om filen har ändrats,
  // så att en ny månad syns direkt efter den månatliga publiceringen
  const svar = await fetch(`data/${filnamn}`, { cache: "no-cache" });
  if (!svar.ok) {
    throw new Error(`Kunde inte läsa data/${filnamn} (${svar.status})`);
  }
  return svar.json();
}
