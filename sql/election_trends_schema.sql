CREATE TABLE IF NOT EXISTS public.election_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  country text NOT NULL,
  state text,
  election_date date,
  status text NOT NULL DEFAULT 'upcoming',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.election_constituency_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  election_event_id uuid REFERENCES public.election_events(id) ON DELETE CASCADE,
  state text NOT NULL,
  constituency text NOT NULL,
  leading_party text,
  trailing_party text,
  leading_candidate text,
  trailing_candidate text,
  margin integer DEFAULT 0,
  status text,
  round_no integer DEFAULT 0,
  last_updated timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(election_event_id, state, constituency)
);

CREATE TABLE IF NOT EXISTS public.election_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  election_event_id uuid REFERENCES public.election_events(id) ON DELETE CASCADE,
  source_url text,
  raw_payload jsonb,
  captured_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.election_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  election_event_id uuid REFERENCES public.election_events(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  title text NOT NULL,
  message text,
  severity text DEFAULT 'info',
  constituency text,
  party text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.election_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_constituency_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_alerts ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Enable read access for all users" ON public.election_events FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.election_constituency_results FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.election_alerts FOR SELECT USING (true);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.election_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.election_constituency_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.election_alerts;
