import * as AuthSession from "expo-auth-session";

const GOOGLE_CLIENT_ID_SUFFIX = ".apps.googleusercontent.com";

export const googleIosClientId =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
export const googleWebClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

function getGoogleIosClientIdPrefix() {
  if (!googleIosClientId) return "";

  return googleIosClientId.endsWith(GOOGLE_CLIENT_ID_SUFFIX)
    ? googleIosClientId.slice(0, -GOOGLE_CLIENT_ID_SUFFIX.length)
    : googleIosClientId;
}

export function getGoogleNativeRedirectUri() {
  const iosClientIdPrefix = getGoogleIosClientIdPrefix();

  if (!iosClientIdPrefix) {
    return AuthSession.makeRedirectUri();
  }

  return AuthSession.makeRedirectUri({
    native: `com.googleusercontent.apps.${iosClientIdPrefix}:/oauthredirect`,
  });
}
