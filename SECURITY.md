# Security and API key

## Gemini API key

- **Tauri app (desktop)**: The API key is read from the **Tauri process environment** only. Set `GEMINI_API_KEY` in your environment or in a `.env` file in the project root before running the app (e.g. `npm run tauri dev`). The key is never sent to the frontend bundle.
- **Browser / Vite-only build**: Vite inlines env vars at build time. Any value you set in `.env` or `.env.local` (e.g. `GEMINI_API_KEY`) is baked into the client bundle and is **public**. For production browser deployments, use a backend proxy that holds the key and forwards requests to Gemini.

## Setup

1. Copy `.env.example` to `.env.local` (or `.env` for local dev).
2. Set `GEMINI_API_KEY` to your Google AI API key.
3. If the key is missing, the app shows a clear message and AI features will fail with a descriptive error instead of an opaque SDK failure.

## Tauri

When running the Tauri desktop app, the Rust backend loads `.env` from the project root (if present) and reads `GEMINI_API_KEY` from the environment. The frontend calls Tauri commands (`is_gemini_configured`, `gemini_generate_content`); the key never leaves the backend.
