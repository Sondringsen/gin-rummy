'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGame } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [nPlayers, setNPlayers] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const state = await createGame(nPlayers);
      router.push(`/game/${state.game_id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create game');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-8">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 w-full max-w-sm flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Gin Rummy</h1>
          <p className="text-gray-400 text-sm mt-1">6 rounds, lowest score wins</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-400">Number of players</label>
          <div className="flex gap-2">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setNPlayers(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  nPlayers === n
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting...' : 'New Game'}
        </button>
      </div>
    </div>
  );
}
