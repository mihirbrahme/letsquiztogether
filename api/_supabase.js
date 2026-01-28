import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase env vars are missing');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
});

export const getAdminToken = () => process.env.ADMIN_TOKEN || '';

export const requireAdmin = (req, res) => {
    const token = req.headers['x-admin-token'];
    const adminToken = getAdminToken();
    if (!adminToken || token !== adminToken) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return false;
    }
    return true;
};

export const readJson = async (req) => {
    if (req.body) return req.body;
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }
    if (chunks.length === 0) return {};
    const raw = Buffer.concat(chunks).toString('utf-8');
    return raw ? JSON.parse(raw) : {};
};
