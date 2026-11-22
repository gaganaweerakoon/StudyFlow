# StudyFlow V1

StudyFlow is a study workspace for planning sessions, tracking academic goals, and reviewing material. V1 is a browser app built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- Schedule study sessions, manage tasks and goals, and track progress by subject.
- Run focus sessions with a floating timer.
- Organize notes, review flashcards with spaced repetition, and take practice quizzes.
- Track exams and review study activity through dashboards and analytics.
- Customize the workspace with themes, accent colors, and display density.

V1 opens with sample data, and edits reset when the page reloads. The study assistant uses built-in example responses. You can run the app without an account or API key.

## Run locally

Install Bun and Node.js 22.12 or newer.

```sh
bun install --frozen-lockfile
bun run dev
```

Open [localhost:3000](http://localhost:3000).

## Build and test

```sh
bun run build
bun run lint
node --import tsx --test src/utils/studyLogic.test.ts
```

The production build goes to `dist/`. Run `bun run preview` to try it locally.
