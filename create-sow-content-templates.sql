-- Create SOW content templates table
CREATE TABLE IF NOT EXISTS sow_content_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  section_name TEXT NOT NULL UNIQUE,
  section_title TEXT NOT NULL,
  default_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  description TEXT
);

-- Insert default content templates
INSERT INTO sow_content_templates (section_name, section_title, default_content, sort_order, description) VALUES
  ('intro', 'Introduction Section', '<p class="mb-4">THIS STATEMENT OF WORK ("SOW"), is entered into by {clientName}, ("Customer") and LeanData, Inc., ("LeanData") effective as of the date of the last signature above ("SOW Effective Date") and is hereby incorporated by reference into that certain Master Subscription and Professional Services Agreement or other agreement between the Customer and LeanData ("Agreement").  To the extent there are any inconsistencies between or among the Agreement and this SOW, including all Exhibits to this SOW, such inconsistencies shall be resolved in accordance with the following order of precedence: (i) this SOW, (ii) any Exhibits to this SOW, and (iii), the Agreement.</p>

<p>LeanData will perform the professional services described in this SOW, which may include consultation, configuration, integration, project management and training (collectively, the "Professional Services").  LeanData will not start performing such Professional Services under this SOW until both Parties sign this SOW and the Agreement.  This SOW and the Agreement constitute the Parties'' complete agreement regarding the Professional Services and other matters addressed in this SOW.</p>', 1, 'Default introduction text for all SOWs'),
  ('scope', 'Scope Section', '<p class="mb-4">The customer has implemented LeanData and seeks to augment their team with LeanData expertise through Expert Services provided by the LeanData Professional Services team. As part of Expert Services, LeanData personnel as requested in the table below will assist the customer with one or more of the following:</p>

{deliverables}

<p>Customer is designated to have the primary responsibility for activities, successful and timely completion depends on participation by, and key content from, Customer''s subject matter experts, as well as decisions and approvals from Customer''s leadership team.</p>', 2, 'Default scope text for all SOWs')
ON CONFLICT (section_name) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_sow_content_templates_updated_at BEFORE UPDATE ON sow_content_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sow_content_templates_is_active ON sow_content_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_sow_content_templates_sort_order ON sow_content_templates(sort_order);

-- Enable RLS
ALTER TABLE sow_content_templates ENABLE ROW LEVEL SECURITY;

-- Create admin policies
CREATE POLICY "Admin access to content templates" ON sow_content_templates FOR ALL USING (true);

-- Add columns to SOW table to track custom content
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_intro_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_scope_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS intro_content_edited BOOLEAN DEFAULT false;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS scope_content_edited BOOLEAN DEFAULT false; 