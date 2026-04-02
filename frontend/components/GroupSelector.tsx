'use client';

import { CardModel } from '@/lib/types';
import { cardLabel, cardsEqual, isRed, isWild, suitSymbol } from '@/lib/gameUtils';
import { useState } from 'react';
import Card from './Card';

/** Compute the valid values a wildcard can take when added to a flush group. */
function validWildValues(group: CardModel[]): number[] {
  const covered = group
    .filter((c) => !isWild(c) || c.assigned_value != null)
    .map((c) => c.assigned_value ?? c.value);
  if (covered.length === 0) return [];
  const min = Math.min(...covered);
  const max = Math.max(...covered);

  // First check for gaps that must be filled
  const gaps: number[] = [];
  for (let v = min; v <= max; v++) {
    if (!covered.includes(v)) gaps.push(v);
  }

  // Only offer extensions if there are no gaps — gaps must be filled first
  if (gaps.length > 0) return gaps;

  const extensions: number[] = [];
  if (min > 2) extensions.push(min - 1);
  if (max < 14) extensions.push(max + 1);
  return extensions;
}

const VALUE_LABEL: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

interface GroupSelectorProps {
  hand: CardModel[];
  tressGroups: CardModel[][];
  flushGroups: CardModel[][];
  setTressGroups: (g: CardModel[][]) => void;
  setFlushGroups: (g: CardModel[][]) => void;
  requirements: { tress: number; flush: number };
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Return the cards still available to assign, correctly handling duplicates.
 * Removes one occurrence per used card rather than filtering all equal cards.
 */
function availableCards(hand: CardModel[], tress: CardModel[][], flush: CardModel[][]): CardModel[] {
  let remaining = [...hand];
  for (const used of [...tress.flat(), ...flush.flat()]) {
    const idx = remaining.findIndex((c) => cardsEqual(c, used));
    if (idx !== -1) remaining.splice(idx, 1);
  }
  return remaining;
}

export default function GroupSelector({
  hand,
  tressGroups,
  flushGroups,
  setTressGroups,
  setFlushGroups,
  requirements,
  onConfirm,
  onCancel,
}: GroupSelectorProps) {
  const [activeGroup, setActiveGroup] = useState<{ type: 'tress' | 'flush'; index: number } | null>(null);
  const [wildcardPicker, setWildcardPicker] = useState<{ card: CardModel; validValues: number[] } | null>(null);

  const available = availableCards(hand, tressGroups, flushGroups);

  const meetsRequirements =
    tressGroups.length >= requirements.tress &&
    flushGroups.length >= requirements.flush;

  function addGroup(type: 'tress' | 'flush') {
    if (type === 'tress') setTressGroups([...tressGroups, []]);
    else setFlushGroups([...flushGroups, []]);
    const newIndex = type === 'tress' ? tressGroups.length : flushGroups.length;
    setActiveGroup({ type, index: newIndex });
  }

  function removeGroup(type: 'tress' | 'flush', index: number) {
    if (type === 'tress') {
      setTressGroups(tressGroups.filter((_, i) => i !== index));
    } else {
      setFlushGroups(flushGroups.filter((_, i) => i !== index));
    }
    if (activeGroup?.type === type && activeGroup.index === index) setActiveGroup(null);
  }

  function addCardToGroup(card: CardModel) {
    if (!activeGroup) return;
    if (activeGroup.type === 'tress') {
      const updated = tressGroups.map((g, i) => (i === activeGroup.index ? [...g, card] : g));
      setTressGroups(updated);
    } else {
      if (isWild(card)) {
        const currentGroup = flushGroups[activeGroup.index];
        const valid = validWildValues(currentGroup);
        if (valid.length === 0) {
          // No existing non-wild cards — show full range
          const allValues = Array.from({ length: 13 }, (_, i) => i + 2);
          setWildcardPicker({ card, validValues: allValues });
        } else if (valid.length === 1) {
          // Only one valid position — assign automatically
          const updated = flushGroups.map((g, i) =>
            i === activeGroup.index ? [...g, { ...card, assigned_value: valid[0] }] : g
          );
          setFlushGroups(updated);
        } else {
          // Let the player pick
          setWildcardPicker({ card, validValues: valid });
        }
      } else {
        const updated = flushGroups.map((g, i) => (i === activeGroup.index ? [...g, card] : g));
        setFlushGroups(updated);
      }
    }
  }

  function confirmWildValue(value: number) {
    if (!wildcardPicker || !activeGroup) return;
    const cardWithValue = { ...wildcardPicker.card, assigned_value: value };
    const updated = flushGroups.map((g, i) =>
      i === activeGroup.index ? [...g, cardWithValue] : g
    );
    setFlushGroups(updated);
    setWildcardPicker(null);
  }

  function removeCard(group: CardModel[], card: CardModel): CardModel[] {
    const idx = group.findIndex((c) => cardsEqual(c, card));
    if (idx === -1) return group;
    return [...group.slice(0, idx), ...group.slice(idx + 1)];
  }

  function removeCardFromGroup(type: 'tress' | 'flush', index: number, card: CardModel) {
    if (type === 'tress') {
      setTressGroups(tressGroups.map((g, i) => (i === index ? removeCard(g, card) : g)));
    } else {
      setFlushGroups(flushGroups.map((g, i) => (i === index ? removeCard(g, card) : g)));
    }
  }

  function renderGroup(type: 'tress' | 'flush', groups: CardModel[][], index: number) {
    const group = groups[index];
    const isActive = activeGroup?.type === type && activeGroup.index === index;
    return (
      <div
        key={`${type}-${index}`}
        className={`p-2 rounded-lg border-2 cursor-pointer ${isActive ? 'border-blue-500 bg-gray-700' : 'border-gray-600 bg-gray-800'}`}
        onClick={() => setActiveGroup({ type, index })}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-300 capitalize">
            {type} {index + 1} ({group.length} cards)
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); removeGroup(type, index); }}
            className="text-xs text-red-400 hover:text-red-300 px-1"
          >
            ✕
          </button>
        </div>
        <div className="flex gap-1 flex-wrap min-h-8">
          {group.map((c, ci) => (
            <button
              key={ci}
              onClick={(e) => { e.stopPropagation(); removeCardFromGroup(type, index, c); }}
              className={`text-xs font-bold px-1 py-0.5 rounded border ${isRed(c.suit) ? 'text-red-500 border-red-400' : 'text-gray-200 border-gray-500'} ${isWild(c) ? 'border-yellow-400 text-yellow-500' : ''} bg-gray-900 hover:bg-red-900`}
            >
              {isWild(c) && c.assigned_value != null
                ? `★=${VALUE_LABEL[c.assigned_value] ?? c.assigned_value}`
                : `${cardLabel(c)}${suitSymbol(c.suit)}`}
            </button>
          ))}
          {group.length === 0 && (
            <span className="text-xs text-gray-500 italic">Click cards below to add</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
    {wildcardPicker && (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-60 p-4">
        <div className="bg-gray-900 rounded-xl border border-yellow-500 p-6 flex flex-col gap-4 max-w-xs w-full">
          <h3 className="text-white font-bold text-base">Wildcard position</h3>
          <p className="text-sm text-gray-400">Choose what value the wildcard (★) represents in this flush:</p>
          <div className="flex gap-2 flex-wrap">
            {wildcardPicker.validValues.map((v) => (
              <button
                key={v}
                onClick={() => confirmWildValue(v)}
                className="px-3 py-1.5 rounded bg-yellow-700 hover:bg-yellow-600 text-white text-sm font-bold"
              >
                {VALUE_LABEL[v] ?? v}
              </button>
            ))}
          </div>
          <button onClick={() => setWildcardPicker(null)} className="text-xs text-gray-500 hover:text-gray-300 self-end">
            Cancel
          </button>
        </div>
      </div>
    )}
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Open your hand</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <p className="text-sm text-gray-400">
          Required: {requirements.tress} tress{requirements.tress !== 1 ? 'es' : ''} + {requirements.flush} flush{requirements.flush !== 1 ? 'es' : ''}
        </p>

        {/* Groups */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => addGroup('tress')}
              className="text-xs px-3 py-1 rounded bg-green-800 hover:bg-green-700 text-white"
            >
              + Tress group
            </button>
            <button
              onClick={() => addGroup('flush')}
              className="text-xs px-3 py-1 rounded bg-purple-800 hover:bg-purple-700 text-white"
            >
              + Flush group
            </button>
          </div>
          {tressGroups.map((_, i) => renderGroup('tress', tressGroups, i))}
          {flushGroups.map((_, i) => renderGroup('flush', flushGroups, i))}
        </div>

        {/* Available cards */}
        <div>
          <p className="text-xs text-gray-400 mb-1">
            {activeGroup ? `Click a card to add to ${activeGroup.type} group ${activeGroup.index + 1}` : 'Select a group above, then click cards to add'}
          </p>
          <div className="flex gap-1 flex-wrap">
            {available.map((card, i) => (
              <Card
                key={`avail-${card.suit}${card.value}-${i}`}
                card={card}
                onClick={activeGroup ? () => addCardToGroup(card) : undefined}
                disabled={!activeGroup}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!meetsRequirements}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm open
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
