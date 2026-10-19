export type CardCondition = "MINT" | "NEAR_MINT" | "EXCELLENT" | "GOOD" | "PLAYED" | "POOR";

export interface Card {
  id: string;
  name: string;
  setName: string;
  cardNumber: string | null;
  rarity: string | null;
  condition: CardCondition;
  quantity: number;
  notes: string | null;
  imageKey: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewCardInput {
  name: string;
  setName: string;
  cardNumber?: string;
  rarity?: string;
  condition?: CardCondition;
  quantity?: number;
  notes?: string;
  image: File;
}