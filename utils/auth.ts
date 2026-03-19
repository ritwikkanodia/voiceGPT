import * as SecureStore from "expo-secure-store";
import { setJwt, clearJwt } from "./api";

const ACTIVE_USER_KEY = "auth_active_user";
const ACCOUNTS_KEY = "auth_accounts";

export interface UserInfo {
  email: string;
  name: string;
  picture?: string;
}

function userKey(email: string, suffix: string): string {
  const sanitized = email.replace(/[^a-zA-Z0-9]/g, "_");
  return `auth_${sanitized}_${suffix}`;
}

/**
 * Save a backend JWT + user info after successful auth.
 */
export async function saveAuthSession(
  jwt: string,
  user: UserInfo
): Promise<void> {
  await setJwt(jwt);
  await SecureStore.setItemAsync(
    userKey(user.email, "user"),
    JSON.stringify(user)
  );
  await SecureStore.setItemAsync(ACTIVE_USER_KEY, user.email);
  await addToAccountList(user.email);
}

export async function getAuthSession(): Promise<{
  user: UserInfo;
} | null> {
  const activeEmail = await SecureStore.getItemAsync(ACTIVE_USER_KEY);
  if (!activeEmail) return null;

  const userJson = await SecureStore.getItemAsync(
    userKey(activeEmail, "user")
  );
  if (!userJson) return null;
  try {
    return { user: JSON.parse(userJson) };
  } catch {
    return null;
  }
}

export async function clearAuthSession(email: string): Promise<void> {
  await SecureStore.deleteItemAsync(userKey(email, "user"));
  await clearJwt();
  await removeFromAccountList(email);

  const activeEmail = await SecureStore.getItemAsync(ACTIVE_USER_KEY);
  if (activeEmail === email) {
    const remaining = await getAccountList();
    if (remaining.length > 0) {
      await SecureStore.setItemAsync(ACTIVE_USER_KEY, remaining[0]);
    } else {
      await SecureStore.deleteItemAsync(ACTIVE_USER_KEY);
    }
  }
}

export async function getAccountList(): Promise<string[]> {
  const json = await SecureStore.getItemAsync(ACCOUNTS_KEY);
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

async function addToAccountList(email: string): Promise<void> {
  const accounts = await getAccountList();
  if (!accounts.includes(email)) {
    accounts.push(email);
    await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
}

async function removeFromAccountList(email: string): Promise<void> {
  const accounts = await getAccountList();
  const filtered = accounts.filter((e) => e !== email);
  await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(filtered));
}
