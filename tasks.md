# HomeSchool Hub Sprint Backlog

> Derived from `HomeSchoolHub-TaskList.docx` and reconciled against the live codebase so we do not duplicate completed work or preserve stale single-file assumptions.

This file is the sprint-task companion to [memory.md](/C:/Users/User/LMS/memory.md). It preserves the original sprint structure and task intent, but each task is marked against the current repo state.

## Current Reconciliation

### Already present

- Parent dashboard page and PIN gate in [parent-dashboard/index.html](/C:/Users/User/LMS/parent-dashboard/index.html)
- Portfolio and learning log basics in [js/app.js](/C:/Users/User/LMS/js/app.js)
- Multi-child state basics in [js/app.js](/C:/Users/User/LMS/js/app.js)
- Backup/restore basics in [js/app.js](/C:/Users/User/LMS/js/app.js) and [parent-dashboard/index.html](/C:/Users/User/LMS/parent-dashboard/index.html)
- PWA/service worker scaffolding in [manifest.json](/C:/Users/User/LMS/manifest.json) and [sw.js](/C:/Users/User/LMS/sw.js)
- 3D world, subject buildings, minimap, and world polish in [js/world.js](/C:/Users/User/LMS/js/world.js)

### Partial or misaligned

- Offline hardening is incomplete because Three.js is still CDN-loaded from [index.html](/C:/Users/User/LMS/index.html)
- Parent access exists as a separate dashboard flow rather than the PRD-style world HUD PIN overlay
- Portfolio/reporting features are partly placeholder-based and not yet full inspection outputs
- Some roadmap concepts appear in prototype form in the parent dashboard but are not feature-complete

### Missing

- Planner, trend charts, topic annotations, and report card PDF
- Maths Arcade bridge and Arcade building
- Tutor and centre workflows
- PayFast integration, plan gates, and encrypted cloud backup

## Sprint Overview

| Sprint | Theme | Key Deliverables | Duration | Milestone |
| --- | --- | --- | --- | --- |
| Sprint 1 | Foundation & Offline Hardening | Bundle Three.js locally, PIN auth, car customisation, weather streak, XP fireworks, PWA install | 2 weeks | Fully offline v1 shipped to family |
| Sprint 2 | Curriculum Depth & Parent Dashboard v2 | Foundation Phase Gr 1-3 full topics, progress trend charts, topic annotations, planner view, report card PDF | 2 weeks | Parent dashboard feature-complete for inspection use |
| Sprint 3 | Maths Arcade Bridge | XP bridge API, CAPS topic tagging per game, Arcade building in world, daily challenge, family leaderboard | 2 weeks | Arcade and LMS share one XP economy |
| Sprint 4 | World Expansion | World map grows with grade, Home base + library buildings, daily quest noticeboard, co-op ghost presence (read-only) | 3 weeks | World feels alive and grade-responsive |
| Sprint 5 | Tutor & Centre Layer | Read-only tutor share link, homework assignment, session planner, centre multi-child dashboard, bulk enrolment | 3 weeks | B2B demo-ready for learning centres |
| Sprint 6 | Commercial & Platform | PayFast integration, freemium gates, optional cloud sync (opt-in), SA language UI, resource marketplace scaffold | 3 weeks | Paying customers can subscribe |

## Sprint 1 - Foundation & Offline Hardening

Goal from source: produce a rock-solid offline PWA with no CDN dependencies, PIN separation between child and parent modes, first-class car customisation, and stronger XP/streak feedback.

| ID | Task | Status | Repo-aware note |
| --- | --- | --- | --- |
| T1.1 | Bundle Three.js locally and remove CDN dependency | `Done` | Completed via [lib/three.min.js](/C:/Users/User/LMS/lib/three.min.js), [index.html](/C:/Users/User/LMS/index.html), and [sw.js](/C:/Users/User/LMS/sw.js). The app no longer depends on the CDN for Three.js boot. |
| T1.2 | Child mode vs parent mode PIN separation inside the main app world flow | `Partial` | Parent PIN exists in [parent-dashboard/index.html](/C:/Users/User/LMS/parent-dashboard/index.html), but the lock-in-world HUD flow described in the task has not been built in the main app. |
| T1.3 | Car colour and car name customisation per child | `Todo` | No persistent car customisation flow or per-child car setup state is present in [js/app.js](/C:/Users/User/LMS/js/app.js) or [js/world.js](/C:/Users/User/LMS/js/world.js). |
| T1.4 | Weather system tied to study streak | `Todo` | The world has atmosphere and clouds, but there is no streak-driven weather calculation tied to log history. |
| T1.5 | XP completion fireworks in the 3D world | `Todo` | XP updates exist, but there is no world-space fireworks or queued effect system tied to topic completion. |
| T1.6 | XP milestone building/world unlocks | `Partial` | The world already has extra visual flair, but XP-threshold unlock logic is not implemented as milestone-driven progression. |
| T1.7 | PWA install manifest and install prompt | `Partial` | PWA scaffolding exists in [manifest.json](/C:/Users/User/LMS/manifest.json) and [sw.js](/C:/Users/User/LMS/sw.js), but the subtle install prompt flow in Settings is not complete. |
| T1.8 | Multi-child world mode rebuild without full reload | `Partial` | Multi-child switching exists, but the task-list expectation of a full child-specific world rebuild with car, weather, and milestone reset is not yet fully implemented. |

