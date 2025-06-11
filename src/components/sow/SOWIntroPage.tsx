export default function SOWIntroPage({ clientName }: { clientName: string }) {
  return (
    <div className="prose max-w-none text-left">
      <p className="mb-4">
        THIS STATEMENT OF WORK (“SOW”), is entered into by {clientName}, (“Customer”) and LeanData, Inc., (“LeanData”) effective as of the date of the last signature above (“SOW Effective Date”) and is hereby incorporated by reference into that certain Master Subscription and Professional Services Agreement or other agreement between the Customer and LeanData (“Agreement”).  To the extent there are any inconsistencies between or among the Agreement and this SOW, including all Exhibits to this SOW, such inconsistencies shall be resolved in accordance with the following order of precedence: (i) this SOW, (ii) any Exhibits to this SOW, and (iii), the Agreement.
      </p>
      <p>
        LeanData will perform the professional services described in this SOW, which may include consultation, configuration, integration, project management and training (collectively, the “Professional Services”).  LeanData will not start performing such Professional Services under this SOW until both Parties sign this SOW and the Agreement.  This SOW and the Agreement constitute the Parties’ complete agreement regarding the Professional Services and other matters addressed in this SOW.  
      </p>
    </div>
  );
} 