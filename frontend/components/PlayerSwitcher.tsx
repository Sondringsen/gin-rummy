interface PlayerSwitcherProps {
  nPlayers: number;
  perspective: number;
  onSwitch: (player: number) => void;
}

export default function PlayerSwitcher({ nPlayers, perspective, onSwitch }: PlayerSwitcherProps) {
  return (
    <div className="fixed bottom-4 right-4 z-40 bg-gray-900 border border-yellow-600 rounded-xl p-3 shadow-xl">
      <p className="text-xs text-yellow-500 font-semibold mb-2">DEBUG — View as</p>
      <div className="flex gap-2">
        {Array.from({ length: nPlayers }).map((_, i) => (
          <button
            key={i}
            onClick={() => onSwitch(i)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              perspective === i
                ? 'bg-yellow-500 text-gray-900'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            P{i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
