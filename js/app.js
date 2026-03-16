/* ═══════════════════════════════════════════════════════
   STATE & STORAGE
════════════════════════════════════════════════════════ */
const DEFAULT_CHILDREN = [
  { id:'child-1', name:'Joshua', grade:6, initials:'JD', color:'#2d6a4f' },
  { id:'child-2', name:'Elijah', grade:4, initials:'ED', color:'#1d6fa4' },
];
const CAR_COLOR_OPTIONS = ['#FF4444','#4488FF','#44BB44','#FFAA00','#AA44FF','#FF88AA','#44DDDD','#FFEE44'];
const DEFAULT_CAR_NAME = 'Road Runner';

function loadState() {
  try { return JSON.parse(localStorage.getItem('hs-state')) || {}; } catch{ return {}; }
}
function saveState(s) { localStorage.setItem('hs-state', JSON.stringify(s)); }

let STATE = loadState();
if (!STATE.children) STATE.children = DEFAULT_CHILDREN;
if (!STATE.progress) STATE.progress = {};    // { childId: { topicId: 0|1|2 } }
if (!STATE.xp) STATE.xp = {};               // { childId: number }
if (!STATE.portfolio) STATE.portfolio = {};  // { childId: [] }
if (!STATE.log) STATE.log = {};              // { childId: [] }
if (!STATE.pin) STATE.pin = '1234';
if (!STATE.milestones) STATE.milestones = {};
STATE.children = STATE.children.map((child, index) => ({
  ...child,
  carColor: child.carColor || child.color || CAR_COLOR_OPTIONS[index % CAR_COLOR_OPTIONS.length],
  carName: child.carName || DEFAULT_CAR_NAME,
  carSetupDone: Boolean(child.carSetupDone),
}));

let activeChildId = null;
let activeSubject = null;
let worldReady = false;
let worldFallbackShown = false;
let currentScreen = 'intro';
let parentModeUnlocked = false;
let pendingParentAction = null;
let parentPinEntry = '';
let pendingCarSetupMandatory = false;
let selectedCarColor = CAR_COLOR_OPTIONS[0];
let pendingWorldEffects = [];
let deferredInstallPrompt = null;
let installPromptAvailable = false;
let worldBooting = false;

const PARENT_SCREENS = ['dash', 'portfolio', 'log'];

