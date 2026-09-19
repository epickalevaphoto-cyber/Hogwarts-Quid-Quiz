-- 1. Таблица пользователей (Судья + 18 Игроков)
DROP TABLE IF EXISTS match_players CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  passcode TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player', -- 'judge' или 'player'
  team_code TEXT,                    -- 'team_1' (Команда А) или 'team_2' (Команда Б)
  position_name TEXT,                -- 'Охотник 1', 'Загонщик 2', 'Ловец' и т.д.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Вставка Судьи
INSERT INTO users (username, passcode, role) 
VALUES ('судья', '12345', 'judge');

-- Вставка 18 Игроков
INSERT INTO users (username, passcode, role, team_code, position_name) VALUES
('Охотник1А', '1а', 'player', 'team_1', 'Охотник 1'),
('Охотник2А', '2а', 'player', 'team_1', 'Охотник 2'),
('Охотник3А', '3а', 'player', 'team_1', 'Охотник 3'),
('Охотник1Б', '1б', 'player', 'team_2', 'Охотник 1'),
('Охотник2Б', '2б', 'player', 'team_2', 'Охотник 2'),
('Охотник3Б', '3б', 'player', 'team_2', 'Охотник 3'),
('Загонщик 1А', '1а', 'player', 'team_1', 'Загонщик 1'),
('Загонщик 2А', '2а', 'player', 'team_1', 'Загонщик 2'),
('Загонщик 3А', '3а', 'player', 'team_1', 'Загонщик 3'),
('Загонщик 1Б', '1б', 'player', 'team_2', 'Загонщик 1'),
('Загонщик 2Б', '2б', 'player', 'team_2', 'Загонщик 2'),
('Загонщик 3Б', '3б', 'player', 'team_2', 'Загонщик 3'),
('Ловец 1А', '1а', 'player', 'team_1', 'Ловец 1'),
('Ловец 2А', '2а', 'player', 'team_1', 'Ловец 2'),
('Ловец 1Б', '1б', 'player', 'team_2', 'Ловец 1'),
('Ловец 2Б', '2б', 'player', 'team_2', 'Ловец 2'),
('Вратарь 1А', '1а', 'player', 'team_1', 'Вратарь 1'),
('Вратарь 1Б', '1б', 'player', 'team_2', 'Вратарь 1');

-- 2. Таблица матчей
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  status TEXT DEFAULT 'waiting', -- 'waiting', 'active', 'finished'
  current_step INT DEFAULT 1,
  team_a_score INT DEFAULT 0,
  team_b_score INT DEFAULT 0,
  snitch_status TEXT DEFAULT 'hidden', -- 'hidden', 'appeared', 'caught'
  snitch_winner TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создаем стартовый матч
INSERT INTO matches (id, status) VALUES (1, 'waiting') ON CONFLICT (id) DO NOTHING;

-- 3. Сопоставление игроков с матчем
CREATE TABLE match_players (
  id SERIAL PRIMARY KEY,
  match_id INT REFERENCES matches(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  score INT DEFAULT 0,
  UNIQUE(match_id, user_id)
);

-- 4. Чат
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  match_id INT REFERENCES matches(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RPC Функция безопасной авторизации
CREATE OR REPLACE FUNCTION login_user(p_username TEXT, p_passcode TEXT)
RETURNS TABLE (
  id INT,
  username TEXT,
  role TEXT,
  team_code TEXT,
  position_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.role, u.team_code, u.position_name
  FROM users u
  WHERE LOWER(u.username) = LOWER(p_username) AND u.passcode = p_passcode;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Включаем Realtime для обновления экранов в реальном времени
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_players;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
