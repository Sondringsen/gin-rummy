import uuid
import sys
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from game.gin_rummy import GinRummy

INVITATION_TTL = timedelta(minutes=5)


@dataclass
class GameMeta:
    game: GinRummy
    n_players: int
    creator_username: str
    # player_num -> username (None = slot not yet filled)
    slots: List[Optional[str]] = field(default_factory=list)
    # username -> invited_at timestamp
    invited: Dict[str, datetime] = field(default_factory=dict)
    started: bool = False


_games: Dict[str, GameMeta] = {}


def _get(game_id: str) -> GameMeta:
    meta = _games.get(game_id)
    if meta is None:
        raise KeyError(f'Game {game_id!r} not found.')
    return meta


def _state(meta: GameMeta, game_id: str, perspective_player: int) -> dict:
    s = meta.game.get_state(perspective_player)
    s['game_id'] = game_id
    # Attach usernames to each player view
    for pv in s['players']:
        pv['username'] = meta.slots[pv['player_num']]
    return s


def _lobby_state(meta: GameMeta, game_id: str) -> dict:
    return {
        'game_id': game_id,
        'n_players': meta.n_players,
        'creator': meta.creator_username,
        'slots': [
            {'player_num': i, 'username': meta.slots[i]}
            for i in range(meta.n_players)
        ],
        'invited': list(meta.invited.keys()),
        'started': meta.started,
    }


def create_game(n_players: int, creator_username: str) -> dict:
    game_id = str(uuid.uuid4())
    game = GinRummy(n_players=n_players)
    slots: List[Optional[str]] = [None] * n_players
    slots[0] = creator_username
    meta = GameMeta(
        game=game,
        n_players=n_players,
        creator_username=creator_username,
        slots=slots,
    )
    _games[game_id] = meta
    return _lobby_state(meta, game_id)


def get_lobby(game_id: str) -> dict:
    meta = _get(game_id)
    return _lobby_state(meta, game_id)


def invite_player(game_id: str, inviter_username: str, invitee_username: str) -> dict:
    meta = _get(game_id)
    if inviter_username != meta.creator_username:
        raise ValueError('Only the game creator can invite players.')
    if meta.started:
        raise ValueError('Game has already started.')
    if invitee_username in meta.slots:
        raise ValueError(f'{invitee_username} is already in the game.')
    if invitee_username in meta.invited:
        raise ValueError(f'{invitee_username} has already been invited.')
    if len([s for s in meta.slots if s is not None]) + len(meta.invited) >= meta.n_players:
        raise ValueError('Game is already full.')
    meta.invited[invitee_username] = datetime.now(timezone.utc)
    return _lobby_state(meta, game_id)


def join_game(game_id: str, username: str) -> dict:
    meta = _get(game_id)
    if meta.started:
        raise ValueError('Game has already started.')
    invited_at = meta.invited.get(username)
    if invited_at is None:
        raise ValueError('You have not been invited to this game.')
    if datetime.now(timezone.utc) - invited_at > INVITATION_TTL:
        del meta.invited[username]
        raise ValueError('Your invitation has expired.')
    # Find first empty slot
    empty = next((i for i, s in enumerate(meta.slots) if s is None), None)
    if empty is None:
        raise ValueError('No empty slots available.')
    meta.slots[empty] = username
    del meta.invited[username]
    # Auto-start when all slots are filled
    if all(s is not None for s in meta.slots):
        meta.game.new_round()
        meta.started = True
    return _lobby_state(meta, game_id)


def get_pending_invitations(username: str) -> list:
    """Return list of game lobbies where this user has a non-expired pending invitation."""
    now = datetime.now(timezone.utc)
    result = []
    for game_id, meta in _games.items():
        invited_at = meta.invited.get(username)
        if invited_at is None:
            continue
        if now - invited_at > INVITATION_TTL:
            del meta.invited[username]  # clean up expired
            continue
        result.append(_lobby_state(meta, game_id))
    return result


def _player_num_for(meta: GameMeta, username: str) -> int:
    try:
        return meta.slots.index(username)
    except ValueError:
        raise ValueError('You are not a player in this game.')


def get_state(game_id: str, username: str) -> dict:
    meta = _get(game_id)
    if not meta.started:
        raise ValueError('Game has not started yet.')
    player_num = _player_num_for(meta, username)
    return _state(meta, game_id, player_num)


def initial_discard(game_id: str, username: str, card: dict) -> dict:
    meta = _get(game_id)
    player_num = _player_num_for(meta, username)
    meta.game.initial_discard(player_num, card)
    return _state(meta, game_id, player_num)


def draw_from_deck(game_id: str, username: str) -> dict:
    meta = _get(game_id)
    player_num = _player_num_for(meta, username)
    meta.game.draw_from_deck()
    return _state(meta, game_id, player_num)


def draw_from_discard(game_id: str, drawing_player_num: int, username: str) -> dict:
    meta = _get(game_id)
    player_num = _player_num_for(meta, username)
    meta.game.draw_from_discard(drawing_player_num)
    return _state(meta, game_id, player_num)


def discard_card(game_id: str, username: str, card: dict) -> dict:
    meta = _get(game_id)
    player_num = _player_num_for(meta, username)
    meta.game.discard_card(card)
    return _state(meta, game_id, player_num)


def reorder_cards(game_id: str, username: str, card_order: List[int]) -> dict:
    meta = _get(game_id)
    player_num = _player_num_for(meta, username)
    meta.game.reorder_cards(player_num, card_order)
    return _state(meta, game_id, player_num)


def open_hand(game_id: str, username: str, tress_groups: List[List[dict]], flush_groups: List[List[dict]]) -> dict:
    meta = _get(game_id)
    player_num = _player_num_for(meta, username)
    meta.game.open_hand(tress_groups, flush_groups)
    return _state(meta, game_id, player_num)


def build_on(game_id: str, username: str, target_player: int, group_type: str, group_index: int, cards: List[dict]) -> dict:
    meta = _get(game_id)
    player_num = _player_num_for(meta, username)
    meta.game.build_on(player_num, target_player, group_type, group_index, cards)
    return _state(meta, game_id, player_num)


def replace_wild_in_build(game_id: str, username: str, target_player: int, group_type: str, group_index: int, card: dict) -> dict:
    meta = _get(game_id)
    player_num = _player_num_for(meta, username)
    meta.game.replace_wild_in_build(player_num, target_player, group_type, group_index, card)
    return _state(meta, game_id, player_num)


def next_round(game_id: str, username: str) -> dict:
    meta = _get(game_id)
    player_num = _player_num_for(meta, username)
    if not meta.game.round_over:
        raise ValueError('Round is not over yet.')
    meta.game.new_round()
    return _state(meta, game_id, player_num)
