// Wellness app, not a medical device (CLAUDE.md rule 2). Used by tests on every user-facing text.
export const FORBIDDEN_WORDS: RegExp[] = [
  /\btreat/i,
  /\bcure/i,
  /\bheal(s|ed|ing)?\b/i, // not "health"
  /\btherap/i,
  /\brehab/i,
  /\bdiagnos/i,
  /\bprescri/i,
  /\barthritis/i,
  /\btratamiento/i,
  /\btratar\b/i,
  /\bcurar/i,
  /\bsanar/i,
  /\bterapia/i,
  /\brehabilita/i,
  /\bdiagn[oó]stic/i,
  /\brecetar/i,
  /\bartritis/i,
];
