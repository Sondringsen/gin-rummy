from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from backend.auth.dependencies import get_current_user
from backend.auth.models import User
from backend.database import get_db
from backend.config import get_settings
from backend.game_logic.schema import (
    CreateGameRequest, InviteRequest, InitialDiscardRequest, DrawDiscardRequest,
    DiscardCardRequest, OpenHandRequest, BuildOnRequest, ReplaceWildRequest,
    ReorderRequest, GameState, LobbyState, ActiveGameEntry, GameHistoryEntry,
)
from backend.game_logic.ws import manager
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


def _get_user_from_token(token: str, db: Session) -> User | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
    except JWTError:
        return None
    return db.query(User).filter(User.id == user_id).first()


# ---- Lobby endpoints ----

@router.post('/', response_model=LobbyState)
def create_game(req: CreateGameRequest, me: User = Depends(get_current_user)):
    return _wrap_lobby(svc.create_game, req.n_players, me.username)


@router.get('/invitations', response_model=list[LobbyState])
def get_invitations(me: User = Depends(get_current_user)):
    return [LobbyState(**s) for s in svc.get_pending_invitations(me.username)]


@router.get('/active', response_model=list[ActiveGameEntry])
def get_active_games(me: User = Depends(get_current_user)):
    return [ActiveGameEntry(**e) for e in svc.get_active_games(me.username)]


@router.get('/history', response_model=list[GameHistoryEntry])
def get_game_history(me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [GameHistoryEntry(**e) for e in svc.get_game_history(me.id, db)]


@router.get('/{game_id}/lobby', response_model=LobbyState)
def get_lobby(game_id: str, me: User = Depends(get_current_user)):
    return _wrap_lobby(svc.get_lobby, game_id)


@router.post('/{game_id}/invite', response_model=LobbyState)
async def invite_player(game_id: str, req: InviteRequest, me: User = Depends(get_current_user)):
    lobby = _wrap_lobby(svc.invite_player, game_id, me.username, req.username)
    meta = svc._games.get(game_id)
    if meta:
        await manager.broadcast_lobby(game_id, meta)
    return lobby


@router.post('/{game_id}/join', response_model=LobbyState)
async def join_game(game_id: str, me: User = Depends(get_current_user)):
    lobby = _wrap_lobby(svc.join_game, game_id, me.username)
    meta = svc._games.get(game_id)
    if meta:
        if meta.started:
            await manager.broadcast_game(game_id, meta)
        else:
            await manager.broadcast_lobby(game_id, meta)
    return lobby


# ---- Game state ----

@router.get('/{game_id}/state', response_model=GameState)
def get_state(game_id: str, me: User = Depends(get_current_user)):
    return _wrap_game(svc.get_state, game_id, me.username)


# ---- Game actions ----

@router.post('/{game_id}/initial-discard', response_model=GameState)
async def initial_discard(game_id: str, req: InitialDiscardRequest, me: User = Depends(get_current_user)):
    state = _wrap_game(svc.initial_discard, game_id, me.username, req.card.model_dump())
    meta = svc._games.get(game_id)
    if meta:
        await manager.broadcast_game(game_id, meta)
    return state


@router.post('/{game_id}/draw/deck', response_model=GameState)
async def draw_from_deck(game_id: str, me: User = Depends(get_current_user)):
    state = _wrap_game(svc.draw_from_deck, game_id, me.username)
    meta = svc._games.get(game_id)
    if meta:
        await manager.broadcast_game(game_id, meta)
    return state


@router.post('/{game_id}/draw/discard', response_model=GameState)
async def draw_from_discard(game_id: str, req: DrawDiscardRequest, me: User = Depends(get_current_user)):
    state = _wrap_game(svc.draw_from_discard, game_id, req.player_num, me.username)
    meta = svc._games.get(game_id)
    if meta:
        await manager.broadcast_game(game_id, meta)
    return state


@router.post('/{game_id}/discard', response_model=GameState)
async def discard_card(game_id: str, req: DiscardCardRequest, me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    state = _wrap_game(svc.discard_card, game_id, me.username, req.card.model_dump())
    meta = svc._games.get(game_id)
    if meta:
        if state.game_over and not meta.result_saved:
            svc.save_game_result(game_id, meta, db, completed=True)
        await manager.broadcast_game(game_id, meta)
    return state


@router.post('/{game_id}/open', response_model=GameState)
async def open_hand(game_id: str, req: OpenHandRequest, me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tress = [[c.model_dump() for c in g] for g in req.tress_groups]
    flush = [[c.model_dump() for c in g] for g in req.flush_groups]
    state = _wrap_game(svc.open_hand, game_id, me.username, tress, flush)
    meta = svc._games.get(game_id)
    if meta:
        if state.game_over and not meta.result_saved:
            svc.save_game_result(game_id, meta, db, completed=True)
        await manager.broadcast_game(game_id, meta)
    return state


@router.post('/{game_id}/build', response_model=GameState)
async def build_on(game_id: str, req: BuildOnRequest, me: User = Depends(get_current_user)):
    state = _wrap_game(
        svc.build_on, game_id, me.username,
        req.target_player, req.group_type, req.group_index,
        [c.model_dump() for c in req.cards],
    )
    meta = svc._games.get(game_id)
    if meta:
        await manager.broadcast_game(game_id, meta)
    return state


@router.post('/{game_id}/replace-wild', response_model=GameState)
async def replace_wild_in_build(game_id: str, req: ReplaceWildRequest, me: User = Depends(get_current_user)):
    state = _wrap_game(
        svc.replace_wild_in_build, game_id, me.username,
        req.target_player, req.group_type, req.group_index, req.card.model_dump(),
    )
    meta = svc._games.get(game_id)
    if meta:
        await manager.broadcast_game(game_id, meta)
    return state


@router.post('/{game_id}/next-round', response_model=GameState)
async def next_round(game_id: str, me: User = Depends(get_current_user)):
    state = _wrap_game(svc.next_round, game_id, me.username)
    meta = svc._games.get(game_id)
    if meta:
        await manager.broadcast_game(game_id, meta)
    return state


@router.post('/{game_id}/quit', status_code=204)
async def quit_game(game_id: str, me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    meta = svc._games.get(game_id)
    if meta and meta.started and not meta.result_saved:
        svc.save_game_result(game_id, meta, db, completed=False)
    try:
        svc.quit_game(game_id, me.username)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await manager.broadcast_raw(game_id, {'type': 'game_quit', 'quitter': me.username})
    manager.disconnect_all(game_id)


@router.post('/{game_id}/reorder', response_model=GameState)
def reorder_cards(game_id: str, req: ReorderRequest, me: User = Depends(get_current_user)):
    # Reorder is local to this player only — no broadcast needed
    return _wrap_game(svc.reorder_cards, game_id, me.username, req.card_order)


# ---- WebSocket ----

@router.websocket('/{game_id}/ws')
async def game_websocket(
    game_id: str,
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    user = _get_user_from_token(token, db)
    if user is None:
        await websocket.close(code=4001)
        return

    await manager.connect(game_id, websocket, user.username)

    # Send current state immediately on connect
    meta = svc._games.get(game_id)
    if meta:
        if meta.started:
            await manager.broadcast_game(game_id, meta)
        else:
            await manager.broadcast_lobby(game_id, meta)

    try:
        while True:
            # Keep the connection alive; client may send pings as plain text
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(game_id, websocket)
