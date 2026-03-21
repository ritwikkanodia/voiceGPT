# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VoiceGPT is a React Native Expo app that provides voice-based AI conversations using the ElevenLabs Conversational AI SDK. Users authenticate via Google OAuth, then interact with an ElevenLabs agent through voice or text. The app also integrates with Gmail (search, read, send) via a separate backend API.

**This repo is the mobile frontend only.** The backend (FastAPI) lives in a separate repository.

## Commands

```bash
# Install dependencies
npm install

# Prebuild native projects (required after adding native deps)
npx expo prebuild

# Start Expo dev server (use tunnel for device testing)
npx expo start --tunnel

# Run on device/simulator
npx expo run:ios --device
npx expo run:android

# iOS pods (if needed after prebuild)
cd ios && pod install
```

**Cannot run in Expo Go** — WebRTC native dependencies require a development build.

## Architecture

- **`App.tsx`** — Root component. Handles Google OAuth sign-in flow (PKCE + auth code exchange with backend), session persistence, and renders either `AuthScreen` or `ConversationScreen`.
- **`screens/AuthScreen.tsx`** — Simple sign-in UI with Google button.
- **`screens/ConversationScreen.tsx`** — Main screen. Manages the ElevenLabs conversation session (`useConversation` hook), registers client tools, handles Gmail OAuth connection, and provides voice/text interaction UI.
- **`utils/auth.ts`** — Multi-account session management using `expo-secure-store`. Stores JWT and user info per account.
- **`utils/api.ts`** — `apiFetch` wrapper that prepends `EXPO_PUBLIC_API_URL`, attaches JWT Bearer token, and handles 401 (clears token).
- **`utils/tools.ts`** — Device client tools (battery level, brightness, screen flash) registered with ElevenLabs agent.
- **`utils/gmailTools.ts`** — Gmail client tools (search, read, send) that call the backend API via `apiFetch`.

## Key Integration Points

- **ElevenLabs SDK**: `@elevenlabs/react-native` with `useConversation` hook. Agent ID configured via `EXPO_PUBLIC_AGENT_ID` env var. Client tools are registered in `ConversationScreen`.
- **Google Auth**: Two separate OAuth flows — one for app sign-in (openid/profile/email scopes) in `App.tsx`, another for Gmail access (gmail scopes) in `ConversationScreen.tsx`. Both use `expo-auth-session` with PKCE.
- **Backend API**: Base URL from `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:8000`). Auth tokens exchanged at `/auth/google`, Gmail endpoints at `/gmail/*` and `/auth/gmail/*`.

## Environment Variables

Set in `.env` (not committed):
- `EXPO_PUBLIC_AGENT_ID` — ElevenLabs agent ID
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — Google OAuth iOS client ID
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — Google OAuth web client ID
- `EXPO_PUBLIC_API_URL` — Backend API base URL
