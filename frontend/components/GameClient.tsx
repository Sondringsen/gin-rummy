'use client';

import { GameState } from '@/lib/types';
import { useGameState } from '@/hooks/useGameState';
import Card from './Card';
import Hand from './Hand';
import OpenCards from './OpenCards';
import GroupSelector from './GroupSelector';
import ScoreBoard from './ScoreBoard';
import PlayerSwitcher from './PlayerSwitcher';

interface GameClientProps {
  gameId: string;
  initialState: GameState;
}

export default function GameClient({ gameId, initialState }: GameClientProps) {
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
    switchPerspective,
    toggleCard,
    doInitialDiscard,
    doDrawFromDeck,
    doDrawFromDiscard,
    doDiscard,
    doOpen,
    doBuildOn,
    doNextRound,
    startBuild,
    cancelAction,
  } = useGameState(gameId, initialState);

  const myView = state.players[perspective];
  const isMyTurn = state.player_turn === perspective;
  const iHaveOpened = myView?.has_opened ?? false;

  // ---- Game over screen ----
  if (state.game_over && !state.round_over) {
    const minScore = Math.min(...state.scores);
    const winner = state.scores.findIndex((s) => s === minScore);
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-4xl font-bold">Game Over</h1>
        <p className="text-xl text-green-400">Player {winner + 1} wins!</p>
        <div className="flex gap-8">
          {state.scores.map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-gray-400">Player {i + 1}</span>
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
              <span className="text-gray-400">Player {i + 1}</span>
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

  const myCards = myView?.cards ?? [];
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
        <div className="text-right text-sm">
          <p className="text-gray-400">Viewing as</p>
          <p className="font-semibold text-yellow-400">Player {perspective + 1}</p>
          <p className="text-xs text-gray-500">Turn: P{state.player_turn + 1}</p>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/60 border border-red-700 text-red-200 text-sm px-4 py-2 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => {}} className="ml-4 text-red-300 hover:text-white font-bold">✕</button>
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
                    Player {p.player_num + 1} {state.player_turn === p.player_num ? '(their turn)' : ''}
                  </span>
                  <span className="text-xs text-gray-500">{p.card_count} cards</span>
                  {/* Out-of-turn discard draw */}
                  {canDrawDiscard && p.player_num !== perspective && (
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
                    openTress={p.open_tress}
                    openFlush={p.open_flush}
                    canBuild={iHaveOpened && isMyTurn && state.has_drawn}
                    onBuildClick={startBuild}
                  />
                )}
              </div>
            ))}
        </section>

        {/* My open cards */}
        {(myView?.open_tress.length > 0 || myView?.open_flush.length > 0) && (
          <OpenCards
            playerNum={perspective}
            openTress={myView.open_tress}
            openFlush={myView.open_flush}
            canBuild={iHaveOpened && isMyTurn && state.has_drawn}
            onBuildClick={startBuild}
          />
        )}

        {/* Center: deck + discard */}
        <section className="flex items-center gap-6 justify-center py-2">
          {/* Fresh deck */}
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

          {/* Discard pile */}
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">Your hand</span>
            <span className="text-xs text-gray-400">({myCards.length} cards)</span>
            {selectedCards.length > 0 && (
              <span className="text-xs text-blue-400">{selectedCards.length} selected</span>
            )}
          </div>

          <Hand
            cards={myCards}
            selectedCards={selectedCards}
            onCardClick={toggleCard}
            label={`Player ${perspective + 1} (you)`}
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
          </div>
        </section>
      </main>

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

      <PlayerSwitcher
        nPlayers={state.n_players}
        perspective={perspective}
        onSwitch={switchPerspective}
      />
    </div>
  );
}
