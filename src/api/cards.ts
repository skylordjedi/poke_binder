import type { Card, NewCardInput } from "../types/card";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function listCards(): Promise<Card[]> {
  const res = await fetch(`${API_URL}/api/cards`);
  if (!res.ok) throw new Error("Failed to load cards");
  return res.json();
}

export async function createCard(input: NewCardInput): Promise<Card> {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("setName", input.setName);
  if (input.cardNumber) formData.append("cardNumber", input.cardNumber);
  if (input.rarity) formData.append("rarity", input.rarity);
  if (input.condition) formData.append("condition", input.condition);
  if (input.quantity) formData.append("quantity", String(input.quantity));
  if (input.notes) formData.append("notes", input.notes);
  formData.append("image", input.image);

  // Note: never set a Content-Type header manually with FormData — the
  // browser generates the multipart boundary itself; setting it yourself breaks the upload.
  const res = await fetch(`${API_URL}/api/cards`, { method: "POST", body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to create card");
  }
  return res.json();
}

export async function deleteCard(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/cards/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete card");
}