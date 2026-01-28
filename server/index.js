import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3001);
const DATA_PATH = process.env.DATA_PATH || path.join(__dirname, 'data');
const QUIZZES_PATH = path.join(DATA_PATH, 'quizzes');
const LIBRARY_PATH = path.join(DATA_PATH, 'library.json');
const META_PATH = path.join(DATA_PATH, 'meta.json');
const SESSIONS_PATH = path.join(DATA_PATH, 'sessions.json');
const UPLOADS_PATH = process.env.UPLOADS_PATH || path.join(__dirname, '../public/uploads');
const LEGACY_DB_PATH = path.join(__dirname, 'db.json');
const CURRENT_VERSION = 1;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_PATH));

// Ensure storage directories exist
Promise.all([
    fs.mkdir(UPLOADS_PATH, { recursive: true }),
    fs.mkdir(QUIZZES_PATH, { recursive: true }),
]).catch(console.error);

const readJson = async (filePath, fallback) => {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return fallback;
    }
};

const writeJson = async (filePath, data) => {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

const getAllQuizzes = async () => {
    try {
        const files = await fs.readdir(QUIZZES_PATH);
        const quizzes = [];
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            const quizData = await readJson(path.join(QUIZZES_PATH, file), null);
            if (quizData) quizzes.push(quizData);
        }
        return quizzes;
    } catch (error) {
        return [];
    }
};

const saveAllQuizzes = async (quizzes) => {
    const existingFiles = await fs.readdir(QUIZZES_PATH).catch(() => []);
    const existingIds = new Set(existingFiles.map(file => file.replace('.json', '')));
    const nextIds = new Set();

    for (const quiz of quizzes) {
        if (!quiz?.id) continue;
        nextIds.add(quiz.id);
        await writeJson(path.join(QUIZZES_PATH, `${quiz.id}.json`), quiz);
    }

    for (const id of existingIds) {
        if (!nextIds.has(id)) {
            await fs.unlink(path.join(QUIZZES_PATH, `${id}.json`)).catch(() => {});
        }
    }
};

const migrateLegacyDb = async () => {
    try {
        const legacy = await readJson(LEGACY_DB_PATH, null);
        const hasLegacyQuizzes = Array.isArray(legacy?.quizzes) && legacy.quizzes.length > 0;
        if (!hasLegacyQuizzes) return;

        const currentQuizzes = await getAllQuizzes();
        const currentLibrary = await readJson(LIBRARY_PATH, []);
        const metaExists = await fs.access(META_PATH).then(() => true).catch(() => false);

        if (!metaExists) {
            await writeJson(META_PATH, { version: CURRENT_VERSION });
        }

        if (currentQuizzes.length === 0) {
            await saveAllQuizzes(legacy.quizzes);
        }

        if (Array.isArray(legacy.library) && legacy.library.length > 0 && (!Array.isArray(currentLibrary) || currentLibrary.length === 0)) {
            await writeJson(LIBRARY_PATH, legacy.library);
        }
    } catch (error) {
        console.error('Legacy DB migration failed:', error);
    }
};

migrateLegacyDb();

// Read DB
app.get('/api/quiz', async (req, res) => {
    try {
        const meta = await readJson(META_PATH, { version: CURRENT_VERSION });
        const library = await readJson(LIBRARY_PATH, []);
        const quizzes = await getAllQuizzes();
        if (!meta?.version) {
            await writeJson(META_PATH, { version: CURRENT_VERSION });
        }
        res.json({
            version: meta?.version || CURRENT_VERSION,
            quizzes,
            library: Array.isArray(library) ? library : [],
        });
    } catch (error) {
        res.json({ version: CURRENT_VERSION, quizzes: [], library: [] });
    }
});

// Update DB
app.post('/api/quiz', async (req, res) => {
    try {
        const { version, quizzes, library } = req.body || {};
        await writeJson(META_PATH, { version: typeof version === 'number' ? version : CURRENT_VERSION });
        await writeJson(LIBRARY_PATH, Array.isArray(library) ? library : []);
        await saveAllQuizzes(Array.isArray(quizzes) ? quizzes : []);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Read Sessions
app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await readJson(SESSIONS_PATH, []);
        res.json({ sessions: Array.isArray(sessions) ? sessions : [] });
    } catch (error) {
        res.json({ sessions: [] });
    }
});

// Update Sessions
app.post('/api/sessions', async (req, res) => {
    try {
        const { sessions } = req.body || {};
        await writeJson(SESSIONS_PATH, Array.isArray(sessions) ? sessions : []);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save sessions' });
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_PATH),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '');
        const base = path.basename(file.originalname || 'file', ext).replace(/[^a-zA-Z0-9-_]/g, '');
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${base || 'upload'}-${unique}${ext}`);
    },
});

const upload = multer({ storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    res.json({ url: `/uploads/${req.file.filename}` });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
