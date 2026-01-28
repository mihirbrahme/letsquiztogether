import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Image as ImageIcon, Video, Mic, Type, Search, Upload, CheckCircle2, ArrowUp, ArrowDown } from 'lucide-react';
import { useQuizzes } from '../../hooks/useQuizzes';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import type { LibraryQuestion, Question, MediaType } from '../../data/types';
import { api } from '../../data/client';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const RoundEditor = () => {
    const { quizId, roundId } = useParams<{ quizId: string; roundId: string }>();
    const navigate = useNavigate();
    const { quizzes, updateQuiz, loading, library, lastSavedAt, saving } = useQuizzes();
    const [quiz, setQuiz] = useState(quizzes.find(q => q.id === quizId));
    const [librarySearch, setLibrarySearch] = useState('');
    const [uploadTarget, setUploadTarget] = useState<string | null>(null);
    const [connectUploadTarget, setConnectUploadTarget] = useState<{ questionId: string; index: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const roundCoverInputRef = useRef<HTMLInputElement | null>(null);
    const [selectedGridCell, setSelectedGridCell] = useState<{ category: string; points: number } | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // Local state for the round to allow editing before saving? 
    // Or direct update? Direct update is easier for now.

    useEffect(() => {
        if (quizzes.length > 0) {
            setQuiz(quizzes.find(q => q.id === quizId));
            setIsDirty(false);
        }
    }, [quizzes, quizId]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!isDirty) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const roundIndex = quiz ? quiz.rounds.findIndex(r => r.id === roundId) : -1;
    const round = quiz && roundIndex >= 0 ? quiz.rounds[roundIndex] : null;

    const handleUpdateRound = async (updatedRound: any) => {
        if (!quiz || roundIndex < 0) return;
        setIsDirty(true);
        const newRounds = [...quiz.rounds];
        newRounds[roundIndex] = updatedRound;
        const newQuiz = { ...quiz, rounds: newRounds };
        setQuiz(newQuiz);
        await updateQuiz(newQuiz);
        setIsDirty(false);
    };

    useEffect(() => {
        if (!round || round.type !== 'GRID') return;
        const categories = round.categories?.length ? round.categories : ['Category 1', 'Category 2', 'Category 3', 'Category 4', 'Category 5'];
        const gridPoints = round.gridPoints?.length ? round.gridPoints : [100, 200, 300, 400, 500];
        if (categories !== round.categories || gridPoints !== round.gridPoints) {
            handleUpdateRound({ ...round, categories, gridPoints });
        }
    }, [round]);

    const filteredLibrary = useMemo(() => {
        const query = librarySearch.trim().toLowerCase();
        if (!query) return library;
        return library.filter(item => (
            item.text.toLowerCase().includes(query)
            || item.answer.toLowerCase().includes(query)
            || item.tags.some(tag => tag.toLowerCase().includes(query))
        ));
    }, [library, librarySearch]);

    if (loading) return <div>Loading...</div>;
    if (!quiz) return <div>Quiz not found</div>;
    if (!round) return <div>Round not found</div>;

    const normalizedRound = round;

    const addQuestion = () => {
        const newQuestion: Question = {
            id: generateId(),
            text: '',
            type: 'TEXT',
            answer: '',
            points: 10
        };
        handleUpdateRound({
            ...normalizedRound,
            questions: [...round.questions, newQuestion]
        });
    };

    const addQuestionFromLibrary = (question: LibraryQuestion) => {
        const newQuestion: Question = {
            id: generateId(),
            text: question.text,
            type: question.type,
            mediaUrl: question.mediaUrl,
            answer: question.answer,
            points: question.points ?? 10,
        };
        handleUpdateRound({
            ...normalizedRound,
            questions: [...round.questions, newQuestion],
        });
    };

    const updateQuestion = (qId: string, field: keyof Question, value: any) => {
        const updatedQuestions = round.questions.map(q =>
            q.id === qId ? { ...q, [field]: value } : q
        );
        handleUpdateRound({ ...normalizedRound, questions: updatedQuestions });
    };

    const deleteQuestion = (qId: string) => {
        const updatedQuestions = round.questions.filter(q => q.id !== qId);
        handleUpdateRound({ ...normalizedRound, questions: updatedQuestions });
    };

    const moveQuestion = (qId: string, direction: 'up' | 'down') => {
        const index = round.questions.findIndex(q => q.id === qId);
        if (index < 0) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= round.questions.length) return;
        const reordered = [...round.questions];
        [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
        handleUpdateRound({ ...normalizedRound, questions: reordered });
    };

    const setQuestionOrder = (qId: string, targetPosition: number) => {
        const sourceIndex = round.questions.findIndex(q => q.id === qId);
        if (sourceIndex < 0) return;
        const clamped = Math.max(1, Math.min(targetPosition, round.questions.length));
        const targetIndex = clamped - 1;
        if (sourceIndex === targetIndex) return;
        const reordered = [...round.questions];
        const [moved] = reordered.splice(sourceIndex, 1);
        reordered.splice(targetIndex, 0, moved);
        handleUpdateRound({ ...normalizedRound, questions: reordered });
    };

    const updateRoundTitle = async (title: string) => {
        handleUpdateRound({ ...normalizedRound, title });
    };

    const updateGridCategories = (categories: string[]) => {
        handleUpdateRound({ ...normalizedRound, categories });
    };

    const updateGridPoints = (gridPoints: number[]) => {
        handleUpdateRound({ ...normalizedRound, gridPoints });
    };

    const getGridQuestion = (category: string, points: number) => {
        return normalizedRound.questions.find(q => q.categoryId === category && q.points === points);
    };

    const upsertGridQuestion = (category: string, points: number, updates: Partial<Question>) => {
        const existing = getGridQuestion(category, points);
        if (existing) {
            updateQuestion(existing.id, 'text', updates.text ?? existing.text);
            updateQuestion(existing.id, 'answer', updates.answer ?? existing.answer);
            if (updates.type) updateQuestion(existing.id, 'type', updates.type);
            if (typeof updates.mediaUrl !== 'undefined') updateQuestion(existing.id, 'mediaUrl', updates.mediaUrl);
            if (typeof updates.notes !== 'undefined') updateQuestion(existing.id, 'notes', updates.notes);
            return;
        }
        const newQuestion: Question = {
            id: generateId(),
            text: updates.text || '',
            type: updates.type || 'TEXT',
            answer: updates.answer || '',
            points,
            categoryId: category,
            mediaUrl: updates.mediaUrl,
            notes: updates.notes,
        };
        handleUpdateRound({
            ...normalizedRound,
            questions: [...normalizedRound.questions, newQuestion],
        });
    };

    const handleUpload = async (file: File) => {
        const url = await api.uploadMedia(file);
        if (url && uploadTarget) {
            updateQuestion(uploadTarget, 'mediaUrl', url);
        }
        setUploadTarget(null);
    };

    const handleConnectUpload = async (file: File) => {
        const url = await api.uploadMedia(file);
        if (url && connectUploadTarget) {
            const { questionId, index } = connectUploadTarget;
            const question = round.questions.find(q => q.id === questionId);
            if (question) {
                const nextItems = [...(question.connectItems || [])];
                nextItems[index] = url;
                updateQuestion(questionId, 'connectItems', nextItems);
            }
        }
        setConnectUploadTarget(null);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && connectUploadTarget) {
                        handleConnectUpload(file);
                    } else if (file) {
                        handleUpload(file);
                    }
                    e.target.value = '';
                }}
            />
            <input
                type="file"
                ref={roundCoverInputRef}
                className="hidden"
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await api.uploadMedia(file);
                    if (url) {
                        handleUpdateRound({ ...normalizedRound, coverImageUrl: url });
                    }
                    e.target.value = '';
                }}
            />
            <div className="flex flex-wrap items-center gap-4 mb-8">
                <Button variant="ghost" size="sm" onClick={() => navigate(`/quiz/${quizId}`)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">Editing: {normalizedRound.title}</h1>
                    <p className="text-gray-500 text-sm">Round Type: {normalizedRound.type}</p>
                </div>
                {saving && <span className="text-xs text-blue-500">Saving...</span>}
                {!saving && lastSavedAt && <span className="text-xs text-gray-400">Saved {new Date(lastSavedAt).toLocaleTimeString()}</span>}
            </div>

            <Card className="p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Round Title</label>
                        <input
                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                            value={normalizedRound.title}
                            onChange={(e) => updateRoundTitle(e.target.value)}
                        />
                    </div>
                    <div className="text-xs text-gray-500 flex items-end">
                        <span>Total Questions: {normalizedRound.questions.length}</span>
                    </div>
                </div>
                <div className="mt-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Round Rules (shown before questions)</label>
                    <textarea
                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50 focus:bg-white transition-colors"
                        rows={3}
                        value={normalizedRound.rules || ''}
                        onChange={(e) => handleUpdateRound({ ...normalizedRound, rules: e.target.value })}
                        placeholder="Example: No phones, 30 seconds per question..."
                    />
                </div>
                <div className="mt-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Round Cover Image URL</label>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                            value={normalizedRound.coverImageUrl || ''}
                            onChange={(e) => handleUpdateRound({ ...normalizedRound, coverImageUrl: e.target.value })}
                            placeholder="/uploads/round-cover.jpg"
                        />
                        <Button variant="secondary" type="button" onClick={() => roundCoverInputRef.current?.click()}>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="p-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">Question Library</h3>
                        <p className="text-xs text-gray-500">Search and insert questions into this round</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                            placeholder="Search library..."
                            value={librarySearch}
                            onChange={(e) => setLibrarySearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {filteredLibrary.length === 0 && (
                        <div className="text-sm text-gray-400">No library questions match your search.</div>
                    )}
                    {filteredLibrary.slice(0, 6).map(item => (
                        <div key={item.id} className="border border-gray-100 rounded-lg p-3 flex flex-col gap-2 bg-gray-50">
                            <div className="text-sm font-medium text-gray-800">{item.text}</div>
                            <div className="text-xs text-gray-500">Answer: {item.answer}</div>
                            <Button size="sm" variant="secondary" onClick={() => addQuestionFromLibrary(item)}>
                                <Plus className="w-4 h-4 mr-1" />
                                Add to round
                            </Button>
                        </div>
                    ))}
                </div>
            </Card>

            {normalizedRound.type === 'GRID' ? (
                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Grid Setup</h3>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categories</label>
                                <div className="space-y-2">
                                    {(normalizedRound.categories || []).map((category, idx) => (
                                        <input
                                            key={idx}
                                            className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                            value={category}
                                            onChange={(e) => {
                                                const next = [...(normalizedRound.categories || [])];
                                                next[idx] = e.target.value;
                                                updateGridCategories(next);
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Point Values</label>
                                <div className="space-y-2">
                                    {(normalizedRound.gridPoints || []).map((points, idx) => (
                                        <input
                                            key={idx}
                                            type="number"
                                            className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                            value={points}
                                            onChange={(e) => {
                                                const next = [...(normalizedRound.gridPoints || [])];
                                                next[idx] = Number(e.target.value);
                                                updateGridPoints(next);
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Grid Board</h3>
                        <div className="overflow-auto">
                            <div className="grid gap-3" style={{ gridTemplateColumns: `160px repeat(${normalizedRound.categories?.length || 1}, minmax(140px, 1fr))` }}>
                                <div />
                                {(normalizedRound.categories || []).map((category) => (
                                    <div key={category} className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
                                        {category}
                                    </div>
                                ))}
                                {(normalizedRound.gridPoints || []).map((points) => (
                                    <React.Fragment key={points}>
                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">{points} pts</div>
                                        {(normalizedRound.categories || []).map((category) => {
                                            const question = getGridQuestion(category, points);
                                            return (
                                                <button
                                                    key={`${category}-${points}`}
                                                    onClick={() => setSelectedGridCell({ category, points })}
                                                    className="border border-gray-200 rounded-lg h-16 text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50 transition-colors"
                                                >
                                                    {question?.text ? 'Edit' : 'Add'}
                                                </button>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {selectedGridCell && (
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold">Editing {selectedGridCell.category} • {selectedGridCell.points} pts</h3>
                                    <p className="text-xs text-gray-500">Create or update the question for this grid cell</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedGridCell(null)}>
                                    Done
                                </Button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Question Text</label>
                                    <textarea
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50 focus:bg-white transition-colors"
                                        rows={2}
                                        value={getGridQuestion(selectedGridCell.category, selectedGridCell.points)?.text || ''}
                                        onChange={(e) => upsertGridQuestion(selectedGridCell.category, selectedGridCell.points, { text: e.target.value })}
                                        placeholder="What is the capital of..."
                                    />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Answer</label>
                                        <input
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                                            value={getGridQuestion(selectedGridCell.category, selectedGridCell.points)?.answer || ''}
                                            onChange={(e) => upsertGridQuestion(selectedGridCell.category, selectedGridCell.points, { answer: e.target.value })}
                                            placeholder="The answer is..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Type</label>
                                        <select
                                            className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                            value={getGridQuestion(selectedGridCell.category, selectedGridCell.points)?.type || 'TEXT'}
                                            onChange={(e) => upsertGridQuestion(selectedGridCell.category, selectedGridCell.points, { type: e.target.value as MediaType })}
                                        >
                                            {(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO'] as MediaType[]).map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Presenter Notes (optional)</label>
                                    <textarea
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-gray-50 focus:bg-white transition-colors"
                                        rows={2}
                                        value={getGridQuestion(selectedGridCell.category, selectedGridCell.points)?.notes || ''}
                                        onChange={(e) => upsertGridQuestion(selectedGridCell.category, selectedGridCell.points, { notes: e.target.value })}
                                        placeholder="Private notes for the presenter..."
                                    />
                                </div>
                                {(getGridQuestion(selectedGridCell.category, selectedGridCell.points)?.type || 'TEXT') !== 'TEXT' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Media URL</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 p-2 border border-gray-200 rounded-lg text-sm"
                                                value={getGridQuestion(selectedGridCell.category, selectedGridCell.points)?.mediaUrl || ''}
                                                onChange={(e) => upsertGridQuestion(selectedGridCell.category, selectedGridCell.points, { mediaUrl: e.target.value })}
                                                placeholder="/uploads/example.jpg"
                                            />
                                            <Button size="sm" variant="secondary" onClick={() => {
                                                const question = getGridQuestion(selectedGridCell.category, selectedGridCell.points);
                                                if (question) {
                                                    setUploadTarget(question.id);
                                                    fileInputRef.current?.click();
                                                }
                                            }}>
                                                <Upload className="w-4 h-4 mr-1" />
                                                Upload
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>
            ) : (
            <div className="space-y-6">
                {normalizedRound.questions.map((q, index) => {
                    const isComplete = q.text.trim() && q.answer.trim();
                    return (
                    <Card
                        key={q.id}
                        className="p-6 relative group"
                    >
                        <button
                            onClick={() => deleteQuestion(q.id)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="flex flex-wrap gap-2 mb-4 items-center">
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">Q{index + 1}</span>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>Order</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={normalizedRound.questions.length}
                                    defaultValue={index + 1}
                                    onBlur={(e) => setQuestionOrder(q.id, Number(e.target.value))}
                                    className="w-16 px-2 py-1 border border-gray-200 rounded text-xs"
                                />
                            </div>
                            {isComplete ? (
                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Complete
                                </span>
                            ) : (
                                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                    Incomplete
                                </span>
                            )}
                            <div className="flex gap-1">
                                {(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'CONNECT'] as MediaType[]).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => updateQuestion(q.id, 'type', type)}
                                        className={`p-1.5 rounded ${q.type === type ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}
                                        title={type}
                                    >
                                        {type === 'TEXT' && <Type className="w-4 h-4" />}
                                        {type === 'IMAGE' && <ImageIcon className="w-4 h-4" />}
                                        {type === 'VIDEO' && <Video className="w-4 h-4" />}
                                        {type === 'AUDIO' && <Mic className="w-4 h-4" />}
                                        {type === 'CONNECT' && <ImageIcon className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-1">
                                <Button size="sm" variant="secondary" onClick={() => moveQuestion(q.id, 'up')} disabled={index === 0}>
                                    <ArrowUp className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => moveQuestion(q.id, 'down')} disabled={index === normalizedRound.questions.length - 1}>
                                    <ArrowDown className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Question Text</label>
                                <textarea
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50 focus:bg-white transition-colors ${q.text.trim() ? 'border-gray-200' : 'border-amber-300'}`}
                                    rows={2}
                                    value={q.text}
                                    onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                                    placeholder="What is the capital of..."
                                />
                            </div>

                            {q.type !== 'TEXT' && q.type !== 'CONNECT' && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                        {q.type} URL / Path
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 p-2 border border-gray-200 rounded-lg text-sm"
                                            value={q.mediaUrl || ''}
                                            onChange={(e) => updateQuestion(q.id, 'mediaUrl', e.target.value)}
                                            placeholder="/uploads/example.jpg"
                                        />
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => {
                                            setUploadTarget(q.id);
                                            fileInputRef.current?.click();
                                        }}
                                    >
                                        <Upload className="w-4 h-4 mr-1" />
                                        Upload
                                    </Button>
                                    </div>
                                </div>
                            )}

                            {q.type === 'CONNECT' && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Connect Items (one per line, text or image URL)</label>
                                    <div className="space-y-2">
                                        {(q.connectItems || []).map((item, itemIndex) => (
                                            <div key={`${q.id}-connect-${itemIndex}`} className="flex gap-2">
                                                <input
                                                    className="flex-1 p-2 border border-gray-200 rounded-lg text-sm"
                                                    value={item}
                                                    onChange={(e) => {
                                                        const nextItems = [...(q.connectItems || [])];
                                                        nextItems[itemIndex] = e.target.value;
                                                        updateQuestion(q.id, 'connectItems', nextItems);
                                                    }}
                                                    placeholder="Text or /uploads/image.png"
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        setConnectUploadTarget({ questionId: q.id, index: itemIndex });
                                                        fileInputRef.current?.click();
                                                    }}
                                                >
                                                    <Upload className="w-4 h-4 mr-1" />
                                                    Upload
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        const nextItems = (q.connectItems || []).filter((_, idx) => idx !== itemIndex);
                                                        updateQuestion(q.id, 'connectItems', nextItems);
                                                    }}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => {
                                                const nextItems = [...(q.connectItems || []), ''];
                                                updateQuestion(q.id, 'connectItems', nextItems);
                                            }}
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Add Item
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Answer</label>
                                <input
                                    type="text"
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 focus:bg-white transition-colors ${q.answer.trim() ? 'border-gray-200' : 'border-amber-300'}`}
                                    value={q.answer}
                                    onChange={(e) => updateQuestion(q.id, 'answer', e.target.value)}
                                    placeholder="The answer is..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Presenter Notes (optional)</label>
                                <textarea
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-gray-50 focus:bg-white transition-colors"
                                    rows={2}
                                    value={q.notes || ''}
                                    onChange={(e) => updateQuestion(q.id, 'notes', e.target.value)}
                                    placeholder="Private notes for the presenter..."
                                />
                            </div>
                        </div>
                    </Card>
                )})}

                <Button onClick={addQuestion} className="w-full py-4 border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Question
                </Button>
            </div>
            )}
        </div>
    );
};
