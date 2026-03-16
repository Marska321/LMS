# HomeSchool Hub

> Derived from `HomeSchoolHub-PRD.docx` and stored here as project memory/reference.

## Product Requirements Document (PRD)

Agentic-Ready Edition — For use with Claude Code, Cursor, or Windsurf

*Version 1.0 | March 2026 | Confidential & Proprietary*

## Document Control

| Version | Date | Author | Status |
| --- | --- | --- | --- |
| 1.0 | March 2026 | Founding Team | Active |
| 1.1 | TBD | — | Planned |

This PRD is designed to be fed to an agentic coding tool as system context. It defines WHAT to build and WHY. The companion Task List document defines HOW (implementation details, acceptance criteria, file targets). Use both together.

## 1. Executive Summary

HomeSchool Hub is a private, offline-first, POPIA-compliant learning management system for South African homeschool families. It combines a gamified 3D driving world — where children navigate a virtual campus and "drive" to subject buildings — with a full CAPS curriculum tracker, portfolio builder, learning log, and parent dashboard.

The product is uniquely positioned at the intersection of three underserved needs in the South African market:

- CAPS curriculum management without a registered curriculum provider
- POPIA-compliant, on-device data privacy for children's learning records
- Engagement mechanics (3D world, XP, unlockables) that make children want to open the app
Adjacent products under development include a Maths Arcade suite (a collection of curriculum-aligned maths games) and tools for learning centres and tutors. The LMS serves as the central platform layer connecting these products.

## 2. Problem Statement

#### 2.1 The South African homeschool landscape

South Africa has a growing homeschool community — estimated at 100,000+ learners as of 2024 — governed by the Schools Act which requires registration and portfolio-based evidence of learning. The majority of families either:

- Register with a curriculum provider (Impaq, Brainline, Spark, etc.) — expensive (R8,000–R25,000/yr) and inflexible
- Operate independently using the CAPS curriculum — free, flexible, but administratively burdensome
Independent homeschoolers face three compounding problems:

| Problem | Current Reality | Impact |
| --- | --- | --- |
| No curriculum tracker | Parents use spreadsheets, paper checklists, or expensive provider portals | Topics fall through the cracks; inspection prep is stressful |
| Portfolio burden | Physical folders, unorganised photos, last-minute assembly before inspections | Inspections are feared rather than routine |
| Child motivation | Homeschool fatigue; children miss the social gamification of school; no visible progress | Inconsistent learning; parents burn out managing motivation |
| Data privacy | EdTech tools are US/EU-hosted; POPIA compliance is unclear; children's data leaves SA | Legal exposure for families; distrust of digital tools |

## 3. Target Users & Personas

#### 3.1 Primary — Independent CAPS homeschool parent

| Name | Liezel van der Berg |
| --- | --- |
| Location | Pretoria, Gauteng |
| Situation | 1–3 children, Gr 1–7, no curriculum provider, CAPS-aligned |
| Pain points | Spends 2+ hours/week on tracking; inspection prep causes anxiety; struggles to keep children engaged |
| Motivation | Wants a tool that handles the admin so she can focus on teaching |
| Tech comfort | Moderate — uses a smartphone daily, occasionally a laptop; not a developer |
| Price sensitivity | High — already saving on school fees; willing to pay ≤R150/month for genuine value |

#### 3.2 Secondary — Learning centre operator

| Name | Thandi Dlamini |
| --- | --- |
| Situation | Runs a micro-school / co-op for 8–15 learners, Gr 1–6 |
| Pain points | No affordable multi-child management tool; individual family subscriptions don't scale; needs CAPS report cards |
| Motivation | A single platform that manages all her learners and satisfies inspector requirements |
| Willingness to pay | R200–R350/month for a cohort tool if it replaces 3+ current tools |

#### 3.3 Tertiary — CAPS tutor

A private tutor who sees 5–20 students per week. Needs to view a student's current progress before a session, assign targeted topics, and confirm completion. Does not need to manage portfolios or logs — just the curriculum layer.

## 4. Product Vision & Positioning

#### 4.1 Vision statement

"HomeSchool Hub is the operating system for CAPS homeschooling in South Africa — the place where a child's entire learning journey is tracked, celebrated, and evidenced. It is so private it never leaves the device, so engaging that the child asks to open it, and so administratively complete that inspections become a formality."

#### 4.2 Strategic positioning

