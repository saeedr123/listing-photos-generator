// Whether new accounts can be created. Server only.
//
// LPG_SIGNUP=closed turns sign up off, for a deployment that only its owner
// uses (decided 2026-11-18: personal use, not sold). Existing accounts,
// including the first admin from LPG_SEED_ADMIN_*, still sign in. Any other
// value, or none, leaves sign up open, as before.

export function signupOpen(): boolean {
  return (process.env.LPG_SIGNUP ?? "").trim().toLowerCase() !== "closed";
}
