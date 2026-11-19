import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, Play, ToggleLeft, ToggleRight,
  BookOpen, AlertTriangle, X, Loader2
} from 'lucide-react';
import { getMyQuizzes, deleteQuiz, toggleQuizStatus, createSession } from '@/api/endpoints';

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-5 border-b border-gray-100 animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-1/4" />
      </div>
      <div className="h-6 w-16 bg-gray-200 rounded-full" />
      <div className="h-8 w-24 bg-gray-200 rounded-lg" />
    </div>
  );
}

function DeleteDialog({ quiz, onCancel, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Delete Quiz</h3>
            <p className="text-sm text-gray-500">This cannot be undone</p>
          </div>
        </div>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <strong>&quot;{quiz?.title}&quot;</strong>?
          All questions and sessions will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuizListPage() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [starting, setStarting] = useState(null);

  const fetchQuizzes = useCallback(() => {
    setLoading(true);
    getMyQuizzes()
      .then(setQuizzes)
      .catch(() => toast.error('Failed to load quizzes'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteQuiz(toDelete.id);
      toast.success('Quiz deleted.');
      setQuizzes((prev) => prev.filter((q) => q.id !== toDelete.id));
      setToDelete(null);
    } catch {
      toast.error('Failed to delete quiz.');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async (quiz) => {
    setToggling(quiz.id);
    try {
      const updated = await toggleQuizStatus(quiz.id);
      setQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? { ...q, is_active: updated.is_active } : q)));
      toast.success(`Quiz ${updated.is_active ? 'activated' : 'deactivated'}.`);
    } catch {
      toast.error('Failed to update quiz status.');
    } finally {
      setToggling(null);
    }
  };

  const handleStartSession = async (quiz) => {
    setStarting(quiz.id);
    try {
      const session = await createSession(quiz.id);
      toast.success('Live session created!');
      navigate(`/host/session/${session.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to start session.');
    } finally {
      setStarting(null);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">My Quizzes</h1>
          <p className="text-gray-500 mt-0.5">Manage and launch your quiz library</p>
        </div>
        <button
          onClick={() => navigate('/host/quizzes/new')}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow transition"
        >
          <Plus className="w-5 h-5" />
          New Quiz
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
          </>
        ) : quizzes.length === 0 ? (
          <div className="py-20 text-center">
            <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-1">No quizzes yet</h3>
            <p className="text-gray-400 mb-6">Create your first quiz to get started!</p>
            <button
              onClick={() => navigate('/host/quizzes/new')}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2.5 rounded-xl transition"
            >
              <Plus className="w-5 h-5" />
              Create Quiz
            </button>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-5">Title</div>
              <div className="col-span-2 text-center">Questions</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="grid grid-cols-12 gap-2 items-center px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition last:border-0"
              >
                {/* Title + date */}
                <div className="col-span-5">
                  <p className="font-semibold text-gray-800 truncate">{quiz.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(quiz.createdAt)}</p>
                </div>

                {/* Questions count */}
                <div className="col-span-2 text-center">
                  <span className="text-sm font-semibold text-gray-600">
                    {quiz.question_count ?? quiz.Questions?.length ?? 0}
                  </span>
                </div>

                {/* Status toggle */}
                <div className="col-span-2 flex justify-center">
                  <button
                    onClick={() => handleToggle(quiz)}
                    disabled={toggling === quiz.id}
                    className="flex items-center gap-1.5 text-sm font-medium transition"
                  >
                    {toggling === quiz.id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    ) : quiz.is_active ? (
                      <>
                        <ToggleRight className="w-6 h-6 text-green-500" />
                        <span className="text-green-600 text-xs font-semibold">Active</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                        <span className="text-gray-400 text-xs font-semibold">Inactive</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Actions */}
                <div className="col-span-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => navigate(`/host/quizzes/${quiz.id}/edit`)}
                    className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleStartSession(quiz)}
                    disabled={starting === quiz.id}
                    className="flex items-center gap-1 text-xs font-semibold bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-60"
                    title="Start Session"
                  >
                    {starting === quiz.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Play className="w-3.5 h-3.5" />}
                    Start
                  </button>
                  <button
                    onClick={() => setToDelete(quiz)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Delete dialog */}
      {toDelete && (
        <DeleteDialog
          quiz={toDelete}
          onCancel={() => setToDelete(null)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
    </div>
  );
}
