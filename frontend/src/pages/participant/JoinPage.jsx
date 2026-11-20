import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getJoinInfo } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { Sparkles, Users, ArrowRight, Gamepad2, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function JoinPage() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();

  const [code, setCode] = useState(codeParam ? codeParam.toUpperCase() : '');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [quizInfo, setQuizInfo] = useState(null);
  const [error, setError] = useState('');

  // If code is in URL param, auto-fetch quiz info
  useEffect(() => {
    if (codeParam && codeParam.trim().length >= 4) {
      handleFindQuiz(codeParam.trim().toUpperCase());
    }
  }, [codeParam]);

  const handleCodeChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(val);
    setError('');
    if (quizInfo && val !== quizInfo.code) {
      setQuizInfo(null);
    }
  };

  const handleFindQuiz = async (codeToSearch = code) => {
    const trimmed = (codeToSearch || code).trim().toUpperCase();
    if (!trimmed || trimmed.length < 4) {
      setError('Please enter a valid 6-character code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await getJoinInfo(trimmed);
      // Support both unwrapped object and axios response
      const data = res?.quiz_title ? res : (res?.data?.data || res?.data || res);
      if (data && data.quiz_title) {
        if (data.status === 'ended') {
          setError('This quiz session has already ended.');
          toast.error('This quiz has already ended');
          setQuizInfo(null);
        } else {
          setQuizInfo(data);
          toast.success(`Found "${data.quiz_title}"!`);
        }
      } else {
        setError('Quiz not found. Please check your PIN.');
        setQuizInfo(null);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Quiz not found. Please check your PIN.';
      setError(msg);
      toast.error(msg);
      setQuizInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }

    if (nickname.trim().length > 30) {
      setError('Nickname must be 30 characters or fewer');
      return;
    }

    const sessionCode = (quizInfo?.code || code).toUpperCase();
    // Navigate to play page with state
    navigate(`/play/${sessionCode}`, {
      state: {
        nickname: nickname.trim(),
        quizInfo,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-800 to-slate-900 flex flex-col justify-between items-center p-4 sm:p-6 text-white select-none">
      {/* Top Bar / Brand Header */}
      <header className="w-full max-w-md flex justify-between items-center pt-2 sm:pt-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-white/90 backdrop-blur-md flex items-center justify-center p-1.5 shadow-lg group-hover:scale-105 transition">
            <img src="/digipodium-logo.png" alt="Digipodium Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-black text-xl tracking-tight text-white block leading-none">
              QuizLive
            </span>
            <span className="text-[10px] font-semibold text-purple-200/80 block mt-0.5">
              by Digipodium
            </span>
          </div>
        </Link>
        <span className="text-xs uppercase font-bold tracking-widest text-purple-200/70 bg-white/10 px-3 py-1 rounded-full">
          Participant
        </span>
      </header>

      {/* Main Join Card */}
      <main className="w-full max-w-md my-auto py-6">
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden text-white">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {quizInfo ? "You're Almost In!" : 'Enter Quiz Code'}
              </h1>
              <p className="text-sm text-purple-200">
                {quizInfo
                  ? 'Pick a nickname to display on the leaderboard'
                  : 'Enter the 6-character PIN provided by the host'}
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-sm animate-shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {!quizInfo ? (
              /* Step 1: Code Input */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-200 mb-2">
                    Game PIN
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={handleCodeChange}
                      onKeyDown={(e) => e.key === 'Enter' && handleFindQuiz()}
                      placeholder="ABC123"
                      className="h-16 text-center text-3xl font-mono font-black tracking-widest uppercase bg-white/15 border-white/30 text-white placeholder:text-white/30 rounded-2xl focus:bg-white/20 focus:ring-4 focus:ring-purple-400 focus:border-white transition"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  onClick={() => handleFindQuiz()}
                  disabled={loading || code.trim().length < 4}
                  className="w-full h-14 min-h-[48px] text-lg font-bold rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-900 shadow-xl shadow-yellow-500/20 active:scale-98 transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Checking PIN...</span>
                    </>
                  ) : (
                    <>
                      <span>Find Quiz</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* Step 2: Found Quiz + Nickname Form */
              <form onSubmit={handleJoin} className="space-y-5 animate-fade-in">
                {/* Quiz Info Badge */}
                <div className="bg-purple-900/40 border border-purple-400/30 rounded-2xl p-4 flex items-center justify-between">
                  <div className="text-left overflow-hidden pr-2">
                    <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                      Host: {quizInfo.host_name || 'Quiz Master'}
                    </span>
                    <h3 className="text-lg font-bold truncate text-yellow-300">
                      {quizInfo.quiz_title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuizInfo(null)}
                    className="text-xs font-medium text-purple-200 hover:text-white underline p-1 flex-shrink-0"
                  >
                    Change PIN
                  </button>
                </div>

                {/* Nickname Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-200 mb-2">
                    Your Nickname
                  </label>
                  <Input
                    type="text"
                    maxLength={30}
                    value={nickname}
                    onChange={(e) => {
                      setNickname(e.target.value);
                      setError('');
                    }}
                    placeholder="e.g. SpeedyFox, QuizMaster99"
                    className="h-14 text-lg font-bold bg-white/15 border-white/30 text-white placeholder:text-white/30 rounded-2xl focus:bg-white/20 focus:ring-4 focus:ring-purple-400 focus:border-white transition px-4"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!nickname.trim()}
                  className="w-full h-14 min-h-[48px] text-lg font-extrabold rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-900 shadow-xl shadow-emerald-500/20 active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-slate-900" />
                  <span>Join Quiz!</span>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md text-center py-3 text-xs text-purple-300/60">
        <span>Are you a host? </span>
        <Link to="/login" className="text-yellow-300 hover:underline font-semibold">
          Host a quiz
        </Link>
      </footer>
    </div>
  );
}
