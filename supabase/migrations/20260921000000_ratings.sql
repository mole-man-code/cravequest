-- Recipe ratings: one 1-5 star rating per signed-in user per recipe.
-- Safe to re-run. Paste into Supabase > SQL Editor > Run.

create table if not exists public.ratings (
  recipe_id  integer not null references public.recipes (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  stars      smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

alter table public.ratings enable row level security;

-- Each user can see and change only their own ratings.
drop policy if exists "Read own ratings" on public.ratings;
create policy "Read own ratings" on public.ratings for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Add own ratings" on public.ratings;
create policy "Add own ratings" on public.ratings for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Change own ratings" on public.ratings;
create policy "Change own ratings" on public.ratings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Delete own ratings" on public.ratings;
create policy "Delete own ratings" on public.ratings for delete to authenticated using (auth.uid() = user_id);

drop trigger if exists ratings_touch on public.ratings;
create trigger ratings_touch before update on public.ratings
  for each row execute function public.touch_updated_at();

-- Public averages only (no user ids). The view runs with its owner's rights on purpose, so anyone can read the totals.
create or replace view public.recipe_ratings as
  select recipe_id, round(avg(stars)::numeric, 1)::float as avg, count(*)::int as count
  from public.ratings group by recipe_id;

grant select on public.recipe_ratings to anon, authenticated;
