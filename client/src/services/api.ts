import axios from 'axios';

const isProd = import.meta.env.PROD || !!import.meta.env.VITE_VERCEL;
const defaultBaseURL = isProd ? '' : 'http://localhost:4000';
const baseURL = import.meta.env.VITE_API_URL || defaultBaseURL;

export const api = axios.create({
  baseURL: baseURL || undefined,
  timeout: 120000,
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export type UserDTO = {
  id: string;
  name: string;
  email: string;
  role: 'interviewer' | 'candidate';
};

export async function loginRequest(email: string, password: string) {
  const { data } = await api.post<{ token: string; user: UserDTO }>('/api/auth/login', {
    email,
    password,
  });
  return data;
}

export async function registerRequest(body: {
  name: string;
  email: string;
  password: string;
  role: 'interviewer' | 'candidate';
}) {
  const { data } = await api.post<{ token: string; user: UserDTO }>('/api/auth/register', body);
  return data;
}

export async function simplifyQuestion(question: string) {
  const { data } = await api.post<{ simplified: string }>('/api/ai/simplify', { question });
  return data.simplified;
}

export async function aiFeedback(words: string[], role: string) {
  const { data } = await api.post<{ score: number; bullets: string[]; raw?: string }>(
    '/api/ai/feedback',
    { words, role }
  );
  return data;
}

export async function generateQuestion(role: string, difficulty: string) {
  const { data } = await api.post<{ question: string }>('/api/ai/generate-question', {
    role,
    difficulty,
  });
  return data.question;
}

export type SessionDTO = {
  _id: string;
  type: 'live' | 'mock';
  durationSeconds: number;
  wordsDetected: number;
  role: string;
  transcript: string;
  interviewerText?: string;
  simplifiedText?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};

export async function fetchSessions() {
  const { data } = await api.get<SessionDTO[]>('/api/sessions');
  return data;
}

export async function createSession(payload: Partial<SessionDTO> & { type: 'live' | 'mock' }) {
  const { data } = await api.post<SessionDTO>('/api/sessions', payload);
  return data;
}

export async function patchSession(id: string, payload: Partial<SessionDTO>) {
  const { data } = await api.patch<SessionDTO>(`/api/sessions/${id}`, payload);
  return data;
}
