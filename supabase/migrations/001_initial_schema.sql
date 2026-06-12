-- Readly initial schema
-- Idempotent-ish: uses IF NOT EXISTS where possible.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  xp integer not null default 0,
  rank text not null default 'calouro',
  credits integer not null default 100,
  subscription_status text not null default 'trial',
  subscription_expires_at timestamptz,
  annual_goal integer not null default 12,
  monthly_book_limit integer not null default 5,
  monthly_books_purchased integer not null default 0,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- BOOKS
-- ============================================================
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  cover_url text,
  description text,
  genre text,
  isbn text,
  page_count integer,
  published_year integer,
  rating_avg numeric(3,2) not null default 0,
  rarity_tier text not null default 'common' check (rarity_tier in ('common','rare','legendary')),
  gacha_weight integer not null default 100,
  price_credits integer not null default 50,
  created_at timestamptz not null default now()
);

-- ============================================================
-- USER BOOKS (library)
-- ============================================================
create table if not exists public.user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  status text not null default 'want_to_read' check (status in ('reading','read','want_to_read','abandoned')),
  is_favorite boolean not null default false,
  pages_read integer not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, book_id)
);

-- ============================================================
-- REVIEWS
-- ============================================================
create table if not exists public.book_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  created_at timestamptz not null default now(),
  unique (user_id, book_id)
);

-- ============================================================
-- DIARY ENTRIES
-- ============================================================
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  page_number integer,
  content text not null,
  entry_type text not null default 'note' check (entry_type in ('quote','reflection','note')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- COLLECTIONS
-- ============================================================
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  emoji text not null default '📚',
  created_at timestamptz not null default now()
);

create table if not exists public.collection_books (
  collection_id uuid not null references public.collections(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  primary key (collection_id, book_id)
);

-- ============================================================
-- SOCIAL: POSTS
-- ============================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid references public.books(id) on delete set null,
  content text not null,
  has_spoiler boolean not null default false,
  is_spoiler_revealed boolean not null default false,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FOLLOWS
-- ============================================================
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

-- ============================================================
-- XP TRANSACTIONS
-- ============================================================
create table if not exists public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  action_type text not null,
  reference_id uuid,
  created_at timestamptz not null default now()
);

-- ============================================================
-- BADGES
-- ============================================================
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  icon text not null default '🏅',
  condition_type text not null,
  condition_value integer not null default 0
);

create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  equipped boolean not null default false,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ============================================================
-- STREAKS
-- ============================================================
create table if not exists public.streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_activity_date date
);

-- ============================================================
-- GACHA INVENTORY
-- ============================================================
create table if not exists public.gacha_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  is_downloaded boolean not null default false,
  acquired_at timestamptz not null default now()
);

-- ============================================================
-- MARKETPLACE
-- ============================================================
create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  inventory_item_id uuid not null references public.gacha_inventory(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists public.marketplace_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  offerer_id uuid not null references public.profiles(id) on delete cascade,
  offered_inventory_id uuid references public.gacha_inventory(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- CREDITS / STORE
-- ============================================================
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  type text not null check (type in ('earn','spend')),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.store_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  credits_spent integer not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CHAMPIONSHIPS
-- ============================================================
create table if not exists public.championships (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  prize_description text,
  created_at timestamptz not null default now()
);

create table if not exists public.championship_participants (
  championship_id uuid not null references public.championships(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null default 0,
  rank integer,
  joined_at timestamptz not null default now(),
  primary key (championship_id, user_id)
);

-- ============================================================
-- READING GOALS
-- ============================================================
create table if not exists public.reading_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('annual','monthly')),
  target integer not null,
  current integer not null default 0,
  year integer not null,
  month integer,
  created_at timestamptz not null default now()
);

-- ============================================================
-- LOOTBOXES
-- ============================================================
create table if not exists public.lootbox_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  genre_filter text,
  cost_credits integer not null default 100,
  rarity_chances jsonb not null default '{"common":70,"rare":25,"legendary":5}',
  icon text not null default '🎁'
);

