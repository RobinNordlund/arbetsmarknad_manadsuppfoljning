// Läser en JSON-fil från data/ (skriven av R/99_exportera_json.R).
// Returnerar { meta, data }. Kastar ett fel om filen inte går att läsa.

export async function lasData(filnamn) {
  const svar = await fetch(`data/${filnamn}`);
  if (!svar.ok) {
    throw new Error(`Kunde inte läsa data/${filnamn} (${svar.status})`);
  }
  return svar.json();
}
