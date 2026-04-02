'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GameClient from '@/components/GameClient';
import { GameState, LobbyState } from '@/lib/types';
import { getLobby, getState } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

export default function GamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const router = useRouter();

  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    async function load() {
      try {
        const l = await getLobby(gameId);
        setLobby(l);
        if (l.started) {
          const s = await getState(gameId);
          setGameState(s);
        }
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load game');
      }
    }

    load();
  }, [gameId, router]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-red-400">{loadError}</p>
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return <GameClient gameId={gameId} initialState={gameState} lobbyState={lobby} />;
}
