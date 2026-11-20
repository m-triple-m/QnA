import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users, Play, ChevronRight, CheckCircle2, Trophy,
  Download, Copy, Check, ArrowLeft, AlertCircle, Clock, Loader2,
  Maximize2, Minimize2, QrCode, BarChart3, Volume2, VolumeX,
  FastForward, Award, Sparkles, RefreshCw, X, Radio
} from 'lucide-react';
import { useSocketContext } from '@/contexts/SocketContext';
import { exportSessionResults } from '@/api/endpoints';
import sound from '@/lib/sound';
import SoundToggle from '@/components/SoundToggle';
import ParticipantMiniScreen from '@/components/ParticipantMiniScreen';
import HostParticipantSidebar from '@/components/HostParticipantSidebar';
import { getMediaUrl } from '@/lib/utils';

// Kahoot geometric shape themes
const OPTION_STYLES = [
  { bg: 'bg-red-500 hover:bg-red-600', ring: 'ring-red-400', light: 'bg-red-50 text-red-700', shape: '▲', colorName: 'Red' },
  { bg: 'bg-blue-500 hover:bg-blue-600', ring: 'ring-blue-400', light: 'bg-blue-50 text-blue-700', shape: '◆', colorName: 'Blue' },
  { bg: 'bg-amber-500 hover:bg-amber-600', ring: 'ring-amber-400', light: 'bg-amber-50 text-amber-700', shape: '●', colorName: 'Yellow' },
  { bg: 'bg-emerald-500 hover:bg-emerald-600', ring: 'ring-emerald-400', light: 'bg-emerald-50 text-emerald-700', shape: '■', colorName: 'Green' },
  { bg: 'bg-purple-500 hover:bg-purple-600', ring: 'ring-purple-400', light: 'bg-purple-50 text-purple-700', shape: '★', colorName: 'Purple' },
  { bg: 'bg-pink-500 hover:bg-pink-600', ring: 'ring-pink-400', light: 'bg-pink-50 text-pink-700', shape: '✦', colorName: 'Pink' },
];

