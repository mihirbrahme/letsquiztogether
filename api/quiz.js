import { supabase, readJson, requireAdmin } from './_supabase.js';

const DEFAULT_DB = { version: 1, quizzes: [], library: [] };

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('app_data')
                .select('version, quizzes, library')
                .eq('id', 1)
                .maybeSingle();

            if (error) throw error;
            if (!data) {
                await supabase.from('app_data').insert({ id: 1, ...DEFAULT_DB });
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(DEFAULT_DB));
                return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                version: typeof data.version === 'number' ? data.version : DEFAULT_DB.version,
                quizzes: Array.isArray(data.quizzes) ? data.quizzes : [],
                library: Array.isArray(data.library) ? data.library : [],
            }));
            return;
        }

        if (req.method === 'POST') {
            if (!requireAdmin(req, res)) return;
            const payload = await readJson(req);
            const version = typeof payload.version === 'number' ? payload.version : DEFAULT_DB.version;
            const quizzes = Array.isArray(payload.quizzes) ? payload.quizzes : [];
            const library = Array.isArray(payload.library) ? payload.library : [];
            const { error } = await supabase
                .from('app_data')
                .upsert({ id: 1, version, quizzes, library, updated_at: new Date().toISOString() });
            if (error) throw error;
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
        }

        res.statusCode = 405;
        res.setHeader('Allow', 'GET, POST');
        res.end('Method Not Allowed');
    } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Server error' }));
    }
}
