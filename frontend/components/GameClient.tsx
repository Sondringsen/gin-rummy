'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CardModel, GameState, LobbyState } from '@/lib/types';
import { useGameState } from '@/hooks/useGameState';
import Card from './Card';
import Hand from './Hand';
import OpenCards from './OpenCards';
import GroupSelector from './GroupSelector';
import ScoreBoard from './ScoreBoard';
import RulesModal from './RulesModal';
import * as api from '@/lib/api';
import { getWsBase } from '@/lib/api';
import { getToken, logout } from '@/lib/auth';
import { quitGame } from '@/lib/api';

type SortMode = 'none' | 'value' | 'suit';

const SUIT_ORDER: Record<string, number> = { S: 0, H: 1, D: 2, C: 3 };

function applySort(cards: CardModel[], mode: SortMode): CardModel[] {
  if (mode === 'value') {
    return [...cards].sort((a, b) => a.value !== b.value ? a.value - b.value : SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]);
  }
  if (mode === 'suit') {
    return [...cards].sort((a, b) => a.suit !== b.suit ? SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] : a.value - b.value);
  }
  return cards;
}

function loadSortMode(playerNum: number): SortMode {
  try { return (localStorage.getItem(`gin-rummy-sort-p${playerNum}`) as SortMode) ?? 'none'; } catch { return 'none'; }
}

function saveSortMode(playerNum: number, mode: SortMode) {
  try { localStorage.setItem(`gin-rummy-sort-p${playerNum}`, mode); } catch { /* ignore */ }
}

// ---- Lobby waiting screen ----

interface LobbyScreenProps {
  gameId: string;
  initialLobby: LobbyState;
  onGameStarted: (state: GameState) => void;
}

