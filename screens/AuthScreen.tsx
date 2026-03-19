import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

interface AuthScreenProps {
  onSignIn: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export default function AuthScreen({
  onSignIn,
  isLoading,
  disabled,
}: AuthScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>VoiceGPT</Text>
        <Text style={styles.subtitle}>
          Sign in to start your AI conversation
        </Text>

        <TouchableOpacity
          style={[styles.googleButton, disabled && styles.disabledButton]}
          onPress={onSignIn}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in with Google</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 48,
    textAlign: "center",
  },
  googleButton: {
    backgroundColor: "#4285F4",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
