<div align="center">
  <h1>StudyFlow</h1>
  <p><strong>Plan your studies. Protect your focus. Master what matters.</strong></p>
  <p>A personal study workspace for Windows, with an Android companion and an integrated Gemini-powered assistant.</p>
  <p>
    <img alt="Version 2.0.0-alpha.4" src="https://img.shields.io/badge/desktop-2.0.0--alpha.4-4F46E5?style=flat-square">
    <img alt="Windows" src="https://img.shields.io/badge/platform-Windows-2563EB?style=flat-square">
    <img alt="Android companion" src="https://img.shields.io/badge/companion-Android-059669?style=flat-square">
    <img alt="Tauri 2" src="https://img.shields.io/badge/Tauri-2-0D9488?style=flat-square">
    <a href="https://github.com/gaganaweerakoon/StudyFlow/actions/workflows/point-y-review.yml"><img alt="Source checks" src="https://github.com/gaganaweerakoon/StudyFlow/actions/workflows/point-y-review.yml/badge.svg?branch=main"></a>
  </p>
  <p><a href="#the-workspace">Explore the workspace</a> · <a href="#android-companion">Android companion</a> · <a href="#pip--your-study-assistant">Pip</a> · <a href="#getting-started">Getting started</a></p>
  <img src="docs/screenshots/dashboard.jpg" alt="StudyFlow dashboard with study analytics, upcoming sessions and Quick-Start Focus" width="100%">
  <sub>StudyFlow desktop · Existing application screenshot with example study records</sub>
</div>

## The workspace

StudyFlow connects the entire study cycle: schedule a lesson, start a focus session, capture notes, review what you learned, and measure progress without switching between separate productivity apps.

| Plan | Study | Review |
| :--- | :--- | :--- |
| Calendar and recurring sessions | Pomodoro, countdown and stopwatch | Spaced-repetition flashcards |
| Subjects and syllabus tracking | Notes, PDF annotation and OCR | Timed practice tests |
| Goals, milestones and task board | Quick-Start Focus and history | Exam tracking and analytics |

### A workspace with data, not empty cards

These records come from the repository's existing [desktop example dataset](src/data/mockData.ts). They illustrate how StudyFlow represents subjects, weekly targets and progress; they are demonstration records, not real user telemetry.

| Subject | Recorded study time | Weekly target |
| :--- | ---: | ---: |
| Algorithms & Complexity | 46.5 h | 8 h |
| Multivariable Calculus | 38.2 h | 7 h |
| Organic Chemistry II | 34.0 h | 6.5 h |
| Systems Neuroscience | 29.4 h | 5.5 h |
| Econometrics | 21.8 h | 4.5 h |

For example, the same dataset includes a 90-minute **NP-Completeness Reductions Deep Work** session, a 75-minute task to solve Stokes' theorem practice integrals, and a 40-minute recorded focus session on carbonyl enolate mechanisms. The planner, task board and focus history represent different parts of the same study workflow.

### 01 · Plan your study time

<img src="docs/screenshots/planner.jpg" alt="Weekly planner with color-coded study blocks and session editor" width="100%">

- Day, week, month and agenda calendar views with editable study blocks.
- Recurring sessions and personal blocks that do not count toward study time.
- Subject-linked tasks, goals, sortable milestones and upcoming exams.
- Dashboard with current and upcoming sessions, planned versus actual study time and subject progress.

### 02 · Focus and measure progress

<img src="docs/screenshots/focus.jpg" alt="Focus timer with Pomodoro controls and personalization options" width="100%">

Start the current calendar session from Quick-Start Focus or choose a Pomodoro, countdown, stopwatch or custom timer. A floating mini-timer keeps the session accessible while you work elsewhere in the app. Focus history, analytics, achievements and challenges help make completed study time visible.

### 03 · Turn resources into revision

<table>
  <tr>
    <td width="50%" valign="top"><img src="docs/screenshots/notes.jpg" alt="Notes workspace with PDF annotation and Markdown editing"><br><strong>Notes &amp; PDFs</strong><br>Organize notes by subject, annotate PDFs, prepare Markdown and recognize scanned text.</td>
    <td width="50%" valign="top"><img src="docs/screenshots/practice.jpg" alt="Timed practice test with question navigation"><br><strong>Practice &amp; recall</strong><br>Review spaced-repetition cards and take timed tests with saved attempts, scores and feedback.</td>
  </tr>
</table>

PDF preparation extracts selectable text locally and can retain tables and figures inline. Original page images remain available for reference. For scanned documents, desktop OCR uses installed Windows language packs (or a local Tesseract installation on Linux).

Generate flashcards from a selected note section and review the draft before adding it to a deck. Practice tests support multiple-choice, multiple-select and short-answer questions.

## Android companion

StudyFlow extends the desktop schedule and focus workflow to Android. The phone is designed as a companion rather than a replacement for the desktop workspace.

| Capability | Behavior |
| :--- | :--- |
| Calendar | Sync desktop study sessions and retain the last downloaded schedule offline. |
| Focus | View or control the desktop timer; create subject-linked local focus sessions while offline. |
| Offline reconciliation | Import phone sessions when reconnected. Windows takes precedence for overlapping runs or the same calendar session. |
| Reminders | Upcoming-session notices, start alarms and sleep wake-up alarms, subject to Android permissions. |
| Home screen | Focus and upcoming-session widgets. |
| Distraction awareness | Deep-focus warnings and app-usage tracking, subject to the relevant Android permissions. |

