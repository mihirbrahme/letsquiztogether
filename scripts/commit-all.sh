#!/usr/bin/env bash
set -euo pipefail

git add .
git commit -m "$(cat <<'EOF'
Migrate app to Vercel + Supabase hosting

Replace local storage with Supabase-backed API routes, add admin gating, and provide migration tooling for existing data and media.
EOF
)"
