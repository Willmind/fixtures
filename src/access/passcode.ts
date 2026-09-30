// This is a convenience gate for a personal static site, not server authentication.
export const passwordGateEnabled = false;

const passcodeDigest =
  "ee1d5acbd8e9a943c29367939413ee6d611f4bb58e394f1c39ae40a004c5ffc8";
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
