-- Migration: 20260407000000_add_clients_table.sql
-- Rollback: DROP TABLE IF EXISTS clients;

-- Dynamic client name registry (replaces hardcoded CLIENT_NAMES constant)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admins to read/write
CREATE POLICY "Authenticated users can read clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (true);

-- Seed with existing hardcoded client names
INSERT INTO clients (name) VALUES
  ('Accenture'),
  ('Afni'),
  ('Alfamart'),
  ('Alorica'),
  ('Cognizant'),
  ('Concentrix'),
  ('EXL'),
  ('Inspiro'),
  ('Mcdonalds'),
  ('TaskUs'),
  ('WiPro')
ON CONFLICT (name) DO NOTHING;
