// Källrad som ska finnas under varje diagram och tabell.
// Texten kommer från meta.kalla i JSON-filen, som skrivs i R.

export function skapaKallrad(text) {
  if (!text) {
    console.warn("Källrad saknas – lägg till meta.kalla i JSON-filen");
    return document.createDocumentFragment();
  }
  const p = document.createElement("p");
  p.className = "kallrad";
  p.textContent = text;
  return p;
}