function getChild() { return STATE.children.find(c => c.id === activeChildId); }
function getPreferredChildId() {
  if (STATE.lastActiveChildId && STATE.children.some(child => child.id === STATE.lastActiveChildId)) {
    return STATE.lastActiveChildId;
  }
  return STATE.children[0]?.id || null;
}
function getProgress(childId) { return STATE.progress[childId] || {}; }
function isParentScreen(id) { return PARENT_SCREENS.includes(id); }
function getCarName(child) { return child?.carName || DEFAULT_CAR_NAME; }
function getCarColor(child) { return child?.carColor || child?.color || CAR_COLOR_OPTIONS[0]; }
function getMilestoneUnlocks(childId) {
  const xp = STATE.xp[childId] || 0;
  return [100, 250, 500, 1000].filter(threshold => xp >= threshold);
}
function syncMilestones(childId) {
  STATE.milestones[childId] = getMilestoneUnlocks(childId);
}
function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function getInstallState() {
  if (isStandaloneMode()) return 'installed';
  if (installPromptAvailable) return 'prompt';
  if (isIosDevice()) return 'ios';
  return 'unavailable';
}
function isWorldVisible() {
  return !document.getElementById('screen-world').classList.contains('hidden');
}
function getSubjectForTopic(grade, topicId) {
  const subjects = CAPS_CURRICULUM[grade] || {};
  for (const [subjectName, subjectData] of Object.entries(subjects)) {
    if ((subjectData.topics || []).some(topic => topic.id === topicId)) return subjectName;
  }
  return null;
}
function queueWorldCompletionEffect(childId, topicId, amount) {
  const child = STATE.children.find(entry => entry.id === childId);
  if (!child || !topicId) return;
  const subject = getSubjectForTopic(child.grade, topicId);
  if (!subject) return;

  const effect = { childId, topicId, amount, subject };
  if (typeof triggerWorldCompletionEffect === 'function' && isWorldVisible() && childId === activeChildId) {
    const triggered = triggerWorldCompletionEffect(effect);
    if (triggered) return;
  }

  pendingWorldEffects.push(effect);
}
function flushPendingWorldEffects() {
  if (typeof triggerWorldCompletionEffect !== 'function' || !isWorldVisible()) return;
  pendingWorldEffects = pendingWorldEffects.filter(effect => {
    if (effect.childId !== activeChildId) return true;
    return !triggerWorldCompletionEffect(effect);
  });
}
function getLocalDateParts(date = new Date()) {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
  };
}
function toLocalISODate(date = new Date()) {
  const { year, month, day } = getLocalDateParts(date);
  return [
    String(year).padStart(4, '0'),
    String(month + 1).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');
}
function fromISODate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function getUniqueLogDates(childId) {
  const entries = STATE.log[childId] || [];
  return [...new Set(entries.map(entry => entry.date).filter(Boolean))]
    .filter(dateStr => fromISODate(dateStr))
    .sort((a, b) => fromISODate(b) - fromISODate(a));
}
function getStudyStreak(childId) {
  const dates = new Set(getUniqueLogDates(childId));
  let streak = 0;
  let cursor = new Date();
  while (dates.has(toLocalISODate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
function getDaysSinceLastLog(childId) {
  const latest = getUniqueLogDates(childId)[0];
  if (!latest) return Infinity;
  const latestDate = fromISODate(latest);
  const today = fromISODate(toLocalISODate());
  return Math.floor((today - latestDate) / 86400000);
}
function getWeatherState(childId) {
  const streak = getStudyStreak(childId);
  const daysSinceLastLog = getDaysSinceLastLog(childId);
  let mode = 'overcast';
  if (daysSinceLastLog >= 3) mode = 'rainy';
  else if (streak >= 3) mode = 'sunny';
  else if (streak >= 1) mode = 'partly-cloudy';
  return { streak, daysSinceLastLog, mode };
}

function setTopicState(childId, topicId, val) {
  if (!STATE.progress[childId]) STATE.progress[childId] = {};
  const old = STATE.progress[childId][topicId] || 0;
  STATE.progress[childId][topicId] = val;
  saveState(STATE);
  if (val > old && val === 2) awardXP(childId, 10, topicId);
  updateHUD();
}

function awardXP(childId, amt, topicId) {
  STATE.xp[childId] = (STATE.xp[childId]||0) + amt;
  syncMilestones(childId);
  saveState(STATE);
  showXPToast(amt);
  updateBuildingProgress();
  queueWorldCompletionEffect(childId, topicId, amt);
  if (typeof refreshWorldMilestones === 'function') refreshWorldMilestones();
}

/* ═══════════════════════════════════════════════════════
   INTRO SCREEN
════════════════════════════════════════════════════════ */
function renderIntro() {
  const c = document.getElementById('child-cards-container');
  c.innerHTML = '';
  STATE.children.forEach(ch => {
    const el = document.createElement('div');
    el.className = 'child-card';
    el.id = 'cc-' + ch.id;
    el.innerHTML = `
      <div class="child-card-avatar" style="background:${ch.color}">${ch.initials}</div>
      <div class="child-card-name">${ch.name}</div>
      <div class="child-card-grade">Grade ${ch.grade} · CAPS</div>`;
    el.onclick = () => selectChild(ch.id);
    c.appendChild(el);
  });
  // Add child card
  const add = document.createElement('div');
  add.className = 'child-card add-child-card';
  add.innerHTML = `<div class="child-card-avatar" style="background:rgba(255,255,255,.1)">+</div>
    <div class="child-card-name">Add Child</div>
    <div class="child-card-grade">New learner</div>`;
  add.onclick = addChild;
  c.appendChild(add);
}

function selectChild(id) {
  activeChildId = id;
  STATE.lastActiveChildId = id;
  saveState(STATE);
  document.querySelectorAll('.child-card').forEach(el => el.classList.remove('selected'));
  const el = document.getElementById('cc-' + id);
  if (el) el.classList.add('selected');
  document.getElementById('enter-world-btn').disabled = false;
}

function addChild() {
  const name = prompt('Child\'s name?');
  if (!name) return;
  const grade = parseInt(prompt('Grade? (4, 5, 6, or 7)'));
  if (![4,5,6,7].includes(grade)) { alert('Grade must be 4–7'); return; }
  const initials = name.substring(0,2).toUpperCase();
  const colors = ['#2d6a4f','#1d6fa4','#6b4fbb','#e9961a','#c0392b'];
  const col = colors[STATE.children.length % colors.length];
  const ch = {
    id: 'child-' + Date.now(),
    name,
    grade,
    initials,
    color: col,
    carColor: CAR_COLOR_OPTIONS[STATE.children.length % CAR_COLOR_OPTIONS.length],
    carName: DEFAULT_CAR_NAME,
    carSetupDone: false,
  };
  STATE.children.push(ch);
  saveState(STATE);
  renderIntro();
  selectChild(ch.id);
}

async function enterWorld() {
  if (!activeChildId) return;
  if (worldBooting) return;
  worldBooting = true;
  const ch = getChild();
  syncMilestones(ch.id);
  document.getElementById('hud-child-name').textContent = ch.name + '\'s World';
  document.getElementById('hud-child-grade').textContent = 'Grade ' + ch.grade + ' · CAPS';
  document.getElementById('hud-car-name').textContent = 'Car: ' + getCarName(ch);
  updateHUD();
  const enterBtn = document.getElementById('enter-world-btn');
  const previousLabel = enterBtn ? enterBtn.textContent : '';
  if (enterBtn) {
    enterBtn.disabled = true;
    enterBtn.textContent = 'Loading world...';
  }
  try {
    if (!worldReady) {
      const worldStarted = await initWorld();
      if (!worldStarted) {
        showWorldFallback();
        return;
      }
    } else if (typeof resetWorldForActiveChild === 'function') {
      resetWorldForActiveChild();
    }
    showScreen('world');
    if (typeof refreshWeather === 'function') refreshWeather();
    if (typeof refreshWorldMilestones === 'function') refreshWorldMilestones();
    flushPendingWorldEffects();
    maybeOpenCarSetup();
  } finally {
    worldBooting = false;
    if (enterBtn) {
      enterBtn.disabled = false;
      enterBtn.textContent = previousLabel || '🚗 Enter Learning World';
    }
  }
}

function goToWorld() {
  if (!activeChildId) return;
  if (isParentScreen(currentScreen) && parentModeUnlocked) {
    lockParentMode();
    return;
  }
  if (!worldReady) {
    enterWorld();
    return;
  }
  updateHUD();
  showScreen('world');
  if (typeof onResize === 'function') onResize();
}

function showWorldFallback() {
  showScreen('dash', { bypassParentGate: true });
  if (worldFallbackShown) return;
  worldFallbackShown = true;
  alert('The 3D learning world is unavailable on this device right now.\n\nOpening the dashboard instead so you can keep working.');
}

function openParentDashboard() {
  promptParentAccess({ type: 'screen', id: 'dash' });
}

function openStandaloneParentDashboard() {
  window.open('./parent-dashboard/index.html', '_blank');
}

/* ═══════════════════════════════════════════════════════
   SCREEN MANAGER
════════════════════════════════════════════════════════ */
const LMS_SCREENS = ['lms','dash','portfolio','log'];
function showScreen(id, options = {}) {
  if (isParentScreen(id) && !parentModeUnlocked && !options.bypassParentGate) {
    promptParentAccess({ type: 'screen', id });
    return;
  }
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById('screen-' + id);
  if (el) { el.classList.remove('hidden'); el.classList.add('pop-in'); }
  currentScreen = id;
  const nav = document.getElementById('bottom-nav');
  if (['lms','dash','portfolio','log'].includes(id)) {
    nav.style.display = 'flex';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const nb = document.getElementById('nav-' + id) || document.getElementById('nav-dash');
    if (nb) nb.classList.add('active');
  } else {
    nav.style.display = 'none';
  }
  if (id === 'dash') renderDashboard();
  if (id === 'portfolio') renderPortfolio();
  if (id === 'log') renderLog();
}

/* ═══════════════════════════════════════════════════════
   CURRICULUM HELPERS
════════════════════════════════════════════════════════ */
function calcProgress(childId, grade, subject) {
  const topics = CAPS_CURRICULUM[grade]?.[subject]?.topics || [];
  if (!topics.length) return 0;
  const prog = getProgress(childId);
  const done = topics.filter(t => (prog[t.id]||0) === 2).length;
  return Math.round((done / topics.length) * 100);
}

function calcTotals(childId, grade) {
  const subjects = CAPS_CURRICULUM[grade] || {};
  let total = 0, done = 0;
  const prog = getProgress(childId);
  Object.values(subjects).forEach(sub => {
    sub.topics.forEach(t => {
      total++;
      if ((prog[t.id]||0) === 2) done++;
    });
  });
  return { total, done };
}

/* ═══════════════════════════════════════════════════════
   SUBJECT LMS SCREEN
════════════════════════════════════════════════════════ */
function openSubject(subjectName) {
  activeSubject = subjectName;
  const ch = getChild();
  const sub = CAPS_CURRICULUM[ch.grade]?.[subjectName];
  if (!sub) return;

  document.getElementById('lms-icon').textContent = sub.icon;
  document.getElementById('lms-title').textContent = subjectName;
  document.getElementById('screen-lms').style.setProperty('--subj-color', sub.color);

  renderSubject(subjectName, sub, ch);
  showScreen('lms');
}

function renderSubject(name, sub, ch) {
  const body = document.getElementById('lms-body');
  const prog = getProgress(ch.id);
  const topics = sub.topics;
  const done = topics.filter(t => (prog[t.id]||0) === 2).length;
  const inProg = topics.filter(t => (prog[t.id]||0) === 1).length;
  const pct = Math.round((done/topics.length)*100);
  const xp = STATE.xp[ch.id] || 0;

  let html = `
    <div class="progress-header slide-up">
      <div class="progress-circle" style="background:${sub.color}">${sub.icon}</div>
      <div class="progress-info">
        <div class="progress-label">Progress — ${name}</div>
        <div class="progress-count" style="color:${sub.color}">${done} <span style="font-size:14px;color:var(--text3)">/ ${topics.length} topics</span></div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%;background:${sub.color}"></div>
        </div>
      </div>
      <div class="xp-badge">⭐ ${xp} XP</div>
    </div>`;

  // Group by section
  const sections = {};
  topics.forEach(t => {
    if (!sections[t.section]) sections[t.section] = [];
    sections[t.section].push(t);
  });

  Object.entries(sections).forEach(([sec, ts]) => {
    const secDone = ts.filter(t => (prog[t.id]||0) === 2).length;
    html += `<div class="section-label">${sec} <span style="font-weight:400;opacity:.7">(${secDone}/${ts.length})</span></div>`;
    ts.forEach(t => {
      const state = prog[t.id] || 0;
      const stateClass = state === 2 ? 'done' : state === 1 ? 'partial' : '';
      const checkClass = state === 2 ? 'done' : state === 1 ? 'partial' : '';
      const checkIcon = state === 2 ? '✓' : state === 1 ? '◆' : '';
      const titleClass = state === 2 ? 'done' : '';
      const statusText = state === 2 ? 'Done' : state === 1 ? 'In progress' : 'Not started';
      const statusClass = state === 2 ? 'status-done' : state === 1 ? 'status-partial' : 'status-none';
      html += `
        <div class="topic-row ${stateClass} slide-up" onclick="cycleTopic('${t.id}', this)">
          <div class="topic-check ${checkClass}">${checkIcon}</div>
          <div class="topic-title ${titleClass}">${t.title}</div>
          <span class="topic-status ${statusClass}">${statusText}</span>
        </div>`;
    });
  });

  body.innerHTML = html;
}

function cycleTopic(topicId, rowEl) {
  const ch = getChild();
  const prog = getProgress(ch.id);
  const cur = prog[topicId] || 0;
  const next = (cur + 1) % 3;
  setTopicState(ch.id, topicId, next);

  // Update UI immediately
  const check = rowEl.querySelector('.topic-check');
  const title = rowEl.querySelector('.topic-title');
  const status = rowEl.querySelector('.topic-status');

  rowEl.classList.remove('done','partial');
  check.classList.remove('done','partial');
  title.classList.remove('done');

  if (next === 2) {
    rowEl.classList.add('done'); check.classList.add('done'); check.textContent = '✓';
    title.classList.add('done');
    status.textContent = 'Done'; status.className = 'topic-status status-done';
    spawnXPFloat(rowEl);
  } else if (next === 1) {
    rowEl.classList.add('partial'); check.classList.add('partial'); check.textContent = '◆';
    status.textContent = 'In progress'; status.className = 'topic-status status-partial';
  } else {
    check.textContent = '';
    status.textContent = 'Not started'; status.className = 'topic-status status-none';
  }

  // Refresh progress header
  const ch2 = getChild();
  const sub = CAPS_CURRICULUM[ch2.grade]?.[activeSubject];
  if (sub) {
    const topics = sub.topics;
    const p2 = getProgress(ch2.id);
    const done2 = topics.filter(t => (p2[t.id]||0) === 2).length;
    const pct2 = Math.round((done2/topics.length)*100);
    const cnt = document.querySelector('.progress-count');
    const bar = document.querySelector('.progress-bar-fill');
    if (cnt) cnt.innerHTML = `${done2} <span style="font-size:14px;color:var(--text3)">/ ${topics.length} topics</span>`;
    if (bar) bar.style.width = pct2 + '%';
  }
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD SCREEN
════════════════════════════════════════════════════════ */
function renderDashboard() {
  const ch = getChild();
  if (!ch) return;
  const { total, done } = calcTotals(ch.id, ch.grade);
  const xp = STATE.xp[ch.id] || 0;
  const subjects = CAPS_CURRICULUM[ch.grade] || {};

  let html = `
    <div class="dash-hello">Good day, ${ch.name}! 🌤</div>
    <div class="dash-sub">${new Date().toLocaleDateString('en-ZA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})} · Grade ${ch.grade} CAPS</div>
    <div class="stat-row">
      <div class="stat-box">
        <div class="stat-lbl">Topics done</div>
        <div class="stat-val" style="color:var(--green)">${done}</div>
        <div class="stat-prog"><div class="stat-prog-fill" style="background:var(--green);width:${Math.round(done/total*100)||0}%"></div></div>
      </div>
      <div class="stat-box">
        <div class="stat-lbl">Total topics</div>
        <div class="stat-val">${total}</div>
        <div class="stat-prog"><div class="stat-prog-fill" style="background:var(--blue);width:100%"></div></div>
      </div>
      <div class="stat-box">
        <div class="stat-lbl">XP earned</div>
        <div class="stat-val" style="color:var(--amber)">⭐${xp}</div>
        <div class="stat-prog"><div class="stat-prog-fill" style="background:var(--amber);width:${Math.min(xp/1000*100,100)}%"></div></div>
      </div>
      <div class="stat-box">
        <div class="stat-lbl">Portfolio</div>
        <div class="stat-val" style="color:var(--purple)">${(STATE.portfolio[ch.id]||[]).length}</div>
        <div class="stat-prog"><div class="stat-prog-fill" style="background:var(--purple);width:100%"></div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Subjects · Grade ${ch.grade}</div>`;

  Object.entries(subjects).forEach(([name, sub]) => {
    const pct = calcProgress(ch.id, ch.grade, name);
    const topics = sub.topics;
    const prog = getProgress(ch.id);
    const d = topics.filter(t => (prog[t.id]||0)===2).length;
    html += `
      <div class="subj-row" style="cursor:pointer" onclick="openSubject('${name}')">
        <div class="subj-dot" style="background:${sub.color}"></div>
        <div class="subj-name">${sub.icon} ${name}</div>
        <div style="font-family:sans-serif;font-size:11px;color:var(--text3);margin-right:8px">${d}/${topics.length}</div>
        <div class="subj-bar"><div class="subj-bar-fill" style="background:${sub.color};width:${pct}%"></div></div>
        <div class="subj-pct">${pct}%</div>
      </div>`;
  });
  html += `</div>

  <div class="card">
    <div class="card-title">Quick Actions</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button onclick="goToWorld()" style="padding:11px;border-radius:10px;border:1px solid var(--border);background:var(--green-bg);color:var(--green);font-family:sans-serif;font-size:13px;font-weight:700;cursor:pointer">🌍 Back to World</button>
      <button onclick="showScreen('portfolio')" style="padding:11px;border-radius:10px;border:1px solid var(--border);background:var(--purple-bg);color:var(--purple);font-family:sans-serif;font-size:13px;font-weight:700;cursor:pointer">📁 Portfolio</button>
      <button onclick="logToday()" style="padding:11px;border-radius:10px;border:1px solid var(--border);background:var(--blue-bg);color:var(--blue);font-family:sans-serif;font-size:13px;font-weight:700;cursor:pointer">📅 Log Today</button>
      <button onclick="showModal('settings')" style="padding:11px;border-radius:10px;border:1px solid var(--border);background:var(--surface2);color:var(--text2);font-family:sans-serif;font-size:13px;font-weight:700;cursor:pointer">⚙️ Settings</button>
    </div>
  </div>`;

  document.getElementById('dash-body').innerHTML = html;
}

/* ═══════════════════════════════════════════════════════
   PORTFOLIO SCREEN
════════════════════════════════════════════════════════ */
function renderPortfolio() {
  const ch = getChild();
  const items = STATE.portfolio[ch.id] || [];

  const sampleItems = [
    { id:'p1', title:'Fractions worksheet — mixed ops', subject:'Mathematics', type:'Worksheet', icon:'📄', grade:'★★★', date:'14 Mar 2026', color:'#d8f3dc', tagColor:'var(--green)', tagBg:'var(--green-bg)' },
    { id:'p2', title:'Photosynthesis diagram', subject:'Natural Sciences', type:'Drawing', icon:'🎨', grade:'★★☆', date:'10 Mar 2026', color:'#ede8fb', tagColor:'var(--purple)', tagBg:'var(--purple-bg)' },
    { id:'p3', title:'Short story: "The Kalahari"', subject:'English HL', type:'Writing', icon:'✍️', grade:'★★★', date:'5 Mar 2026', color:'#dbeeff', tagColor:'var(--blue)', tagBg:'var(--blue-bg)' },
    { id:'p4', title:'Bridge project report', subject:'Technology', type:'Project', icon:'🏗️', grade:'★★☆', date:'1 Mar 2026', color:'#fef3d7', tagColor:'var(--amber)', tagBg:'var(--amber-bg)' },
  ];
  const all = [...sampleItems, ...items];

  let html = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <div style="font-size:22px;font-weight:700;letter-spacing:-.5px;flex:1;color:var(--text)">📁 Portfolio</div>
      <button onclick="addPortfolioItem()" style="background:var(--green);color:#fff;border:none;padding:8px 14px;border-radius:8px;font-family:sans-serif;font-size:13px;font-weight:700;cursor:pointer">+ Add</button>
    </div>
    <div style="font-family:sans-serif;font-size:13px;color:var(--text2);margin-bottom:16px;background:var(--blue-bg);border-radius:10px;padding:10px 14px;">
      📋 ${all.length} items · Ready for CAPS inspection export
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">`;

  all.forEach(item => {
    html += `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);padding:14px;cursor:pointer;transition:all .2s" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
        <div style="height:70px;border-radius:8px;background:${item.color};display:flex;align-items:center;justify-content:center;font-size:30px;margin-bottom:10px">${item.icon}</div>
        <div style="font-family:sans-serif;font-size:13px;font-weight:600;margin-bottom:3px;color:var(--text)">${item.title}</div>
        <div style="font-family:sans-serif;font-size:11px;color:var(--text3);margin-bottom:7px">${item.subject} · ${item.date}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <span style="background:${item.tagBg};color:${item.tagColor};font-family:sans-serif;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px">${item.type}</span>
          <span style="background:var(--amber-bg);color:var(--amber);font-family:sans-serif;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px">${item.grade}</span>
        </div>
      </div>`;
  });

  html += `</div>
    <div class="upload-drop" style="margin-top:16px" onclick="addPortfolioItem()">
      <div class="upload-icon">📎</div>
      <div class="upload-text"><strong>Tap to add evidence</strong><br>
        Photos of work, PDFs, audio recordings, written entries<br>
        <span style="font-size:11px;color:var(--text3)">Stored on this device only · POPIA compliant</span>
      </div>
    </div>
    <div style="margin-top:16px">
      <button onclick="exportPortfolio()" style="width:100%;padding:13px;background:var(--green);color:#fff;border:none;border-radius:12px;font-family:sans-serif;font-size:14px;font-weight:700;cursor:pointer">
        📄 Export Portfolio PDF (for inspection)
      </button>
    </div>`;

  document.getElementById('portfolio-body').innerHTML = html;
}

function addPortfolioItem() {
  const title = prompt('What did ' + getChild().name + ' make or do?');
  if (!title) return;
  const subject = prompt('Which subject? (e.g. Mathematics)') || 'General';
  const type = prompt('Type? (e.g. Worksheet, Drawing, Writing, Project, Test)') || 'Work';
  const ch = getChild();
  if (!STATE.portfolio[ch.id]) STATE.portfolio[ch.id] = [];
  STATE.portfolio[ch.id].push({
    id: 'p' + Date.now(), title, subject, type,
    icon: '📄', grade: '★★☆', date: new Date().toLocaleDateString('en-ZA'),
    color: '#f4f2ed', tagColor: 'var(--text2)', tagBg: 'var(--surface2)'
  });
  saveState(STATE);
  renderPortfolio();
}

function exportPortfolio() {
  alert('📄 Portfolio export\n\nThis will generate a PDF with:\n• Child profile & grade\n• All portfolio items with dates\n• CAPS curriculum progress per subject\n• Learning log entries\n\nFor full PDF generation, open in a desktop browser and use File → Print → Save as PDF.');
}

/* ═══════════════════════════════════════════════════════
   LEARNING LOG
════════════════════════════════════════════════════════ */
function renderLog() {
  const ch = getChild();
  const entries = STATE.log[ch.id] || [];

  const sampleEntries = [
    { date:'2026-03-16', subjects:'Mathematics, English', time:'3h 15min', mood:'😊 Great', notes:'Fractions with unlike denominators using fraction circles. Read chapter 3 of novel. Discussed setting and characters.' },
    { date:'2026-03-13', subjects:'Natural Sciences, Afrikaans', time:'2h 45min', mood:'😄 Excellent', notes:'Water cycle — drew and labelled diagram. Afrikaans: 20 new vocab words + Duolingo 2 lessons.' },
    { date:'2026-03-12', subjects:'Mathematics, Social Sciences', time:'3h 00min', mood:'😊 Great', notes:'Geometry: properties of 2D shapes. SA history: Cape sea route explorers.' },
  ];
  const all = [...(entries.length ? entries : sampleEntries)];

  let html = `<div style="display:flex;gap:10px;margin-bottom:16px;align-items:center">
    <div style="font-size:22px;font-weight:700;letter-spacing:-.5px;flex:1;color:var(--text)">📅 Learning Log</div>
    <div style="font-family:sans-serif;font-size:12px;color:var(--text3)">${all.length} entries</div>
  </div>`;

  all.forEach(e => {
    const d = new Date(e.date);
    const label = d.toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long' });
    html += `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-family:sans-serif;font-size:14px;font-weight:600;color:var(--text)">${label}</div>
          <span style="font-family:sans-serif;font-size:12px;background:var(--green-bg);color:var(--green);padding:3px 9px;border-radius:10px;font-weight:600">${e.mood}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <div style="background:var(--surface2);border-radius:8px;padding:9px;font-family:sans-serif;font-size:12px">
            <div style="color:var(--text3);margin-bottom:2px">Subjects</div>
            <div style="font-weight:600;color:var(--text)">${e.subjects}</div>
          </div>
          <div style="background:var(--surface2);border-radius:8px;padding:9px;font-family:sans-serif;font-size:12px">
            <div style="color:var(--text3);margin-bottom:2px">Time</div>
            <div style="font-weight:600;color:var(--text)">${e.time}</div>
          </div>
        </div>
        <div style="font-family:sans-serif;font-size:13px;color:var(--text2);line-height:1.6">${e.notes}</div>
      </div>`;
  });

  html += `<button onclick="logToday()" style="width:100%;padding:13px;background:var(--blue);color:#fff;border:none;border-radius:12px;font-family:sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:4px">+ Log Today's Learning</button>`;
  document.getElementById('log-body').innerHTML = html;
}

function logToday() {
  const subj = prompt('What subjects did you cover today?');
  if (!subj) return;
  const time = prompt('How long did you study? (e.g. 2h 30min)') || '—';
  const mood = prompt('How did it go? (e.g. Great / Good / Tricky)') || 'Good';
  const notes = prompt('Any notes about what was covered?') || '';
  const ch = getChild();
  if (!STATE.log[ch.id]) STATE.log[ch.id] = [];
  const today = toLocalISODate();
  const existing = STATE.log[ch.id].find(entry => entry.date === today);
  if (existing) {
    existing.subjects = subj;
    existing.time = time;
    existing.mood = '😊 ' + mood;
    existing.notes = notes;
  } else {
    STATE.log[ch.id].unshift({
      date: today,
      subjects: subj, time, mood: '😊 ' + mood, notes
    });
  }
  saveState(STATE);
  renderLog();
  updateHUD();
  if (typeof refreshWeather === 'function') refreshWeather();
  showXPToast(5);
}

/* ═══════════════════════════════════════════════════════
   HUD & TOAST
════════════════════════════════════════════════════════ */
function updateHUD() {
  if (!activeChildId) return;
  const ch = getChild();
  const xp = STATE.xp[ch.id] || 0;
  const { done } = calcTotals(ch.id, ch.grade);
  const weather = getWeatherState(ch.id);
  document.getElementById('hud-car-name').textContent = 'Car: ' + getCarName(ch);
  const streakEl = document.getElementById('hud-streak');
  if (weather.streak >= 2) {
    streakEl.textContent = '🔥 ' + weather.streak + '-day streak';
    streakEl.classList.remove('hidden');
  } else {
    streakEl.classList.add('hidden');
  }
  document.getElementById('hud-xp').textContent = xp;
  document.getElementById('hud-done').textContent = done;
}

function showXPToast(amt) {
  const t = document.getElementById('xp-toast');
  t.textContent = '+' + amt + ' XP ⭐';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function spawnXPFloat(el) {
  const rect = el.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = 'xp-float';
  div.textContent = '+10 XP ⭐';
  div.style.left = rect.left + 'px';
  div.style.top = rect.top + 'px';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 1300);
}

/* ═══════════════════════════════════════════════════════
   SETTINGS MODAL
════════════════════════════════════════════════════════ */
function showModal(id, options = {}) {
  if (id === 'settings' && !parentModeUnlocked && !options.bypassParentGate) {
    promptParentAccess({ type: 'modal', id });
    return;
  }
  if (id === 'settings') renderSettings();
  document.getElementById('modal-' + id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById('modal-' + id).classList.add('hidden');
}
function closeModalOutside(e, id) {
  if (e.target !== document.getElementById('modal-' + id)) return;
  if (id === 'car-setup' && pendingCarSetupMandatory) return;
  closeModal(id);
  if (id === 'parent-pin') {
    resetParentPin();
    pendingParentAction = null;
  }
}

function promptParentAccess(action) {
  pendingParentAction = action || { type: 'screen', id: 'dash' };
  resetParentPin();
  closeModal('settings');
  document.getElementById('modal-parent-pin').classList.remove('hidden');
}

function runParentAction(action) {
  if (!action) return;
  if (action.type === 'modal') {
    showModal(action.id, { bypassParentGate: true });
    return;
  }
  if (action.type === 'screen') {
    showScreen(action.id, { bypassParentGate: true });
  }
}

function renderCarSetup(forceOpen = false) {
  const child = getChild();
  if (!child) return;

  pendingCarSetupMandatory = forceOpen;
  selectedCarColor = getCarColor(child);

  document.getElementById('car-setup-subtitle').textContent = forceOpen
    ? child.name + ', pick a colour and name for your car before you start driving.'
    : 'Update ' + child.name + '\'s car colour and name.';

  document.getElementById('car-setup-cancel').style.display = forceOpen ? 'none' : 'inline-flex';

  const grid = document.getElementById('car-color-grid');
  grid.innerHTML = '';
  CAR_COLOR_OPTIONS.forEach(color => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'car-color-swatch' + (color === selectedCarColor ? ' selected' : '');
    btn.style.background = color;
    btn.onclick = () => {
      selectedCarColor = color;
      renderCarSetup(forceOpen);
    };
    grid.appendChild(btn);
  });

  const input = document.getElementById('car-name-input');
  input.value = getCarName(child);
  input.oninput = updateCarPreview;
  updateCarPreview();

  document.getElementById('modal-car-setup').classList.remove('hidden');
  setTimeout(() => {
    input.focus();
    input.select();
  }, 0);
}

function updateCarPreview() {
  const input = document.getElementById('car-name-input');
  const nextName = (input.value || '').trim() || DEFAULT_CAR_NAME;
  document.getElementById('car-preview-title').textContent = nextName;
  document.getElementById('car-preview-chip').style.background = selectedCarColor;
}

function maybeOpenCarSetup() {
  const child = getChild();
  if (!child || child.carSetupDone) return;
  renderCarSetup(true);
}

function openCarSetupFromSettings() {
  renderCarSetup(false);
}

function closeCarSetup() {
  if (pendingCarSetupMandatory) return;
  closeModal('car-setup');
}

function saveCarSetup() {
  const child = getChild();
  if (!child) return;

  const nextName = (document.getElementById('car-name-input').value || '').trim().slice(0, 16) || DEFAULT_CAR_NAME;
  child.carColor = selectedCarColor;
  child.carName = nextName;
  child.carSetupDone = true;
  saveState(STATE);

  pendingCarSetupMandatory = false;
  document.getElementById('hud-car-name').textContent = 'Car: ' + nextName;
  closeModal('car-setup');

  if (typeof rebuildCar === 'function') rebuildCar();
  renderIntro();
  if (parentModeUnlocked) renderSettings();
}

function resetParentPinHint() {
  const hint = document.getElementById('parent-pin-hint');
  hint.textContent = 'Default PIN: 1234 - change it in Settings.';
  hint.classList.remove('error');
}

function updateParentPinDots() {
  for (let i = 0; i < 4; i++) {
    document.getElementById('parent-pin-dot-' + i).classList.toggle('filled', i < parentPinEntry.length);
  }
}

function resetParentPin() {
  parentPinEntry = '';
  updateParentPinDots();
  resetParentPinHint();
  const sheet = document.getElementById('parent-pin-sheet');
  sheet.classList.remove('shake');
}

function isParentPinOpen() {
  return !document.getElementById('modal-parent-pin').classList.contains('hidden');
}

function parentPinPress(n) {
  if (parentPinEntry.length >= 4) return;
  resetParentPinHint();
  parentPinEntry += String(n);
  updateParentPinDots();
  if (parentPinEntry.length === 4) setTimeout(parentPinSubmit, 120);
}

function parentPinClear() {
  if (!parentPinEntry.length) return;
  resetParentPinHint();
  parentPinEntry = parentPinEntry.slice(0, -1);
  updateParentPinDots();
}

function parentPinSubmit() {
  if (String(parentPinEntry) === String(STATE.pin)) {
    parentModeUnlocked = true;
    closeModal('parent-pin');
    const action = pendingParentAction;
    pendingParentAction = null;
    resetParentPin();
    runParentAction(action || { type: 'screen', id: 'dash' });
    return;
  }

  parentPinEntry = '';
  updateParentPinDots();
  const hint = document.getElementById('parent-pin-hint');
  hint.textContent = 'Incorrect PIN - try again.';
  hint.classList.add('error');
  const sheet = document.getElementById('parent-pin-sheet');
  sheet.classList.remove('shake');
  void sheet.offsetWidth;
  sheet.classList.add('shake');
}

function lockParentMode() {
  parentModeUnlocked = false;
  pendingParentAction = null;
  resetParentPin();
  closeModal('settings');
  if (worldReady) {
    updateHUD();
    showScreen('world', { bypassParentGate: true });
    if (typeof onResize === 'function') onResize();
  } else {
    showScreen('intro', { bypassParentGate: true });
  }
}

function changeParentPin() {
  const nextPin = prompt('Enter a new 4-digit parent PIN:', String(STATE.pin || '1234'));
  if (!nextPin) return;
  if (!/^\d{4}$/.test(nextPin)) {
    alert('PIN must be exactly 4 digits.');
    return;
  }
  STATE.pin = nextPin;
  saveState(STATE);
  alert('Parent PIN updated.');
  renderSettings();
}

function renderSettings() {
  const ch = getChild() || {};
  const installState = getInstallState();
  const installRow = installState === 'installed'
    ? `<div class="settings-row">
      <div class="settings-icon">📲</div>
      <div class="settings-label">Install as app</div>
      <div class="settings-value">Already installed ✓</div>
    </div>`
    : `<div class="settings-row" onclick="installApp()" style="cursor:pointer">
      <div class="settings-icon">📲</div>
      <div class="settings-label">Install as app</div>
      <div class="settings-value">${installState === 'prompt' ? 'Install now →' : installState === 'ios' ? 'iPhone/iPad steps →' : 'Use browser install menu →'}</div>
    </div>`;
  document.getElementById('settings-body').innerHTML = `
    <div class="settings-row">
      <div class="settings-icon">👤</div>
      <div class="settings-label">Active learner</div>
      <div class="settings-value">${ch.name || '—'} · Grade ${ch.grade || '—'}</div>
    </div>
    <div class="settings-row" onclick="showScreen('intro');closeModal('settings');" style="cursor:pointer">
      <div class="settings-icon">🔄</div>
      <div class="settings-label">Switch learner</div>
      <div class="settings-value">→</div>
    </div>
    <div class="settings-row">
      <div class="settings-icon">🔒</div>
      <div class="settings-label">Data storage</div>
      <div class="settings-value">Local only · POPIA ✓</div>
    </div>
    <div class="settings-row">
      <div class="settings-icon">📡</div>
      <div class="settings-label">Offline mode</div>
      <div class="settings-value">✅ Ready</div>
    </div>
    ${installRow}
    <div class="settings-row" onclick="openCarSetupFromSettings()" style="cursor:pointer">
      <div class="settings-icon">🚗</div>
      <div class="settings-label">Car customisation</div>
      <div class="settings-value">${getCarName(ch)} →</div>
    </div>
    <div class="settings-row" onclick="changeParentPin()" style="cursor:pointer">
      <div class="settings-icon">🔢</div>
      <div class="settings-label">Change parent PIN</div>
      <div class="settings-value">${STATE.pin ? '••••' : '1234'} →</div>
    </div>
    <div class="settings-row" onclick="backupData()" style="cursor:pointer">
      <div class="settings-icon">💾</div>
      <div class="settings-label">Export backup</div>
      <div class="settings-value">Download JSON →</div>
    </div>
    <div class="settings-row" onclick="importData()" style="cursor:pointer">
      <div class="settings-icon">📂</div>
      <div class="settings-label">Restore backup</div>
      <div class="settings-value">Import JSON →</div>
    </div>
    <div class="settings-row" onclick="exportPortfolio()" style="cursor:pointer">
      <div class="settings-icon">📄</div>
      <div class="settings-label">Export portfolio PDF</div>
      <div class="settings-value">For inspection →</div>
    </div>
    <div class="settings-row" onclick="lockParentMode()" style="cursor:pointer">
      <div class="settings-icon">🧑</div>
      <div class="settings-label">Exit parent mode</div>
      <div class="settings-value">Back to world →</div>
    </div>
    <div class="settings-row" onclick="openStandaloneParentDashboard()" style="cursor:pointer">
      <div class="settings-icon">🪟</div>
      <div class="settings-label">Open standalone parent dashboard</div>
      <div class="settings-value">Separate page →</div>
    </div>
    <div class="settings-row" onclick="if(confirm('Reset ALL progress? This cannot be undone.'))resetProgress();" style="cursor:pointer">
      <div class="settings-icon">🗑️</div>
      <div class="settings-label btn-danger">Reset progress</div>
      <div class="settings-value" style="color:var(--red)">Danger →</div>
    </div>
    <div style="font-family:sans-serif;font-size:11px;color:var(--text3);margin-top:20px;line-height:1.7;text-align:center">
      HomeSchool Hub · CAPS · South Africa<br>
      All data stays on this device. No accounts, no cloud, no ads.<br>
      Built for homeschool families. POPIA compliant.
    </div>`;
}

async function installApp() {
  const installState = getInstallState();

  if (installState === 'installed') {
    alert('HomeSchool Hub is already installed on this device.');
    return;
  }

  if (installState === 'prompt' && deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    installPromptAvailable = false;
    renderSettings();
    if (result?.outcome === 'accepted') {
      alert('HomeSchool Hub is being installed. Look for it on your home screen or in your app list.');
    }
    return;
  }

  if (installState === 'ios') {
    alert('To install on iPhone or iPad:\n\n1. Open this app in Safari\n2. Tap the Share button\n3. Choose "Add to Home Screen"\n4. Confirm the HomeSchool Hub icon\n\nAfter that it will launch like an app and work offline.');
    return;
  }

  alert('Use your browser install icon or browser menu to install HomeSchool Hub as an app on this device.');
}

function backupData() {
  const blob = new Blob([JSON.stringify(STATE, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'homeschool-backup-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (confirm('Replace all current data with this backup?')) {
          STATE = imported;
          saveState(STATE);
          alert('Backup restored! Reloading…');
          location.reload();
        }
      } catch { alert('Invalid backup file.'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function resetProgress() {
  STATE.progress = {};
  STATE.xp = {};
  saveState(STATE);
  closeModal('settings');
  updateHUD();
  alert('Progress reset.');
}

/* ═══════════════════════════════════════════════════════
   SERVICE WORKER REGISTRATION
════════════════════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js?v=6', { updateViaCache: 'none' }).catch(() => {});
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installPromptAvailable = true;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installPromptAvailable = false;
});

document.addEventListener('keydown', e => {
  if (!isParentPinOpen()) return;
  if (/^\d$/.test(e.key)) {
    e.preventDefault();
    e.stopPropagation();
    parentPinPress(e.key);
    return;
  }
  if (e.key === 'Backspace') {
    e.preventDefault();
    e.stopPropagation();
    parentPinClear();
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    parentPinSubmit();
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    closeModal('parent-pin');
    resetParentPin();
    pendingParentAction = null;
  }
}, true);

/* ═══════════════════════════════════════════════════════
   BOOT
════════════════════════════════════════════════════════ */
renderIntro();
if (STATE.children.length) {
  const preferredChildId = getPreferredChildId();
  if (preferredChildId) {
    selectChild(preferredChildId);
    requestAnimationFrame(() => enterWorld());
  }
}

