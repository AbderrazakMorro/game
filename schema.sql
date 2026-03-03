-- Schema Supabase Mafia Online (v2)

-- 1. Table Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'lobby', -- lobby | roles | night_mafia | night_doctor | night_detective | day_discussion | day_vote | game_over
  host_id TEXT,
  phase_number INTEGER NOT NULL DEFAULT 0, -- increments each full night+day cycle
  winner TEXT, -- 'mafia' | 'village' | NULL
  revote_candidates JSONB DEFAULT NULL, -- array of player UUIDs eligible during a revote
  revote_round INTEGER NOT NULL DEFAULT 0  -- increments each tie within the same day_vote phase
);

-- 2. Table Players
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT, -- mafia | doctor | detective | villager
  is_alive BOOLEAN DEFAULT true,
  is_protected BOOLEAN DEFAULT false,
  is_ready BOOLEAN DEFAULT false -- used in 'roles' phase acknowledgement
);

-- 3. Table Actions (night actions + day votes)
CREATE TABLE IF NOT EXISTS actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  action_type TEXT NOT NULL, -- kill | save | check | vote
  actor_id UUID REFERENCES players(id) ON DELETE CASCADE,
  target_id UUID REFERENCES players(id) ON DELETE CASCADE,
  revote_round INTEGER NOT NULL DEFAULT 0 -- matches rooms.revote_round to scope votes per revote round
);

-- 4. Table Game Events (broadcast announcements to all players)
CREATE TABLE IF NOT EXISTS game_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  event_type TEXT NOT NULL, -- night_result | day_result | detective_result | game_over
  payload JSONB NOT NULL DEFAULT '{}'  -- flexible data: { eliminated, saved, winner, executedRole, detectiveResult }
);

-- 5. Table Chat Messages (pour le chat en direct)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_mafia_chat BOOLEAN DEFAULT false
);

-- 6. Table Voice Rooms (mafia | global)
CREATE TABLE IF NOT EXISTS voice_rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  type TEXT NOT NULL -- 'mafia' | 'global'
);

-- 7. Table Voice Participants (sync WebRTC state)
CREATE TABLE IF NOT EXISTS voice_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  voice_room_id UUID REFERENCES voice_rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  is_connected BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  UNIQUE(voice_room_id, player_id)
);


-- Activation de Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE actions;
ALTER PUBLICATION supabase_realtime ADD TABLE game_events;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE voice_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE voice_participants;

