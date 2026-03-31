import { useRef, useState } from 'react';
import { CardModel } from '@/lib/types';
import { cardsEqual } from '@/lib/gameUtils';
import Card from './Card';

interface HandProps {
  cards: CardModel[];
  selectedCards?: CardModel[];
  onCardClick?: (card: CardModel) => void;
  onReorder?: (newCards: CardModel[]) => void;
  label?: string;
  faceDown?: boolean;
  cardCount?: number; // for hidden hands
}

export default function Hand({ cards, selectedCards = [], onCardClick, onReorder, label, faceDown, cardCount }: HandProps) {
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    const dragIndex = dragIndexRef.current;
    if (dragIndex !== null && dragIndex !== dropIndex) {
      const reordered = [...cards];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dropIndex, 0, moved);
      onReorder?.(reordered);
    }
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <p className="text-xs text-gray-400 font-medium">{label}</p>}
      <div className="flex gap-1 flex-wrap">
        {cards.map((card, i) => (
          <div
            key={`${card.suit}${card.value}-${i}`}
            draggable={!!onReorder}
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
            className={`transition-opacity ${dragOverIndex === i && dragIndexRef.current !== i ? 'opacity-50' : 'opacity-100'}`}
          >
            <Card
              card={card}
              selected={selectedCards.some((c) => cardsEqual(c, card))}
              onClick={onCardClick ? () => onCardClick(card) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
