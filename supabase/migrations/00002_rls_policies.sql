-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE testers ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE signoffs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROJECTS: public read, admin-only write
-- ============================================
CREATE POLICY "Public can read projects"
  ON projects FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- CHECKLIST ITEMS: public read, admin-only write
-- ============================================
CREATE POLICY "Public can read checklist items"
  ON checklist_items FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- TESTERS: public can insert and read
-- ============================================
CREATE POLICY "Public can insert testers"
  ON testers FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can read testers"
  ON testers FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- RESPONSES: public can insert, update, and read
-- ============================================
CREATE POLICY "Public can insert responses"
  ON responses FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can update responses"
  ON responses FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can read responses"
  ON responses FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- ATTACHMENTS: public can insert and read
-- ============================================
CREATE POLICY "Public can insert attachments"
  ON attachments FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can read attachments"
  ON attachments FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- SIGNOFFS: public read, admin-only write
-- ============================================
CREATE POLICY "Public can read signoffs"
  ON signoffs FOR SELECT
  TO anon
  USING (true);
