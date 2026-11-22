import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Cloud, Users, Play, Plus, X, Trash2, RotateCcw, Lock, Unlock,
  QrCode, Copy, Check, Maximize2, Sparkles, LayoutGrid, BarChart2,
  ArrowLeft, Search, Radio, ChevronRight, ChevronLeft, MessageSquare, Download,
  Layers, Edit3, ArrowUp, ArrowDown, Rocket, BookOpen, BookmarkPlus, CheckCircle2,
  FolderInput, Loader2, Power, Square, AlertTriangle, Eye, Settings, Award
} from 'lucide-react';
import { useSocketContext } from '@/contexts/SocketContext';
import { createOpenPollSession, getSessionById, getMyQuizzes, getQuiz } from '@/api/endpoints';
import sound from '@/lib/sound';
import SoundToggle from '@/components/SoundToggle';
import WordCloudRenderer from '@/components/WordCloudRenderer';
import AnimatedBarChart from '@/components/AnimatedBarChart';
import DraggableQRCode from '@/components/DraggableQRCode';

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
  const [showQROverlay, setShowQROverlay] = useState(true);
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

  // Prepared Questions Deck State (Questions prepared in advance)
  const [preparedQuestions, setPreparedQuestions] = useState(() => {
    try {
      const saved = localStorage.getItem('quizlive_open_prepared_deck');
      if (saved) return JSON.parse(saved);
    } catch { }
    return [
      {
        id: 'prep_1',
        questionText: 'In one word, what is your biggest takeaway from today?',
        allowCustom: true,
        allowMultiple: true,
        maxSubmissions: 3,
        options: [],
        timeLimitSec: 0,
      },
      {
        id: 'prep_2',
        questionText: 'Which framework or tech stack do you use the most?',
        allowCustom: true,
        allowMultiple: false,
        maxSubmissions: 1,
        options: [
          { id: '1', text: 'React / Next.js' },
          { id: '2', text: 'Node.js / Express' },
          { id: '3', text: 'Python / Django' },
          { id: '4', text: 'Java / Spring' },
        ],
        timeLimitSec: 0,
      },
    ];
  });
  const [activePreparedId, setActivePreparedId] = useState(null);
  const [editingPreparedId, setEditingPreparedId] = useState(null);
  const [showDeckDrawer, setShowDeckDrawer] = useState(false);
  const [showQuizImportModal, setShowQuizImportModal] = useState(false);
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [showEndPollConfirm, setShowEndPollConfirm] = useState(false);
  const [pollSummary, setPollSummary] = useState(null);
  const [showDeckManager, setShowDeckManager] = useState(false);

  // Sync prepared deck to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('quizlive_open_prepared_deck', JSON.stringify(preparedQuestions));
    } catch { }
  }, [preparedQuestions]);

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
      setParticipants([]);
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
    if (!sessId) return;
    const socket = getSocket();

    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
      return;
    }

    const doJoin = () => {
      socket.emit('host:join_session', { token, sessionId: Number(sessId) });
    };

    if (socket.connected) {
      doJoin();
    } else {
      socket.connect();
      socket.once('connect', doJoin);
    }

    socket.off('connect', doJoin);
    socket.on('connect', doJoin);

    socket.off('session:state');
    socket.on('session:state', ({ session: s, participants: p }) => {
      if (s) setSession((prev) => ({ ...prev, ...s }));
      if (Array.isArray(p)) setParticipants(p);
    });

    socket.off('session:participant_joined');
    socket.on('session:participant_joined', (data) => {
      const name = data.nickname || data;
      const id = data.participantId || data.id;
      setParticipants((prev) => {
        if (prev.some((p) => p.nickname === name || (id && p.id === id))) return prev;
        return [...prev, { id: id || ('p_' + Date.now()), nickname: name, score: 0 }];
      });
      sound.play('join');
      toast.success(`${name} joined the room!`, { duration: 2500, position: 'bottom-right' });
    });

    socket.off('session:open_question');
    socket.on('session:open_question', (qData) => {
      setActiveQuestion(qData);
      setShowComposer(false);
      sound.play('start');
    });

    socket.off('session:open_word_cloud_update');
    socket.on('session:open_word_cloud_update', (data) => {
      setCloudWords(data.words || []);
      setTotalSubmissions(data.totalSubmissions || 0);
      setTotalResponders(data.totalParticipants || 0);
      sound.play('click');
    });

    socket.off('session:open_word_cloud_cleared');
    socket.on('session:open_word_cloud_cleared', () => {
      setCloudWords([]);
      setTotalSubmissions(0);
      setTotalResponders(0);
      toast.success('Word Cloud cleared for current question');
    });

    socket.off('session:open_question_closed');
    socket.on('session:open_question_closed', () => {
      setActiveQuestion((prev) => (prev ? { ...prev, isOpen: false } : null));
      sound.play('timeUp');
      toast.success('Voting closed by host');
    });

    socket.off('session:open_question_stopped');
    socket.on('session:open_question_stopped', () => {
      setActiveQuestion(null);
      setActivePreparedId(null);
      setCloudWords([]);
      setTotalSubmissions(0);
      setTotalResponders(0);
      sound.play('timeUp');
      toast.success('Question stopped. Returned to Standby Lobby');
    });

    socket.off('session:open_poll_ended');
    socket.on('session:open_poll_ended', (data) => {
      setActiveQuestion(null);
      setActivePreparedId(null);
      setPollSummary(data);
      sound.play('fanfare');
      toast.success('Live Open Poll ended!');
    });

    socket.off('error');
    socket.on('error', (err) => {
      console.warn('Socket error in open poll session:', err);
      if (err?.message === 'Session not found' || err?.message === 'Unauthorized') {
        localStorage.removeItem('quizlive_active_open_session_id');
        initSession();
      }
    });
  }, [getSocket, navigate]);

  useEffect(() => {
    // Check if there is an active session stored
    const savedId = localStorage.getItem('quizlive_active_open_session_id');
    if (savedId) {
      // Validate savedId via API first to guarantee immediate session metadata, QR, and participants
      getSessionById(savedId)
        .then((sess) => {
          if (sess && sess.status !== 'ended') {
            setSession(sess);
            if (Array.isArray(sess.participants)) {
              setParticipants(sess.participants);
            }
            connectSessionSocket(sess.id);
          } else {
            localStorage.removeItem('quizlive_active_open_session_id');
            initSession();
          }
        })
        .catch(() => {
          localStorage.removeItem('quizlive_active_open_session_id');
          initSession();
        });
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
      socket.off('session:open_question_stopped');
      socket.off('session:open_poll_ended');
    };
  }, []);

  // Periodically refresh participant list while in Standby Lobby as backup
  useEffect(() => {
    if (!session?.id || activeQuestion) return;
    const interval = setInterval(() => {
      getSessionById(session.id)
        .then((sess) => {
          if (sess?.participants && Array.isArray(sess.participants)) {
            setParticipants(sess.participants);
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [session?.id, activeQuestion]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'n' || e.key === 'N') {
        openComposerForNew();
      } else if (e.key === 'd' || e.key === 'D') {
        setShowDeckDrawer((v) => !v);
      } else if (e.key === 'w' || e.key === 'W') {
        setViewMode((v) => (v === 'cloud' ? 'bars' : 'cloud'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => { });
      setIsSlideMode(true);
    } else {
      document.exitFullscreen?.().catch(() => { });
    }
  };

  const handleCopyLink = () => {
    const joinUrl = `${window.location.origin}/join/${session?.code || ''}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success('Join link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Broadcast any question data live to the audience
  const broadcastQuestion = (qData) => {
    if (!qData?.questionText?.trim()) return;

    const targetSessionId = session?.id || localStorage.getItem('quizlive_active_open_session_id');
    if (!targetSessionId) {
      toast.error('Session is still initializing. Please wait a moment.');
      initSession();
      return;
    }

    const cleanOptions = (qData.options || [])
      .map((opt) => (typeof opt === 'string' ? opt.trim() : opt.text?.trim()))
      .filter(Boolean)
      .map((text, idx) => ({ id: String(idx + 1), text }));

    // Optimistically transition host screen immediately to Live Poll View
    const openQuestionObj = {
      id: qData.id || ('open_' + Date.now()),
      text: qData.questionText.trim(),
      allowCustom: qData.allowCustom ?? true,
      allowMultiple: qData.allowMultiple ?? true,
      maxSubmissions: qData.allowMultiple ? Number(qData.maxSubmissions || 3) : 1,
      options: cleanOptions,
      timeLimitSec: Number(qData.timeLimitSec || 0),
      isOpen: true,
    };

    setActiveQuestion(openQuestionObj);
    setCloudWords([]);
    setTotalSubmissions(0);
    setTotalResponders(0);
    setShowComposer(false);
    setShowDeckDrawer(false);
    if (qData.id) {
      setActivePreparedId(qData.id);
    }
    sound.play('start');

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.emit('host:ask_open_question', {
      sessionId: Number(targetSessionId),
      questionText: qData.questionText.trim(),
      allowCustom: qData.allowCustom ?? true,
      allowMultiple: qData.allowMultiple ?? true,
      maxSubmissions: qData.allowMultiple ? Number(qData.maxSubmissions || 3) : 1,
      options: cleanOptions,
      timeLimitSec: Number(qData.timeLimitSec || 0),
    });

    toast.success('Question launched live to audience!');
  };

  // Launch Question directly from Composer form
  const handleLaunchQuestion = (e) => {
    e?.preventDefault();
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

    broadcastQuestion({
      id: editingPreparedId || null,
      questionText,
      allowCustom,
      allowMultiple,
      maxSubmissions,
      options: cleanOptions,
      timeLimitSec,
    });
  };

  // Save / Update question in the Prepared Deck without broadcasting immediately
  const handleSaveToDeck = (e) => {
    e?.preventDefault();
    if (!questionText.trim()) {
      toast.error('Please enter a question to save');
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

    if (editingPreparedId) {
      setPreparedQuestions((prev) =>
        prev.map((q) =>
          q.id === editingPreparedId
            ? {
                ...q,
                questionText: questionText.trim(),
                allowCustom,
                allowMultiple,
                maxSubmissions: allowMultiple ? Number(maxSubmissions) : 1,
                options: cleanOptions,
                timeLimitSec: Number(timeLimitSec),
              }
            : q
        )
      );
      toast.success('Question updated in deck!');
    } else {
      const newQ = {
        id: 'prep_' + Date.now(),
        questionText: questionText.trim(),
        allowCustom,
        allowMultiple,
        maxSubmissions: allowMultiple ? Number(maxSubmissions) : 1,
        options: cleanOptions,
        timeLimitSec: Number(timeLimitSec),
      };
      setPreparedQuestions((prev) => [...prev, newQ]);
      toast.success('Question added in advance to deck!');
    }

    setShowComposer(false);
    setEditingPreparedId(null);
  };

  // Launch next prepared question in sequence
  const launchNextPreparedQuestion = () => {
    if (preparedQuestions.length === 0) {
      setShowComposer(true);
      return;
    }
    const currentIndex = preparedQuestions.findIndex((q) => q.id === activePreparedId);
    const nextIndex = currentIndex === -1 ? 0 : currentIndex + 1;
    if (nextIndex < preparedQuestions.length) {
      broadcastQuestion(preparedQuestions[nextIndex]);
    } else {
      toast('You have reached the end of your prepared deck!', { icon: '🏁' });
      setShowDeckDrawer(true);
    }
  };

  // Launch previous prepared question
  const launchPrevPreparedQuestion = () => {
    const currentIndex = preparedQuestions.findIndex((q) => q.id === activePreparedId);
    if (currentIndex > 0) {
      broadcastQuestion(preparedQuestions[currentIndex - 1]);
    }
  };

  // Open Composer to create a new question
  const openComposerForNew = () => {
    setEditingPreparedId(null);
    setQuestionText('');
    setAllowCustom(true);
    setAllowMultiple(true);
    setMaxSubmissions(3);
    setFixedOptions(['', '']);
    setTimeLimitSec(0);
    setShowComposer(true);
  };

  // Open Composer to edit an existing prepared question
  const openComposerForEdit = (q) => {
    setEditingPreparedId(q.id);
    setQuestionText(q.questionText || '');
    setAllowCustom(q.allowCustom ?? true);
    setAllowMultiple(q.allowMultiple ?? true);
    setMaxSubmissions(q.maxSubmissions || 3);
    setFixedOptions(q.options?.length ? q.options.map((o) => o.text || o) : ['', '']);
    setTimeLimitSec(q.timeLimitSec || 0);
    setShowComposer(true);
  };

  // Delete question from deck
  const handleDeletePreparedQuestion = (id) => {
    setPreparedQuestions((prev) => prev.filter((q) => q.id !== id));
    if (activePreparedId === id) setActivePreparedId(null);
    toast.success('Question removed from deck');
  };

  // Reorder questions in deck
  const handleMovePreparedQuestion = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= preparedQuestions.length) return;
    setPreparedQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  // Load sample presentation presets into the deck
  const loadPresetQuestions = () => {
    const newPresets = PRESET_QUESTIONS.map((pq, idx) => ({
      id: 'preset_' + Date.now() + '_' + idx,
      questionText: pq,
      allowCustom: true,
      allowMultiple: true,
      maxSubmissions: 3,
      options: [],
      timeLimitSec: 0,
    }));
    setPreparedQuestions((prev) => [...prev, ...newPresets]);
    toast.success(`Added ${newPresets.length} suggested questions to deck!`);
  };

  // Open Quiz import modal & fetch quizzes
  const openImportQuizModal = async () => {
    setShowQuizImportModal(true);
    setLoadingQuizzes(true);
    try {
      const data = await getMyQuizzes();
      const list = Array.isArray(data) ? data : data?.quizzes || [];
      setAvailableQuizzes(list);
    } catch (err) {
      toast.error('Failed to load your quizzes: ' + (err.message || ''));
    } finally {
      setLoadingQuizzes(false);
    }
  };

  // Import questions from a selected quiz
  const handleImportFromQuiz = async (quizId) => {
    try {
      const quiz = await getQuiz(quizId);
      if (!quiz?.questions?.length) {
        toast.error('This quiz has no questions to import.');
        return;
      }
      const imported = quiz.questions.map((q, idx) => ({
        id: `quiz_${quiz.id}_q_${q.id || idx}_${Date.now()}`,
        questionText: q.text,
        allowCustom: q.type === 'short_answer' || q.type === 'poll',
        allowMultiple: q.type === 'poll',
        maxSubmissions: 3,
        options: (q.options || []).map((o, oi) => ({ id: String(oi + 1), text: o.text })),
        timeLimitSec: q.time_limit_sec || 0,
      }));
      setPreparedQuestions((prev) => [...prev, ...imported]);
      setShowQuizImportModal(false);
      toast.success(`Imported ${imported.length} questions from "${quiz.title}"!`);
    } catch (err) {
      toast.error('Failed to import quiz: ' + (err.message || ''));
    }
  };

  const handleCloseVoting = () => {
    const socket = getSocket();
    socket.emit('host:close_open_question', { sessionId: Number(session.id) });
  };

  // Host stops current active question and returns to Standby Lobby
  const handleStopQuestion = () => {
    if (!session?.id) return;
    const socket = getSocket();
    socket.emit('host:stop_open_question', { sessionId: Number(session.id) });
    setActiveQuestion(null);
    setActivePreparedId(null);
    sound.play('timeUp');
    toast.success('Question stopped. Returned to Standby Lobby.');
  };

  // Host ends the entire open poll session
  const handleEndOpenPoll = () => {
    if (!session?.id) return;
    const socket = getSocket();
    socket.emit('host:end_open_poll', { sessionId: Number(session.id) });
    localStorage.removeItem('quizlive_active_open_session_id');
    setShowEndPollConfirm(false);
  };

  // Launch the poll from standby (starts first prepared question or opens composer)
  const handleStartPoll = () => {
    if (preparedQuestions.length > 0) {
      broadcastQuestion(preparedQuestions[0]);
    } else {
      openComposerForNew();
    }
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
      className={`min-h-screen flex flex-col transition-colors duration-300 ${isSlideMode
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white select-none'
          : 'bg-slate-50 text-gray-900'
        }`}
    >
      {/* ──────────────────────────────────────────────────────────── */}
      {/* TOP HEADER CONTROLS */}
      {/* ──────────────────────────────────────────────────────────── */}
      <header
        className={`px-6 py-4 flex items-center justify-between border-b transition-colors z-20 ${isSlideMode ? 'bg-black/40 border-white/10 backdrop-blur-md' : 'bg-white border-gray-200'
          }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/host')}
            className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-xl transition ${isSlideMode ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
                className={`flex items-center gap-2 px-3.5 py-1 rounded-full font-mono font-extrabold text-sm tracking-wider shadow-sm ${isSlideMode ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-800'
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

          {/* Prepared Questions Deck Button */}
          <button
            onClick={() => setShowDeckDrawer((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
              showDeckDrawer
                ? 'bg-cyan-600 text-white shadow-cyan-900/50'
                : 'bg-white/10 hover:bg-white/20 text-cyan-300 border border-cyan-500/30'
            }`}
            title="Open Prepared Questions Deck (Key: D)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Deck ({preparedQuestions.length})</span>
          </button>

          {/* New Question Composer Button */}
          <button
            onClick={openComposerForNew}
            className="px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white"
            title="Ask a New Question (Key: N)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Question</span>
          </button>

          {/* QR Code Draggable Widget Toggle */}
          <button
            onClick={() => setShowQROverlay((v) => !v)}
            className={`p-2 rounded-xl text-xs transition flex items-center gap-1.5 ${showQROverlay
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white/10 hover:bg-white/20 text-gray-200'
              }`}
            title="Toggle Draggable QR Code"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline font-bold">QR</span>
          </button>

          {/* End Live Poll Button */}
          <button
            onClick={() => setShowEndPollConfirm(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30"
            title="End Live Open Poll Session"
          >
            <Power className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">End Poll</span>
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
      {/* DRAGGABLE & FLOATING LIVE QR CODE WIDGET */}
      {/* ──────────────────────────────────────────────────────────── */}
      <DraggableQRCode
        qrData={session?.qr_data}
        code={session?.code}
        isOpen={showQROverlay}
        onClose={() => setShowQROverlay(false)}
      />

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MAIN VIEWPORT */}
      {/* ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-6xl mx-auto w-full justify-center">
        {!activeQuestion ? (
          /* NO ACTIVE QUESTION: STANDBY LOBBY (DEFAULT) OR ON-SCREEN DECK MANAGER */
          !showDeckManager ? (
            /* ── AUDIENCE PROJECTOR STANDBY LOBBY (NO QUESTIONS EXPOSED) ── */
            <div className="space-y-6 w-full animate-fade-in">
              <div className="bg-slate-900/80 border border-white/10 backdrop-blur-xl rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden text-center">
                {/* Radial Glow */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-cyan-600/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                  {/* Status Badge */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>Lobby Standby · Questions Hidden Until Poll Starts</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                    Audience Live Poll & Word Cloud
                  </h1>
                  <p className="text-gray-400 text-sm sm:text-base max-w-lg mx-auto">
                    Connect your smartphones now. The live question will appear on this screen and on your devices as soon as the poll begins.
                  </p>

                  {/* High Impact Join & PIN Card */}
                  <div className="bg-black/50 border border-white/15 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-around gap-6 shadow-2xl">
                    {/* QR Code */}
                    {session?.qr_data && (
                      <div className="bg-white p-3.5 rounded-2xl shadow-xl flex flex-col items-center shrink-0">
                        <img src={session.qr_data} alt="QR Code" className="w-36 h-36 object-contain" />
                        <span className="text-[10px] text-slate-800 font-extrabold mt-1 tracking-tight">
                          SCAN TO JOIN
                        </span>
                      </div>
                    )}

                    {/* Join Instructions & PIN */}
                    <div className="text-left space-y-3">
                      <div>
                        <span className="text-xs uppercase font-extrabold tracking-widest text-gray-400 block mb-1">
                          Room Join PIN
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-4xl sm:text-5xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-300 tracking-wider">
                            {session?.code || '------'}
                          </span>
                          <button
                            onClick={handleCopyLink}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 transition"
                            title="Copy Join URL"
                          >
                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-gray-300 space-y-1">
                        <p>
                          Join URL: <span className="text-cyan-300 font-mono font-bold">{window.location.origin}/join/{session?.code}</span>
                        </p>
                        <p className="text-gray-400 text-[11px]">
                          Works instantly on any mobile browser without app downloads.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Connected Audience Counter & Avatars */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span>{participants.length} Audience Members Connected & Ready</span>
                    </div>

                    {participants.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-center max-h-24 overflow-y-auto pt-1">
                        {participants.map((p, idx) => (
                          <span
                            key={p.id || idx}
                            className="px-2.5 py-0.5 rounded-lg bg-white/10 text-xs text-gray-300 border border-white/10 font-medium"
                          >
                            {p.nickname}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Host Action Controls */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={handleStartPoll}
                      className="px-8 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl shadow-xl shadow-teal-900/50 flex items-center gap-3 text-base transition transform hover:scale-[1.02]"
                      title="Launch poll question live to audience"
                    >
                      <Rocket className="w-5 h-5" />
                      <span>{preparedQuestions.length > 0 ? 'Start Poll Now 🚀' : 'Create & Start Poll 🚀'}</span>
                    </button>

                    <button
                      onClick={() => setShowDeckDrawer(true)}
                      className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-cyan-300 font-bold rounded-2xl border border-cyan-500/30 transition flex items-center gap-2 text-sm shadow"
                      title="Open private deck drawer (Key: D)"
                    >
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Prepared Deck ({preparedQuestions.length})</span>
                    </button>

                    <button
                      onClick={() => setShowDeckManager(true)}
                      className="px-4 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-2xl border border-white/10 transition flex items-center gap-2 text-xs"
                      title="View on-screen questions manager"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Manage Deck on Screen</span>
                    </button>

                    <button
                      onClick={() => setShowEndPollConfirm(true)}
                      className="px-4 py-3.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 font-bold rounded-2xl border border-rose-500/30 transition flex items-center gap-2 text-xs"
                      title="End this Live Open Poll session"
                    >
                      <Power className="w-4 h-4 text-rose-400" />
                      <span>End Poll</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── ON-SCREEN DECK MANAGER (OPTIONAL VIEW) ── */
            <div className="space-y-6 w-full animate-fade-in">
              {/* Back to Projector Lobby Button */}
              <div className="flex items-center justify-between bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                <button
                  onClick={() => setShowDeckManager(false)}
                  className="px-4 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 font-bold text-xs flex items-center gap-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← Back to Projector Standby Lobby</span>
                </button>
                <span className="text-xs text-gray-400">
                  Switch back to Standby Lobby before projecting to audience
                </span>
              </div>

              {/* PREPARED QUESTIONS DECK SECTION */}
              <div className="bg-slate-900/75 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-white">Prepared Questions Deck</h2>
                        <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {preparedQuestions.length} Questions
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Click "Broadcast Live" on any question to start audience voting immediately.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadPresetQuestions}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition flex items-center gap-1.5"
                      title="Add suggested audience engagement questions"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      <span>Add Suggestions</span>
                    </button>
                    <button
                      onClick={openImportQuizModal}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition flex items-center gap-1.5"
                      title="Import questions from one of your quizzes"
                    >
                      <FolderInput className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Import Quiz</span>
                    </button>
                    <button
                      onClick={openComposerForNew}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Question</span>
                    </button>
                  </div>
                </div>

                {/* Questions List / Cards */}
                {preparedQuestions.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-gray-400 mb-4">
                      <Layers className="w-8 h-8 opacity-40 text-purple-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-200 mb-1">No prepared questions yet</h3>
                    <p className="text-xs text-gray-400 max-w-md mx-auto mb-6">
                      Add questions in advance so you don't have to type prompts live during your presentation, or import questions directly from any of your existing quizzes.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={openComposerForNew}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-lg flex items-center gap-2 transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create First Question</span>
                      </button>
                      <button
                        onClick={openImportQuizModal}
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-2 transition"
                      >
                        <FolderInput className="w-4 h-4" />
                        <span>Import from My Quizzes</span>
                      </button>
                      <button
                        onClick={loadPresetQuestions}
                        className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-semibold flex items-center gap-2 transition"
                      >
                        <BookOpen className="w-4 h-4 text-purple-400" />
                        <span>Load Sample Deck</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5 mt-5">
                    {preparedQuestions.map((q, idx) => {
                      const isActive = activePreparedId === q.id;
                      return (
                        <div
                          key={q.id}
                          className={`p-4 sm:p-5 rounded-2xl border transition relative flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                            isActive
                              ? 'bg-purple-900/30 border-purple-500/60 shadow-lg shadow-purple-900/20'
                              : 'bg-white/5 hover:bg-white/[0.08] border-white/10'
                          }`}
                        >
                          {/* Question Info */}
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="w-6 h-6 rounded-lg bg-white/10 border border-white/15 text-xs font-black font-mono text-purple-300 flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>
                              {isActive && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                  <span>Active on Screen</span>
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-gray-300 border border-white/10">
                                {q.allowCustom && q.options?.length > 0
                                  ? 'Hybrid (Options + Custom Words)'
                                  : q.allowCustom
                                  ? 'Custom Free-Text Words'
                                  : 'Fixed Poll Choices'}
                              </span>
                              {q.allowMultiple && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-gray-300 border border-white/10">
                                  Max {q.maxSubmissions || 3} words
                                </span>
                              )}
                              {q.timeLimitSec > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {q.timeLimitSec}s limit
                                </span>
                              )}
                            </div>

                            <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                              {q.questionText}
                            </h3>

                            {/* Options pills preview */}
                            {q.options?.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                {q.options.map((opt, oi) => (
                                  <span
                                    key={oi}
                                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-gray-300"
                                  >
                                    {typeof opt === 'string' ? opt : opt.text}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Question Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                            {/* Reorder Buttons */}
                            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-0.5">
                              <button
                                onClick={() => handleMovePreparedQuestion(idx, -1)}
                                disabled={idx === 0}
                                className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition"
                                title="Move Up in Deck"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleMovePreparedQuestion(idx, 1)}
                                disabled={idx === preparedQuestions.length - 1}
                                className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition"
                                title="Move Down in Deck"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Edit Button */}
                            <button
                              onClick={() => openComposerForEdit(q)}
                              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 transition"
                              title="Edit this Question"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeletePreparedQuestion(q.id)}
                              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition"
                              title="Remove from Deck"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Primary: Broadcast Live Now */}
                            <button
                              onClick={() => broadcastQuestion(q)}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl shadow-lg transition flex items-center gap-2 text-xs"
                              title="Broadcast this question live to audience"
                            >
                              <Rocket className="w-3.5 h-3.5" />
                              <span>Broadcast Live</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )
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
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${viewMode === 'cloud' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    <Cloud className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Word Cloud</span>
                  </button>
                  <button
                    onClick={() => setViewMode('bars')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${viewMode === 'bars' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
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

                <button
                  onClick={handleStopQuestion}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5"
                  title="Stop this question and return to lobby"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Question</span>
                </button>

                <button
                  onClick={() => setShowEndPollConfirm(true)}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow"
                  title="End the entire Live Open Poll session"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>End Poll</span>
                </button>
              </div>

              {/* Right: Quick Search, Deck Drawer, Next in Deck & New Question */}
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search word / voter..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-white/10 text-xs text-white placeholder-gray-400 border border-white/10 focus:outline-none focus:ring-1 focus:ring-purple-400 w-32 sm:w-40"
                  />
                </div>

                <button
                  onClick={() => setShowDeckDrawer((v) => !v)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 text-xs font-bold transition flex items-center gap-1.5 shadow"
                  title="Open Prepared Deck (Key: D)"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Deck ({preparedQuestions.length})</span>
                </button>

                <button
                  onClick={launchNextPreparedQuestion}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl transition shadow flex items-center gap-1.5 text-xs"
                  title="Launch Next Prepared Question in Deck"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Next in Deck</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={openComposerForNew}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl transition shadow flex items-center gap-1.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
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
              onClick={() => {
                setShowComposer(false);
                setEditingPreparedId(null);
              }}
              className="absolute top-5 right-5 p-2 text-gray-400 hover:text-white rounded-full bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
                {editingPreparedId ? <Edit3 className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-xl font-black">
                  {editingPreparedId ? 'Edit Prepared Question' : 'Ask Audience a Question'}
                </h3>
                <p className="text-xs text-gray-400">
                  {editingPreparedId
                    ? 'Update this question in your presentation deck'
                    : 'Broadcast live now or save in advance to your deck'}
                </p>
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
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowComposer(false);
                    setEditingPreparedId(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveToDeck}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1.5 shadow"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>{editingPreparedId ? 'Update in Deck' : 'Save in Advance to Deck'}</span>
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl shadow-lg transition flex items-center gap-2 text-xs"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>Broadcast Live Now</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* SLIDE-OVER DECK DRAWER */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showDeckDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-l border-white/10 text-white flex flex-col h-full shadow-2xl animate-slide-left">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Prepared Questions Deck</h3>
                  <span className="text-[11px] text-gray-400">{preparedQuestions.length} questions in queue</span>
                </div>
              </div>
              <button
                onClick={() => setShowDeckDrawer(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="px-5 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between gap-2">
              <button
                onClick={openComposerForNew}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add in Advance</span>
              </button>
              <button
                onClick={openImportQuizModal}
                className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/30 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <FolderInput className="w-3.5 h-3.5" />
                <span>Import Quiz</span>
              </button>
            </div>

            {/* Scrollable Questions Queue */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {preparedQuestions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Layers className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" />
                  <p className="text-xs font-bold text-gray-300">No prepared questions</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Click "+ Add in Advance" or import from a quiz.</p>
                </div>
              ) : (
                preparedQuestions.map((q, idx) => {
                  const isActive = activePreparedId === q.id;
                  return (
                    <div
                      key={q.id}
                      className={`p-3.5 rounded-2xl border transition ${
                        isActive
                          ? 'bg-purple-900/40 border-purple-500/60 shadow-lg'
                          : 'bg-white/5 hover:bg-white/10 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-white/10 text-[10px] font-black font-mono text-purple-300 flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMovePreparedQuestion(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMovePreparedQuestion(idx, 1)}
                            disabled={idx === preparedQuestions.length - 1}
                            className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              openComposerForEdit(q);
                              setShowDeckDrawer(false);
                            }}
                            className="p-1 text-gray-400 hover:text-white"
                            title="Edit"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeletePreparedQuestion(q.id)}
                            className="p-1 text-gray-500 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs font-bold text-white mb-2 leading-snug">
                        {q.questionText}
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-gray-400">
                          {q.options?.length > 0 ? `${q.options.length} choices` : 'Free-text'}
                        </span>
                        <button
                          onClick={() => {
                            broadcastQuestion(q);
                            setShowDeckDrawer(false);
                          }}
                          className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-lg text-[11px] shadow transition flex items-center gap-1"
                        >
                          <Rocket className="w-3 h-3" />
                          <span>Launch Live</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* QUIZ IMPORT MODAL */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showQuizImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 text-white p-6 sm:p-8 rounded-3xl max-w-lg w-full shadow-2xl animate-fade-in relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowQuizImportModal(false)}
              className="absolute top-5 right-5 p-2 text-gray-400 hover:text-white rounded-full bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                <FolderInput className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black">Import from Your Quizzes</h3>
                <p className="text-xs text-gray-400">
                  Select a quiz to import its questions into your Open Voting deck
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 my-2 pr-1">
              {loadingQuizzes ? (
                <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="text-xs">Loading your quizzes...</span>
                </div>
              ) : availableQuizzes.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-400" />
                  <p className="text-sm font-bold text-gray-300">No quizzes available</p>
                  <p className="text-xs text-gray-500 mt-1">Create a quiz in your dashboard first, or add questions manually.</p>
                </div>
              ) : (
                availableQuizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-sm font-black text-white">{quiz.title}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {quiz.question_count || quiz.questions?.length || 0} questions · Code: {quiz.code || 'N/A'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleImportFromQuiz(quiz.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs shadow transition flex items-center gap-1.5 shrink-0"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Import All</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowQuizImportModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* CONFIRM END POLL MODAL */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showEndPollConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/30 text-white p-6 sm:p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-black text-white">End Live Open Poll?</h3>
              <p className="text-xs text-gray-300">
                Are you sure you want to end this live open poll session? This will conclude voting for all connected participants and display the final response summary.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowEndPollConfirm(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEndOpenPoll}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg transition flex items-center gap-2"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Yes, End Poll</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* POLL ENDED SUMMARY MODAL */}
      {/* ──────────────────────────────────────────────────────────── */}
      {pollSummary && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-white/20 text-white p-6 sm:p-8 rounded-3xl max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white mx-auto shadow-xl">
              <Award className="w-8 h-8" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-2xl font-black text-white">Live Open Poll Ended</h3>
              <p className="text-xs text-gray-400">
                {pollSummary.message || 'Session concluded successfully'}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-400 block">
                  Total Voters
                </span>
                <span className="text-2xl font-black text-cyan-300">
                  {pollSummary.totalParticipants ?? participants.length}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-400 block">
                  Total Submissions
                </span>
                <span className="text-2xl font-black text-purple-300">
                  {pollSummary.totalSubmissions ?? totalSubmissions}
                </span>
              </div>
            </div>

            {/* Top Words Summary */}
            {pollSummary.topWords?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-300 block text-center">
                  Top Audience Answers
                </span>
                <div className="flex flex-wrap gap-2 justify-center">
                  {pollSummary.topWords.map((tw, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5"
                    >
                      <span>"{tw.text}"</span>
                      <span className="text-amber-300 font-extrabold">({tw.count} votes)</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export Final Responses (CSV)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPollSummary(null);
                    initSession();
                  }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start New Poll</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/host')}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 transition flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
