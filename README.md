# StudyFlow V1

StudyFlow is a study workspace for planning sessions, tracking academic goals, and reviewing material. V1 is a browser app built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- Schedule study sessions, manage tasks and goals, and track progress by subject.
- Run focus sessions with a floating timer.
- Organize notes, review flashcards with spaced repetition, and take practice quizzes.
- Track exams and review study activity through dashboards and analytics.
- Customize the workspace with themes, accent colors, and display density.
- Chat with Pip using planner context, selected notes, and attached screenshots.

V1 opens with sample data, and workspace edits reset when the page reloads. The planner, timer, and other study tools work without an API key.

## Run locally

Install Bun and Node.js 22.12 or newer.

```sh
bun install --frozen-lockfile
bun run dev
```

Open [localhost:3000](http://localhost:3000).

## Windows desktop development

The desktop shell uses Tauri and bundles the existing StudyFlow frontend.
On Windows, install the stable Rust MSVC toolchain, Microsoft C++ Build Tools, and Edge WebView2 alongside the web development prerequisites.

```sh
bun install --frozen-lockfile
bun run tauri dev
bun run tauri build --target x86_64-pc-windows-msvc -- --locked
```

The Windows setup executable is written to `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`.
This first desktop milestone uses the sample workspace. Persistent study data, legacy backup import, and Pip in the packaged app are tracked for later migration milestones. Pip is available through the localhost development server.

## Pip study assistant

Open the floating pet or the AI Assistant screen. In **Settings → AI Usage**, choose OpenAI, Gemini, or Claude and enter your own provider API key. The suggested models support images. If you enter a different model, check that it accepts image input before attaching a screenshot.

- The assistant runs through the local server started by `bun run dev` or `bun run preview`. Open the displayed localhost address. Static hosting of `dist/` serves the study workspace without the chat backend.
- Keys and chat sessions stay in memory and reset when you reload. Provider preferences and reported token totals stay in this browser. Messages, any enabled workspace excerpt, and images you send are passed to your chosen provider.
- Preview or turn off workspace context before sending. Paste or attach a PNG, JPEG, or WebP. Choose **Fine text** before attaching a screenshot with small print. Use **Reuse image** if a follow-up needs the image again.
- The daily budget uses a pre-send estimate. **AI Usage** shows reported counts when available. Stopped or failed requests may still count on your provider account even if StudyFlow receives no final usage report.

## Build and test

```sh
bun run build
bun run lint
node --import tsx --test src/utils/studyLogic.test.ts server/studyAssistant.test.ts
```

The production build goes to `dist/`. Run `bun run preview` to try it locally.
