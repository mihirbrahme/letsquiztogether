create table if not exists app_data (
  id bigint primary key,
  version integer not null default 1,
  quizzes jsonb not null default '[]'::jsonb,
  library jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists sessions_data (
  id bigint primary key,
  sessions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