create table if not exists public.gacha_pulls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lootbox_type_id uuid references public.lootbox_types(id) on delete set null,
  book_id uuid references public.books(id) on delete set null,
  rarity text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TRIGGERS: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  insert into public.streaks (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep post counters in sync
create or replace function public.bump_like_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_like_count on public.post_likes;
create trigger trg_like_count after insert or delete on public.post_likes
  for each row execute function public.bump_like_count();

create or replace function public.bump_comment_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_comment_count on public.post_comments;
create trigger trg_comment_count after insert or delete on public.post_comments
  for each row execute function public.bump_comment_count();

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_user_books_user on public.user_books(user_id);
create index if not exists idx_user_books_status on public.user_books(user_id, status);
create index if not exists idx_posts_created on public.posts(created_at desc);
create index if not exists idx_diary_user_book on public.diary_entries(user_id, book_id);
create index if not exists idx_inventory_user on public.gacha_inventory(user_id);
create index if not exists idx_xp_user on public.xp_transactions(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.user_books enable row level security;
alter table public.book_reviews enable row level security;
alter table public.diary_entries enable row level security;
alter table public.collections enable row level security;
alter table public.collection_books enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.follows enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.streaks enable row level security;
alter table public.gacha_inventory enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_offers enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.store_purchases enable row level security;
alter table public.championships enable row level security;
alter table public.championship_participants enable row level security;
alter table public.reading_goals enable row level security;
alter table public.lootbox_types enable row level security;
alter table public.gacha_pulls enable row level security;

-- helper: admin check
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Profiles: public read, self update
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (auth.uid() = id);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (auth.uid() = id);

-- Books: public read, admin write
drop policy if exists books_read on public.books;
create policy books_read on public.books for select using (true);
drop policy if exists books_write on public.books;
create policy books_write on public.books for all using (public.is_admin()) with check (public.is_admin());

-- Generic "owner" policies macro applied per table
do $$
declare t text;
begin
  foreach t in array array[
    'user_books','book_reviews','diary_entries','collections',
    'gacha_inventory','credit_transactions','store_purchases',
    'reading_goals','xp_transactions','gacha_pulls'
  ] loop
    execute format('drop policy if exists %I_owner on public.%I;', t, t);
    execute format(
      'create policy %I_owner on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t, t);
  end loop;
end $$;

-- Reviews & diary are also publicly readable
drop policy if exists reviews_public_read on public.book_reviews;
create policy reviews_public_read on public.book_reviews for select using (true);

-- Collection books: owner via parent collection
drop policy if exists collection_books_owner on public.collection_books;
create policy collection_books_owner on public.collection_books for all
  using (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()));
drop policy if exists collection_books_read on public.collection_books;
create policy collection_books_read on public.collection_books for select using (true);

-- Posts: public read, owner write
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using (true);
drop policy if exists posts_owner on public.posts;
create policy posts_owner on public.posts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists likes_read on public.post_likes;
create policy likes_read on public.post_likes for select using (true);
drop policy if exists likes_owner on public.post_likes;
create policy likes_owner on public.post_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists comments_read on public.post_comments;
create policy comments_read on public.post_comments for select using (true);
drop policy if exists comments_owner on public.post_comments;
create policy comments_owner on public.post_comments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Follows
drop policy if exists follows_read on public.follows;
create policy follows_read on public.follows for select using (true);
drop policy if exists follows_owner on public.follows;
create policy follows_owner on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

-- Badges: public read; user_badges public read + owner update
drop policy if exists badges_read on public.badges;
create policy badges_read on public.badges for select using (true);
drop policy if exists badges_admin on public.badges;
create policy badges_admin on public.badges for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists user_badges_read on public.user_badges;
create policy user_badges_read on public.user_badges for select using (true);
drop policy if exists user_badges_owner on public.user_badges;
create policy user_badges_owner on public.user_badges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Streaks: public read, owner write
drop policy if exists streaks_read on public.streaks;
create policy streaks_read on public.streaks for select using (true);
drop policy if exists streaks_owner on public.streaks;
create policy streaks_owner on public.streaks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Marketplace: public read, seller manages
drop policy if exists listings_read on public.marketplace_listings;
create policy listings_read on public.marketplace_listings for select using (true);
drop policy if exists listings_owner on public.marketplace_listings;
create policy listings_owner on public.marketplace_listings for all using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

drop policy if exists offers_read on public.marketplace_offers;
create policy offers_read on public.marketplace_offers for select using (
  auth.uid() = offerer_id or exists (
    select 1 from public.marketplace_listings l where l.id = listing_id and l.seller_id = auth.uid()
  )
);
drop policy if exists offers_write on public.marketplace_offers;
create policy offers_write on public.marketplace_offers for all using (auth.uid() = offerer_id) with check (auth.uid() = offerer_id);

-- Championships: public read, admin write; participants self join
drop policy if exists champ_read on public.championships;
create policy champ_read on public.championships for select using (true);
drop policy if exists champ_admin on public.championships;
create policy champ_admin on public.championships for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists champ_part_read on public.championship_participants;
create policy champ_part_read on public.championship_participants for select using (true);
drop policy if exists champ_part_owner on public.championship_participants;
create policy champ_part_owner on public.championship_participants for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lootboxes: public read, admin write
drop policy if exists lootbox_read on public.lootbox_types;
create policy lootbox_read on public.lootbox_types for select using (true);
drop policy if exists lootbox_admin on public.lootbox_types;
create policy lootbox_admin on public.lootbox_types for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- SEED DATA
-- ============================================================
insert into public.badges (name, description, icon, condition_type, condition_value) values
  ('Primeiro Livro', 'Termine seu primeiro livro', '📖', 'books_read', 1),
  ('Devorador', 'Leia 10 livros', '🔥', 'books_read', 10),
  ('Maratonista', 'Mantenha 7 dias de sequência', '⚡', 'streak', 7),
  ('Crítico', 'Escreva 5 resenhas', '✍️', 'reviews', 5),
  ('Colecionador', 'Crie 3 coleções', '🗂️', 'collections', 3),
  ('Social', 'Publique 10 posts', '💬', 'posts', 10),
  ('Sortudo', 'Abra sua primeira lootbox', '🎁', 'gacha', 1),
  ('Erudito', 'Alcance 25.000 XP', '🎓', 'xp', 25000)
on conflict do nothing;

insert into public.lootbox_types (name, description, genre_filter, cost_credits, rarity_chances, icon) values
  ('Caixa Lendária', 'Maior chance de livros lendários e raros', null, 500, '{"common":40,"rare":40,"legendary":20}', '👑'),
  ('Caixa Rara', 'Boa chance de livros raros', null, 250, '{"common":60,"rare":35,"legendary":5}', '💎'),
  ('Caixa Comum', 'Livros para começar sua jornada', null, 100, '{"common":85,"rare":13,"legendary":2}', '📦'),
  ('Caixa Fantasia', 'Apenas livros de fantasia', 'Fantasia', 300, '{"common":55,"rare":35,"legendary":10}', '🐉')
on conflict do nothing;

insert into public.books (title, author, genre, page_count, published_year, rarity_tier, gacha_weight, price_credits, description, cover_url, rating_avg) values
  ('O Conde de Monte Cristo', 'Alexandre Dumas', 'Clássicos', 1276, 1844, 'legendary', 20, 400, 'Uma história de vingança e redenção.', null, 4.8),
  ('Orgulho e Preconceito', 'Jane Austen', 'Romance', 432, 1813, 'rare', 60, 200, 'O clássico romance de Elizabeth Bennet.', null, 4.6),
  ('Duna', 'Frank Herbert', 'Ficção Científica', 688, 1965, 'legendary', 25, 380, 'Épico de ficção científica em Arrakis.', null, 4.7),
  ('A Revolução dos Bichos', 'George Orwell', 'Clássicos', 152, 1945, 'rare', 70, 180, 'Uma fábula política atemporal.', null, 4.5),
  ('O Hobbit', 'J.R.R. Tolkien', 'Fantasia', 310, 1937, 'rare', 65, 220, 'A jornada de Bilbo Bolseiro.', null, 4.7),
  ('1984', 'George Orwell', 'Ficção Científica', 328, 1949, 'legendary', 22, 360, 'Distopia sobre vigilância total.', null, 4.6),
  ('Dom Casmurro', 'Machado de Assis', 'Clássicos', 256, 1899, 'rare', 68, 190, 'Capitu traiu ou não?', null, 4.4),
  ('A Culpa é das Estrelas', 'John Green', 'Romance', 288, 2012, 'common', 120, 90, 'Hazel e Augustus.', null, 4.3),
  ('O Pequeno Príncipe', 'Antoine de Saint-Exupéry', 'Clássicos', 96, 1943, 'common', 130, 80, 'O essencial é invisível aos olhos.', null, 4.9),
  ('Harry Potter e a Pedra Filosofal', 'J.K. Rowling', 'Fantasia', 264, 1997, 'rare', 64, 240, 'O início da saga de Hogwarts.', null, 4.8)
on conflict do nothing;
