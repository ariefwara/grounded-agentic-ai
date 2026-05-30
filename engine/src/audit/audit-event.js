export function createAuditEvent({ gate, status, reasonCode = null, details = {}, ...extra }) {
  return {
    timestamp: new Date().toISOString(),
    gate,
    status,
    reasonCode,
    details,
    ...extra,
  };
}
