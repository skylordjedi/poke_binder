import { useState, useEffect, useCallback } from "react";
import type { Card, NewCardInput } from "../types/card";
import { listCards, createCard, deleteCard } from "../api/cards";

export function useCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCards(await listCards());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addCard(input: NewCardInput) {
    const card = await createCard(input);
    setCards((prev) => [card, ...prev]); // prepend locally instead of refetching everything
  }

  async function removeCard(id: string) {
    await deleteCard(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  return { cards, loading, error, addCard, removeCard };
}