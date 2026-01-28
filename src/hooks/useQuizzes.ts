import { useState, useEffect, useCallback } from 'react';
import { api, type DBContent } from '../data/client';
import type { LibraryQuestion, Quiz } from '../data/types';

// Simple ID generator if uuid not available
const generateId = () => Math.random().toString(36).substr(2, 9);

export function useQuizzes() {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [library, setLibrary] = useState<LibraryQuestion[]>([]);
    const [version, setVersion] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getQuizData();
            setQuizzes(data.quizzes || []);
            setLibrary(data.library || []);
            setVersion(typeof data.version === 'number' ? data.version : 1);
            setError(null);
        } catch (err) {
            setError('Failed to load quizzes');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const persist = async (payload: DBContent) => {
        setSaving(true);
        const ok = await api.saveQuizData(payload);
        if (ok) {
            setLastSavedAt(new Date().toISOString());
        }
        setSaving(false);
        return ok;
    };

    const createQuiz = async (title: string, description: string) => {
        const newQuiz: Quiz = {
            id: generateId(),
            title,
            description,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            rounds: [],
        };
        const updated = [...quizzes, newQuiz];
        setQuizzes(updated);
        await persist({ version, quizzes: updated, library });
        return newQuiz;
    };

    const deleteQuiz = async (id: string) => {
        const updated = quizzes.filter(q => q.id !== id);
        setQuizzes(updated);
        await persist({ version, quizzes: updated, library });
    };

    const updateQuiz = async (quiz: Quiz) => {
        const updatedQuiz = { ...quiz, updatedAt: new Date().toISOString() };
        const updated = quizzes.map(q => q.id === quiz.id ? updatedQuiz : q);
        setQuizzes(updated);
        await persist({ version, quizzes: updated, library });
    };

    const createLibraryQuestion = async (question: Omit<LibraryQuestion, 'id' | 'createdAt' | 'updatedAt'>) => {
        const now = new Date().toISOString();
        const newQuestion: LibraryQuestion = {
            id: generateId(),
            createdAt: now,
            updatedAt: now,
            ...question,
            tags: question.tags || [],
        };
        const updated = [...library, newQuestion];
        setLibrary(updated);
        await persist({ version, quizzes, library: updated });
        return newQuestion;
    };

    const updateLibraryQuestion = async (question: LibraryQuestion) => {
        const updatedQuestion = { ...question, updatedAt: new Date().toISOString() };
        const updated = library.map(q => q.id === updatedQuestion.id ? updatedQuestion : q);
        setLibrary(updated);
        await persist({ version, quizzes, library: updated });
    };

    const deleteLibraryQuestion = async (id: string) => {
        const updated = library.filter(q => q.id !== id);
        setLibrary(updated);
        await persist({ version, quizzes, library: updated });
    };

    const importData = async (payload: Partial<DBContent>) => {
        const nextVersion = typeof payload.version === 'number' ? payload.version : version;
        const nextQuizzes = Array.isArray(payload.quizzes) ? payload.quizzes : quizzes;
        const nextLibrary = Array.isArray(payload.library) ? payload.library : library;
        setVersion(nextVersion);
        setQuizzes(nextQuizzes);
        setLibrary(nextLibrary);
        await persist({ version: nextVersion, quizzes: nextQuizzes, library: nextLibrary });
    };

    const exportData = (): DBContent => ({ version, quizzes, library });

    return {
        quizzes,
        library,
        version,
        loading,
        saving,
        error,
        lastSavedAt,
        createQuiz,
        deleteQuiz,
        updateQuiz,
        createLibraryQuestion,
        updateLibraryQuestion,
        deleteLibraryQuestion,
        importData,
        exportData,
        refresh,
    };
}
