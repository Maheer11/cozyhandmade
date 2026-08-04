// Single source of truth for "is this person an administrator".
//
// This was previously eight byte-identical copies of the same check, one per
// admin route plus the admin layout. That duplication is the reason this
// module exists: widening an authorisation rule across eight hand-copied
// call sites is exactly the situation where seven get updated and the
// eighth quietly keeps the old behaviour.
//
// DO NOT confuse ADMIN_EMAILS with ORDER_NOTIFICATION_EMAILS. This one
// grants full dashboard access — create/delete products, edit prices,
// change order statuses, moderate reviews. The other only decides who
// receives a new-order alert. Adding an address here gives that person
// control of the shop; adding it there does not.

/**
 * Parses a comma-separated allowlist.
 *
 * Addresses are lowercased because identity providers treat mailboxes
 * case-insensitively in practice — without this, someone signing in as
 * `Maryam@example.com` would be denied access granted to
 * `maryam@example.com`, which reads as a broken login rather than a
 * configuration problem.
 */
export function parseAdminEmails(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const address = part.trim().toLowerCase();
    if (address) seen.add(address);
  }
  return [...seen];
}

/**
 * True only for an address on the allowlist.
 *
 * Reads ADMIN_EMAILS (comma-separated), falling back to the older
 * single-valued ADMIN_EMAIL so nothing changes until the new variable is
 * set.
 *
 * Fails CLOSED in every ambiguous case: no email, blank email, or no
 * allowlist configured at all all return false. An unconfigured deployment
 * must lock everyone out, never let everyone in — note that without the
 * explicit empty-list check, an undefined env var and an undefined email
 * would otherwise compare equal.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  const candidate = email?.trim().toLowerCase();
  if (!candidate) return false;

  const allowed = parseAdminEmails(process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL);
  if (allowed.length === 0) return false;

  return allowed.includes(candidate);
}
