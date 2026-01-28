import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'quiz-media';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
});

const uploadsDir = path.join(rootDir, 'public', 'uploads');
const quizzesDir = path.join(rootDir, 'server', 'data', 'quizzes');
const libraryPath = path.join(rootDir, 'server', 'data', 'library.json');
const sessionsPath = path.join(rootDir, 'server', 'data', 'sessions.json');

const readJson = async (filePath, fallback) => {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return fallback;
    }
};

const getPublicUrl = (filePath) => {
    const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath);
    return data?.publicUrl || null;
};

const uploadFile = async (fileName) => {
    const localPath = path.join(uploadsDir, fileName);
    const fileBuffer = await fs.readFile(localPath);
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(fileName, fileBuffer, {
        upsert: true,
        contentType: undefined,
    });
    if (error) {
        console.warn(`Upload failed for ${fileName}:`, error.message);
    }
    return getPublicUrl(fileName);
};

const remapUrl = (url, fileMap) => {
    if (!url) return url;
    if (url.startsWith('/uploads/')) {
        const fileName = url.replace('/uploads/', '');
        return fileMap.get(fileName) || url;
    }
    return url;
};

const migrate = async () => {
    const fileNames = await fs.readdir(uploadsDir).catch(() => []);
    const fileMap = new Map();
    for (const fileName of fileNames) {
        const publicUrl = await uploadFile(fileName);
        if (publicUrl) fileMap.set(fileName, publicUrl);
    }

    const quizFiles = await fs.readdir(quizzesDir).catch(() => []);
    const quizzes = [];
    for (const file of quizFiles) {
        if (!file.endsWith('.json')) continue;
        const quiz = await readJson(path.join(quizzesDir, file), null);
        if (!quiz) continue;
        quiz.coverImageUrl = remapUrl(quiz.coverImageUrl, fileMap);
        quiz.rounds = (quiz.rounds || []).map((round) => ({
            ...round,
            coverImageUrl: remapUrl(round.coverImageUrl, fileMap),
            questions: (round.questions || []).map((q) => ({
                ...q,
                mediaUrl: remapUrl(q.mediaUrl, fileMap),
                connectItems: (q.connectItems || []).map((item) => remapUrl(item, fileMap)),
            })),
        }));
        quizzes.push(quiz);
    }

    const library = await readJson(libraryPath, []);
    const sessions = await readJson(sessionsPath, []);

    const { error: quizError } = await supabase.from('app_data').upsert({
        id: 1,
        version: 1,
        quizzes,
        library: Array.isArray(library) ? library : [],
        updated_at: new Date().toISOString(),
    });
    if (quizError) throw quizError;

    const { error: sessionError } = await supabase.from('sessions_data').upsert({
        id: 1,
        sessions: Array.isArray(sessions) ? sessions : [],
        updated_at: new Date().toISOString(),
    });
    if (sessionError) throw sessionError;

    console.log('Migration complete.');
};

migrate().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
});
