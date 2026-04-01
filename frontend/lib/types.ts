export type Suit = 'S' | 'H' | 'D' | 'C';
export type GroupType = 'tress' | 'flush';

export interface CardModel {
  suit: Suit;
  value: number;
}

export interface PlayerView {
  player_num: number;
  username: string | null;
  card_count: number;
  cards: CardModel[] | null; // null = hidden (other player)
  open_tress: CardModel[][];
  open_flush: CardModel[][];
  has_opened: boolean;
  score: number;
}

export interface RoundRequirements {
  tress: number;
  flush: number;
}

export interface GameState {
  game_id: string;
  round: number;
  player_turn: number;
  perspective_player: number;
  pre_round_phase: boolean;
  can_draw_from_discarded: boolean;
  has_drawn: boolean;
  discard_top: CardModel | null;
  fresh_deck_count: number;
  players: PlayerView[];
  game_over: boolean;
  round_over: boolean;
  scores: number[];
  n_players: number;
  round_requirements: RoundRequirements;
}

export interface PlayerSlot {
  player_num: number;
  username: string | null;
}

export interface LobbyState {
  game_id: string;
  n_players: number;
  creator: string;
  slots: PlayerSlot[];
  invited: string[];
  started: boolean;
}