| Dimension | HomeSchool Hub | Competitors |
| --- | --- | --- |
| Privacy | On-device only; POPIA by design; no cloud default | Cloud-first (US/EU servers); GDPR not POPIA |
| Curriculum | CAPS Gr 1–7 built-in; no provider needed | Either sell curriculum or are curriculum-agnostic |
| Engagement | 3D gamified world; XP; unlockables | List-based trackers; no gamification |
| Inspection readiness | Portfolio PDF + CAPS report card on demand | Manual compilation or not supported |
| Price | Free (1 child) + R99/mo Family + R299/mo Co-op | R8,000–R25,000/yr (providers) or generic tools |
| Offline capability | Full offline PWA; works during load-shedding | Requires internet |

## 5. Product Scope — v1.0 Release

#### 5.1 In scope

- CAPS curriculum tracker — Grades 1–7, all core subjects, topic-level progress (not started / in progress / done)
- 3D driving world — Three.js campus, 6 subject buildings, car with customisation, XP economy
- Parent dashboard — PIN-protected, curriculum overview, planner, trend charts, topic annotations
- Portfolio — item capture (manual entry, photo metadata), tagging, inspection PDF export
- Learning log — daily journal, mood tracking, subject/time logging, inspection evidence
- Materials library — catalogue of physical and digital resources linked to CAPS topics
- EdTech app launcher — configurable links to external tools, launch tracking
- Maths Arcade bridge — postMessage API, XP sharing, CAPS topic tagging
- Multi-child support — up to 4 children on Family plan
- Tutor share link — read-only, time-limited, no account creation
- Centre view — multi-learner dashboard for co-op operators
- Offline PWA — full functionality with zero internet, installable on device
- POPIA compliance — all data on-device, no analytics, no cloud default, documented privacy policy
- PayFast payments — Free / Family / Co-op tiers
#### 5.2 Out of scope for v1.0

- Real-time collaboration or multi-device sync (cloud sync is opt-in, Sprint 6)
- Video content hosting or streaming
- AI-generated curriculum content (topic suggestions only — no generated lessons)
- Grades 8–12 (CAPS Senior Phase) — planned for v2.0
- Android/iOS native app — PWA covers this use case for v1.0
- Multiple language curriculum content (UI language toggle is in scope; Afrikaans/Zulu curriculum text is not)
## 6. Functional Requirements

### 6.1 Authentication & Access Control

| ID | Requirement | Rationale | Priority | Sprint |
| --- | --- | --- | --- | --- |
| FR-1.1 | Child mode (default)App opens directly in child 3D world — no login, no friction. The world is the home screen. | Reduces daily friction. Children should be able to open and start without parental involvement. | Must Have | S1 |
| FR-1.2 | Parent PIN lockA lock icon in the world HUD opens a PIN numpad overlay. Correct PIN grants access to the Parent Dashboard. | Simple, parent-familiar security model. No accounts or passwords needed. | Must Have | S1 |
| FR-1.3 | Configurable PINParent can change the PIN from Settings. PIN stored in localStorage under STATE.pin. | Default 1234 must be changeable. | Must Have | S1 |
| FR-1.4 | Centre PINSeparate PIN for centre operator view, configured independently from parent PIN. | Centres need their own access without sharing the family PIN. | Should Have | S5 |

### 6.2 3D World

| ID | Requirement | Rationale | Priority | Sprint |
| --- | --- | --- | --- | --- |
| FR-2.1 | Drivable carChild drives a 3D car using arrow keys / WASD. Mobile D-pad buttons provided for touch devices. | Core engagement mechanic — makes the app feel like a game, not a chore. | Must Have | S1 |
| FR-2.2 | Subject buildings6 buildings mapped to CAPS subjects. Progress bars visible on building facades. Buildings glow when child is nearby. | Visual representation of learning progress creates tangible goals. | Must Have | S1 |
| FR-2.3 | Building entryApproaching a building and pressing Space / Enter opens the subject's curriculum screen. Returning to the world restores car position. | Navigation metaphor — choosing where to "go" today is empowering for children. | Must Have | S1 |
| FR-2.4 | Car customisationChild selects car colour (8 options) and gives it a name on first launch. Shown in HUD. | Ownership and personalisation drives engagement and return rate. | Must Have | S1 |
| FR-2.5 | XP economyCompleting topics awards XP. XP shown in HUD. Milestones unlock visual world changes. | Intrinsic motivation layer — visible progress beyond percentages. | Must Have | S1 |
| FR-2.6 | Weather / streak systemWorld sky and lighting reflects the child's study streak (consecutive logged days). | Ambient accountability — no nagging, but the world itself responds to effort. | Must Have | S1 |
| FR-2.7 | MinimapSmall 2D map in corner shows car position and building locations. | Navigation aid — essential for younger children who can get lost in the world. | Must Have | S1 |
| FR-2.8 | Arcade buildingDistinct building for Maths Arcade access. Opens game picker when entered. | Unifies the two products — child does not need to leave the world to access the Arcade. | Should Have | S3 |
| FR-2.9 | World expansion by gradeWorld map size and complexity grows with grade level. Gr 1–3 is a small neighbourhood; Gr 6–7 is a full town. | Progress feels physical. Advancing a grade is a visual event. | Should Have | S4 |
| FR-2.10 | AI companion (Sage)A small animal companion that follows the car, offers encouragement and topic suggestions via speech bubbles. | Social warmth — many homeschool children miss the social aspect of school. | Could Have | S4 |

