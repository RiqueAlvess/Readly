-- Migration 002: DB functions, triggers, and missing features

-- ============================================================
-- BOOK RATING AVG: auto-recompute on review insert/update/delete
-- ============================================================
create or replace function public.refresh_book_rating()
returns trigger language plpgsql as $$
begin
  update public.books
  set rating_avg = (
    select coalesce(avg(rating), 0)
    from public.book_reviews
    where book_id = coalesce(new.book_id, old.book_id)
  )
  where id = coalesce(new.book_id, old.book_id);
  return null;
end;
$$;

drop trigger if exists trg_book_rating on public.book_reviews;
create trigger trg_book_rating
  after insert or update or delete on public.book_reviews
  for each row execute function public.refresh_book_rating();

-- ============================================================
-- CHAMPIONSHIP SCORE: +100 pts when user marks a book as read
-- during an active championship they participate in
-- ============================================================
create or replace function public.update_championship_scores()
returns trigger language plpgsql as $$
begin
  if new.status = 'read' and (old.status is null or old.status <> 'read') then
    update public.championship_participants cp
    set score = score + 100
    from public.championships c
    where cp.championship_id = c.id
      and cp.user_id = new.user_id
      and c.start_date <= now()
      and c.end_date >= now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_championship_score on public.user_books;
create trigger trg_championship_score
  after update on public.user_books
  for each row execute function public.update_championship_scores();

