type EventPayload = Record<string, unknown>;

/**
 * Lightweight event recorder placeholder.
 *
 * The controllers call this helper for audit-style tracking, but the backend
 * currently does not have a persistent event log collection wired up. Keeping
 * this helper in place prevents runtime module resolution failures while
 * preserving the call sites.
 */
export const recordEvent = async (
  eventName: string,
  payload: EventPayload = {},
  actorType: string = "user"
): Promise<void> => {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[event]", eventName, actorType, payload);
  }
};

