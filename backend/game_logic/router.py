from fastapi import APIRouter, HTTPException, Query
from backend.game_logic.schema import (
    CreateGameRequest, InitialDiscardRequest, DrawDiscardRequest,
    DiscardCardRequest, OpenHandRequest, BuildOnRequest, ReplaceWildRequest, ReorderRequest, GameState,
)
import backend.game_logic.service as svc

router = APIRouter()


def _wrap(fn, *args, **kwargs) -> GameState:
    try:
        state = fn(*args, **kwargs)
        return GameState(**state)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post('/', response_model=GameState)
def create_game(req: CreateGameRequest):
    return _wrap(svc.create_game, req.n_players)


@router.get('/{game_id}/state', response_model=GameState)
def get_state(game_id: str, player: int = Query(0)):
    return _wrap(svc.get_state, game_id, player)


@router.post('/{game_id}/initial-discard', response_model=GameState)
def initial_discard(game_id: str, req: InitialDiscardRequest, player: int = Query(0)):
    return _wrap(svc.initial_discard, game_id, req.player_num, req.card.model_dump(), player)


@router.post('/{game_id}/draw/deck', response_model=GameState)
def draw_from_deck(game_id: str, player: int = Query(0)):
    return _wrap(svc.draw_from_deck, game_id, player)


@router.post('/{game_id}/draw/discard', response_model=GameState)
def draw_from_discard(game_id: str, req: DrawDiscardRequest, player: int = Query(0)):
    return _wrap(svc.draw_from_discard, game_id, req.player_num, player)


@router.post('/{game_id}/discard', response_model=GameState)
def discard_card(game_id: str, req: DiscardCardRequest, player: int = Query(0)):
    return _wrap(svc.discard_card, game_id, req.card.model_dump(), player)


@router.post('/{game_id}/open', response_model=GameState)
def open_hand(game_id: str, req: OpenHandRequest, player: int = Query(0)):
    tress = [[c.model_dump() for c in g] for g in req.tress_groups]
    flush = [[c.model_dump() for c in g] for g in req.flush_groups]
    return _wrap(svc.open_hand, game_id, tress, flush, player)


@router.post('/{game_id}/build', response_model=GameState)
def build_on(game_id: str, req: BuildOnRequest, player: int = Query(0)):
    return _wrap(
        svc.build_on, game_id, req.player_num, req.target_player,
        req.group_type, req.group_index,
        [c.model_dump() for c in req.cards], player,
    )


@router.post('/{game_id}/replace-wild', response_model=GameState)
def replace_wild_in_build(game_id: str, req: ReplaceWildRequest, player: int = Query(0)):
    return _wrap(
        svc.replace_wild_in_build, game_id, req.player_num, req.target_player,
        req.group_type, req.group_index, req.card.model_dump(), player,
    )


@router.post('/{game_id}/next-round', response_model=GameState)
def next_round(game_id: str, player: int = Query(0)):
    return _wrap(svc.next_round, game_id, player)


@router.post('/{game_id}/reorder', response_model=GameState)
def reorder_cards(game_id: str, req: ReorderRequest, player: int = Query(0)):
    return _wrap(svc.reorder_cards, game_id, req.player_num, req.card_order, player)
