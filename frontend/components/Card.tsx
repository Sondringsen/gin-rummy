import { CardModel } from '@/lib/types';
import { cardLabel, isRed, isWild, suitSymbol } from '@/lib/gameUtils';

interface CardProps {
  card?: CardModel | null; // undefined/null = face-down
  selected?: boolean;
  onClick?: () => void;
  small?: boolean;
  disabled?: boolean;
}

export default function Card({ card, selected, onClick, small, disabled }: CardProps) {
  if (!card) {
    return (
      <div
        className={`
          ${small ? 'w-8 h-12 text-[8px]' : 'w-14 h-20 text-sm'}
          rounded-lg border-2 border-gray-600
          bg-gradient-to-br from-blue-900 to-blue-700
          flex items-center justify-center
          shrink-0
        `}
      >
        <span className="text-blue-400 font-bold">🂠</span>
      </div>
    );
  }

  const wild = isWild(card);
  const red = isRed(card.suit);

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onKeyDown={onClick && !disabled ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`
        ${small ? 'w-8 h-12 text-[9px]' : 'w-14 h-20 text-sm'}
        rounded-lg border-2 font-bold
        flex flex-col items-center justify-between p-1
        shrink-0 transition-all duration-150
        ${wild ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 bg-white'}
        ${selected ? '-translate-y-3 ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
        ${onClick && !disabled ? 'cursor-pointer' : 'cursor-default'}
        ${disabled ? 'opacity-50' : ''}
      `}
    >
      <span className={`self-start leading-none ${red ? 'text-red-600' : 'text-gray-900'} ${wild ? 'text-yellow-700' : ''}`}>
        {cardLabel(card)}
      </span>
      <span className={`text-base leading-none ${red ? 'text-red-600' : 'text-gray-900'} ${wild ? 'text-yellow-600' : ''}`}>
        {suitSymbol(card.suit)}
      </span>
      <span className={`self-end leading-none rotate-180 ${red ? 'text-red-600' : 'text-gray-900'} ${wild ? 'text-yellow-700' : ''}`}>
        {cardLabel(card)}
      </span>
    </div>
  );
}
