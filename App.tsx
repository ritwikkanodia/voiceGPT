import React, { useState, useEffect, useCallback } from "react";
import { ElevenLabsProvider } from "@elevenlabs/react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import AuthScreen from "./screens/AuthScreen";
import ConversationScreen from "./screens/ConversationScreen";
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

  // Use authorization code flow with PKCE for sign-in
  const [request, authResponse, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
    responseType: "code",
    usePKCE: true,
  });

  // Restore persisted session on launch
  useEffect(() => {
    getAuthSession().then((session) => {
      if (session) setUser(session.user);
      setAuthLoading(false);
    });
  }, []);

  // Handle auth response — send code to backend
  useEffect(() => {
    if (authResponse?.type === "success" && authResponse.params?.code) {
      const code = authResponse.params.code;
      const codeVerifier = request?.codeVerifier;
      if (!codeVerifier) return;

      fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000"}/auth/google`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, code_verifier: codeVerifier }),
        }
      )
        .then((res) => res.json())
        .then(async (data) => {
          if (data.access_token && data.user) {
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