export default function HostSessionPage() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const { getSocket } = useSocketContext();

  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [answersCount, setAnswersCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeUpData, setTimeUpData] = useState(null);
  const [finalResults, setFinalResults] = useState(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Presentation / Slide mode controls
  const [isSlideMode, setIsSlideMode] = useState(true);
  const [showSlideLeaderboard, setShowSlideLeaderboard] = useState(false);
  const [showQROverlay, setShowQROverlay] = useState(false);
  const [showMiniScreen, setShowMiniScreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(() => {
    return localStorage.getItem('quizlive_host_sidebar') !== 'false';
  });
  const [soundMuted, setSoundMuted] = useState(false);
  const [optionVotes, setOptionVotes] = useState({}); // { [optionId]: count }
  const [autoReveal, setAutoReveal] = useState(() => {
    return localStorage.getItem('quizlive_auto_reveal') === 'true';
  });

  const timerRef = useRef(null);
  const containerRef = useRef(null);

  const isAnswerRevealed = Boolean(timeUpData?.correctOptions?.length);
  const isVotingClosed = timeRemaining === 0 || Boolean(timeUpData?.votingClosed) || isAnswerRevealed;

  const toggleAutoReveal = () => {
    const nextVal = !autoReveal;
    setAutoReveal(nextVal);
    localStorage.setItem('quizlive_auto_reveal', String(nextVal));
    const socket = getSocket();
    socket.emit('host:set_auto_reveal', { sessionId: Number(sessionId), autoReveal: nextVal });
    toast.success(nextVal ? 'Auto-Reveal Answer: Enabled' : 'Manual Reveal: Enabled');
  };

  // Toggle browser Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsSlideMode(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Connect socket on mount
  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast.error('Authentication required');
      navigate('/login');
      return;
    }

    // Join room
    socket.emit('host:join_session', { token, sessionId: Number(sessionId) });
    socket.emit('host:set_auto_reveal', { sessionId: Number(sessionId), autoReveal });

    // Handle initial state
    socket.on('session:state', ({ session: initialSession, participants: initialParticipants }) => {
      setSession(initialSession);
      setParticipants(initialParticipants || []);
    });

    // Participant joined
    socket.on('session:participant_joined', (data) => {
      const name = data.nickname || data;
      setParticipants((prev) => {
        if (prev.some((p) => p.nickname === name)) return prev;
        return [
          ...prev,
          {
            id: data.participantId,
            nickname: name,
            score: data.score || 0,
            hasVoted: false,
          },
        ];
      });
      sound.play('join');
      toast.success(`${name} joined!`, { duration: 2500, position: 'bottom-right' });
    });

    // Quiz started
    socket.on('session:started', () => {
      setSession((prev) => (prev ? { ...prev, status: 'live' } : prev));
      setShowSlideLeaderboard(false);
      sound.play('start');
    });

    // Next question received
    socket.on('session:question', (qPayload) => {
      setCurrentQuestion(qPayload);
      setTimeRemaining(qPayload.time_limit_sec);
      setAnswersCount(0);
      setCorrectCount(0);
      setTimeUpData(null);
      setShowSlideLeaderboard(false);
      setOptionVotes({});

      // Reset each participant's vote status for this new question
      setParticipants((prev) =>
        prev.map((p) => ({ ...p, hasVoted: false, timeTakenMs: null }))
      );

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          if (prev <= 6) {
            sound.play('urgentTick');
          } else {
            sound.play('tick');
          }
          return prev - 1;
        });
      }, 1000);
    });

    // Participant answer with live option voting count and roster update
    socket.on('session:answer_received', (data) => {
      setAnswersCount((prev) => prev + 1);
      if (data.isCorrect) setCorrectCount((prev) => prev + 1);
      if (data.optionId) {
        setOptionVotes((prev) => ({
          ...prev,
          [data.optionId]: (prev[data.optionId] || 0) + 1,
        }));
      }

      // Mark this participant as voted in the live roster
      setParticipants((prev) =>
        prev.map((p) => {
          if (
            (data.participantId && p.id === data.participantId) ||
            (data.nickname && p.nickname === data.nickname)
          ) {
            return {
              ...p,
              hasVoted: true,
              timeTakenMs: data.timeTakenMs || p.timeTakenMs,
              score: data.score !== undefined ? data.score : p.score,
            };
          }
          return p;
        })
      );
    });

    // Time Up / Voting Closed
    socket.on('session:time_up', (data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeRemaining(0);
      setTimeUpData(data);
      sound.play('timeUp');
    });

    // Answer Revealed
    socket.on('session:answer_revealed', (data) => {
      setTimeUpData((prev) => ({
        ...prev,
        ...data,
      }));
      sound.play('correct');
    });

    // Leaderboard update
    socket.on('session:leaderboard', ({ leaderboard: lb }) => {
      setLeaderboard(lb || []);
    });

    // Quiz Ended
    socket.on('session:ended', ({ finalLeaderboard }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setSession((prev) => (prev ? { ...prev, status: 'ended' } : prev));
      setFinalResults(finalLeaderboard || []);
      setShowSlideLeaderboard(true);
      sound.play('fanfare');
    });

    // Errors
    socket.on('error', (err) => {
      toast.error(err.message || 'Session error');
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.off('session:state');
      socket.off('session:participant_joined');
      socket.off('session:started');
      socket.off('session:question');
      socket.off('session:answer_received');
      socket.off('session:time_up');
      socket.off('session:answer_revealed');
      socket.off('session:leaderboard');
      socket.off('session:ended');
      socket.off('error');
    };
  }, [sessionId, getSocket, navigate, soundMuted, autoReveal]);

  // Host Actions
  const handleStartQuiz = useCallback(() => {
    const socket = getSocket();
    socket.emit('host:start_session', { sessionId: Number(sessionId) });
  }, [getSocket, sessionId]);

  const handleRevealAnswer = useCallback(() => {
    const socket = getSocket();
    socket.emit('host:reveal_answer', { sessionId: Number(sessionId) });
  }, [getSocket, sessionId]);

  const handleNextQuestion = useCallback(() => {
    if (!currentQuestion) return;
    const socket = getSocket();
    const nextIdx = currentQuestion.questionIndex + 1;
    if (nextIdx >= currentQuestion.total) {
      handleEndQuiz();
    } else {
      socket.emit('host:next_question', { sessionId: Number(sessionId), questionIndex: nextIdx });
    }
  }, [currentQuestion, getSocket, sessionId]);

  const handleEndQuiz = useCallback(() => {
    const socket = getSocket();
    socket.emit('host:end_session', { sessionId: Number(sessionId) });
  }, [getSocket, sessionId]);

  const toggleSidebar = useCallback(() => {
    setShowSidebar((prev) => {
      const next = !prev;
      localStorage.setItem('quizlive_host_sidebar', String(next));
      return next;
    });
  }, []);

  // Keyboard navigation shortcuts for smooth live presentation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (!session?.status || session?.status === 'waiting') {
          if (participants.length > 0) handleStartQuiz();
        } else if (session?.status === 'live') {
          if (!isAnswerRevealed) {
            handleRevealAnswer(); // reveal answers
          } else if (!showSlideLeaderboard && leaderboard.length > 0) {
            setShowSlideLeaderboard(true); // show leaderboard slide
          } else {
            handleNextQuestion(); // advance to next question
          }
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 's' || e.key === 'S') {
        toggleSidebar();
      } else if (e.key === 'l' || e.key === 'L') {
        setShowSlideLeaderboard((prev) => !prev);
      } else if (e.key === 'q' || e.key === 'Q') {
        setShowQROverlay((prev) => !prev);
      } else if (e.key === 'p' || e.key === 'P') {
        setShowMiniScreen((prev) => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        sound.toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, participants, timeUpData, showSlideLeaderboard, leaderboard, handleStartQuiz, handleRevealAnswer, handleNextQuestion, toggleSidebar]);

  const handleCopyLink = () => {
    const joinUrl = `${window.location.origin}/join/${session?.code || ''}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success('Join link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await exportSessionResults(sessionId);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `session-${session?.code || sessionId}-results.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Results exported to CSV');
    } catch {
      toast.error('Failed to export results');
    } finally {
      setExporting(false);
    }
  };

  const joinUrl = `${window.location.origin}/join/${session?.code || ''}`;
  const totalPlayers = participants.length || 0;
  const answerPercentage = totalPlayers > 0 ? Math.round((answersCount / totalPlayers) * 100) : 0;

  return (
    <div
      ref={containerRef}
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isSlideMode
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white select-none'
          : 'bg-slate-50 text-gray-900'
      }`}
    >
      {/* ──────────────────────────────────────────────────────────── */}
      {/* TOP HEADER CONTROLS (Slide & Dashboard Mode) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <header
        className={`px-6 py-4 flex items-center justify-between border-b transition-colors z-20 ${
          isSlideMode ? 'bg-black/30 border-white/10 backdrop-blur-md' : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/host/quizzes')}
            className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-xl transition ${
              isSlideMode
                ? 'text-gray-300 hover:text-white hover:bg-white/10'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>

          {/* Digipodium Brand Pill */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-white/10">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center p-1 shadow">
              <img src="/digipodium-logo.png" alt="Digipodium Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-extrabold text-xs text-white leading-none block">QuizLive</span>
              <span className="text-[9px] text-gray-400 font-medium block">by Digipodium</span>
            </div>
          </div>

          {/* Session PIN & Join URL */}
          {session?.code && (
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono font-extrabold text-base tracking-wider shadow-sm ${
                  isSlideMode
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                <span className="text-xs uppercase tracking-normal opacity-70">PIN:</span>
                <span>{session.code}</span>
              </div>
              <button
                onClick={handleCopyLink}
                className={`p-2 rounded-xl transition text-xs flex items-center gap-1.5 ${
                  isSlideMode
                    ? 'bg-white/10 hover:bg-white/20 text-gray-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title="Copy Join Link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Center: Live Audience Ticker */}
        <div className="hidden lg:flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
              isSlideMode ? 'bg-white/10 text-gray-200' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>{totalPlayers} Players Joined</span>
          </div>

          {session?.status === 'live' && (
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                isSlideMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>
                {answersCount} / {totalPlayers} Answered ({answerPercentage}%)
              </span>
            </div>
          )}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {/* Audio sound effects toggle */}
          <SoundToggle isDark={isSlideMode} />

          {/* Auto-Reveal toggle */}
          <button
            onClick={toggleAutoReveal}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
              autoReveal
                ? 'bg-emerald-600/80 hover:bg-emerald-600 text-white border border-emerald-400/40'
                : 'bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 border border-amber-400/30'
            }`}
            title="When disabled, host manually clicks 'Reveal Answer' on each slide after time runs out"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{autoReveal ? 'Auto Reveal' : 'Manual Reveal'}</span>
          </button>

          {/* Live Participant & Score Sidebar Toggle */}
          <button
            onClick={toggleSidebar}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
              showSidebar
                ? 'bg-purple-600 text-white shadow-purple-900/50'
                : isSlideMode
                ? 'bg-white/10 hover:bg-white/20 text-gray-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title="Toggle Live Participants & Score Leaderboard Sidebar (Key: S)"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Sidebar</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
              {participants.length}
            </span>
          </button>

          {/* Mini Screen / Live Roster Toggle */}
          <button
            onClick={() => setShowMiniScreen((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
              showMiniScreen
                ? 'bg-purple-600 text-white shadow-purple-900/50'
                : isSlideMode
                ? 'bg-white/10 hover:bg-white/20 text-gray-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title="Toggle Live Roster & Vote Status Mini Screen (Key: P)"
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Roster</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
              {participants.filter((p) => p.hasVoted).length}/{participants.length}
            </span>
          </button>

          {/* Quick QR popover toggle */}
          <button
            onClick={() => setShowQROverlay((v) => !v)}
            className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold ${
              showQROverlay
                ? 'bg-purple-600 text-white'
                : isSlideMode
                ? 'bg-white/10 hover:bg-white/20 text-gray-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title="Toggle QR Code for Late Joiners (Key: Q)"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">QR</span>
          </button>

          {/* Toggle Slide / Dashboard Mode */}
          <button
            onClick={() => setIsSlideMode((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
              isSlideMode
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-900/50'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
            title="Toggle Slide Presentation Mode"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSlideMode ? 'Slide Deck' : 'Compact View'}</span>
          </button>

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl transition ${
              isSlideMode
                ? 'bg-white/10 hover:bg-white/20 text-gray-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title="Toggle Fullscreen (Key: F)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* QUICK QR FLOATING MODAL (For Late Joiners) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showQROverlay && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 text-white p-8 rounded-3xl max-w-md w-full text-center relative shadow-2xl animate-fade-in">
            <button
              onClick={() => setShowQROverlay(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-black mb-2">Scan to Join Quiz!</h3>
            <p className="text-sm text-gray-400 mb-6">Open phone camera or navigate to the URL below</p>
            {session?.qr_data && (
              <div className="p-4 bg-white rounded-2xl inline-block mb-4 shadow-lg">
                <img src={session.qr_data} alt="QR Code" className="w-56 h-56 object-contain" />
              </div>
            )}
            <div className="bg-white/10 p-3 rounded-2xl font-mono text-xl font-black tracking-widest text-purple-300 mb-4">
              PIN: {session?.code}
            </div>
            <p className="text-xs text-gray-400 font-mono truncate">{joinUrl}</p>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MAIN VIEWPORT WITH PARTICIPANT SIDEBAR DOCK */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-7xl mx-auto w-full justify-center overflow-y-auto">
        {/* ======================================================== */}
        {/* SLIDE 1: LOBBY / WAITING ROOM SLIDE */}
        {/* ======================================================== */}
        {(!session?.status || session?.status === 'waiting') && (
          <div
            className={`w-full rounded-3xl p-6 sm:p-12 transition-all ${
              isSlideMode
                ? 'bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-2xl'
                : 'bg-white rounded-3xl p-8 shadow-sm border border-gray-100'
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Giant QR & Stage Invite */}
              <div className="lg:col-span-5 flex flex-col items-center text-center p-4 lg:border-r border-white/10">
                <div className="flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-white/10 border border-white/10 shadow-sm">
                  <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center p-0.5">
                    <img src="/digipodium-logo.png" alt="Digipodium Logo" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-200">
                    QuizLive <span className="opacity-75 font-medium lowercase">powered by</span> Digipodium
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">Join The Game!</h1>
                <p className="text-gray-400 text-sm sm:text-base max-w-xs mb-6">
                  Scan the QR code on your phone or enter the PIN to join
                </p>

                {/* QR Code Container with subtle ambient glow */}
                {session?.qr_data ? (
                  <div className="p-4 bg-white rounded-3xl shadow-2xl ring-8 ring-purple-500/20 mb-6">
                    <img src={session.qr_data} alt="QR Code" className="w-56 h-56 object-contain" />
                  </div>
                ) : (
                  <div className="w-56 h-56 bg-white/10 rounded-3xl flex items-center justify-center text-gray-400 mb-6 animate-pulse">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                )}

                <div className="bg-purple-600/20 border border-purple-500/40 text-purple-200 px-6 py-2.5 rounded-2xl font-mono text-2xl font-black tracking-widest mb-4">
                  PIN: {session?.code}
                </div>
              </div>

              {/* Right Column: Participant Waiting Lounge */}
              <div className="lg:col-span-7 flex flex-col justify-between h-full p-4">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-purple-300">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-extrabold">Waiting Lounge</h3>
                        <p className="text-xs text-gray-400">Players currently connected</p>
                      </div>
                    </div>
                    <span className="text-2xl font-black text-purple-400">
                      {participants.length}
                    </span>
                  </div>

                  {/* Dynamic Participant Chips Grid */}
                  <div
                    className={`min-h-[260px] max-h-[360px] overflow-y-auto rounded-2xl p-4 transition-colors ${
                      isSlideMode ? 'bg-black/30 border border-white/5' : 'bg-gray-50 border border-gray-100'
                    }`}
                  >
                    {participants.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-16 text-center text-gray-500">
                        <Users className="w-12 h-12 mb-3 opacity-30 animate-pulse" />
                        <p className="text-base font-semibold">Waiting for players to scan QR code...</p>
                        <p className="text-xs text-gray-500 mt-1">Names will appear automatically</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2.5">
                        {participants.map((p, i) => (
                          <div
                            key={i}
                            className={`px-4 py-2 rounded-2xl text-sm font-bold shadow-md flex items-center gap-2 animate-scale-in ${
                              isSlideMode
                                ? 'bg-white/10 text-white border border-white/15'
                                : 'bg-white text-gray-800 border border-gray-200'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span>{p.nickname}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Big Launch Button */}
                <div className="mt-8">
                  <button
                    onClick={handleStartQuiz}
                    disabled={participants.length === 0}
                    className="w-full py-5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white font-black rounded-2xl shadow-xl shadow-purple-900/40 flex items-center justify-center gap-3 text-xl transition-all transform hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Play className="w-6 h-6 fill-white" />
                    <span>Start Quiz Presentation</span>
                    <span className="text-xs bg-white/20 px-2.5 py-1 rounded-lg uppercase tracking-wider font-semibold ml-2 hidden sm:inline">
                      Space / ➔
                    </span>
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-2">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Space</kbd> or click button when ready
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SLIDE 2: LIVE QUESTION & LIVE VOTING PRESENTATION */}
        {/* ======================================================== */}
        {session?.status === 'live' && currentQuestion && !showSlideLeaderboard && (
          <div className="flex flex-col gap-6 w-full">
            {/* Top Progress & Timer Bar */}
            <div
              className={`rounded-3xl p-6 sm:p-10 transition-all relative overflow-hidden ${
                isSlideMode
                  ? 'bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-2xl'
                  : 'bg-white border border-gray-100 shadow-sm'
              }`}
            >
              {/* Top Countdown Bar */}
              <div className="absolute top-0 left-0 right-0 h-2.5 bg-white/10">
                <div
                  className={`h-full transition-all duration-1000 ${
                    timeRemaining <= 5
                      ? 'bg-red-500 animate-pulse'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (timeRemaining / (currentQuestion.time_limit_sec || 30)) * 100
                    )}%`,
                  }}
                />
              </div>

              {/* Slide Meta Banner: Question Index + Live Ticker + Timer */}
              <div className="flex items-center justify-between mb-4 pt-1">
                <div className="flex items-center gap-3">
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Question {currentQuestion.questionIndex + 1} of {currentQuestion.total}
                  </span>
                  <span className="hidden sm:inline-block text-xs uppercase tracking-wider text-gray-400 font-semibold">
                    {currentQuestion.type?.replace('_', ' ')} · {currentQuestion.points || 10} pts
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Circular Timer Pill */}
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-lg shadow-inner ${
                      timeRemaining <= 5
                        ? 'bg-red-500 text-white animate-bounce'
                        : isSlideMode
                        ? 'bg-white/10 text-white border border-white/10'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    <Clock className="w-5 h-5" />
                    <span className="font-mono">{timeRemaining}s</span>
                  </div>

                  {/* Live Responses Badge */}
                  <div
                    className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl font-extrabold text-sm ${
                      isSlideMode ? 'bg-white/10 text-gray-200' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>
                      {answersCount} / {totalPlayers} Votes
                    </span>
                  </div>
                </div>
              </div>

              {/* Large Question Text (Slide Header) */}
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-center py-6 leading-tight max-w-5xl mx-auto">
                {currentQuestion.text}
              </h2>

              {/* Question Media if provided */}
              {currentQuestion.media_url && (
                <div className="flex justify-center mb-6">
                  <img
                    src={getMediaUrl(currentQuestion.media_url)}
                    alt="Question visual"
                    className="max-h-72 sm:max-h-80 rounded-2xl object-contain shadow-2xl border border-white/10 bg-black/20"
                  />
                </div>
              )}

              {/* Kahoot-Style Options Grid with Live Voting Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {currentQuestion.options?.map((opt, i) => {
                  const style = OPTION_STYLES[i % OPTION_STYLES.length];
                  const isCorrect = isAnswerRevealed && timeUpData?.correctOptions?.some((co) => co.id === opt.id);
                  const votes = optionVotes[opt.id] || 0;
                  const votePercent =
                    answersCount > 0 ? Math.round((votes / answersCount) * 100) : 0;

                  return (
                    <div
                      key={opt.id || i}
                      className={`relative p-6 rounded-3xl overflow-hidden font-bold text-xl sm:text-2xl shadow-lg transition-all duration-300 flex flex-col justify-between min-h-[120px] ${
                        isAnswerRevealed
                          ? isCorrect
                            ? 'ring-4 ring-emerald-400 bg-emerald-500 text-white scale-[1.02] shadow-emerald-900/50'
                            : 'opacity-35 bg-slate-800 text-gray-400 scale-[0.98]'
                          : `${style.bg} text-white`
                      }`}
                    >
                      {/* Background Vote Percentage Fill Bar (Live update as answers come in!) */}
                      {answersCount > 0 && (
                        <div
                          className="absolute inset-0 bg-black/20 pointer-events-none transition-all duration-500"
                          style={{ width: `${votePercent}%` }}
                        />
                      )}

                      {/* Top Row: Geometric Icon + Option Text */}
                      <div className="relative z-10 flex items-start gap-4 justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-2xl bg-black/20 flex items-center justify-center font-black text-xl shrink-0">
                            {style.shape}
                          </span>
                          {opt.text && <span className="leading-snug">{opt.text}</span>}
                        </div>

                        {/* Status Checkmark when Answer Revealed */}
                        {isAnswerRevealed && isCorrect && (
                          <div className="bg-white text-emerald-600 rounded-full p-1.5 shadow-md shrink-0">
                            <CheckCircle2 className="w-7 h-7" />
                          </div>
                        )}
                      </div>

                      {/* Option Image if attached */}
                      {opt.media_url && (
                        <div className="relative z-10 w-full h-32 sm:h-44 my-3 rounded-2xl overflow-hidden bg-black/25 flex items-center justify-center p-2 shadow-inner">
                          <img
                            src={getMediaUrl(opt.media_url)}
                            alt={opt.text || `Option ${i + 1}`}
                            className="w-full h-full object-contain rounded-xl"
                          />
                        </div>
                      )}

                      {/* Bottom Row: Live Vote Count & Percentage Bar */}
                      <div className="relative z-10 flex items-center justify-between text-xs sm:text-sm font-extrabold uppercase tracking-wider mt-4 opacity-90">
                        <span>
                          {votes} {votes === 1 ? 'vote' : 'votes'}
                        </span>
                        <span>{votePercent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Presenter Toolbar */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm text-gray-400 font-semibold">
                  <div className={`w-2.5 h-2.5 rounded-full ${isVotingClosed ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`} />
                  <span>
                    {isVotingClosed
                      ? `Voting Closed: ${answersCount} of ${totalPlayers} responded`
                      : `Live Voting: ${answersCount} of ${totalPlayers} participants responded`}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {!isVotingClosed ? (
                    /* Voting is still open */
                    <button
                      onClick={handleRevealAnswer}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl transition shadow-lg flex items-center gap-2 text-sm"
                      title="Close voting and reveal answer early (Key: Space)"
                    >
                      <FastForward className="w-4 h-4 fill-current" />
                      <span>Close & Reveal</span>
                    </button>
                  ) : !isAnswerRevealed ? (
                    /* Voting closed, host decides when to reveal */
                    <button
                      onClick={handleRevealAnswer}
                      className="px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black rounded-2xl transition shadow-xl shadow-amber-900/40 flex items-center gap-2 text-base animate-pulse"
                      title="Reveal Correct Answer (Key: Space)"
                    >
                      <FastForward className="w-5 h-5 fill-current" />
                      <span>Reveal Answer</span>
                      <span className="text-xs bg-black/20 px-2 py-0.5 rounded font-mono hidden sm:inline">Space</span>
                    </button>
                  ) : (
                    /* Answer has been revealed */
                    <>
                      {/* Show Leaderboard Slide Button */}
                      <button
                        onClick={() => setShowSlideLeaderboard(true)}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl transition shadow-lg flex items-center gap-2 text-sm"
                        title="Show Live Scoreboard Slide (Key: L)"
                      >
                        <Trophy className="w-4 h-4 text-amber-300" />
                        <span>Leaderboard</span>
                      </button>

                      {/* Next Question Button */}
                      <button
                        onClick={handleNextQuestion}
                        className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition shadow-lg flex items-center gap-2 text-sm"
                        title="Advance to Next Question (Key: Space)"
                      >
                        <span>
                          {currentQuestion.questionIndex + 1 >= currentQuestion.total
                            ? 'Finish Quiz'
                            : 'Next Question'}
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleEndQuiz}
                    className="px-3.5 py-2.5 rounded-2xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition"
                  >
                    End Quiz
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SLIDE 3: INTERMEDIATE LEADERBOARD SLIDE */}
        {/* ======================================================== */}
        {session?.status === 'live' && showSlideLeaderboard && (
          <div
            className={`w-full rounded-3xl p-6 sm:p-12 transition-all max-w-4xl mx-auto ${
              isSlideMode
                ? 'bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-2xl'
                : 'bg-white rounded-3xl p-8 shadow-sm border border-gray-100'
            }`}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-3xl font-black">Live Scoreboard</h2>
                  <p className="text-xs text-gray-400">
                    Standings after Question {currentQuestion ? currentQuestion.questionIndex + 1 : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={handleNextQuestion}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-xl flex items-center gap-2 text-sm transition"
              >
                <span>
                  {currentQuestion && currentQuestion.questionIndex + 1 >= currentQuestion.total
                    ? 'Final Results'
                    : 'Next Question'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Top 5 Highlighted Podiums */}
            <div className="space-y-3 mb-8">
              {leaderboard.slice(0, 7).map((entry, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all ${
                    idx === 0
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 shadow-lg shadow-amber-950/20'
                      : idx === 1
                      ? 'bg-slate-400/20 border-slate-400/40 text-slate-200'
                      : idx === 2
                      ? 'bg-orange-600/20 border-orange-500/40 text-orange-200'
                      : isSlideMode
                      ? 'bg-white/5 border-white/5 text-gray-300'
                      : 'bg-gray-50 border-gray-100 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 shadow-md'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-orange-500 text-white'
                          : 'bg-white/10 text-gray-400'
                      }`}
                    >
                      {entry.rank || idx + 1}
                    </span>
                    <span className="font-extrabold text-xl">{entry.nickname}</span>
                  </div>
                  <span className="font-black text-2xl tracking-tight text-purple-400">
                    {entry.score} <span className="text-xs uppercase opacity-70">pts</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="text-center text-xs text-gray-500">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Space</kbd> to proceed to next question
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SLIDE 4: QUIZ FINALE & PODIUM SCREEN */}
        {/* ======================================================== */}
        {session?.status === 'ended' && (
          <div
            className={`w-full max-w-3xl mx-auto rounded-3xl p-8 sm:p-12 text-center transition-all ${
              isSlideMode
                ? 'bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-2xl'
                : 'bg-white rounded-3xl p-8 shadow-sm border border-gray-100'
            }`}
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-400/20 border border-amber-400/30 rounded-3xl mb-4 text-amber-400">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black mb-2">Quiz Completed!</h1>
            <p className="text-gray-400 mb-8 text-base">
              Outstanding game! Here are the final champions and podium standings.
            </p>

            {/* Top 3 Podium Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {(finalResults || leaderboard).slice(0, 3).map((p, idx) => {
                const medals = [
                  { label: 'Champion', color: 'border-amber-400 bg-amber-500/20 text-amber-300', emoji: '🥇' },
                  { label: '2nd Place', color: 'border-slate-300 bg-slate-400/20 text-slate-200', emoji: '🥈' },
                  { label: '3rd Place', color: 'border-orange-500 bg-orange-500/20 text-orange-300', emoji: '🥉' },
                ];
                const medal = medals[idx] || medals[0];

                return (
                  <div
                    key={idx}
                    className={`p-6 rounded-3xl border-2 flex flex-col items-center justify-center shadow-xl ${medal.color}`}
                  >
                    <span className="text-4xl mb-2">{medal.emoji}</span>
                    <span className="text-xs uppercase font-extrabold tracking-widest opacity-80 mb-1">
                      {medal.label}
                    </span>
                    <span className="text-2xl font-black truncate max-w-[180px] mb-2">{p.nickname}</span>
                    <span className="text-lg font-extrabold text-purple-300">{p.score} pts</span>
                  </div>
                );
              })}
            </div>

            {/* Full standings list */}
            {(finalResults || leaderboard).length > 3 && (
              <div className="space-y-2 mb-8 text-left max-h-56 overflow-y-auto pr-2">
                {(finalResults || leaderboard).slice(3).map((p, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-sm font-bold ${
                      isSlideMode ? 'bg-white/5 border-white/5 text-gray-300' : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs">
                        {idx + 4}
                      </span>
                      <span>{p.nickname}</span>
                    </div>
                    <span className="text-purple-400 font-extrabold">{p.score} pts</span>
                  </div>
                ))}
              </div>
            )}

            {/* Export and Exit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold px-8 py-4 rounded-2xl shadow-xl transition"
              >
                {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                <span>Export Results (CSV)</span>
              </button>
              <button
                onClick={() => navigate('/host/quizzes')}
                className={`px-8 py-4 rounded-2xl font-extrabold border transition ${
                  isSlideMode
                    ? 'border-white/20 text-gray-300 hover:bg-white/10'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Back to Quizzes
              </button>
            </div>
          </div>
        )}
      </main>

        <HostParticipantSidebar
          isOpen={showSidebar}
          onToggle={toggleSidebar}
          participants={participants}
          session={session}
          currentQuestion={currentQuestion}
          isVotingClosed={isVotingClosed}
          isSlideMode={isSlideMode}
        />
      </div>

      {/* Floating / Dockable Live Participant & Vote Status Mini Screen */}
      <ParticipantMiniScreen
        isOpen={showMiniScreen}
        onClose={() => setShowMiniScreen(false)}
        participants={participants}
        currentQuestion={currentQuestion}
        isVotingClosed={isVotingClosed}
        leaderboard={leaderboard}
        isHost={true}
      />
    </div>
  );
}
