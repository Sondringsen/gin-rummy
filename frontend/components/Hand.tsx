import { CardModel } from '@/lib/types';
import { cardsEqual } from '@/lib/gameUtils';
import Card from './Card';

interface HandProps {
  cards: CardModel[];
  selectedCards?: CardModel[];
  onCardClick?: (card: CardModel) => void;
  label?: string;
  faceDown?: boolean;
  cardCount?: number; // for hidden hands
}

export default function Hand({ cards, selectedCards = [], onCardClick, label, faceDown, cardCount }: HandProps) {
  if (faceDown) {
    const count = cardCount ?? cards.length;
    return (
      <div className="flex flex-col gap-1">
        {label && <p className="text-xs text-gray-400 font-medium">{label}</p>}
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: count }).map((_, i) => (
            <Card key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <p className="text-xs text-gray-400 font-medium">{label}</p>}
      <div className="flex gap-1 flex-wrap">
        {cards.map((card, i) => (
          <Card
            key={`${card.suit}${card.value}-${i}`}
            card={card}
            selected={selectedCards.some((c) => cardsEqual(c, card))}
            onClick={onCardClick ? () => onCardClick(card) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
