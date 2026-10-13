import { fetchWithRetry } from "./httpRetry";

export interface TcgApiCard {
  id: string;
  name: string;
  number: string;
  set: { name: string; series: string };
  rarity: string | null;
  images: { small: string; large: string };
}

const BASE_URL = "https://api.pokemontcg.io/v2/cards";

export async function searchCards(params: { name?: string; number?: string }): Promise<TcgApiCard[]> {
  const clauses: string[] = [];
  if (params.name) clauses.push(`name:${params.name}*`);
  if (params.number) clauses.push(`number:${params.number.split("/")[0]}`);
  if (clauses.length === 0) return [];

  const url = `${BASE_URL}?q=${encodeURIComponent(clauses.join(" "))}&pageSize=10`;
  console.log("Pokémon TCG API query:", url);
  const headers: Record<string, string> = {};
  if (process.env.POKEMON_TCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMON_TCG_API_KEY;

  const res = await fetchWithRetry(url, { headers });
  if (!res.ok) throw new Error(`Pokémon TCG API request failed: ${res.status}`);
  const body = await res.json();
  return body.data;
}

export async function findBestMatch(candidates: string[]): Promise<TcgApiCard[]> {
  for (const candidate of candidates.slice(0, 5)) {
    try {
      const results = await searchCards({ name: candidate });
      if (results.length > 0) return results;
    } catch (err) {
      console.error(`Search failed for candidate "${candidate}":`, err);
    }
  }
  return [];
}