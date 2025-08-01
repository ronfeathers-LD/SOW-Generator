-- Comprehensive Migration Script for SOW Generator
-- Run this in your Supabase SQL Editor to fix the missing columns issue

-- 1. Add project details fields
ALTER TABLE sows ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '["Matching/Routing"]';
ALTER TABLE sows ADD COLUMN IF NOT EXISTS number_of_units TEXT DEFAULT '125';
ALTER TABLE sows ADD COLUMN IF NOT EXISTS regions TEXT DEFAULT '1';
ALTER TABLE sows ADD COLUMN IF NOT EXISTS salesforce_tenants TEXT DEFAULT '2';
ALTER TABLE sows ADD COLUMN IF NOT EXISTS timeline_weeks TEXT DEFAULT '8';
ALTER TABLE sows ADD COLUMN IF NOT EXISTS project_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS project_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS units_consumption TEXT DEFAULT 'All units immediately';

-- 2. Add missing columns that might be needed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sows' AND column_name = 'avoma_transcription'
    ) THEN
        ALTER TABLE sows ADD COLUMN avoma_transcription TEXT DEFAULT '';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sows' AND column_name = 'objectives_description'
    ) THEN
        ALTER TABLE sows ADD COLUMN objectives_description TEXT DEFAULT '';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sows' AND column_name = 'objectives_key_objectives'
    ) THEN
        ALTER TABLE sows ADD COLUMN objectives_key_objectives JSONB DEFAULT '[]';
    END IF;
END $$;

-- 3. Add content template columns
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_intro_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_scope_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS intro_content_edited BOOLEAN DEFAULT false;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS scope_content_edited BOOLEAN DEFAULT false;

-- 4. Add objectives disclosure content columns
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_objectives_disclosure_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS objectives_disclosure_content_edited BOOLEAN DEFAULT false;

-- 5. Add assumptions content columns
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_assumptions_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS assumptions_content_edited BOOLEAN DEFAULT false;

-- 6. Add project phases content columns
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_project_phases_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS project_phases_content_edited BOOLEAN DEFAULT false;

-- 7. Add avoma URL column
ALTER TABLE sows ADD COLUMN IF NOT EXISTS avoma_url TEXT DEFAULT '';

-- 8. Add salesforce account ID column
ALTER TABLE sows ADD COLUMN IF NOT EXISTS salesforce_account_id TEXT;

-- 9. Create sow_content_templates table if it doesn't exist
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

