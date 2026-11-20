import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BookOpen, Users, PlayCircle, TrendingUp,
  Plus, ChevronRight, Calendar, Clock, Cloud
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats, getRecentSessions } from '@/api/endpoints';

const statusColors = {
  waiting: 'bg-yellow-100 text-yellow-700',
  live: 'bg-green-100 text-green-700',
  ended: 'bg-gray-100 text-gray-600',
};

function StatCard({ icon: Icon, label, value, color, loading }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        {loading ? (
          <div className="h-7 w-16 bg-gray-200 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-3xl font-bold text-gray-800">{value ?? 0}</p>
        )}
      </div>
    </div>
  );
}

export default function HostDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoadingStats(false));

    getRecentSessions(5)
      .then(setSessions)
      .catch(() => toast.error('Failed to load recent sessions'))
      .finally(() => setLoadingSessions(false));
  }, []);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-800">
          Welcome back, {user?.name?.split(' ')[0] ?? 'Host'}! 👋
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your quizzes.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={BookOpen}
          label="Total Quizzes"
          value={stats?.total_quizzes}
          color="bg-purple-100 text-purple-600"
          loading={loadingStats}
        />
        <StatCard
          icon={PlayCircle}
          label="Total Sessions"
          value={stats?.total_sessions}
          color="bg-blue-100 text-blue-600"
          loading={loadingStats}
        />
        <StatCard
          icon={Users}
          label="Total Participants"
          value={stats?.total_participants}
          color="bg-green-100 text-green-600"
          loading={loadingStats}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-gray-700 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/host/quizzes/new')}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition"
          >
            <Plus className="w-5 h-5" />
            Create New Quiz
          </button>
          <button
            onClick={() => navigate('/host/open-qna')}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition"
          >
            <Cloud className="w-5 h-5 text-cyan-200" />
            Live Word Cloud Q&A
          </button>
          <button
            onClick={() => navigate('/host/quizzes')}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-5 py-2.5 rounded-xl shadow-sm border border-gray-200 transition"
          >
            <BookOpen className="w-5 h-5 text-purple-500" />
            View All Quizzes
          </button>
          <button
            onClick={() => navigate('/host/sessions')}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-5 py-2.5 rounded-xl shadow-sm border border-gray-200 transition"
          >
            <TrendingUp className="w-5 h-5 text-blue-500" />
            View Sessions
          </button>
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-700">Recent Sessions</h2>
          <Link to="/host/sessions" className="text-sm text-purple-600 hover:underline font-medium flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loadingSessions ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center">
              <PlayCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No sessions yet.</p>
              <p className="text-sm text-gray-400">Start your first quiz session!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">
                      {session.quiz?.title ?? 'Untitled Quiz'}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(session.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {session.participant_count ?? 0} participants
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[session.status] ?? statusColors.ended}`}>
                    {session.status}
                  </span>
                  <Link
                    to={`/host/session/${session.id}`}
                    className="text-purple-600 hover:text-purple-800 transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
