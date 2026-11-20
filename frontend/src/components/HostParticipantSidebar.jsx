import React, { useState, useMemo } from 'react';
import {
  Users, Trophy, CheckCircle2, Clock, Search, X, ChevronRight,
  Zap, Award, Radio, Copy, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HostParticipantSidebar({
  isOpen = true,
  onToggle,
  participants = [], // Array of { id, nickname, score, hasVoted, timeTakenMs }
  session = null,
  currentQuestion = null,
  isVotingClosed = false,
  isSlideMode = true,
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'voted' | 'pending'
  const [copied, setCopied] = useState(false);

  // Compute live vote counts
  const totalCount = participants.length;
  const votedCount = useMemo(() => {
    return participants.filter((p) => p.hasVoted).length;
  }, [participants]);
  const pendingCount = Math.max(0, totalCount - votedCount);
  const percentage = totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0;

  // Fastest voter on current question
  const fastestVoter = useMemo(() => {
    const votersWithTime = participants.filter((p) => p.hasVoted && p.timeTakenMs);
    if (votersWithTime.length === 0) return null;
    return votersWithTime.reduce((fastest, curr) => {
      return curr.timeTakenMs < fastest.timeTakenMs ? curr : fastest;
    }, votersWithTime[0]);
  }, [participants]);

  // Sort participants by score descending, with ties broken by name
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.nickname || '').localeCompare(b.nickname || '');
    });
  }, [participants]);

  // Filter participants by search and status
  const filteredParticipants = useMemo(() => {
    return sortedParticipants.filter((p) => {
      const matchesSearch = (p.nickname || '').toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (filter === 'voted') return p.hasVoted;
      if (filter === 'pending') return !p.hasVoted;
      return true;
    });
  }, [sortedParticipants, search, filter]);

  const handleCopyLink = () => {
    const joinUrl = `${window.location.origin}/join/${session?.code || ''}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success('Join link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* The Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 lg:static lg:z-20 w-80 sm:w-88 shrink-0 flex flex-col transition-all duration-300 border-l ${
          isSlideMode
            ? 'bg-slate-900/95 border-white/10 text-white backdrop-blur-2xl'
            : 'bg-white border-gray-200 text-gray-800 shadow-2xl lg:shadow-none'
        } ${isOpen ? 'translate-x-0' : 'translate-x-full lg:hidden'}`}
      >
        {/* Top Header */}
        <div
          className={`p-4 border-b flex items-center justify-between shrink-0 ${
            isSlideMode ? 'bg-slate-950/80 border-white/10' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center p-1 shadow shrink-0">
              <img src="/digipodium-logo.png" alt="Digipodium" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm tracking-tight truncate">Live Participants</h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded">
                  {totalCount}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium truncate">
                {session?.status === 'live'
                  ? `${votedCount}/${totalCount} voted on this slide`
                  : 'Lobby · Ready to play'}
              </p>
            </div>
          </div>

          <button
            onClick={onToggle}
            className={`p-1.5 rounded-xl transition ${
              isSlideMode
                ? 'text-gray-400 hover:text-white hover:bg-white/10'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
            }`}
            title="Collapse Sidebar (Key: S)"
          >
            <X className="w-4 h-4 lg:hidden" />
            <ChevronRight className="w-4 h-4 hidden lg:block" />
          </button>
        </div>

        {/* Live Question Vote Progress Bar (When Question is Active) */}
        {session?.status === 'live' && currentQuestion && (
          <div
            className={`p-3.5 border-b space-y-2 shrink-0 ${
              isSlideMode ? 'bg-slate-950/40 border-white/10' : 'bg-purple-50/50 border-purple-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isVotingClosed ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
                  }`}
                />
                <span className={isVotingClosed ? 'text-amber-400' : 'text-emerald-400'}>
                  {isVotingClosed ? 'Voting Closed' : 'Live Voting'}
                </span>
              </span>
              <span className="font-mono text-xs text-purple-300">
                {votedCount} / {totalCount} ({percentage}%)
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-black/30 h-2 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Fastest responder badge if available */}
            {fastestVoter && (
              <div className="flex items-center justify-between text-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg">
                <span className="flex items-center gap-1 font-semibold">
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                  Fastest Finger:
                </span>
                <span className="font-bold truncate max-w-[140px]">
                  {fastestVoter.nickname} ({(fastestVoter.timeTakenMs / 1000).toFixed(1)}s)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Search & Filter Section */}
        <div
          className={`p-3 border-b space-y-2 shrink-0 ${
            isSlideMode ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-100'
          }`}
        >
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search participants..."
              className={`w-full pl-8 pr-2.5 py-1.5 rounded-xl text-xs focus:outline-none transition ${
                isSlideMode
                  ? 'bg-slate-950 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500'
                  : 'bg-gray-100 border border-gray-200 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-purple-500'
              }`}
            />
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1 text-[11px] font-bold">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-1 rounded-lg text-center transition ${
                filter === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : isSlideMode
                  ? 'text-gray-400 hover:text-white bg-white/5'
                  : 'text-gray-600 hover:text-gray-900 bg-gray-100'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setFilter('voted')}
              className={`flex-1 py-1 rounded-lg text-center transition ${
                filter === 'voted'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isSlideMode
                  ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10'
                  : 'text-emerald-700 bg-emerald-50'
              }`}
            >
              ✓ Voted ({votedCount})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`flex-1 py-1 rounded-lg text-center transition ${
                filter === 'pending'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : isSlideMode
                  ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10'
                  : 'text-amber-700 bg-amber-50'
              }`}
            >
              ⏳ Thinking ({pendingCount})
            </button>
          </div>
        </div>

        {/* Scrollable Participants & Scores List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-white/5">
          {filteredParticipants.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-semibold">
                {participants.length === 0
                  ? 'Waiting for participants to join...'
                  : 'No participants match search.'}
              </p>
              {participants.length === 0 && session?.code && (
                <p className="text-[11px] text-gray-400 mt-1">
                  Share PIN: <strong className="text-purple-400 font-mono">{session.code}</strong>
                </p>
              )}
            </div>
          ) : (
            filteredParticipants.map((p, idx) => {
              const rank = idx + 1;
              let medalBadge = (
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                    isSlideMode ? 'bg-white/10 text-gray-400' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {rank}
                </span>
              );

              if (rank === 1) {
                medalBadge = (
                  <span className="w-5 h-5 rounded-md bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 flex items-center justify-center text-xs shrink-0 shadow-sm font-black">
                    🥇
                  </span>
                );
              } else if (rank === 2) {
                medalBadge = (
                  <span className="w-5 h-5 rounded-md bg-slate-300/20 text-slate-200 border border-slate-300/40 flex items-center justify-center text-xs shrink-0 font-black">
                    🥈
                  </span>
                );
              } else if (rank === 3) {
                medalBadge = (
                  <span className="w-5 h-5 rounded-md bg-amber-700/20 text-amber-300 border border-amber-600/40 flex items-center justify-center text-xs shrink-0 font-black">
                    🥉
                  </span>
                );
              }

              return (
                <div
                  key={p.id || p.nickname || idx}
                  className={`pt-1.5 first:pt-0 flex items-center justify-between p-2 rounded-xl transition ${
                    isSlideMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Left: Rank, Avatar, Nickname & Score */}
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {medalBadge}

                    {/* Initials Avatar */}
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white text-[11px] font-black shrink-0 shadow-sm">
                      {(p.nickname || 'P').slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate leading-tight">
                        {p.nickname}
                      </p>
                      {/* Current Score */}
                      <p className="text-[11px] font-mono font-extrabold text-amber-400 leading-tight mt-0.5">
                        {p.score || 0} <span className="text-[9px] text-gray-400 font-sans font-normal">pts</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Vote Status Badge (during live question) */}
                  <div className="shrink-0">
                    {session?.status === 'live' && currentQuestion ? (
                      p.hasVoted ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shadow-sm">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Voted</span>
                          {p.timeTakenMs && (
                            <span className="text-[9px] opacity-75 font-mono ml-0.5">
                              {(p.timeTakenMs / 1000).toFixed(1)}s
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-semibold animate-pulse">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Thinking</span>
                        </div>
                      )
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Ready
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div
          className={`p-3 border-t flex items-center justify-between text-xs shrink-0 ${
            isSlideMode ? 'bg-slate-950/80 border-white/10' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-purple-300 font-bold text-xs bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/30">
              PIN: {session?.code}
            </span>
            <button
              onClick={handleCopyLink}
              className={`p-1 rounded-md transition ${
                isSlideMode ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-600'
              }`}
              title="Copy Join Link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <span className="text-[11px] text-gray-400">
            Toggle: <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">S</kbd>
          </span>
        </div>
      </aside>
    </>
  );
}