### 6.3 Curriculum Management

| ID | Requirement | Rationale | Priority | Sprint |
| --- | --- | --- | --- | --- |
| FR-3.1 | CAPS topic list Gr 1–7All core CAPS subjects and topics for Grades 1–7, grouped by section. No term boundaries — progress-based only. | The product's core data model. Must be comprehensive and correct. | Must Have | S1/S2 |
| FR-3.2 | Three-state topic trackingEach topic cycles: Not Started → In Progress → Done. State persisted to localStorage. | In Progress state is critical — it reflects real homeschool reality where topics take multiple sessions. | Must Have | S1 |
| FR-3.3 | Subject overview with progress %Each subject shows total topics, done count, and percentage. Accessible from dashboard and curriculum screen. | Parents and inspectors need at-a-glance progress evidence. | Must Have | S1 |
| FR-3.4 | Topic annotationsParent can add a private note to any topic (resource used, date covered, child's response). Exported in report card. | Enriches the inspection record beyond checkboxes. | Should Have | S2 |
| FR-3.5 | Weekly plannerDrag-and-drop weekly planner for distributing topics across days. Printable. | Most parents plan their week — this replaces a separate paper/spreadsheet process. | Should Have | S2 |
| FR-3.6 | Homework assignmentParent or tutor can flag topics as assigned homework with a due date. Reflected in world (flag on building) and curriculum view. | Enables tutor sessions to be tracked and followed up. | Should Have | S5 |

### 6.4 Portfolio

| ID | Requirement | Rationale | Priority | Sprint |
| --- | --- | --- | --- | --- |
| FR-4.1 | Manual portfolio entryParent adds portfolio items by typing title, subject, type, rating, and date. No file upload required (metadata only in v1.0). | File system access varies by device; metadata-only entries are universally possible. | Must Have | S1 |
| FR-4.2 | Photo evidence (PWA file picker)Using the PWA File System Access API, parent selects a photo/PDF. File metadata stored; file stored in IndexedDB or base64 in localStorage. | Inspectors require physical evidence. Digitising it reduces the paper burden. | Should Have | S2 |
| FR-4.3 | Inspection PDF exportOne-click print-to-PDF of the portfolio with all items, dates, subjects, and ratings. | The core inspection workflow pain point — this feature alone justifies the subscription. | Must Have | S2 |
| FR-4.4 | Portfolio approval workflowChild submits a "piece of work" from their world view. Parent approves, tags, and rates it via the parent dashboard. | Teaches submission habits. Builds portfolio passively without parent remembering to log things. | Should Have | S3 |

### 6.5 Privacy & Compliance

| ID | Requirement | Rationale | Priority | Sprint |
| --- | --- | --- | --- | --- |
| FR-5.1 | All data on-device by defaultlocalStorage is the only data store. No data transmitted to any server without explicit opt-in. | POPIA requires lawful basis for processing. On-device storage requires no consent. | Must Have | S1 |
| FR-5.2 | No analytics or trackingNo Google Analytics, no Sentry, no usage telemetry of any kind in the default build. | Children's data. Zero tolerance for incidental collection. | Must Have | S1 |
| FR-5.3 | Export & deleteFull data export (JSON backup) and full data delete available from Settings. | POPIA Section 23: data subjects have the right to access and erasure. | Must Have | S1 |
| FR-5.4 | Tutor share is explicit, time-limited, revocableShare tokens expire in 7 days. Can be revoked at any time. Clearly documented in the UI. | POPIA Section 11: processing must be with knowledge and consent of data subject. | Must Have | S5 |
| FR-5.5 | Optional cloud backup is encrypted client-sideBackup passphrase never leaves the device. Server stores an opaque encrypted blob only. | Even if the backup server is compromised, child data cannot be read. | Should Have | S6 |

## 7. Non-Functional Requirements

| Category | Requirement | Acceptance Measure |
| --- | --- | --- |
| Performance | World loads in under 3 seconds on a mid-range Android device | Lighthouse Performance score ≥ 70 on Moto G-class device |
| Offline | Full functionality with DevTools Network set to Offline | All features accessible; no console errors; no CDN failures |
| Load-shedding | App opens from installed icon during Stage 6 (no internet) | Service worker serves all assets from cache on cold start |
| Storage | App functions with up to 50 children, 500 portfolio items, 200 log entries | No performance degradation at these data volumes |
| Accessibility | Keyboard navigable in parent dashboard; D-pad for world navigation | Tab order logical; all interactive elements have focus styles |
| Browser support | Chrome 110+, Edge 110+, Safari 16+ (iOS), Samsung Internet 20+ | All target browsers pass smoke tests |
| Security | No eval(); no inline event handlers in production; Content-Security-Policy header | CSP audit passes; no XSS vectors |
| Data integrity | localStorage write errors caught and surfaced to user | Error boundary wraps all save operations; user notified on failure |

## 8. Technical Architecture

#### 8.1 Technology choices and rationale

| Component | Technology | Rationale |
| --- | --- | --- |
| 3D World | Three.js r128 | Mature, well-documented, works offline, no build step required |
| App framework | Vanilla JS + HTML | No build pipeline = simpler offline deployment; agentic tools work better with single-file targets |
| Data persistence | localStorage (primary) | Universal, offline-first, no server required; IndexedDB for binary assets (photos) |
| Offline strategy | Service Worker + Cache API | PWA standard; allows install to home screen on all platforms |
| Charts | Chart.js (bundled) | Lightweight, well-known, no build step; bundled locally in Sprint 1 |
| Payments | PayFast | SA-native processor; supports card, EFT, SnapScan; no USD conversion |
| Cloud backup | Cloudflare Workers + KV | Minimal infrastructure; global CDN; free tier covers early traction |
| Font | System font stack | No web font requests = faster offline cold start; no GDPR/POPIA font CDN issues |

#### 8.2 File structure

homeschool-hub/ ├── index.html ← Entire app (world + LMS + dashboard) ├── sw.js ← Service worker (cache strategy + offline routing) ├── manifest.json ← PWA manifest (install, icons, theme) ├── lib/ │ ├── three.min.js ← Three.js r128 (bundled locally) │ └── chart.min.js ← Chart.js (bundled locally) ├── data/ │ ├── curriculum.js ← CAPS topic data Gr 1–7 (JS object, no fetch needed) │ └── arcade-games.js ← Arcade game descriptors + CAPS topic tags ├── docs/ │ ├── arcade-api.md ← postMessage protocol for Arcade integration │ └── privacy.md ← POPIA compliance documentation └── functions/ ├── payfast-itn.js ← Serverless ITN handler (Cloudflare Worker) └── backup-worker.js← Encrypted backup store (Cloudflare Worker + KV)

#### 8.3 State schema (localStorage: hs-state)

{ children: [{ id, name, grade, initials, color, carColor, carName, houseStyle }], progress: { [childId]: { [topicId]: { state: 0|1|2, completedAt?: ISODate } } }, xp: { [childId]: number }, milestones: { [childId]: number[] }, // achieved XP thresholds portfolio: { [childId]: PortfolioItem[] }, log: { [childId]: LogEntry[] }, notes: { [childId]: { [topicId]: string } }, planner: { [childId]: { [weekKey]: { [day]: topicId[] } } }, homework: { [childId]: { topicId, dueDate, assignedBy, completedAt? }[] }, shares: { [token]: { childId, expiresAt, createdAt } }, centreRoster: string[], subscription: { plan: "free"|"family"|"coop", expiresAt: ISODate, paymentRef: string }, pin: string, centrePin: string, arcadeOrigins: string[], // allowed postMessage origins backupEnabled: boolean, deviceId: string // UUID for cloud backup key }

## 9. Commercial Model

#### 9.1 Pricing tiers

| Feature | Free | Family R99/mo | Co-op R299/mo |
| --- | --- | --- | --- |
| Children | 1 | Up to 4 | Up to 20 |
| Grades | 1 (current) | Gr 1–7 | Gr 1–9 |
| Portfolio items | 10 | Unlimited | Unlimited |
| EdTech app links | 3 | Unlimited | Unlimited |
| Report card PDF | No | Yes | Yes (cohort) |
| Planner | No | Yes | Yes |
| Backup & restore | No | Yes | Yes |
| Tutor share link | No | Yes | Yes |
| Centre dashboard | No | No | Yes |
| Homework assignment | No | Yes | Yes |
| Annual discount | — | R799/yr (33% off) | R2,999/yr (16% off) |

#### 9.2 Go-to-market strategy

- Phase 1 (months 1–3): Launch free plan publicly. Target SA homeschool Facebook groups (SAHSA, Pestalozzi, regional groups). Post a screen recording of the 3D world. No paid advertising.
- Phase 2 (months 3–6): Introduce Family plan with PayFast. Offer existing free users a 3-month free trial. Collect testimonials from early families.
- Phase 3 (months 6–12): Launch Co-op plan. Reach out to 20 identified learning centres via email and WhatsApp. Offer a 60-day free Co-op trial.
- Phase 4 (year 2): Maths Arcade as a standalone product. Referral program between LMS and Arcade users. Tutor directory with revenue share on referred subscriptions.
#### 9.3 Key metrics

| Metric | 3-month target | 12-month target |
| --- | --- | --- |
| Free plan signups | 500 | 3,000 |
| Free → Family conversion | 5% | 8% |
| Family plan MRR | R5,000 | R35,000 |
| Co-op plans active | 0 | 15 |
| DAU / MAU ratio (child world) | — | 40%+ |
| Churn rate (Family) | — | <5% monthly |

## 10. Success Criteria for v1.0 Release

- All Sprint 1–3 tasks complete and tested
- App passes full offline test (DevTools → Network → Offline, cold start)
- Portfolio PDF prints correctly on Chrome (Windows), Chrome (Android), and Safari (iOS)
- CAPS curriculum data validated by at least 2 independent homeschool parents
- PayFast integration tested end-to-end in sandbox environment
- POPIA compliance review completed with reference to docs/privacy.md
- Lighthouse Performance score ≥ 70 on a throttled mid-range mobile connection
- At least 5 beta families have used it for 2+ consecutive weeks without data loss
## 11. Risks & Mitigations

| Risk | Likelihood / Impact | Mitigation |
| --- | --- | --- |
| CAPS curriculum data is inaccurate | Low / High | Validate with 3 independent homeschool parents before launch. Include a "report error" button for crowdsourced corrections. |
| localStorage size limit hit by heavy users | Medium / Medium | Monitor storage usage in Settings. Migrate binary assets to IndexedDB in Sprint 2. Show warning at 80% capacity. |
| PayFast integration complexity delays Sprint 6 | Medium / Medium | Begin PayFast sandbox testing in Sprint 4 in parallel. Payment can launch after core features. |
| Three.js performance on low-end devices | Medium / High | Implement LOD (level of detail) — reduce geometry complexity on devices with < 2GB RAM via device memory API. |
| SA homeschool market smaller than modelled | Low / High | Product works equally well for private tutors and micro-schools — pivot B2B if B2C growth is slow. |
| Competitor copies the 3D world concept | Low / Medium | The moat is not the technology — it is the CAPS data, the community trust, and the portfolio-to-inspection workflow. Build those deeply. |

## 12. Glossary

| Term | Definition |
| --- | --- |
| CAPS | Curriculum and Assessment Policy Statement — the national curriculum framework for South African schools, Grades R–12. |
| POPIA | Protection of Personal Information Act — South African data privacy law, equivalent in intent to GDPR. |
| Foundation Phase | CAPS Grades R–3. Distinct from Intermediate Phase (Gr 4–6) and Senior Phase (Gr 7–9) in structure and subject names. |
| Intermediate Phase | CAPS Grades 4–6. The primary target for HomeSchool Hub v1.0. |
| PWA | Progressive Web App — a web application installable on device, capable of working offline via a Service Worker. |
| XP | Experience Points — a gamification currency awarded for completing CAPS topics and daily challenges. Drives world unlocks. |
| Inspection | A periodic review by a provincial education department official of a homeschooled child's portfolio and curriculum progress. Required by the Schools Act. |
| ITN | Instant Transaction Notification — PayFast's server-to-server payment confirmation callback. |
| postMessage API | Browser API for cross-origin communication between windows/iframes. Used to bridge the LMS and Maths Arcade. |
| Sage | The in-world AI companion character — a small animal that follows the car and provides encouragement and suggestions. |
