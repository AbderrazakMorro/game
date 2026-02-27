-- Schema Supabase Mafia Online

-- 1. Table Rooms
CREATE TABLE rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'lobby', -- lobby, roles, night_mafia, night_doctor, night_detective, day_discussion, day_vote
  host_id TEXT
);

-- 2. Table Players
CREATE TABLE players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT, -- mafia, doctor, detective, villager
  is_alive BOOLEAN DEFAULT true,
  is_protected BOOLEAN DEFAULT false
);

-- 3. Table Actions (pour le vote et la nuit)
CREATE TABLE actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  action_type TEXT NOT NULL, -- kill, save, check, vote
  target_id UUID REFERENCES players(id) ON DELETE CASCADE
);

-- Activation de Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE actions;
