import { CardModel, GroupType } from '@/lib/types';
import { isWild } from '@/lib/gameUtils';
import Card from './Card';

interface PlayerOpenCardsProps {
  playerNum: number;
  playerName?: string;
  openTress: CardModel[][];
  openFlush: CardModel[][];
  canBuild: boolean;
  onBuildClick?: (targetPlayer: number, groupType: GroupType, groupIndex: number) => void;
  onReplaceWildClick?: (targetPlayer: number, groupType: GroupType, groupIndex: number) => void;
}

function GroupDisplay({
  group,
  label,
  onBuild,
  onReplaceWild,
}: {
  group: CardModel[];
  label: string;
  onBuild?: () => void;
  onReplaceWild?: () => void;
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
        {onReplaceWild && (
          <button
            onClick={onReplaceWild}
            className="text-xs px-2 py-0.5 rounded bg-yellow-700 hover:bg-yellow-600 text-white"
          >
            Replace wild
          </button>
        )}
      </div>
      <div className="flex gap-1 flex-wrap">
        {group.map((card, i) => (
          <Card key={card.id ?? `${card.suit}${card.value}-${i}`} card={card} small />
        ))}
      </div>
    </div>
  );
}

export default function OpenCards({ playerNum, playerName, openTress, openFlush, canBuild, onBuildClick, onReplaceWildClick }: PlayerOpenCardsProps) {
  if (openTress.length === 0 && openFlush.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 p-2 rounded-lg bg-gray-800 border border-gray-700">
      <p className="text-xs font-semibold text-gray-300">{playerName ?? `Player ${playerNum + 1}`} opened</p>
      <div className="flex flex-col gap-2">
        {openTress.map((group, i) => (
          <GroupDisplay
            key={`tress-${i}`}
            group={group}
            label={`Tress ${i + 1}`}
            onBuild={canBuild && onBuildClick ? () => onBuildClick(playerNum, 'tress', i) : undefined}
            onReplaceWild={canBuild && onReplaceWildClick && group.some(isWild) ? () => onReplaceWildClick(playerNum, 'tress', i) : undefined}
          />
        ))}
        {openFlush.map((group, i) => {
          const sortedGroup = [...group].sort((a, b) => (a.assigned_value ?? a.value) - (b.assigned_value ?? b.value));
          // Detect ace-low flush: ace sorts last but sequence is low (e.g. A-2-3-4)
          const effectiveVals = sortedGroup.map(c => c.assigned_value ?? c.value);
          const lastVal = effectiveVals[effectiveVals.length - 1];
          const nonAceVals = effectiveVals.filter(v => v !== 14);
          const aceLow = lastVal === 14 && nonAceVals.length > 0 && Math.min(...nonAceVals) <= 5;
          const displayGroup = aceLow
            ? [sortedGroup[sortedGroup.length - 1], ...sortedGroup.slice(0, -1)]
            : sortedGroup;
          return (
            <GroupDisplay
              key={`flush-${i}`}
              group={displayGroup}
              label={`Flush ${i + 1}`}
              onBuild={canBuild && onBuildClick ? () => onBuildClick(playerNum, 'flush', i) : undefined}
              onReplaceWild={canBuild && onReplaceWildClick && group.some(isWild) ? () => onReplaceWildClick(playerNum, 'flush', i) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
