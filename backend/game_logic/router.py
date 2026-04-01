from fastapi import APIRouter, Depends, HTTPException
from backend.auth.dependencies import get_current_user
from backend.auth.models import User
from backend.game_logic.schema import (
    CreateGameRequest, InviteRequest, InitialDiscardRequest, DrawDiscardRequest,
    DiscardCardRequest, OpenHandRequest, BuildOnRequest, ReplaceWildRequest,
    ReorderRequest, GameState, LobbyState,
)
import backend.game_logic.service as svc

router = APIRouter()


def _wrap_game(fn, *args, **kwargs) -> GameState:
    try:
        state = fn(*args, **kwargs)
        return GameState(**state)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


def _wrap_lobby(fn, *args, **kwargs) -> LobbyState:
    try:
        state = fn(*args, **kwargs)
        return LobbyState(**state)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post('/', response_model=LobbyState)
def create_game(req: CreateGameRequest, me: User = Depends(get_current_user)):
    return _wrap_lobby(svc.create_game, req.n_players, me.username)


@router.get('/invitations', response_model=list[LobbyState])
def get_invitations(me: User = Depends(get_current_user)):
    return [LobbyState(**s) for s in svc.get_pending_invitations(me.username)]


@router.get('/{game_id}/lobby', response_model=LobbyState)
def get_lobby(game_id: str, me: User = Depends(get_current_user)):
    return _wrap_lobby(svc.get_lobby, game_id)


@router.post('/{game_id}/invite', response_model=LobbyState)
def invite_player(game_id: str, req: InviteRequest, me: User = Depends(get_current_user)):
    return _wrap_lobby(svc.invite_player, game_id, me.username, req.username)


@router.post('/{game_id}/join', response_model=LobbyState)
def join_game(game_id: str, me: User = Depends(get_current_user)):
    return _wrap_lobby(svc.join_game, game_id, me.username)


@router.get('/{game_id}/state', response_model=GameState)
def get_state(game_id: str, me: User = Depends(get_current_user)):
    return _wrap_game(svc.get_state, game_id, me.username)


@router.post('/{game_id}/initial-discard', response_model=GameState)
def initial_discard(game_id: str, req: InitialDiscardRequest, me: User = Depends(get_current_user)):
    return _wrap_game(svc.initial_discard, game_id, me.username, req.card.model_dump())


@router.post('/{game_id}/draw/deck', response_model=GameState)
def draw_from_deck(game_id: str, me: User = Depends(get_current_user)):
    return _wrap_game(svc.draw_from_deck, game_id, me.username)


@router.post('/{game_id}/draw/discard', response_model=GameState)
def draw_from_discard(game_id: str, req: DrawDiscardRequest, me: User = Depends(get_current_user)):
    return _wrap_game(svc.draw_from_discard, game_id, req.player_num, me.username)


@router.post('/{game_id}/discard', response_model=GameState)
def discard_card(game_id: str, req: DiscardCardRequest, me: User = Depends(get_current_user)):
    return _wrap_game(svc.discard_card, game_id, me.username, req.card.model_dump())


@router.post('/{game_id}/open', response_model=GameState)
def open_hand(game_id: str, req: OpenHandRequest, me: User = Depends(get_current_user)):
    tress = [[c.model_dump() for c in g] for g in req.tress_groups]
    flush = [[c.model_dump() for c in g] for g in req.flush_groups]
    return _wrap_game(svc.open_hand, game_id, me.username, tress, flush)


@router.post('/{game_id}/build', response_model=GameState)
def build_on(game_id: str, req: BuildOnRequest, me: User = Depends(get_current_user)):
    return _wrap_game(
        svc.build_on, game_id, me.username,
        req.target_player, req.group_type, req.group_index,
        [c.model_dump() for c in req.cards],
    )


@router.post('/{game_id}/replace-wild', response_model=GameState)
def replace_wild_in_build(game_id: str, req: ReplaceWildRequest, me: User = Depends(get_current_user)):
    return _wrap_game(
        svc.replace_wild_in_build, game_id, me.username,
        req.target_player, req.group_type, req.group_index, req.card.model_dump(),
    )


@router.post('/{game_id}/next-round', response_model=GameState)
def next_round(game_id: str, me: User = Depends(get_current_user)):
    return _wrap_game(svc.next_round, game_id, me.username)


@router.post('/{game_id}/reorder', response_model=GameState)
def reorder_cards(game_id: str, req: ReorderRequest, me: User = Depends(get_current_user)):
    return _wrap_game(svc.reorder_cards, game_id, me.username, req.card_order)
