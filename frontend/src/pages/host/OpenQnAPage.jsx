import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Cloud, Users, Play, Plus, X, Trash2, RotateCcw, Lock, Unlock,
  QrCode, Copy, Check, Maximize2, Sparkles, LayoutGrid, BarChart2,
  ArrowLeft, Search, Radio, ChevronRight, MessageSquare, Download
} from 'lucide-react';
import { useSocketContext } from '@/contexts/SocketContext';
import { createOpenPollSession } from '@/api/endpoints';
import sound from '@/lib/sound';
import SoundToggle from '@/components/SoundToggle';
import WordCloudRenderer from '@/components/WordCloudRenderer';
import AnimatedBarChart from '@/components/AnimatedBarChart';

// Vibrant neon color palettes for the live word cloud
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

const PRESET_QUESTIONS = [
  'What one word best describes our product or session?',
  'What is your top learning or takeaway from today?',
  'Which programming language or tool do you love the most?',
  'What challenges are you facing in your workflow right now?',
  'What topic should we deep-dive into in our next workshop?',
];

export default function OpenQnAPage() {
  const navigate = useNavigate();
  const { getSocket } = useSocketContext();

  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingSession, setLoadingSession] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQROverlay, setShowQROverlay] = useState(false);
  const [isSlideMode, setIsSlideMode] = useState(true);

  // Active Open Question State
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [cloudWords, setCloudWords] = useState([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [totalResponders, setTotalResponders] = useState(0);
  const [viewMode, setViewMode] = useState('cloud'); // 'cloud' | 'bars'

  // Question Composer Modal State
  const [showComposer, setShowComposer] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [allowCustom, setAllowCustom] = useState(true);
  const [allowMultiple, setAllowMultiple] = useState(true);
  const [maxSubmissions, setMaxSubmissions] = useState(3);
  const [fixedOptions, setFixedOptions] = useState(['', '']);
  const [timeLimitSec, setTimeLimitSec] = useState(0);

  // Word Cloud Inspection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWord, setSelectedWord] = useState(null);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [scatterSeed, setScatterSeed] = useState(0);

  // Auto-init or resume open Q&A session
  const initSession = async () => {
    setLoadingSession(true);
    try {
      const data = await createOpenPollSession();
      const sess = data?.session || data;
      setSession(sess);
      localStorage.setItem('quizlive_active_open_session_id', String(sess.id));
      connectSessionSocket(sess.id);
      toast.success('Live Open Q&A Session created!');
    } catch (err) {
      toast.error('Failed to create session: ' + (err.message || ''));
    } finally {
      setLoadingSession(false);
    }
  };

  const connectSessionSocket = useCallback((sessId) => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
      return;
    }

    socket.emit('host:join_session', { token, sessionId: Number(sessId) });

    socket.on('session:state', ({ session: s, participants: p }) => {
      setSession(s);
      setParticipants(p || []);
    });

    socket.on('session:participant_joined', (data) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.nickname === data.nickname)) return prev;
        return [...prev, { id: data.participantId, nickname: data.nickname, score: 0 }];
      });
      sound.play('join');
      toast.success(`${data.nickname} joined the room!`, { duration: 2000, position: 'bottom-right' });
    });

    socket.on('session:open_question', (qData) => {
      setActiveQuestion(qData);
      setShowComposer(false);
      sound.play('start');
    });

    socket.on('session:open_word_cloud_update', (data) => {
      setCloudWords(data.words || []);
      setTotalSubmissions(data.totalSubmissions || 0);
      setTotalResponders(data.totalParticipants || 0);
      sound.play('click');
    });

    socket.on('session:open_word_cloud_cleared', () => {
      setCloudWords([]);
      setTotalSubmissions(0);
      setTotalResponders(0);
      toast.success('Word Cloud cleared for current question');
    });

    socket.on('session:open_question_closed', () => {
      setActiveQuestion((prev) => (prev ? { ...prev, isOpen: false } : null));
      sound.play('timeUp');
      toast.success('Voting closed by host');
    });
  }, [getSocket, navigate]);

  useEffect(() => {
    // Check if there is an active session stored
    const savedId = localStorage.getItem('quizlive_active_open_session_id');
    if (savedId) {
      connectSessionSocket(savedId);
    } else {
      initSession();
    }

    return () => {
      const socket = getSocket();
      socket.off('session:state');
      socket.off('session:participant_joined');
      socket.off('session:open_question');
      socket.off('session:open_word_cloud_update');
      socket.off('session:open_word_cloud_cleared');
      socket.off('session:open_question_closed');
    };
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'n' || e.key === 'N') {
        setShowComposer(true);
      } else if (e.key === 'w' || e.key === 'W') {
        setViewMode((v) => (v === 'cloud' ? 'bars' : 'cloud'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsSlideMode(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleCopyLink = () => {
    const joinUrl = `${window.location.origin}/join/${session?.code || ''}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success('Join link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Launch Question
  const handleLaunchQuestion = (e) => {
    e.preventDefault();
    if (!questionText.trim()) {
      toast.error('Please enter a question');
      return;
    }

    const cleanOptions = fixedOptions
      .map((opt) => opt.trim())
      .filter(Boolean)
      .map((text, idx) => ({ id: String(idx + 1), text }));

    if (!allowCustom && cleanOptions.length === 0) {
      toast.error('Please add at least one option, or allow custom answers');
      return;
    }

    const socket = getSocket();
    socket.emit('host:ask_open_question', {
      sessionId: Number(session.id),
      questionText: questionText.trim(),
      allowCustom,
      allowMultiple,
      maxSubmissions: allowMultiple ? Number(maxSubmissions) : 1,
      options: cleanOptions,
      timeLimitSec: Number(timeLimitSec),
    });

    setCloudWords([]);
    setTotalSubmissions(0);
    setTotalResponders(0);
    setShowComposer(false);
    toast.success('Question launched live to audience!');
  };

  const handleCloseVoting = () => {
    const socket = getSocket();
    socket.emit('host:close_open_question', { sessionId: Number(session.id) });
  };

  const handleClearCloud = () => {
    if (window.confirm('Clear all submitted words for this question?')) {
      const socket = getSocket();
      socket.emit('host:clear_open_question', { sessionId: Number(session.id) });
    }
  };

  const handleExportCSV = () => {
    if (cloudWords.length === 0) {
      toast.error('No answers to export');
      return;
    }
    const header = 'Word/Answer,Votes,Percentage,Voters\n';
    const rows = cloudWords.map((w) => {
      const pct = totalSubmissions > 0 ? Math.round((w.count / totalSubmissions) * 100) : 0;
      const voters = `"${(w.voters || []).join(', ')}"`;
      return `"${w.text.replace(/"/g, '""')}",${w.count},${pct}%,${voters}`;
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `open-qna-wordcloud-${session?.code || 'session'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Word Cloud responses exported to CSV!');
  };

  // Fixed options management
  const addOptionField = () => setFixedOptions((prev) => [...prev, '']);
  const updateOptionField = (idx, val) => {
    setFixedOptions((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };
  const removeOptionField = (idx) => {
    setFixedOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Filter words
  const maxVotes = cloudWords.reduce((max, w) => Math.max(max, w.count), 1);
  const filteredWords = cloudWords.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return w.text.toLowerCase().includes(q) || w.voters.some((v) => v.toLowerCase().includes(q));
  });

  const activeInspectWord = selectedWord || hoveredWord;

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isSlideMode
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white select-none'
          : 'bg-slate-50 text-gray-900'
      }`}
    >
      {/* ──────────────────────────────────────────────────────────── */}
      {/* TOP HEADER CONTROLS */}
      {/* ──────────────────────────────────────────────────────────── */}
      <header
        className={`px-6 py-4 flex items-center justify-between border-b transition-colors z-20 ${
          isSlideMode ? 'bg-black/40 border-white/10 backdrop-blur-md' : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/host')}
            className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-xl transition ${
              isSlideMode ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Digipodium Brand Pill */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-white/10">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center p-1 shadow">
              <img src="/digipodium-logo.png" alt="Digipodium Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-black text-sm text-white leading-none block">Live Word Cloud Q&A</span>
              <span className="text-[10px] text-gray-400 font-medium block">Audience Interactive Mode</span>
            </div>
          </div>

          {/* Session PIN */}
          {session?.code && (
            <div className="flex items-center gap-2 ml-2">
              <div
                className={`flex items-center gap-2 px-3.5 py-1 rounded-full font-mono font-extrabold text-sm tracking-wider shadow-sm ${
                  isSlideMode ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-800'
                }`}
              >
                <span className="text-[10px] uppercase opacity-70">PIN:</span>
                <span>{session.code}</span>
              </div>
              <button
                onClick={handleCopyLink}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs transition"
                title="Copy Join Link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Center: Live Audience Ticker */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-gray-200">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>{participants.length} Audience Joined</span>
          </div>

          {activeQuestion && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              <span>
                {totalSubmissions} Answers ({totalResponders} Voters)
              </span>
            </div>
          )}
        </div>

        {/* Right Toolbar */}
        <div className="flex items-center gap-2">
          <SoundToggle isDark={isSlideMode} />

          {/* New Question Composer Button */}
          <button
            onClick={() => setShowComposer(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white"
            title="Ask a New Question (Key: N)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Question</span>
          </button>

          {/* QR Code Modal Toggle */}
          <button
            onClick={() => setShowQROverlay((v) => !v)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs transition"
            title="Toggle QR Code Overlay"
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 transition"
            title="Toggle Fullscreen (Key: F)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* QUICK QR OVERLAY FOR LATE JOINERS */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showQROverlay && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 text-white p-8 rounded-3xl max-w-sm w-full text-center relative shadow-2xl">
            <button
              onClick={() => setShowQROverlay(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-black mb-1">Scan to Join Live!</h3>
            <p className="text-xs text-gray-400 mb-6">Open your phone camera to participate in live polls</p>
            {session?.qr_data && (
              <div className="p-4 bg-white rounded-3xl inline-block mb-4 shadow-xl">
                <img src={session.qr_data} alt="QR Code" className="w-52 h-52 object-contain" />
              </div>
            )}
            <div className="bg-white/10 p-3 rounded-2xl font-mono text-xl font-black tracking-widest text-purple-300 mb-2">
              PIN: {session?.code}
            </div>
            <p className="text-xs text-gray-400 font-mono truncate">{window.location.origin}/join/{session?.code}</p>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MAIN VIEWPORT */}
      {/* ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-6xl mx-auto w-full justify-center">
        {!activeQuestion ? (
          /* NO ACTIVE QUESTION: HERO & LAUNCH PAD */
          <div className="bg-slate-900/70 border border-white/10 backdrop-blur-xl rounded-3xl p-8 sm:p-14 text-center shadow-2xl relative overflow-hidden">
            <div className="w-20 h-20 bg-purple-600/20 border border-purple-500/40 rounded-3xl mx-auto flex items-center justify-center text-purple-300 mb-6 shadow-xl">
              <Cloud className="w-10 h-10 animate-pulse text-cyan-400" />
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-3">
              Audience Live Word Cloud
            </h1>
            <p className="text-gray-400 text-sm sm:text-base max-w-lg mx-auto mb-8">
              Ask any question on the fly. Your audience can vote on fixed options or submit their own custom words to build an interactive, living word cloud in real time.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setShowComposer(true)}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-purple-900/50 flex items-center gap-3 text-lg transition transform hover:scale-[1.02]"
              >
                <Plus className="w-5 h-5" />
                <span>Ask a Live Question</span>
              </button>

              <button
                onClick={() => setShowQROverlay(true)}
                className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl border border-white/10 transition flex items-center gap-2 text-sm"
              >
                <QrCode className="w-4 h-4 text-purple-400" />
                <span>Show Join PIN & QR ({participants.length} Joined)</span>
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE QUESTION STAGE WITH LIVE WORD CLOUD */
          <div className="flex flex-col gap-5 w-full">
            {/* Top Question Header & Status Card */}
            <div className="bg-slate-900/75 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-3 text-xs font-extrabold uppercase tracking-wider text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-cyan-300 font-black">
                    {activeQuestion.isOpen ? 'Live Poll Active' : 'Voting Closed'}
                  </span>
                  <span>·</span>
                  <span>
                    {activeQuestion.allowCustom && activeQuestion.options?.length > 0
                      ? 'Hybrid: Options + Custom Words'
                      : activeQuestion.allowCustom
                      ? 'Custom Free-text Words'
                      : 'Fixed Poll Options'}
                  </span>
                </div>

                {/* View Mode Toggle: Word Cloud vs Bar Chart */}
                <div className="flex items-center p-0.5 bg-black/40 border border-white/10 rounded-xl">
                  <button
                    onClick={() => setViewMode('cloud')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      viewMode === 'cloud' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Cloud className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Word Cloud</span>
                  </button>
                  <button
                    onClick={() => setViewMode('bars')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      viewMode === 'bars' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Poll Bars</span>
                  </button>
                </div>
              </div>

              {/* Massive Question Title */}
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-center py-4 leading-tight">
                {activeQuestion.text}
              </h1>

              {/* Fixed Options Badge Row if present */}
              {activeQuestion.options?.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <span className="text-xs text-gray-400 font-semibold mr-1">Predefined Options:</span>
                  {activeQuestion.options.map((opt) => (
                    <span
                      key={opt.id}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/15 text-purple-200"
                    >
                      {opt.text}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Stage: Interactive Word Cloud or Poll Bars */}
            {viewMode === 'cloud' ? (
              /* INTERACTIVE LIVE WORD CLOUD STAGE (Generated by WordCloud Library) */
              <div className="relative min-h-[440px] sm:min-h-[500px] rounded-3xl p-6 overflow-hidden flex flex-col items-center justify-center bg-gradient-to-br from-slate-950/85 via-indigo-950/45 to-slate-950/85 border border-white/10 shadow-2xl backdrop-blur-xl">
                {/* Radial Glow */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-cyan-600/10 rounded-full blur-3xl" />
                </div>

                {filteredWords.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 z-10">
                    <Cloud className="w-14 h-14 mx-auto mb-3 opacity-30 text-purple-400 animate-bounce" />
                    <p className="font-black text-xl text-gray-200">Waiting for audience responses...</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      Join at <span className="font-mono text-purple-300 font-bold">{window.location.origin}/join/{session?.code}</span> or scan the QR code to submit answers!
                    </p>
                  </div>
                ) : (
                  <div className="w-full h-full flex-1 flex items-center justify-center z-10">
                    <WordCloudRenderer
                      words={filteredWords}
                      onHoverItem={setHoveredWord}
                      onClickItem={setSelectedWord}
                      minCanvasHeight={460}
                      rotateRatio={0.25}
                    />
                  </div>
                )}

                {/* Interactive Word Inspection Floating HUD */}
                {activeInspectWord && (
                  <div className="absolute bottom-4 right-4 sm:right-6 sm:w-80 bg-slate-900/95 border border-purple-500/40 backdrop-blur-2xl p-4 rounded-2xl shadow-2xl z-40 animate-fade-in text-white text-left">
                    <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2 mb-2">
                      <div>
                        <span className="font-black text-base block text-purple-200">
                          "{activeInspectWord.text}"
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">
                          <span className="font-extrabold text-white text-sm">{activeInspectWord.count}</span>{' '}
                          {activeInspectWord.count === 1 ? 'vote' : 'votes'} (
                          {totalSubmissions > 0
                            ? Math.round((activeInspectWord.count / totalSubmissions) * 100)
                            : 0}
                          %)
                        </p>
                      </div>
                      {selectedWord && (
                        <button
                          onClick={() => setSelectedWord(null)}
                          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 flex items-center gap-1">
                        <Users className="w-3 h-3 text-purple-400" />
                        <span>Audience Voters ({activeInspectWord.voters.length}):</span>
                      </span>

                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 mt-1">
                        {activeInspectWord.voters.map((v, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 text-xs font-semibold text-gray-200 border border-white/10"
                          >
                            <span className="w-3.5 h-3.5 rounded-full bg-purple-500 text-[9px] font-black flex items-center justify-center text-white">
                              {(v || '?')[0].toUpperCase()}
                            </span>
                            <span>{v}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ANIMATED POLL BARS VIEW (Chart.js Library) */
              <div className="bg-slate-900/80 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl">
                <AnimatedBarChart
                  items={filteredWords}
                  totalCount={totalSubmissions}
                  onBarClick={setSelectedWord}
                  isDark={isSlideMode}
                />
              </div>
            )}

            {/* Bottom Presenter Toolbar */}
            <div className="bg-slate-900/80 border border-white/10 backdrop-blur-xl rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {activeQuestion.isOpen ? (
                  <button
                    onClick={handleCloseVoting}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl transition shadow flex items-center gap-1.5 text-xs"
                    title="Lock Voting"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Voting</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const socket = getSocket();
                      socket.emit('host:ask_open_question', {
                        sessionId: Number(session.id),
                        questionText: activeQuestion.text,
                        allowCustom: activeQuestion.allowCustom,
                        allowMultiple: activeQuestion.allowMultiple,
                        maxSubmissions: activeQuestion.maxSubmissions,
                        options: activeQuestion.options,
                        timeLimitSec: 0,
                      });
                      toast.success('Voting re-opened!');
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl transition shadow flex items-center gap-1.5 text-xs"
                    title="Re-open Voting"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Re-open Voting</span>
                  </button>
                )}

                <button
                  onClick={handleClearCloud}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold transition flex items-center gap-1.5"
                  title="Clear all responses"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Clear Cloud</span>
                </button>

                <button
                  onClick={() => setScatterSeed((p) => p + 1)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold transition flex items-center gap-1.5"
                  title="Re-scatter layout"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Re-scatter</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold transition flex items-center gap-1.5"
                  title="Export responses as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Right: Quick Search & Next Question */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search word / voter..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-white/10 text-xs text-white placeholder-gray-400 border border-white/10 focus:outline-none focus:ring-1 focus:ring-purple-400 w-36 sm:w-44"
                  />
                </div>

                <button
                  onClick={() => setShowComposer(true)}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl transition shadow flex items-center gap-2 text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Next Question</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* QUESTION COMPOSER MODAL */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 text-white p-6 sm:p-8 rounded-3xl max-w-xl w-full shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowComposer(false)}
              className="absolute top-5 right-5 p-2 text-gray-400 hover:text-white rounded-full bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black">Ask Audience a Question</h3>
                <p className="text-xs text-gray-400">Launch a live open-ended question or poll</p>
              </div>
            </div>

            <form onSubmit={handleLaunchQuestion} className="space-y-5">
              {/* Question Text */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-300 mb-1.5">
                  Question Text <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="e.g. In one word, how do you feel about today's presentation?"
                  className="w-full p-3.5 rounded-2xl bg-white/10 border border-white/15 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 font-bold text-sm"
                  required
                />
              </div>

              {/* Preset suggestions */}
              <div>
                <span className="block text-[11px] font-bold text-gray-400 mb-1.5">Quick Inspiration:</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_QUESTIONS.map((pq, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setQuestionText(pq)}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-white/5 hover:bg-purple-600/30 text-gray-300 hover:text-white border border-white/10 transition text-left"
                    >
                      {pq}
                    </button>
                  ))}
                </div>
              </div>

              {/* Answering Modes Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold block">Allow Custom Words</span>
                    <span className="text-[10px] text-gray-400 block">Audience can type free-text answers</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowCustom}
                    onChange={(e) => setAllowCustom(e.target.checked)}
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold block">Multiple Submissions</span>
                    <span className="text-[10px] text-gray-400 block">Audience can submit multiple words</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowMultiple}
                    onChange={(e) => setAllowMultiple(e.target.checked)}
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                  />
                </label>
              </div>

              {allowMultiple && (
                <div className="flex items-center justify-between text-xs font-bold text-gray-300 px-1">
                  <span>Max Submissions Per Participant:</span>
                  <select
                    value={maxSubmissions}
                    onChange={(e) => setMaxSubmissions(Number(e.target.value))}
                    className="bg-slate-800 border border-white/20 rounded-xl px-3 py-1 text-white font-mono"
                  >
                    <option value={1}>1 word</option>
                    <option value={3}>3 words (Recommended)</option>
                    <option value={5}>5 words</option>
                    <option value={10}>10 words</option>
                  </select>
                </div>
              )}

              {/* Predefined Fixed Options (Optional) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-gray-300">
                    Fixed Poll Choices (Optional)
                  </span>
                  <button
                    type="button"
                    onClick={addOptionField}
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Option</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {fixedOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs font-mono text-purple-300 shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOptionField(idx, e.target.value)}
                        placeholder={`Option ${idx + 1} (optional)`}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-400 font-semibold"
                      />
                      {fixedOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOptionField(idx)}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowComposer(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl shadow-lg transition flex items-center gap-2 text-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Broadcast Question Live</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
