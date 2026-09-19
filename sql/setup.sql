-- Hogwarts Quidditch
-- Выполните весь файл целиком в Supabase SQL Editor.
-- Скрипт не использует Supabase Auth: приложение использует собственные сессии
-- поверх таблицы users. Это удобно для ролевой игры, но для публичного
-- коммерческого сервиса рекомендуется Supabase Auth.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null check (length(trim(username)) between 3 and 40),
  password_hash text not null,
  display_name text not null,
  role text not null check (role in ('player','captain','judge','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text unique not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'waiting'
    check (status in ('waiting','stage_1','stage_2','stage_3','paused','finished')),
  stage integer not null default 1 check (stage between 1 and 3),
  current_turn integer not null default 1 check (current_turn in (1,2)),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  name text not null,
  slot integer not null check (slot in (1,2)),
  score integer not null default 0,
  created_at timestamptz not null default now(),
  unique (match_id, slot)
);

create table if not exists public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  position text not null check (position in ('keeper','seeker','beater','chaser')),
  created_at timestamptz not null default now(),
  unique (match_id, user_id),
  unique (match_id, team_id, position)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid not null references public.users(id),
  text text not null check (length(trim(text)) between 1 and 2000),
  status text not null default 'pending'
    check (status in ('pending','answered','correct','incorrect')),
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  author_id uuid not null references public.users(id),
  text text not null check (length(trim(text)) between 1 and 2000),
  status text not null default 'pending'
    check (status in ('pending','correct','incorrect')),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.users(id),
  username text not null,
  display_name text not null,
  message text not null check (length(trim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.snitch_catches (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.users(id),
  image_url text not null,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists idx_sessions_token on public.user_sessions(token_hash);
create index if not exists idx_match_players_user on public.match_players(user_id);
create index if not exists idx_match_players_match on public.match_players(match_id);
create index if not exists idx_questions_match on public.questions(match_id);
create index if not exists idx_answers_question on public.answers(question_id);
create index if not exists idx_chat_match on public.chat_messages(match_id, created_at);
create index if not exists idx_snitch_match on public.snitch_catches(match_id, created_at);

-- RLS: публичный экран должен читать игровые данные.
-- Все изменения выполняются только через SECURITY DEFINER RPC.
alter table public.users enable row level security;
alter table public.user_sessions enable row level security;
alter table public.matches enable row level security;
alter table public.teams enable row level security;
alter table public.match_players enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.chat_messages enable row level security;
alter table public.snitch_catches enable row level security;

drop policy if exists public_matches_read on public.matches;
create policy public_matches_read on public.matches for select to anon, authenticated using (true);

drop policy if exists public_teams_read on public.teams;
create policy public_teams_read on public.teams for select to anon, authenticated using (true);

drop policy if exists public_questions_read on public.questions;
create policy public_questions_read on public.questions for select to anon, authenticated using (true);

drop policy if exists public_answers_read on public.answers;
create policy public_answers_read on public.answers for select to anon, authenticated using (true);

drop policy if exists public_chat_read on public.chat_messages;
create policy public_chat_read on public.chat_messages for select to anon, authenticated using (true);

drop policy if exists public_snitch_read on public.snitch_catches;
create policy public_snitch_read on public.snitch_catches for select to anon, authenticated using (true);

-- Пользовательские таблицы не доступны напрямую из браузера.
revoke all on public.users from anon, authenticated;
revoke all on public.user_sessions from anon, authenticated;
revoke insert, update, delete on public.matches from anon, authenticated;
revoke insert, update, delete on public.teams from anon, authenticated;
revoke insert, update, delete on public.match_players from anon, authenticated;
revoke insert, update, delete on public.questions from anon, authenticated;
revoke insert, update, delete on public.answers from anon, authenticated;
revoke insert, update, delete on public.chat_messages from anon, authenticated;
revoke insert, update, delete on public.snitch_catches from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.matches, public.teams, public.questions, public.answers,
  public.chat_messages, public.snitch_catches to anon, authenticated;

-- ---------- Служебные функции ----------

create or replace function public.session_user_id(p_token text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select s.user_id
  from public.user_sessions s
  where s.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and s.expires_at > now()
  limit 1;
$$;

revoke all on function public.session_user_id(text) from public;

create or replace function public.require_role(p_token text, p_roles text[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role text;
begin
  v_user_id := public.session_user_id(p_token);
  if v_user_id is null then
    raise exception 'Сессия недействительна или истекла';
  end if;

  select role into v_role from public.users where id = v_user_id;
  if not (v_role = any(p_roles)) then
    raise exception 'Недостаточно прав';
  end if;
  return v_user_id;
end;
$$;

-- ---------- Авторизация ----------

create or replace function public.login_player(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  u public.users;
  v_token text;
begin
  select * into u
  from public.users
  where username = trim(p_username)
    and role in ('player','captain')
    and password_hash = crypt(p_password, password_hash)
  limit 1;

  if u.id is null then
    return jsonb_build_object('ok', false, 'message', 'Неверный логин или пароль');
  end if;

  delete from public.user_sessions where user_id = u.id or expires_at <= now();
  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.user_sessions(user_id, token_hash)
  values (u.id, encode(digest(v_token, 'sha256'), 'hex'));

  return jsonb_build_object(
    'ok', true,
    'session', jsonb_build_object(
      'token', v_token,
      'user', jsonb_build_object(
        'id', u.id, 'username', u.username,
        'display_name', u.display_name, 'role', u.role
      )
    )
  );
end;
$$;

create or replace function public.login_judge(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  u public.users;
  v_token text;
begin
  select * into u
  from public.users
  where username = trim(p_username)
    and role in ('judge','admin')
    and password_hash = crypt(p_password, password_hash)
  limit 1;

  if u.id is null then
    return jsonb_build_object('ok', false, 'message', 'Неверный логин или пароль');
  end if;

  delete from public.user_sessions where user_id = u.id or expires_at <= now();
  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.user_sessions(user_id, token_hash)
  values (u.id, encode(digest(v_token, 'sha256'), 'hex'));

  return jsonb_build_object(
    'ok', true,
    'session', jsonb_build_object(
      'token', v_token,
      'user', jsonb_build_object(
        'id', u.id, 'username', u.username,
        'display_name', u.display_name, 'role', u.role
      )
    )
  );
end;
$$;

create or replace function public.create_user(
  p_session_token text,
  p_username text,
  p_password text,
  p_display_name text,
  p_role text default 'player'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_user public.users;
begin
  v_actor := public.require_role(p_session_token, array['judge','admin']);
  if p_role not in ('player','captain','judge','admin') then
    raise exception 'Недопустимая роль';
  end if;
  if p_role in ('judge','admin') then
    perform public.require_role(p_session_token, array['admin']);
  end if;

  insert into public.users(username, password_hash, display_name, role)
  values (trim(p_username), crypt(p_password, gen_salt('bf', 12)), trim(p_display_name), p_role)
  returning * into v_user;

  return jsonb_build_object(
    'ok', true,
    'user', jsonb_build_object('id',v_user.id,'username',v_user.username,'display_name',v_user.display_name,'role',v_user.role)
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'message', 'Такой логин уже существует');
end;
$$;

-- ---------- Матчи ----------

create or replace function public.create_match(
  p_session_token text,
  p_title text,
  p_team1_name text,
  p_team2_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  m public.matches;
  a public.teams;
  b public.teams;
begin
  v_actor := public.require_role(p_session_token, array['judge','admin']);

  insert into public.matches(title, created_by)
  values (trim(p_title), v_actor)
  returning * into m;

  insert into public.teams(match_id,name,slot)
  values (m.id, trim(p_team1_name), 1)
  returning * into a;

  insert into public.teams(match_id,name,slot)
  values (m.id, trim(p_team2_name), 2)
  returning * into b;

  return jsonb_build_object('ok',true,'match',to_jsonb(m),'teams',jsonb_build_array(to_jsonb(a),to_jsonb(b)));
end;
$$;

create or replace function public.start_match(p_session_token text, p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare m public.matches;
begin
  perform public.require_role(p_session_token, array['judge','admin']);
  update public.matches
  set status='stage_1', stage=1, started_at=coalesce(started_at,now())
  where id=p_match_id and status='waiting'
  returning * into m;
  if m.id is null then return jsonb_build_object('ok',false,'message','Матч нельзя запустить в текущем статусе'); end if;
  return jsonb_build_object('ok',true,'match',to_jsonb(m));
end;
$$;

create or replace function public.pause_match(p_session_token text, p_match_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare m public.matches;
begin
  perform public.require_role(p_session_token, array['judge','admin']);
  update public.matches set status='paused'
  where id=p_match_id and status in ('stage_1','stage_2','stage_3')
  returning * into m;
  if m.id is null then return jsonb_build_object('ok',false,'message','Матч нельзя поставить на паузу'); end if;
  return jsonb_build_object('ok',true,'match',to_jsonb(m));
end;
$$;

create or replace function public.resume_match(p_session_token text, p_match_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare m public.matches;
begin
  perform public.require_role(p_session_token, array['judge','admin']);
  update public.matches set status=case stage when 1 then 'stage_1' when 2 then 'stage_2' else 'stage_3' end
  where id=p_match_id and status='paused'
  returning * into m;
  if m.id is null then return jsonb_build_object('ok',false,'message','Матч не находится на паузе'); end if;
  return jsonb_build_object('ok',true,'match',to_jsonb(m));
end;
$$;

create or replace function public.finish_match(p_session_token text, p_match_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare m public.matches;
begin
  perform public.require_role(p_session_token, array['judge','admin']);
  update public.matches set status='finished', finished_at=now()
  where id=p_match_id and status<>'finished'
  returning * into m;
  if m.id is null then return jsonb_build_object('ok',false,'message','Матч уже завершён'); end if;
  return jsonb_build_object('ok',true,'match',to_jsonb(m));
end;
$$;

create or replace function public.set_stage(p_session_token text, p_match_id uuid, p_stage integer)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare m public.matches;
begin
  perform public.require_role(p_session_token, array['judge','admin']);
  if p_stage not between 1 and 3 then raise exception 'Этап должен быть 1, 2 или 3'; end if;
  update public.matches
  set stage=p_stage,
      status=case when status='paused' then 'paused' else ('stage_'||p_stage::text) end
  where id=p_match_id and status<>'finished'
  returning * into m;
  return jsonb_build_object('ok',m.id is not null,'match',to_jsonb(m));
end;
$$;

-- ---------- Игроки матча ----------

create or replace function public.list_players(p_session_token text)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v_actor uuid;
begin
  v_actor := public.require_role(p_session_token, array['judge','admin']);
  return jsonb_build_object('users', coalesce((
    select jsonb_agg(jsonb_build_object('id',id,'username',username,'display_name',display_name,'role',role) order by display_name)
    from public.users where role in ('player','captain')
  ), '[]'::jsonb));
end;
$$;

create or replace function public.add_match_player(
  p_session_token text, p_match_id uuid, p_user_id uuid, p_team_id uuid, p_position text
)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v_actor uuid; m public.matches; t public.teams; u public.users; row public.match_players;
begin
  v_actor := public.require_role(p_session_token, array['judge','admin']);
  select * into m from public.matches where id=p_match_id;
  select * into t from public.teams where id=p_team_id and match_id=p_match_id;
  select * into u from public.users where id=p_user_id and role in ('player','captain');
  if m.id is null or t.id is null or u.id is null then raise exception 'Некорректные данные игрока или матча'; end if;
  if p_position not in ('keeper','seeker','beater','chaser') then raise exception 'Некорректная позиция'; end if;

  insert into public.match_players(match_id,team_id,user_id,position)
  values (p_match_id,p_team_id,p_user_id,p_position)
  returning * into row;

  return jsonb_build_object('ok',true,'player',to_jsonb(row));
exception when unique_violation then
  return jsonb_build_object('ok',false,'message','Игрок или эта позиция уже назначены в матче');
end;
$$;

create or replace function public.remove_match_player(p_session_token text, p_match_player_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
begin
  perform public.require_role(p_session_token, array['judge','admin']);
  delete from public.match_players where id=p_match_player_id;
  return jsonb_build_object('ok',true);
end;
$$;

-- ---------- Вопросы и ответы ----------

create or replace function public.submit_question(p_session_token text, p_match_id uuid, p_text text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_user uuid; mp public.match_players; m public.matches; q public.questions;
begin
  v_user := public.require_role(p_session_token, array['player','captain']);
  select * into mp from public.match_players where match_id=p_match_id and user_id=v_user;
  select * into m from public.matches where id=p_match_id;
  if mp.id is null then raise exception 'Вы не назначены игроком этого матча'; end if;
  if m.id is null or m.status in ('waiting','finished') then raise exception 'Вопрос нельзя отправить сейчас'; end if;
  insert into public.questions(match_id,team_id,author_id,text) values(p_match_id,mp.team_id,v_user,trim(p_text)) returning * into q;
  return jsonb_build_object('ok',true,'question',to_jsonb(q));
end;
$$;

create or replace function public.submit_answer(p_session_token text, p_question_id uuid, p_text text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_user uuid; q public.questions; mp public.match_players; a public.answers;
begin
  v_user := public.require_role(p_session_token, array['player','captain']);
  select * into q from public.questions where id=p_question_id;
  select * into mp from public.match_players where match_id=q.match_id and user_id=v_user;
  if q.id is null or mp.id is null then raise exception 'Нельзя ответить на этот вопрос'; end if;
  if mp.team_id=q.team_id then raise exception 'Нельзя отвечать на собственный вопрос'; end if;
  insert into public.answers(question_id,author_id,text) values(q.id,v_user,trim(p_text)) returning * into a;
  update public.questions set status='answered' where id=q.id;
  return jsonb_build_object('ok',true,'answer',to_jsonb(a));
end;
$$;

create or replace function public.judge_answer(p_session_token text, p_answer_id uuid, p_is_correct boolean)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_actor uuid; a public.answers; q public.questions;
begin
  v_actor := public.require_role(p_session_token, array['judge','admin']);
  select * into a from public.answers where id=p_answer_id for update;
  if a.id is null or a.status<>'pending' then return jsonb_build_object('ok',false,'message','Ответ уже оценён'); end if;
  select * into q from public.questions where id=a.question_id;
  update public.answers set status=case when p_is_correct then 'correct' else 'incorrect' end where id=a.id;
  update public.questions set status=case when p_is_correct then 'correct' else 'incorrect' end where id=q.id;
  return jsonb_build_object('ok',true,'correct',p_is_correct);
end;
$$;

-- ---------- Чат ----------

create or replace function public.send_chat(p_session_token text, p_match_id uuid, p_message text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_user uuid; u public.users; row public.chat_messages;
begin
  v_user := public.session_user_id(p_session_token);
  if v_user is null then raise exception 'Сессия недействительна'; end if;
  select * into u from public.users where id=v_user;
  insert into public.chat_messages(match_id,user_id,username,display_name,message)
  values(p_match_id,u.id,u.username,u.display_name,trim(p_message))
  returning * into row;
  return jsonb_build_object('ok',true,'message',to_jsonb(row));
end;
$$;

-- ---------- Снитч ----------

create or replace function public.submit_snitch(
  p_session_token text, p_match_id uuid, p_team_id uuid, p_player_id uuid, p_image_url text
)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v_user uuid; mp public.match_players; m public.matches; c public.snitch_catches;
begin
  v_user := public.require_role(p_session_token, array['player','captain']);
  if v_user<>p_player_id then raise exception 'Игрок не совпадает с сессией'; end if;
  select * into mp from public.match_players where match_id=p_match_id and user_id=v_user and team_id=p_team_id and position='seeker';
  select * into m from public.matches where id=p_match_id;
  if mp.id is null then raise exception 'Только ловец своей команды может отправить снитч'; end if;
  if m.status in ('waiting','finished') then raise exception 'Матч не принимает заявки на поимку снитча'; end if;
  insert into public.snitch_catches(match_id,team_id,player_id,image_url)
  values(p_match_id,p_team_id,p_player_id,p_image_url)
  returning * into c;
  return jsonb_build_object('ok',true,'catch',to_jsonb(c));
end;
$$;

create or replace function public.approve_snitch(p_session_token text, p_catch_id uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v_actor uuid; c public.snitch_catches; m public.matches; t public.teams;
begin
  v_actor := public.require_role(p_session_token, array['judge','admin']);
  select * into c from public.snitch_catches where id=p_catch_id for update;
  if c.id is null then return jsonb_build_object('ok',false,'message','Заявка не найдена'); end if;
  if c.status<>'pending' then return jsonb_build_object('ok',false,'message','Заявка уже обработана'); end if;
  select * into m from public.matches where id=c.match_id for update;
  select * into t from public.teams where id=c.team_id for update;
  if m.status='finished' then return jsonb_build_object('ok',false,'message','Матч уже завершён'); end if;

  update public.snitch_catches set status='approved',approved_at=now() where id=c.id;
  update public.teams set score=score+150 where id=t.id;
  update public.matches set status='finished',finished_at=now() where id=m.id;

  return jsonb_build_object(
    'ok',true,'reward',150,'team_name',t.name,
    'message','Снитч пойман!'
  );
end;
$$;

create or replace function public.reject_snitch(p_session_token text, p_catch_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
begin
  perform public.require_role(p_session_token, array['judge','admin']);
  update public.snitch_catches set status='rejected' where id=p_catch_id and status='pending';
  if not found then return jsonb_build_object('ok',false,'message','Заявка уже обработана'); end if;
  return jsonb_build_object('ok',true);
end;
$$;

-- ---------- Данные для кабинетов ----------

create or replace function public.get_my_match(p_session_token text)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_user uuid;
  mp public.match_players;
  m public.matches;
  t public.teams;
  qs jsonb;
  all_teams jsonb;
begin
  v_user := public.require_role(p_session_token, array['player','captain']);
  select * into mp from public.match_players where user_id=v_user order by created_at desc limit 1;
  if mp.id is null then return jsonb_build_object('ok',true,'match',null); end if;
  select * into m from public.matches where id=mp.match_id;
  select * into t from public.teams where id=mp.team_id;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
  into qs
  from (
    select q.id,q.match_id,q.team_id,q.author_id,q.text,q.status,q.created_at,
      u.display_name as author_name,
      coalesce((
        select jsonb_agg(jsonb_build_object('id',a.id,'author_id',a.author_id,'text',a.text,'status',a.status,'created_at',a.created_at) order by a.created_at)
        from public.answers a where a.question_id=q.id
      ),'[]'::jsonb) as answers
    from public.questions q
    join public.users u on u.id=q.author_id
    where q.match_id=m.id
    order by q.created_at desc
    limit 30
  ) x;

  select coalesce(jsonb_agg(to_jsonb(tm) order by tm.slot), '[]'::jsonb)
  into all_teams
  from public.teams tm where tm.match_id=m.id;

  return jsonb_build_object(
    'ok',true,
    'match',to_jsonb(m),
    'team',to_jsonb(t),
    'player',jsonb_build_object('id',mp.id,'user_id',mp.user_id,'position',mp.position),
    'teams',all_teams,
    'questions',qs
  );
end;
$$;

create or replace function public.get_match_for_judge(p_session_token text, p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_actor uuid;
  m public.matches;
  ts jsonb;
  ps jsonb;
  qs jsonb;
  cs jsonb;
begin
  v_actor := public.require_role(p_session_token, array['judge','admin']);
  select * into m from public.matches where id=p_match_id;
  if m.id is null then return jsonb_build_object('ok',false,'message','Матч не найден'); end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.slot),'[]'::jsonb) into ts
  from public.teams t where t.match_id=m.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',mp.id,'user_id',mp.user_id,'position',mp.position,
    'display_name',u.display_name,'username',u.username,'team_id',mp.team_id
  ) order by u.display_name),'[]'::jsonb)
  into ps
  from public.match_players mp join public.users u on u.id=mp.user_id
  where mp.match_id=m.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',q.id,'text',q.text,'status',q.status,'created_at',q.created_at,
    'team_name',t.name,'author_name',u.display_name,
    'answers',coalesce((
      select jsonb_agg(jsonb_build_object('id',a.id,'text',a.text,'status',a.status,'created_at',a.created_at,'author_name',au.display_name) order by a.created_at)
      from public.answers a join public.users au on au.id=a.author_id where a.question_id=q.id
    ),'[]'::jsonb)
  ) order by q.created_at desc),'[]'::jsonb)
  into qs
  from public.questions q
  join public.teams t on t.id=q.team_id
  join public.users u on u.id=q.author_id
  where q.match_id=m.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'image_url',c.image_url,'status',c.status,'created_at',c.created_at,'approved_at',c.approved_at,
    'player_name',u.display_name,'team_name',t.name
  ) order by c.created_at desc),'[]'::jsonb)
  into cs
  from public.snitch_catches c
  join public.users u on u.id=c.player_id
  join public.teams t on t.id=c.team_id
  where c.match_id=m.id;

  return jsonb_build_object('ok',true,'match',to_jsonb(m),'teams',ts,'players',ps,'questions',qs,'catches',cs);
end;
$$;

-- ---------- Права на RPC ----------

grant execute on function public.login_player(text,text) to anon, authenticated;
grant execute on function public.login_judge(text,text) to anon, authenticated;
grant execute on function public.create_user(text,text,text,text,text) to anon, authenticated;
grant execute on function public.create_match(text,text,text,text) to anon, authenticated;
grant execute on function public.start_match(text,uuid) to anon, authenticated;
grant execute on function public.pause_match(text,uuid) to anon, authenticated;
grant execute on function public.resume_match(text,uuid) to anon, authenticated;
grant execute on function public.finish_match(text,uuid) to anon, authenticated;
grant execute on function public.set_stage(text,uuid,integer) to anon, authenticated;
grant execute on function public.list_players(text) to anon, authenticated;
grant execute on function public.add_match_player(text,uuid,uuid,uuid,text) to anon, authenticated;
grant execute on function public.remove_match_player(text,uuid) to anon, authenticated;
grant execute on function public.submit_question(text,uuid,text) to anon, authenticated;
grant execute on function public.submit_answer(text,uuid,text) to anon, authenticated;
grant execute on function public.judge_answer(text,uuid,boolean) to anon, authenticated;
grant execute on function public.send_chat(text,uuid,text) to anon, authenticated;
grant execute on function public.submit_snitch(text,uuid,uuid,uuid,text) to anon, authenticated;
grant execute on function public.approve_snitch(text,uuid) to anon, authenticated;
grant execute on function public.reject_snitch(text,uuid) to anon, authenticated;
grant execute on function public.get_my_match(text) to anon, authenticated;
grant execute on function public.get_match_for_judge(text,uuid) to anon, authenticated;

-- ---------- Storage ----------

insert into storage.buckets (id, name, public)
values ('snitch-catches','snitch-catches',true)
on conflict (id) do update set public=true;

drop policy if exists snitch_public_read on storage.objects;
create policy snitch_public_read on storage.objects
for select to anon, authenticated
using (bucket_id='snitch-catches');

drop policy if exists snitch_public_upload on storage.objects;
create policy snitch_public_upload on storage.objects
for insert to anon, authenticated
with check (bucket_id='snitch-catches');

-- ---------- Realtime ----------
-- Supabase Realtime должен видеть изменения этих таблиц.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='matches') then
    alter publication supabase_realtime add table public.matches;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='teams') then
    alter publication supabase_realtime add table public.teams;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='questions') then
    alter publication supabase_realtime add table public.questions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='answers') then
    alter publication supabase_realtime add table public.answers;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_messages') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='snitch_catches') then
    alter publication supabase_realtime add table public.snitch_catches;
  end if;
end $$;

-- ---------- Первый судья ----------
-- Для создания первого аккаунта судьи выполните один раз:
-- insert into public.users(username,password_hash,display_name,role)
-- values ('judge', crypt('CHANGE-ME', gen_salt('bf',12)), 'Главный судья', 'judge');
--
-- После этого не оставляйте демонстрационный пароль.
