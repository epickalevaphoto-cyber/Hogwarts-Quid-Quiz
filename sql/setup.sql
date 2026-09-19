-- Таблица судей
DROP TABLE IF EXISTS judges CASCADE;
CREATE TABLE judges (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  passcode TEXT NOT NULL
);

INSERT INTO judges (username, passcode) 
VALUES ('судья', '12345');

-- Таблица игроков
DROP TABLE IF EXISTS players CASCADE;
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  passcode TEXT NOT NULL,
  team_name TEXT NOT NULL,
  house TEXT DEFAULT 'Hogwarts',
  team_code TEXT NOT NULL,
  letter_role TEXT NOT NULL,
  position_name TEXT NOT NULL,
  score INT DEFAULT 0
);

-- Заполнение всех 18 ролей
INSERT INTO players (username, passcode, team_name, team_code, letter_role, position_name) VALUES
('Охотник1А', '1а', 'Команда А', 'team_1', 'A', 'Охотник 1'),
('Охотник2А', '2а', 'Команда А', 'team_1', 'A', 'Охотник 2'),
('Охотник3А', '3а', 'Команда А', 'team_1', 'A', 'Охотник 3'),
('Охотник1Б', '1б', 'Команда Б', 'team_2', 'B', 'Охотник 1'),
('Охотник2Б', '2б', 'Команда Б', 'team_2', 'B', 'Охотник 2'),
('Охотник3Б', '3б', 'Команда Б', 'team_2', 'B', 'Охотник 3'),
('Загонщик 1А', '1а', 'Команда А', 'team_1', 'A', 'Загонщик 1'),
('Загонщик 2А', '2а', 'Команда А', 'team_1', 'A', 'Загонщик 2'),
('Загонщик 3А', '3а', 'Команда А', 'team_1', 'A', 'Загонщик 3'),
('Загонщик 1Б', '1б', 'Команда Б', 'team_2', 'B', 'Загонщик 1'),
('Загонщик 2Б', '2б', 'Команда Б', 'team_2', 'B', 'Загонщик 2'),
('Загонщик 3Б', '3б', 'Команда Б', 'team_2', 'B', 'Загонщик 3'),
('Ловец 1А', '1а', 'Команда А', 'team_1', 'A', 'Ловец 1'),
('Ловец 2А', '2а', 'Команда А', 'team_1', 'A', 'Ловец 2'),
('Ловец 1Б', '1б', 'Команда Б', 'team_2', 'B', 'Ловец 1'),
('Ловец 2Б', '2б', 'Команда Б', 'team_2', 'B', 'Ловец 2'),
('Вратарь 1А', '1а', 'Команда А', 'team_1', 'A', 'Вратарь 1'),
('Вратарь 1Б', '1б', 'Команда Б', 'team_2', 'B', 'Вратарь 1');

-- Таблица игрового состояния
DROP TABLE IF EXISTS game_state CASCADE;
CREATE TABLE game_state (
  id INT PRIMARY KEY DEFAULT 1,
  current_step INT DEFAULT 1,
  team_a_score INT DEFAULT 0,
  team_b_score INT DEFAULT 0,
  snitch_caught_by TEXT DEFAULT NULL
);

INSERT INTO game_state (id, current_step, team_a_score, team_b_score) 
VALUES (1, 1, 0, 0) ON CONFLICT (id) DO NOTHING;

-- Таблица чата
DROP TABLE IF EXISTS chat_messages CASCADE;
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  channel TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Включаем Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
