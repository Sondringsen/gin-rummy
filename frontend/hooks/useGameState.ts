'use client';

import { useState, useCallback } from 'react';
import { CardModel, GameState, GroupType } from '@/lib/types';
import * as api from '@/lib/api';

export type PendingAction = 'none' | 'initial_discard' | 'open' | 'build';

interface BuildTarget {
  targetPlayer: number;
  groupType: GroupType;
  groupIndex: number;
}

export function useGameState(gameId: string, initialState: GameState) {
  const [state, setState] = useState<GameState>(initialState);
  const [perspective, setPerspective] = useState<number>(0);
  const [selectedCards, setSelectedCards] = useState<CardModel[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction>('none');
  const [buildTarget, setBuildTarget] = useState<BuildTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Grouped selections for open modal: array of groups, each group is a list of cards
  const [tressGroups, setTressGroups] = useState<CardModel[][]>([]);
  const [flushGroups, setFlushGroups] = useState<CardModel[][]>([]);

  const refresh = useCallback(async (p?: number) => {
    const player = p ?? perspective;
    const s = await api.getState(gameId, player);
    setState(s);
    setSelectedCards([]);
  }, [gameId, perspective]);

  const switchPerspective = useCallback(async (p: number) => {
    setPerspective(p);
    setSelectedCards([]);
    setPendingAction('none');
    setBuildTarget(null);
    await refresh(p);
  }, [refresh]);

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
      const s = await api.initialDiscard(gameId, perspective, selectedCards[0], perspective);
      setState(s);
      setSelectedCards([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId, perspective, selectedCards]);

  const doDrawFromDeck = useCallback(async () => {
    try {
      setError(null);
      const s = await api.drawFromDeck(gameId, perspective);
      setState(s);
      setSelectedCards([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId, perspective]);

  const doDrawFromDiscard = useCallback(async (playerNum: number) => {
    try {
      setError(null);
      const s = await api.drawFromDiscard(gameId, playerNum, perspective);
      setState(s);
      setSelectedCards([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId, perspective]);

  const doDiscard = useCallback(async () => {
    if (selectedCards.length !== 1) return;
    try {
      setError(null);
      const s = await api.discardCard(gameId, selectedCards[0], perspective);
      setState(s);
      setSelectedCards([]);
      setPendingAction('none');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId, perspective, selectedCards]);

  const doOpen = useCallback(async () => {
    try {
      setError(null);
      const s = await api.openHand(gameId, tressGroups, flushGroups, perspective);
      setState(s);
      setSelectedCards([]);
      setTressGroups([]);
      setFlushGroups([]);
      setPendingAction('none');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId, perspective, tressGroups, flushGroups]);

  const doBuildOn = useCallback(async () => {
    if (!buildTarget || selectedCards.length === 0) return;
    try {
      setError(null);
      const s = await api.buildOn(
        gameId,
        perspective,
        buildTarget.targetPlayer,
        buildTarget.groupType,
        buildTarget.groupIndex,
        selectedCards,
        perspective,
      );
      setState(s);
      setSelectedCards([]);
      setPendingAction('none');
      setBuildTarget(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId, perspective, selectedCards, buildTarget]);

  const doNextRound = useCallback(async () => {
    try {
      setError(null);
      const s = await api.nextRound(gameId, perspective);
      setState(s);
      setSelectedCards([]);
      setPendingAction('none');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [gameId, perspective]);

  const startBuild = useCallback((targetPlayer: number, groupType: GroupType, groupIndex: number) => {
    setPendingAction('build');
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
  };
}
