-- Add objectives disclosure content column to sows table
ALTER TABLE sows 
ADD COLUMN custom_objectives_disclosure_content TEXT,
ADD COLUMN objectives_disclosure_content_edited BOOLEAN DEFAULT false;

-- Insert default objectives disclosure template
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
); 