-- Add Project Phases content template
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