**Pairing:** Open Settings → Mobile companion on Windows, create a pairing code, and enter the code and relay address on Android. Share the calendar from Windows and sync it on Android. Pairing codes expire after ten minutes and can be revoked from the desktop.

The [companion relay documentation](server/companion/README.md) describes self-hosting, HTTPS, enrollment and testing. Offline focus reconciliation is implemented in [offlineFocus.ts](src/companion/offlineFocus.ts).

## Pip — your study assistant

<img src="docs/screenshots/pip.jpg" alt="Pip assistant using workspace context to help plan study sessions" width="100%">

Pip is integrated with the study workspace rather than being a separate general-purpose chat screen. It can use selected context, interpret screenshots and documents, draft syllabus outlines, and propose actions involving calendar sessions, tasks, goals and notes. Bulk additions require review; sensitive replacements require explicit opt-in.

The configured model catalog is maintained in [geminiModels.json](src/assistant/geminiModels.json):

| Model | Configured ID |
| :--- | :--- |
| Gemini 3.1 Pro Preview | `gemini-3.1-pro-preview` |
| Gemini 4 Hydrogen | `gemini-4-hydrogen` |
| Gemini 3.8 Flash | `gemini-3.8-flash` |
| Gemini 3.5 Flash-Lite | `gemini-3.5-flash-lite` |

Add your own Gemini API key in **Settings → AI Usage**. Access to individual models depends on the provider and your API key. Expand **View usage** to see provider-reported token counts.

## Getting started

### Windows and Android builds

The project is in alpha. Installer availability depends on completed GitHub Actions builds.

| Platform | Build workflow |
| :--- | :--- |
| Windows desktop | [Windows desktop build](https://github.com/gaganaweerakoon/StudyFlow/actions/workflows/windows-desktop.yml) |
| Android companion | [Android companion build](https://github.com/gaganaweerakoon/StudyFlow/actions/workflows/android-companion.yml) |
| Combined package | [Combined installer workflow](https://github.com/gaganaweerakoon/StudyFlow/actions/workflows/point-y-installers.yml) |

Open a successful workflow run to find its available artifacts. GitHub authentication and artifact retention limits may apply. Also see [Releases](https://github.com/gaganaweerakoon/StudyFlow/releases).

### Run the browser development workspace

Install Bun and Node.js (22.12 or newer; CI uses Node.js 24).

```sh
git clone https://github.com/gaganaweerakoon/StudyFlow.git
cd StudyFlow
bun install --frozen-lockfile
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). The dev server includes Pip's browser-preview backend and binds to loopback by default. Server-owned API keys are restricted to direct loopback requests; remote clients must supply their own key.

### Run the native desktop app

On Windows, install the stable Rust MSVC toolchain, Microsoft C++ Build Tools and Edge WebView2.

```sh
bun run tauri dev
```

## Architecture

| Layer | Technology |
| :--- | :--- |
| Desktop shell | Tauri 2 · Rust |
| User interface | React 19 · TypeScript · Tailwind CSS · Vite |
| Desktop persistence | Local SQLite |
| Android | Kotlin · Android WebView · shared React interface |
| Companion relay | Node.js · SQLite · HTTPS deployment |
| AI | Google Gemini SDK |

```text
src/                 React workspace and shared application logic
src/assistant/       Pip protocol, actions and usage
src/companion/       Desktop pairing and focus reconciliation
src/mobile/          Android companion interface
src-tauri/           Native desktop application
android/             Android application and web entry point
server/              Assistant backend and companion relay
docs/screenshots/    Application screenshots
.github/workflows/   Source checks and installer builds
```

## Data and privacy

- Desktop study records and chat history are stored in the local SQLite workspace.
- Create a local profile or use Google sign-in when the publisher has configured `STUDYFLOW_GOOGLE_CLIENT_ID` and `STUDYFLOW_GOOGLE_CLIENT_SECRET`.
- Desktop AI keys use the native credential store when available; browser keys remain in memory for the current tab.
- Gemini receives the messages, enabled workspace context and attachments you submit.
- Use Settings → Data & Backup to import supported schema 17 SQLite backups, export workspace JSON, or reset selected sections.
- Companion synchronization requires a configured relay and sends the data required by that workflow.

## Development status

StudyFlow is **alpha software**. The repository's Study Lab code is experimental, including mathematical tools, JavaScript/Python workers and an SVG whiteboard. Worker time limits are not a security sandbox; only run trusted code. Features and screenshots may lag behind ongoing development.

## Validation

Source checks run on pushes to `main`. Installer builds can be dispatched separately when required.

```sh
bun run lint
bun run build
node --import tsx --test src/utils/*.test.ts src/assistant/*.test.ts src/companion/*.test.ts src/firebase/*.test.ts src/mobile/*.test.ts src/lab/*.test.ts server/*.test.ts server/companion/*.test.mjs
```

Use `bun run preview` to serve the production web build locally. Report bugs and feature requests in [GitHub Issues](https://github.com/gaganaweerakoon/StudyFlow/issues).

---

<div align="center">
  <strong>StudyFlow</strong><br>
  <sub>One workspace for a more intentional study routine.</sub>
</div>
