/**
 * Map an ApprovalWorkflowService error message to the HTTP status the
 * approvals route should return. Unrecognised errors stay 500.
 */
export function approvalErrorStatus(error: string | undefined): number {
  const message = (error || '').toLowerCase();
  if (message.includes('permission')) return 403;
  if (message.includes('not found')) return 404;
  if (
    message.includes('not in review') ||
    message.includes('already') ||
    message.includes('no longer pending')
  ) {
    return 409;
  }
  if (message.includes('required')) return 400;
  return 500;
}
