-- Burntboard owns authentication. Only the trusted app server accesses these
-- tables; InsForge's anon/authenticated roles never receive business data.
create table public.bb_players (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and email ~ '^[^@[:space:]]+@(useallowance\.com|getburnt\.ai)$'),
  name text not null check (length(name) between 1 and 80),
  username text not null unique check (username ~ '^[a-z0-9_]{2,24}$'),
  bio text not null default '' check (length(bio) <= 240),
  avatar text not null default '🏓',
  color text not null default '#739783' check (color ~ '^#[0-9a-fA-F]{6}$'),
  image_key text,
  notifications boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.bb_otp (
  email text primary key,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  requested_at timestamptz not null default now(),
  consumed_at timestamptz
);
create table public.bb_rate_limits (
  key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);
create table public.bb_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.bb_players(id),
  token_hash text not null unique,
  kind text not null check (kind in ('web', 'agent')),
  label text not null default 'Browser',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index bb_sessions_player on public.bb_sessions(player_id);
create table public.bb_games (
  id uuid primary key default gen_random_uuid(),
  player1 uuid not null references public.bb_players(id),
  player2 uuid not null references public.bb_players(id),
  score1 integer not null,
  score2 integer not null,
  date date not null,
  notes text not null default '' check (length(notes) <= 240),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  check (player1 <> player2),
  check (score1 between 0 and 99 and score2 between 0 and 99),
  check ((greatest(score1,score2) = 11 and least(score1,score2) <= 9) or
    (greatest(score1,score2) > 11 and abs(score1-score2) = 2))
);
create index bb_games_date on public.bb_games(date desc, created_at desc);
create table public.bb_comments (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.bb_games(id),
  player_id uuid not null references public.bb_players(id),
  text text not null check (length(text) between 1 and 500),
  mentions uuid[] not null default '{}',
  agent text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index bb_comments_game on public.bb_comments(game_id, created_at);
create table public.bb_subscriptions (
  game_id uuid not null references public.bb_games(id),
  player_id uuid not null references public.bb_players(id),
  muted boolean not null default false,
  primary key(game_id, player_id)
);
create table public.bb_reactions (
  game_id uuid not null references public.bb_games(id),
  player_id uuid not null references public.bb_players(id),
  emoji text not null check (emoji in ('🔥','🏓','😂','👏','😤')),
  primary key(game_id, player_id)
);
create table public.bb_activity (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null references public.bb_players(id),
  game_id uuid references public.bb_games(id),
  action text not null,
  description text not null,
  agent text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index bb_activity_game on public.bb_activity(game_id, created_at);
create table public.bb_outbox (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  recipient uuid not null references public.bb_players(id),
  subject text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  leased_until timestamptz,
  last_error text,
  unique(event_id, recipient)
);
create table public.bb_requests (
  player_id uuid not null references public.bb_players(id),
  key text not null,
  fingerprint text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key(player_id, key)
);
do $$ declare t text; begin
  foreach t in array array['bb_players','bb_otp','bb_rate_limits','bb_sessions','bb_games','bb_comments','bb_subscriptions','bb_reactions','bb_activity','bb_outbox','bb_requests'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant all on public.%I to project_admin', t);
  end loop;
end $$;
