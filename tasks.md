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
| T1.2 | Child mode vs parent mode PIN separation inside the main app world flow | `Done` | Implemented in [index.html](/C:/Users/User/LMS/index.html) and [js/app.js](/C:/Users/User/LMS/js/app.js) with world-HUD parent access, in-app PIN gating, persistent family PIN, and child-first boot that reopens directly into the saved learner's world. |
| T1.3 | Car colour and car name customisation per child | `Done` | Implemented in [index.html](/C:/Users/User/LMS/index.html), [js/app.js](/C:/Users/User/LMS/js/app.js), [js/world.js](/C:/Users/User/LMS/js/world.js), and [css/app.css](/C:/Users/User/LMS/css/app.css) with a one-time setup flow, per-child `carColor`/`carName`, HUD display, and live world recolour. |
| T1.4 | Weather system tied to study streak | `Done` | Implemented in [js/app.js](/C:/Users/User/LMS/js/app.js), [js/world.js](/C:/Users/User/LMS/js/world.js), [index.html](/C:/Users/User/LMS/index.html), and [css/app.css](/C:/Users/User/LMS/css/app.css) with streak/date helpers, streak HUD messaging, and world weather profiles driven by learning-log recency. |
| T1.5 | XP completion fireworks in the 3D world | `Done` | Implemented in [js/app.js](/C:/Users/User/LMS/js/app.js), [js/world.js](/C:/Users/User/LMS/js/world.js), [index.html](/C:/Users/User/LMS/index.html), and [css/app.css](/C:/Users/User/LMS/css/app.css) with queued building-targeted fireworks and floating world-space `+XP` labels that fire immediately or on return to the world. |
| T1.6 | XP milestone building/world unlocks | `Done` | Implemented in [js/app.js](/C:/Users/User/LMS/js/app.js) and [js/world.js](/C:/Users/User/LMS/js/world.js) with additive XP milestones: palm trees at `100`, fountain at `250`, roof variants at `500`, and full animated banners at `1000`. |
| T1.7 | PWA install manifest and install prompt | `Done` | Implemented in [index.html](/C:/Users/User/LMS/index.html), [manifest.json](/C:/Users/User/LMS/manifest.json), [js/app.js](/C:/Users/User/LMS/js/app.js), and [sw.js](/C:/Users/User/LMS/sw.js) with manifest linking, iOS install metadata, deferred install prompt handling, and a Settings entry for install actions/instructions. |
| T1.8 | Multi-child world mode rebuild without full reload | `Done` | Implemented in [js/app.js](/C:/Users/User/LMS/js/app.js) and [js/world.js](/C:/Users/User/LMS/js/world.js) by rebuilding the child-specific scene, car, weather, progress bars, and milestone unlock state while reusing the existing WebGL renderer. |

## Sprint 2 - Curriculum Depth & Parent Dashboard v2

Goal from source: complete Foundation Phase curriculum coverage and make the parent dashboard inspection-ready with planner, trends, annotations, and printable reporting.

| ID | Task | Status | Repo-aware note |
| --- | --- | --- | --- |
| T2.1 | Expand Foundation Phase curriculum for Grades 1-3 | `Done` | Implemented in [data/curriculum.js](/C:/Users/User/LMS/data/curriculum.js) with Grade 1-3 coverage added across the six in-app subject tracks so Foundation Phase learners can use the existing world and dashboard flow. |
| T2.2 | Progress trend chart | `Done` | Implemented in [js/app.js](/C:/Users/User/LMS/js/app.js) with per-child progress metadata/history snapshots, legacy-state backfill, a 7-day dashboard trend chart, and subject-level mini trends for parent review. |
| T2.3 | Topic annotations / parent notes | `Done` | Implemented in [js/app.js](/C:/Users/User/LMS/js/app.js) and [css/app.css](/C:/Users/User/LMS/css/app.css) with per-topic parent-only notes stored in app state, inline subject-level note controls, and dashboard/export surfacing for inspection context. |
| T2.4 | Weekly planner view | `Done` | Implemented in [js/app.js](/C:/Users/User/LMS/js/app.js) and [css/app.css](/C:/Users/User/LMS/css/app.css) with parent-mode weekly planning state, per-day topic assignment/removal, and a printable planner card on the main dashboard. |
| T2.5 | CAPS inspection report card PDF | `Done` | Implemented in [index.html](/C:/Users/User/LMS/index.html), [js/app.js](/C:/Users/User/LMS/js/app.js), and [css/app.css](/C:/Users/User/LMS/css/app.css) with a dedicated inspection report screen, printable report-card layout, subject summaries, notes, planner snapshot, portfolio evidence, and learning-log extracts. |

