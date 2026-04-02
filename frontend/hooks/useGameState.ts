'use client';

import { useState, useCallback } from 'react';
import { CardModel, GameState, GroupType } from '@/lib/types';
import * as api from '@/lib/api';

export type PendingAction = 'none' | 'initial_discard' | 'open' | 'build' | 'replace_wild';

interface BuildTarget {
  targetPlayer: number;
  groupType: GroupType;
  groupIndex: number;
}

export function useGameState(gameId: string, initialState: GameState) {
  const [state, setState] = useState<GameState>(initialState);
  const [selectedCards, setSelectedCards] = useState<CardModel[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction>('none');
  const [buildTarget, setBuildTarget] = useState<BuildTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tressGroups, setTressGroups] = useState<CardModel[][]>([]);
  const [flushGroups, setFlushGroups] = useState<CardModel[][]>([]);

  // perspective_player is now derived from the server — it's who the logged-in user is
  const perspective = state.perspective_player;

  // Called by the WebSocket listener in GameClient when a push arrives
  const updateState = useCallback((s: GameState) => {
    setState(s);
  }, []);

  const toggleCard = useCallback((card: CardModel) => {
    setSelectedCards((prev) => {
      const exists = prev.some((c) => c.suit === card.suit && c.value === card.value);
      return exists
        ? prev.filter((c) => !(c.suit === card.suit && c.value === card.value))
        : [...prev, card];
    });
  }, []);

  const doInitialDiscard = useCallback(async () => {
    if (selectedCards.length !== 1) return;
    try {
      setError(null);
      const s = await api.initialDiscard(gameId, selectedCards[0]);
      setState(s);
      setSelectedCards([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId, selectedCards]);

  const doDrawFromDeck = useCallback(async () => {
    try {
      setError(null);
      const s = await api.drawFromDeck(gameId);
      setState(s);
      setSelectedCards([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId]);

  const doDrawFromDiscard = useCallback(async (playerNum: number) => {
    try {
      setError(null);
      const s = await api.drawFromDiscard(gameId, playerNum);
      setState(s);
      setSelectedCards([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId]);

  const doDiscard = useCallback(async () => {
    if (selectedCards.length !== 1) return;
    try {
      setError(null);
      const s = await api.discardCard(gameId, selectedCards[0]);
      setState(s);
      setSelectedCards([]);
      setPendingAction('none');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId, selectedCards]);

  const doOpen = useCallback(async () => {
    try {
      setError(null);
      const s = await api.openHand(gameId, tressGroups, flushGroups);
      setState(s);
      setSelectedCards([]);
      setTressGroups([]);
      setFlushGroups([]);
      setPendingAction('none');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId, tressGroups, flushGroups]);

  const doBuildOn = useCallback(async () => {
    if (!buildTarget || selectedCards.length === 0) return;
    try {
      setError(null);
      const s = await api.buildOn(
        gameId,
        buildTarget.targetPlayer,
        buildTarget.groupType,
        buildTarget.groupIndex,
        selectedCards,
      );
      setState(s);
      setSelectedCards([]);
      setPendingAction('none');
      setBuildTarget(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId, selectedCards, buildTarget]);

  const doReorder = useCallback(async (newCards: CardModel[]) => {
    const myCards = state.players[perspective]?.cards ?? [];
    const pool = new Map<string, number[]>();
    myCards.forEach((card, idx) => {
      const key = `${card.suit}:${card.value}`;
      if (!pool.has(key)) pool.set(key, []);
      pool.get(key)!.push(idx);
    });
    const cardOrder: number[] = [];
    for (const card of newCards) {
      const indices = pool.get(`${card.suit}:${card.value}`);
      if (!indices?.length) return;
      cardOrder.push(indices.shift()!);
    }
    if (cardOrder.length !== myCards.length) return;
    try {
      setError(null);
      const s = await api.reorderCards(gameId, cardOrder);
      setState(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId, perspective, state]);

  const doNextRound = useCallback(async () => {
    try {
      setError(null);
      const s = await api.nextRound(gameId);
      setState(s);
      setSelectedCards([]);
      setPendingAction('none');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId]);

  const doReplaceWild = useCallback(async () => {
    if (!buildTarget || selectedCards.length !== 1) return;
    try {
      setError(null);
      const s = await api.replaceWild(
        gameId,
        buildTarget.targetPlayer,
        buildTarget.groupType,
        buildTarget.groupIndex,
        selectedCards[0],
      );
      setState(s);
      setSelectedCards([]);
      setPendingAction('none');
      setBuildTarget(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId, selectedCards, buildTarget]);

  const startBuild = useCallback((targetPlayer: number, groupType: GroupType, groupIndex: number) => {
    setPendingAction('build');
    setBuildTarget({ targetPlayer, groupType, groupIndex });
    setSelectedCards([]);
  }, []);

  const startReplaceWild = useCallback((targetPlayer: number, groupType: GroupType, groupIndex: number) => {
    setPendingAction('replace_wild');
    setBuildTarget({ targetPlayer, groupType, groupIndex });
    setSelectedCards([]);
  }, []);

  const cancelAction = useCallback(() => {
    setPendingAction('none');
    setBuildTarget(null);
    setSelectedCards([]);
    setTressGroups([]);
    setFlushGroups([]);
  }, []);

  return {
    state,
    perspective,
    selectedCards,
    pendingAction,
    setPendingAction,
    buildTarget,
    tressGroups,
    setTressGroups,
    flushGroups,
    setFlushGroups,
    error,
    setError,
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
  };
}
