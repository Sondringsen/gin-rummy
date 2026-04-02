import { CardModel, GameState, LobbyState } from './types';
import { getAuthHeaders } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const BASE = `${API_URL}/api/game`;

export function getWsBase(): string {
  if (API_URL) return API_URL.replace(/^http/, 'ws');
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}`;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? 'Request failed');
  }
  return res.json();
}

export async function createGame(nPlayers: number): Promise<LobbyState> {
  return request<LobbyState>(`${BASE}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ n_players: nPlayers }),
  });
}

export async function getLobby(gameId: string): Promise<LobbyState> {
  return request<LobbyState>(`${BASE}/${gameId}/lobby`);
}

export async function invitePlayer(gameId: string, username: string): Promise<LobbyState> {
  return request<LobbyState>(`${BASE}/${gameId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
}

export async function joinGame(gameId: string): Promise<LobbyState> {
  return request<LobbyState>(`${BASE}/${gameId}/join`, { method: 'POST' });
}

export async function getPendingInvitations(): Promise<LobbyState[]> {
  return request<LobbyState[]>(`${BASE}/invitations`);
}

export async function getState(gameId: string): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/state`);
}

export async function initialDiscard(gameId: string, card: CardModel): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/initial-discard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card }),
  });
}

export async function drawFromDeck(gameId: string): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/draw/deck`, { method: 'POST' });
}

export async function drawFromDiscard(gameId: string, playerNum: number): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/draw/discard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_num: playerNum }),
  });
}

export async function discardCard(gameId: string, card: CardModel): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/discard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card }),
  });
}

export async function openHand(
  gameId: string,
  tressGroups: CardModel[][],
  flushGroups: CardModel[][],
): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tress_groups: tressGroups, flush_groups: flushGroups }),
  });
}

export async function buildOn(
  gameId: string,
  targetPlayer: number,
  groupType: 'tress' | 'flush',
  groupIndex: number,
  cards: CardModel[],
): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_player: targetPlayer, group_type: groupType, group_index: groupIndex, cards }),
  });
}

export async function replaceWild(
  gameId: string,
  targetPlayer: number,
  groupType: 'tress' | 'flush',
  groupIndex: number,
  card: CardModel,
): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/replace-wild`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_player: targetPlayer, group_type: groupType, group_index: groupIndex, card }),
  });
}

export async function nextRound(gameId: string): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/next-round`, { method: 'POST' });
}

export async function quitGame(gameId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/game/${gameId}/quit`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? 'Request failed');
  }
}

export async function reorderCards(
  gameId: string,
  cardOrder: number[],
): Promise<GameState> {
  return request<GameState>(`${BASE}/${gameId}/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_order: cardOrder }),
  });
}
