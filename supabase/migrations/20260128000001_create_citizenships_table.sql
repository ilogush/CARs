-- Create citizenships table
CREATE TABLE IF NOT EXISTS public.citizenships (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(3) NOT NULL UNIQUE, -- ISO 3166-1 alpha-3 country code
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.citizenships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow read access to all authenticated users"
  ON public.citizenships
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to insert citizenships"
  ON public.citizenships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Allow admins to update citizenships"
  ON public.citizenships
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Allow admins to delete citizenships"
  ON public.citizenships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create index for faster searches
CREATE INDEX idx_citizenships_name ON public.citizenships(name);
CREATE INDEX idx_citizenships_is_active ON public.citizenships(is_active);

-- Seed with popular citizenships
INSERT INTO public.citizenships (name, code) VALUES
  ('Russia', 'RUS'),
  ('Thailand', 'THA'),
  ('United States', 'USA'),
  ('United Kingdom', 'GBR'),
  ('Germany', 'DEU'),
  ('France', 'FRA'),
  ('China', 'CHN'),
  ('Japan', 'JPN'),
  ('India', 'IND'),
  ('Australia', 'AUS'),
  ('Canada', 'CAN'),
  ('Italy', 'ITA'),
  ('Spain', 'ESP'),
  ('Brazil', 'BRA'),
  ('South Korea', 'KOR'),
  ('Netherlands', 'NLD'),
  ('Switzerland', 'CHE'),
  ('Sweden', 'SWE'),
  ('Poland', 'POL'),
  ('Belgium', 'BEL'),
  ('Austria', 'AUT'),
  ('Norway', 'NOR'),
  ('Denmark', 'DNK'),
  ('Finland', 'FIN'),
  ('Ireland', 'IRL'),
  ('Singapore', 'SGP'),
  ('New Zealand', 'NZL'),
  ('Portugal', 'PRT'),
  ('Greece', 'GRC'),
  ('Czech Republic', 'CZE'),
  ('Israel', 'ISR'),
  ('UAE', 'ARE'),
  ('Saudi Arabia', 'SAU'),
  ('Turkey', 'TUR'),
  ('Mexico', 'MEX'),
  ('Argentina', 'ARG'),
  ('South Africa', 'ZAF'),
  ('Egypt', 'EGY'),
  ('Vietnam', 'VNM'),
  ('Philippines', 'PHL'),
  ('Indonesia', 'IDN'),
  ('Malaysia', 'MYS'),
  ('Kazakhstan', 'KAZ'),
  ('Ukraine', 'UKR'),
  ('Belarus', 'BLR')
ON CONFLICT (name) DO NOTHING;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_citizenships_updated_at
  BEFORE UPDATE ON public.citizenships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
