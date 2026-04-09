-- Users profile (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bonus_xp integer default 0,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Entries
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  date date not null,
  xp_earned integer default 0,
  mentioned_character_ids text[] default '{}',
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Characters
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text not null default '',
  position float8[3] not null,
  type text not null check (type in ('ALLY','CONTACT','RIVAL','MENTOR','CREW','GHOST')),
  label text not null default 'none',
  mention_count integer default 0,
  created_at timestamptz default now()
);

-- Character links
create table public.character_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  from_id uuid references public.characters(id) on delete cascade not null,
  to_id uuid references public.characters(id) on delete cascade not null,
  unique(from_id, to_id)
);

-- Achievements
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  achievement_id text not null,
  unlocked_at timestamptz default now(),
  unique(user_id, achievement_id)
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.entries enable row level security;
alter table public.characters enable row level security;
alter table public.character_links enable row level security;
alter table public.achievements enable row level security;

-- Policies: users can only access their own data
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can manage own entries" on public.entries for all using (auth.uid() = user_id);
create policy "Users can manage own characters" on public.characters for all using (auth.uid() = user_id);
create policy "Users can manage own links" on public.character_links for all using (auth.uid() = user_id);
create policy "Users can manage own achievements" on public.achievements for all using (auth.uid() = user_id);
