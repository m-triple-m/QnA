import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAdminAnalytics,
  getAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  getAdminQuizzes,
  deleteQuiz,
} from '@/api/endpoints';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Users,
  Layers,
  Radio,
  BarChart3,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { user } = useAuth();

  // Tabs: 'overview' | 'users' | 'quizzes'
  const [activeTab, setActiveTab] = useState('overview');

  // Stats state
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Users state
  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Quizzes state
  const [quizzes, setQuizzes] = useState([]);
  const [quizzesPage, setQuizzesPage] = useState(1);
  const [quizzesTotalPages, setQuizzesTotalPages] = useState(1);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [quizSearch, setQuizSearch] = useState('');

  // Delete Confirm Dialog state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: null, // 'user' | 'quiz'
    id: null,
    title: '',
  });

  // Preview Quiz Modal
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  // Load Analytics
  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const data = await getAdminAnalytics();
      setAnalytics(data);
    } catch (err) {
      toast.error('Failed to load platform analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Load Users
  const loadUsers = async (page = 1) => {
    setLoadingUsers(true);
    try {
      const data = await getAdminUsers(page, 10);
      setUsers(data.users || []);
      setUsersPage(data.pagination?.page || page);
      setUsersTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load Quizzes
  const loadQuizzes = async (page = 1) => {
    setLoadingQuizzes(true);
    try {
      const data = await getAdminQuizzes(page, 10);
      setQuizzes(data.quizzes || []);
      setQuizzesPage(data.pagination?.page || page);
      setQuizzesTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load quizzes');
    } finally {
      setLoadingQuizzes(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers(usersPage);
    } else if (activeTab === 'quizzes') {
      loadQuizzes(quizzesPage);
    }
  }, [activeTab]);

  // Toggle user active status
  const handleToggleUserStatus = async (targetUser) => {
    try {
      const newStatus = !targetUser.is_active;
      await updateAdminUser(targetUser.id, { is_active: newStatus });
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: newStatus } : u))
      );
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    if (!deleteModal.id || !deleteModal.type) return;

    try {
      if (deleteModal.type === 'user') {
        await deleteAdminUser(deleteModal.id, true);
        toast.success('User deleted successfully');
        loadUsers(usersPage);
        loadAnalytics();
      } else if (deleteModal.type === 'quiz') {
        await deleteQuiz(deleteModal.id);
        toast.success('Quiz deleted successfully');
        loadQuizzes(quizzesPage);
        loadAnalytics();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleteModal({ isOpen: false, type: null, id: null, title: '' });
    }
  };

  // Filtered lists
  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title?.toLowerCase().includes(quizSearch.toLowerCase()) ||
      q.host?.name?.toLowerCase().includes(quizSearch.toLowerCase())
  );

  // Calculate live active sessions from recent sessions
  const activeSessionsCount =
    analytics?.recentSessions?.filter((s) => s.status === 'live').length || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                Admin Control Center
              </h1>
              <p className="text-sm text-slate-500">
                Welcome back, {user?.name || 'Administrator'} • Platform Overview
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Users</span>
            </button>
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                activeTab === 'quizzes'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Quizzes</span>
            </button>
          </div>
        </div>

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Total Users */}
              <Card className="border-0 shadow-sm bg-white rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Total Users
                  </p>
                  <h3 className="text-3xl font-black text-slate-900 mt-1">
                    {analytics?.totalUsers ?? '...'}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </Card>

              {/* Total Quizzes */}
              <Card className="border-0 shadow-sm bg-white rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Total Quizzes
                  </p>
                  <h3 className="text-3xl font-black text-slate-900 mt-1">
                    {analytics?.totalQuizzes ?? '...'}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
              </Card>

              {/* Total Sessions */}
              <Card className="border-0 shadow-sm bg-white rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Total Sessions
                  </p>
                  <h3 className="text-3xl font-black text-slate-900 mt-1">
                    {analytics?.totalSessions ?? '...'}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6" />
                </div>
              </Card>

              {/* Active Sessions (Live Count) */}
              <Card className="border-0 shadow-sm bg-white rounded-2xl p-6 flex items-center justify-between ring-2 ring-emerald-500/20">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                      Live Sessions
                    </p>
                  </div>
                  <h3 className="text-3xl font-black text-emerald-700 mt-1">
                    {activeSessionsCount}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Radio className="w-6 h-6" />
                </div>
              </Card>
            </div>

            {/* Recent Live & Past Sessions Table */}
            <Card className="border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-100 p-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Recent Platform Sessions
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time snapshot of recent quiz games
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadAnalytics}
                  disabled={loadingAnalytics}
                  className="rounded-xl"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${loadingAnalytics ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Session PIN</th>
                        <th className="px-6 py-4">Quiz Title</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {analytics?.recentSessions && analytics.recentSessions.length > 0 ? (
                        analytics.recentSessions.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/70 transition">
                            <td className="px-6 py-4 font-mono font-bold text-purple-700">
                              {s.code}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              {s.quiz?.title || 'Untitled Quiz'}
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant={
                                  s.status === 'live'
                                    ? 'default'
                                    : s.status === 'waiting'
                                    ? 'secondary'
                                    : 'outline'
                                }
                                className={`uppercase text-[11px] font-bold ${
                                  s.status === 'live' ? 'bg-emerald-500 text-white' : ''
                                }`}
                              >
                                {s.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-xs">
                              {new Date(s.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-slate-400">
                            No recent sessions found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 2. USERS MANAGEMENT TAB */}
        {activeTab === 'users' && (
          <Card className="border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden bg-white animate-fade-in">
            <CardHeader className="border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">User Accounts</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage platform hosts, admins, and active statuses
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search user name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl text-sm"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Quizzes</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                          Loading users...
                        </td>
                      </tr>
                    ) : filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-6 py-4 font-bold text-slate-900">{u.name}</td>
                          <td className="px-6 py-4 text-slate-600">{u.email}</td>
                          <td className="px-6 py-4">
                            <Badge
                              variant={u.role === 'admin' ? 'default' : 'secondary'}
                              className="uppercase text-[10px] font-black"
                            >
                              {u.role}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-semibold">
                            {u.quiz_count ?? u.quizzes?.length ?? 0}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                u.is_active
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleUserStatus(u)}
                              className="rounded-xl text-xs h-8 px-3"
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  type: 'user',
                                  id: u.id,
                                  title: u.name,
                                })
                              }
                              className="rounded-xl text-xs h-8 px-2.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">
                          No users found matching query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Users Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <span className="text-xs text-slate-500 font-medium">
                  Page {usersPage} of {usersTotalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={usersPage <= 1 || loadingUsers}
                    onClick={() => {
                      const next = usersPage - 1;
                      setUsersPage(next);
                      loadUsers(next);
                    }}
                    className="rounded-xl h-8 px-2.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={usersPage >= usersTotalPages || loadingUsers}
                    onClick={() => {
                      const next = usersPage + 1;
                      setUsersPage(next);
                      loadUsers(next);
                    }}
                    className="rounded-xl h-8 px-2.5"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. QUIZZES MANAGEMENT TAB */}
        {activeTab === 'quizzes' && (
          <Card className="border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden bg-white animate-fade-in">
            <CardHeader className="border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">
                  Platform Quizzes
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage all hosted quizzes, inspect questions and sessions
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search title or host..."
                  value={quizSearch}
                  onChange={(e) => setQuizSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl text-sm"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Quiz Title</th>
                      <th className="px-6 py-4">Host</th>
                      <th className="px-6 py-4">Questions</th>
                      <th className="px-6 py-4">Created Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loadingQuizzes ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                          Loading quizzes...
                        </td>
                      </tr>
                    ) : filteredQuizzes.length > 0 ? (
                      filteredQuizzes.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-6 py-4 font-bold text-slate-900">{q.title}</td>
                          <td className="px-6 py-4 text-slate-600">
                            {q.host?.name || 'Unknown Host'}
                            <span className="block text-xs text-slate-400">{q.host?.email}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {q.questions?.length ?? '—'}
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-xs">
                            {new Date(q.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedQuiz(q)}
                              className="rounded-xl text-xs h-8 px-3"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  type: 'quiz',
                                  id: q.id,
                                  title: q.title,
                                })
                              }
                              className="rounded-xl text-xs h-8 px-2.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400">
                          No quizzes found matching query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Quizzes Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <span className="text-xs text-slate-500 font-medium">
                  Page {quizzesPage} of {quizzesTotalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={quizzesPage <= 1 || loadingQuizzes}
                    onClick={() => {
                      const next = quizzesPage - 1;
                      setQuizzesPage(next);
                      loadQuizzes(next);
                    }}
                    className="rounded-xl h-8 px-2.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={quizzesPage >= quizzesTotalPages || loadingQuizzes}
                    onClick={() => {
                      const next = quizzesPage + 1;
                      setQuizzesPage(next);
                      loadQuizzes(next);
                    }}
                    className="rounded-xl h-8 px-2.5"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog Modal */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-slate-900">
                  Confirm Permanent Delete
                </h3>
                <p className="text-sm text-slate-500">
                  Are you sure you want to delete {deleteModal.type === 'user' ? 'user' : 'quiz'}{' '}
                  <span className="font-bold text-slate-800">"{deleteModal.title}"</span>? This
                  action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setDeleteModal({ isOpen: false, type: null, id: null, title: '' })
                  }
                  className="flex-1 rounded-2xl h-11"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  className="flex-1 rounded-2xl h-11 bg-rose-600 hover:bg-rose-700"
                >
                  Delete Permanently
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* View Quiz Details Modal */}
        {selectedQuiz && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-900">Quiz Overview</h3>
                <button
                  onClick={() => setSelectedQuiz(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Title</label>
                  <p className="text-lg font-bold text-slate-900">{selectedQuiz.title}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Description</label>
                  <p className="text-sm text-slate-600">
                    {selectedQuiz.description || 'No description provided'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Host</label>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedQuiz.host?.name} ({selectedQuiz.host?.email})
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => setSelectedQuiz(null)}
                  className="w-full rounded-2xl h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
