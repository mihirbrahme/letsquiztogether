import React, { useState } from 'react';
import { Plus, Trash2, Edit, Play, Upload, Download, Sparkles, FileSpreadsheet, Users } from 'lucide-react';
import { useQuizzes } from '../../hooks/useQuizzes';
import { useSessions } from '../../hooks/useSessions';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { Link, useNavigate } from 'react-router-dom';
import type { MediaType, Round, RoundType } from '../../data/types';

export const Dashboard = () => {
    const { quizzes, loading, createQuiz, updateQuiz, deleteQuiz, importData, exportData, lastSavedAt, saving } = useQuizzes();
    const { sessions, createSession } = useSessions();
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const quizCsvInputRef = React.useRef<HTMLInputElement | null>(null);
    const [sessionSetupQuizId, setSessionSetupQuizId] = useState<string | null>(null);
    const [sessionTitle, setSessionTitle] = useState('');
    const [participantInputs, setParticipantInputs] = useState<string[]>(['', '']);


    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        await createQuiz(newTitle, 'New Quiz Description');
        setNewTitle('');
        setIsCreating(false);
    };

    const parseCsv = (text: string) => {
        const rows: string[][] = [];
        let current = '';
        let inQuotes = false;
        let row: string[] = [];

        for (let i = 0; i < text.length; i += 1) {
            const char = text[i];
            const next = text[i + 1];

            if (char === '"' && next === '"') {
                current += '"';
                i += 1;
                continue;
            }

            if (char === '"') {
                inQuotes = !inQuotes;
                continue;
            }

            if (!inQuotes && (char === ',' || char === '\n' || char === '\r')) {
                if (char === '\r' && next === '\n') {
                    i += 1;
                }
                row.push(current);
                current = '';
                if (char === '\n' || char === '\r') {
                    if (row.some(cell => cell.trim() !== '')) {
                        rows.push(row);
                    }
                    row = [];
                }
                continue;
            }

            current += char;
        }

        if (current.length > 0 || row.length > 0) {
            row.push(current);
            if (row.some(cell => cell.trim() !== '')) {
                rows.push(row);
            }
        }

        return rows;
    };

    const importQuizCsv = async (file: File) => {
        const text = await file.text();
        const rows = parseCsv(text);
        if (rows.length === 0) {
            alert('No rows found in CSV.');
            return;
        }

        const headers = rows[0].map((h) => h.trim().toLowerCase());
        const dataRows = rows.slice(1);
        const get = (row: string[], keys: string[]) => {
            const idx = keys.map(k => headers.indexOf(k)).find((value) => value >= 0) ?? -1;
            return idx >= 0 ? row[idx] : '';
        };

        const quizMap = new Map<string, { description: string; rounds: Map<string, Round> }>();

        for (const row of dataRows) {
            const quizTitle = get(row, ['quiz_title', 'quiz', 'quizname']).trim();
            const quizDescription = get(row, ['quiz_description', 'description']).trim() || 'Imported quiz';
            const roundTitle = get(row, ['round_title', 'round', 'roundname']).trim();
            const roundTypeRaw = get(row, ['round_type', 'roundtype']).trim().toUpperCase() as RoundType;
            const questionText = get(row, ['question', 'question_text', 'text']).trim();
            const answer = get(row, ['answer']).trim();

            if (!quizTitle || !roundTitle || !questionText || !answer) continue;

            const questionType = (get(row, ['type', 'question_type']).trim().toUpperCase() || 'TEXT') as MediaType;
            const mediaUrl = get(row, ['mediaurl', 'media_url']).trim();
            const notes = get(row, ['notes', 'presenter_notes']).trim();
            const pointsRaw = get(row, ['points']).trim();
            const category = get(row, ['category', 'category_id']).trim();

            if (!quizMap.has(quizTitle)) {
                quizMap.set(quizTitle, { description: quizDescription, rounds: new Map() });
            }
            const quizEntry = quizMap.get(quizTitle)!;
            const roundType = (roundTypeRaw === 'GRID' ? 'GRID' : 'LINEAR') as RoundType;

            if (!quizEntry.rounds.has(roundTitle)) {
                quizEntry.rounds.set(roundTitle, {
                    id: Math.random().toString(36).substr(2, 9),
                    title: roundTitle,
                    type: roundType,
                    order: quizEntry.rounds.size,
                    questions: [],
                });
            }

            const round = quizEntry.rounds.get(roundTitle)!;
            const question = {
                id: Math.random().toString(36).substr(2, 9),
                text: questionText,
                type: questionType,
                answer,
                mediaUrl: mediaUrl || undefined,
                notes: notes || undefined,
                points: pointsRaw ? Number(pointsRaw) : 10,
            };

            if (round.type === 'GRID') {
                if (!category) continue;
                const gridQuestion = { ...question, categoryId: category, points: pointsRaw ? Number(pointsRaw) : 100 };
                round.questions.push(gridQuestion);
                round.categories = Array.from(new Set([...(round.categories || []), category]));
                round.gridPoints = Array.from(new Set([...(round.gridPoints || []), gridQuestion.points || 100])).sort((a, b) => a - b);
            } else {
                round.questions.push(question);
            }
        }

        if (quizMap.size === 0) {
            alert('No valid rows found. Check required columns: quiz_title, round_title, question, answer.');
            return;
        }

        for (const [title, entry] of quizMap.entries()) {
            const quiz = await createQuiz(title, entry.description);
            const rounds = Array.from(entry.rounds.values()).map((round, index) => ({
                ...round,
                order: index,
            }));
            await updateQuiz({ ...quiz, rounds });
        }

        alert(`Imported ${quizMap.size} quiz${quizMap.size > 1 ? 'es' : ''}.`);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading quizzes...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
                    <p className="text-gray-500 mt-1">Manage your quizzes and sessions</p>
                </div>
                <div className="flex items-center gap-2">
                    {saving && <span className="text-xs text-blue-500">Saving...</span>}
                    {!saving && lastSavedAt && (
                        <span className="text-xs text-gray-400">Saved {new Date(lastSavedAt).toLocaleTimeString()}</span>
                    )}
                    <input
                        type="file"
                        accept="application/json"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const text = await file.text();
                            try {
                                const data = JSON.parse(text);
                                await importData(data);
                            } catch {
                                alert('Invalid JSON file.');
                            } finally {
                                e.target.value = '';
                            }
                        }}
                    />
                    <input
                        type="file"
                        accept=".csv,text/csv"
                        ref={quizCsvInputRef}
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                importQuizCsv(file);
                            }
                            e.target.value = '';
                        }}
                    />
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Import
                    </Button>
                    <Button variant="secondary" onClick={() => quizCsvInputRef.current?.click()}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Import Quiz CSV
                    </Button>
                    <Button variant="secondary" onClick={() => {
                        const data = exportData();
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `quiz-data-${new Date().toISOString().slice(0, 10)}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Button onClick={() => setIsCreating(true)}>
                        <Plus className="w-5 h-5 mr-2" />
                        New Quiz
                    </Button>
                </div>
            </div>


            {isCreating && (
                <Card className="p-6 transition-all animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleCreate} className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium text-gray-700">Quiz Title</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="e.g. Friday Night Trash Trivia"
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                            <Button type="submit">Create</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.length === 0 && !isCreating && (
                    <div className="col-span-full py-12 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                        <p className="text-gray-500">No quizzes yet. Create one to get started!</p>
                        <div className="mt-4 text-xs text-gray-400 flex items-center justify-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Import your quiz library or start from scratch.
                        </div>
                    </div>
                )}

                {quizzes.map((quiz) => {
                    const activeSession = sessions.find((session) => session.quizId === quiz.id && session.status === 'active');
                    const isSessionSetupOpen = sessionSetupQuizId === quiz.id;
                    return (
                    <Card key={quiz.id} variant="interactive" className="group flex flex-col justify-between p-6 relative">

                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteQuiz(quiz.id); }}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                title="Delete Quiz"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2 truncate pr-8">{quiz.title}</h3>
                            <p className="text-sm text-gray-500">
                                {quiz.rounds.length} Rounds • {quiz.rounds.reduce((acc, r) => acc + r.questions.length, 0)} Questions
                            </p>
                            <p className="text-xs text-gray-400 mt-4">Created {new Date(quiz.createdAt).toLocaleDateString()}</p>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="flex-1"
                                onClick={() => navigate(`/quiz/${quiz.id}`)}
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                            <Link to={`/present?quizId=${quiz.id}${activeSession ? `&sessionId=${activeSession.id}` : ''}`} target="_blank" className="flex-1">
                                <Button variant="primary" size="sm" className="w-full">
                                    <Play className="w-4 h-4 mr-2" />
                                    Present
                                </Button>
                            </Link>
                        </div>

                        <div className="flex gap-2 mt-3">
                            {activeSession ? (
                                <Link to={`/session/${activeSession.id}`} className="flex-1">
                                    <Button variant="secondary" size="sm" className="w-full">
                                        <Users className="w-4 h-4 mr-2" />
                                        Open Session
                                    </Button>
                                </Link>
                            ) : (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => {
                                        setSessionSetupQuizId(quiz.id);
                                        setSessionTitle(`${quiz.title} Session`);
                                        setParticipantInputs(['', '']);
                                    }}
                                >
                                    <Users className="w-4 h-4 mr-2" />
                                    Start Session
                                </Button>
                            )}
                        </div>

                        {isSessionSetupOpen && (
                            <div className="mt-4 p-4 border border-gray-100 rounded-xl bg-gray-50 space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Session Title</label>
                                    <input
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                        value={sessionTitle}
                                        onChange={(e) => setSessionTitle(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Participants (2–20)</div>
                                    {participantInputs.map((value, idx) => (
                                        <div key={`${quiz.id}-participant-${idx}`} className="flex gap-2">
                                            <input
                                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                placeholder={`Participant ${idx + 1}`}
                                                value={value}
                                                onChange={(e) => {
                                                    const next = [...participantInputs];
                                                    next[idx] = e.target.value;
                                                    setParticipantInputs(next);
                                                }}
                                            />
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setParticipantInputs(participantInputs.filter((_, i) => i !== idx))}
                                                disabled={participantInputs.length <= 2}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setParticipantInputs([...participantInputs, ''])}
                                        disabled={participantInputs.length >= 20}
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Add Participant
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={async () => {
                                            const names = participantInputs.map((name) => name.trim()).filter(Boolean);
                                            if (names.length < 2 || names.length > 20) {
                                                alert('Please add between 2 and 20 participants.');
                                                return;
                                            }
                                            try {
                                                const session = await createSession(quiz.id, sessionTitle || `${quiz.title} Session`, names);
                                                setSessionSetupQuizId(null);
                                                navigate(`/session/${session.id}`);
                                            } catch (err) {
                                                alert('Failed to create session. Please check admin access and try again.');
                                            }
                                        }}
                                    >
                                        Create Session
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setSessionSetupQuizId(null)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                )})}
            </div>
        </div>
    );
};
