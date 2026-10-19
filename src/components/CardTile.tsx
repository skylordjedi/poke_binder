import type { Card } from "../types/card";

interface Props {
  card: Card;
  onDelete: (id: string) => void;
}

export function CardTile({ card, onDelete }: Props) {
  return (
    <div className="card-tile">
      <img src={card.imageUrl} alt={card.name} />
      <div className="card-tile__info">
        <p className="card-tile__name">{card.name}</p>
        <p className="card-tile__set">
          {card.setName} {card.cardNumber && `(#${card.cardNumber})`}
        </p>
        <div className="card-tile__meta">
          <span className="card-tile__condition">{card.condition.replace("_", " ")}</span>
          {card.rarity && <span className="card-tile__rarity">{card.rarity}</span>}
          {card.quantity > 1 && <span className="card-tile__qty">×{card.quantity}</span>}
        </div>
      </div>
      <button className="card-tile__delete" onClick={() => onDelete(card.id)} aria-label={`Remove ${card.name}`}>
        Remove
      </button>
    </div>
  );
}