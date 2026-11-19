import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSocketContext } from '../../contexts/SocketContext';
import QuestionCard from '../../components/QuestionCard';
import Leaderboard from '../../components/Leaderboard';
import Timer from '../../components/Timer';
import { Sparkles, Trophy, Users, Award, CheckCircle2, XCircle, Gamepad2, AlertTriangle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PlayPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { getSocket, connected } = useSocketContext();

  const sessionCode = (params.sessionCode || params.code || '').toUpperCase();
  const initialNickname = location.state?.nickname || sessionStorage.getItem(`nickname_${sessionCode}`) || '';

  // Game state phases: 'connecting' | 'waiting' | 'ready' | 'question' | 'result' | 'timeup' | 'leaderboard' | 'ended'
  const [phase, setPhase] = useState('connecting');
  const [nickname, setNickname] = useState(initialNickname);
  const [quizTitle, setQuizTitle] = useState(location.state?.quizInfo?.quiz_title || 'Live Quiz');
  const [participantCount, setParticipantCount] = useState(1);
  const [participantId, setParticipantId] = useState(() => {
    return sessionStorage.getItem(`participantId_${sessionCode}`) || null;
  });
  const [sessionId, setSessionId] = useState(() => {
    return sessionStorage.getItem(`sessionId_${sessionCode}`) || null;
  });

  // Question & Score State
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(null);

  // Timer State
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const [totalSeconds, setTotalSeconds] = useState(30);
  const timerRef = useRef(null);

  // Feedback / Results State
  const [answerResult, setAnswerResult] = useState(null); // { isCorrect, pointsAwarded, totalScore }
  const [correctOptions, setCorrectOptions] = useState([]);
  const [totalScore, setTotalScore] = useState(0);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [finalResult, setFinalResult] = useState(null);

  // If no nickname, redirect to join page
  useEffect(() => {
    if (!initialNickname) {
      navigate(`/join/${sessionCode}`);
    }
  }, [initialNickname, sessionCode, navigate]);

  // Connect to Socket and set up event listeners
  useEffect(() => {
    if (!sessionCode || !nickname) return;

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    // Join the session
    socket.emit('participant:join', { sessionCode, nickname });

    // 1. Session Joined / Waiting Room
    const handleJoined = (data) => {
      if (data.participantId) {
        setParticipantId(data.participantId);
        sessionStorage.setItem(`participantId_${sessionCode}`, data.participantId);
      }
      if (data.sessionId) {
        setSessionId(data.sessionId);
        sessionStorage.setItem(`sessionId_${sessionCode}`, data.sessionId);
      }
      if (data.quizTitle) setQuizTitle(data.quizTitle);
      sessionStorage.setItem(`nickname_${sessionCode}`, nickname);

      if (data.status === 'waiting') {
        setPhase('waiting');
      }
    };

    // 2. Session Started Animation
    const handleStarted = () => {
      setPhase('ready');
    };

    // 3. Question Pushed
    const handleQuestion = (qData) => {
      setCurrentQuestion(qData);
      setSelectedOptionId(null);
      setAnswered(false);
      setAnswerResult(null);
      setCorrectOptions([]);
      setTotalSeconds(qData.time_limit_sec || 30);
      setRemainingSeconds(qData.time_limit_sec || 30);
      setQuestionStartTime(Date.now());
      setPhase('question');

      // Start local countdown
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    // 4. Answer Result (personal instant feedback)
    const handleAnswerResult = (res) => {
      setAnswerResult(res);
      if (res.totalScore !== undefined) {
        setTotalScore(res.totalScore);
      }
    };

    // 5. Time Up (Host or server timeout triggered)
    const handleTimeUp = (data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setRemainingSeconds(0);
      setCorrectOptions(data.correctOptions || []);
      setPhase('timeup');
    };

    // 6. Leaderboard Update
    const handleLeaderboard = (data) => {
      setLeaderboardData(data.leaderboard || []);
      setPhase('leaderboard');
    };

    // 7. Session Ended
    const handleEnded = (data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setFinalResult(data);
      if (data.finalLeaderboard) {
        setLeaderboardData(data.finalLeaderboard);
      }
      setPhase('ended');
    };

    // 8. Participant Count Update
    const handleParticipantJoined = (data) => {
      if (data.participantCount) {
        setParticipantCount(data.participantCount);
      }
    };

    // Error handling & Reconnect
    const handleError = (err) => {
      toast.error(err.message || 'An error occurred');
    };

    const handleConnectError = () => {
      toast.error('Reconnecting to live session...', { id: 'socket-reconnect' });
    };

    const handleReconnect = () => {
      toast.success('Reconnected!', { id: 'socket-reconnect' });
      socket.emit('participant:join', { sessionCode, nickname });
    };

    socket.on('session:joined', handleJoined);
    socket.on('session:started', handleStarted);
    socket.on('session:question', handleQuestion);
    socket.on('answer:result', handleAnswerResult);
    socket.on('session:time_up', handleTimeUp);
    socket.on('session:leaderboard', handleLeaderboard);
    socket.on('session:ended', handleEnded);
    socket.on('session:participant_joined', handleParticipantJoined);
    socket.on('error', handleError);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect', handleReconnect);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.off('session:joined', handleJoined);
      socket.off('session:started', handleStarted);
      socket.off('session:question', handleQuestion);
      socket.off('answer:result', handleAnswerResult);
      socket.off('session:time_up', handleTimeUp);
      socket.off('session:leaderboard', handleLeaderboard);
      socket.off('session:ended', handleEnded);
      socket.off('session:participant_joined', handleParticipantJoined);
      socket.off('error', handleError);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect', handleReconnect);
    };
  }, [sessionCode, nickname, getSocket]);

  // Handle Answer Submission
  const handleAnswer = ({ optionId, optionIds, textAnswer }) => {
    if (answered || !currentQuestion) return;

    setAnswered(true);
    if (optionId) setSelectedOptionId(optionId);

    const socket = getSocket();
    const timeTakenMs = questionStartTime ? Date.now() - questionStartTime : 0;

    socket.emit('participant:answer', {
      participantId: participantId || sessionStorage.getItem(`participantId_${sessionCode}`),
      sessionId: sessionId || sessionStorage.getItem(`sessionId_${sessionCode}`),
      questionId: currentQuestion.id,
      optionId: optionId || null,
      textAnswer: textAnswer || null,
      timeTakenMs,
    });
  };

  // Find user's rank in leaderboard
  const myRankEntry = leaderboardData.find((p) => p.nickname === nickname);

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col justify-between overflow-x-hidden select-none">
      {/* Top Header Bar */}
      <header className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center font-black text-sm">
            Q
          </div>
          <div className="text-left">
            <h1 className="text-sm font-bold truncate max-w-[150px] sm:max-w-xs">{quizTitle}</h1>
            <p className="text-xs text-purple-400 font-medium">PIN: {sessionCode}</p>
          </div>
        </div>

        {/* Current Score & Nickname */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-xs font-bold text-yellow-300 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span>{totalScore} pts</span>
          </div>
          <div className="hidden sm:block text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
            {nickname}
          </div>
        </div>
      </header>

      {/* Main Content Area based on phase */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Phase: Connecting */}
        {phase === 'connecting' && (
          <div className="text-center space-y-4 animate-pulse">
            <div className="w-16 h-16 rounded-3xl bg-purple-600/30 border border-purple-500 flex items-center justify-center mx-auto">
              <Gamepad2 className="w-8 h-8 text-purple-300 animate-spin" />
            </div>
            <h2 className="text-xl font-bold">Connecting to Quiz...</h2>
            <p className="text-sm text-slate-400">Hold on tight!</p>
          </div>
        )}

        {/* Phase: Waiting Room */}
        {phase === 'waiting' && (
          <div className="w-full max-w-md mx-auto text-center space-y-8 animate-fade-in">
            {/* Animated Logo */}
            <div className="relative inline-block">
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-2xl mx-auto animate-bounce">
                <Gamepad2 className="w-14 h-14 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-slate-900 rounded-full p-2 shadow-lg animate-pulse">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-3">
              <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold uppercase tracking-widest">
                ✓ Joined Room
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                You're in, <span className="text-yellow-300">{nickname}</span>!
              </h2>
              <p className="text-base sm:text-lg text-slate-300 font-medium">
                Waiting for the host to start the quiz...
              </p>
            </div>

            {/* Waiting Pulse Indicator */}
            <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-5 shadow-xl flex items-center justify-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-semibold text-slate-200">
                Get ready to answer fast for bonus points!
              </span>
            </div>
          </div>
        )}

        {/* Phase: Ready Countdown Animation */}
        {phase === 'ready' && (
          <div className="text-center space-y-6 animate-scale-up">
            <div className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 animate-pulse">
              GET READY!
            </div>
            <p className="text-xl text-slate-300 font-bold">First question incoming...</p>
          </div>
        )}

        {/* Phase: Active Question */}
        {phase === 'question' && currentQuestion && (
          <div className="w-full max-w-3xl flex flex-col items-center py-2 animate-fade-in">
            {/* Question Progress & Timer Bar */}
            <div className="w-full flex items-center justify-between mb-4 px-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400 bg-purple-950/60 border border-purple-500/30 px-3 py-1 rounded-full">
                Question {currentQuestion.questionIndex !== undefined ? currentQuestion.questionIndex + 1 : 1}{' '}
                of {currentQuestion.total || '?'}
              </span>

              {/* Animated Circular Timer */}
              <Timer seconds={remainingSeconds} totalSeconds={totalSeconds} />
            </div>

            {/* Linear Countdown Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-6 shadow-inner">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${
                  remainingSeconds <= 5 ? 'bg-rose-500 animate-pulse' : 'bg-gradient-to-r from-emerald-400 to-purple-500'
                }`}
                style={{ width: `${(remainingSeconds / (totalSeconds || 1)) * 100}%` }}
              />
            </div>

            {/* The Question Card */}
            <QuestionCard
              question={currentQuestion}
              options={currentQuestion.options || []}
              onAnswer={handleAnswer}
              answered={answered}
              selectedOptionId={selectedOptionId}
              timeLimit={currentQuestion.time_limit_sec}
            />
          </div>
        )}

        {/* Phase: Time Up / Round Results */}
        {phase === 'timeup' && (
          <div className="w-full max-w-md mx-auto text-center space-y-6 animate-fade-in">
            {/* Correct / Wrong Result Card */}
            {answerResult ? (
              answerResult.isCorrect ? (
                /* Correct Answer Animation Screen */
                <div className="bg-emerald-950/40 border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-bounce-short">
                  {/* CSS Confetti Elements */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="confetti-piece bg-yellow-400 left-[10%] animate-fall" />
                    <div className="confetti-piece bg-pink-400 left-[30%] animate-fall-delay-1" />
                    <div className="confetti-piece bg-blue-400 left-[50%] animate-fall-delay-2" />
                    <div className="confetti-piece bg-emerald-400 left-[75%] animate-fall" />
                    <div className="confetti-piece bg-purple-400 left-[90%] animate-fall-delay-1" />
                  </div>

                  <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-black text-emerald-400 uppercase tracking-wide">
                    CORRECT!
                  </h3>
                  <div className="my-3 inline-block px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-300 text-2xl font-black animate-scale-up">
                    +{answerResult.pointsAwarded || 0} pts
                  </div>
                  <p className="text-sm text-slate-300">
                    Total Score: <span className="font-extrabold text-white">{totalScore}</span>
                  </p>
                </div>
              ) : (
                /* Wrong Answer Shake Screen */
                <div className="bg-rose-950/40 border-2 border-rose-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl animate-shake">
                  <div className="w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <XCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-black text-rose-400 uppercase tracking-wide">
                    INCORRECT
                  </h3>
                  <p className="text-sm text-slate-300 mt-2">
                    {answered ? 'Better luck on the next one!' : "Time's up before you answered!"}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Total Score: <span className="font-extrabold text-white">{totalScore}</span>
                  </p>
                </div>
              )
            ) : (
              <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6 text-center">
                <h3 className="text-2xl font-bold text-yellow-400">TIME'S UP!</h3>
                <p className="text-sm text-slate-300 mt-2">Revealing the correct answers...</p>
              </div>
            )}

            {/* Revealed Correct Options */}
            {correctOptions && correctOptions.length > 0 && (
              <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700 text-left">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Correct Answer:
                </span>
                <div className="space-y-1.5">
                  {correctOptions.map((opt) => (
                    <div
                      key={opt.id}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-bold text-sm flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400 animate-pulse">Waiting for host...</p>
          </div>
        )}

        {/* Phase: Mini-Leaderboard between questions */}
        {phase === 'leaderboard' && (
          <div className="w-full max-w-md mx-auto py-4 space-y-5 animate-fade-in">
            <div className="text-center space-y-1">
              <span className="text-xs font-black uppercase tracking-widest text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20">
                Scoreboard
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Current Standings</h2>
            </div>

            {/* Reusable Leaderboard component */}
            <Leaderboard leaderboard={leaderboardData} currentNickname={nickname} />

            {myRankEntry && (
              <div className="p-3 bg-purple-900/40 border border-purple-500/40 rounded-xl text-center text-sm font-semibold text-purple-200">
                Your Rank: <span className="text-yellow-300 font-extrabold">#{myRankEntry.rank}</span> with{' '}
                <span className="text-yellow-300 font-extrabold">{myRankEntry.score} pts</span>
              </div>
            )}
          </div>
        )}

        {/* Phase: Final Quiz Ended Screen */}
        {phase === 'ended' && (
          <div className="w-full max-w-md mx-auto text-center space-y-6 py-6 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-yellow-400 to-amber-500 text-slate-900 flex items-center justify-center mx-auto shadow-2xl">
              <Trophy className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400">
                Quiz Finished!
              </h2>
              <p className="text-base text-slate-300">
                Great game, <span className="font-bold text-white">{nickname}</span>!
              </p>
            </div>

            {/* Final Personal Score Banner */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl flex justify-around items-center">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">
                  Final Rank
                </span>
                <span className="text-3xl font-black text-yellow-300">
                  {myRankEntry ? `#${myRankEntry.rank}` : '-'}
                </span>
              </div>
              <div className="w-px h-10 bg-slate-700" />
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">
                  Total Score
                </span>
                <span className="text-3xl font-black text-emerald-400">
                  {totalScore} <span className="text-sm font-normal text-slate-400">pts</span>
                </span>
              </div>
            </div>

            {/* Final Leaderboard */}
            <div className="text-left mt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
                Final Leaderboard
              </h3>
              <Leaderboard leaderboard={leaderboardData} currentNickname={nickname} />
            </div>

            <button
              onClick={() => navigate(`/join`)}
              className="w-full h-14 min-h-[48px] rounded-2xl bg-purple-600 hover:bg-purple-700 font-bold text-lg text-white shadow-lg transition active:scale-95"
            >
              Play Another Quiz
            </button>
          </div>
        )}
      </main>

      {/* Persistent Bottom Bar with Nickname and Connection */}
      <footer className="w-full bg-slate-950/70 border-t border-slate-800/60 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'}`}
          />
          <span>{connected ? 'Live Connected' : 'Reconnecting...'}</span>
        </div>
        <div className="font-semibold text-slate-300">{nickname}</div>
      </footer>

      {/* Embedded CSS Animations */}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(180px) rotate(360deg); opacity: 0; }
        }
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 2px;
        }
        .animate-fall {
          animation: fall 1.5s ease-out infinite;
        }
        .animate-fall-delay-1 {
          animation: fall 1.8s ease-out 0.2s infinite;
        }
        .animate-fall-delay-2 {
          animation: fall 1.6s ease-out 0.4s infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        @keyframes scale-up {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scale-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-short {
          animation: bounce-short 0.5s ease;
        }
      `}</style>
    </div>
  );
}