## Sprint 3 - Maths Arcade Bridge

Goal from source: connect the LMS and Maths Arcade so XP, topic mastery, and game launch flow through one shared child experience.

| ID | Task | Status | Repo-aware note |
| --- | --- | --- | --- |
| T3.1 | `postMessage` XP bridge API | `Done` | Implemented in [js/app.js](/C:/Users/User/LMS/js/app.js), [data/arcade-games.js](/C:/Users/User/LMS/data/arcade-games.js), [arcade/bridge-demo.html](/C:/Users/User/LMS/arcade/bridge-demo.html), and [docs/arcade-api.md](/C:/Users/User/LMS/docs/arcade-api.md) with origin whitelisting, session-based `HS_INIT`/`HS_READY`/`HS_XP`/`HS_TOPIC_DONE` handling, and `HS_ACK` responses. |
| T3.2 | CAPS topic tags per Arcade game | `Done` | Implemented in [data/arcade-games.js](/C:/Users/User/LMS/data/arcade-games.js) with a local Arcade catalog keyed by grade range, skill tags, and linked CAPS topic IDs for picker/filter flows. |
| T3.3 | Arcade building in the 3D world | `Done` | Implemented in [js/world.js](/C:/Users/User/LMS/js/world.js), [index.html](/C:/Users/User/LMS/index.html), [js/app.js](/C:/Users/User/LMS/js/app.js), and [css/app.css](/C:/Users/User/LMS/css/app.css) with a dedicated Maths Arcade building, world entry routing, and an in-app game picker screen. |
| T3.4 | Daily challenge quest | `Done` | Implemented in [js/app.js](/C:/Users/User/LMS/js/app.js) and [css/app.css](/C:/Users/User/LMS/css/app.css) with deterministic per-child daily Arcade challenges, dashboard surfacing, Arcade highlighting, and bonus XP payout when the tagged challenge is completed. |

## Sprint 4 - World Expansion

Goal from source: make the world feel alive and responsive to grade progression, with stronger personal attachment and a companion character.

| ID | Task | Status | Repo-aware note |
| --- | --- | --- | --- |
| T4.1 | Grade-based world expansion | `Done` | Implemented in [js/world.js](/C:/Users/User/LMS/js/world.js) with grade-tiered world bounds, expanded road networks, outer district landmarks, denser scenery generation, and minimap scaling so older learners drive through visibly larger campuses. |
| T4.2 | Home base building | `Done` | Implemented in [js/world.js](/C:/Users/User/LMS/js/world.js) and [js/app.js](/C:/Users/User/LMS/js/app.js) with a dedicated Home Base building in the 3D world, learner-specific house styles, home-model variation, and direct routing into the in-app home hub/dashboard flow. |
| T4.3 | World AI companion "Sage" | `Done` | Implemented in [js/world.js](/C:/Users/User/LMS/js/world.js), [index.html](/C:/Users/User/LMS/index.html), and [css/app.css](/C:/Users/User/LMS/css/app.css) with a floating companion mesh, follow behavior around the learner car, projected speech bubble guidance, and context-aware prompts for home, Arcade, challenges, and nearby buildings. |

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
