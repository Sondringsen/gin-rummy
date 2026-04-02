'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createGame, getActiveGames, getGameHistory, getPendingInvitations, joinGame } from '@/lib/api';
import { isAuthenticated, getToken, logout } from '@/lib/auth';
import { ActiveGameEntry, GameHistoryEntry, LobbyState } from '@/lib/types';
import RulesModal from '@/components/RulesModal';

function getMyUsername(): string | null {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.username ?? null;
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Home() {
  const router = useRouter();
  const [nPlayers, setNPlayers] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<LobbyState[]>([]);
  const [activeGames, setActiveGames] = useState<ActiveGameEntry[]>([]);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const myUsername = getMyUsername();
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  const fetchInvitations = useCallback(async () => {
    try { setInvitations(await getPendingInvitations()); } catch { /* ignore */ }
  }, []);

  const fetchActiveGames = useCallback(async () => {
    try { setActiveGames(await getActiveGames()); } catch { /* ignore */ }
  }, []);

  const fetchHistory = useCallback(async () => {
    try { setHistory(await getGameHistory()); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchInvitations();
    fetchActiveGames();
    fetchHistory();
    const id = setInterval(() => { fetchInvitations(); fetchActiveGames(); }, 5000);
    return () => clearInterval(id);
  }, [fetchInvitations, fetchActiveGames, fetchHistory]);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const lobby = await createGame(nPlayers);
      router.push(`/game/${lobby.game_id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create game');
      setLoading(false);
    }
  }

  async function handleJoin(gameId: string) {
    try {
      await joinGame(gameId);
      router.push(`/game/${gameId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join game');
    }
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-8">
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setRulesOpen(true)}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
        >
          Rules
        </button>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
        >
          Log out
        </button>
      </div>
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
      <div className="flex flex-col gap-6 w-full max-w-sm">
        {/* Create game card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 flex flex-col gap-6">
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

        {/* Active games */}
        {activeGames.length > 0 && (
          <div className="bg-gray-900 rounded-2xl border border-blue-800 p-6 flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-blue-400">Active Games</h2>
            {activeGames.map((g) => (
              <div key={g.game_id} className="flex items-center justify-between gap-4 bg-gray-800 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{g.players.join(' vs ')}</p>
                  <p className="text-xs text-gray-400">Round {g.round}/6</p>
                </div>
                <button
                  onClick={() => router.push(`/game/${g.game_id}`)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium"
                >
                  Return
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div className="bg-gray-900 rounded-2xl border border-yellow-700 p-6 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-yellow-400">Game Invitations</h2>
            {invitations.map((inv) => (
              <div key={inv.game_id} className="flex items-center justify-between gap-4 bg-gray-800 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{inv.creator}&apos;s game</p>
                  <p className="text-xs text-gray-400">{inv.n_players} players</p>
                </div>
                <button
                  onClick={() => handleJoin(inv.game_id)}
                  className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium"
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Game history */}
        {history.length > 0 && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-gray-300">Game History</h2>
            {history.slice(0, 10).map((g) => {
              const me = g.players.find((p) => p.username === myUsername);
              const myScore = me?.final_score ?? null;
              const minScore = g.completed
                ? Math.min(...g.players.map((p) => p.final_score ?? Infinity))
                : null;
              const won = g.completed && myScore !== null && myScore === minScore;
              const others = g.players.filter((p) => p.username !== myUsername);

              return (
                <div key={g.game_id} className="bg-gray-800 rounded-lg px-4 py-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{formatDate(g.played_at)}</span>
                    {g.completed ? (
                      <span className={`text-xs font-semibold ${won ? 'text-green-400' : 'text-red-400'}`}>
                        {won ? 'Win' : 'Loss'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 italic">Incomplete</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {g.players.map((p) => (
                      <span key={p.username} className={p.username === myUsername ? 'text-yellow-400 font-medium' : 'text-gray-400'}>
                        {p.username}: {p.final_score ?? '—'}
                      </span>
                    ))}
                  </div>
                  {others.length > 0 && (
                    <p className="text-xs text-gray-500">vs {others.map((p) => p.username).join(', ')}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