function LobbyScreen({ gameId, initialLobby, onGameStarted }: LobbyScreenProps) {
  const [lobby, setLobby] = useState<LobbyState>(initialLobby);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const ws = new WebSocket(`${getWsBase()}/api/game/${gameId}/ws?token=${token}`);
    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'lobby') {
        setLobby(msg.data);
        if (msg.data.started) {
          // Lobby says game started but we have no game state yet — fetch it once
          try {
            const s = await api.getState(gameId);
            onGameStarted(s);
          } catch { /* ignore */ }
        }
      } else if (msg.type === 'game') {
        onGameStarted(msg.data);
      }
    };
    return () => ws.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  async function handleInvite() {
    if (!inviteUsername.trim()) return;
    setInviteLoading(true);
    setInviteError(null);
    try {
      const l = await api.invitePlayer(gameId, inviteUsername.trim());
      setLobby(l);
      setInviteUsername('');
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : 'Failed to invite');
    } finally {
      setInviteLoading(false);
    }
  }

  const filledSlots = lobby.slots.filter((s) => s.username !== null).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-8">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 w-full max-w-md flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Waiting for players</h1>
          <p className="text-gray-400 text-sm mt-1">
            {filledSlots}/{lobby.n_players} players joined
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {lobby.slots.map((slot) => (
            <div key={slot.player_num} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-2">
              <span className="text-gray-400 text-sm w-16">Player {slot.player_num + 1}</span>
              {slot.username ? (
                <span className="text-green-400 font-medium">{slot.username}</span>
              ) : (
                <span className="text-gray-500 italic text-sm">Empty</span>
              )}
            </div>
          ))}
          {lobby.invited.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Invited (pending):</p>
              {lobby.invited.map((u) => (
                <div key={u} className="flex items-center gap-2 text-sm text-yellow-400 px-4 py-1">
                  <span>⏳</span>
                  <span>{u}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-400">Invite a player by username</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              placeholder="username"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleInvite}
              disabled={inviteLoading || !inviteUsername.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Invite
            </button>
          </div>
          {inviteError && <p className="text-red-400 text-xs">{inviteError}</p>}
        </div>

        <p className="text-xs text-gray-500 text-center">
          Game will start automatically when all {lobby.n_players} players have joined.
        </p>
      </div>
    </div>
  );
}

// ---- Main game props ----

interface GameClientProps {
  gameId: string;
  initialState: GameState | null;
  lobbyState: LobbyState | null;
}

export default function GameClient({ gameId, initialState, lobbyState }: GameClientProps) {
  const [gameState, setGameState] = useState<GameState | null>(initialState);

  const handleGameStarted = useCallback((s: GameState) => {
    setGameState(s);
  }, []);

  if (!gameState) {
    if (!lobbyState) return null;
    return <LobbyScreen gameId={gameId} initialLobby={lobbyState} onGameStarted={handleGameStarted} />;
  }

  return <ActiveGame gameId={gameId} initialState={gameState} />;
}

// ---- Active game ----

function ActiveGame({ gameId, initialState }: { gameId: string; initialState: GameState }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  async function handleQuit() {
    try { await quitGame(gameId); } catch { /* ignore — game may already be gone */ }
    router.push('/');
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const {
    state,
    perspective,
    selectedCards,
    pendingAction,
    setPendingAction,
    tressGroups,
    setTressGroups,
    flushGroups,
    setFlushGroups,
    error,
    updateState,
    toggleCard,
    doInitialDiscard,
    doDrawFromDeck,
    doDrawFromDiscard,
    doDiscard,
    doOpen,
    doBuildOn,
    doReplaceWild,
    doNextRound,
    doReorder,
    startBuild,
    startReplaceWild,
    cancelAction,
  } = useGameState(gameId, initialState);

  // WebSocket: receive pushed state from server instead of polling
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const ws = new WebSocket(`${getWsBase()}/api/game/${gameId}/ws?token=${token}`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'game') updateState(msg.data);
      if (msg.type === 'game_quit') router.push('/');
    };
    return () => ws.close();
  }, [gameId, updateState, router]);

  const myView = state.players[perspective];
  const isMyTurn = state.player_turn === perspective;
  const iHaveOpened = myView?.has_opened ?? false;
  const myCards = myView?.cards ?? [];

  const [sortMode, setSortMode] = useState<SortMode>(() => loadSortMode(perspective));

  function handleSort(mode: SortMode) {
    saveSortMode(perspective, mode);
    setSortMode(mode);
    doReorder(applySort(myCards, mode));
  }

  function playerLabel(playerNum: number) {
    const pv = state.players[playerNum];
    return pv?.username ?? `Player ${playerNum + 1}`;
  }

  // ---- Game over screen ----
  if (state.game_over && !state.round_over) {
    const minScore = Math.min(...state.scores);
    const winner = state.scores.findIndex((s) => s === minScore);
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-4xl font-bold">Game Over</h1>
        <p className="text-xl text-green-400">{playerLabel(winner)} wins!</p>
        <div className="flex gap-8">
          {state.scores.map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-gray-400">{playerLabel(i)}</span>
              <span className={`text-3xl font-bold ${s === minScore ? 'text-green-400' : 'text-white'}`}>{s}</span>
            </div>
          ))}
        </div>
        <a href="/" className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium">
          New Game
        </a>
      </div>
    );
  }

  // ---- Round over screen ----
  if (state.round_over) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-3xl font-bold">Round {state.round} over!</h1>
        <div className="flex gap-8">
          {state.scores.map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-gray-400">{playerLabel(i)}</span>
              <span className="text-3xl font-bold text-white">{s}</span>
            </div>
          ))}
        </div>
        {!state.game_over && (
          <button
            onClick={doNextRound}
            className="mt-4 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium"
          >
            Start Round {state.round + 1}
          </button>
        )}
        {state.game_over && (
          <a href="/" className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium">
            New Game
          </a>
        )}
      </div>
    );
  }

  const canDrawDeck = isMyTurn && !state.has_drawn && !state.pre_round_phase;
  const canDrawDiscard = state.can_draw_from_discarded && !state.pre_round_phase && !!state.discard_top;
  const canDiscard = isMyTurn && state.has_drawn;
  const canOpen = isMyTurn && state.has_drawn && !iHaveOpened;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div>
          <h1 className="text-lg font-bold">Gin Rummy</h1>
          <p className="text-xs text-gray-400">Round {state.round}/6</p>
        </div>
        <ScoreBoard scores={state.scores} round={state.round} nPlayers={state.n_players} />
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <p className="font-semibold text-yellow-400">{myView?.username ?? `Player ${perspective + 1}`}</p>
            <p className="text-xs text-gray-500">
              {isMyTurn ? 'Your turn' : `${playerLabel(state.player_turn)}'s turn`}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              aria-label="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                <button
                  onClick={() => { setMenuOpen(false); setRulesOpen(true); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                >
                  Rules
                </button>
                <button
                  onClick={() => { setMenuOpen(false); router.push('/'); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                >
                  Home
                </button>
                <button
                  onClick={() => { setMenuOpen(false); handleQuit(); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                >
                  Quit game
                </button>
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-700 transition-colors border-t border-gray-700"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/60 border border-red-700 text-red-200 text-sm px-4 py-2 flex items-center justify-between">
          <span>{error}</span>
        </div>
      )}

      {/* Pre-round phase banner */}
      {state.pre_round_phase && (
        <div className="bg-yellow-900/40 border-b border-yellow-700 px-4 py-2 text-sm text-yellow-300">
          Pre-round: each player must discard one card from their 12-card hand.
          {isMyTurn && ' Select a card below and click "Discard initial card".'}
        </div>
      )}

      <main className="flex flex-col gap-4 p-4 flex-1">
        {/* Other players */}
        <section className="flex flex-col gap-3">
          {state.players
            .filter((p) => p.player_num !== perspective)
            .map((p) => (
              <div key={p.player_num} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${state.player_turn === p.player_num ? 'text-green-400' : 'text-gray-400'}`}>
                    {p.username ?? `Player ${p.player_num + 1}`}
                    {state.player_turn === p.player_num ? ' (their turn)' : ''}
                  </span>
                  <span className="text-xs text-gray-500">{p.card_count} cards</span>
                  {canDrawDiscard && (
                    <button
                      onClick={() => doDrawFromDiscard(p.player_num)}
                      className="text-xs px-2 py-0.5 rounded bg-orange-700 hover:bg-orange-600 text-white"
                    >
                      Steal discard (penalty)
                    </button>
                  )}
                </div>
                <Hand cards={[]} faceDown cardCount={p.card_count} />
                {(p.open_tress.length > 0 || p.open_flush.length > 0) && (
                  <OpenCards
                    playerNum={p.player_num}
                    playerName={p.username ?? `Player ${p.player_num + 1}`}
                    openTress={p.open_tress}
                    openFlush={p.open_flush}
                    canBuild={iHaveOpened && isMyTurn && state.has_drawn}
                    onBuildClick={startBuild}
                    onReplaceWildClick={startReplaceWild}
                  />
                )}
              </div>
            ))}
        </section>

        {/* My open cards */}
        {(myView?.open_tress.length > 0 || myView?.open_flush.length > 0) && (
          <OpenCards
            playerNum={perspective}
            playerName={myView.username ?? `Player ${perspective + 1}`}
            openTress={myView.open_tress}
            openFlush={myView.open_flush}
            canBuild={iHaveOpened && isMyTurn && state.has_drawn}
            onBuildClick={startBuild}
            onReplaceWildClick={startReplaceWild}
          />
        )}

        {/* Center: deck + discard */}
        <section className="flex items-center gap-6 justify-center py-2">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-400">Deck ({state.fresh_deck_count})</span>
            <button
              onClick={doDrawFromDeck}
              disabled={!canDrawDeck}
              className={`relative ${!canDrawDeck ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 transition-transform cursor-pointer'}`}
            >
              <Card />
              {canDrawDeck && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] rounded-full px-1">Draw</span>
              )}
            </button>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-400">Discard</span>
            <button
              onClick={canDrawDiscard ? () => doDrawFromDiscard(perspective) : undefined}
              disabled={!canDrawDiscard}
              className={`relative ${canDrawDiscard ? 'hover:scale-105 transition-transform cursor-pointer' : 'cursor-default'}`}
            >
              <Card card={state.discard_top} />
              {canDrawDiscard && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] rounded-full px-1">Take</span>
              )}
            </button>
          </div>
        </section>

        {/* My hand */}
        <section className="flex flex-col gap-3 mt-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">Your hand</span>
            <span className="text-xs text-gray-400">({myCards.length} cards)</span>
            {selectedCards.length > 0 && (
              <span className="text-xs text-blue-400">{selectedCards.length} selected</span>
            )}
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => handleSort('value')}
                className={`text-xs px-2 py-0.5 rounded text-gray-300 ${sortMode === 'value' ? 'bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                Sort value
              </button>
              <button
                onClick={() => handleSort('suit')}
                className={`text-xs px-2 py-0.5 rounded text-gray-300 ${sortMode === 'suit' ? 'bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                Sort suit
              </button>
            </div>
          </div>

          <Hand
            cards={myCards}
            selectedCards={selectedCards}
            onCardClick={toggleCard}
            onReorder={(cards) => { saveSortMode(perspective, 'none'); setSortMode('none'); doReorder(cards); }}
            label={myView?.username ?? `Player ${perspective + 1}`}
          />

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {state.pre_round_phase && (
              <button
                onClick={doInitialDiscard}
                disabled={selectedCards.length !== 1}
                className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Discard initial card
              </button>
            )}

            {canDiscard && !state.pre_round_phase && (
              <button
                onClick={doDiscard}
                disabled={selectedCards.length !== 1}
                className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Discard
              </button>
            )}

            {canOpen && (
              <button
                onClick={() => setPendingAction('open')}
                className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-medium"
              >
                Open
              </button>
            )}

            {pendingAction === 'build' && (
              <>
                <button
                  onClick={doBuildOn}
                  disabled={selectedCards.length === 0}
                  className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium disabled:opacity-40"
                >
                  Confirm build
                </button>
                <button
                  onClick={cancelAction}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium"
                >
                  Cancel
                </button>
              </>
            )}

            {pendingAction === 'replace_wild' && (
              <>
                <button
                  onClick={doReplaceWild}
                  disabled={selectedCards.length !== 1}
                  className="px-4 py-2 rounded-lg bg-yellow-700 hover:bg-yellow-600 text-white text-sm font-medium disabled:opacity-40"
                >
                  Confirm replace wild
                </button>
                <button
                  onClick={cancelAction}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </section>
      </main>

      {/* Rules modal */}
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}

      {/* Group selector modal */}
      {pendingAction === 'open' && myCards.length > 0 && (
        <GroupSelector
          hand={myCards}
          tressGroups={tressGroups}
          flushGroups={flushGroups}
          setTressGroups={setTressGroups}
          setFlushGroups={setFlushGroups}
          requirements={state.round_requirements}
          onConfirm={doOpen}
          onCancel={cancelAction}
        />
      )}
    </div>
  );
}
