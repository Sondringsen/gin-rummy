import { CardModel, GroupType } from '@/lib/types';
import Card from './Card';

interface PlayerOpenCardsProps {
  playerNum: number;
  openTress: CardModel[][];
  openFlush: CardModel[][];
  canBuild: boolean;
  onBuildClick?: (targetPlayer: number, groupType: GroupType, groupIndex: number) => void;
}

function GroupDisplay({
  group,
  label,
  onBuild,
}: {
  group: CardModel[];
  label: string;
  onBuild?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{label}</span>
        {onBuild && (
          <button
            onClick={onBuild}
            className="text-xs px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-white"
          >
            Build
          </button>
        )}
      </div>
      <div className="flex gap-1 flex-wrap">
        {group.map((card, i) => (
          <Card key={`${card.suit}${card.value}-${i}`} card={card} small />
        ))}
      </div>
    </div>
  );
}

export default function OpenCards({ playerNum, openTress, openFlush, canBuild, onBuildClick }: PlayerOpenCardsProps) {
  if (openTress.length === 0 && openFlush.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 p-2 rounded-lg bg-gray-800 border border-gray-700">
      <p className="text-xs font-semibold text-gray-300">Player {playerNum + 1} opened</p>
      <div className="flex flex-col gap-2">
        {openTress.map((group, i) => (
          <GroupDisplay
            key={`tress-${i}`}
            group={group}
            label={`Tress ${i + 1}`}
            onBuild={canBuild && onBuildClick ? () => onBuildClick(playerNum, 'tress', i) : undefined}
          />
        ))}
        {openFlush.map((group, i) => (
          <GroupDisplay
            key={`flush-${i}`}
            group={group}
            label={`Flush ${i + 1}`}
            onBuild={canBuild && onBuildClick ? () => onBuildClick(playerNum, 'flush', i) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
