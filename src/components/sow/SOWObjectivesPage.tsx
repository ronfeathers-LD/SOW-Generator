export default function SOWObjectivesPage({ deliverables, keyObjectives }: { deliverables: string[]; keyObjectives: string[] }) {
  return (
    <div className="prose max-w-none text-left">
      {/* Key Objectives from table */}
      {keyObjectives && keyObjectives.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Key Objectives:</h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            {keyObjectives.map((objective, index) => (
              <li key={index}>{objective}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Scope from table */}
      <div className="mb-6">
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          {deliverables.map((deliverable, index) => (
            <li key={index}>{deliverable}</li>
          ))}
        </ul>
      </div>

      {/* First paragraph */}
      <p className="mb-4">
        Customers and LeanData's responsibilities for the project are described in this SOW. Where LeanData is designated to have the primary responsibility for certain activities, successful and timely completion depends on participation by, and key content from, Customer's subject matter experts, as well as decisions and approvals from Customer's leadership team and other assumptions set forth in this SOW. Likewise, where Customer has the primary responsibility for certain activities, LeanData will provide appropriate cooperation and input. Where the Parties are jointly responsible for certain activities, the Parties will collaborate in good faith to resolve issues in accordance with the relevant mutually agreed priorities and the other terms of this SOW.
      </p>

      {/* Second paragraph */}
      <p>
        A summary of scope assumptions, Customer's relevant use cases, and the Parties' respective responsibilities under this SOW appears below. LeanData has relied on this information in estimating the applicable fees, timeline, level of effort and resources required for the Professional Services under this SOW. This SOW is based on current assumptions and information currently known as of the SOW Effective Date. During the "Discovery" phase of the implementation, LeanData will gather additional detailed information about Customer's requirements and use cases, based upon which the scope of the implementation may change, resulting in a Post-Discovery Change Order mutually agreed by the Parties.
      </p>
    </div>
  );
} 