import { escapeSlackText } from './utils/escape-slack';

/**
 * "New SOW Submitted for Review" channel message. Client and submitter names
 * come from CRM/user input, so they are escaped; the mrkdwn, emoji and link
 * syntax around them is ours. `signerWarningLine` is pre-built, trusted text.
 */
export function buildSowSubmittedMessage(params: {
  clientName: string;
  submitterName: string;
  approvalsNeeded: string;
  signerWarningLine: string;
  sowUrl: string;
}): string {
  return (
    `:memo: *New SOW Submitted for Review*\n\n` +
    `*Client:* ${escapeSlackText(params.clientName)}\n` +
    `*Submitted by:* ${escapeSlackText(params.submitterName)}\n` +
    `*Approvals needed:* ${params.approvalsNeeded}\n\n` +
    params.signerWarningLine +
    `:link: <${params.sowUrl}|Review SOW>\n\n` +
    `Please review and approve/reject this SOW when ready.`
  );
}
