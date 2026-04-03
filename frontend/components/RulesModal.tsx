'use client';

interface RulesModalProps {
  onClose: () => void;
}

export default function RulesModal({ onClose }: RulesModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Game Rules</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-5 text-sm text-gray-200">
          <section>
            <h3 className="font-semibold text-white mb-1">Overview</h3>
            <p>Played with two decks. 6 rounds total — lowest score after all rounds wins. Each player starts with 12 cards and discards one before the round begins (effectively 11 cards).</p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">Definitions</h3>
            <ul className="flex flex-col gap-1 list-disc list-inside text-gray-300">
              <li><span className="text-white font-medium">Tress</span> — three or more cards of the same value (e.g. three 4s)</li>
              <li><span className="text-white font-medium">Flush</span> — four or more consecutive cards in the same suit (e.g. 4–7 of spades)</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">Round Requirements to Open</h3>
            <div className="grid grid-cols-2 gap-1">
              {[
                ['Round 1', 'Two tresses'],
                ['Round 2', 'One tress + one flush'],
                ['Round 3', 'Two flushes'],
                ['Round 4', 'Three tresses'],
                ['Round 5', 'Two tresses + one flush'],
                ['Round 6', 'One tress + two flushes'],
              ].map(([round, req]) => (
                <div key={round} className="flex gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                  <span className="text-gray-400 w-16 shrink-0">{round}</span>
                  <span>{req}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-1">Your Turn</h3>
            <p>Draw from the deck or the top discard card, then either discard a card or open (if you meet the round requirements). After opening, you can build on other players&apos; open cards before discarding.</p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">Scoring (points remaining in hand)</h3>
            <ul className="flex flex-col gap-1 list-disc list-inside text-gray-300">
              <li><span className="text-white font-medium">2 of spades</span> — 50 points</li>
              <li><span className="text-white font-medium">Aces</span> — 20 points</li>
              <li><span className="text-white font-medium">Picture cards</span> (J, Q, K) — 10 points</li>
              <li><span className="text-white font-medium">Other cards</span> — face value</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">Special Rules</h3>
            <ul className="flex flex-col gap-1 list-disc list-inside text-gray-300">
              <li>The <span className="text-white font-medium">2 of spades</span> is a joker and can represent any card.</li>
              <li>Aces can count as <span className="text-white font-medium">1 or 14</span>.</li>
              <li>You can draw the top discard card <span className="text-white font-medium">out of turn</span>, but you must take a penalty card from the deck.</li>
              <li>You <span className="text-white font-medium">cannot</span> draw from the initial pre-round discards.</li>
              <li>In <span className="text-white font-medium">Round 6</span>, a player must open with all cards — no card is discarded.</li>
              <li>If an open build contains a joker (2♠), a player who has already opened can <span className="text-white font-medium">replace it</span> with the card it represents and take the 2♠ back into their hand.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
