-- supabase/migrations/033_create_segment_rules.sql
-- Segment-driven business rules (ENT roadmap Phase 1).
-- Seeded to mirror the previously hardcoded behaviors exactly:
--   EE/LE: self-serve PM-hours removal; MM: +5 hours; EC: neither.

CREATE TABLE IF NOT EXISTS segment_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  segment TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  pm_removal_self_serve BOOLEAN NOT NULL DEFAULT false,
  extra_hours INTEGER NOT NULL DEFAULT 0 CHECK (extra_hours >= 0 AND extra_hours <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_segment_rules_updated_at
  BEFORE UPDATE ON segment_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

INSERT INTO segment_rules (segment, display_name, pm_removal_self_serve, extra_hours) VALUES
  ('LE', 'Large Enterprise', true, 0),
  ('EE', 'Emerging Enterprise', true, 0),
  ('MM', 'Mid-Market', false, 5),
  ('EC', 'Commercial', false, 0)
ON CONFLICT (segment) DO NOTHING;

-- All app access goes through the service-role client; allow it explicitly
-- (pricing_roles_config needed migrations 019/020/022 to fix this — do it right first time).
ALTER TABLE segment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_segment_rules" ON segment_rules
  FOR ALL TO service_role USING (true) WITH CHECK (true);
