import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  SafeAreaView,
} from "react-native";
import { useConversation } from "@elevenlabs/react-native";
import type {
  ConversationStatus,
} from "@elevenlabs/react-native";
import * as Google from "expo-auth-session/providers/google";
import { UserInfo } from "../utils/auth";
import { apiFetch } from "../utils/api";
import {
  getGoogleNativeRedirectUri,
  googleIosClientId,
  googleWebClientId,
} from "../utils/googleAuth";

interface ConversationScreenProps {
  user: UserInfo;
  onSignOut: () => void;
}

export default function ConversationScreen({
  user,
  onSignOut,
}: ConversationScreenProps) {
  const conversation = useConversation({
    clientTools: {
    },
    onConnect: ({ conversationId }: { conversationId: string }) => {
      console.log("Connected to conversation", conversationId);
    },
    onDisconnect: (details) => {
      console.log("Disconnected from conversation", details);
    },
    onError: (message: string, context?: Record<string, unknown>) => {
      console.error("Conversation error:", message, context);
    },
    onMessage: ({ message, source }) => {
      console.log(`Message from ${source}:`, message);
    },
    onModeChange: ({ mode }: { mode: "speaking" | "listening" }) => {
      console.log(`Mode: ${mode}`);
    },
    onStatusChange: ({ status }: { status: ConversationStatus }) => {
      console.log(`Status: ${status}`);
    },
    onCanSendFeedbackChange: ({
      canSendFeedback,
    }: {
      canSendFeedback: boolean;
    }) => {
      console.log(`Can send feedback: ${canSendFeedback}`);
    },
  });

  const [isStarting, setIsStarting] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);

  // Pulse animation for the orb when AI is speaking
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (conversation.isSpeaking) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [conversation.isSpeaking]);

  // Check Gmail connection status on mount
  useEffect(() => {
    apiFetch("/auth/gmail/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.connected) setGmailConnected(true);
      })
      .catch(() => {});
  }, [user.email]);

  // Gmail OAuth — authorization code flow with PKCE
  const [gmailRequest, gmailResponse, gmailPromptAsync] =
    Google.useAuthRequest({
      iosClientId: googleIosClientId,
      webClientId: googleWebClientId,
      scopes: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
      ],
      responseType: "code",
      usePKCE: true,
      redirectUri: getGoogleNativeRedirectUri(),
    });

  useEffect(() => {
    if (gmailResponse?.type === "success" && gmailResponse.params?.code) {
      const code = gmailResponse.params.code;
      const codeVerifier = gmailRequest?.codeVerifier;
      if (!codeVerifier) return;

      apiFetch("/auth/gmail/connect", {
        method: "POST",
        body: JSON.stringify({ code, code_verifier: codeVerifier }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.connected) setGmailConnected(true);
        })
        .catch(console.error);
    }
  }, [gmailResponse]);

  const startConversation = async () => {
    if (isStarting) return;

    setIsStarting(true);
    console.log("[Conversation] Start button pressed");
    try {
      console.log("[Conversation] Fetching conversation token");
      const res = await apiFetch("/elevenlabs/conversation-token");
      const data = await res.json();
      console.log("[Conversation] Token response received", {
        hasToken: Boolean(data.token),
      });
      if (!data.token) {
        throw new Error("Failed to get conversation token");
      }

      console.log("[Conversation] Starting ElevenLabs session");
      await conversation.startSession({
        conversationToken: data.token,
        dynamicVariables: {
          platform: Platform.OS,
        },
      });
      console.log("[Conversation] ElevenLabs session started");
    } catch (error) {
      console.error("Failed to start conversation:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const endConversation = async () => {
    console.log("[Conversation] End button pressed");
    try {
      await conversation.endSession();
      console.log("[Conversation] ElevenLabs session ended");
    } catch (error) {
      console.error("Failed to end conversation:", error);
    }
  };

  const isConnecting = conversation.status === "connecting";
  const isConnected = conversation.status === "connected";
  const isDisconnected = conversation.status === "disconnected";

  const getOrbColor = () => {
    if (isConnecting) return "#F59E0B";
    if (isConnected && conversation.isSpeaking) return "#818CF8";
    if (isConnected) return "#6366F1";
    return "#374151";
  };

  const getOrbGlowColor = () => {
    if (isConnecting) return "rgba(245, 158, 11, 0.3)";
    if (isConnected && conversation.isSpeaking) return "rgba(129, 140, 248, 0.4)";
    if (isConnected) return "rgba(99, 102, 241, 0.25)";
    return "transparent";
  };

  const getStatusLabel = () => {
    if (isConnecting) return "Connecting...";
    if (isConnected && conversation.isSpeaking) return "Speaking";
    if (isConnected) return "Listening";
    return "Tap to start";
  };

  const handleOrbPress = () => {
    if (isDisconnected && !isStarting) {
      startConversation();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.appName}>VoiceGPT</Text>
          <TouchableOpacity onPress={onSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Center area with orb */}
        <View style={styles.centerArea}>
          <TouchableOpacity
            onPress={handleOrbPress}
            activeOpacity={isDisconnected ? 0.7 : 1}
            disabled={!isDisconnected || isStarting}
          >
            <View style={[styles.orbGlow, { backgroundColor: getOrbGlowColor() }]}>
              <Animated.View
                style={[
                  styles.orb,
                  {
                    backgroundColor: getOrbColor(),
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
            </View>
          </TouchableOpacity>

          <Text style={styles.statusLabel}>{getStatusLabel()}</Text>
        </View>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          {isConnected && (
            <TouchableOpacity
              style={styles.endButton}
              onPress={endConversation}
            >
              <Text style={styles.endButtonIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const ORB_SIZE = 180;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  appName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#E5E7EB",
  },
  signOutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  signOutText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  centerArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  orbGlow: {
    width: ORB_SIZE + 60,
    height: ORB_SIZE + 60,
    borderRadius: (ORB_SIZE + 60) / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
  },
  statusLabel: {
    marginTop: 32,
    fontSize: 16,
    color: "#9CA3AF",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  bottomBar: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
  },
  endButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
  },
  endButtonIcon: {
    fontSize: 20,
    color: "#EF4444",
    fontWeight: "bold",
  },
});