## Sprint 2 - Curriculum Depth & Parent Dashboard v2

Goal from source: complete Foundation Phase curriculum coverage and make the parent dashboard inspection-ready with planner, trends, annotations, and printable reporting.

| ID | Task | Status | Repo-aware note |
| --- | --- | --- | --- |
| T2.1 | Expand Foundation Phase curriculum for Grades 1-3 | `Todo` | [data/curriculum.js](/C:/Users/User/LMS/data/curriculum.js) currently focuses on higher grades; the full Gr 1-3 CAPS expansion is still needed. |
| T2.2 | Progress trend chart | `Todo` | No charting is present in the learner app or parent dashboard, and no completed-at migration exists yet for historical progress graphing. |
| T2.3 | Topic annotations / parent notes | `Todo` | There is no notes schema or inline note UI in the curriculum experience yet. |
| T2.4 | Weekly planner view | `Todo` | Planner behavior and planner state are not implemented in the current app or parent dashboard. |
| T2.5 | CAPS inspection report card PDF | `Partial` | Portfolio export messaging exists, but the structured report card generation described here is not implemented. |

## Sprint 3 - Maths Arcade Bridge

Goal from source: connect the LMS and Maths Arcade so XP, topic mastery, and game launch flow through one shared child experience.

| ID | Task | Status | Repo-aware note |
| --- | --- | --- | --- |
| T3.1 | `postMessage` XP bridge API | `Todo` | No Arcade message protocol, whitelist validation, or `HS_ACK` flow exists in the current codebase. |
| T3.2 | CAPS topic tags per Arcade game | `Todo` | There is no [data/arcade-games.js](/C:/Users/User/LMS/data) schema yet, and EdTech apps are not wired to topic-tagged game descriptors. |
| T3.3 | Arcade building in the 3D world | `Todo` | The current world has subject buildings only; there is no special Arcade building or picker flow. |
| T3.4 | Daily challenge quest | `Todo` | No deterministic daily challenge logic or noticeboard/dashboard integration exists yet. |

## Sprint 4 - World Expansion

Goal from source: make the world feel alive and responsive to grade progression, with stronger personal attachment and a companion character.

| ID | Task | Status | Repo-aware note |
| --- | --- | --- | --- |
| T4.1 | Grade-based world expansion | `Todo` | The world has improved ambience, but map tiering by grade and unlock sweeps are not implemented. |
| T4.2 | Home base building | `Todo` | Portfolio and log screens exist, but there is no dedicated home building or house-style state in the world. |
| T4.3 | World AI companion "Sage" | `Todo` | No companion mesh, follow logic, or speech bubble guidance system is present. |

## Sprint 5 - Tutor & Centre Layer

Goal from source: support tutor and learning-centre workflows through shared visibility, homework, and a centre-level dashboard.

| ID | Task | Status | Repo-aware note |
| --- | --- | --- | --- |
| T5.1 | Read-only tutor share link | `Todo` | No tokenized tutor snapshot route or share management exists yet. |
| T5.2 | Homework assignment | `Todo` | There is no homework schema, due-date UX, or world/building flag logic tied to assignments. |
| T5.3 | Centre multi-child dashboard | `Partial` | The parent dashboard already uses multi-child data and includes commercial/centre-oriented prototype ideas, but a distinct centre-PIN read-only dashboard flow is not implemented. |

## Sprint 6 - Commercial & Platform

Goal from source: introduce payments, plan gating, optional cloud backup, and broader platform/commercial readiness.

| ID | Task | Status | Repo-aware note |
| --- | --- | --- | --- |
| T6.1 | PayFast payment integration | `Todo` | No PayFast flow, ITN handler, or subscription state exists in the repo. |
| T6.2 | Feature gates per plan tier | `Partial` | [parent-dashboard/index.html](/C:/Users/User/LMS/parent-dashboard/index.html) contains plan-oriented prototype UI, but there is no enforced gate system across learner actions. |
| T6.3 | Optional encrypted cloud backup | `Todo` | Backup/restore exists locally only; there is no encrypted cloud backup or worker integration. |

## Appendix - Recommended Agent Prompts

The source document includes reusable prompts for coding sessions. They are still useful, but their file assumptions should be updated for the split codebase.

### General sprint prompt

Use the original prompt intent, but replace the old single-file assumption with the current repo layout:

- Primary app shell: [index.html](/C:/Users/User/LMS/index.html)
- App logic: [js/app.js](/C:/Users/User/LMS/js/app.js)
- World logic: [js/world.js](/C:/Users/User/LMS/js/world.js)
- Curriculum data: [data/curriculum.js](/C:/Users/User/LMS/data/curriculum.js)
- Service worker: [sw.js](/C:/Users/User/LMS/sw.js)
- Parent dashboard: [parent-dashboard/index.html](/C:/Users/User/LMS/parent-dashboard/index.html)

### Example task prompt preserved from source

The task-list doc includes prompt templates such as:

- implement a single task in isolation with acceptance criteria and file targets
- diagnose a broken feature from pasted code and fix only that feature

These remain valid, but future prompts should reference the split modules above rather than saying the entire app is only `index.html + sw.js + data/curriculum.js`.
