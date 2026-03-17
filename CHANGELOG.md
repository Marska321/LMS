# Changelog

## v0.6.0 - 2026-03-17

- Added local plan-tier gates across the main app and standalone parent dashboard for Free, Family, and Co-op preview flows.
- Enforced limits and locks for learner count, portfolio evidence, homework assignment, tutor share links, report export, backup/restore, materials access, and centre dashboard access.
- Added plan-aware Settings and Plans & Pricing UI so feature-gate behavior can be tested before real billing is integrated.
- Fixed offline cache coverage for world texture colormaps so the localhost PWA can reload correctly while offline.
- Verified standalone parent dashboard direct-entry flow and localhost service-worker offline reload behavior in browser smoke testing.
