import { CardModel } from './types';

export function cardLabel(card: CardModel): string {
  const names: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  return names[card.value] ?? String(card.value);
}

export function suitSymbol(suit: CardModel['suit']): string {
  return { S: '♠', H: '♥', D: '♦', C: '♣' }[suit];
}

export function isRed(suit: CardModel['suit']): boolean {
  return suit === 'H' || suit === 'D';
}

export function isWild(card: CardModel): boolean {
  return card.suit === 'S' && card.value === 2;
}

export function cardsEqual(a: CardModel, b: CardModel): boolean {
  if (a.id && b.id) return a.id === b.id;
  return a.suit === b.suit && a.value === b.value;
}

export function cardInList(card: CardModel, list: CardModel[]): boolean {
  return list.some((c) => cardsEqual(c, card));
}

/** Remove first occurrence of `card` from `list` (immutably). */
export function removeCard(list: CardModel[], card: CardModel): CardModel[] {
  const idx = list.findIndex((c) => cardsEqual(c, card));
  if (idx === -1) return list;
  return [...list.slice(0, idx), ...list.slice(idx + 1)];
}
