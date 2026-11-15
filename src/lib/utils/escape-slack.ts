/**
 * Escape the characters Slack treats as control sequences in mrkdwn
 * (<!channel>, <@U123>, <url|label>), per Slack's formatting docs.
 */
export function escapeSlackText(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
