from typing import List, Literal, Optional
from pydantic import BaseModel


class CardModel(BaseModel):
    suit: Literal['S', 'H', 'D', 'C']
    value: int


class CreateGameRequest(BaseModel):
    n_players: int = 2


class InitialDiscardRequest(BaseModel):
    player_num: int
    card: CardModel


class DrawDiscardRequest(BaseModel):
    player_num: int


class DiscardCardRequest(BaseModel):
    card: CardModel


class OpenHandRequest(BaseModel):
    tress_groups: List[List[CardModel]]
    flush_groups: List[List[CardModel]]


class BuildOnRequest(BaseModel):
    player_num: int
    target_player: int
    group_type: Literal['tress', 'flush']
    group_index: int
    cards: List[CardModel]


class ReplaceWildRequest(BaseModel):
    player_num: int
    target_player: int
    group_type: Literal['tress', 'flush']
    group_index: int
    card: CardModel


class PlayerView(BaseModel):
    player_num: int
    card_count: int
    cards: Optional[List[CardModel]] = None  # None = hidden
    open_tress: List[List[CardModel]]
    open_flush: List[List[CardModel]]
    has_opened: bool
    score: int


class ReorderRequest(BaseModel):
    player_num: int
    card_order: List[int]


class RoundRequirements(BaseModel):
    tress: int
    flush: int


class GameState(BaseModel):
    game_id: str
    round: int
    player_turn: int
    perspective_player: int
    pre_round_phase: bool
    can_draw_from_discarded: bool
    has_drawn: bool
    discard_top: Optional[CardModel] = None
    fresh_deck_count: int
    players: List[PlayerView]
    game_over: bool
    round_over: bool
    scores: List[int]
    n_players: int
    round_requirements: RoundRequirements
