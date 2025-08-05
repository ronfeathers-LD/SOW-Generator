-- Add roles and responsibilities content template
INSERT INTO sow_content_templates (section_name, section_title, default_content, sort_order, description) VALUES
  ('roles', 'Roles and Responsibilities Section', '<h2 class="text-2xl font-bold mb-6">ROLES AND RESPONSIBILITIES</h2>

<div class="mb-8">
  <h3 class="text-xl font-semibold mb-4">Customer Responsibilities</h3>
  <p class="mb-4">Customer is responsible for:</p>
  <ul class="list-disc pl-6 space-y-2">
    <li>Providing timely access to necessary systems and data</li>
    <li>Designating a primary point of contact for project coordination</li>
    <li>Participating in scheduled meetings and providing feedback</li>
    <li>Reviewing and approving deliverables within agreed timeframes</li>
    <li>Ensuring internal stakeholders are available for key project milestones</li>
    <li>Providing necessary documentation and business requirements</li>
  </ul>
</div>

<div class="mb-8">
  <h3 class="text-xl font-semibold mb-4">LeanData Responsibilities</h3>
  <p class="mb-4">LeanData is responsible for:</p>
  <ul class="list-disc pl-6 space-y-2">
    <li>Delivering professional services as outlined in this SOW</li>
    <li>Providing experienced consultants and project management</li>
    <li>Maintaining regular communication and status updates</li>
    <li>Ensuring deliverables meet quality standards</li>
    <li>Providing knowledge transfer and training as specified</li>
    <li>Escalating issues and risks in a timely manner</li>
  </ul>
</div>

<div class="mb-8">
  <h3 class="text-xl font-semibold mb-4">Project Team</h3>
  <p class="mb-4">The project team will consist of representatives from both Customer and LeanData as outlined in the Team & Roles section of this SOW.</p>
</div>', 6, 'Default roles and responsibilities text for all SOWs')
ON CONFLICT (section_name) DO NOTHING;

-- Add column to SOW table to track custom roles content
ALTER TABLE sows ADD COLUMN IF NOT EXISTS custom_roles_content TEXT;
ALTER TABLE sows ADD COLUMN IF NOT EXISTS roles_content_edited BOOLEAN DEFAULT false; 