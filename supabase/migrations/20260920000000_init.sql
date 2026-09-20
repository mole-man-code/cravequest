-- FaceOffFood: initial schema.

-- Recipes: readable by everyone, changed only from the dashboard or via migrations.
create table if not exists public.recipes (
  id          integer primary key,
  name        text not null,
  cuisine     text not null,
  protein     text not null check (protein in ('chicken','veg','seafood','egg','tofu','beef')),
  minutes     integer not null check (minutes > 0),
  effort      integer not null check (effort between 1 and 3),
  vibes       text[] not null default '{}',
  vegetarian  boolean not null default false,
  why         text,
  ingredients text[] not null,
  steps       text[] not null,
  created_at  timestamptz not null default now()
);

alter table public.recipes enable row level security;

drop policy if exists "Recipes are public" on public.recipes;
create policy "Recipes are public"
  on public.recipes for select
  to anon, authenticated
  using (true);

-- Player progress: one row per signed-in user, private to that user.
create table if not exists public.player_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  xp         integer not null default 0 check (xp >= 0),
  cooked     jsonb not null default '{}'::jsonb,
  plays      jsonb not null default '{}'::jsonb,
  badges     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.player_state enable row level security;

drop policy if exists "Read own progress" on public.player_state;
create policy "Read own progress"
  on public.player_state for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Create own progress" on public.player_state;
create policy "Create own progress"
  on public.player_state for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Update own progress" on public.player_state;
create policy "Update own progress"
  on public.player_state for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists player_state_touch on public.player_state;
create trigger player_state_touch
  before update on public.player_state
  for each row execute function public.touch_updated_at();
