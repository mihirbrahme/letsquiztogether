import { useCallback, useEffect, useState } from 'react';
import { api } from '../data/client';
import type { Participant, ScoreEntry, Session } from '../data/types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export function useSessions() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getSessions();
            setSessions(data as Session[]);
            setError(null);
        } catch (err) {
            setError('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const persist = async (next: Session[]) => {
        setSessions(next);
        await api.saveSessions(next);
    };

    const createSession = async (quizId: string, title: string, participantNames: string[]) => {
        const participants: Participant[] = participantNames.map((name) => ({
            id: generateId(),
            name,
        }));
        const scores = participants.reduce<Record<string, number>>((acc, participant) => {
            acc[participant.id] = 0;
            return acc;
        }, {});

        const newSession: Session = {
            id: generateId(),
            quizId,
            title,
            participants,
            scores,
            history: [],
            status: 'active',
            createdAt: new Date().toISOString(),
        };
        const next = [...sessions, newSession];
        await persist(next);
        return newSession;
    };

    const updateSession = async (session: Session) => {
        const next = sessions.map((s) => (s.id === session.id ? session : s));
        await persist(next);
    };

    const endSession = async (sessionId: string) => {
        const next: Session[] = sessions.map((s) => (
            s.id === sessionId
                ? { ...s, status: 'ended' as const, endedAt: new Date().toISOString() }
                : s
        ));
        await persist(next);
    };

    const clearScores = async (sessionId: string) => {
        const next = sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const resetScores = s.participants.reduce<Record<string, number>>((acc, participant) => {
                acc[participant.id] = 0;
                return acc;
            }, {});
            return { ...s, scores: resetScores, history: [] };
        });
        await persist(next);
    };

    const addScoreEntry = async (sessionId: string, entry: Omit<ScoreEntry, 'id' | 'createdAt'>) => {
        const next = sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const updatedScore = (s.scores[entry.participantId] || 0) + entry.delta;
            const newEntry: ScoreEntry = {
                ...entry,
                id: generateId(),
                totalAfter: updatedScore,
                createdAt: new Date().toISOString(),
            };
            return {
                ...s,
                scores: { ...s.scores, [entry.participantId]: updatedScore },
                history: [newEntry, ...s.history],
            };
        });
        await persist(next);
    };

    const exportSession = (sessionId: string) => {
        const session = sessions.find((s) => s.id === sessionId);
        return session || null;
    };

    return {
        sessions,
        loading,
        error,
        refresh,
        createSession,
        updateSession,
        endSession,
        clearScores,
        addScoreEntry,
        exportSession,
    };
}
