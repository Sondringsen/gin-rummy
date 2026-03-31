import { notFound } from 'next/navigation';
import GameClient from '@/components/GameClient';
import { GameState } from '@/lib/types';

async function fetchState(gameId: string): Promise<GameState | null> {
  try {
    const res = await fetch(`http://localhost:8000/api/game/${gameId}/state?player=0`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const state = await fetchState(gameId);
  if (!state) notFound();

  return <GameClient gameId={gameId} initialState={state} />;
}
