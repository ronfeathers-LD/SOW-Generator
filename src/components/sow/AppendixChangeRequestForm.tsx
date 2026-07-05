const DETAIL_ROWS = ['Project Name', 'Change Requestor', 'Change Number', 'Associated PO'];

const CHANGE_CATEGORIES = ['Schedule', 'Cost', 'Scope', 'Testing (Quality)', 'Resources', 'Artifacts'];

const SIGNATURE_FIELDS = ['Name', 'Title', 'Signature', 'Date'];

/**
 * Static, intentionally-blank "Appendix A: Change Request Form".
 *
 * Mirrors the layout of the change-order document (see
 * `pdf-generator.ts` `generateChangeOrderHTML` details table / category
 * checkboxes / reason & description boxes / signature blocks) but renders
 * as a blank form — filled out by hand or at change-order time, not from
 * SOW data. Shared between SOWPrintView and SOWFullView; the PDF generator
 * has its own hand-written HTML mirror of this markup.
 */
export default function AppendixChangeRequestForm() {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Appendix A: Change Request Form</h2>

      <p className="mb-6 text-gray-800">
        Changes to this SOW are managed via the following form. A completed and signed change
        request is required before work on any change begins.
      </p>

      <table className="w-full mb-8 border-collapse">
        <tbody>
          {DETAIL_ROWS.map((label) => (
            <tr key={label}>
              <td className="w-48 align-top py-2 pr-4 border-b border-gray-300 font-semibold text-gray-700">
                {label}
              </td>
              <td className="py-2 border-b border-gray-300">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mb-8">
        <h3 className="text-base font-semibold mb-3 text-gray-900">
          Change Category (Select all that apply):
        </h3>
        <div className="flex flex-wrap gap-3">
          {CHANGE_CATEGORIES.map((category) => (
            <span
              key={category}
              className="inline-flex items-center gap-2 rounded border border-gray-400 px-3 py-1.5 text-sm text-gray-800"
            >
              <span aria-hidden="true">&#9744;</span>
              {category}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-base font-semibold mb-2 text-gray-900">Reason for Change</h3>
        <div className="min-h-[80px] rounded border border-gray-400 p-3" />
      </div>

      <div className="mb-10">
        <h3 className="text-base font-semibold mb-2 text-gray-900">Change Description</h3>
        <div className="min-h-[140px] rounded border border-gray-400 p-3" />
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        {(['Customer', 'LeanData'] as const).map((party) => (
          <div key={party}>
            <h3 className="text-base font-semibold mb-4 text-gray-900">{party}</h3>
            {SIGNATURE_FIELDS.map((field) => (
              <div key={field} className="mb-4">
                <div className="text-xs font-semibold text-gray-600 mb-1">{field}</div>
                <div className="h-6 border-b border-gray-400" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
