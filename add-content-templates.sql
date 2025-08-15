-- Create the sow_content_templates table
CREATE TABLE IF NOT EXISTS sow_content_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_name TEXT NOT NULL UNIQUE,
  default_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default content templates
INSERT INTO sow_content_templates (section_name, default_content, sort_order) VALUES
('intro', '<p>This Statement of Work (SOW) outlines the scope, objectives, and deliverables for the project described herein. This document serves as a formal agreement between the parties involved and establishes the framework for successful project execution.</p>', 1),
('scope', '<p>The project scope encompasses all activities, deliverables, and milestones required to achieve the stated objectives. This includes but is not limited to planning, development, testing, deployment, and knowledge transfer activities.</p>', 2),
('out-of-scope', '<p>The following activities and deliverables are considered out-of-scope for this project: [INSERT OUT-OF-SCOPE ITEMS AS APPROPRIATE]</p>', 3),
('objectives-disclosure', '<p>The primary objectives of this project are to deliver the specified solution within the agreed timeline and budget while meeting all quality standards and requirements. Success will be measured by the achievement of these objectives and client satisfaction.</p>', 4),
('assumptions', '<p>This project is based on several key assumptions including timely client feedback, availability of necessary resources, and adherence to the agreed project schedule. Any changes to these assumptions may impact project timeline, scope, or cost.</p>', 5),
('project-phases', '<p>The project will be executed in distinct phases, each with specific deliverables and milestones. Regular progress reviews and client checkpoints will ensure alignment and provide opportunities for feedback and adjustments as needed.</p>', 6),
('roles', '<p>Clear roles and responsibilities have been defined for all project participants. Each team member will be accountable for their assigned tasks and deliverables, with regular communication and coordination to ensure project success.</p>', 7);

-- Create an index on section_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_sow_content_templates_section_name ON sow_content_templates(section_name);

-- Create an index on is_active for filtering active templates
CREATE INDEX IF NOT EXISTS idx_sow_content_templates_is_active ON sow_content_templates(is_active);
