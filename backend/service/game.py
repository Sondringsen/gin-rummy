import uuid
import sys
import os
from typing import Dict, List

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from game.gin_rummy import GinRummy

_games: Dict[str, GinRummy] = {}


def _get(game_id: str) -> GinRummy:
    game = _games.get(game_id)
    if game is None:
        raise KeyError(f'Game {game_id!r} not found.')
    return game


def _state(game: GinRummy, game_id: str, perspective_player: int) -> dict:
    s = game.get_state(perspective_player)
    s['game_id'] = game_id
    return s


def create_game(n_players: int, perspective_player: int = 0) -> dict:
    game_id = str(uuid.uuid4())
    game = GinRummy(n_players=n_players)
    game.new_round()
    _games[game_id] = game
    return _state(game, game_id, perspective_player)


def get_state(game_id: str, perspective_player: int) -> dict:
    game = _get(game_id)
    return _state(game, game_id, perspective_player)


def initial_discard(game_id: str, player_num: int, card: dict, perspective_player: int) -> dict:
    game = _get(game_id)
    game.initial_discard(player_num, card)
    return _state(game, game_id, perspective_player)


def draw_from_deck(game_id: str, perspective_player: int) -> dict:
    game = _get(game_id)
    game.draw_from_deck()
    return _state(game, game_id, perspective_player)


def draw_from_discard(game_id: str, player_num: int, perspective_player: int) -> dict:
    game = _get(game_id)
    game.draw_from_discard(player_num)
    return _state(game, game_id, perspective_player)


def discard_card(game_id: str, card: dict, perspective_player: int) -> dict:
    game = _get(game_id)
    game.discard_card(card)
    return _state(game, game_id, perspective_player)


def open_hand(game_id: str, tress_groups: List[List[dict]], flush_groups: List[List[dict]], perspective_player: int) -> dict:
    game = _get(game_id)
    game.open_hand(tress_groups, flush_groups)
    return _state(game, game_id, perspective_player)


def build_on(game_id: str, player_num: int, target_player: int, group_type: str, group_index: int, cards: List[dict], perspective_player: int) -> dict:
    game = _get(game_id)
    game.build_on(player_num, target_player, group_type, group_index, cards)
    return _state(game, game_id, perspective_player)


def next_round(game_id: str, perspective_player: int) -> dict:
    game = _get(game_id)
    if not game.round_over:
        raise ValueError('Round is not over yet.')
    game.new_round()
    return _state(game, game_id, perspective_player)
