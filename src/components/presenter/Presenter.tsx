import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuizzes } from '../../hooks/useQuizzes';
import { useSessions } from '../../hooks/useSessions';
import { Button } from '../shared/Button';
import { ArrowLeft, ArrowRight, Play, CheckCircle, HelpCircle, List, StickyNote, Maximize2, Pause } from 'lucide-react';
import { cn } from '../../utils';

type ViewMode = 'cover' | 'roundIntro' | 'roundRules' | 'gridBoard' | 'question' | 'answer' | 'roundSummary' | 'roundScores' | 'end';

type PresenterState = {
    view: ViewMode;
    currentRoundIdx: number;
    currentQuestionIdx: number;
    currentGridQuestionId: string | null;
    isRevealed: boolean;
    revealedGridIds: string[];
    completedRoundIds: string[];
};

export const Presenter = () => {
    const [searchParams] = useSearchParams();
    const quizId = searchParams.get('quizId');
    const { quizzes, loading } = useQuizzes();
    const { sessions, refresh: refreshSessions } = useSessions();

    const [quiz, setQuiz] = useState(quizzes.find(q => q.id === quizId));
    const [showHelp, setShowHelp] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [showJump, setShowJump] = useState(false);
    const [showIndex, setShowIndex] = useState(false);
    const [showScores, setShowScores] = useState(true);
    const [isMediaPlaying, setIsMediaPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const initialState: PresenterState = {
        view: 'cover',
        currentRoundIdx: -1,
        currentQuestionIdx: -1,
        currentGridQuestionId: null,
        isRevealed: false,
        revealedGridIds: [],
        completedRoundIds: [],
    };
    const [state, setState] = useState<PresenterState>(initialState);
    const historyRef = React.useRef<PresenterState[]>([initialState]);
    const historyIndexRef = React.useRef(0);

    useEffect(() => {
        if (quizzes.length > 0 && quizId) {
            setQuiz(quizzes.find(q => q.id === quizId));
        }
    }, [quizzes, quizId]);

    const currentRound = quiz && state.currentRoundIdx >= 0 ? quiz.rounds[state.currentRoundIdx] : null;
    const currentQuestion = useMemo(() => {
        if (!currentRound || (state.view !== 'question' && state.view !== 'answer')) return null;
        if (currentRound.type === 'GRID') {
            return currentRound.questions.find(q => q.id === state.currentGridQuestionId) || null;
        }
        return state.currentQuestionIdx >= 0 ? currentRound.questions[state.currentQuestionIdx] : null;
    }, [currentRound, state]);

    const gridQuestions = useMemo(() => {
        if (!currentRound || currentRound.type !== 'GRID') return [];
        return currentRound.questions;
    }, [currentRound]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsMediaPlaying(false);
    }, [currentQuestion?.id, state.view]);

    const isGridQuestionRevealed = (questionId: string) => state.revealedGridIds.includes(questionId);

    const totalRounds = quiz ? quiz.rounds.length : 0;
    const totalQuestions = currentRound?.type === 'GRID'
        ? currentRound.questions.length
        : (currentRound?.questions.length || 0);

    const sessionId = searchParams.get('sessionId');
    const activeSession = useMemo(() => {
        if (!quizId) return null;
        if (sessionId) return sessions.find((session) => session.id === sessionId) || null;
        return sessions.find((session) => session.quizId === quizId && session.status === 'active') || null;
    }, [sessions, quizId, sessionId]);
    const rankedParticipants = useMemo(() => {
        if (!activeSession) return [];
        const sorted = [...activeSession.participants].sort(
            (a, b) => (activeSession.scores[b.id] ?? 0) - (activeSession.scores[a.id] ?? 0)
        );
        let lastScore: number | null = null;
        let lastRank = 0;
        return sorted.map((participant, idx) => {
            const score = activeSession.scores[participant.id] ?? 0;
            if (lastScore === null || score < lastScore) {
                lastRank = idx + 1;
                lastScore = score;
            }
            return { ...participant, rank: lastRank };
        });
    }, [activeSession]);

    useEffect(() => {
        if (!activeSession) return;
        const interval = window.setInterval(() => {
            refreshSessions();
        }, 3000);
        return () => window.clearInterval(interval);
    }, [activeSession, refreshSessions]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    };

    const pushState = (nextState: PresenterState) => {
        const nextHistory = [...historyRef.current.slice(0, historyIndexRef.current + 1), nextState];
        historyRef.current = nextHistory;
        historyIndexRef.current = nextHistory.length - 1;
        setState(nextState);
    };

    const goPrev = () => {
        if (historyIndexRef.current <= 0) return;
        historyIndexRef.current -= 1;
        setState(historyRef.current[historyIndexRef.current]);
    };

    const goNext = () => {
        if (!quiz) return;
        if (state.view === 'cover') {
            if (quiz.rounds.length > 0) {
                pushState({
                    ...state,
                    view: 'roundIntro',
                    currentRoundIdx: 0,
                    currentQuestionIdx: -1,
                    currentGridQuestionId: null,
                    isRevealed: false,
                    revealedGridIds: [],
                });
            }
            return;
        }

        if (state.view === 'roundIntro') {
            if (currentRound?.rules?.trim()) {
                pushState({ ...state, view: 'roundRules' });
            } else if (currentRound?.type === 'GRID') {
                pushState({ ...state, view: 'gridBoard', isRevealed: false });
            } else if (currentRound && currentRound.questions.length > 0) {
                pushState({
                    ...state,
                    view: 'question',
                    currentQuestionIdx: 0,
                    isRevealed: false,
                });
            } else {
                advanceRound();
            }
            return;
        }

        if (state.view === 'roundRules') {
            if (currentRound?.type === 'GRID') {
                pushState({ ...state, view: 'gridBoard', isRevealed: false });
            } else if (currentRound && currentRound.questions.length > 0) {
                pushState({
                    ...state,
                    view: 'question',
                    currentQuestionIdx: 0,
                    isRevealed: false,
                });
            } else {
                advanceRound();
            }
            return;
        }

        if (state.view === 'question') {
            pushState({ ...state, view: 'answer', isRevealed: true });
            return;
        }

        if (state.view === 'answer') {
            if (currentRound?.type === 'GRID') {
                const updatedRevealed = state.currentGridQuestionId
                    ? Array.from(new Set([...state.revealedGridIds, state.currentGridQuestionId]))
                    : state.revealedGridIds;
                const allRevealed = gridQuestions.length > 0 && gridQuestions.every(q => updatedRevealed.includes(q.id));
                if (allRevealed) {
                    advanceRound();
                } else {
                    pushState({
                        ...state,
                        view: 'gridBoard',
                        isRevealed: false,
                        currentGridQuestionId: null,
                        revealedGridIds: updatedRevealed,
                    });
                }
                return;
            }

            if (currentRound && state.currentQuestionIdx < currentRound.questions.length - 1) {
                pushState({
                    ...state,
                    view: 'question',
                    currentQuestionIdx: state.currentQuestionIdx + 1,
                    isRevealed: false,
                });
        } else {
            advanceRound();
            }
            return;
        }

        if (state.view === 'roundSummary') {
            if (activeSession) {
                pushState({ ...state, view: 'roundScores' });
                return;
            }
            if (state.currentRoundIdx < quiz.rounds.length - 1) {
                pushState({
                    ...state,
                    view: 'roundIntro',
                    currentRoundIdx: state.currentRoundIdx + 1,
                    currentQuestionIdx: -1,
                    currentGridQuestionId: null,
                    isRevealed: false,
                });
            } else {
                pushState({ ...state, view: 'end' });
            }
            return;
        }

        if (state.view === 'roundScores') {
            if (state.currentRoundIdx < quiz.rounds.length - 1) {
                pushState({
                    ...state,
                    view: 'roundIntro',
                    currentRoundIdx: state.currentRoundIdx + 1,
                    currentQuestionIdx: -1,
                    currentGridQuestionId: null,
                    isRevealed: false,
                });
            } else {
                pushState({ ...state, view: 'end' });
            }
            return;
        }

        if (state.view === 'gridBoard' && currentRound?.type === 'GRID') {
            return;
        }

        if (state.view === 'end') {
            pushState(initialState);
        }
    };

    const advanceRound = () => {
        if (!quiz) return;
        const completedRoundId = currentRound?.id;
        const completedRoundIds = completedRoundId
            ? Array.from(new Set([...state.completedRoundIds, completedRoundId]))
            : state.completedRoundIds;
        pushState({
            ...state,
            view: 'roundSummary',
            completedRoundIds,
            isRevealed: false,
        });
    };

    const selectGridQuestion = (questionId: string) => {
        if (state.view !== 'gridBoard') return;
        pushState({
            ...state,
            view: 'question',
            currentGridQuestionId: questionId,
            isRevealed: false,
        });
    };

    const jumpToQuestion = (index: number) => {
        if (!currentRound || currentRound.type === 'GRID') return;
        pushState({
            ...state,
            view: 'question',
            currentQuestionIdx: index,
            isRevealed: false,
        });
        setShowJump(false);
    };

    const jumpToRoundIntro = (roundIndex: number) => {
        pushState({
            ...state,
            view: 'roundIntro',
            currentRoundIdx: roundIndex,
            currentQuestionIdx: -1,
            currentGridQuestionId: null,
            isRevealed: false,
        });
        setShowIndex(false);
    };

    const indexOverlay = showIndex && quiz ? (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Quiz Index</h3>
                    <Button variant="ghost" onClick={() => setShowIndex(false)}>Close</Button>
                </div>
                <div className="space-y-4 max-h-[70vh] overflow-auto">
                    <button
                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-indigo-50"
                        onClick={() => {
                            pushState({ ...state, view: 'cover', currentRoundIdx: -1, currentQuestionIdx: -1, currentGridQuestionId: null, isRevealed: false });
                            setShowIndex(false);
                        }}
                    >
                        <div className="text-xs text-gray-400 uppercase tracking-wide">Cover</div>
                        <div className="font-semibold text-gray-900">Quiz Title</div>
                    </button>
                    {quiz.rounds.map((round, idx) => (
                        <div key={round.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                            <button
                                className="w-full text-left"
                                onClick={() => jumpToRoundIntro(idx)}
                            >
                                <div className="text-xs text-gray-400 uppercase tracking-wide">Round {idx + 1}</div>
                                <div className="font-semibold text-gray-900">{round.title}</div>
                            </button>
                            {round.rules && (
                                <div className="text-xs text-gray-500">Rules included</div>
                            )}
                            {round.type === 'LINEAR' && (
                                <div className="grid gap-2">
                                    {round.questions.map((q, qIdx) => (
                                        <button
                                            key={q.id}
                                            className="text-left p-2 rounded border border-gray-100 hover:bg-gray-50"
                                            onClick={() => {
                                                pushState({
                                                    ...state,
                                                    view: 'question',
                                                    currentRoundIdx: idx,
                                                    currentQuestionIdx: qIdx,
                                                    currentGridQuestionId: null,
                                                    isRevealed: false,
                                                });
                                                setShowIndex(false);
                                            }}
                                        >
                                            <div className="text-xs text-gray-400">Q{qIdx + 1}</div>
                                            <div className="text-sm font-medium text-gray-800">{q.text || 'Untitled question'}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {round.type === 'GRID' && (
                                <Button size="sm" variant="secondary" onClick={() => {
                                    pushState({
                                        ...state,
                                        view: 'gridBoard',
                                        currentRoundIdx: idx,
                                        currentQuestionIdx: -1,
                                        currentGridQuestionId: null,
                                        isRevealed: false,
                                    });
                                    setShowIndex(false);
                                }}>
                                    Go to Grid Board
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    ) : null;

    // Keyboard Navigation
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'ArrowRight') {
                goNext();
            }
            if (e.code === 'ArrowLeft') {
                goPrev();
            }
            if (e.code === 'KeyR') {
                if (state.view === 'question') {
                    pushState({ ...state, view: 'answer', isRevealed: true });
                }
            }
            if (e.code === 'KeyB' && state.view === 'answer' && currentRound?.type === 'GRID') {
                pushState({ ...state, view: 'gridBoard', currentGridQuestionId: null, isRevealed: false });
            }
            if (e.code === 'Slash' || e.code === 'KeyH') {
                setShowHelp(prev => !prev);
            }
            if (e.code === 'KeyN') {
                setShowNotes(prev => !prev);
            }
            if (e.code === 'KeyJ') {
                setShowJump(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [state, quiz, currentRound]); // simplified deps

    // -- RENDERERS --

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading...</div>;
    if (!quiz) return <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-400">Please select a quiz from the dashboard.</div>;

    if (showHelp) {
        return (
            <div className="h-screen w-screen bg-black/90 text-white flex flex-col items-center justify-center p-12">
                <div className="max-w-2xl space-y-4">
                    <h2 className="text-4xl font-bold mb-4">Presenter Hotkeys</h2>
                    <div className="grid gap-2 text-lg">
                        <div><strong>Space / →</strong> Next</div>
                        <div><strong>←</strong> Previous</div>
                        <div><strong>R</strong> Reveal answer</div>
                        <div><strong>B</strong> Back to board (grid rounds)</div>
                        <div><strong>N</strong> Toggle notes</div>
                        <div><strong>J</strong> Jump to question</div>
                        <div><strong>H or ?</strong> Toggle this help</div>
                    </div>
                    <Button variant="secondary" onClick={() => setShowHelp(false)}>
                        Close
                    </Button>
                </div>
            </div>
        );
    }

    // 1. Cover Slide
    if (state.view === 'cover') {
        return (
            <div className="h-screen w-screen bg-gray-50 flex flex-col items-center justify-center p-12 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 z-0" />
                {quiz.coverImageUrl && (
                    <img
                        src={quiz.coverImageUrl}
                        alt="Quiz cover"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ opacity: quiz.coverImageOpacity ?? 0.12 }}
                    />
                )}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="z-10 text-center space-y-8 max-w-4xl"
                >
                    <h1 className="text-8xl font-black text-gray-900 tracking-tight leading-tight">
                        {quiz.title}
                    </h1>
                    <p className="text-2xl text-gray-500 font-light">{quiz.description}</p>

                    <div className="flex flex-wrap items-center justify-center gap-4">
                    <Button size="lg" onClick={goNext} className="text-xl px-12 py-6 rounded-full shadow-xl shadow-blue-500/20 hover:scale-105 transition-transform duration-300">
                        Start Quiz <ArrowRight className="ml-3 w-6 h-6" />
                    </Button>
                        <Button size="lg" variant="secondary" onClick={toggleFullscreen} className="text-xl px-10 py-6 rounded-full">
                            Fullscreen <Maximize2 className="ml-3 w-5 h-5" />
                        </Button>
                    </div>
                </motion.div>
                {activeSession && showScores && (
                    <div className="absolute top-6 right-6 bg-white/90 rounded-2xl shadow-xl border border-gray-200 p-4 text-sm min-w-[220px]">
                        <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Live Scores</div>
                        <div className="space-y-1">
                            {rankedParticipants.map((participant) => (
                                <div key={participant.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold flex items-center justify-center">
                                            {participant.rank}
                                        </span>
                                        <span className="text-gray-700">{participant.name}</span>
                                    </div>
                                    <span className="font-semibold text-indigo-600">{activeSession.scores[participant.id] ?? 0}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {indexOverlay}
            </div>
        );
    }

    // 2. Round Intro
    if (state.view === 'roundIntro' && currentRound) {
        return (
            <div className="h-screen w-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-50 via-white to-white z-0" />
                {currentRound.coverImageUrl && (
                    <img
                        src={currentRound.coverImageUrl}
                        alt="Round cover"
                        className="absolute inset-0 w-full h-full object-cover opacity-20"
                    />
                )}
                <motion.div
                    key={currentRound.id}
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                    className="z-10 text-center"
                >
                    <h2 className="text-2xl font-bold text-blue-600 uppercase tracking-widest mb-4">Round {state.currentRoundIdx + 1}</h2>
                    <h1 className="text-7xl font-black text-gray-900">{currentRound.title}</h1>
                </motion.div>

                <div className="absolute bottom-12 right-12 z-20">
                    <Button variant="ghost" onClick={goNext} className="text-gray-400 hover:text-gray-900">
                        Start Round <Play className="ml-2 w-4 h-4" />
                    </Button>
                </div>
                <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowHelp(true)}>
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Help
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setShowIndex(true)}>
                        <List className="w-4 h-4 mr-2" />
                        Index
                    </Button>
                    {activeSession && (
                        <Button variant="secondary" size="sm" onClick={() => setShowScores((prev) => !prev)}>
                            Scores
                        </Button>
                    )}
                </div>
                {activeSession && showScores && (
                    <div className="absolute top-20 right-6 bg-white/90 rounded-2xl shadow-xl border border-gray-200 p-4 text-sm min-w-[220px]">
                        <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Live Scores</div>
                        <div className="space-y-1">
                            {rankedParticipants.map((participant) => (
                                <div key={participant.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold flex items-center justify-center">
                                            {participant.rank}
                                        </span>
                                        <span className="text-gray-700">{participant.name}</span>
                                    </div>
                                    <span className="font-semibold text-indigo-600">{activeSession.scores[participant.id] ?? 0}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {indexOverlay}
            </div>
        );
    }

    if (state.view === 'roundRules' && currentRound) {
        return (
            <div className="h-screen w-screen bg-gray-50 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white via-amber-50 to-orange-50 z-0" />
                {currentRound.coverImageUrl && (
                    <img
                        src={currentRound.coverImageUrl}
                        alt="Round cover"
                        className="absolute inset-0 w-full h-full object-cover opacity-15"
                    />
                )}
                <motion.div
                    key={`${currentRound.id}-rules`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="z-10 max-w-4xl w-full text-center space-y-6 max-h-[78vh] overflow-y-auto"
                >
                    <div className="text-sm uppercase tracking-widest text-orange-500">Round Rules</div>
                    <h1 className="text-5xl font-black text-gray-900">{currentRound.title}</h1>
                    <p className="text-2xl text-gray-600 whitespace-pre-line">{currentRound.rules}</p>
                    <Button size="lg" onClick={goNext} className="text-xl px-10 py-5 rounded-full">
                        Start Round <Play className="ml-3 w-5 h-5" />
                    </Button>
                </motion.div>
                <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowHelp(true)}>
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Help
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setShowIndex(true)}>
                        <List className="w-4 h-4 mr-2" />
                        Index
                    </Button>
                    {activeSession && (
                        <Button variant="secondary" size="sm" onClick={() => setShowScores((prev) => !prev)}>
                            Scores
                        </Button>
                    )}
                </div>
                {activeSession && showScores && (
                    <div className="absolute top-20 right-6 bg-white/90 rounded-2xl shadow-xl border border-gray-200 p-4 text-sm min-w-[220px]">
                        <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Live Scores</div>
                        <div className="space-y-1">
                            {rankedParticipants.map((participant) => (
                                <div key={participant.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold flex items-center justify-center">
                                            {participant.rank}
                                        </span>
                                        <span className="text-gray-700">{participant.name}</span>
                                    </div>
                                    <span className="font-semibold text-indigo-600">{activeSession.scores[participant.id] ?? 0}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {indexOverlay}
            </div>
        );
    }

    if (state.view === 'roundSummary' && quiz) {
        return (
            <div className="h-screen w-screen bg-gray-50 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white via-indigo-50 to-fuchsia-50 z-0" />
                <motion.div
                    key={`summary-${state.currentRoundIdx}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="z-10 w-full max-w-4xl space-y-6 max-h-[78vh] overflow-y-auto"
                >
                    {activeSession && (
                        <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm">
                            <div className="text-xs uppercase tracking-widest text-indigo-400 mb-3">Scores So Far</div>
                            <div className="grid gap-2">
                                {rankedParticipants.map((participant) => (
                                    <div key={participant.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold flex items-center justify-center">
                                                {participant.rank}
                                            </span>
                                            <span className="font-medium text-gray-800">{participant.name}</span>
                                        </div>
                                        <span className="text-lg font-semibold text-indigo-600">
                                            {activeSession.scores[participant.id] ?? 0}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="text-center space-y-2">
                        <div className="text-sm uppercase tracking-widest text-indigo-400">Round Summary</div>
                        <h1 className="text-4xl font-black text-gray-900">Great job!</h1>
                        {quiz.intermissionMessage && (
                            <p className="text-lg text-gray-600">{quiz.intermissionMessage}</p>
                        )}
                    </div>

                    <div className="grid gap-3">
                        {quiz.rounds.map((round) => {
                            const isComplete = state.completedRoundIds.includes(round.id);
                            return (
                                <div
                                    key={round.id}
                                    className={cn(
                                        'flex items-center justify-between rounded-2xl border px-4 py-3 bg-white',
                                        isComplete ? 'border-emerald-200' : 'border-gray-200'
                                    )}
                                >
                                    <div>
                                        <div className="text-sm text-gray-400 uppercase tracking-wide">
                                            {round.type}
                                        </div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {round.title}
                                        </div>
                                    </div>
                                    <div className={cn(
                                        'px-3 py-1 rounded-full text-xs font-semibold',
                                        isComplete ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                                    )}>
                                        {isComplete ? 'Completed' : 'Remaining'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-center gap-3">
                        <Button variant="secondary" onClick={goPrev}>Previous</Button>
                        <Button onClick={goNext}>Continue</Button>
                    </div>
                </motion.div>
                <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowHelp(true)}>
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Help
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setShowIndex(true)}>
                        <List className="w-4 h-4 mr-2" />
                        Index
                    </Button>
                    {activeSession && (
                        <Button variant="secondary" size="sm" onClick={() => setShowScores((prev) => !prev)}>
                            Scores
                        </Button>
                    )}
                </div>
                {activeSession && showScores && (
                    <div className="absolute top-20 right-6 bg-white/90 rounded-2xl shadow-xl border border-gray-200 p-4 text-sm min-w-[220px]">
                        <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Live Scores</div>
                        <div className="space-y-1">
                            {rankedParticipants.map((participant) => (
                                <div key={participant.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold flex items-center justify-center">
                                            {participant.rank}
                                        </span>
                                        <span className="text-gray-700">{participant.name}</span>
                                    </div>
                                    <span className="font-semibold text-indigo-600">{activeSession.scores[participant.id] ?? 0}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {indexOverlay}
            </div>
        );
    }

    if (state.view === 'roundScores' && quiz) {
        return (
            <div className="h-screen w-screen bg-gray-50 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white via-indigo-50 to-fuchsia-50 z-0" />
                <motion.div
                    key={`scores-${state.currentRoundIdx}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="z-10 w-full max-w-4xl space-y-6 max-h-[78vh] overflow-y-auto"
                >
                    <div className="text-center space-y-2">
                        <div className="text-sm uppercase tracking-widest text-indigo-400">Scores So Far</div>
                        <h1 className="text-4xl font-black text-gray-900">Round {state.currentRoundIdx + 1} Standings</h1>
                    </div>
                    <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm">
                        <div className="grid gap-3">
                            {activeSession?.participants
                                .slice()
                                .sort((a, b) => (activeSession.scores[b.id] ?? 0) - (activeSession.scores[a.id] ?? 0))
                                .map((participant, idx) => (
                                    <div key={participant.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-semibold flex items-center justify-center">
                                                {idx + 1}
                                            </div>
                                            <span className="font-medium text-gray-800">{participant.name}</span>
                                        </div>
                                        <span className="text-2xl font-semibold text-indigo-600">
                                            {activeSession.scores[participant.id] ?? 0}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                    <div className="flex justify-center gap-3">
                        <Button variant="secondary" onClick={goPrev}>Previous</Button>
                        <Button onClick={goNext}>Continue</Button>
                    </div>
                </motion.div>
                <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowHelp(true)}>
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Help
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setShowIndex(true)}>
                        <List className="w-4 h-4 mr-2" />
                        Index
                    </Button>
                </div>
                {indexOverlay}
            </div>
        );
    }

    // 3. Grid Board
    if (state.view === 'gridBoard' && currentRound?.type === 'GRID') {
        return (
            <div className="h-screen w-screen bg-gray-50 flex flex-col p-10">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="text-sm text-gray-400 uppercase tracking-widest">Round {state.currentRoundIdx + 1}</div>
                        <h2 className="text-4xl font-black text-gray-900">{currentRound.title}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={() => setShowHelp(true)}>
                            <HelpCircle className="w-4 h-4 mr-2" />
                            Help
                        </Button>
                        <Button variant="secondary" onClick={() => setShowIndex(true)}>
                            <List className="w-4 h-4 mr-2" />
                            Index
                        </Button>
                        {activeSession && (
                            <Button variant="secondary" onClick={() => setShowScores((prev) => !prev)}>
                                Scores
                            </Button>
                        )}
                        <Button variant="secondary" onClick={advanceRound}>
                            Skip Round
                        </Button>
                        <Button variant="secondary" onClick={goPrev}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Previous
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <div className="grid gap-4" style={{ gridTemplateColumns: `160px repeat(${currentRound.categories?.length || 1}, minmax(140px, 1fr))` }}>
                        <div />
                        {(currentRound.categories || []).map(category => (
                            <div key={category} className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
                                {category}
                            </div>
                        ))}
                        {(currentRound.gridPoints || []).map(points => (
                            <React.Fragment key={points}>
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">{points} pts</div>
                                {(currentRound.categories || []).map(category => {
                                    const question = currentRound.questions.find(q => q.categoryId === category && q.points === points);
                                    const isRevealed = question ? isGridQuestionRevealed(question.id) : false;
                                    return (
                                        <button
                                            key={`${category}-${points}`}
                                            className={cn(
                                                'rounded-xl border border-gray-200 h-20 text-lg font-bold transition-all',
                                                isRevealed
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    : 'bg-white text-blue-600 hover:bg-blue-50'
                                            )}
                                            disabled={!question || isRevealed}
                                            onClick={() => question && selectGridQuestion(question.id)}
                                        >
                                            {question ? points : '—'}
                                        </button>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
                {activeSession && showScores && (
                    <div className="absolute top-20 right-6 bg-white/90 rounded-2xl shadow-xl border border-gray-200 p-4 text-sm min-w-[220px] z-30">
                        <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Live Scores</div>
                        <div className="space-y-1">
                            {rankedParticipants.map((participant) => (
                                <div key={participant.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold flex items-center justify-center">
                                            {participant.rank}
                                        </span>
                                        <span className="text-gray-700">{participant.name}</span>
                                    </div>
                                    <span className="font-semibold text-indigo-600">{activeSession.scores[participant.id] ?? 0}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {indexOverlay}
            </div>
        );
    }

    // 3. Question Slide
    if (state.view === 'question' && currentQuestion) {
        return (
            <div className="h-screen w-screen bg-gray-50 flex flex-col relative overflow-hidden">
                {/* Simple Header */}
                <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-lg font-bold text-gray-400 uppercase tracking-wider">
                            Round {state.currentRoundIdx + 1}: {currentRound?.title}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" size="sm" onClick={() => setShowHelp(true)}>
                            <HelpCircle className="w-4 h-4 mr-2" />
                            Help
                        </Button>
                        {currentRound?.type !== 'GRID' && (
                            <Button variant="secondary" size="sm" onClick={() => setShowJump(true)}>
                                <List className="w-4 h-4 mr-2" />
                                Jump
                            </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => setShowIndex(true)}>
                            <List className="w-4 h-4 mr-2" />
                            Index
                        </Button>
                        {activeSession && (
                            <Button variant="secondary" size="sm" onClick={() => setShowScores((prev) => !prev)}>
                                Scores
                            </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => setShowNotes(prev => !prev)}>
                            <StickyNote className="w-4 h-4 mr-2" />
                            Notes
                        </Button>
                    <div className="text-xl font-bold text-gray-300">
                            {currentRound?.type === 'GRID' ? 'Grid' : `Q${state.currentQuestionIdx + 1}`}
                        </div>
                        <div className="text-xs text-gray-400">
                            Round {state.currentRoundIdx + 1}/{totalRounds} • {currentRound?.type === 'GRID' ? 'Grid' : `Q ${state.currentQuestionIdx + 1}/${totalQuestions}`}
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-4 z-10 max-w-7xl mx-auto w-full">
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={currentQuestion.id}
                            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
                            className="w-full space-y-10 text-center"
                        >
                            {/* Question Card */}
                            <div className={cn(
                                "bg-white rounded-3xl shadow-2xl p-8 border border-white/50 backdrop-blur-xl transition-all duration-500",
                                "shadow-blue-500/10 border-blue-100"
                            )}>
                                <div className="max-h-[80vh] overflow-y-auto">
                                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6 break-words">
                                    {currentQuestion.text}
                                </h2>

                                    {currentQuestion.mediaUrl && currentQuestion.type === 'IMAGE' && (
                                        <div className="rounded-2xl overflow-hidden max-h-[78vh] shadow-lg inline-block">
                                            <img src={currentQuestion.mediaUrl} alt="Question Media" className="object-contain max-h-[78vh] w-full" />
                                    </div>
                                )}
                                    {currentQuestion.mediaUrl && currentQuestion.type === 'VIDEO' && (
                                        <div className="relative rounded-2xl overflow-hidden max-h-[78vh] shadow-lg inline-block bg-black">
                                            <video
                                                ref={videoRef}
                                                src={currentQuestion.mediaUrl}
                                                className="object-contain max-h-[78vh] w-full"
                                                onPlay={() => setIsMediaPlaying(true)}
                                                onPause={() => setIsMediaPlaying(false)}
                                                onEnded={() => setIsMediaPlaying(false)}
                                            />
                                            <button
                                                onClick={() => {
                                                    if (!videoRef.current) return;
                                                    if (videoRef.current.paused) {
                                                        videoRef.current.play();
                                                    } else {
                                                        videoRef.current.pause();
                                                    }
                                                }}
                                                className="absolute inset-0 flex items-center justify-center"
                                                aria-label={isMediaPlaying ? 'Pause video' : 'Play video'}
                                            >
                                                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white/90 shadow-xl backdrop-blur text-gray-900">
                                                    {isMediaPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                                                </div>
                                            </button>
                            </div>
                                    )}
                                    {currentQuestion.mediaUrl && currentQuestion.type === 'AUDIO' && (
                                        <div className="rounded-2xl overflow-hidden shadow-lg inline-flex items-center gap-4 px-6 py-4 bg-white border border-gray-200">
                                            <button
                                                onClick={() => {
                                                    if (!audioRef.current) return;
                                                    if (audioRef.current.paused) {
                                                        audioRef.current.play();
                                                    } else {
                                                        audioRef.current.pause();
                                                    }
                                                }}
                                                className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500 text-white shadow-md"
                                                aria-label={isMediaPlaying ? 'Pause audio' : 'Play audio'}
                                            >
                                                {isMediaPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                                            </button>
                                            <div className="text-left">
                                                <div className="text-sm uppercase tracking-wide text-gray-400">Audio Clip</div>
                                                <div className="text-base font-semibold text-gray-700">Tap to play</div>
                                            </div>
                                            <audio
                                                ref={audioRef}
                                                src={currentQuestion.mediaUrl}
                                                onPlay={() => setIsMediaPlaying(true)}
                                                onPause={() => setIsMediaPlaying(false)}
                                                onEnded={() => setIsMediaPlaying(false)}
                                            />
                                        </div>
                                    )}
                                    {currentQuestion.type === 'CONNECT' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {(currentQuestion.connectItems || []).map((item, idx) => {
                                                const isImage = item.startsWith('/') || item.startsWith('http');
                                                return (
                                                    <div key={`${currentQuestion.id}-item-${idx}`} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                                                        {isImage ? (
                                                            <img src={item} alt={`Connect item ${idx + 1}`} className="object-contain max-h-[40vh] w-full" />
                                                        ) : (
                                                            <div className="text-xl md:text-2xl font-semibold text-gray-800 break-words">{item}</div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Navigation Overlay (Hidden by default, hover bottom) */}
                <div className="absolute bottom-0 left-0 right-0 h-2 opacity-0 hover:opacity-100 hover:h-24 transition-all bg-gradient-to-t from-black/20 to-transparent flex items-center justify-center gap-4 z-30">
                    <Button variant="secondary" onClick={goPrev}>Prev</Button>
                    <Button variant="secondary" onClick={() => pushState({ ...state, view: 'answer', isRevealed: true })}>Reveal</Button>
                    <Button variant="primary" onClick={goNext}>Next</Button>
                </div>

                {showNotes && currentQuestion?.notes && (
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-white/90 border border-indigo-100 shadow-xl rounded-2xl px-6 py-4 text-sm text-gray-700 z-40 max-w-2xl">
                        <div className="text-xs uppercase tracking-wide text-indigo-400 mb-1">Presenter Notes</div>
                        {currentQuestion.notes}
                    </div>
                )}

                {activeSession && showScores && (
                    <div className="absolute top-20 right-6 bg-white/90 rounded-2xl shadow-xl border border-gray-200 p-4 text-sm min-w-[220px] z-30">
                        <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Live Scores</div>
                        <div className="space-y-1">
                            {rankedParticipants.map((participant) => (
                                <div key={participant.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold flex items-center justify-center">
                                            {participant.rank}
                                        </span>
                                        <span className="text-gray-700">{participant.name}</span>
                                    </div>
                                    <span className="font-semibold text-indigo-600">{activeSession.scores[participant.id] ?? 0}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {indexOverlay}

                {showJump && currentRound && currentRound.type !== 'GRID' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-40">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Jump to Question</h3>
                                <Button variant="ghost" onClick={() => setShowJump(false)}>Close</Button>
                            </div>
                            <div className="grid gap-2 max-h-[60vh] overflow-auto">
                                {currentRound.questions.map((q, idx) => (
                                    <button
                                        key={q.id}
                                        onClick={() => jumpToQuestion(idx)}
                                        className="text-left p-3 rounded-lg border border-gray-200 hover:bg-blue-50 transition"
                                    >
                                        <div className="text-xs text-gray-400 mb-1">Q{idx + 1}</div>
                                        <div className="font-medium text-gray-900">{q.text || 'Untitled question'}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (state.view === 'answer' && currentQuestion) {
        return (
            <div className="h-screen w-screen bg-gray-50 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-lg font-bold text-gray-400 uppercase tracking-wider">
                            Round {state.currentRoundIdx + 1}: {currentRound?.title}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" size="sm" onClick={() => setShowHelp(true)}>
                            <HelpCircle className="w-4 h-4 mr-2" />
                            Help
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setShowIndex(true)}>
                            <List className="w-4 h-4 mr-2" />
                            Index
                        </Button>
                        {activeSession && (
                            <Button variant="secondary" size="sm" onClick={() => setShowScores((prev) => !prev)}>
                                Scores
                            </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => setShowNotes(prev => !prev)}>
                            <StickyNote className="w-4 h-4 mr-2" />
                            Notes
                        </Button>
                        <div className="text-xl font-bold text-gray-300">
                            Answer
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 max-w-5xl mx-auto w-full">
                    <motion.div
                        key={`${currentQuestion.id}-answer`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full text-center space-y-8"
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-12 py-8 rounded-full text-4xl md:text-5xl lg:text-6xl font-bold shadow-xl flex items-center justify-center gap-4">
                            <CheckCircle className="w-8 h-8" />
                            {currentQuestion.answer}
                        </div>
                    </motion.div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-2 opacity-0 hover:opacity-100 hover:h-24 transition-all bg-gradient-to-t from-black/20 to-transparent flex items-center justify-center gap-4 z-30">
                    <Button variant="secondary" onClick={() => pushState({ ...state, view: 'question', isRevealed: false })}>Question</Button>
                    <Button variant="primary" onClick={goNext}>Next</Button>
                </div>

                {showNotes && currentQuestion?.notes && (
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-white/90 border border-indigo-100 shadow-xl rounded-2xl px-6 py-4 text-sm text-gray-700 z-40 max-w-2xl">
                        <div className="text-xs uppercase tracking-wide text-indigo-400 mb-1">Presenter Notes</div>
                        {currentQuestion.notes}
                    </div>
                )}
                {activeSession && showScores && (
                    <div className="absolute top-20 right-6 bg-white/90 rounded-2xl shadow-xl border border-gray-200 p-4 text-sm min-w-[220px] z-30">
                        <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Live Scores</div>
                        <div className="space-y-1">
                            {rankedParticipants.map((participant) => (
                                <div key={participant.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold flex items-center justify-center">
                                            {participant.rank}
                                        </span>
                                        <span className="text-gray-700">{participant.name}</span>
                                    </div>
                                    <span className="font-semibold text-indigo-600">{activeSession.scores[participant.id] ?? 0}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {indexOverlay}
            </div>
        );
    }

    if (state.view === 'end') {
        return (
            <div className="h-screen w-screen bg-gray-50 flex flex-col items-center justify-center p-12">
                <h1 className="text-6xl font-black text-gray-900 mb-4">Quiz Finished</h1>
                <p className="text-gray-500 mb-8">Great job! You’ve reached the end of the quiz.</p>
                <Button size="lg" onClick={() => pushState(initialState)}>
                    Restart
                </Button>
            </div>
        );
    }

    return null;
};
