import React from 'react';
import { Crown } from 'lucide-react';

const MEDALS = [
  { bg: 'bg-yellow-400', text: 'text-yellow-900', label: '🥇' },
  { bg: 'bg-gray-300',   text: 'text-gray-800',   label: '🥈' },
  { bg: 'bg-amber-600',  text: 'text-amber-100',  label: '🥉' },
];

/**
 * Leaderboard
 * Props: { leaderboard: [{rank, nickname, score}], currentNickname? }
 */
export default function Leaderboard({ leaderboard = [], currentNickname }) {
  const top3 = leaderboard.slice(0, 3);
  const rest  = leaderboard.slice(3);

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      {/* Podium – top 3 */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-2 mb-4">
          {/* Re-order: 2nd | 1st | 3rd */}
          {[top3[1], top3[0], top3[2]].map((entry, podiumIdx) => {
            if (!entry) return <div key={podiumIdx} className="w-24" />;
            const realIdx = podiumIdx === 0 ? 1 : podiumIdx === 1 ? 0 : 2;
            const medal   = MEDALS[realIdx];
            const isMe    = entry.nickname === currentNickname;
            const heights = ['h-20', 'h-28', 'h-16'];
            return (
              <div
                key={entry.nickname}
                className={`flex flex-col items-center animate-fade-in`}
                style={{ animationDelay: `${realIdx * 100}ms` }}
              >
                {realIdx === 0 && (
                  <Crown className="text-yellow-400 mb-1" size={22} />
                )}
                <div
                  className={`w-20 ${medal.bg} ${heights[podiumIdx]} rounded-t-xl flex flex-col items-center justify-end pb-2 shadow-lg
                              ${isMe ? 'ring-4 ring-purple-500' : ''}`}
                >
                  <span className="text-2xl">{medal.label}</span>
                  <span className={`text-xs font-bold truncate max-w-[70px] ${medal.text}`}>{entry.nickname}</span>
                  <span className={`text-xs ${medal.text}`}>{entry.score} pts</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranks 4+ */}
      {rest.map((entry, i) => {
        const isMe = entry.nickname === currentNickname;
        return (
          <div
            key={entry.nickname}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow
                        ${isMe ? 'bg-purple-600 text-white' : 'bg-white text-gray-800'}
                        animate-fade-in`}
            style={{ animationDelay: `${(i + 3) * 80}ms` }}
          >
            <span className="w-7 text-center font-bold text-sm">{entry.rank}</span>
            <span className="flex-1 font-medium truncate">{entry.nickname}{isMe && ' (you)'}</span>
            <span className="font-bold">{entry.score} pts</span>
          </div>
        );
      })}

      {leaderboard.length === 0 && (
        <p className="text-center text-gray-400 py-8">No scores yet.</p>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease both;
        }
      `}</style>
    </div>
  );
}
