export default function SOWScopePage({ deliverables, projectDescription }: { deliverables: string[]; projectDescription: string }) {
  return (
    <div className="prose max-w-none text-left">
      {/* Project Description */}
      {projectDescription && (
        <div className="mb-6">
          <p className="text-gray-700">{projectDescription}</p>
        </div>
      )}
      
      <p className="mb-4">
        The customer has implemented LeanData and seeks to augment their team with LeanData expertise through Expert Services provided by the LeanData Professional Services team. As part of Expert Services, LeanData personnel as requested in the table below will assist the customer with one or more of the following:
      </p>
      <div className="space-y-4 mb-4">
        {deliverables.map((deliverable, index) => (
          <div key={index} className="prose-p:mb-4">
            <div dangerouslySetInnerHTML={{ __html: deliverable }} />
          </div>
        ))}
      </div>
      <p>
        Customer is designated to have the primary responsibility for activities, successful and timely completion depends on participation by, and key content from, Customer's subject matter experts, as well as decisions and approvals from Customer's leadership team.
      </p>
    </div>
  );
} 