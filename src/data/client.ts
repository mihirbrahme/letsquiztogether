import { createClient } from '@supabase/supabase-js';
import type { LibraryQuestion, Quiz } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_URL = `${API_BASE_URL}/api/quiz`;
const SESSIONS_URL = `${API_BASE_URL}/api/sessions`;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'quiz-media';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export type DBContent = {
    version: number;
    quizzes: Quiz[];
    library: LibraryQuestion[];
}

const DEFAULT_DB: DBContent = { version: 1, quizzes: [], library: [] };

const getAdminToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('adminToken') || '';
};

const getAdminHeaders = (): Record<string, string> => {
    const token = getAdminToken();
    return token ? { 'x-admin-token': token } : {};
};

export const api = {
    getQuizData: async (): Promise<DBContent> => {
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error('Failed to fetch data');
            const data = await res.json();
            return {
                version: typeof data.version === 'number' ? data.version : DEFAULT_DB.version,
                quizzes: Array.isArray(data.quizzes) ? data.quizzes : [],
                library: Array.isArray(data.library) ? data.library : [],
            };
        } catch (e) {
            console.error(e);
            return DEFAULT_DB;
        }
    },

    saveQuizData: async (payload: DBContent): Promise<boolean> => {
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getAdminHeaders() };
            const res = await fetch(API_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            return res.ok;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    getSessions: async () => {
        try {
            const res = await fetch(SESSIONS_URL);
            if (!res.ok) throw new Error('Failed to fetch sessions');
            const data = await res.json();
            return Array.isArray(data.sessions) ? data.sessions : [];
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    saveSessions: async (sessions: unknown[]): Promise<boolean> => {
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getAdminHeaders() };
            const res = await fetch(SESSIONS_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify({ sessions }),
            });
            return res.ok;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    uploadMedia: async (file: File): Promise<string | null> => {
        try {
            if (supabase) {
                const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
                const safeName = file.name.replace(/[^a-zA-Z0-9-_\\.]/g, '');
                const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                const filePath = `${safeName || 'upload'}-${unique}${ext ? `.${ext}` : ''}`;
                const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: file.type || undefined,
                });
                if (error) throw error;
                const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath);
                return data.publicUrl || null;
            }

            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
                headers: getAdminHeaders(),
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            return data.url || null;
        } catch (e) {
            console.error(e);
            return null;
        }
    },
};
