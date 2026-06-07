export function createSessionStore() {
  const sessions = new Map();

  return {
    load(sessionId) {
      const existing = sessions.get(sessionId);
      if (existing) return clone(existing);

      const session = {
        id: sessionId,
        turns: [],
        pending: null,
        collectedSlots: {},
        customerContext: null,
        verification: null,
      };
      sessions.set(sessionId, session);
      return clone(session);
    },

    save(session) {
      sessions.set(session.id, clone(session));
      return clone(session);
    },

    clear(sessionId) {
      sessions.delete(sessionId);
    },
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
