// This is a convenience gate for a personal static site, not server authentication.
export const passwordGateEnabled = false;

const passcodeDigest =
  "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";
const sessionKey = "fixtures.access.v1";

export async function matchesPasscode(
  value: string,
  expected = passcodeDigest,
) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  const digest = Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return digest === expected;
}

export function readAccessSession(storage?: Pick<Storage, "getItem">) {
  try {
    return (storage ?? sessionStorage).getItem(sessionKey) === passcodeDigest;
  } catch {
    return false;
  }
}

export function saveAccessSession(
  allowed: boolean,
  storage?: Pick<Storage, "setItem" | "removeItem">,
) {
  try {
    const target = storage ?? sessionStorage;
    if (allowed) target.setItem(sessionKey, passcodeDigest);
    else target.removeItem(sessionKey);
  } catch {
    /* Storage can be unavailable in private browsing; the current view still works. */
  }
}
