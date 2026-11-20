import React, { useState, useMemo } from 'react';
import {
  Cloud, Sparkles, LayoutGrid, RotateCcw, Search, CheckCircle2,
  Trophy, Users, Info, X, Crown, Zap, BarChart2
} from 'lucide-react';
import WordCloudRenderer from './WordCloudRenderer';
import AnimatedBarChart from './AnimatedBarChart';

// Vibrant neon color palettes for word cloud tags
const WORD_COLORS = [
  { bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 hover:border-emerald-400', glow: 'rgba(16, 185, 129, 0.4)' },
  { bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30 hover:border-cyan-400', glow: 'rgba(6, 182, 212, 0.4)' },
  { bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30 hover:border-purple-400', glow: 'rgba(168, 85, 247, 0.4)' },
  { bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 hover:border-amber-400', glow: 'rgba(245, 158, 11, 0.4)' },
  { bg: 'bg-pink-500/20 text-pink-300 border-pink-500/40 hover:bg-pink-500/30 hover:border-pink-400', glow: 'rgba(236, 72, 153, 0.4)' },
  { bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30 hover:border-indigo-400', glow: 'rgba(99, 102, 241, 0.4)' },
  { bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 hover:border-rose-400', glow: 'rgba(244, 63, 94, 0.4)' },
  { bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30 hover:border-blue-400', glow: 'rgba(59, 130, 246, 0.4)' },
];

export default function InteractiveWordCloud({
  currentQuestion,
  optionVotes = {},
  submittedAnswers = [],
  isAnswerRevealed = false,
  timeUpData = null,
  answersCount = 0,
  totalPlayers = 0,
  isDark = true,
  onSwitchToGrid,
}) {
  const [tokenMode, setTokenMode] = useState('phrase'); // 'phrase' | 'words'
  const [displayType, setDisplayType] = useState('cloud'); // 'cloud' | 'bars'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [scatterSeed, setScatterSeed] = useState(0);

  // ──────────────────────────────────────────────────────────────────────────
  // Process and Aggregate Data
  // ──────────────────────────────────────────────────────────────────────────
  const cloudItems = useMemo(() => {
    if (!currentQuestion) return [];

    const options = currentQuestion.options || [];
    const correctOptionIds = new Set(
      (timeUpData?.correctOptions || []).map((co) => co.id)
    );

    // Map participant votes
    // submittedAnswers: [ { participantId, nickname, optionId, textAnswer, isCorrect, timeTakenMs } ]
    const votersByOptionId = {};
    const textAnswersList = [];

    submittedAnswers.forEach((ans) => {
      if (ans.optionId) {
        if (!votersByOptionId[ans.optionId]) votersByOptionId[ans.optionId] = [];
        votersByOptionId[ans.optionId].push(ans);
      }
      if (ans.textAnswer) {
        textAnswersList.push(ans);
      }
    });

    if (tokenMode === 'phrase') {
      // 1. If options exist, each option is a phrase
      if (options.length > 0) {
        return options.map((opt, idx) => {
          const votes = optionVotes[opt.id] || votersByOptionId[opt.id]?.length || 0;
          const isCorrect = isAnswerRevealed && correctOptionIds.has(opt.id);
          const voters = votersByOptionId[opt.id] || [];

          return {
            id: `opt-${opt.id || idx}`,
            text: opt.text || `Option ${idx + 1}`,
            votes,
            isCorrect,
            voters,
            media_url: opt.media_url,
            rawOptionId: opt.id,
            colorIndex: idx % WORD_COLORS.length,
          };
        });
      }

      // 2. Short answer / open-ended text answers
      const textCounts = {};
      textAnswersList.forEach((ans) => {
        const cleaned = (ans.textAnswer || '').trim();
        if (!cleaned) return;
        const key = cleaned.toLowerCase();
        if (!textCounts[key]) {
          textCounts[key] = {
            id: `text-${key}`,
            text: cleaned,
            votes: 0,
            isCorrect: Boolean(ans.isCorrect),
            voters: [],
            colorIndex: Object.keys(textCounts).length % WORD_COLORS.length,
          };
        }
        textCounts[key].votes += 1;
        textCounts[key].voters.push(ans);
        if (ans.isCorrect) textCounts[key].isCorrect = true;
      });

      return Object.values(textCounts);
    } else {
      // 3. Word Token Breakdown Mode (Split all phrases into individual words)
      const wordCounts = {};
      const stopWords = new Set(['a', 'an', 'the', 'is', 'in', 'at', 'of', 'on', 'and', 'or', 'to', 'for', 'it', 'by', 'with']);

      const addWord = (w, votesWeight, ansRef, isCorrect) => {
        const clean = w.replace(/[^a-zA-Z0-9_-]/g, '').trim();
        if (!clean || clean.length < 2 || stopWords.has(clean.toLowerCase())) return;
        const key = clean.toLowerCase();

        if (!wordCounts[key]) {
          wordCounts[key] = {
            id: `word-${key}`,
            text: clean,
            votes: 0,
            isCorrect: Boolean(isCorrect),
            voters: [],
            colorIndex: Object.keys(wordCounts).length % WORD_COLORS.length,
          };
        }
        wordCounts[key].votes += votesWeight;
        if (ansRef && !wordCounts[key].voters.some((v) => v.participantId === ansRef.participantId)) {
          wordCounts[key].voters.push(ansRef);
        }
        if (isCorrect) wordCounts[key].isCorrect = true;
      };

      // Extract words from options
      options.forEach((opt) => {
        const votes = optionVotes[opt.id] || votersByOptionId[opt.id]?.length || 0;
        const isCorrect = isAnswerRevealed && correctOptionIds.has(opt.id);
        const words = (opt.text || '').split(/\s+/);
        words.forEach((w) => {
          addWord(w, votes || 1, null, isCorrect);
        });
      });

      // Extract words from text answers
      textAnswersList.forEach((ans) => {
        const words = (ans.textAnswer || '').split(/\s+/);
        words.forEach((w) => {
          addWord(w, 1, ans, ans.isCorrect);
        });
      });

      return Object.values(wordCounts);
    }
  }, [currentQuestion, optionVotes, submittedAnswers, isAnswerRevealed, timeUpData, tokenMode]);

  // Max and min votes to compute sizing scale
  const { maxVotes, totalVotes } = useMemo(() => {
    let max = 0;
    let sum = 0;
    cloudItems.forEach((item) => {
      if (item.votes > max) max = item.votes;
      sum += item.votes;
    });
    return { maxVotes: Math.max(max, 1), totalVotes: sum };
  }, [cloudItems]);

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return cloudItems;
    const q = searchQuery.toLowerCase();
    return cloudItems.filter(
      (item) =>
        item.text.toLowerCase().includes(q) ||
        item.voters.some((v) => (v.nickname || '').toLowerCase().includes(q))
    );
  }, [cloudItems, searchQuery]);

  // Compute layout & font size for each word
  // Sizing range: 18px to 64px
  const getWordStyle = (item, index) => {
    const ratio = item.votes / maxVotes;
    // Base size for 0 votes is 20px, scales up to 58px for maximum votes
    const fontSize = Math.round(20 + ratio * 38);
    const paddingX = Math.round(14 + ratio * 16);
    const paddingY = Math.round(8 + ratio * 10);

    // Subtle playful angle (-4 deg, 0 deg, +4 deg) based on index & seed
    const angles = [0, -4, 4, 0, -3, 3, 0];
    const rotation = angles[(index + scatterSeed) % angles.length];

    const isMatchSearch =
      searchQuery &&
      (item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.voters.some((v) => (v.nickname || '').toLowerCase().includes(searchQuery.toLowerCase())));

    const isCorrect = isAnswerRevealed && item.isCorrect;
    const isMuted = isAnswerRevealed && !item.isCorrect;

    return {
      fontSize: `${fontSize}px`,
      padding: `${paddingY}px ${paddingX}px`,
      transform: `rotate(${rotation}deg)`,
      isCorrect,
      isMuted,
      isMatchSearch,
    };
  };

  const activeInspectItem = selectedItem || hoveredItem;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* WORD CLOUD CONTROLS BAR */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {/* Display Mode Switcher: Word Cloud vs Animated Bar Chart */}
          <div className="flex items-center p-0.5 rounded-xl bg-white/10 text-xs font-bold">
            <button
              onClick={() => setDisplayType('cloud')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${
                displayType === 'cloud'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-gray-300 hover:text-white'
              }`}
              title="Word Cloud View"
            >
              <Cloud className="w-3.5 h-3.5 text-cyan-300" />
              <span>Word Cloud</span>
            </button>
            <button
              onClick={() => setDisplayType('bars')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${
                displayType === 'bars'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-gray-300 hover:text-white'
              }`}
              title="Animated Bar Chart View (Chart.js)"
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Animated Chart</span>
            </button>
          </div>

          {/* Mode Switcher: Full Phrase vs Single Words */}
          {displayType === 'cloud' && (
            <div className="flex items-center p-0.5 rounded-xl bg-white/10 text-xs font-bold">
              <button
                onClick={() => setTokenMode('phrase')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  tokenMode === 'phrase'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Full Answers
              </button>
              <button
                onClick={() => setTokenMode('words')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  tokenMode === 'words'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Word Breakdown
              </button>
            </div>
          )}
        </div>

        {/* Center / Right Controls: Search, Shuffle, Grid View Switcher */}
        <div className="flex items-center gap-2">
          {/* Quick Search / Filter Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search answer / player..."
              className="pl-8 pr-3 py-1 rounded-xl bg-white/10 text-xs text-white placeholder-gray-400 border border-white/10 focus:outline-none focus:ring-1 focus:ring-purple-400 w-36 sm:w-48"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Shuffle / Scatter Layout */}
          <button
            onClick={() => setScatterSeed((prev) => prev + 1)}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition"
            title="Re-scatter Word Cloud"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Switch back to Standard Option Grid Cards */}
          {onSwitchToGrid && (
            <button
              onClick={onSwitchToGrid}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold transition border border-white/10"
              title="Switch to Kahoot Grid Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Grid Cards</span>
            </button>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MAIN INTERACTIVE WORD CLOUD CANVAS / STAGE */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="relative min-h-[420px] sm:min-h-[460px] rounded-3xl p-6 overflow-hidden flex flex-col items-center justify-center bg-gradient-to-br from-slate-950/85 via-indigo-950/45 to-slate-950/85 border border-white/10 shadow-2xl backdrop-blur-xl">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-cyan-600/10 rounded-full blur-3xl" />
        </div>

        {/* Empty state when no answers or options */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-gray-400 z-10">
            <Cloud className="w-14 h-14 mx-auto mb-3 opacity-30 text-purple-400 animate-pulse" />
            <p className="font-bold text-lg text-gray-300">No words to display yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Words will appear and scale up live as participants vote!
            </p>
          </div>
        ) : displayType === 'bars' ? (
          <div className="w-full h-full flex-1 flex items-center justify-center z-10 p-2">
            <AnimatedBarChart
              items={filteredItems.map((item) => ({
                id: item.id,
                text: item.text,
                count: item.votes,
                isCorrect: item.isCorrect,
                voters: item.voters,
              }))}
              totalCount={totalVotes}
              isAnswerRevealed={isAnswerRevealed}
              isDark={isDark}
              onBarClick={setSelectedItem}
            />
          </div>
        ) : (
          <div className="w-full h-full flex-1 flex items-center justify-center z-10">
            <WordCloudRenderer
              words={filteredItems.map((item) => ({
                id: item.id,
                text: item.text,
                count: item.votes,
                isCorrect: item.isCorrect,
                voters: item.voters,
              }))}
              isAnswerRevealed={isAnswerRevealed}
              onHoverItem={setHoveredItem}
              onClickItem={setSelectedItem}
              minCanvasHeight={420}
              rotateRatio={0.25}
            />
          </div>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* INTERACTIVE INSPECTION FLOATING HUD (Hover or Click) */}
        {/* ────────────────────────────────────────────────────────── */}
        {activeInspectItem && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 bg-slate-900/95 border border-purple-500/40 backdrop-blur-2xl p-4 rounded-2xl shadow-2xl z-40 animate-fade-in text-white text-left">
            <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base truncate block text-purple-200">
                    "{activeInspectItem.text}"
                  </span>
                  {activeInspectItem.isCorrect && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black uppercase">
                      ✓ Correct
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  <span className="font-extrabold text-white text-sm">
                    {activeInspectItem.votes}
                  </span>{' '}
                  {activeInspectItem.votes === 1 ? 'vote' : 'votes'} (
                  {totalVotes > 0
                    ? Math.round((activeInspectItem.votes / totalVotes) * 100)
                    : 0}
                  %)
                </p>
              </div>

              {selectedItem && (
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* List of Participants who voted for this word */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 flex items-center gap-1">
                <Users className="w-3 h-3 text-purple-400" />
                <span>Participants ({activeInspectItem.voters.length}):</span>
              </span>

              {activeInspectItem.voters.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 mt-1.5">
                  {activeInspectItem.voters.map((v, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 text-xs font-semibold text-gray-200 border border-white/10"
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-purple-500 text-[9px] font-black flex items-center justify-center text-white">
                        {(v.nickname || '?')[0].toUpperCase()}
                      </span>
                      <span>{v.nickname}</span>
                      {v.timeTakenMs && (
                        <span className="text-[9px] text-gray-400 font-mono">
                          {(v.timeTakenMs / 1000).toFixed(1)}s
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic mt-1">
                  No participants have selected this word yet.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* WORD CLOUD FOOTER STATS */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 text-xs text-gray-400 font-medium">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Interactive: Click or hover any word to view voters</span>
          </span>
          {isAnswerRevealed && (
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Correct answer highlighted in gold & emerald</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span>
            {answersCount} / {totalPlayers} Responded
          </span>
          <span>·</span>
          <span>{cloudItems.length} Distinct Items</span>
        </div>
      </div>
    </div>
  );
}
