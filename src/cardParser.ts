import zod = require("zod");

const NOISE_WORDS = new Set([
    "STAGE", "ENERGY", "ATTACK", "WEAKNESS", "RESISTANCE", "RETREAT",
    "POKEMON", "BASIC", "EVOLVES", "TRAINER", "ABILITY", "EFFECT",
    "DAMAGE", "COUNTER", "ACTIVE", "BENCH", "DISCARD", "HAND", "DECK",
  ]);
  
  export function extractNameCandidates(rawText: string): string[] {
    const words = rawText.match(/[A-Za-z]{4,}/g) ?? [];
    const unique = Array.from(new Set(words.map((w) => w.toUpperCase())))
      .filter((w) => !NOISE_WORDS.has(w));
    // Longer, rarer words first — real Pokémon names tend to be both longer
    // and less likely to collide with generic card-text vocabulary.
    return unique.sort((a, b) => b.length - a.length);
  }

// OCR often reads the italic "/" as a "1" or "7", giving e.g. "1997165" for "199/165".
// Assume: [number: 1-3 digits][one separator char][total: 3 digits, or 2 for old sets]
function recoverMissingSlash(
  text: string
): { number: number; total: number } | null {
  const digits = text.replace(/\D/g, ""); // keep digits only

  for (const totalLen of [3, 2]) {
    const sepAt = digits.length - totalLen - 1; // index of the suspected slash
    if (sepAt < 1 || sepAt > 3) continue; // number must be 1-3 digits
    const sep = digits[sepAt];
    if (sep === undefined || !"17".includes(sep)) continue; // slashes are usually misread as 1 or 7

    return {
      number: parseInt(digits.slice(0, sepAt), 10),
      total: parseInt(digits.slice(sepAt + 1), 10),
    };
  }
  return null;
}

export function extractCollectorNumber(
  text: string
): { number: number; total: number } | null {
  // Attempt 1: a number/total pair that sits at the very end of the text
  let m = text.match(/(\d{1,3})\s*\/\s*(\d{1,3})\D*$/);

  // Attempt 2: if that failed, take the LAST pair anywhere in the text
  if (m === null) {
    const all = [...text.matchAll(/(\d{1,3})\s*\/\s*(\d{1,3})/g)];
    m = all[all.length - 1] ?? null;
  }

  if (m !== null) {
    const [, num, tot] = m; // group 1 and group 2 (index 0 is the whole match)
    if (num !== undefined && tot !== undefined) {
      return { number: parseInt(num, 10), total: parseInt(tot, 10) };
    }
  }

  // Attempt 3: the slash was misread as a digit, so try each line separately
  for (const line of text.split("\n")) {
    const recovered = recoverMissingSlash(line);
    if (recovered) return recovered;
  }
  return null;
}
