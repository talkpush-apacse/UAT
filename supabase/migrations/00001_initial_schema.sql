-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  test_scenario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_slug ON projects(slug);

-- ============================================
-- CHECKLIST ITEMS TABLE
-- ============================================
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  path TEXT CHECK (path IN ('Happy', 'Non-Happy') OR path IS NULL),
  actor TEXT NOT NULL CHECK (actor IN ('Candidate', 'Talkpush', 'Recruiter')),
  action TEXT NOT NULL,
  view_sample TEXT,
  crm_module TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(project_id, step_number)
);

CREATE INDEX idx_checklist_items_project ON checklist_items(project_id);
CREATE INDEX idx_checklist_items_sort ON checklist_items(project_id, sort_order);

-- ============================================
-- TESTERS TABLE
-- ============================================
CREATE TABLE testers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, email),
  UNIQUE(project_id, mobile)
);

CREATE INDEX idx_testers_project ON testers(project_id);
CREATE INDEX idx_testers_email ON testers(project_id, email);
CREATE INDEX idx_testers_mobile ON testers(project_id, mobile);

-- ============================================
-- RESPONSES TABLE
-- ============================================
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tester_id UUID NOT NULL REFERENCES testers(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('Pass', 'Fail', 'N/A', 'Blocked')),
  comment TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tester_id, checklist_item_id)
);

CREATE INDEX idx_responses_tester ON responses(tester_id);
CREATE INDEX idx_responses_checklist_item ON responses(checklist_item_id);

-- ============================================
-- ATTACHMENTS TABLE
-- ============================================
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attachments_response ON attachments(response_id);

-- ============================================
-- SIGNOFFS TABLE
-- ============================================
CREATE TABLE signoffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  signoff_name TEXT NOT NULL,
  signoff_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signoffs_project ON signoffs(project_id);

-- ============================================
-- UPDATED_AT TRIGGER (for responses)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER responses_updated_at
  BEFORE UPDATE ON responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
