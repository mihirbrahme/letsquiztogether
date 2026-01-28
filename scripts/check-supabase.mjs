import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
});

const run = async () => {
    const app = await supabase
        .from('app_data')
        .select('version,quizzes,library,updated_at')
        .eq('id', 1)
        .maybeSingle();
    const sess = await supabase
        .from('sessions_data')
        .select('sessions,updated_at')
        .eq('id', 1)
        .maybeSingle();

    if (app.error) console.error(app.error);
    if (sess.error) console.error(sess.error);

    const quizzesCount = Array.isArray(app.data?.quizzes) ? app.data.quizzes.length : 0;
    const libraryCount = Array.isArray(app.data?.library) ? app.data.library.length : 0;
    const sessionsCount = Array.isArray(sess.data?.sessions) ? sess.data.sessions.length : 0;

    console.log(JSON.stringify({
        appUpdated: app.data?.updated_at || null,
        quizzesCount,
        libraryCount,
        sessionsCount,
        sessionsUpdated: sess.data?.updated_at || null,
    }, null, 2));
};

run().catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
});
