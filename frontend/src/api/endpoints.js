import api from './axios';

// Auth
export const register = (data) => {
  const payload = typeof data === 'string' ? { name: arguments[0], email: arguments[1], password: arguments[2] } : data;
  return api.post('/auth/register', payload);
};
export const registerUser = (name, email, password) => api.post('/auth/register', { name, email, password }).then(res => res.data?.data || res.data);

export const login = (data) => {
  const payload = typeof data === 'string' ? { email: arguments[0], password: arguments[1] } : data;
  return api.post('/auth/login', payload);
};
export const loginUser = (email, password) => api.post('/auth/login', { email, password }).then(res => res.data?.data || res.data);

export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');
export const refresh = () => api.post('/auth/refresh');

// Quizzes
export const getMyQuizzes = () => api.get('/quizzes').then(res => res.data?.data?.quizzes || res.data?.quizzes || res.data);
export const createQuiz = (data) => api.post('/quizzes', data).then(res => res.data?.data?.quiz || res.data?.quiz || res.data);
export const getQuiz = (id) => api.get(`/quizzes/${id}`).then(res => res.data?.data?.quiz || res.data?.quiz || res.data);
export const updateQuiz = (id, data) => api.put(`/quizzes/${id}`, data).then(res => res.data?.data?.quiz || res.data?.quiz || res.data);
export const deleteQuiz = (id) => api.delete(`/quizzes/${id}`).then(res => res.data?.data || res.data);
export const toggleQuizStatus = async (id, currentStatus) => {
  const quiz = await getQuiz(id);
  const nextStatus = currentStatus !== undefined ? !currentStatus : !quiz.is_active;
  return updateQuiz(id, { is_active: nextStatus });
};

// Questions
export const addQuestion = (quizId, data) => api.post(`/quizzes/${quizId}/questions`, data).then(res => res.data?.data?.question || res.data?.question || res.data);
export const updateQuestion = (qId, data) => api.put(`/quizzes/questions/${qId}`, data).then(res => res.data?.data?.question || res.data?.question || res.data);
export const deleteQuestion = (qId) => api.delete(`/quizzes/questions/${qId}`).then(res => res.data?.data || res.data);
export const reorderQuestions = (quizId, items) => api.post(`/quizzes/${quizId}/questions/reorder`, items).then(res => res.data?.data || res.data);

// Sessions
export const createSession = (quizIdOrData) => {
  const payload = typeof quizIdOrData === 'object' ? quizIdOrData : { quiz_id: quizIdOrData };
  return api.post('/sessions', payload).then(res => res.data?.data?.session || res.data?.session || res.data);
};
export const createOpenPollSession = () => api.post('/sessions/open-poll').then(res => res.data?.data || res.data);
export const getJoinInfo = (code) => api.get(`/sessions/${code}/join`).then(res => res.data?.data || res.data);
export const getSessionResults = (id) => api.get(`/sessions/${id}/results`).then(res => res.data?.data || res.data);
export const exportSessionResults = (id) => api.get(`/sessions/${id}/export`, { responseType: 'blob' });
export const getHostSessions = (params) => api.get('/sessions', { params }).then(res => res.data?.data?.sessions || res.data?.sessions || []);

// Aggregated / Dashboard helpers
export const getDashboardStats = async () => {
  try {
    const [quizzesRes, sessionsRes] = await Promise.all([
      api.get('/quizzes'),
      api.get('/sessions?limit=50'),
    ]);
    const quizzes = quizzesRes.data?.data?.quizzes || quizzesRes.data?.quizzes || [];
    const sessions = sessionsRes.data?.data?.sessions || sessionsRes.data?.sessions || [];
    const total_participants = sessions.reduce((acc, s) => acc + (s.participant_count || (s.participants?.length) || 0), 0);

    return {
      total_quizzes: quizzes.length,
      total_sessions: sessionsRes.data?.data?.pagination?.total ?? sessions.length,
      total_participants,
    };
  } catch {
    return { total_quizzes: 0, total_sessions: 0, total_participants: 0 };
  }
};

export const getRecentSessions = async (limit = 5) => {
  const res = await api.get(`/sessions?limit=${limit}`);
  return res.data?.data?.sessions || res.data?.sessions || [];
};

// Media upload
export const uploadMedia = (file) => {
  const formData = new FormData();
  formData.append('media', file);
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(res => res.data?.data || res.data);
};

// Admin
export const getAdminAnalytics = () => api.get('/admin/analytics').then(res => res.data?.data || res.data);
export const getAdminUsers = (page = 1, limit = 10) => api.get('/admin/users', { params: { page, limit } }).then(res => res.data?.data || res.data);
export const updateAdminUser = (id, data) => api.put(`/admin/users/${id}`, data).then(res => res.data?.data || res.data);
export const deleteAdminUser = (id, hard = true) => api.delete(`/admin/users/${id}${hard ? '?hard=true' : ''}`).then(res => res.data?.data || res.data);
export const getAdminQuizzes = (page = 1, limit = 10) => api.get('/admin/quizzes', { params: { page, limit } }).then(res => res.data?.data || res.data);