-- ============================================================
-- BADGE AUTO-AWARD: checks all conditions and inserts missing
-- Call via supabase.rpc('check_and_award_badges', { p_user_id: '...' })
-- ============================================================
create or replace function public.check_and_award_badges(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b   record;
  val integer;
begin
  -- books_read
  select count(*) into val from public.user_books
    where user_id = p_user_id and status = 'read';
  for b in select * from public.badges where condition_type = 'books_read' loop
    if val >= b.condition_value then
      insert into public.user_badges (user_id, badge_id)
        values (p_user_id, b.id) on conflict do nothing;
    end if;
  end loop;

  -- xp
  select coalesce(xp, 0) into val from public.profiles where id = p_user_id;
  for b in select * from public.badges where condition_type = 'xp' loop
    if val >= b.condition_value then
      insert into public.user_badges (user_id, badge_id)
        values (p_user_id, b.id) on conflict do nothing;
    end if;
  end loop;

  -- streak
  select coalesce(current_streak, 0) into val from public.streaks where user_id = p_user_id;
  for b in select * from public.badges where condition_type = 'streak' loop
    if coalesce(val, 0) >= b.condition_value then
      insert into public.user_badges (user_id, badge_id)
        values (p_user_id, b.id) on conflict do nothing;
    end if;
  end loop;

  -- reviews (only reviews with text count)
  select count(*) into val from public.book_reviews
    where user_id = p_user_id and review_text is not null;
  for b in select * from public.badges where condition_type = 'reviews' loop
    if val >= b.condition_value then
      insert into public.user_badges (user_id, badge_id)
        values (p_user_id, b.id) on conflict do nothing;
    end if;
  end loop;

  -- posts
  select count(*) into val from public.posts where user_id = p_user_id;
  for b in select * from public.badges where condition_type = 'posts' loop
    if val >= b.condition_value then
      insert into public.user_badges (user_id, badge_id)
        values (p_user_id, b.id) on conflict do nothing;
    end if;
  end loop;

  -- gacha pulls
  select count(*) into val from public.gacha_pulls where user_id = p_user_id;
  for b in select * from public.badges where condition_type = 'gacha' loop
    if val >= b.condition_value then
      insert into public.user_badges (user_id, badge_id)
        values (p_user_id, b.id) on conflict do nothing;
    end if;
  end loop;

  -- collections
  select count(*) into val from public.collections where user_id = p_user_id;
  for b in select * from public.badges where condition_type = 'collections' loop
    if val >= b.condition_value then
      insert into public.user_badges (user_id, badge_id)
        values (p_user_id, b.id) on conflict do nothing;
    end if;
  end loop;

  -- followers
  select count(*) into val from public.follows where following_id = p_user_id;
  for b in select * from public.badges where condition_type = 'followers' loop
    if val >= b.condition_value then
      insert into public.user_badges (user_id, badge_id)
        values (p_user_id, b.id) on conflict do nothing;
    end if;
  end loop;

  -- pages_read
  select coalesce(sum(pages_read), 0) into val from public.user_books where user_id = p_user_id;
  for b in select * from public.badges where condition_type = 'pages_read' loop
    if val >= b.condition_value then
      insert into public.user_badges (user_id, badge_id)
        values (p_user_id, b.id) on conflict do nothing;
    end if;
  end loop;

  -- diary entries
  select count(*) into val from public.diary_entries where user_id = p_user_id;
  for b in select * from public.badges where condition_type = 'diary' loop
    if val >= b.condition_value then
      insert into public.user_badges (user_id, badge_id)
        values (p_user_id, b.id) on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- ============================================================
-- MONTHLY PURCHASE LIMIT: add tracking column + reset function
-- ============================================================
alter table public.profiles add column if not exists last_monthly_reset date;

create or replace function public.reset_monthly_purchases_if_needed(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  last_reset  date;
  first_day   date := date_trunc('month', current_date)::date;
begin
  select last_monthly_reset into last_reset from public.profiles where id = p_user_id;
  if last_reset is null or last_reset < first_day then
    update public.profiles
      set monthly_books_purchased = 0,
          last_monthly_reset = first_day
    where id = p_user_id;
  end if;
end;
$$;

-- ============================================================
-- USER BOOK SUBMISSIONS (users propose books for admin approval)
-- ============================================================
create table if not exists public.user_book_submissions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  author       text not null,
  cover_url    text,
  description  text,
  genre        text,
  isbn         text,
  page_count   integer,
  published_year integer,
  status       text not null default 'pending'
               check (status in ('pending','approved','rejected')),
  admin_note   text,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

alter table public.user_book_submissions enable row level security;

drop policy if exists submissions_owner on public.user_book_submissions;
create policy submissions_owner on public.user_book_submissions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists submissions_admin on public.user_book_submissions;
create policy submissions_admin on public.user_book_submissions
  for all using (public.is_admin()) with check (public.is_admin());

create index if not exists idx_submissions_user    on public.user_book_submissions(user_id);
create index if not exists idx_submissions_status  on public.user_book_submissions(status);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists notifications_owner on public.notifications;
create policy notifications_owner on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

-- ============================================================
-- ADDITIONAL BADGES (comprehensive engagement system)
-- ============================================================
insert into public.badges (name, description, icon, condition_type, condition_value) values
  ('Leitor Voraz',        'Termine 25 livros',                         '🦁', 'books_read',  25),
  ('Centenário',          'Termine 100 livros',                        '💯', 'books_read',  100),
  ('Cinco Estrelas',      'Escreva 10 resenhas com texto',             '⭐', 'reviews',     10),
  ('Influencer',          'Tenha 10 seguidores',                       '📣', 'followers',   10),
  ('Mestre do Streak',    'Mantenha 30 dias de sequência',             '🌊', 'streak',      30),
  ('XP Lendário',         'Alcance 50.000 XP',                        '👑', 'xp',          50000),
  ('Voz da Comunidade',   'Publique sua primeira postagem',            '🗣️', 'posts',       1),
  ('Gacha Master',        'Abra 10 caixas gacha',                     '🎯', 'gacha',       10),
  ('Colecionador Épico',  'Crie 10 coleções',                         '🗄️', 'collections', 10),
  ('Maratonista',         'Leia 5.000 páginas',                       '📄', 'pages_read',  5000),
  ('Diário Vivo',         'Escreva 10 entradas no diário de leitura', '📓', 'diary',       10),
  ('Escritor',            'Escreva 25 entradas no diário de leitura', '✍️', 'diary',       25),
  ('Grande Leitor',       'Alcance 12.000 XP',                        '🎓', 'xp',          12000),
  ('Erudito',             'Alcance 25.000 XP',                        '🔭', 'xp',          25000),
  ('Fã de Gacha',         'Abra sua primeira caixa gacha',            '🎁', 'gacha',       1),
  ('Rede Social',         'Publique 10 postagens',                    '💬', 'posts',       10),
  ('Seguido',             'Tenha 1 seguidor',                         '👥', 'followers',   1)
on conflict do nothing;

-- ============================================================
-- INDEXES for new tables
-- ============================================================
create index if not exists idx_champ_participants_score
  on public.championship_participants(championship_id, score desc);

-- Refresh all existing book ratings (in case reviews already exist)
update public.books b set rating_avg = (
  select coalesce(avg(r.rating), 0)
  from public.book_reviews r
  where r.book_id = b.id
);
