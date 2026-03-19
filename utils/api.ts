import * as SecureStore from "expo-secure-store";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

const JWT_KEY = "backend_jwt";

export async function setJwt(token: string): Promise<void> {
  await SecureStore.setItemAsync(JWT_KEY, token);
}

export async function getJwt(): Promise<string | null> {
  return SecureStore.getItemAsync(JWT_KEY);
}

export async function clearJwt(): Promise<void> {
  await SecureStore.deleteItemAsync(JWT_KEY);
}

/**
 * Thin wrapper around fetch that:
 * - Prepends the backend base URL
 * - Attaches the JWT as a Bearer token
 * - Throws on non-2xx responses with the response body
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const jwt = await getJwt();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // Token expired or invalid — clear it so the app can re-auth
    await clearJwt();
  }

  return res;
}
