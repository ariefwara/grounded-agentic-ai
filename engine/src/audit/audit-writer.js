export function createAuditTrail() {
  const events = [];

  return {
    record(event) {
      events.push(event);
    },
    entries() {
      return [...events];
    },
  };
}
