# StudyFlow branch history archive

Consolidated 25 November 2026. The maintained branch is `main`. The tested Point Y source is the first parent of the consolidation commit. The two divergent historical branch tips are additional parents, preserving their complete commit history without reverting to obsolete build configuration. All other tips were already ancestors of Point Y.

These exact historical commits remain recoverable from main's Git history even after the corresponding branches are removed. No tag is required for reachability. To restore a branch, use `git switch -c restored-name <commit SHA>` after fetching main.

| Former branch / snapshot | Commit SHA |
|---|---|
| `main` | [`d472b7286d3fd3e359a65712761ed36fe620b079`](https://github.com/gaganaweerakoon/StudyFlow/commit/d472b7286d3fd3e359a65712761ed36fe620b079) |
| `build/windows-789e35e` | [`a8b38826e2d0854a729d820e7dc2d520ec4ff8ed`](https://github.com/gaganaweerakoon/StudyFlow/commit/a8b38826e2d0854a729d820e7dc2d520ec4ff8ed) |
| `build/windows-gemini-b7ed3b7` | [`fd4bdf582885ad1eef409018c83736d5f41eb6a2`](https://github.com/gaganaweerakoon/StudyFlow/commit/fd4bdf582885ad1eef409018c83736d5f41eb6a2) |
| `mobile-companion-integration` | [`bcb7392e07e0a6ce836268047165ab517c5c2818`](https://github.com/gaganaweerakoon/StudyFlow/commit/bcb7392e07e0a6ce836268047165ab517c5c2818) |
| `mobile-widget-status-update` | [`3fb74eccdccb699c822d8dc7ab037bbaf5a3ebfc`](https://github.com/gaganaweerakoon/StudyFlow/commit/3fb74eccdccb699c822d8dc7ab037bbaf5a3ebfc) |
| `review/point-y-changelog` | [`e9059bfd959ea235af318bf3ebab86c8a73e0b0f`](https://github.com/gaganaweerakoon/StudyFlow/commit/e9059bfd959ea235af318bf3ebab86c8a73e0b0f) |
| `rust-desktop-v2` | [`d886d3c4eae7d8203af838c6aa5d2ad2dc8d26cb`](https://github.com/gaganaweerakoon/StudyFlow/commit/d886d3c4eae7d8203af838c6aa5d2ad2dc8d26cb) |
| `studyflow-assistant` | [`29f7e7168463a5ee062cac9a5f040b3075d50a53`](https://github.com/gaganaweerakoon/StudyFlow/commit/29f7e7168463a5ee062cac9a5f040b3075d50a53) |

## Historical differences

- `build/windows-789e35e`: four divergent commits with a net change only in the old Windows build workflow. The tested current workflow supersedes it.
- `rust-desktop-v2`: one divergent commit with no net file changes from its merge base.

## Build policy

Source validation runs automatically on pushes to main. Windows, Android and combined installer builds are manually dispatched from main when required.

The Point Y installer build passed: https://github.com/gaganaweerakoon/StudyFlow/actions/runs/45546194393 .
