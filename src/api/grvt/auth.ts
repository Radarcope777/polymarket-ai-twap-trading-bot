export interface AuthSession {
  cookie: string;
  accountId: string;
  expiresAt: number;
}

export interface ApiKeyLoginResponse {
  account_id: string;
  expires_at?: string;
}

export async function loginWithApiKey(
  authUrl: string,
  apiKey: string,
): Promise<AuthSession> {
  const url = `${authUrl}/auth/api_key/login`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Grvt-Api-Key": apiKey,
    },
    body: JSON.stringify({ api_key: apiKey }),
  });

  const text = await response.text();
  let parsed: unknown;

  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`GRVT auth invalid JSON (${response.status}): ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    const err = parsed as { message?: string };
    const message = err.message ?? text.slice(0, 200);
    throw new Error(`GRVT auth failed ${response.status}: ${message ?? "unknown error"}`);
  }

  const data = parsed as ApiKeyLoginResponse;

  const setCookie = response.headers.get("set-cookie") ?? "";
  const cookieMatch = setCookie.match(/gravity=([^;]+)/);
  const cookie = cookieMatch ? `gravity=${cookieMatch[1]}` : setCookie.split(";")[0] ?? "";

  if (!cookie) {
    throw new Error("GRVT auth succeeded but no session cookie returned");
  }

  const accountId =
    response.headers.get("x-grvt-account-id") ??
    data.account_id ??
    "";

  if (!accountId) {
    throw new Error("GRVT auth succeeded but no account ID returned");
  }

  const expiresAt = data.expires_at
    ? Number.parseInt(data.expires_at, 10)
    : Date.now() + 24 * 60 * 60 * 1000;

  return { cookie, accountId, expiresAt };
}

export function isSessionValid(session: AuthSession | null): boolean {
  if (!session) return false;
  return Date.now() < session.expiresAt - 60_000;
}

export function buildAuthHeaders(
  session: AuthSession,
  accountId: string,
  tradingAccountId: string,
): Record<string, string> {
  return {
    Cookie: session.cookie,
    "X-Grvt-Account-Id": accountId,
    "X-Grvt-Trading-Account-Id": tradingAccountId,
  };
}
