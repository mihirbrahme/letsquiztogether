import React, { useMemo, useRef, useState } from 'react';
import { Plus, Search, Trash2, Edit, Save, X, Tag, Image as ImageIcon, Video, Mic } from 'lucide-react';
import { useQuizzes } from '../../hooks/useQuizzes';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import type { LibraryQuestion, MediaType } from '../../data/types';
import { cn } from '../../utils';

const emptyDraft = {
    text: '',
    answer: '',
    type: 'TEXT' as MediaType,
    mediaUrl: '',
    tags: '' as string,
};

export const Library = () => {
    const {
        library,
        loading,
        createLibraryQuestion,
        updateLibraryQuestion,
        deleteLibraryQuestion,
        lastSavedAt,
        saving,
    } = useQuizzes();

    const [search, setSearch] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [draft, setDraft] = useState(emptyDraft);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<LibraryQuestion | null>(null);
    const [activeTags, setActiveTags] = useState<string[]>([]);
    const csvInputRef = useRef<HTMLInputElement | null>(null);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        const tagFiltered = activeTags.length === 0
            ? library
            : library.filter((q) => q.tags?.some(tag => activeTags.includes(tag)));
        if (!query) return tagFiltered;
        return tagFiltered.filter((q) => {
            const tagMatch = q.tags?.some((tag) => tag.toLowerCase().includes(query));
            return (
                q.text.toLowerCase().includes(query)
                || q.answer.toLowerCase().includes(query)
                || tagMatch
            );
        });
    }, [library, search, activeTags]);

    const availableTags = useMemo(() => {
        const tags = new Set<string>();
        library.forEach((q) => q.tags?.forEach((tag) => tags.add(tag)));
        return Array.from(tags).sort((a, b) => a.localeCompare(b));
    }, [library]);

    const isDuplicate = useMemo(() => {
        const text = draft.text.trim().toLowerCase();
        if (!text) return false;
        return library.some((q) => q.text.trim().toLowerCase() === text);
    }, [draft.text, library]);

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

    const importCsv = async (file: File) => {
        const text = await file.text();
        const rows = parseCsv(text);
        if (rows.length === 0) {
            alert('No rows found in CSV.');
            return;
        }
        const headers = rows[0].map((h) => h.trim().toLowerCase());
        const dataRows = rows.slice(1);
        const get = (row: string[], key: string) => {
            const idx = headers.indexOf(key);
            return idx >= 0 ? row[idx] : '';
        };

        let importedCount = 0;
        for (const row of dataRows) {
            const textValue = get(row, 'text').trim();
            const answerValue = get(row, 'answer').trim();
            if (!textValue || !answerValue) continue;

            const typeValue = (get(row, 'type') || 'TEXT').trim().toUpperCase() as MediaType;
            const mediaUrl = get(row, 'mediaurl').trim();
            const notes = get(row, 'notes').trim();
            const pointsRaw = get(row, 'points').trim();
            const tagsRaw = get(row, 'tags').trim();
            const tags = tagsRaw
                ? tagsRaw.split(/[|,]/).map((tag) => tag.trim()).filter(Boolean)
                : [];

            await createLibraryQuestion({
                text: textValue,
                answer: answerValue,
                type: typeValue,
                mediaUrl: mediaUrl || undefined,
                notes: notes || undefined,
                points: pointsRaw ? Number(pointsRaw) : undefined,
                tags,
            });
            importedCount += 1;
        }

        alert(`Imported ${importedCount} questions.`);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.text.trim() || !draft.answer.trim()) return;
        await createLibraryQuestion({
            text: draft.text.trim(),
            answer: draft.answer.trim(),
            type: draft.type,
            mediaUrl: draft.mediaUrl.trim() || undefined,
            tags: draft.tags
                .split(',')
                .map(tag => tag.trim())
                .filter(Boolean),
        });
        setDraft(emptyDraft);
        setIsCreating(false);
    };

    const beginEdit = (question: LibraryQuestion) => {
        setEditingId(question.id);
        setEditDraft({ ...question });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDraft(null);
    };

    const saveEdit = async () => {
        if (!editDraft) return;
        await updateLibraryQuestion({
            ...editDraft,
            text: editDraft.text.trim(),
            answer: editDraft.answer.trim(),
        });
        cancelEdit();
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading library...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Question Library</h2>
                    <p className="text-gray-500 mt-1">Build a reusable pool of questions</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                    {saving && <span className="text-blue-500">Saving...</span>}
                    {!saving && lastSavedAt && <span>Saved {new Date(lastSavedAt).toLocaleTimeString()}</span>}
                    <input
                        type="file"
                        accept=".csv,text/csv"
                        ref={csvInputRef}
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                importCsv(file);
                            }
                            e.target.value = '';
                        }}
                    />
                    <Button variant="secondary" onClick={() => csvInputRef.current?.click()}>
                        Import CSV
                    </Button>
                    <Button onClick={() => setIsCreating(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Question
                    </Button>
                </div>
            </div>

            <Card className="p-4">
                <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        className="w-full text-sm outline-none"
                        placeholder="Search by text, answer, or tag..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {availableTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {availableTags.map((tag) => {
                            const isActive = activeTags.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    onClick={() => {
                                        setActiveTags((prev) => (
                                            prev.includes(tag)
                                                ? prev.filter((t) => t !== tag)
                                                : [...prev, tag]
                                        ));
                                    }}
                                    className={`text-xs px-2 py-1 rounded-full border ${isActive ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-500'}`}
                                >
                                    #{tag}
                                </button>
                            );
                        })}
                    </div>
                )}
            </Card>

            {isCreating && (
                <Card className="p-6">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Question</label>
                                <textarea
                                    rows={2}
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                                    value={draft.text}
                                    onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                                    placeholder="Question text"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Answer</label>
                                <input
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                                    value={draft.answer}
                                    onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
                                    placeholder="Answer"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Type</label>
                                <select
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                    value={draft.type}
                                    onChange={(e) => setDraft({ ...draft, type: e.target.value as MediaType })}
                                >
                                    {(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO'] as MediaType[]).map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Media URL</label>
                                <input
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                    value={draft.mediaUrl}
                                    onChange={(e) => setDraft({ ...draft, mediaUrl: e.target.value })}
                                    placeholder="/uploads/example.jpg"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tags (comma separated)</label>
                            <input
                                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                value={draft.tags}
                                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                                placeholder="geography, history, sports"
                            />
                        </div>
                        {isDuplicate && (
                            <div className="text-xs text-amber-600">A question with this text already exists.</div>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isDuplicate}>Save</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid gap-4">
                {filtered.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-500">
                        No questions found. Add your first question to get started.
                    </div>
                )}

                {filtered.map((question) => {
                    const isEditing = editingId === question.id;
                    const data = isEditing && editDraft ? editDraft : question;
                    return (
                        <Card key={question.id} className="p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-4">
                                    {question.mediaUrl && (
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                            {question.type === 'IMAGE' && (
                                                <img src={question.mediaUrl} alt="Media preview" className="h-12 w-12 object-cover rounded-lg border border-gray-200" />
                                            )}
                                            {question.type === 'VIDEO' && <Video className="w-4 h-4" />}
                                            {question.type === 'AUDIO' && <Mic className="w-4 h-4" />}
                                            {question.type === 'TEXT' && <ImageIcon className="w-4 h-4 text-gray-300" />}
                                            <span className="truncate">{question.mediaUrl}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <Tag className="w-3 h-3" />
                                        <span>{data.tags?.length ? data.tags.join(', ') : 'No tags'}</span>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Question</label>
                                            <textarea
                                                rows={2}
                                                disabled={!isEditing}
                                                className={cn(
                                                    'w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors',
                                                    !isEditing && 'bg-gray-100 text-gray-600'
                                                )}
                                                value={data.text}
                                                onChange={(e) => isEditing && setEditDraft({ ...data, text: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Answer</label>
                                            <input
                                                disabled={!isEditing}
                                                className={cn(
                                                    'w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 focus:bg-white transition-colors',
                                                    !isEditing && 'bg-gray-100 text-gray-600'
                                                )}
                                                value={data.answer}
                                                onChange={(e) => isEditing && setEditDraft({ ...data, answer: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Type</label>
                                            <select
                                                disabled={!isEditing}
                                                className={cn('w-full p-2 border border-gray-200 rounded-lg text-sm', !isEditing && 'bg-gray-100 text-gray-600')}
                                                value={data.type}
                                                onChange={(e) => isEditing && setEditDraft({ ...data, type: e.target.value as MediaType })}
                                            >
                                                {(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO'] as MediaType[]).map((type) => (
                                                    <option key={type} value={type}>{type}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Media URL</label>
                                            <input
                                                disabled={!isEditing}
                                                className={cn('w-full p-2 border border-gray-200 rounded-lg text-sm', !isEditing && 'bg-gray-100 text-gray-600')}
                                                value={data.mediaUrl || ''}
                                                onChange={(e) => isEditing && setEditDraft({ ...data, mediaUrl: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tags (comma separated)</label>
                                        <input
                                            disabled={!isEditing}
                                            className={cn('w-full p-2 border border-gray-200 rounded-lg text-sm', !isEditing && 'bg-gray-100 text-gray-600')}
                                            value={data.tags?.join(', ') || ''}
                                            onChange={(e) => {
                                                if (!isEditing) return;
                                                setEditDraft({
                                                    ...data,
                                                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean),
                                                });
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {!isEditing && (
                                        <Button variant="secondary" size="sm" onClick={() => beginEdit(question)}>
                                            <Edit className="w-4 h-4 mr-1" />
                                            Edit
                                        </Button>
                                    )}
                                    {isEditing && (
                                        <>
                                            <Button size="sm" onClick={saveEdit}>
                                                <Save className="w-4 h-4 mr-1" />
                                                Save
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                                <X className="w-4 h-4 mr-1" />
                                                Cancel
                                            </Button>
                                        </>
                                    )}
                                    <Button variant="danger" size="sm" onClick={() => deleteLibraryQuestion(question.id)}>
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
