/* ═══════════════════════════════════════════════════════
   STATE & STORAGE
════════════════════════════════════════════════════════ */
const DEFAULT_CHILDREN = [
  { id:'child-1', name:'Joshua', grade:6, initials:'JD', color:'#2d6a4f' },
  { id:'child-2', name:'Elijah', grade:4, initials:'ED', color:'#1d6fa4' },
];
const CAR_COLOR_OPTIONS = ['#FF4444','#4488FF','#44BB44','#FFAA00','#AA44FF','#FF88AA','#44DDDD','#FFEE44'];
const DEFAULT_CAR_NAME = 'Road Runner';
const HOME_STYLE_OPTIONS = [
  { id:'cottage', label:'Cottage' },
  { id:'modern', label:'Modern' },
  { id:'farmhouse', label:'Farmhouse' },
];

function loadState() {
  try { return JSON.parse(localStorage.getItem('hs-state')) || {}; } catch{ return {}; }
}
function saveState(s) { localStorage.setItem('hs-state', JSON.stringify(s)); }

let STATE = loadState();
if (!STATE.children) STATE.children = DEFAULT_CHILDREN;
if (!STATE.progress) STATE.progress = {};    // { childId: { topicId: 0|1|2 } }
if (!STATE.progressMeta) STATE.progressMeta = {}; // { childId: { topicId: { completedAt?, updatedAt? } } }
if (!STATE.progressHistory) STATE.progressHistory = {}; // { childId: ProgressSnapshot[] }
if (!STATE.xp) STATE.xp = {};               // { childId: number }
if (!STATE.portfolio) STATE.portfolio = {};  // { childId: [] }
if (!STATE.log) STATE.log = {};              // { childId: [] }
if (!STATE.notes) STATE.notes = {};          // { childId: { topicId: string } }
if (!STATE.planner) STATE.planner = {};      // { childId: { [weekKey]: { monday: topicId[] ... } } }
if (!STATE.homework) STATE.homework = {};    // { childId: HomeworkAssignment[] }
if (!STATE.dailyChallenge) STATE.dailyChallenge = {}; // { childId: { [date]: { gameId, topicId, completedAt?, bonusXp } } }
if (!STATE.arcadeOrigins) STATE.arcadeOrigins = [window.location.origin, 'http://127.0.0.1:8080', 'http://localhost:8080'];
if (!STATE.pin) STATE.pin = '1234';
if (!STATE.milestones) STATE.milestones = {};
STATE.children = STATE.children.map((child, index) => ({
  ...child,
  carColor: child.carColor || child.color || CAR_COLOR_OPTIONS[index % CAR_COLOR_OPTIONS.length],
  carName: child.carName || DEFAULT_CAR_NAME,
  homeStyle: child.homeStyle || HOME_STYLE_OPTIONS[index % HOME_STYLE_OPTIONS.length].id,
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
let currentArcadeGameId = null;
let activeArcadeSession = null;

const PARENT_SCREENS = ['dash', 'portfolio', 'log', 'report'];
const PLANNER_DAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
];

function getChild() { return STATE.children.find(c => c.id === activeChildId); }
function getPreferredChildId() {
  if (STATE.lastActiveChildId && STATE.children.some(child => child.id === STATE.lastActiveChildId)) {
    return STATE.lastActiveChildId;
  }
  return STATE.children[0]?.id || null;
}
function getProgress(childId) { return STATE.progress[childId] || {}; }
function getProgressMeta(childId) { return STATE.progressMeta[childId] || {}; }
function getNotes(childId) { return STATE.notes[childId] || {}; }
function isParentScreen(id) { return PARENT_SCREENS.includes(id); }
function getCarName(child) { return child?.carName || DEFAULT_CAR_NAME; }
function getCarColor(child) { return child?.carColor || child?.color || CAR_COLOR_OPTIONS[0]; }
function getHomeStyle(child) { return child?.homeStyle || HOME_STYLE_OPTIONS[0].id; }
function getHomeStyleMeta(styleId) {
  return HOME_STYLE_OPTIONS.find(option => option.id === styleId) || HOME_STYLE_OPTIONS[0];
}
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function encodeSharePayload(data) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  } catch {
    return '';
  }
}
function getTopicNote(childId, topicId) {
  return getNotes(childId)[topicId] || '';
}
function setTopicNote(childId, topicId, note) {
  const nextNote = String(note || '').trim();
  if (!STATE.notes[childId]) STATE.notes[childId] = {};
  if (nextNote) STATE.notes[childId][topicId] = nextNote;
  else delete STATE.notes[childId][topicId];
  if (!Object.keys(STATE.notes[childId]).length) delete STATE.notes[childId];
  saveState(STATE);
}
function countTopicNotes(childId, grade, subject) {
  const notes = getNotes(childId);
  if (!subject) return Object.keys(notes).length;
  const topics = CAPS_CURRICULUM[grade]?.[subject]?.topics || [];
  return topics.filter(topic => notes[topic.id]).length;
}
function getStartOfWeek(date = new Date()) {
  const start = new Date(date);
  const weekday = (start.getDay() + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - weekday);
  return start;
}
function getWeekKey(date = new Date()) {
  return toLocalISODate(getStartOfWeek(date));
}
function formatWeekLabel(weekKey) {
  const start = fromISODate(weekKey);
  if (!start) return weekKey;
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  return start.toLocaleDateString('en-ZA', { day:'numeric', month:'short' }) + ' - ' +
    end.toLocaleDateString('en-ZA', { day:'numeric', month:'short' });
}
function getPlannerWeek(childId, weekKey = getWeekKey()) {
  return STATE.planner[childId]?.[weekKey] || {};
}
function getArcadeGamesForGrade(grade) {
  return (typeof ARCADE_GAMES !== 'undefined' ? ARCADE_GAMES : []).filter(game => (game.grades || []).includes(grade));
}
function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
function getArcadeTopicLabels(game, grade) {
  return (game.topicIds || [])
    .map(topicId => getTopicById(grade, topicId))
    .filter(Boolean)
    .slice(0, 4);
}
function getDailyChallengeStore(childId) {
  if (!STATE.dailyChallenge[childId]) STATE.dailyChallenge[childId] = {};
  return STATE.dailyChallenge[childId];
}
function getDailyChallengeStatus(childId, date = toLocalISODate()) {
  return getDailyChallengeStore(childId)[date] || null;
}
function getDailyChallenge(childId, date = toLocalISODate()) {
  const child = STATE.children.find(entry => entry.id === childId);
  if (!child) return null;

  const games = getArcadeGamesForGrade(child.grade);
  const progress = getProgress(childId);
  const unfinished = [];
  const replayable = [];

  games.forEach(game => {
    (game.topicIds || []).forEach(topicId => {
      const topic = getTopicById(child.grade, topicId);
      if (!topic) return;
      const candidate = {
        date,
        childId,
        gameId: game.id,
        gameTitle: game.title,
        gameIcon: game.icon,
        gameColor: game.color,
        launchLabel: game.launchLabel || 'Launch challenge',
        topicId: topic.id,
        topicTitle: topic.title,
        topicSubject: topic.subject,
        topicIcon: topic.icon,
        bonusXp: 15,
      };
      replayable.push(candidate);
      if ((progress[topic.id] || 0) !== 2) unfinished.push(candidate);
    });
  });

  const pool = unfinished.length ? unfinished : replayable;
  if (!pool.length) return null;
  const seed = `${childId}|${child.grade}|${date}`;
  const challenge = pool[hashString(seed) % pool.length];
  return {
    ...challenge,
    mode: unfinished.length ? 'progress' : 'replay',
    completed: Boolean(getDailyChallengeStatus(childId, date)?.completedAt),
  };
}
function markDailyChallengeComplete(childId, challenge, source = 'arcade') {
  if (!challenge) return false;
  const store = getDailyChallengeStore(childId);
  const existing = store[challenge.date] || {};
  if (existing.completedAt) return false;
  store[challenge.date] = {
    gameId: challenge.gameId,
    topicId: challenge.topicId,
    completedAt: new Date().toISOString(),
    bonusXp: challenge.bonusXp,
    source,
  };
  awardXP(childId, challenge.bonusXp, challenge.topicId);
  saveState(STATE);
  return true;
}
function maybeCompleteDailyChallenge(childId, gameId, topicIds = [], source = 'arcade') {
  const challenge = getDailyChallenge(childId);
  if (!challenge || challenge.completed || challenge.gameId !== gameId) return false;

  const progress = getProgress(childId);
  const topicComplete = topicIds.includes(challenge.topicId);
  const replaySatisfied = challenge.mode === 'replay' && (progress[challenge.topicId] || 0) === 2;
  if (!topicComplete && !replaySatisfied) return false;

  return markDailyChallengeComplete(childId, challenge, source);
}
function buildDailyChallengeCard(ch) {
  const challenge = getDailyChallenge(ch.id);
  if (!challenge) return '';

  const status = getDailyChallengeStatus(ch.id, challenge.date);
  const completed = Boolean(status?.completedAt);
  const ctaLabel = completed ? 'Play again' : challenge.launchLabel;
  const statusText = completed
    ? `Completed today. Bonus +${challenge.bonusXp} XP already claimed.`
    : challenge.mode === 'progress'
      ? `Finish ${challenge.topicTitle} in ${challenge.gameTitle} to earn +${challenge.bonusXp} bonus XP.`
      : `Replay ${challenge.gameTitle} today. ${ch.name} has already completed the tagged topic, so any successful run keeps the streak alive.`;

  return `<div class="card challenge-card ${completed ? 'challenge-complete' : ''}">
    <div class="card-title">Daily Challenge</div>
    <div class="challenge-head">
      <div class="challenge-icon" style="background:${challenge.gameColor}">${challenge.gameIcon}</div>
      <div>
        <div class="challenge-title">${challenge.gameTitle}</div>
        <div class="challenge-sub">${challenge.topicIcon} ${escapeHtml(challenge.topicSubject)} - ${escapeHtml(challenge.topicTitle)}</div>
      </div>
      <div class="challenge-bonus">+${challenge.bonusXp} XP</div>
    </div>
    <div class="challenge-body">${escapeHtml(statusText)}</div>
    <div class="challenge-actions">
      <button class="challenge-btn" onclick="launchArcadeGame('${challenge.gameId}')">${completed ? '🎮 ' : '🏁 '}${ctaLabel}</button>
      <button class="challenge-link" onclick="openArcade()">Browse Arcade</button>
    </div>
  </div>`;
}
function isAllowedArcadeOrigin(origin) {
  return (STATE.arcadeOrigins || []).includes(origin);
}
function sendArcadeAck(source, origin, sessionId, status = 'ok', extra = {}) {
  if (!source || !origin) return;
  source.postMessage({
    type: 'HS_ACK',
    sessionId,
    status,
    childId: activeChildId,
    xp: STATE.xp[activeChildId] || 0,
    ...extra,
  }, origin);
}
function buildArcadeSessionPayload(game) {
  const ch = getChild();
  if (!ch) return null;
  const sessionId = 'arcade-' + Date.now();
  const topics = (game.topicIds || []).map(topicId => getTopicById(ch.grade, topicId)).filter(Boolean);
  activeArcadeSession = {
    sessionId,
    gameId: game.id,
    gameTitle: game.title,
    childId: ch.id,
    grade: ch.grade,
    origin: game.origin || window.location.origin,
    topicIds: topics.map(topic => topic.id),
  };
  return {
    type: 'HS_INIT',
    sessionId,
    gameId: game.id,
    gameTitle: game.title,
    child: {
      id: ch.id,
      name: ch.name,
      grade: ch.grade,
    },
    xp: STATE.xp[ch.id] || 0,
    topicTags: topics.map(topic => ({
      id: topic.id,
      subject: topic.subject,
      title: topic.title,
    })),
  };
}
function ensurePlannerWeek(childId, weekKey = getWeekKey()) {
  if (!STATE.planner[childId]) STATE.planner[childId] = {};
  if (!STATE.planner[childId][weekKey]) STATE.planner[childId][weekKey] = {};
  return STATE.planner[childId][weekKey];
}
function getTopicById(grade, topicId) {
  const subjects = CAPS_CURRICULUM[grade] || {};
  for (const [subjectName, subjectData] of Object.entries(subjects)) {
    const topic = (subjectData.topics || []).find(entry => entry.id === topicId);
    if (topic) return { ...topic, subject: subjectName, color: subjectData.color, icon: subjectData.icon };
  }
  return null;
}
function getPlannerEntries(childId, grade, dayKey, weekKey = getWeekKey()) {
  const ids = getPlannerWeek(childId, weekKey)[dayKey] || [];
  return ids.map(topicId => getTopicById(grade, topicId)).filter(Boolean);
}
function getPlannerTopicCount(childId, weekKey = getWeekKey()) {
  const week = getPlannerWeek(childId, weekKey);
  return Object.values(week).reduce((sum, entries) => sum + (entries?.length || 0), 0);
}
function getAvailablePlannerTopics(childId, grade, limit = 12) {
  const subjects = CAPS_CURRICULUM[grade] || {};
  const prog = getProgress(childId);
  const planned = new Set(Object.values(getPlannerWeek(childId)).flat());
  const topics = [];
  Object.entries(subjects).forEach(([subjectName, subjectData]) => {
    (subjectData.topics || []).forEach(topic => {
      if (planned.has(topic.id)) return;
      const state = prog[topic.id] || 0;
      if (state === 2) return;
      topics.push({
        id: topic.id,
        title: topic.title,
        section: topic.section,
        subject: subjectName,
        icon: subjectData.icon,
        state,
      });
    });
  });
  topics.sort((a, b) => a.state - b.state || a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title));
  return topics.slice(0, limit);
}
function addPlannerTopic(childId, weekKey, dayKey, topicId) {
  const week = ensurePlannerWeek(childId, weekKey);
  if (!week[dayKey]) week[dayKey] = [];
  if (!week[dayKey].includes(topicId)) week[dayKey].push(topicId);
  saveState(STATE);
}
function removePlannerTopic(childId, weekKey, dayKey, topicId) {
  const week = ensurePlannerWeek(childId, weekKey);
  week[dayKey] = (week[dayKey] || []).filter(entry => entry !== topicId);
  saveState(STATE);
}
function getPlannerTopicDueDate(childId, topicId, weekKey = getWeekKey()) {
  const start = fromISODate(weekKey);
  if (!start) return null;
  const week = getPlannerWeek(childId, weekKey);
  for (let index = 0; index < PLANNER_DAYS.length; index += 1) {
    const day = PLANNER_DAYS[index];
    if ((week[day.key] || []).includes(topicId)) {
      const due = new Date(start);
      due.setDate(start.getDate() + index);
      return toLocalISODate(due);
    }
  }
  return null;
}
function formatHomeworkDueLabel(dueDate) {
  if (!dueDate) return 'No due date';
  const today = toLocalISODate();
  if (dueDate === today) return 'Due today';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toLocalISODate(tomorrow);
  if (dueDate === tomorrowKey) return 'Due tomorrow';
  const parsed = fromISODate(dueDate);
  if (!parsed) return dueDate;
  return `Due ${parsed.toLocaleDateString('en-ZA', { day:'numeric', month:'short' })}`;
}
function getHomeworkAssignments(childId, options = {}) {
  const child = STATE.children.find(entry => entry.id === childId);
  if (!child) return [];
  const includeDone = Boolean(options.includeDone);
  const today = toLocalISODate();
  return (STATE.homework[childId] || [])
    .map(entry => {
      const topic = getTopicById(child.grade, entry.topicId);
      const completedAt = entry.completedAt || null;
      const done = Boolean(completedAt);
      const dueDate = entry.dueDate || null;
      const overdue = !done && dueDate && dueDate < today;
      const dueToday = !done && dueDate === today;
      return {
        ...entry,
        title: topic?.title || entry.title || 'Assigned topic',
        subject: topic?.subject || entry.subject || 'General',
        icon: topic?.icon || entry.icon || '📘',
        color: topic?.color || entry.color || '#2d6a4f',
        dueDate,
        dueLabel: formatHomeworkDueLabel(dueDate),
        done,
        overdue,
        dueToday,
      };
    })
    .filter(entry => includeDone || !entry.done)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (Boolean(a.overdue) !== Boolean(b.overdue)) return a.overdue ? -1 : 1;
      return String(a.dueDate || '9999-12-31').localeCompare(String(b.dueDate || '9999-12-31')) || a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title);
    });
}
function getHomeworkSummary(childId) {
  const assignments = getHomeworkAssignments(childId);
  const overdue = assignments.filter(entry => entry.overdue).length;
  const dueToday = assignments.filter(entry => entry.dueToday).length;
  return {
    assignments,
    pending: assignments.length,
    overdue,
    dueToday,
    next: assignments[0] || null,
  };
}
function saveHomeworkAssignments(childId, entries) {
  const next = entries.filter(Boolean);
  if (next.length) STATE.homework[childId] = next;
  else delete STATE.homework[childId];
  saveState(STATE);
}
function addHomeworkAssignment(childId, topicId, dueDate, source = 'parent') {
  const child = STATE.children.find(entry => entry.id === childId);
  const topic = child ? getTopicById(child.grade, topicId) : null;
  if (!child || !topic) return false;
  const assignments = getHomeworkAssignments(childId, { includeDone: true }).map(entry => ({
    id: entry.id,
    topicId: entry.topicId,
    dueDate: entry.dueDate,
    assignedAt: entry.assignedAt,
    completedAt: entry.completedAt,
    source: entry.source,
    title: entry.title,
    subject: entry.subject,
    icon: entry.icon,
    color: entry.color,
  }));
  const existing = assignments.find(entry => entry.topicId === topicId && !entry.completedAt);
  if (existing) {
    existing.dueDate = dueDate || existing.dueDate;
    existing.source = source;
  } else {
    assignments.push({
      id: 'hw-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      topicId,
      dueDate,
      assignedAt: new Date().toISOString(),
      source,
      title: topic.title,
      subject: topic.subject,
      icon: topic.icon,
      color: topic.color,
    });
  }
  saveHomeworkAssignments(childId, assignments);
  return true;
}
function completeHomeworkForTopic(childId, topicId) {
  const assignments = getHomeworkAssignments(childId, { includeDone: true }).map(entry => ({
    id: entry.id,
    topicId: entry.topicId,
    dueDate: entry.dueDate,
    assignedAt: entry.assignedAt,
    completedAt: entry.completedAt,
    source: entry.source,
    title: entry.title,
    subject: entry.subject,
    icon: entry.icon,
    color: entry.color,
  }));
  let changed = false;
  assignments.forEach(entry => {
    if (entry.topicId === topicId && !entry.completedAt) {
      entry.completedAt = new Date().toISOString();
      changed = true;
    }
  });
  if (changed) saveHomeworkAssignments(childId, assignments);
  return changed;
}
function removeHomeworkAssignment(childId, assignmentId) {
  const assignments = getHomeworkAssignments(childId, { includeDone: true }).map(entry => ({
    id: entry.id,
    topicId: entry.topicId,
    dueDate: entry.dueDate,
    assignedAt: entry.assignedAt,
    completedAt: entry.completedAt,
    source: entry.source,
    title: entry.title,
    subject: entry.subject,
    icon: entry.icon,
    color: entry.color,
  })).filter(entry => entry.id !== assignmentId);
  saveHomeworkAssignments(childId, assignments);
}
function chooseHomeworkDueDate(childId, topicId) {
  const plannerDate = getPlannerTopicDueDate(childId, topicId);
  const labels = [
    `1. Today (${formatHomeworkDueLabel(toLocalISODate())})`,
    `2. Tomorrow (${formatHomeworkDueLabel(toLocalISODate(new Date(Date.now() + 86400000)))})`,
    '3. In 3 days',
    plannerDate ? `4. Planner day (${formatHomeworkDueLabel(plannerDate)})` : '4. Next Monday',
  ].join('\n');
  const answer = prompt(`Choose a due date for this homework:\n${labels}`);
  if (!answer) return null;
  if (answer === '1') return toLocalISODate();
  if (answer === '2') return toLocalISODate(new Date(Date.now() + 86400000));
  if (answer === '3') return toLocalISODate(new Date(Date.now() + (86400000 * 3)));
  if (answer === '4') return plannerDate || getWeekKey(new Date(Date.now() + (86400000 * 7)));
  alert('Please choose 1, 2, 3, or 4.');
  return null;
}
function promptHomeworkAssignment() {
  if (!parentModeUnlocked) return;
  const ch = getChild();
  if (!ch) return;
  const plannerTopics = PLANNER_DAYS.flatMap(day => getPlannerEntries(ch.id, ch.grade, day.key).map(entry => ({ ...entry, fromPlanner: true })));
  const available = [...plannerTopics, ...getAvailablePlannerTopics(ch.id, ch.grade, 12)]
    .filter((entry, index, list) => list.findIndex(other => other.id === entry.id) === index)
    .filter(entry => !getHomeworkAssignments(ch.id).some(hw => hw.topicId === entry.id));
  if (!available.length) {
    alert('There are no unfinished topics available to assign as homework right now.');
    return;
  }
  const options = available.map((topic, index) => `${index + 1}. ${topic.icon} ${topic.subject} - ${topic.title}${topic.fromPlanner ? ' (planned)' : ''}`).join('\n');
  const answer = prompt(`Assign homework for ${ch.name}.\n\nChoose a topic number:\n${options}`);
  if (!answer) return;
  const picked = available[Number(answer) - 1];
  if (!picked) {
    alert('Please enter one of the listed topic numbers.');
    return;
  }
  const dueDate = chooseHomeworkDueDate(ch.id, picked.id);
  if (!dueDate) return;
  addHomeworkAssignment(ch.id, picked.id, dueDate, picked.fromPlanner ? 'planner' : 'parent');
  renderDashboard();
}
function clearHomeworkAssignment(assignmentId) {
  if (!parentModeUnlocked) return;
  const ch = getChild();
  if (!ch) return;
  removeHomeworkAssignment(ch.id, assignmentId);
  renderDashboard();
}
function openHomeworkTopic(subject) {
  openSubject(subject);
}
function buildHomeworkCard(ch) {
  const summary = getHomeworkSummary(ch.id);
  const headline = summary.pending
    ? `${summary.pending} assignment${summary.pending === 1 ? '' : 's'} active`
    : parentModeUnlocked
      ? `Assign topics with due dates for ${ch.name}.`
      : `${ch.name} has no homework assigned right now.`;
  return `<div class="card">
    <div class="card-title">Homework</div>
    <div class="planner-header">
      <div>
        <div class="planner-title">${summary.overdue ? `${summary.overdue} overdue item${summary.overdue === 1 ? '' : 's'}` : summary.dueToday ? `${summary.dueToday} due today` : 'On track'}</div>
        <div class="planner-subtitle">${headline}</div>
      </div>
      ${parentModeUnlocked ? `<div class="planner-actions"><button class="planner-add-all" onclick="promptHomeworkAssignment()">+ Assign homework</button></div>` : ''}
    </div>
    <div style="display:grid;gap:10px">
      ${summary.assignments.length ? summary.assignments.map(entry => `<div class="planner-item" onclick="openHomeworkTopic('${entry.subject}')">
        <div class="planner-item-top">
          <span class="planner-item-subject" style="color:${entry.color}">${entry.icon} ${entry.subject}</span>
          <span class="topic-status ${entry.overdue ? 'status-partial' : entry.dueToday ? 'status-none' : 'status-done'}">${entry.overdue ? 'Overdue' : entry.dueToday ? 'Due today' : entry.dueLabel}</span>
        </div>
        <div class="planner-item-title">${escapeHtml(entry.title)}</div>
        ${parentModeUnlocked ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px">
          <div style="font-family:sans-serif;font-size:11px;color:var(--text3)">Assigned ${escapeHtml((entry.assignedAt || '').split('T')[0] || 'recently')}</div>
          <button class="planner-item-remove" onclick="event.stopPropagation();clearHomeworkAssignment('${entry.id}')">×</button>
        </div>` : ''}
      </div>`).join('') : `<div class="planner-empty">${parentModeUnlocked ? 'No homework assigned yet' : 'Nothing due right now'}</div>`}
    </div>
  </div>`;
}
function promptPlannerTopic(dayKey) {
  if (!parentModeUnlocked) return;
  const ch = getChild();
  if (!ch) return;
  const available = getAvailablePlannerTopics(ch.id, ch.grade, 10);
  if (!available.length) {
    alert('All unfinished topics are already planned for this week. Complete or remove a planned item to make room.');
    return;
  }
  const options = available.map((topic, index) => `${index + 1}. ${topic.icon} ${topic.subject} - ${topic.title}`).join('\n');
  const answer = prompt(`Add a topic for ${PLANNER_DAYS.find(day => day.key === dayKey)?.label || dayKey}.\n\nChoose a number:\n${options}`);
  if (!answer) return;
  const picked = available[Number(answer) - 1];
  if (!picked) {
    alert('Please enter one of the listed numbers.');
    return;
  }
  addPlannerTopic(ch.id, getWeekKey(), dayKey, picked.id);
  renderDashboard();
}
function promptPlannerTopicForWeek() {
  if (!parentModeUnlocked) return;
  const dayList = PLANNER_DAYS.map((day, index) => `${index + 1}. ${day.label}`).join('\n');
  const answer = prompt(`Choose a day for this planned topic:\n${dayList}`);
  if (!answer) return;
  const day = PLANNER_DAYS[Number(answer) - 1];
  if (!day) {
    alert('Please enter one of the listed day numbers.');
    return;
  }
  promptPlannerTopic(day.key);
}
function printWeeklyPlanner() {
  alert('🗓 Weekly planner\n\nUse your browser print dialog to print or save this week\'s planner.\n\nTip: open parent mode on a desktop browser, then choose File → Print → Save as PDF.');
  window.print();
}
function dropPlannerTopic(dayKey, topicId) {
  if (!parentModeUnlocked) return;
  const ch = getChild();
  if (!ch) return;
  removePlannerTopic(ch.id, getWeekKey(), dayKey, topicId);
  renderDashboard();
}
function buildPlannerCard(ch) {
  const weekKey = getWeekKey();
  const totalPlanned = getPlannerTopicCount(ch.id, weekKey);
  return `<div class="card">
    <div class="card-title">Weekly Planner</div>
    <div class="planner-header">
      <div>
        <div class="planner-title">Week of ${formatWeekLabel(weekKey)}</div>
        <div class="planner-subtitle">${totalPlanned ? `${totalPlanned} topic${totalPlanned === 1 ? '' : 's'} scheduled for ${ch.name}` : `Plan ${ch.name}'s week by assigning topics to each day.`}</div>
      </div>
      <div class="planner-actions">
        <button class="planner-print-btn" onclick="printWeeklyPlanner()">Print week</button>
        <button class="planner-add-all" onclick="promptPlannerTopicForWeek()">+ Add topic</button>
      </div>
    </div>
    <div class="planner-grid">
      ${PLANNER_DAYS.map(day => {
        const entries = getPlannerEntries(ch.id, ch.grade, day.key, weekKey);
        return `<div class="planner-day">
          <div class="planner-day-head">
            <div class="planner-day-label">${day.label}</div>
            <button class="planner-day-add" onclick="promptPlannerTopic('${day.key}')">+</button>
          </div>
          <div class="planner-day-body">
            ${entries.length ? entries.map(entry => `<div class="planner-item" onclick="openSubject('${entry.subject}')">
              <div class="planner-item-top">
                <span class="planner-item-subject" style="color:${entry.color}">${entry.icon} ${entry.subject}</span>
                <button class="planner-item-remove" onclick="event.stopPropagation();dropPlannerTopic('${day.key}','${entry.id}')">×</button>
              </div>
              <div class="planner-item-title">${escapeHtml(entry.title)}</div>
            </div>`).join('') : `<div class="planner-empty">Nothing planned yet</div>`}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
function getSubjectDoneCount(childId, grade, subject) {
  const topics = CAPS_CURRICULUM[grade]?.[subject]?.topics || [];
  const prog = getProgress(childId);
  return topics.filter(topic => (prog[topic.id] || 0) === 2).length;
}
function getSubjectInProgressCount(childId, grade, subject) {
  const topics = CAPS_CURRICULUM[grade]?.[subject]?.topics || [];
  const prog = getProgress(childId);
  return topics.filter(topic => (prog[topic.id] || 0) === 1).length;
}
function buildProgressSnapshot(childId, date = toLocalISODate()) {
  const child = STATE.children.find(entry => entry.id === childId);
  if (!child) return null;

  const subjects = CAPS_CURRICULUM[child.grade] || {};
  const subjectProgress = {};
  let totalDone = 0;
  let totalInProgress = 0;

  Object.entries(subjects).forEach(([subjectName, subjectData]) => {
    const done = getSubjectDoneCount(childId, child.grade, subjectName);
    const inProgress = getSubjectInProgressCount(childId, child.grade, subjectName);
    totalDone += done;
    totalInProgress += inProgress;
    subjectProgress[subjectName] = {
      done,
      inProgress,
      total: (subjectData.topics || []).length,
    };
  });

  return {
    date,
    grade: child.grade,
    totalDone,
    totalInProgress,
    xp: STATE.xp[childId] || 0,
    subjectProgress,
  };
}
function recordProgressSnapshot(childId, date = toLocalISODate()) {
  const snapshot = buildProgressSnapshot(childId, date);
  if (!snapshot) return;
  if (!STATE.progressHistory[childId]) STATE.progressHistory[childId] = [];
  const history = STATE.progressHistory[childId];
  const existingIndex = history.findIndex(entry => entry.date === date && entry.grade === snapshot.grade);
  if (existingIndex >= 0) history[existingIndex] = snapshot;
  else history.push(snapshot);
  history.sort((a, b) => a.date.localeCompare(b.date));
}
function ensureProgressTracking(childId) {
  const child = STATE.children.find(entry => entry.id === childId);
  if (!child) return;

  if (!STATE.progressMeta[childId]) STATE.progressMeta[childId] = {};
  const meta = STATE.progressMeta[childId];
  const prog = getProgress(childId);
  let changed = false;

  Object.entries(prog).forEach(([topicId, state]) => {
    if (!meta[topicId]) meta[topicId] = {};
    if (state === 2 && !meta[topicId].completedAt) {
      meta[topicId].completedAt = toLocalISODate();
      changed = true;
    }
    if (state > 0 && !meta[topicId].updatedAt) {
      meta[topicId].updatedAt = meta[topicId].completedAt || toLocalISODate();
      changed = true;
    }
  });

  recordProgressSnapshot(childId);
  if (changed) saveState(STATE);
}
function getRecentProgressSnapshots(childId, grade, days = 7) {
  const history = (STATE.progressHistory[childId] || []).filter(entry => entry.grade === grade);
  const today = fromISODate(toLocalISODate());
  const byDate = new Map(history.map(entry => [entry.date, entry]));
  const snapshots = [];
  let lastKnown = null;

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = toLocalISODate(date);
    const current = byDate.get(key) || lastKnown;
    if (byDate.has(key)) lastKnown = byDate.get(key);
    snapshots.push(current ? { ...current, date: key } : {
      date: key,
      grade,
      totalDone: 0,
      totalInProgress: 0,
      xp: 0,
      subjectProgress: {},
    });
  }

  return snapshots;
}
function renderTrendSvg(points, color) {
  const width = 220;
  const height = 72;
  const padding = 8;
  const maxValue = Math.max(...points.map(point => point.value), 1);
  const path = points.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(points.length - 1, 1);
    const y = height - padding - ((point.value / maxValue) * (height - padding * 2));
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const area = `${path} L${(width - padding).toFixed(1)} ${(height - padding).toFixed(1)} L${padding} ${(height - padding).toFixed(1)} Z`;

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="72" aria-hidden="true">
    <path d="${area}" fill="${color}" opacity="0.12"></path>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
    ${points.map((point, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(points.length - 1, 1);
      const y = height - padding - ((point.value / maxValue) * (height - padding * 2));
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${color}"></circle>`;
    }).join('')}
  </svg>`;
}
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
  if (!STATE.progressMeta[childId]) STATE.progressMeta[childId] = {};
  const old = STATE.progress[childId][topicId] || 0;
  const meta = STATE.progressMeta[childId][topicId] || {};
  STATE.progress[childId][topicId] = val;
  meta.updatedAt = toLocalISODate();
  if (val === 2) meta.completedAt = meta.completedAt || toLocalISODate();
  else delete meta.completedAt;
  if (val > 0 || Object.keys(meta).length) STATE.progressMeta[childId][topicId] = meta;
  else delete STATE.progressMeta[childId][topicId];
  if (val === 2) completeHomeworkForTopic(childId, topicId);
  recordProgressSnapshot(childId);
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
  activeArcadeSession = null;
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
  const grade = parseInt(prompt('Grade? (1, 2, 3, 4, 5, 6, or 7)'));
  if (![1,2,3,4,5,6,7].includes(grade)) { alert('Grade must be 1–7'); return; }
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
    homeStyle: HOME_STYLE_OPTIONS[STATE.children.length % HOME_STYLE_OPTIONS.length].id,
    carSetupDone: false,
  };
  STATE.children.push(ch);
  ensureProgressTracking(ch.id);
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

function openHomeBase() {
  showScreen('dash', { bypassParentGate: true });
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
function openCenterDashboard() {
  window.open('./parent-dashboard/index.html#centre=1', '_blank');
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
  if (['lms','arcade','dash','portfolio','log','report'].includes(id)) {
    nav.style.display = 'flex';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const nb = document.getElementById('nav-' + id) || document.getElementById('nav-dash');
    if (nb) nb.classList.add('active');
  } else {
    nav.style.display = 'none';
  }
  if (id === 'dash') renderDashboard();
  if (id === 'arcade') renderArcade();
  if (id === 'portfolio') renderPortfolio();
  if (id === 'log') renderLog();
  if (id === 'report') renderInspectionReport();
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

function openArcade() {
  currentArcadeGameId = null;
  showScreen('arcade');
}

function renderArcade() {
  const ch = getChild();
  if (!ch) return;
  const body = document.getElementById('arcade-body');
  const games = getArcadeGamesForGrade(ch.grade);
  const todayChallenge = getDailyChallenge(ch.id);

  let html = `
    <div class="progress-header slide-up">
      <div class="progress-circle" style="background:#ff8c42">🎮</div>
      <div class="progress-info">
        <div class="progress-label">Maths Arcade - Grade ${ch.grade}</div>
        <div class="progress-count" style="color:#ff8c42">${games.length} <span style="font-size:14px;color:var(--text3)">games ready</span></div>
        <div class="subject-note-summary">CAPS-linked practice games chosen for ${ch.name}'s current grade.</div>
      </div>
      <div class="xp-badge">⭐ ${(STATE.xp[ch.id] || 0)} XP</div>
    </div>
    <div class="arcade-grid">`;

  games.forEach(game => {
    const topicLabels = getArcadeTopicLabels(game, ch.grade);
    const isTodayChallenge = todayChallenge?.gameId === game.id;
    html += `
      <div class="arcade-card slide-up">
        <div class="arcade-card-head">
          <div class="arcade-icon" style="background:${game.color}">${game.icon}</div>
          <div>
            <div class="arcade-title">${game.title}</div>
            <div class="arcade-meta">${game.difficulty} · Grades ${game.grades.join(', ')}</div>
          </div>
        </div>
        <div class="arcade-desc">${game.description}</div>
        <div class="arcade-chip-row">
          ${isTodayChallenge ? '<span class="arcade-chip arcade-chip-challenge">Daily challenge</span>' : ''}
          ${(game.skills || []).map(skill => `<span class="arcade-chip">${skill}</span>`).join('')}
        </div>
        <div class="arcade-topic-list">
          ${topicLabels.length ? topicLabels.map(topic => `<div class="arcade-topic">${topic.icon} ${topic.subject}: ${escapeHtml(topic.title)}</div>`).join('') : '<div class="arcade-empty">No tagged CAPS topics for this grade yet.</div>'}
        </div>
        <button class="arcade-launch-btn" onclick="launchArcadeGame('${game.id}')">${game.launchLabel || 'Play'}</button>
      </div>`;
  });

  if (!games.length) {
    html += `<div class="card"><div class="card-title">No games yet</div><div class="arcade-empty">No arcade games are configured for Grade ${ch.grade} yet.</div></div>`;
  }

  html += `</div>`;
  body.innerHTML = html;
}

function launchArcadeGame(gameId) {
  const ch = getChild();
  const game = getArcadeGamesForGrade(ch?.grade || 0).find(entry => entry.id === gameId);
  if (!ch || !game) return;
  currentArcadeGameId = gameId;
  const initPayload = buildArcadeSessionPayload(game);
  if (!initPayload) return;
  const target = window.open(game.launchUrl || './arcade/bridge-demo.html', '_blank');
  if (!target) {
    alert('Allow pop-ups to launch the Maths Arcade game.');
    return;
  }
  const origin = game.origin || window.location.origin;
  const sendInit = () => {
    try {
      target.postMessage(initPayload, origin);
    } catch {}
  };
  sendInit();
  setTimeout(sendInit, 400);
  alert(`${game.icon} ${game.title}\n\nLaunching Arcade bridge session.\n\nAllowed origin: ${origin}\nSession: ${initPayload.sessionId}`);
}

function renderSubject(name, sub, ch) {
  const body = document.getElementById('lms-body');
  const prog = getProgress(ch.id);
  const notes = getNotes(ch.id);
  const topics = sub.topics;
  const done = topics.filter(t => (prog[t.id]||0) === 2).length;
  const pct = Math.round((done/topics.length)*100);
  const xp = STATE.xp[ch.id] || 0;
  const noteCount = countTopicNotes(ch.id, ch.grade, name);
  const homeworkAssignments = getHomeworkAssignments(ch.id);

  let html = `
    <div class="progress-header slide-up">
      <div class="progress-circle" style="background:${sub.color}">${sub.icon}</div>
      <div class="progress-info">
        <div class="progress-label">Progress — ${name}</div>
        <div class="progress-count" style="color:${sub.color}">${done} <span style="font-size:14px;color:var(--text3)">/ ${topics.length} topics</span></div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%;background:${sub.color}"></div>
        </div>
        ${parentModeUnlocked ? `<div class="subject-note-summary">📝 ${noteCount} parent note${noteCount === 1 ? '' : 's'} saved for this subject</div>` : ''}
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
      const note = notes[t.id] || '';
      const homework = homeworkAssignments.find(entry => entry.topicId === t.id);
      const stateClass = state === 2 ? 'done' : state === 1 ? 'partial' : '';
      const checkClass = state === 2 ? 'done' : state === 1 ? 'partial' : '';
      const checkIcon = state === 2 ? '✓' : state === 1 ? '◆' : '';
      const titleClass = state === 2 ? 'done' : '';
      const statusText = state === 2 ? 'Done' : state === 1 ? 'In progress' : 'Not started';
      const statusClass = state === 2 ? 'status-done' : state === 1 ? 'status-partial' : 'status-none';
      html += `
        <div class="topic-row ${stateClass} slide-up" onclick="cycleTopic('${t.id}', this)">
          <div class="topic-check ${checkClass}">${checkIcon}</div>
          <div class="topic-main">
            <div class="topic-title ${titleClass}">${t.title}</div>
            ${parentModeUnlocked ? `<div class="topic-note-preview${note ? ' has-note' : ''}">${note ? '📝 ' + escapeHtml(note) : 'No parent note yet'}</div>` : ''}
            ${homework ? `<div class="topic-note-preview has-note">📚 ${escapeHtml(homework.dueLabel)}</div>` : ''}
          </div>
          ${parentModeUnlocked ? `<button class="topic-note-btn${homework ? ' has-note' : ''}" onclick="event.stopPropagation();assignTopicHomework('${t.id}')">${homework ? 'Homework set' : 'Assign work'}</button>` : ''}
          ${parentModeUnlocked ? `<button class="topic-note-btn${note ? ' has-note' : ''}" onclick="event.stopPropagation();openTopicNote('${t.id}')">${note ? 'Edit note' : 'Add note'}</button>` : ''}
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
function assignTopicHomework(topicId) {
  if (!parentModeUnlocked) return;
  const ch = getChild();
  if (!ch) return;
  const dueDate = chooseHomeworkDueDate(ch.id, topicId);
  if (!dueDate) return;
  addHomeworkAssignment(ch.id, topicId, dueDate, 'subject');
  const sub = CAPS_CURRICULUM[ch.grade]?.[activeSubject];
  if (sub) renderSubject(activeSubject, sub, ch);
  if (currentScreen === 'dash') renderDashboard();
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD SCREEN
════════════════════════════════════════════════════════ */
function renderDashboard() {
  const ch = getChild();
  if (!ch) return;
  ensureProgressTracking(ch.id);
  const { total, done } = calcTotals(ch.id, ch.grade);
  const xp = STATE.xp[ch.id] || 0;
  const subjects = CAPS_CURRICULUM[ch.grade] || {};
  const noteCount = countTopicNotes(ch.id, ch.grade);
  const homeworkSummary = getHomeworkSummary(ch.id);
  const trendSnapshots = getRecentProgressSnapshots(ch.id, ch.grade, 7);
  const trendPoints = trendSnapshots.map(entry => ({ date: entry.date, value: entry.totalDone }));
  const trendDelta = trendPoints.length > 1 ? trendPoints[trendPoints.length - 1].value - trendPoints[0].value : 0;
  const trendStart = trendPoints[0]?.date || toLocalISODate();
  const trendEnd = trendPoints[trendPoints.length - 1]?.date || toLocalISODate();

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
        <div class="stat-lbl">Homework</div>
        <div class="stat-val" style="color:${homeworkSummary.overdue ? 'var(--amber)' : 'var(--purple)'}">${homeworkSummary.pending}</div>
        <div class="stat-prog"><div class="stat-prog-fill" style="background:${homeworkSummary.overdue ? 'var(--amber)' : 'var(--purple)'};width:${Math.min(homeworkSummary.pending * 20, 100)}%"></div></div>
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

  ${buildHomeworkCard(ch)}

  ${buildDailyChallengeCard(ch)}

  <div class="card">
    <div class="card-title">Progress Trend · Last 7 days</div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:18px;align-items:center">
      <div>
        ${renderTrendSvg(trendPoints, '#2d6a4f')}
        <div style="display:flex;justify-content:space-between;font-family:sans-serif;font-size:11px;color:var(--text3);margin-top:6px">
          <span>${trendStart}</span>
          <span>${trendEnd}</span>
        </div>
      </div>
      <div style="display:grid;gap:10px">
        <div style="background:var(--surface2);border-radius:12px;padding:12px">
          <div style="font-family:sans-serif;font-size:11px;color:var(--text3);margin-bottom:4px">Topics completed</div>
          <div style="font-size:26px;font-weight:700;color:var(--green)">${done}</div>
        </div>
        <div style="background:${trendDelta >= 0 ? 'var(--green-bg)' : 'var(--amber-bg)'};border-radius:12px;padding:12px">
          <div style="font-family:sans-serif;font-size:11px;color:var(--text3);margin-bottom:4px">7-day movement</div>
          <div style="font-size:22px;font-weight:700;color:${trendDelta >= 0 ? 'var(--green)' : 'var(--amber)'}">${trendDelta >= 0 ? '+' : ''}${trendDelta}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Subject Trends</div>`;

  Object.entries(subjects).forEach(([name, sub]) => {
    const subjectTrend = trendSnapshots.map(entry => ({
      date: entry.date,
      value: entry.subjectProgress?.[name]?.done || 0,
    }));
    const latest = subjectTrend[subjectTrend.length - 1]?.value || 0;
    const previous = subjectTrend[0]?.value || 0;
    const delta = latest - previous;
    html += `
      <div style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(120px,1fr) auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-family:sans-serif;font-size:13px;font-weight:700;color:var(--text)">${sub.icon} ${name}</div>
          <div style="font-family:sans-serif;font-size:11px;color:var(--text3)">${latest}/${sub.topics.length} topics done this week view</div>
        </div>
        <div>${renderTrendSvg(subjectTrend, sub.color)}</div>
        <div style="font-family:sans-serif;font-size:12px;font-weight:700;color:${delta >= 0 ? 'var(--green)' : 'var(--amber)'};min-width:42px;text-align:right">${delta >= 0 ? '+' : ''}${delta}</div>
      </div>`;
  });

  html += `</div>

  ${parentModeUnlocked ? buildPlannerCard(ch) : ''}

  ${parentModeUnlocked ? `<div class="card">
    <div class="card-title">Parent Notes</div>
    <div style="font-family:sans-serif;font-size:14px;color:var(--text2);line-height:1.7">
      ${noteCount ? `📝 ${noteCount} topic note${noteCount === 1 ? '' : 's'} saved for ${ch.name}. Open any subject to review or update annotations.` : `No topic notes saved yet. Open a subject and use “Add note” beside a topic to record resources, dates, or observations.`}
    </div>
  </div>` : ''}

  <div class="card">
    <div class="card-title">Quick Actions</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button onclick="goToWorld()" style="padding:11px;border-radius:10px;border:1px solid var(--border);background:var(--green-bg);color:var(--green);font-family:sans-serif;font-size:13px;font-weight:700;cursor:pointer">🌍 Back to World</button>
      <button onclick="showScreen('portfolio')" style="padding:11px;border-radius:10px;border:1px solid var(--border);background:var(--purple-bg);color:var(--purple);font-family:sans-serif;font-size:13px;font-weight:700;cursor:pointer">📁 Portfolio</button>
      <button onclick="${parentModeUnlocked ? 'logToday()' : homeworkSummary.next ? `openSubject('${homeworkSummary.next.subject}')` : 'logToday()'}" style="padding:11px;border-radius:10px;border:1px solid var(--border);background:var(--blue-bg);color:var(--blue);font-family:sans-serif;font-size:13px;font-weight:700;cursor:pointer">${parentModeUnlocked ? '📅 Log Today' : homeworkSummary.next ? '📚 Open Homework' : '📅 Log Today'}</button>
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

function getPortfolioItemsForReport(childId) {
  const sampleItems = [
    { id:'p1', title:'Fractions worksheet - mixed ops', subject:'Mathematics', type:'Worksheet', date:'14 Mar 2026' },
    { id:'p2', title:'Photosynthesis diagram', subject:'Natural Sciences', type:'Drawing', date:'10 Mar 2026' },
    { id:'p3', title:'Short story: "The Kalahari"', subject:'English HL', type:'Writing', date:'5 Mar 2026' },
    { id:'p4', title:'Bridge project report', subject:'Technology', type:'Project', date:'1 Mar 2026' },
  ];
  return [...sampleItems, ...(STATE.portfolio[childId] || [])];
}
function getLogEntriesForReport(childId) {
  const entries = STATE.log[childId] || [];
  const sampleEntries = [
    { date:'2026-03-16', subjects:'Mathematics, English', time:'3h 15min', mood:'😊 Great', notes:'Fractions with unlike denominators using fraction circles. Read chapter 3 of novel. Discussed setting and characters.' },
    { date:'2026-03-13', subjects:'Natural Sciences, Afrikaans', time:'2h 45min', mood:'😄 Excellent', notes:'Water cycle - drew and labelled diagram. Afrikaans: 20 new vocab words + Duolingo 2 lessons.' },
    { date:'2026-03-12', subjects:'Mathematics, Social Sciences', time:'3h 00min', mood:'😊 Great', notes:'Geometry: properties of 2D shapes. SA history: Cape sea route explorers.' },
  ];
  return (entries.length ? entries : sampleEntries).slice(0, 8);
}
function buildTutorShareSnapshot(childId = activeChildId) {
  const ch = STATE.children.find(child => child.id === childId);
  if (!ch) return null;

  ensureProgressTracking(ch.id);
  const weekKey = getWeekKey();
  const trendSnapshots = getRecentProgressSnapshots(ch.id, ch.grade, 7);
  const noteEntries = Object.entries(getNotes(ch.id)).map(([topicId, note]) => {
    const topic = getTopicById(ch.grade, topicId);
    return topic ? {
      topicId,
      subject: topic.subject,
      title: topic.title,
      icon: topic.icon,
      color: topic.color,
      note,
    } : null;
  }).filter(Boolean);
  const plannerDays = PLANNER_DAYS.map(day => ({
    key: day.key,
    label: day.label,
    entries: getPlannerEntries(ch.id, ch.grade, day.key, weekKey).map(entry => ({
      topicId: entry.id,
      subject: entry.subject,
      title: entry.title,
      icon: entry.icon,
      color: entry.color,
    })),
  }));
  const subjectSummary = Object.entries(CAPS_CURRICULUM[ch.grade] || {}).map(([name, sub]) => ({
    subject: name,
    icon: sub.icon,
    color: sub.color,
    done: getSubjectDoneCount(ch.id, ch.grade, name),
    inProgress: getSubjectInProgressCount(ch.id, ch.grade, name),
    total: sub.topics.length,
    percent: calcProgress(ch.id, ch.grade, name),
    notes: countTopicNotes(ch.id, ch.grade, name),
  }));

  return {
    version: 1,
    mode: 'tutor',
    createdAt: new Date().toISOString(),
    child: {
      id: ch.id,
      name: ch.name,
      grade: ch.grade,
      initials: ch.initials,
      color: ch.color,
    },
    progress: { ...getProgress(ch.id) },
    totals: calcTotals(ch.id, ch.grade),
    trend: trendSnapshots.map(snapshot => ({
      date: snapshot.date,
      totalDone: snapshot.totalDone,
      totalTopics: snapshot.totalTopics,
    })),
    subjectSummary,
    notes: noteEntries.slice(0, 24),
    planner: {
      weekKey,
      label: formatWeekLabel(weekKey),
      totalPlanned: getPlannerTopicCount(ch.id, weekKey),
      days: plannerDays,
    },
    homework: getHomeworkAssignments(ch.id, { includeDone: true }).slice(0, 12).map(entry => ({
      id: entry.id,
      topicId: entry.topicId,
      title: entry.title,
      subject: entry.subject,
      icon: entry.icon,
      color: entry.color,
      dueDate: entry.dueDate,
      dueLabel: entry.dueLabel,
      completedAt: entry.completedAt || null,
    })),
    portfolio: getPortfolioItemsForReport(ch.id).slice(0, 12),
    log: getLogEntriesForReport(ch.id).slice(0, 8),
  };
}
async function openTutorShareLink() {
  if (!parentModeUnlocked) return;
  const snapshot = buildTutorShareSnapshot();
  if (!snapshot) return;

  const encoded = encodeSharePayload(snapshot);
  if (!encoded) {
    alert('Could not create the tutor share snapshot.');
    return;
  }

  const shareUrl = new URL('./parent-dashboard/index.html', window.location.href);
  shareUrl.hash = 'tutor=' + encoded;

  const target = window.open(shareUrl.toString(), '_blank');
  let copied = false;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(shareUrl.toString());
      copied = true;
    } catch {}
  }

  if (!target) {
    alert(copied
      ? 'Tutor share link copied. Allow pop-ups if you want it to open automatically.'
      : 'Allow pop-ups to open the tutor share link automatically.');
    return;
  }

  alert(copied
    ? 'Tutor share view opened in a new tab, and the link was copied for sharing.'
    : 'Tutor share view opened in a new tab. You can copy the URL from the address bar.');
}
function renderInspectionReport() {
  const ch = getChild();
  if (!ch) return;
  ensureProgressTracking(ch.id);
  const subjects = CAPS_CURRICULUM[ch.grade] || {};
  const { total, done } = calcTotals(ch.id, ch.grade);
  const portfolioItems = getPortfolioItemsForReport(ch.id);
  const logEntries = getLogEntriesForReport(ch.id);
  const weekKey = getWeekKey();
  const noteCount = countTopicNotes(ch.id, ch.grade);
  const plannerCount = getPlannerTopicCount(ch.id, weekKey);
  const trendSnapshots = getRecentProgressSnapshots(ch.id, ch.grade, 7);
  const trendDelta = trendSnapshots.length > 1 ? trendSnapshots[trendSnapshots.length - 1].totalDone - trendSnapshots[0].totalDone : 0;

  let html = `
    <div class="report-sheet">
      <div class="report-header">
        <div>
          <div class="report-eyebrow">HomeSchool Hub Inspection Report</div>
          <h1>${ch.name} - Grade ${ch.grade}</h1>
          <div class="report-meta">Generated ${new Date().toLocaleDateString('en-ZA', { year:'numeric', month:'long', day:'numeric' })} · CAPS progress-based record</div>
        </div>
        <div class="report-badge">POPIA · On-device only</div>
      </div>

      <div class="report-summary">
        <div class="report-stat">
          <div class="report-stat-label">Topics completed</div>
          <div class="report-stat-value">${done}</div>
          <div class="report-stat-sub">${total} total topics in Grade ${ch.grade}</div>
        </div>
        <div class="report-stat">
          <div class="report-stat-label">7-day trend</div>
          <div class="report-stat-value">${trendDelta >= 0 ? '+' : ''}${trendDelta}</div>
          <div class="report-stat-sub">Change in completed topics this week</div>
        </div>
        <div class="report-stat">
          <div class="report-stat-label">Topic notes</div>
          <div class="report-stat-value">${noteCount}</div>
          <div class="report-stat-sub">Parent annotations saved</div>
        </div>
        <div class="report-stat">
          <div class="report-stat-label">Portfolio evidence</div>
          <div class="report-stat-value">${portfolioItems.length}</div>
          <div class="report-stat-sub">Items included in report</div>
        </div>
      </div>

      <section class="report-section">
        <h2>Subject report card</h2>
        <div class="report-table">
          <div class="report-table-head">
            <span>Subject</span>
            <span>Done</span>
            <span>In progress</span>
            <span>Notes</span>
            <span>Completion</span>
          </div>`;

  Object.entries(subjects).forEach(([name, sub]) => {
    const doneCount = getSubjectDoneCount(ch.id, ch.grade, name);
    const inProgressCount = getSubjectInProgressCount(ch.id, ch.grade, name);
    const subjectNotes = countTopicNotes(ch.id, ch.grade, name);
    const pct = calcProgress(ch.id, ch.grade, name);
    html += `
          <div class="report-table-row">
            <span>${sub.icon} ${name}</span>
            <span>${doneCount}/${sub.topics.length}</span>
            <span>${inProgressCount}</span>
            <span>${subjectNotes}</span>
            <span>${pct}%</span>
          </div>`;
  });

  html += `
        </div>
      </section>

      <section class="report-section">
        <h2>Parent notes and observations</h2>
        <div class="report-note-grid">`;

  const noteEntries = Object.entries(getNotes(ch.id));
  if (noteEntries.length) {
    noteEntries.forEach(([topicId, note]) => {
      const topic = getTopicById(ch.grade, topicId);
      if (!topic) return;
      html += `
          <div class="report-note-card">
            <div class="report-note-subject" style="color:${topic.color}">${topic.icon} ${topic.subject}</div>
            <div class="report-note-title">${escapeHtml(topic.title)}</div>
            <div class="report-note-body">${escapeHtml(note)}</div>
          </div>`;
    });
  } else {
    html += `<div class="report-empty">No topic notes have been added yet.</div>`;
  }

  html += `
        </div>
      </section>

      <section class="report-section">
        <h2>Weekly planner snapshot</h2>
        <div class="report-section-sub">Week of ${formatWeekLabel(weekKey)} · ${plannerCount} planned topic${plannerCount === 1 ? '' : 's'}</div>
        <div class="report-planner-grid">`;

  PLANNER_DAYS.forEach(day => {
    const entries = getPlannerEntries(ch.id, ch.grade, day.key, weekKey);
    html += `
          <div class="report-planner-day">
            <div class="report-planner-label">${day.label}</div>
            ${entries.length ? entries.map(entry => `<div class="report-planner-item">${entry.icon} ${escapeHtml(entry.subject)} - ${escapeHtml(entry.title)}</div>`).join('') : `<div class="report-planner-empty">No topics scheduled</div>`}
          </div>`;
  });

  html += `
        </div>
      </section>

      <section class="report-section">
        <h2>Portfolio evidence</h2>
        <div class="report-list">`;

  portfolioItems.forEach(item => {
    html += `
          <div class="report-list-row">
            <div>
              <div class="report-list-title">${escapeHtml(item.title)}</div>
              <div class="report-list-meta">${escapeHtml(item.subject)} · ${escapeHtml(item.type || 'Work')}</div>
            </div>
            <div class="report-list-date">${escapeHtml(item.date)}</div>
          </div>`;
  });

  html += `
        </div>
      </section>

      <section class="report-section">
        <h2>Learning log extract</h2>
        <div class="report-list">`;

  logEntries.forEach(entry => {
    html += `
          <div class="report-log-row">
            <div class="report-log-head">
              <div class="report-list-title">${escapeHtml(entry.date)} · ${escapeHtml(entry.subjects)}</div>
              <div class="report-list-date">${escapeHtml(entry.time || '—')}</div>
            </div>
            <div class="report-log-meta">${escapeHtml(entry.mood || '')}</div>
            <div class="report-log-notes">${escapeHtml(entry.notes || '')}</div>
          </div>`;
  });

  html += `
        </div>
      </section>
    </div>`;

  document.getElementById('report-body').innerHTML = html;
}
function printInspectionReport() {
  renderInspectionReport();
  setTimeout(() => window.print(), 60);
}
function exportPortfolio() {
  showScreen('report');
}

function handleArcadeMessage(event) {
  if (!event?.data || typeof event.data !== 'object') return;
  const { type, sessionId, payload } = event.data;
  if (!type || !sessionId) return;
  if (!isAllowedArcadeOrigin(event.origin)) {
    sendArcadeAck(event.source, event.origin, sessionId, 'blocked', { reason: 'origin_not_allowed' });
    return;
  }
  if (!activeArcadeSession || activeArcadeSession.sessionId !== sessionId) {
    sendArcadeAck(event.source, event.origin, sessionId, 'blocked', { reason: 'session_not_active' });
    return;
  }
  if (activeArcadeSession.origin !== event.origin) {
    sendArcadeAck(event.source, event.origin, sessionId, 'blocked', { reason: 'origin_session_mismatch' });
    return;
  }

  const childId = activeArcadeSession.childId;
  const child = STATE.children.find(entry => entry.id === childId);
  if (!child) {
    sendArcadeAck(event.source, event.origin, sessionId, 'blocked', { reason: 'child_not_found' });
    return;
  }

  if (type === 'HS_READY') {
    sendArcadeAck(event.source, event.origin, sessionId, 'ok', { ready: true });
    return;
  }

  if (type === 'HS_XP') {
    const amount = Math.max(0, Math.min(Number(payload?.amount || 0), 250));
    if (!amount) {
      sendArcadeAck(event.source, event.origin, sessionId, 'ignored', { reason: 'invalid_xp' });
      return;
    }
    STATE.xp[childId] = (STATE.xp[childId] || 0) + amount;
    syncMilestones(childId);
    recordProgressSnapshot(childId);
    saveState(STATE);
    if (childId === activeChildId) {
      updateHUD();
      if (typeof refreshWorldMilestones === 'function') refreshWorldMilestones();
      showXPToast(amount);
      if (currentScreen === 'dash') renderDashboard();
    }
    const challengeCompleted = maybeCompleteDailyChallenge(childId, activeArcadeSession.gameId, [], 'xp');
    if (challengeCompleted && childId === activeChildId && currentScreen === 'dash') renderDashboard();
    sendArcadeAck(event.source, event.origin, sessionId, 'ok', { awardedXp: amount });
    return;
  }

  if (type === 'HS_TOPIC_DONE') {
    const topicIds = Array.isArray(payload?.topicIds) ? payload.topicIds : [payload?.topicId].filter(Boolean);
    const applied = [];
    topicIds.forEach(topicId => {
      if (!activeArcadeSession.topicIds.includes(topicId)) return;
      const topic = getTopicById(child.grade, topicId);
      if (!topic) return;
      const current = getProgress(childId)[topicId] || 0;
      if (current !== 2) {
        setTopicState(childId, topicId, 2);
        applied.push(topicId);
      }
    });
    const challengeCompleted = maybeCompleteDailyChallenge(childId, activeArcadeSession.gameId, applied, 'topic_done');
    if (challengeCompleted && childId === activeChildId && currentScreen === 'dash') renderDashboard();
    sendArcadeAck(event.source, event.origin, sessionId, applied.length ? 'ok' : 'ignored', { appliedTopicIds: applied });
    return;
  }

  if (type === 'HS_PING') {
    sendArcadeAck(event.source, event.origin, sessionId, 'ok', { pong: true });
    return;
  }

  sendArcadeAck(event.source, event.origin, sessionId, 'ignored', { reason: 'unknown_type' });
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

function openTopicNote(topicId) {
  if (!parentModeUnlocked) return;
  const ch = getChild();
  if (!ch) return;
  const subject = CAPS_CURRICULUM[ch.grade]?.[activeSubject];
  const topic = subject?.topics?.find(entry => entry.id === topicId);
  if (!topic) return;

  const existing = getTopicNote(ch.id, topicId);
  const next = prompt('Parent note for "' + topic.title + '"', existing);
  if (next === null) return;
  const trimmed = next.trim();
  if (!trimmed && existing && !confirm('Remove this parent note?')) return;
  setTopicNote(ch.id, topicId, trimmed);
  renderSubject(activeSubject, subject, ch);
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

function cycleHomeStyle() {
  const child = getChild();
  if (!child) return;
  const currentIndex = HOME_STYLE_OPTIONS.findIndex(option => option.id === getHomeStyle(child));
  const nextStyle = HOME_STYLE_OPTIONS[(currentIndex + 1) % HOME_STYLE_OPTIONS.length];
  child.homeStyle = nextStyle.id;
  saveState(STATE);
  if (worldReady && typeof resetWorldForActiveChild === 'function') {
    resetWorldForActiveChild();
  }
  if (parentModeUnlocked) renderSettings();
  if (currentScreen === 'dash') renderDashboard();
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
    <div class="settings-row" onclick="cycleHomeStyle()" style="cursor:pointer">
      <div class="settings-icon">🏡</div>
      <div class="settings-label">Home base style</div>
      <div class="settings-value">${getHomeStyleMeta(getHomeStyle(ch)).label} →</div>
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
    <div class="settings-row" onclick="openTutorShareLink()" style="cursor:pointer">
      <div class="settings-icon">🔗</div>
      <div class="settings-label">Open tutor share link</div>
      <div class="settings-value">Read-only snapshot →</div>
    </div>
    <div class="settings-row" onclick="openCenterDashboard()" style="cursor:pointer">
      <div class="settings-icon">🏫</div>
      <div class="settings-label">Open centre dashboard</div>
      <div class="settings-value">Read-only multi-child →</div>
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
  STATE.progressMeta = {};
  STATE.progressHistory = {};
  STATE.xp = {};
  activeArcadeSession = null;
  saveState(STATE);
  closeModal('settings');
  updateHUD();
  alert('Progress reset.');
}

/* ═══════════════════════════════════════════════════════
   SERVICE WORKER REGISTRATION
════════════════════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js?v=20', { updateViaCache: 'none' }).catch(() => {});
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

window.addEventListener('message', handleArcadeMessage);

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
STATE.children.forEach(child => ensureProgressTracking(child.id));
if (STATE.children.length) {
  const preferredChildId = getPreferredChildId();
  if (preferredChildId) {
    selectChild(preferredChildId);
    requestAnimationFrame(() => enterWorld());
  }
}

