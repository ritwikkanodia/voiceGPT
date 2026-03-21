import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  TextInput,
} from "react-native";
import { useConversation } from "@elevenlabs/react-native";
import type {
  ConversationStatus,
  ConversationEvent,
  Role,
} from "@elevenlabs/react-native";
import { getBatteryLevel, changeBrightness, flashScreen } from "../utils/tools";
import * as Google from "expo-auth-session/providers/google";
import { searchEmails, readEmail, sendEmail } from "../utils/gmailTools";
import { UserInfo } from "../utils/auth";
import { apiFetch } from "../utils/api";

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
      getBatteryLevel,
      changeBrightness,
      flashScreen,
      searchEmails,
      readEmail,
      sendEmail,
    },
    onConnect: ({ conversationId }: { conversationId: string }) => {
      console.log("Connected to conversation", conversationId);
    },
    onDisconnect: (details: string) => {
      console.log("Disconnected from conversation", details);
    },
    onError: (message: string, context?: Record<string, unknown>) => {
      console.error("Conversation error:", message, context);
    },
    onMessage: ({
      message,
      source,
    }: {
      message: ConversationEvent;
      source: Role;
    }) => {
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
  const [textInput, setTextInput] = useState("");
  const [gmailConnected, setGmailConnected] = useState(false);

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
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      scopes: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
      ],
      responseType: "code",
      usePKCE: true,
      redirectUri:
        "com.googleusercontent.apps.832782936129-83o63anvsep236nkof1p1mg1ve8um0vj:/oauthredirect",
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

  // No auto-start — user clicks the button to begin

  const handleSubmitText = () => {
    if (textInput.trim()) {
      conversation.sendUserMessage(textInput.trim());
      setTextInput("");
      Keyboard.dismiss();
    }
  };

  const startConversation = async () => {
    if (isStarting) return;

    setIsStarting(true);
    try {
      await conversation.startSession({
        agentId: process.env.EXPO_PUBLIC_AGENT_ID,
        dynamicVariables: {
          platform: Platform.OS,
        },
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const endConversation = async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error("Failed to end conversation:", error);
    }
  };

  const getStatusColor = (status: ConversationStatus): string => {
    switch (status) {
      case "connected":
        return "#10B981";
      case "connecting":
        return "#F59E0B";
      case "disconnected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (status: ConversationStatus): string => {
    return status[0].toUpperCase() + status.slice(1);
  };

  const isConnecting = conversation.status === "connecting";
  const canEnd = conversation.status === "connected";

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.container}>
        <Text style={styles.title}>ElevenLabs React Native Example</Text>
        <Text style={styles.subtitle}>
          Remember to set the agentId in the .env file!
        </Text>

        {/* User Info & Sign Out */}
        <View style={styles.userRow}>
          <Text style={styles.userEmail}>{user.email}</Text>
          <TouchableOpacity onPress={onSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Gmail Connect Button — hidden for now
        <TouchableOpacity
          style={[
            styles.button,
            gmailConnected ? styles.googleSignedInButton : styles.googleButton,
          ]}
          onPress={() => {
            if (!gmailConnected) gmailPromptAsync();
          }}
          disabled={!gmailRequest || gmailConnected}
        >
          <Text style={styles.buttonText}>
            {gmailConnected ? "Gmail Connected" : "Connect Gmail"}
          </Text>
        </TouchableOpacity>
        */}

        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(conversation.status) },
            ]}
          />
          <Text style={styles.statusText}>
            {getStatusText(conversation.status)}
          </Text>
        </View>

        {/* Speaking Indicator */}
        {conversation.status === "connected" && (
          <View style={styles.speakingContainer}>
            <View
              style={[
                styles.speakingDot,
                {
                  backgroundColor: conversation.isSpeaking
                    ? "#8B5CF6"
                    : "#D1D5DB",
                },
              ]}
            />
            <Text
              style={[
                styles.speakingText,
                { color: conversation.isSpeaking ? "#8B5CF6" : "#9CA3AF" },
              ]}
            >
              {conversation.isSpeaking ? "AI Speaking" : "AI Listening"}
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {canEnd ? (
            <TouchableOpacity
              style={[styles.button, styles.endButton]}
              onPress={endConversation}
            >
              <Text style={styles.buttonText}>End Conversation</Text>
            </TouchableOpacity>
          ) : isConnecting ? (
            <TouchableOpacity
              style={[styles.button, styles.connectingButton]}
              disabled
            >
              <Text style={styles.buttonText}>Connecting...</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.startButton]}
              onPress={startConversation}
              disabled={isStarting}
            >
              <Text style={styles.buttonText}>
                {isStarting ? "Starting..." : "Start Conversation"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Feedback Buttons */}
        {conversation.status === "connected" &&
          conversation.canSendFeedback && (
            <View style={styles.feedbackContainer}>
              <Text style={styles.feedbackLabel}>How was that response?</Text>
              <View style={styles.feedbackButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.likeButton]}
                  onPress={() => conversation.sendFeedback(true)}
                >
                  <Text style={styles.buttonText}>Like</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.dislikeButton]}
                  onPress={() => conversation.sendFeedback(false)}
                >
                  <Text style={styles.buttonText}>Dislike</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        {/* Text Input and Messaging */}
        {conversation.status === "connected" && (
          <View style={styles.messagingContainer}>
            <Text style={styles.messagingLabel}>Send Text Message</Text>
            <TextInput
              style={styles.textInput}
              value={textInput}
              onChangeText={(text) => {
                setTextInput(text);
                if (text.length > 0) {
                  conversation.sendUserActivity();
                }
              }}
              placeholder="Type your message or context... (Press Enter to send)"
              multiline
              onSubmitEditing={handleSubmitText}
              returnKeyType="send"
              blurOnSubmit={true}
            />
            <View style={styles.messageButtons}>
              <TouchableOpacity
                style={[styles.button, styles.messageButton]}
                onPress={handleSubmitText}
                disabled={!textInput.trim()}
              >
                <Text style={styles.buttonText}>Send Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.contextButton]}
                onPress={() => {
                  if (textInput.trim()) {
                    conversation.sendContextualUpdate(textInput.trim());
                    setTextInput("");
                    Keyboard.dismiss();
                  }
                }}
                disabled={!textInput.trim()}
              >
                <Text style={styles.buttonText}>Send Context</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111827",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#F9FAFB",
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#D1D5DB",
  },
  speakingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  speakingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  speakingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
  },
  button: {
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: "center",
  },
  startButton: {
    backgroundColor: "#10B981",
  },
  endButton: {
    backgroundColor: "#EF4444",
  },
  connectingButton: {
    backgroundColor: "#F59E0B",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  feedbackContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#D1D5DB",
    marginBottom: 12,
  },
  feedbackButtons: {
    flexDirection: "row",
    gap: 16,
  },
  likeButton: {
    backgroundColor: "#10B981",
  },
  dislikeButton: {
    backgroundColor: "#EF4444",
  },
  messagingContainer: {
    marginTop: 24,
    width: "100%",
  },
  messagingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#D1D5DB",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#1F2937",
    borderRadius: 8,
    padding: 16,
    minHeight: 100,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#374151",
    color: "#F9FAFB",
    marginBottom: 16,
  },
  messageButtons: {
    flexDirection: "row",
    gap: 16,
  },
  messageButton: {
    backgroundColor: "#3B82F6",
    flex: 1,
  },
  contextButton: {
    backgroundColor: "#4F46E5",
    flex: 1,
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  userEmail: {
    fontSize: 14,
    color: "#D1D5DB",
    fontWeight: "500",
  },
  signOutText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
  },
  googleButton: {
    backgroundColor: "#4285F4",
    marginBottom: 16,
    width: "100%",
  },
  googleSignedInButton: {
    backgroundColor: "#10B981",
    marginBottom: 16,
    width: "100%",
  },
});
