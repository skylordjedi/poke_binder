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