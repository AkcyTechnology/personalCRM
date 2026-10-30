/**
 * Remembers who you just connected with so the Universe can make their star
 * glow once the next time it is shown. In memory only.
 */
let pending: { id: string; at: number } | null = null;

export function markGlow(contactId: string) {
  pending = { id: contactId, at: Date.now() };
}

/** Returns the contact to glow (once), if it was logged in the last 10 minutes. */
export function consumeGlow(): string | null {
  const p = pending;
  pending = null;
  return p && Date.now() - p.at < 10 * 60_000 ? p.id : null;
}
