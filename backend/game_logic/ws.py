from __future__ import annotations

from typing import TYPE_CHECKING, Dict, List, Tuple

from fastapi import WebSocket

if TYPE_CHECKING:
    from backend.game_logic.service import GameMeta


class ConnectionManager:
    def __init__(self) -> None:
        # game_id -> [(websocket, username)]
        self._connections: Dict[str, List[Tuple[WebSocket, str]]] = {}

    async def connect(self, game_id: str, ws: WebSocket, username: str) -> None:
        await ws.accept()
        self._connections.setdefault(game_id, []).append((ws, username))

    def disconnect(self, game_id: str, ws: WebSocket) -> None:
        pairs = self._connections.get(game_id, [])
        self._connections[game_id] = [(w, u) for w, u in pairs if w is not ws]

    async def broadcast_lobby(self, game_id: str, meta: "GameMeta") -> None:
        from backend.game_logic.service import _lobby_state
        payload = {"type": "lobby", "data": _lobby_state(meta, game_id)}
        await self._send_all(game_id, payload)

    async def broadcast_game(self, game_id: str, meta: "GameMeta") -> None:
        from backend.game_logic.service import _state
        pairs = list(self._connections.get(game_id, []))
        dead: list[WebSocket] = []
        for ws, username in pairs:
            try:
                player_num = meta.slots.index(username)
            except ValueError:
                continue
            try:
                await ws.send_json({"type": "game", "data": _state(meta, game_id, player_num)})
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(game_id, ws)

    async def send_to(self, game_id: str, username: str, payload: dict) -> None:
        pairs = list(self._connections.get(game_id, []))
        for ws, u in pairs:
            if u == username:
                try:
                    await ws.send_json(payload)
                except Exception:
                    self.disconnect(game_id, ws)

    async def broadcast_raw(self, game_id: str, payload: dict) -> None:
        await self._send_all(game_id, payload)

    def disconnect_all(self, game_id: str) -> None:
        self._connections.pop(game_id, None)

    async def _send_all(self, game_id: str, payload: dict) -> None:
        pairs = list(self._connections.get(game_id, []))
        dead: list[WebSocket] = []
        for ws, _ in pairs:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(game_id, ws)


manager = ConnectionManager()
