CREATE TABLE IF NOT EXISTS admin_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  tester_id UUID NOT NULL REFERENCES testers(id) ON DELETE CASCADE,
  behavior_type TEXT,
  resolution_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on changes (reuses the trigger function from migration 00001)
CREATE TRIGGER update_admin_reviews_updated_at
  BEFORE UPDATE ON admin_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_reviews_checklist_item ON admin_reviews(checklist_item_id);
CREATE INDEX IF NOT EXISTS idx_admin_reviews_tester ON admin_reviews(tester_id);

-- RLS
ALTER TABLE admin_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read admin_reviews"
  ON admin_reviews FOR SELECT USING (true);

CREATE POLICY "Public can insert admin_reviews"
  ON admin_reviews FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update admin_reviews"
  ON admin_reviews FOR UPDATE USING (true);
