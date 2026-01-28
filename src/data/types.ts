export type MediaType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'CONNECT';
export type RoundType = 'LINEAR' | 'GRID' | 'FREE';

export interface Question {
    id: string;
    text: string;
    type: MediaType;
    mediaUrl?: string;
    answer: string;
    notes?: string;
    points?: number;
    categoryId?: string; // For Grid
    isRevealed?: boolean; // Runtime
    connectItems?: string[]; // For CONNECT (text or image URLs)
}

export interface Round {
    id: string;
    title: string;
    type: RoundType;
    order: number;
    rules?: string;
    coverImageUrl?: string;
    categories?: string[]; // For Grid
    gridPoints?: number[]; // For Grid
    questions: Question[];
}

export interface Quiz {
    id: string;
    title: string;
    description: string;
    coverImageUrl?: string;
    coverImageOpacity?: number;
    intermissionMessage?: string;
    createdAt: string;
    updatedAt?: string;
    rounds: Round[];
}

export interface LibraryQuestion {
    id: string;
    text: string;
    type: MediaType;
    mediaUrl?: string;
    answer: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    points?: number;
    notes?: string;
}

export interface Participant {
    id: string;
    name: string;
}

export interface ScoreEntry {
    id: string;
    participantId: string;
    participantName: string;
    delta: number;
    totalAfter: number;
    createdAt: string;
    roundId?: string;
    questionId?: string;
    note?: string;
}

export interface Session {
    id: string;
    quizId: string;
    title: string;
    participants: Participant[];
    scores: Record<string, number>;
    history: ScoreEntry[];
    status: 'active' | 'ended';
    createdAt: string;
    endedAt?: string;
}
