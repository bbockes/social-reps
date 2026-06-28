-- Social reps — run in Supabase SQL editor (Dashboard → SQL → New query)

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.reps (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  label text not null,
  category text,
  starter_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rep_lines (
  id uuid primary key default gen_random_uuid(),
  rep_id text not null references public.reps(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  line_type text not null check (line_type in ('opener', 'followup')),
  content text not null,
  sort_order int not null default 0
);

create table if not exists public.routes (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.route_reps (
  route_id text not null references public.routes(id) on delete cascade,
  rep_id text not null references public.reps(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  sort_order int not null default 0,
  primary key (route_id, rep_id)
);

create table if not exists public.rep_logs (
  user_id uuid not null references auth.users on delete cascade,
  route_id text not null references public.routes(id) on delete cascade,
  rep_id text not null references public.reps(id) on delete cascade,
  logged_date date not null,
  primary key (user_id, route_id, rep_id, logged_date)
);

create table if not exists public.route_completions (
  user_id uuid not null references auth.users on delete cascade,
  route_id text not null references public.routes(id) on delete cascade,
  completed_date date not null,
  primary key (user_id, route_id, completed_date)
);

create index if not exists reps_user_id_idx on public.reps(user_id);
create index if not exists routes_user_id_idx on public.routes(user_id);
create index if not exists rep_lines_rep_id_idx on public.rep_lines(rep_id);

alter table public.profiles enable row level security;
alter table public.reps enable row level security;
alter table public.rep_lines enable row level security;
alter table public.routes enable row level security;
alter table public.route_reps enable row level security;
alter table public.rep_logs enable row level security;
alter table public.route_completions enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "reps_all_own" on public.reps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "rep_lines_all_own" on public.rep_lines for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "routes_all_own" on public.routes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "route_reps_all_own" on public.route_reps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "rep_logs_all_own" on public.rep_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "route_completions_all_own" on public.route_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, null);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
