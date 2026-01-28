import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, GripVertical, Settings, Trash2, Copy, ArrowUp, ArrowDown, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useQuizzes } from '../../hooks/useQuizzes';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import type { Round } from '../../data/types';
import { api } from '../../data/client';

// Simple ID gen
const generateId = () => Math.random().toString(36).substr(2, 9);

export const QuizEditor = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { quizzes, updateQuiz, loading, lastSavedAt, saving } = useQuizzes();
    const [quiz, setQuiz] = useState(quizzes.find(q => q.id === id));
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (quizzes.length > 0) {
            setQuiz(quizzes.find(q => q.id === id));
            setIsDirty(false);
        }
    }, [quizzes, id]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!isDirty) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    if (loading) return <div>Loading...</div>;
    if (!quiz) return <div>Quiz not found</div>;

    const addRound = async (type: 'LINEAR' | 'GRID') => {
        setIsDirty(true);
        const newRound: Round = {
            id: generateId(),
            title: 'New Round',
            type,
            order: quiz.rounds.length,
            questions: []
        };
        const updatedQuiz = { ...quiz, rounds: [...quiz.rounds, newRound] };
        setQuiz(updatedQuiz);
        await updateQuiz(updatedQuiz);
        setIsDirty(false);
    };

    const updateQuizMeta = async (updates: Partial<typeof quiz>) => {
        setIsDirty(true);
        const updatedQuiz = { ...quiz, ...updates };
        setQuiz(updatedQuiz);
        await updateQuiz(updatedQuiz);
        setIsDirty(false);
    };

    const deleteRound = async (roundId: string) => {
        setIsDirty(true);
        const updatedRounds = quiz.rounds.filter(round => round.id !== roundId).map((round, index) => ({
            ...round,
            order: index,
        }));
        const updatedQuiz = { ...quiz, rounds: updatedRounds };
        setQuiz(updatedQuiz);
        await updateQuiz(updatedQuiz);
        setIsDirty(false);
    };

    const duplicateRound = async (round: Round) => {
        setIsDirty(true);
        const duplicated: Round = {
            ...round,
            id: generateId(),
            title: `${round.title} (Copy)`,
            order: quiz.rounds.length,
            questions: round.questions.map(q => ({ ...q, id: generateId() })),
        };
        const updatedQuiz = { ...quiz, rounds: [...quiz.rounds, duplicated] };
        setQuiz(updatedQuiz);
        await updateQuiz(updatedQuiz);
        setIsDirty(false);
    };

    const moveRound = async (roundId: string, direction: 'up' | 'down') => {
        const index = quiz.rounds.findIndex(r => r.id === roundId);
        if (index < 0) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= quiz.rounds.length) return;
        setIsDirty(true);
        const reordered = [...quiz.rounds];
        [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
        const normalized = reordered.map((round, idx) => ({ ...round, order: idx }));
        const updatedQuiz = { ...quiz, rounds: normalized };
        setQuiz(updatedQuiz);
        await updateQuiz(updatedQuiz);
        setIsDirty(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4 mb-8">
                <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold">{quiz.title}</h1>
                    <p className="text-gray-500 text-sm">Description: {quiz.description}</p>
                </div>
                {saving && <span className="text-xs text-blue-500">Saving...</span>}
                {!saving && lastSavedAt && <span className="text-xs text-gray-400">Saved {new Date(lastSavedAt).toLocaleTimeString()}</span>}
                <Button variant="secondary" onClick={() => setIsEditingSettings(!isEditingSettings)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                </Button>
            </div>

            {quiz.rounds.length > 0 && (
                <Card className="p-4 flex items-center gap-3 text-sm text-gray-600">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    {quiz.rounds.reduce((acc, round) => acc + round.questions.filter(q => !q.text.trim() || !q.answer.trim()).length, 0) === 0
                        ? 'All questions are complete.'
                        : `Incomplete questions: ${quiz.rounds.reduce((acc, round) => acc + round.questions.filter(q => !q.text.trim() || !q.answer.trim()).length, 0)}`}
                </Card>
            )}

            {isEditingSettings && (
                <Card className="p-6">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await api.uploadMedia(file);
                            if (url) {
                                updateQuizMeta({ coverImageUrl: url });
                            }
                            e.target.value = '';
                        }}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Quiz Title</label>
                            <input
                                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                                value={quiz.title}
                                onChange={(e) => updateQuizMeta({ title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                            <input
                                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                                value={quiz.description}
                                onChange={(e) => updateQuizMeta({ description: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cover Image URL</label>
                        <div className="flex gap-2">
                            <input
                                className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                                value={quiz.coverImageUrl || ''}
                                onChange={(e) => updateQuizMeta({ coverImageUrl: e.target.value })}
                                placeholder="/uploads/cover.jpg"
                            />
                            <Button variant="secondary" type="button" onClick={() => fileInputRef.current?.click()}>
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Browse
                            </Button>
                        </div>
                        <div className="mt-3">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cover Image Opacity</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={0}
                                    max={40}
                                    value={Math.round((quiz.coverImageOpacity ?? 0.12) * 100)}
                                    onChange={(e) => updateQuizMeta({ coverImageOpacity: Number(e.target.value) / 100 })}
                                    className="w-full"
                                />
                                <span className="text-xs text-gray-500 w-12 text-right">
                                    {Math.round((quiz.coverImageOpacity ?? 0.12) * 100)}%
                                </span>
                            </div>
                        </div>
                    </div>
                <div className="mt-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Intermission Message (shown between rounds)</label>
                    <textarea
                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-gray-50 focus:bg-white transition-colors"
                        rows={3}
                        value={quiz.intermissionMessage || ''}
                        onChange={(e) => updateQuizMeta({ intermissionMessage: e.target.value })}
                        placeholder="Example: Take 2 minutes to check scores!"
                    />
                </div>
                </Card>
            )}

            {/* Round List */}
            <div className="space-y-4">
                {quiz.rounds.map((round, index) => {
                    const incompleteCount = round.questions.filter(q => !q.text.trim() || !q.answer.trim()).length;
                    return (
                    <Card key={round.id} className="p-4 flex flex-wrap items-center gap-4">
                        <GripVertical className="text-gray-300 cursor-move" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                    {round.type}
                                </span>
                                <h3 className="font-bold text-lg">{round.title}</h3>
                            </div>
                            <p className="text-sm text-gray-500">
                                {round.questions.length} Questions
                                {incompleteCount > 0 && (
                                    <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                        {incompleteCount} incomplete
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" size="sm" onClick={() => moveRound(round.id, 'up')} disabled={index === 0}>
                                <ArrowUp className="w-4 h-4 mr-1" />
                                Up
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => moveRound(round.id, 'down')} disabled={index === quiz.rounds.length - 1}>
                                <ArrowDown className="w-4 h-4 mr-1" />
                                Down
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => navigate(`/quiz/${quiz.id}/round/${round.id}`)}>
                                Edit Round
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => duplicateRound(round)}>
                                <Copy className="w-4 h-4 mr-1" />
                                Duplicate
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => deleteRound(round.id)}>
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                            </Button>
                        </div>
                    </Card>
                )})}

                {quiz.rounds.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                        <p className="text-gray-500 mb-4">No rounds yet.</p>
                        <div className="flex justify-center gap-4">
                            <Button onClick={() => addRound('LINEAR')}>Add Standard Round</Button>
                            <Button variant="secondary" onClick={() => addRound('GRID')}>Add Grid/Jeopardy Round</Button>
                        </div>
                    </div>
                )}
            </div>

            {quiz.rounds.length > 0 && (
                <div className="flex justify-center gap-4 mt-8 pt-8 border-t border-gray-100">
                    <Button variant="ghost" onClick={() => addRound('LINEAR')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Standard Round
                    </Button>
                    <Button variant="ghost" onClick={() => addRound('GRID')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Grid Round
                    </Button>
                </div>
            )}
        </div>
    );
};
