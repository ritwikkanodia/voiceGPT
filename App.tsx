import React, { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { ElevenLabsProvider } from "@elevenlabs/react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import AuthScreen from "./screens/AuthScreen";
import ConversationScreen from "./screens/ConversationScreen";
import {
  getGoogleNativeRedirectUri,
  googleIosClientId,
  googleWebClientId,
} from "./utils/googleAuth";
import {
  saveAuthSession,
  getAuthSession,
  clearAuthSession,
  UserInfo,
} from "./utils/auth";

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Use the Google provider's auth code + PKCE flow for sign-in.
  // On native, Expo will exchange the one-time code for tokens automatically.
  const redirectUri = getGoogleNativeRedirectUri();

  const [request, authResponse, promptAsync] = Google.useAuthRequest({
    iosClientId: googleIosClientId,
    webClientId: googleWebClientId,
    scopes: ["openid", "profile", "email"],
    responseType: "code",
    usePKCE: true,
    shouldAutoExchangeCode: true,
    redirectUri,
  });
  console.log("[Auth] redirect URI:", request?.redirectUri);

  // TODO: Remove this debug alert after fixing release OAuth
  useEffect(() => {
    Alert.alert("Debug OAuth", `iOS: ${googleIosClientId}\nWeb: ${googleWebClientId}\nAPI: ${process.env.EXPO_PUBLIC_API_URL}`);
  }, []);

  // Restore persisted session on launch
  useEffect(() => {
    getAuthSession().then((session) => {
      if (session) setUser(session.user);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    const authResult =
      authResponse && "params" in authResponse ? authResponse : null;

    console.log("[Auth] authResponse changed:", {
      type: authResponse?.type,
      hasCode: Boolean(authResult?.params?.code),
      hasIdToken: Boolean(
        authResult?.authentication?.idToken ?? authResult?.params?.id_token
      ),
    });

    console.log("[Auth] full authResponse:", JSON.stringify(authResponse));

    if (authResult?.type === "success") {
      const idToken =
        authResult.authentication?.idToken ?? authResult.params?.id_token;
      if (!idToken) {
        console.error("[Auth] Missing id_token in Expo auth response");
        return;
      }

      fetch(`${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000"}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.detail ?? "Google sign-in failed");
          }
          return data;
        })
        .then(async (data) => {
          if (data?.access_token && data?.user) {
            const userInfo: UserInfo = {
              email: data.user.email,
              name: data.user.name,
              picture: data.user.picture,
            };
            await saveAuthSession(data.access_token, userInfo);
            setUser(userInfo);
          }
        })
        .catch(console.error);
    }
  }, [authResponse]);

  const handleSignOut = useCallback(async () => {
    if (user) {
      await clearAuthSession(user.email);
    }
    setUser(null);
  }, [user]);

  if (authLoading) return null;

  if (!user) {
    return (
      <AuthScreen
        onSignIn={() => promptAsync()}
        isLoading={false}
        disabled={!request}
      />
    );
  }

  return (
    <ElevenLabsProvider>
      <ConversationScreen user={user} onSignOut={handleSignOut} />
    </ElevenLabsProvider>
  );
}
