import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, ArrowUp, ArrowDown, Save, ArrowLeft,
  Clock, Award, HelpCircle, CheckCircle2, Circle, AlertCircle, Loader2, Image
} from 'lucide-react';
import { createQuiz, getQuiz, updateQuiz, addQuestion, updateQuestion, deleteQuestion } from '@/api/endpoints';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'poll', label: 'Poll (No wrong answer)' },
];

const TIMER_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

const defaultQuestion = (order_index = 0) => ({
  id: undefined, // undefined for new question
  text: '',
  type: 'mcq',
  time_limit_sec: 30,
  points: 10,
  media_url: '',
  order_index,
  options: [
    { text: '', is_correct: true },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ],
});

export default function QuizBuilderPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([defaultQuestion(0)]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [originalQuestionIds, setOriginalQuestionIds] = useState([]);

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      getQuiz(id)
        .then((quizData) => {
          setTitle(quizData.title || '');
          setDescription(quizData.description || '');
          if (quizData.questions && quizData.questions.length > 0) {
            const sorted = [...quizData.questions].sort((a, b) => a.order_index - b.order_index);
            setQuestions(sorted);
            setOriginalQuestionIds(sorted.map((q) => q.id));
          }
        })
        .catch((err) => {
          toast.error(err?.response?.data?.message || 'Failed to load quiz');
          navigate('/host/quizzes');
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEditing, navigate]);

  // Question manipulation
  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, defaultQuestion(prev.length)]);
  };

  const handleRemoveQuestion = (idx) => {
    if (questions.length <= 1) {
      toast.error('Quiz must have at least one question.');
      return;
    }
    setQuestions((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((q, i) => ({ ...q, order_index: i }));
    });
  };

  const handleMove = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    setQuestions((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next.map((q, i) => ({ ...q, order_index: i }));
    });
  };

  const handleQuestionChange = (idx, field, value) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[idx], [field]: value };

      // Type-specific adjustments
      if (field === 'type') {
        if (value === 'true_false') {
          q.options = [
            { text: 'True', is_correct: true },
            { text: 'False', is_correct: false },
          ];
        } else if (value === 'short_answer') {
          q.options = [];
        } else if (value === 'poll') {
          q.points = 0;
          if (!q.options || q.options.length === 0) {
            q.options = [
              { text: '', is_correct: true },
              { text: '', is_correct: true },
            ];
          } else {
            q.options = q.options.map((o) => ({ ...o, is_correct: true }));
          }
        } else if (value === 'mcq') {
          if (!q.options || q.options.length < 2) {
            q.options = [
              { text: '', is_correct: true },
              { text: '', is_correct: false },
            ];
          }
        }
      }

      next[idx] = q;
      return next;
    });
  };

  // Options manipulation
  const handleOptionTextChange = (qIdx, optIdx, text) => {
    setQuestions((prev) => {
      const next = [...prev];
      const opts = [...next[qIdx].options];
      opts[optIdx] = { ...opts[optIdx], text };
      next[qIdx] = { ...next[qIdx], options: opts };
      return next;
    });
  };

  const handleOptionCorrectToggle = (qIdx, optIdx) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = next[qIdx];
      const opts = q.options.map((opt, i) => {
        if (q.type === 'mcq' || q.type === 'true_false') {
          return { ...opt, is_correct: i === optIdx };
        } else if (q.type === 'poll') {
          return { ...opt, is_correct: i === optIdx ? !opt.is_correct : opt.is_correct };
        }
        return opt;
      });
      next[qIdx] = { ...q, options: opts };
      return next;
    });
  };

  const handleAddOption = (qIdx) => {
    if (questions[qIdx].options.length >= 6) {
      toast.error('Maximum 6 options allowed');
      return;
    }
    setQuestions((prev) => {
      const next = [...prev];
      const opts = [...next[qIdx].options, { text: '', is_correct: false }];
      next[qIdx] = { ...next[qIdx], options: opts };
      return next;
    });
  };

  const handleRemoveOption = (qIdx, optIdx) => {
    if (questions[qIdx].options.length <= 2) {
      toast.error('At least 2 options required');
      return;
    }
    setQuestions((prev) => {
      const next = [...prev];
      const opts = next[qIdx].options.filter((_, i) => i !== optIdx);
      if (!opts.some((o) => o.is_correct) && opts.length > 0) {
        opts[0].is_correct = true;
      }
      next[qIdx] = { ...next[qIdx], options: opts };
      return next;
    });
  };

  // Validation
  const validateForm = () => {
    if (!title.trim() || title.length < 3) {
      toast.error('Quiz title must be at least 3 characters.');
      return false;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        toast.error(`Question #${i + 1} is missing text.`);
        return false;
      }
      if (q.type === 'mcq' || q.type === 'true_false') {
        if (!q.options || q.options.length < 2) {
          toast.error(`Question #${i + 1} needs at least 2 options.`);
          return false;
        }
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].text.trim()) {
            toast.error(`Question #${i + 1}, option #${j + 1} is empty.`);
            return false;
          }
        }
        if (!q.options.some((o) => o.is_correct)) {
          toast.error(`Question #${i + 1} must have a correct option selected.`);
          return false;
        }
      }
      if (q.type === 'poll') {
        if (!q.options || q.options.length < 2) {
          toast.error(`Poll question #${i + 1} needs at least 2 options.`);
          return false;
        }
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].text.trim()) {
            toast.error(`Poll question #${i + 1}, option #${j + 1} is empty.`);
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (!isEditing) {
        // Create new quiz
        const payload = {
          title: title.trim(),
          description: description.trim() || null,
          questions: questions.map((q, i) => ({
            text: q.text.trim(),
            type: q.type,
            time_limit_sec: Number(q.time_limit_sec),
            points: Number(q.points),
            order_index: i,
            media_url: q.media_url?.trim() || null,
            options: q.type === 'short_answer' ? [] : q.options.map((o) => ({
              text: o.text.trim(),
              is_correct: Boolean(o.is_correct),
            })),
          })),
        };
        await createQuiz(payload);
        toast.success('Quiz created successfully!');
        navigate('/host/quizzes');
      } else {
        // Update existing quiz
        await updateQuiz(id, {
          title: title.trim(),
          description: description.trim() || null,
        });

        // Sync questions
        const currentIds = questions.filter((q) => q.id).map((q) => q.id);
        const removedIds = originalQuestionIds.filter((origId) => !currentIds.includes(origId));

        for (const remId of removedIds) {
          await deleteQuestion(remId).catch(() => {});
        }

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const qPayload = {
            text: q.text.trim(),
            type: q.type,
            time_limit_sec: Number(q.time_limit_sec),
            points: Number(q.points),
            order_index: i,
            media_url: q.media_url?.trim() || null,
            options: q.type === 'short_answer' ? [] : q.options.map((o) => ({
              text: o.text.trim(),
              is_correct: Boolean(o.is_correct),
            })),
          };

          if (q.id) {
            await updateQuestion(q.id, qPayload).catch(() => {});
          } else {
            await addQuestion(id, qPayload).catch(() => {});
          }
        }

        toast.success('Quiz saved successfully!');
        navigate('/host/quizzes');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save quiz.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-gray-500 font-medium">Loading quiz details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/host/quizzes"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quizzes
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Quiz'}
        </button>
      </div>

      {/* Quiz metadata card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quiz Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Quiz Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. World History Trivia, JavaScript Mastery"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary or instructions for participants..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Questions list */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            Questions ({questions.length})
          </h2>
          <span className="text-sm text-gray-400">Use arrow buttons to reorder</span>
        </div>

        {questions.map((q, qIdx) => (
          <div
            key={q.id || `new-q-${qIdx}`}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition hover:border-purple-200"
          >
            {/* Header: Number, Reorder, Type, Delete */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                  {qIdx + 1}
                </span>
                <span className="font-semibold text-gray-700">Question {qIdx + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMove(qIdx, -1)}
                    disabled={qIdx === 0}
                    className="p-1 rounded text-gray-400 hover:text-purple-600 disabled:opacity-30 transition"
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(qIdx, 1)}
                    disabled={qIdx === questions.length - 1}
                    className="p-1 rounded text-gray-400 hover:text-purple-600 disabled:opacity-30 transition"
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={q.type}
                  onChange={(e) => handleQuestionChange(qIdx, 'type', e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-gray-50 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(qIdx)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                  title="Remove question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Question Text <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={q.text}
                onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                placeholder="What is the capital of..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800"
              />
            </div>

            {/* Settings row: Timer, Points, Media URL */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" /> Time Limit
                </label>
                <select
                  value={q.time_limit_sec}
                  onChange={(e) => handleQuestionChange(qIdx, 'time_limit_sec', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700 bg-white"
                >
                  {TIMER_OPTIONS.map((sec) => (
                    <option key={sec} value={sec}>{sec} seconds</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1">
                  <Award className="w-3.5 h-3.5 text-gray-400" /> Points
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="5"
                  value={q.points}
                  onChange={(e) => handleQuestionChange(qIdx, 'points', Number(e.target.value))}
                  disabled={q.type === 'poll'}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1">
                  <Image className="w-3.5 h-3.5 text-gray-400" /> Media URL (Optional)
                </label>
                <input
                  type="url"
                  value={q.media_url || ''}
                  onChange={(e) => handleQuestionChange(qIdx, 'media_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700"
                />
              </div>
            </div>

            {/* Options display based on type */}
            {q.type === 'short_answer' ? (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Participants will submit free-form text. Short answers are logged during the session for host review.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-600">
                    {q.type === 'poll'
                      ? 'Poll Options (Everyone gets points / no wrong answer)'
                      : q.type === 'true_false'
                      ? 'Select the correct statement'
                      : 'Answer Options (Click checkmark to set correct answer)'}
                  </span>
                  {q.type === 'mcq' && q.options.length < 6 && (
                    <button
                      type="button"
                      onClick={() => handleAddOption(qIdx)}
                      className="text-xs text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Option
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options?.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border transition ${
                        opt.is_correct && q.type !== 'poll'
                          ? 'border-green-400 bg-green-50/50'
                          : 'border-gray-200 bg-gray-50/50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleOptionCorrectToggle(qIdx, optIdx)}
                        className={`p-1 rounded-full transition ${
                          opt.is_correct
                            ? 'text-green-600'
                            : 'text-gray-300 hover:text-gray-500'
                        }`}
                        title={opt.is_correct ? 'Correct Answer' : 'Mark as Correct'}
                      >
                        {opt.is_correct ? (
                          <CheckCircle2 className="w-5 h-5 fill-green-100" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <input
                        type="text"
                        value={opt.text}
                        disabled={q.type === 'true_false'}
                        onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                        placeholder={`Option ${optIdx + 1}`}
                        className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
                      />

                      {q.type === 'mcq' && q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(qIdx, optIdx)}
                          className="p-1 text-gray-400 hover:text-red-500 transition"
                          title="Remove option"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add Question Button */}
        <button
          type="button"
          onClick={handleAddQuestion}
          className="w-full py-4 border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50/50 rounded-2xl flex items-center justify-center gap-2 text-purple-600 font-semibold transition"
        >
          <Plus className="w-5 h-5" />
          Add Another Question
        </button>
      </div>

      {/* Floating Save Footer for Convenience */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 p-4 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {questions.length} Question{questions.length === 1 ? '' : 's'} configured
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/host/quizzes"
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold px-6 py-2 rounded-xl shadow transition"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Quiz'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
