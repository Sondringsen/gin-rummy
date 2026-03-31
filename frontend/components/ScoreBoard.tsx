interface ScoreBoardProps {
  scores: number[];
  round: number;
  nPlayers: number;
}

export default function ScoreBoard({ scores, round, nPlayers }: ScoreBoardProps) {
  const minScore = Math.min(...scores);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-3 text-sm">
      <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Scores (Round {round}/6)</p>
      <div className="flex gap-4">
        {Array.from({ length: nPlayers }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className="text-xs text-gray-400">P{i + 1}</span>
            <span
              className={`text-lg font-bold ${
                scores[i] === minScore && round > 1 ? 'text-green-400' : 'text-white'
              }`}
            >
              {scores[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
