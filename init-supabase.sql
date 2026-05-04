-- Create channels table
CREATE TABLE channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  state TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create settings table
CREATE TABLE site_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  min_viewers INTEGER DEFAULT 1000,
  max_viewers INTEGER DEFAULT 5000,
  header_ad TEXT,
  sidebar_ad TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create chat messages table
CREATE TABLE chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert dummy channels
INSERT INTO channels (name, youtube_id, state) VALUES
  ('State News 1', '1wECsnGZcfc', 'Kerala'),
  ('State News 2', 's0LLVQeMmtU', 'Kerala'),
  ('State News 3', 'nObUcHKZEGY', 'Tamil Nadu'),
  ('State News 4', 'AT0fo8Ty4jo', 'Karnataka');

-- Insert dummy settings
INSERT INTO site_settings (id, min_viewers, max_viewers, header_ad, sidebar_ad) VALUES
  ('global', 1000, 5000, '<!-- Header Ad Slot -->', '<!-- Sidebar Ad Slot -->');

-- Insert dummy chat message
INSERT INTO chat_messages (username, text) VALUES
  ('Admin', 'Welcome to the Live News Portal!');

-- Turn on realtime for chat_messages table
alter publication supabase_realtime add table chat_messages;

-- Enable RLS and setup basic policies (Allow public read/insert for chat, read for channels/settings)
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Public can read active channels
CREATE POLICY "Public can view active channels" ON channels
  FOR SELECT USING (is_active = true);

-- Public can read site settings
CREATE POLICY "Public can view site settings" ON site_settings
  FOR SELECT USING (true);

-- Public can read and insert chat messages
CREATE POLICY "Public can view chat" ON chat_messages
  FOR SELECT USING (true);
  
CREATE POLICY "Public can insert chat" ON chat_messages
  FOR INSERT WITH CHECK (true);
-- Create visitor logs table
CREATE TABLE IF NOT EXISTS visitor_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_path TEXT,
  referrer TEXT,
  browser TEXT,
  device TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for visitor_logs
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;

-- Allow public to INSERT logs
CREATE POLICY "Public can insert logs" ON visitor_logs
  FOR INSERT WITH CHECK (true);

-- Allow admins to VIEW logs
CREATE POLICY "Admin can view logs" ON visitor_logs
  FOR SELECT USING (auth.role() = 'authenticated');
