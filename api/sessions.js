import { supabase, readJson, requireAdmin } from './_supabase.js';

const DEFAULT_SESSIONS = { sessions: [] };

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('sessions_data')
                .select('sessions')
                .eq('id', 1)
                .maybeSingle();

            if (error) throw error;
            if (!data) {
                await supabase.from('sessions_data').insert({ id: 1, sessions: [] });
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(DEFAULT_SESSIONS));
                return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ sessions: Array.isArray(data.sessions) ? data.sessions : [] }));
            return;
        }

        if (req.method === 'POST') {
            if (!requireAdmin(req, res)) return;
            const payload = await readJson(req);
            const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
            const { error } = await supabase
                .from('sessions_data')
                .upsert({ id: 1, sessions, updated_at: new Date().toISOString() });
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