-- 10. Insert default content templates
INSERT INTO sow_content_templates (section_name, section_title, default_content, sort_order, description) VALUES
  ('intro', 'Introduction Section', '<p class="mb-4">THIS STATEMENT OF WORK ("SOW"), is entered into by {clientName}, ("Customer") and LeanData, Inc., ("LeanData") effective as of the date of the last signature above ("SOW Effective Date") and is hereby incorporated by reference into that certain Master Subscription and Professional Services Agreement or other agreement between the Customer and LeanData ("Agreement").  To the extent there are any inconsistencies between or among the Agreement and this SOW, including all Exhibits to this SOW, such inconsistencies shall be resolved in accordance with the following order of precedence: (i) this SOW, (ii) any Exhibits to this SOW, and (iii), the Agreement.</p>

<p>LeanData will perform the professional services described in this SOW, which may include consultation, configuration, integration, project management and training (collectively, the "Professional Services").  LeanData will not start performing such Professional Services under this SOW until both Parties sign this SOW and the Agreement.  This SOW and the Agreement constitute the Parties'' complete agreement regarding the Professional Services and other matters addressed in this SOW.</p>', 1, 'Default introduction text for all SOWs'),
  ('scope', 'Scope Section', '<p class="mb-4">The customer has implemented LeanData and seeks to augment their team with LeanData expertise through Expert Services provided by the LeanData Professional Services team. As part of Expert Services, LeanData personnel as requested in the table below will assist the customer with one or more of the following:</p>

{deliverables}

<p>Customer is designated to have the primary responsibility for activities, successful and timely completion depends on participation by, and key content from, Customer''s subject matter experts, as well as decisions and approvals from Customer''s leadership team.</p>', 2, 'Default scope text for all SOWs')
ON CONFLICT (section_name) DO NOTHING;

-- 11. Insert objectives disclosure template
INSERT INTO sow_content_templates (
  section_name, 
  section_title, 
  default_content, 
  description, 
  sort_order, 
  is_active
) VALUES (
  'objectives-disclosure',
  'Objectives Disclosure',
  'Customers and LeanData''s responsibilities for the project are described in this SOW. Where LeanData is designated to have the primary responsibility for certain activities, successful and timely completion depends on participation by, and key content from, Customer''s subject matter experts, as well as decisions and approvals from Customer''s leadership team and other assumptions set forth in this SOW. Likewise, where Customer has the primary responsibility for certain activities, LeanData will provide appropriate cooperation and input. Where the Parties are jointly responsible for certain activities, the Parties will collaborate in good faith to resolve issues in accordance with the relevant mutually agreed priorities and the other terms of this SOW.

A summary of scope assumptions, Customer''s relevant use cases, and the Parties'' respective responsibilities under this SOW appears below. LeanData has relied on this information in estimating the applicable fees, timeline, level of effort and resources required for the Professional Services under this SOW. This SOW is based on current assumptions and information currently known as of the SOW Effective Date. During the "Discovery" phase of the implementation, LeanData will gather additional detailed information about Customer''s requirements and use cases, based upon which the scope of the implementation may change, resulting in a Post-Discovery Change Order mutually agreed by the Parties.',
  'Objectives disclosure content that explains responsibilities and assumptions',
  3,
  true
) ON CONFLICT (section_name) DO NOTHING;

-- 12. Insert assumptions template
INSERT INTO sow_content_templates (section_name, section_title, default_content, sort_order, description) VALUES
  ('assumptions', 'Assumptions Section', 'The following are the assumptions as part of the SOW:

• LeanData Professional Services will require access to the customer''s SFDC''s sandbox and production tenants for the configuration of LeanData; and, the customer will be responsible to ensure appropriate access is granted for the duration of the project. Customer will share all Salesforce details pertaining to configurations, including but not limited to: User IDs, fields/values, Queue IDs, Assignment rule IDs, etc.

• For additional requests outside this SOW, LeanData shall work with Customer to determine if an additional SOW is required or determine alternate methods to remedy the request.

• If the Customer requires LeanData to travel to Customer locations, then travel expenses shall be billed separately and not included in the estimate above. All expenses shall be pre-approved by Customer prior to LeanData booking travel itineraries.

• All services described in this SOW, including any training, will be performed remotely from a LeanData office location during normal business hours: Monday through Friday from 9 am to 5 pm PDT.

• Customer will conduct all required testing and communicate to LeanData anything that needs further investigation and/or additional changes to configurations.', 3, 'Default assumptions text for all SOWs')
ON CONFLICT (section_name) DO NOTHING;

-- 13. Insert project phases template
INSERT INTO sow_content_templates (section_name, section_title, default_content, sort_order, description) VALUES
  ('project-phases', 'Project Phases, Activities and Artifacts', '<h2 class="text-2xl font-bold text-center mb-6">PROJECT PHASES, ACTIVITIES AND ARTIFACTS</h2>

<p class="mb-6">LeanData has developed a phased methodology, LeanData Delivery Methodology Lite (LDM-Lite), to achieve success in implementing Customer''s Go-To-Market strategies. The phased approach provides guidance to the project team with activities and artifacts that need to be accomplished for the success of the following phases:</p>

<div class="overflow-x-auto">
  <table class="min-w-full border border-gray-300">
    <thead>
      <tr class="bg-gray-100">
        <th class="border border-gray-300 px-4 py-2 text-left font-semibold">Phase</th>
        <th class="border border-gray-300 px-4 py-2 text-left font-semibold">Activities</th>
        <th class="border border-gray-300 px-4 py-2 text-left font-semibold">Artifacts</th>
        <th class="border border-gray-300 px-4 py-2 text-left font-semibold">Responsible</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border border-gray-300 px-4 py-2 font-medium">Engage</td>
        <td class="border border-gray-300 px-4 py-2">
          <ul class="list-disc list-inside space-y-1">
            <li>Conduct project kick-off</li>
            <li>Collaborate on project plan</li>
          </ul>
        </td>
        <td class="border border-gray-300 px-4 py-2">
          <ul class="list-disc list-inside space-y-1">
            <li>Kick off presentation</li>
            <li>Project Plan</li>
          </ul>
        </td>
        <td class="border border-gray-300 px-4 py-2">Joint (LeanData and Customer)</td>
      </tr>
      <tr>
        <td class="border border-gray-300 px-4 py-2 font-medium">Discovery</td>
        <td class="border border-gray-300 px-4 py-2">
          <ul class="list-disc list-inside space-y-1">
            <li>Requirements Gathering</li>
            <li>Implementation questionnaire</li>
          </ul>
        </td>
        <td class="border border-gray-300 px-4 py-2">
          <ul class="list-disc list-inside space-y-1">
            <li>SFDC Sandbox</li>
            <li>SFDC Sandbox with access to LeanData personnel (preferably copy of Production)</li>
          </ul>
        </td>
        <td class="border border-gray-300 px-4 py-2">Customer</td>
      </tr>
      <tr>
        <td class="border border-gray-300 px-4 py-2 font-medium">Build</td>
        <td class="border border-gray-300 px-4 py-2">
          <ul class="list-disc list-inside space-y-1">
            <li>Sandbox Build completion</li>
            <li>Build review with customer</li>
          </ul>
        </td>
        <td class="border border-gray-300 px-4 py-2">
          <ul class="list-disc list-inside space-y-1">
            <li>Configured sandbox environment</li>
          </ul>
        </td>
        <td class="border border-gray-300 px-4 py-2">LeanData</td>
      </tr>
      <tr>
        <td class="border border-gray-300 px-4 py-2 font-medium">Test</td>
        <td class="border border-gray-300 px-4 py-2">
          <ul class="list-disc list-inside space-y-1">
            <li>System testing and Defect Resolution</li>
          </ul>
        </td>
        <td class="border border-gray-300 px-4 py-2">
          <ul class="list-disc list-inside space-y-1">
            <li>Customer: Details of use cases, test plan and result.</li>
            <li>LeanData: Defect Resolution and re-configuration for LeanData-related issues</li>
          </ul>
        </td>
        <td class="border border-gray-300 px-4 py-2">Joint (LeanData and Customer)</td>
      </tr>
      <tr>
        <td class="border border-gray-300 px-4 py-2 font-medium">Deploy</td>
        <td class="border border-gray-300 px-4 py-2">
          <ul class="list-disc list-inside space-y-1">
            <li>Deploy to Production</li>
          </ul>
        </td>
        <td class="border border-gray-300 px-4 py-2">
          <ul class="list-disc list-inside space-y-1">
            <li>LeanData live in Production</li>
          </ul>
        </td>
        <td class="border border-gray-300 px-4 py-2">LeanData, on Customer''s approval</td>
      </tr>
      <tr>
        <td class="border border-gray-300 px-4 py-2 font-medium">Hypercare</td>
        <td class="border border-gray-300 px-4 py-2">
          <ul class="list-disc list-inside space-y-1">
            <li>Monitor and troubleshoot issues</li>
            <li>Creation of offboarding documents</li>
            <li>Hand over to Customer Success</li>
          </ul>
        </td>
        <td class="border border-gray-300 px-4 py-2">
          <ul class="list-disc list-inside space-y-1">
            <li>Project wrap-up presentation</li>
            <li>Introduction call to Customer Success</li>
          </ul>
        </td>
        <td class="border border-gray-300 px-4 py-2">LeanData</td>
      </tr>
      <tr>
        <td class="border border-gray-300 px-4 py-2 font-medium">Training</td>
        <td class="border border-gray-300 px-4 py-2">
          <ul class="list-disc list-inside space-y-1">
            <li>LD Admin Training</li>
            <li>Share standard training documents</li>
          </ul>
        </td>
        <td class="border border-gray-300 px-4 py-2">
          <ul class="list-disc list-inside space-y-1">
            <li>Training materials and documentation</li>
          </ul>
        </td>
        <td class="border border-gray-300 px-4 py-2">LeanData</td>
      </tr>
    </tbody>
  </table>
</div>', 3, 'Project phases, activities, and artifacts table showing the LeanData Delivery Methodology Lite (LDM-Lite) approach')
ON CONFLICT (section_name) DO NOTHING;

-- 14. Add trigger for updated_at on sow_content_templates
CREATE TRIGGER update_sow_content_templates_updated_at BEFORE UPDATE ON sow_content_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. Create indexes
CREATE INDEX IF NOT EXISTS idx_sow_content_templates_is_active ON sow_content_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_sow_content_templates_sort_order ON sow_content_templates(sort_order);

-- 16. Enable RLS on sow_content_templates
ALTER TABLE sow_content_templates ENABLE ROW LEVEL SECURITY;

-- 17. Create admin policies
CREATE POLICY "Admin access to content templates" ON sow_content_templates FOR ALL USING (true);

-- 18. Verify the changes
SELECT 'Migration completed successfully!' as status; 