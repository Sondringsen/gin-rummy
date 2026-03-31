import { CardModel, GameState } from './types';

const BASE = 'http://localhost:8000/api/game';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? 'Request failed');
  }
  return res.json();
}

function stateUrl(gameId: string, player: number) {
  return `${BASE}/${gameId}/state?player=${player}`;
}

export async function createGame(nPlayers: number): Promise<GameState> {
  return request<GameState>(`${BASE}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ n_players: nPlayers }),
  });
}

export async function getState(gameId: string, player: number): Promise<GameState> {
  return request<GameState>(stateUrl(gameId, player));
}

export async function initialDiscard(gameId: string, playerNum: number, card: CardModel, perspective: number): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/initial-discard?player=${perspective}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_num: playerNum, card }),
  });
}

export async function drawFromDeck(gameId: string, perspective: number): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/draw/deck?player=${perspective}`, { method: 'POST' });
}

export async function drawFromDiscard(gameId: string, playerNum: number, perspective: number): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/draw/discard?player=${perspective}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_num: playerNum }),
  });
}

export async function discardCard(gameId: string, card: CardModel, perspective: number): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/discard?player=${perspective}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card }),
  });
}

export async function openHand(
  gameId: string,
  tressGroups: CardModel[][],
  flushGroups: CardModel[][],
  perspective: number,
): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/open?player=${perspective}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tress_groups: tressGroups, flush_groups: flushGroups }),
  });
}

export async function buildOn(
  gameId: string,
  playerNum: number,
  targetPlayer: number,
  groupType: 'tress' | 'flush',
  groupIndex: number,
  cards: CardModel[],
  perspective: number,
): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/build?player=${perspective}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_num: playerNum, target_player: targetPlayer, group_type: groupType, group_index: groupIndex, cards }),
  });
}

export async function replaceWild(
  gameId: string,
  playerNum: number,
  targetPlayer: number,
  groupType: 'tress' | 'flush',
  groupIndex: number,
  card: CardModel,
  perspective: number,
): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/replace-wild?player=${perspective}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_num: playerNum, target_player: targetPlayer, group_type: groupType, group_index: groupIndex, card }),
  });
}

export async function nextRound(gameId: string, perspective: number): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/next-round?player=${perspective}`, { method: 'POST' });
}

export async function reorderCards(
  gameId: string,
  playerNum: number,
  cardOrder: number[],
  perspective: number,
): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/reorder?player=${perspective}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_num: playerNum, card_order: cardOrder }),
  });
}
