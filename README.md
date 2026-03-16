# 🌿 HomeSchool Hub — CAPS Learning World

A gamified, private, offline-first homeschool LMS for South African families using the CAPS curriculum.

---

## ✨ Features

- **3D Driving World** — child drives a car around a campus, pulls up to subject buildings to enter
- **Full CAPS Curriculum** — Grades 4–7, all subjects, all topics listed flat (no terms — progress-based)
- **Topic tracking** — tap to cycle: Not Started → In Progress → Done, with XP rewards
- **Portfolio** — add photos, worksheets, projects; export PDF for inspection
- **Learning Log** — daily journal entries that build your inspection record
- **Multi-child** — switch between learners, each with own progress & XP
- **Parent Dashboard** — separate PIN-protected view for oversight, exports, and admin tasks
- **Offline-ready PWA** — works with no internet; installs like an app on phone/tablet/desktop
- **POPIA compliant** — zero data leaves the device; no accounts, no cloud, no ads
- **Backup/restore** — export a JSON backup, restore from file anytime

---

## 🚀 Getting Started (No Install Needed)

### Option A — Open directly in browser
Just open `index.html` in Chrome, Edge, or Firefox. Works offline after first load.

### Option B — Install as PWA (Recommended)
1. Open `index.html` in Chrome
2. Click the install icon in the address bar (or browser menu → "Install HomeSchool Hub")
3. The app installs to your device — works like a native app, fully offline

### Option C — Host locally with a simple server (for PWA features)
```bash
# Python 3
cd homeschool-lms
python3 -m http.server 8080
# Then open http://localhost:8080 in your browser
```

### Option D — Host on a local network (for tablet/phone access)
```bash
python3 -m http.server 8080 --bind 0.0.0.0
# On phone/tablet: open http://YOUR_PC_IP:8080
# Find your IP with: ip addr (Linux/Mac) or ipconfig (Windows)
```

---

## 📁 File Structure

```
homeschool-lms/
├── index.html          ← App shell / screens
├── sw.js               ← Service worker (offline caching)
├── manifest.json       ← PWA manifest (installability)
├── lib/
│   └── three.min.js    ← Local Three.js runtime for offline boot
├── css/
│   └── app.css         ← App styling
├── js/
│   ├── app.js          ← LMS, state, dashboard, settings
│   └── world.js        ← 3D world logic
├── parent-dashboard/
│   └── index.html      ← PIN-protected parent/admin dashboard
├── data/
│   └── curriculum.js   ← Full CAPS topic lists, Grades 4–7
└── README.md
```

---

## 🎮 Controls

| Input | Action |
|-------|--------|
| Arrow keys / WASD | Drive the car |
| Space / Enter | Enter a building |
| Tab | Open overview dashboard |

**Mobile:** Use the on-screen D-pad buttons.

---

## 📋 Subjects Covered (Grades 4–7)

- Mathematics
- English Home Language
- Natural Sciences & Technology
- Social Sciences (History & Geography)
- Afrikaans First Additional Language
- Life Skills

---

## 🏫 For Inspections

The portfolio screen has an **Export Portfolio PDF** button that triggers a print dialog — use "Save as PDF" to generate an inspection-ready document containing:
- Child profile and grade
- Portfolio items with dates and subjects
- CAPS curriculum progress per subject
- Learning log entries

---

## 🔒 Privacy & POPIA

- All data is stored in the browser's **localStorage** — on the device only
- Nothing is ever sent anywhere
- No accounts, no login, no tracking, no analytics
- Backup is a local JSON file you download yourself
- Completely private — safe for children's personal learning data

---

## 🛠 Adding More Children

On the intro screen, tap **"Add Child"** and enter the name and grade. Each child has their own:
- Curriculum progress (independent)
- XP and achievements
- Portfolio items
- Learning log

---

## 🗺 Expanding the World

The 3D world uses a local copy of Three.js (`r128`) at `lib/three.min.js`, so the app can boot without fetching the runtime from a CDN.
The world logic lives in `js/world.js`; app and LMS state live in `js/app.js`.

---

## 🌱 Roadmap Ideas

- [ ] EdTech app launcher (Khan Academy, Duolingo, Desmos links)
- [ ] Materials library (catalogue books, manipulatives, kits)
- [ ] Achievement badges and unlockable car colours
- [ ] World expands as grade progresses (new buildings unlock)
- [ ] Weather changes based on study streak
- [ ] Audio recording for oral assessments in portfolio
- [ ] Print view per subject (topical list for planning)
- [ ] Second language (Zulu / Xhosa) support

---

Made with ♥ for South African homeschool families.
