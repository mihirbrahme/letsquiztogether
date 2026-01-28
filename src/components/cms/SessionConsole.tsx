import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSessions } from '../../hooks/useSessions';
import { useQuizzes } from '../../hooks/useQuizzes';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import type { Participant } from '../../data/types';
import { Download, Play, Trash2 } from 'lucide-react';

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString();

export const SessionConsole = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const { sessions, loading, addScoreEntry, clearScores, endSession, exportSession } = useSessions();
    const { quizzes } = useQuizzes();
    const [customDeltas, setCustomDeltas] = useState<Record<string, number>>({});
    const [note, setNote] = useState('');

    const session = useMemo(() => sessions.find((s) => s.id === sessionId), [sessions, sessionId]);
    const quiz = useMemo(() => quizzes.find((q) => q.id === session?.quizId), [quizzes, session]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading session...</div>;
    if (!session) return <div className="p-8 text-center text-gray-500">Session not found.</div>;

    const applyDelta = async (participant: Participant, delta: number) => {
        if (!delta) return;
        await addScoreEntry(session.id, {
            participantId: participant.id,
            participantName: participant.name,
            delta,
            totalAfter: session.scores[participant.id] + delta,
            note: note || undefined,
        });
        setNote('');
    };

    const exportJson = () => {
        const data = exportSession(session.id);
        if (!data) return;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-${session.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportCsv = () => {
        const data = exportSession(session.id);
        if (!data) return;
        const header = ['time', 'participant', 'delta', 'totalAfter', 'note'];
        const rows = data.history.map((entry) => [
            new Date(entry.createdAt).toISOString(),
            `"${entry.participantName.replace(/\"/g, '""')}"`,
            entry.delta,
            entry.totalAfter,
            entry.note ? `"${entry.note.replace(/\"/g, '""')}"` : '',
        ]);
        const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-${session.id}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{session.title}</h1>
                    <p className="text-sm text-gray-500">
                        Quiz: {quiz?.title || session.quizId} • Participants: {session.participants.length}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link to={`/present?quizId=${session.quizId}&sessionId=${session.id}`} target="_blank">
                        <Button variant="primary">
                            <Play className="w-4 h-4 mr-2" />
                            Open Presenter
                        </Button>
                    </Link>
                    <Button variant="secondary" onClick={exportJson}>
                        <Download className="w-4 h-4 mr-2" />
                        Export JSON
                    </Button>
                    <Button variant="secondary" onClick={exportCsv}>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button variant="danger" onClick={() => clearScores(session.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear Scores
                    </Button>
                    <Button variant="outline" onClick={() => endSession(session.id)}>
                        End Session
                    </Button>
                </div>
            </div>

            <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Add Scores</h2>
                    <input
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full max-w-sm"
                        placeholder="Optional note (e.g., bonus for creativity)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {session.participants.map((participant) => (
                        <div key={participant.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                                <div className="font-semibold text-gray-900">{participant.name}</div>
                                <div className="text-xl font-bold text-indigo-600">{session.scores[participant.id] ?? 0}</div>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {[1, 2, 5, 10].map((value) => (
                                    <Button
                                        key={`${participant.id}-${value}`}
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => applyDelta(participant, value)}
                                    >
                                        +{value}
                                    </Button>
                                ))}
                                <Button size="sm" variant="secondary" onClick={() => applyDelta(participant, -1)}>
                                    -1
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-24"
                                    placeholder="+/-"
                                    value={customDeltas[participant.id] ?? ''}
                                    onChange={(e) => setCustomDeltas((prev) => ({ ...prev, [participant.id]: Number(e.target.value) }))}
                                />
                                <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => applyDelta(participant, customDeltas[participant.id] || 0)}
                                >
                                    Apply
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Score History</h2>
                {session.history.length === 0 && (
                    <div className="text-sm text-gray-500">No scoring events yet.</div>
                )}
                <div className="space-y-3">
                    {session.history.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between border border-gray-100 rounded-xl p-3">
                            <div>
                                <div className="text-sm text-gray-400">{formatTime(entry.createdAt)}</div>
                                <div className="font-medium text-gray-900">{entry.participantName}</div>
                                {entry.note && <div className="text-xs text-gray-500">{entry.note}</div>}
                            </div>
                            <div className="text-right">
                                <div className={entry.delta >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                    {entry.delta >= 0 ? `+${entry.delta}` : entry.delta}
                                </div>
                                <div className="text-sm text-gray-400">Total: {entry.totalAfter}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};
