import React, { useState, useMemo } from 'react';
import {
  Users, Trophy, CheckCircle2, Clock, Search, X, Minimize2, Maximize2,
  Zap, Award, ChevronDown, ChevronUp, Radio
} from 'lucide-react';

export default function ParticipantMiniScreen({
  isOpen = false,
  onClose,
  participants = [], // Array of { id, nickname, score, hasVoted, timeTakenMs }
  currentQuestion = null,
  isVotingClosed = false,
  leaderboard = [],
  isHost = true,
  currentNickname = '',
}) {
  const [activeTab, setActiveTab] = useState('votes'); // 'votes' | 'leaderboard'
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'voted' | 'pending'
  const [isMinimized, setIsMinimized] = useState(false);

  // Compute live vote counts
  const totalCount = participants.length;
  const votedCount = useMemo(() => {
    return participants.filter((p) => p.hasVoted).length;
  }, [participants]);
  const pendingCount = Math.max(0, totalCount - votedCount);
  const percentage = totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0;

  // Find fastest voter on current question if available
  const fastestVoter = useMemo(() => {
    const votersWithTime = participants.filter((p) => p.hasVoted && p.timeTakenMs);
    if (votersWithTime.length === 0) return null;
    return votersWithTime.reduce((fastest, curr) => {
      return curr.timeTakenMs < fastest.timeTakenMs ? curr : fastest;
    }, votersWithTime[0]);
  }, [participants]);

  // Filter participants
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchesSearch = p.nickname.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (filter === 'voted') return p.hasVoted;
      if (filter === 'pending') return !p.hasVoted;
      return true;
    });
  }, [participants, search, filter]);

  // Top leaderboard list
  const displayLeaderboard = useMemo(() => {
    if (leaderboard && leaderboard.length > 0) return leaderboard;
    return [...participants].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [leaderboard, participants]);

  if (!isOpen) return null;

  // Minimized floating badge
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-scale-in">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-purple-500/40 text-white shadow-2xl backdrop-blur-md hover:bg-slate-800 transition group"
          title="Expand Live Mini Screen"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div className="flex items-center gap-2 text-xs font-bold">
            <Users className="w-4 h-4 text-purple-400" />
            <span>
              {votedCount}/{totalCount} Voted ({percentage}%)
            </span>
          </div>
          <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-white transition" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[95vw] sm:w-96 max-h-[85vh] flex flex-col rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl text-white overflow-hidden animate-scale-in">
      {/* Top Header */}
      <div className="px-5 py-3 bg-slate-950/85 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center p-1 shadow shrink-0">
            <img src="/digipodium-logo.png" alt="Digipodium" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold tracking-tight">QuizLive Roster</h3>
              <span className="text-[9px] text-purple-300 font-semibold bg-purple-900/40 border border-purple-500/30 px-1.5 py-0.2 rounded">Digipodium</span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">
              {totalCount} total participant{totalCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            title="Minimize to floating pill"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="px-4 pt-3 pb-2 bg-slate-900 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl w-full">
          <button
            onClick={() => setActiveTab('votes')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'votes'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Vote Status ({votedCount}/{totalCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'leaderboard'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            <span>Leaderboard</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: LIVE VOTE STATUS */}
      {/* ======================================================== */}
      {activeTab === 'votes' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Progress Bar & Summary Card */}
          <div className="p-4 bg-slate-950/40 border-b border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-gray-300 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isVotingClosed ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                  }`}
                />
                {isVotingClosed ? 'Voting Closed' : 'Voting in Progress'}
              </span>
              <span className="text-purple-300 font-mono">
                {votedCount} / {totalCount} ({percentage}%)
              </span>
            </div>

            {/* Linear Progress Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Fastest voter highlight if available */}
            {fastestVoter && (
              <div className="pt-1 flex items-center justify-between text-[11px] text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <span className="flex items-center gap-1 font-semibold">
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                  Fastest Finger:
                </span>
                <span className="font-bold truncate max-w-[150px]">
                  {fastestVoter.nickname} ({(fastestVoter.timeTakenMs / 1000).toFixed(1)}s)
                </span>
              </div>
            )}

            {/* Search & Filter pills */}
            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find nickname..."
                  className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1 text-[11px] font-semibold">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-2 py-1 rounded-md transition ${
                    filter === 'all'
                      ? 'bg-white/20 text-white font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('voted')}
                  className={`px-2 py-1 rounded-md transition ${
                    filter === 'voted'
                      ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'text-gray-400 hover:text-emerald-300'
                  }`}
                >
                  ✓ Voted
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`px-2 py-1 rounded-md transition ${
                    filter === 'pending'
                      ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-gray-400 hover:text-amber-300'
                  }`}
                >
                  ⏳ Pending
                </button>
              </div>
            </div>
          </div>

          {/* Participants Scroll List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[350px] divide-y divide-slate-800/50">
            {filteredParticipants.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                {participants.length === 0
                  ? 'No participants have joined yet.'
                  : 'No participants match your filter.'}
              </div>
            ) : (
              filteredParticipants.map((p, idx) => {
                const isMe = currentNickname && p.nickname.toLowerCase() === currentNickname.toLowerCase();
                return (
                  <div
                    key={p.id || idx}
                    className={`pt-1.5 first:pt-0 flex items-center justify-between py-2 px-2.5 rounded-xl transition ${
                      isMe ? 'bg-purple-900/30 border border-purple-500/40' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar initials circle */}
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-gray-200 shrink-0">
                        {p.nickname.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-100 truncate flex items-center gap-1.5">
                          <span>{p.nickname}</span>
                          {isMe && (
                            <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.2 rounded font-semibold">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          {p.score || 0} pts
                        </p>
                      </div>
                    </div>

                    {/* Live Vote Status Badge */}
                    <div>
                      {p.hasVoted ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Voted</span>
                          {p.timeTakenMs && (
                            <span className="text-[10px] opacity-75 font-mono ml-0.5">
                              {(p.timeTakenMs / 1000).toFixed(1)}s
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-medium animate-pulse">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Thinking...</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: LIVE LEADERBOARD */}
      {/* ======================================================== */}
      {activeTab === 'leaderboard' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-3 bg-slate-950/40 border-b border-slate-800 text-xs text-gray-400 flex items-center justify-between">
            <span>Rank & Standings</span>
            <span className="text-[11px] text-purple-300 font-semibold">Live Scoreboard</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[380px]">
            {displayLeaderboard.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                Scores will appear once the first question is scored.
              </div>
            ) : (
              displayLeaderboard.map((entry, idx) => {
                const rank = entry.rank || idx + 1;
                const isMe = currentNickname && entry.nickname.toLowerCase() === currentNickname.toLowerCase();

                let medalBadge = (
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-gray-400 font-bold text-xs flex items-center justify-center shrink-0">
                    {rank}
                  </span>
                );
                if (rank === 1) {
                  medalBadge = (
                    <span className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-300 font-black text-xs flex items-center justify-center border border-yellow-500/40 shrink-0 shadow-sm">
                      🥇
                    </span>
                  );
                } else if (rank === 2) {
                  medalBadge = (
                    <span className="w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 font-black text-xs flex items-center justify-center border border-slate-300/40 shrink-0">
                      🥈
                    </span>
                  );
                } else if (rank === 3) {
                  medalBadge = (
                    <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-300 font-black text-xs flex items-center justify-center border border-amber-600/40 shrink-0">
                      🥉
                    </span>
                  );
                }

                return (
                  <div
                    key={entry.id || entry.nickname || idx}
                    className={`flex items-center justify-between p-2 rounded-xl transition ${
                      isMe
                        ? 'bg-purple-900/40 border border-purple-500/50'
                        : rank <= 3
                        ? 'bg-white/5 border border-white/5'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {medalBadge}
                      <span className="text-xs font-bold text-gray-100 truncate">
                        {entry.nickname}
                        {isMe && (
                          <span className="ml-1 text-[10px] bg-purple-500/30 text-purple-300 px-1 py-0.2 rounded">
                            You
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-yellow-300 font-mono">
                        {entry.score || 0}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-1">pts</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Bottom Footer Action */}
      <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 text-[11px] text-gray-400 flex items-center justify-between">
        <span>Toggle shortcut: <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">P</kbd></span>
        <button
          onClick={onClose}
          className="text-purple-400 hover:text-purple-300 font-semibold"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
