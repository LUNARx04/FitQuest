// FitQuest — Gamified Fitness Tracker
// State
const state = {
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  streak: 0,
  lastWorkoutDate: null,
  workouts: [],
  gymWorkouts: [],
  workoutTemplates: [],
  routineSchedule: {},
  routineCompletions: {},
  reminderSettings: {
    enabled: false,
    workoutReminderTime: '18:00',
    restDayEnabled: true,
    restDayReminderTime: '10:00',
    streakRiskTime: '20:00'
  },
  reminderMeta: {
    workoutSentOn: null,
    restSentOn: null,
    streakRiskSentOn: null
  },
  completedQuests: [],
  hard75: {
    dayStreak: 0,
    lastCompletedDate: null,
    logs: {}
  }
};

const APP_STORAGE_KEY = 'fitquest-state';
const TOOLBAR_STORAGE_KEY = 'fitquest-toolbar-tabs';
const EXPORT_SCHEMA_VERSION = 1;
const CLOUD_PENDING_KEY = 'fitquest-pending-sync';
const CLOUD_DOC_ID = 'current';

const cloudSync = {
  enabled: false,
  app: null,
  auth: null,
  db: null,
  user: null,
  initialized: false,
  syncing: false,
  authReady: false,
  skipNextSaveQueue: false,
  syncTimer: null
};
let uiToastTimer = null;

// Gym tracker state
let gymState = {
  exercises: [],
  startTime: null,
  activeTemplateId: null,
  restTimerInterval: null,
  restSecondsRemaining: 0
};

const ROUTINE_WEEK_DAYS = [
  { id: 'mon', label: 'Mon', index: 1 },
  { id: 'tue', label: 'Tue', index: 2 },
  { id: 'wed', label: 'Wed', index: 3 },
  { id: 'thu', label: 'Thu', index: 4 },
  { id: 'fri', label: 'Fri', index: 5 },
  { id: 'sat', label: 'Sat', index: 6 },
  { id: 'sun', label: 'Sun', index: 0 }
];
const DEFAULT_REMINDER_SETTINGS = {
  enabled: false,
  workoutReminderTime: '18:00',
  restDayEnabled: true,
  restDayReminderTime: '10:00',
  streakRiskTime: '20:00'
};
let reminderCheckInterval = null;

// Quests definitions
const QUESTS = [
  { id: 'run-30', title: 'Morning Run', desc: 'Run for 30 minutes', xp: 50, icon: '🏃', type: 'run', target: 30 },
  { id: 'walk-60', title: 'Daily Steps', desc: 'Walk for 60 minutes total', xp: 30, icon: '🚶', type: 'walk', target: 60 },
  { id: 'gym-3', title: 'Gym Warrior', desc: 'Complete 3 gym sessions this week', xp: 100, icon: '🏋️', type: 'gym', target: 3 },
  { id: 'yoga-2', title: 'Zen Master', desc: 'Do 2 yoga sessions', xp: 40, icon: '🧘', type: 'yoga', target: 2 },
  { id: 'workout-5', title: 'Weekly Champion', desc: 'Complete 5 workouts this week', xp: 150, icon: '🏆', type: 'any', target: 5 },
  { id: 'streak-7', title: 'Week Warrior', desc: 'Maintain a 7-day workout streak', xp: 200, icon: '🔥', type: 'streak', target: 7 }
];

// Achievements
const ACHIEVEMENTS = [
  { id: 'first', title: 'First Steps', desc: 'Complete your first workout', icon: '🌟', check: () => state.workouts.length >= 1 },
  { id: 'level5', title: 'Rising Star', desc: 'Reach level 5', icon: '⭐', check: () => state.level >= 5 },
  { id: 'level10', title: 'Champion', desc: 'Reach level 10', icon: '👑', check: () => state.level >= 10 },
  { id: 'streak3', title: 'On Fire', desc: '3-day workout streak', icon: '🔥', check: () => state.streak >= 3 },
  { id: 'streak7', title: 'Unstoppable', desc: '7-day workout streak', icon: '💪', check: () => state.streak >= 7 },
  { id: 'workouts10', title: 'Dedicated', desc: 'Complete 10 workouts', icon: '📊', check: () => state.workouts.length >= 10 },
  { id: 'workouts50', title: 'Legend', desc: 'Complete 50 workouts', icon: '🏅', check: () => state.workouts.length >= 50 },
  { id: 'xp1000', title: 'XP Master', desc: 'Earn 1000 total XP', icon: '💎', check: () => getTotalXP() >= 1000 }
];

// XP calculation
function xpForLevel(level) {
  return Math.floor(100 + (level - 1) * 50);
}

function getTotalXP() {
  let total = state.xp;
  for (let i = 1; i < state.level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

// Load from localStorage
function loadState() {
  const saved = localStorage.getItem(APP_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(state, parsed);
    } catch (e) {
      console.warn('Could not load saved state');
    }
  }
}

// Save to localStorage
function saveState() {
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify({
    level: state.level,
    xp: state.xp,
    xpToNextLevel: state.xpToNextLevel,
    streak: state.streak,
    lastWorkoutDate: state.lastWorkoutDate,
    workouts: state.workouts,
    gymWorkouts: state.gymWorkouts,
    workoutTemplates: state.workoutTemplates,
    routineSchedule: state.routineSchedule,
    routineCompletions: state.routineCompletions,
    reminderSettings: state.reminderSettings,
    reminderMeta: state.reminderMeta,
    completedQuests: state.completedQuests,
    hard75: state.hard75
  }));

  if (cloudSync.skipNextSaveQueue) {
    cloudSync.skipNextSaveQueue = false;
    return;
  }
  queueCloudSync();
}

function setDataActionStatus(message, isError = false) {
  const el = document.getElementById('dataActionStatus');
  if (!el) return;
  el.textContent = message || '';
  el.style.color = isError ? '#ef4444' : '';
}

function showToast(message) {
  const toast = document.getElementById('appToast');
  if (!toast) return;
  toast.textContent = message || '';
  toast.classList.add('visible');
  clearTimeout(uiToastTimer);
  uiToastTimer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 1800);
}

function isValidTimeString(value) {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
}

function normalizeReminderSettings(input) {
  const settings = input && typeof input === 'object' ? input : {};
  return {
    enabled: !!settings.enabled,
    workoutReminderTime: isValidTimeString(settings.workoutReminderTime) ? settings.workoutReminderTime : DEFAULT_REMINDER_SETTINGS.workoutReminderTime,
    restDayEnabled: settings.restDayEnabled == null ? DEFAULT_REMINDER_SETTINGS.restDayEnabled : !!settings.restDayEnabled,
    restDayReminderTime: isValidTimeString(settings.restDayReminderTime) ? settings.restDayReminderTime : DEFAULT_REMINDER_SETTINGS.restDayReminderTime,
    streakRiskTime: isValidTimeString(settings.streakRiskTime) ? settings.streakRiskTime : DEFAULT_REMINDER_SETTINGS.streakRiskTime
  };
}

function normalizeReminderMeta(input) {
  const meta = input && typeof input === 'object' ? input : {};
  return {
    workoutSentOn: typeof meta.workoutSentOn === 'string' ? meta.workoutSentOn : null,
    restSentOn: typeof meta.restSentOn === 'string' ? meta.restSentOn : null,
    streakRiskSentOn: typeof meta.streakRiskSentOn === 'string' ? meta.streakRiskSentOn : null
  };
}

function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function setReminderStatus(message, isError = false) {
  const status = document.getElementById('reminderStatus');
  if (!status) return;
  status.textContent = message || '';
  status.style.color = isError ? '#ef4444' : '';
}

function hasWorkoutLoggedToday() {
  const today = new Date().toDateString();
  return (state.workouts || []).some(w => new Date(w.date).toDateString() === today);
}

function isTodayRestDay() {
  return !getPlannedTemplateForDate(new Date());
}

function hasReachedTimeToday(timeString) {
  if (!isValidTimeString(timeString)) return false;
  const [h, m] = timeString.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  return now.getTime() >= target.getTime();
}

function sendReminderNotification(title, body) {
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: 'icon.svg' });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

async function maybeRequestNotificationPermission() {
  if (!isNotificationSupported()) {
    setReminderStatus('Notifications are not supported in this browser. Reminders will stay in-app only.', true);
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') {
    setReminderStatus('Notifications are blocked. Enable them in browser settings.', true);
    return false;
  }
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      setReminderStatus('Notifications enabled.');
      return true;
    }
    setReminderStatus('Notifications not granted. Reminders will remain in-app.', true);
    return false;
  } catch {
    setReminderStatus('Could not request notification permission.', true);
    return false;
  }
}

function evaluateReminderTriggers() {
  const settings = normalizeReminderSettings(state.reminderSettings || {});
  state.reminderSettings = settings;
  state.reminderMeta = normalizeReminderMeta(state.reminderMeta || {});
  if (!settings.enabled) return;

  const todayKey = new Date().toDateString();
  let updated = false;

  if (!isTodayRestDay() && hasReachedTimeToday(settings.workoutReminderTime) && state.reminderMeta.workoutSentOn !== todayKey && !hasWorkoutLoggedToday()) {
    const sent = sendReminderNotification('FitQuest Reminder', 'Time for your planned workout. Keep your streak alive.');
    if (!sent) setReminderStatus('Reminder fired in-app. Enable notifications for system alerts.', true);
    else showToast('Workout reminder sent');
    state.reminderMeta.workoutSentOn = todayKey;
    updated = true;
  }

  if (settings.restDayEnabled && isTodayRestDay() && hasReachedTimeToday(settings.restDayReminderTime) && state.reminderMeta.restSentOn !== todayKey) {
    const sent = sendReminderNotification('FitQuest Rest Day', 'Today is a rest day. Recovery, mobility, and hydration still count.');
    if (!sent) setReminderStatus('Rest-day reminder fired in-app. Enable notifications for alerts.', true);
    else showToast('Rest-day reminder sent');
    state.reminderMeta.restSentOn = todayKey;
    updated = true;
  }

  if (!isTodayRestDay() && !hasWorkoutLoggedToday() && hasReachedTimeToday(settings.streakRiskTime) && state.reminderMeta.streakRiskSentOn !== todayKey) {
    const sent = sendReminderNotification('Streak Risk Warning', 'No workout logged yet today. Log one to protect your streak.');
    if (!sent) setReminderStatus('Streak-risk warning fired in-app. Enable notifications for alerts.', true);
    else showToast('Streak-risk warning sent');
    state.reminderMeta.streakRiskSentOn = todayKey;
    updated = true;
  }

  if (updated) saveState();
}

function startReminderScheduler() {
  if (reminderCheckInterval) clearInterval(reminderCheckInterval);
  reminderCheckInterval = setInterval(evaluateReminderTriggers, 30000);
  evaluateReminderTriggers();
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(headers, rows) {
  const lines = [];
  lines.push(headers.map(escapeCsv).join(','));
  rows.forEach(row => lines.push(row.map(escapeCsv).join(',')));
  return lines.join('\n');
}

function buildExportPayload() {
  const snapshot = JSON.parse(JSON.stringify({
    level: state.level,
    xp: state.xp,
    xpToNextLevel: state.xpToNextLevel,
    streak: state.streak,
    lastWorkoutDate: state.lastWorkoutDate,
    workouts: state.workouts,
    gymWorkouts: state.gymWorkouts,
    workoutTemplates: state.workoutTemplates,
    routineSchedule: state.routineSchedule,
    routineCompletions: state.routineCompletions,
    reminderSettings: state.reminderSettings,
    reminderMeta: state.reminderMeta,
    completedQuests: state.completedQuests,
    hard75: state.hard75
  }));

  return {
    version: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    state: snapshot,
    toolbarTabs: getSavedToolbarTabs()
  };
}

function buildCsvExport() {
  const sections = [];

  const workoutRows = (state.workouts || []).map(w => [
    w.id, w.type, w.duration, w.intensity, w.notes, w.xp, w.date
  ]);
  sections.push('WORKOUTS');
  sections.push(toCsv(['id', 'type', 'duration_minutes', 'intensity', 'notes', 'xp', 'date_iso'], workoutRows));

  const setRows = [];
  (state.gymWorkouts || []).forEach(w => {
    (w.exercises || []).forEach(ex => {
      (ex.sets || []).forEach((set, idx) => {
        setRows.push([
          w.id, w.date, ex.id, ex.name, ex.muscle, idx + 1, set.reps ?? '', set.weight ?? ''
        ]);
      });
    });
  });
  sections.push('');
  sections.push('GYM_WORKOUT_SETS');
  sections.push(toCsv(
    ['workout_id', 'date_iso', 'exercise_id', 'exercise_name', 'muscle', 'set_number', 'reps', 'weight'],
    setRows
  ));

  const templateRows = [];
  (state.workoutTemplates || []).forEach(t => {
    (t.exercises || []).forEach(ex => {
      templateRows.push([t.id, t.name, ex.id, ex.name, ex.muscle, (ex.sets || []).length]);
    });
  });
  sections.push('');
  sections.push('WORKOUT_TEMPLATES');
  sections.push(toCsv(['template_id', 'template_name', 'exercise_id', 'exercise_name', 'muscle', 'set_count'], templateRows));

  const hard75Rows = Object.entries((state.hard75 && state.hard75.logs) || {}).map(([date, log]) => ([
    date,
    !!log.diet,
    !!log.workout1,
    !!log.workout2Outdoor,
    !!log.water,
    !!log.read,
    !!log.photo
  ]));
  sections.push('');
  sections.push('HARD75_LOGS');
  sections.push(toCsv(['date', 'diet', 'workout1', 'workout2Outdoor', 'water', 'read', 'photo'], hard75Rows));

  sections.push('');
  sections.push('SETTINGS');
  sections.push(toCsv(['key', 'value'], [
    ['toolbarTabs', getSavedToolbarTabs().join('|')],
    ['routineSchedule', JSON.stringify(state.routineSchedule || {})],
    ['routineCompletions', JSON.stringify(state.routineCompletions || {})],
    ['reminderSettings', JSON.stringify(state.reminderSettings || {})]
  ]));

  return sections.join('\n');
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sanitizeImportedState(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid import file format.');

  const safe = {
    level: Number.isFinite(raw.level) ? Math.max(1, Math.floor(raw.level)) : 1,
    xp: Number.isFinite(raw.xp) ? Math.max(0, Math.floor(raw.xp)) : 0,
    xpToNextLevel: Number.isFinite(raw.xpToNextLevel) ? Math.max(1, Math.floor(raw.xpToNextLevel)) : 100,
    streak: Number.isFinite(raw.streak) ? Math.max(0, Math.floor(raw.streak)) : 0,
    lastWorkoutDate: typeof raw.lastWorkoutDate === 'string' ? raw.lastWorkoutDate : null,
    workouts: Array.isArray(raw.workouts) ? raw.workouts : [],
    gymWorkouts: Array.isArray(raw.gymWorkouts) ? raw.gymWorkouts : [],
    workoutTemplates: Array.isArray(raw.workoutTemplates) ? raw.workoutTemplates : [],
    routineSchedule: raw.routineSchedule && typeof raw.routineSchedule === 'object' ? raw.routineSchedule : {},
    routineCompletions: raw.routineCompletions && typeof raw.routineCompletions === 'object' ? raw.routineCompletions : {},
    reminderSettings: raw.reminderSettings && typeof raw.reminderSettings === 'object' ? raw.reminderSettings : {},
    reminderMeta: raw.reminderMeta && typeof raw.reminderMeta === 'object' ? raw.reminderMeta : {},
    completedQuests: Array.isArray(raw.completedQuests) ? raw.completedQuests : [],
    hard75: raw.hard75 && typeof raw.hard75 === 'object' ? raw.hard75 : { dayStreak: 0, lastCompletedDate: null, logs: {} }
  };

  safe.hard75 = {
    dayStreak: Number.isFinite(safe.hard75.dayStreak) ? Math.max(0, Math.floor(safe.hard75.dayStreak)) : 0,
    lastCompletedDate: typeof safe.hard75.lastCompletedDate === 'string' ? safe.hard75.lastCompletedDate : null,
    logs: safe.hard75.logs && typeof safe.hard75.logs === 'object' ? safe.hard75.logs : {}
  };
  safe.reminderSettings = normalizeReminderSettings(safe.reminderSettings);
  safe.reminderMeta = normalizeReminderMeta(safe.reminderMeta);

  return safe;
}

function mergeById(existing, incoming) {
  const out = new Map();
  (existing || []).forEach(item => {
    const key = item && item.id != null ? String(item.id) : `existing-${Math.random()}`;
    out.set(key, item);
  });
  (incoming || []).forEach(item => {
    const key = item && item.id != null ? String(item.id) : `incoming-${Math.random()}`;
    out.set(key, item);
  });
  return [...out.values()];
}

function applyImportedData(importedState, importedToolbarTabs, mode) {
  if (mode === 'merge') {
    state.level = Math.max(state.level, importedState.level);
    state.xp = Math.max(state.xp, importedState.xp);
    state.xpToNextLevel = Math.max(state.xpToNextLevel, importedState.xpToNextLevel);
    state.streak = Math.max(state.streak, importedState.streak);
    state.lastWorkoutDate = importedState.lastWorkoutDate || state.lastWorkoutDate;
    state.workouts = mergeById(state.workouts, importedState.workouts);
    state.gymWorkouts = mergeById(state.gymWorkouts, importedState.gymWorkouts);
    state.workoutTemplates = mergeById(state.workoutTemplates, importedState.workoutTemplates);
    state.routineSchedule = { ...(state.routineSchedule || {}), ...(importedState.routineSchedule || {}) };
    state.routineCompletions = { ...(state.routineCompletions || {}), ...(importedState.routineCompletions || {}) };
    state.reminderSettings = normalizeReminderSettings({ ...(state.reminderSettings || {}), ...(importedState.reminderSettings || {}) });
    state.reminderMeta = normalizeReminderMeta({ ...(state.reminderMeta || {}), ...(importedState.reminderMeta || {}) });
    state.completedQuests = [...new Set([...(state.completedQuests || []), ...(importedState.completedQuests || [])])];
    state.hard75 = {
      dayStreak: Math.max(state.hard75?.dayStreak || 0, importedState.hard75?.dayStreak || 0),
      lastCompletedDate: importedState.hard75?.lastCompletedDate || state.hard75?.lastCompletedDate || null,
      logs: { ...(state.hard75?.logs || {}), ...(importedState.hard75?.logs || {}) }
    };
  } else {
    state.level = importedState.level;
    state.xp = importedState.xp;
    state.xpToNextLevel = importedState.xpToNextLevel;
    state.streak = importedState.streak;
    state.lastWorkoutDate = importedState.lastWorkoutDate;
    state.workouts = importedState.workouts;
    state.gymWorkouts = importedState.gymWorkouts;
    state.workoutTemplates = importedState.workoutTemplates;
    state.routineSchedule = importedState.routineSchedule || {};
    state.routineCompletions = importedState.routineCompletions || {};
    state.reminderSettings = normalizeReminderSettings(importedState.reminderSettings || {});
    state.reminderMeta = normalizeReminderMeta(importedState.reminderMeta || {});
    state.completedQuests = importedState.completedQuests;
    state.hard75 = importedState.hard75;
  }

  if (Array.isArray(importedToolbarTabs) && importedToolbarTabs.length) {
    localStorage.setItem(TOOLBAR_STORAGE_KEY, JSON.stringify(importedToolbarTabs));
  }

  saveState();
  applyToolbarTabs(getSavedToolbarTabs());
  gymState.exercises = [];
  gymState.startTime = null;
  gymState.activeTemplateId = null;
  renderGymExercises();
  updateUI();
  renderProgressExerciseOptions();
  renderRoutinePlanner();
  evaluateReminderTriggers();
}

function hasMeaningfulStateData(inputState) {
  if (!inputState || typeof inputState !== 'object') return false;
  return (
    (inputState.workouts && inputState.workouts.length > 0) ||
    (inputState.gymWorkouts && inputState.gymWorkouts.length > 0) ||
    (inputState.workoutTemplates && inputState.workoutTemplates.length > 0) ||
    Object.keys(inputState.routineSchedule || {}).length > 0 ||
    Object.keys(inputState.routineCompletions || {}).length > 0 ||
    (inputState.completedQuests && inputState.completedQuests.length > 0) ||
    ((inputState.hard75 && inputState.hard75.dayStreak) || 0) > 0
  );
}

function setAuthStatus(text, isError = false) {
  const el = document.getElementById('authStatus');
  if (!el) return;
  el.textContent = text || '';
  el.style.color = isError ? '#ef4444' : '';
}

function getCloudDocRef(uid) {
  return cloudSync.db.collection('users').doc(uid).collection('app').doc(CLOUD_DOC_ID);
}

function buildCloudSnapshot() {
  return {
    ...buildExportPayload(),
    updatedAt: Date.now()
  };
}

function savePendingCloudSnapshot(snapshot) {
  localStorage.setItem(CLOUD_PENDING_KEY, JSON.stringify(snapshot));
}

function readPendingCloudSnapshot() {
  try {
    const raw = localStorage.getItem(CLOUD_PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearPendingCloudSnapshot() {
  localStorage.removeItem(CLOUD_PENDING_KEY);
}

function queueCloudSync() {
  if (!cloudSync.enabled || !cloudSync.user) return;
  const snapshot = buildCloudSnapshot();
  savePendingCloudSnapshot(snapshot);
  if (cloudSync.syncTimer) clearTimeout(cloudSync.syncTimer);
  cloudSync.syncTimer = setTimeout(() => {
    flushCloudSyncQueue();
  }, 700);
}

async function flushCloudSyncQueue() {
  if (!cloudSync.enabled || !cloudSync.user || !navigator.onLine || cloudSync.syncing) return;
  const pending = readPendingCloudSnapshot();
  if (!pending) return;

  cloudSync.syncing = true;
  try {
    await getCloudDocRef(cloudSync.user.uid).set({
      ...pending,
      uid: cloudSync.user.uid
    }, { merge: true });
    clearPendingCloudSnapshot();
    setAuthStatus(`Signed in as ${cloudSync.user.email || 'user'} • Synced`);
  } catch {
    setAuthStatus('Sync pending (offline or network issue).');
  } finally {
    cloudSync.syncing = false;
  }
}

async function pullCloudStateAndMigrate() {
  if (!cloudSync.enabled || !cloudSync.user) return;
  try {
    const snap = await getCloudDocRef(cloudSync.user.uid).get();
    const cloudData = snap.exists ? snap.data() : null;
    const cloudStateRaw = cloudData && cloudData.state ? cloudData.state : null;
    const cloudState = cloudStateRaw ? sanitizeImportedState(cloudStateRaw) : null;
    const localState = sanitizeImportedState(state);

    const localHasData = hasMeaningfulStateData(localState);
    const cloudHasData = hasMeaningfulStateData(cloudState);

    if (cloudHasData && localHasData) {
      cloudSync.skipNextSaveQueue = true;
      applyImportedData(cloudState, cloudData.toolbarTabs || null, 'merge');
      queueCloudSync();
    } else if (cloudHasData) {
      cloudSync.skipNextSaveQueue = true;
      applyImportedData(cloudState, cloudData.toolbarTabs || null, 'replace');
    } else if (localHasData) {
      queueCloudSync();
      await flushCloudSyncQueue();
    }
  } catch {
    setAuthStatus('Signed in, cloud sync unavailable.', true);
  }
}

async function handleAuthState(user) {
  cloudSync.user = user || null;
  const emailInput = document.getElementById('authEmail');
  if (emailInput) emailInput.value = user?.email || '';
  if (!user) {
    setAuthStatus('Not signed in');
    return;
  }
  setAuthStatus(`Signed in as ${user.email || 'user'}`);
  await pullCloudStateAndMigrate();
  await flushCloudSyncQueue();
}

function initCloudSync() {
  const config = window.FITQUEST_CLOUD_CONFIG;
  if (!config || typeof config !== 'object') {
    setAuthStatus('Cloud sync disabled (add Firebase config).');
    return;
  }

  if (!window.firebase || !firebase.apps) {
    setAuthStatus('Cloud sync unavailable.');
    return;
  }

  try {
    cloudSync.app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
    cloudSync.auth = firebase.auth();
    cloudSync.db = firebase.firestore();
    cloudSync.enabled = true;
    cloudSync.initialized = true;

    cloudSync.auth.onAuthStateChanged(async (user) => {
      await handleAuthState(user);
    });

    window.addEventListener('online', () => {
      flushCloudSyncQueue();
    });
  } catch {
    cloudSync.enabled = false;
    setAuthStatus('Cloud sync init failed.', true);
  }
}

// Add XP and handle level up
function addXP(amount) {
  state.xp += amount;
  while (state.xp >= state.xpToNextLevel) {
    state.xp -= state.xpToNextLevel;
    state.level++;
    state.xpToNextLevel = xpForLevel(state.level);
  }
  saveState();
  updateUI();
}

// Update streak
function updateStreak() {
  const today = new Date().toDateString();
  if (state.lastWorkoutDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  if (state.lastWorkoutDate === yesterdayStr) {
    state.streak++;
  } else {
    state.streak = 1;
  }
  state.lastWorkoutDate = today;
}

// Get workout type icon
function getWorkoutIcon(type) {
  const icons = { run: '🏃', walk: '🚶', gym: '🏋️', yoga: '🧘', cycling: '🚴', swim: '🏊', other: '💪' };
  return icons[type] || '💪';
}

// Tab switching
let mainTabTransitionId = 0;

function switchMainTab(nextTabId) {
  const current = document.querySelector('.tab-content.active');
  const next = document.getElementById(nextTabId);
  if (!next || (current && current.id === nextTabId)) return;

  const transitionId = ++mainTabTransitionId;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.nav-tab[data-tab="${nextTabId}"]`)?.classList.add('active');

  if (!current) {
    next.classList.add('active');
    return;
  }

  current.classList.add('leaving');
  next.classList.add('active', 'entering');

  setTimeout(() => {
    if (transitionId !== mainTabTransitionId) return;
    current.classList.remove('active', 'leaving');
    next.classList.remove('entering');
  }, 220);
}

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => switchMainTab(tab.dataset.tab));
});

const DEFAULT_TOOLBAR_TABS = ['dashboard', 'quests', 'workout', 'hard75', 'achievements'];

function getSavedToolbarTabs() {
  try {
    const raw = localStorage.getItem(TOOLBAR_STORAGE_KEY);
    if (!raw) return [...DEFAULT_TOOLBAR_TABS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_TOOLBAR_TABS];
    const available = DEFAULT_TOOLBAR_TABS.filter(id =>
      document.querySelector(`.nav-tab[data-nav-id="${id}"]`)
    );
    const cleaned = parsed.filter(id => available.includes(id));
    return cleaned.length >= 3 ? cleaned : [...DEFAULT_TOOLBAR_TABS];
  } catch {
    return [...DEFAULT_TOOLBAR_TABS];
  }
}

function applyToolbarTabs(tabIds) {
  const allowed = new Set(tabIds);
  document.querySelectorAll('.nav-tab[data-nav-id]').forEach(tab => {
    tab.classList.toggle('hidden', !allowed.has(tab.dataset.navId));
  });

  const currentActive = document.querySelector('.nav-tab.active');
  if (currentActive && currentActive.classList.contains('hidden')) {
    const firstVisible = document.querySelector('.nav-tab[data-nav-id]:not(.hidden)');
    if (firstVisible) switchMainTab(firstVisible.dataset.tab);
  }
}

function renderToolbarOptions(selectedIds) {
  const container = document.getElementById('toolbarOptions');
  if (!container) return;
  const selected = new Set(selectedIds);
  const labels = {
    dashboard: 'Dashboard',
    quests: 'Quests',
    workout: 'Workout',
    hard75: '75 Hard',
    achievements: 'Achievements'
  };
  container.innerHTML = DEFAULT_TOOLBAR_TABS.map(id => `
    <label class="toolbar-option">
      <input type="checkbox" data-toolbar-id="${id}" ${selected.has(id) ? 'checked' : ''}>
      <span>${labels[id]}</span>
    </label>
  `).join('');
}

function initToolbarSettings() {
  const openBtn = document.getElementById('openToolbarSettings');
  const closeBtn = document.getElementById('closeToolbarSettings');
  const saveBtn = document.getElementById('saveToolbarSettings');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const importJsonBtn = document.getElementById('importJsonBtn');
  const importInput = document.getElementById('importJsonInput');
  const importMode = document.getElementById('importMode');
  const signUpBtn = document.getElementById('signUpBtn');
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const syncNowBtn = document.getElementById('syncNowBtn');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const remindersEnabled = document.getElementById('remindersEnabled');
  const workoutReminderTime = document.getElementById('workoutReminderTime');
  const restDayRemindersEnabled = document.getElementById('restDayRemindersEnabled');
  const restDayReminderTime = document.getElementById('restDayReminderTime');
  const streakRiskTime = document.getElementById('streakRiskTime');
  const modal = document.getElementById('toolbarSettingsModal');
  if (!openBtn || !closeBtn || !saveBtn || !modal || !exportJsonBtn || !exportCsvBtn || !importJsonBtn || !importInput || !importMode || !signUpBtn || !signInBtn || !signOutBtn || !syncNowBtn || !authEmail || !authPassword || !remindersEnabled || !workoutReminderTime || !restDayRemindersEnabled || !restDayReminderTime || !streakRiskTime) return;

  applyToolbarTabs(getSavedToolbarTabs());
  state.reminderSettings = normalizeReminderSettings(state.reminderSettings || {});
  state.reminderMeta = normalizeReminderMeta(state.reminderMeta || {});

  function syncReminderControlsFromState() {
    const s = normalizeReminderSettings(state.reminderSettings || {});
    remindersEnabled.checked = !!s.enabled;
    workoutReminderTime.value = s.workoutReminderTime;
    restDayRemindersEnabled.checked = !!s.restDayEnabled;
    restDayReminderTime.value = s.restDayReminderTime;
    streakRiskTime.value = s.streakRiskTime;
  }

  syncReminderControlsFromState();
  if (!isNotificationSupported()) {
    setReminderStatus('Notifications are not supported in this browser. Reminders will stay in-app only.', true);
  } else if (Notification.permission === 'denied') {
    setReminderStatus('Notifications are blocked. Enable them in browser settings.', true);
  } else {
    setReminderStatus('Configure reminder times and keep FitQuest open to receive them.');
  }

  openBtn.addEventListener('click', () => {
    renderToolbarOptions(getSavedToolbarTabs());
    syncReminderControlsFromState();
    modal.classList.remove('hidden');
  });

  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'toolbarSettingsModal') modal.classList.add('hidden');
  });

  saveBtn.addEventListener('click', () => {
    const selected = [...modal.querySelectorAll('input[data-toolbar-id]:checked')]
      .map(el => el.dataset.toolbarId);
    if (selected.length < 3) {
      alert('Keep at least 3 tabs for quick navigation.');
      return;
    }
    localStorage.setItem(TOOLBAR_STORAGE_KEY, JSON.stringify(selected));
    applyToolbarTabs(selected);
    queueCloudSync();
    modal.classList.add('hidden');
  });

  exportJsonBtn.addEventListener('click', () => {
    try {
      const payload = buildExportPayload();
      downloadTextFile(`fitquest-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json');
      setDataActionStatus('JSON export downloaded.');
    } catch {
      setDataActionStatus('Could not export JSON.', true);
    }
  });

  exportCsvBtn.addEventListener('click', () => {
    try {
      const csv = buildCsvExport();
      downloadTextFile(`fitquest-export-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
      setDataActionStatus('CSV export downloaded.');
    } catch {
      setDataActionStatus('Could not export CSV.', true);
    }
  });

  importJsonBtn.addEventListener('click', () => {
    importInput.value = '';
    importInput.click();
  });

  importInput.addEventListener('change', async () => {
    const file = importInput.files && importInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const importedState = sanitizeImportedState(raw.state || raw);
      const importedToolbarTabs = Array.isArray(raw.toolbarTabs) ? raw.toolbarTabs : null;
      const mode = importMode.value === 'merge' ? 'merge' : 'replace';
      applyImportedData(importedState, importedToolbarTabs, mode);
      setDataActionStatus(`Import successful (${mode}).`);
    } catch (err) {
      setDataActionStatus('Import failed: invalid file format.', true);
    }
  });

  signUpBtn.addEventListener('click', async () => {
    if (!cloudSync.enabled || !cloudSync.auth) {
      setAuthStatus('Cloud sync disabled. Add Firebase config.', true);
      return;
    }
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || password.length < 6) {
      setAuthStatus('Use a valid email and password (6+ chars).', true);
      return;
    }
    try {
      await cloudSync.auth.createUserWithEmailAndPassword(email, password);
      setAuthStatus(`Signed up as ${email}`);
    } catch (e) {
      setAuthStatus('Sign up failed. Check email/password.', true);
    }
  });

  signInBtn.addEventListener('click', async () => {
    if (!cloudSync.enabled || !cloudSync.auth) {
      setAuthStatus('Cloud sync disabled. Add Firebase config.', true);
      return;
    }
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) {
      setAuthStatus('Enter email and password.', true);
      return;
    }
    try {
      await cloudSync.auth.signInWithEmailAndPassword(email, password);
      setAuthStatus(`Signed in as ${email}`);
    } catch {
      setAuthStatus('Sign in failed. Check credentials.', true);
    }
  });

  signOutBtn.addEventListener('click', async () => {
    if (!cloudSync.enabled || !cloudSync.auth) {
      setAuthStatus('Cloud sync disabled. Add Firebase config.', true);
      return;
    }
    try {
      await cloudSync.auth.signOut();
      setAuthStatus('Signed out');
    } catch {
      setAuthStatus('Sign out failed.', true);
    }
  });

  syncNowBtn.addEventListener('click', async () => {
    if (!cloudSync.enabled || !cloudSync.user) {
      setAuthStatus('Sign in to sync.');
      return;
    }
    queueCloudSync();
    await flushCloudSyncQueue();
  });

  remindersEnabled.addEventListener('change', async () => {
    state.reminderSettings.enabled = remindersEnabled.checked;
    if (remindersEnabled.checked) await maybeRequestNotificationPermission();
    saveState();
    evaluateReminderTriggers();
  });

  workoutReminderTime.addEventListener('change', () => {
    if (!isValidTimeString(workoutReminderTime.value)) return;
    state.reminderSettings.workoutReminderTime = workoutReminderTime.value;
    saveState();
    evaluateReminderTriggers();
  });

  restDayRemindersEnabled.addEventListener('change', () => {
    state.reminderSettings.restDayEnabled = restDayRemindersEnabled.checked;
    saveState();
    evaluateReminderTriggers();
  });

  restDayReminderTime.addEventListener('change', () => {
    if (!isValidTimeString(restDayReminderTime.value)) return;
    state.reminderSettings.restDayReminderTime = restDayReminderTime.value;
    saveState();
    evaluateReminderTriggers();
  });

  streakRiskTime.addEventListener('change', () => {
    if (!isValidTimeString(streakRiskTime.value)) return;
    state.reminderSettings.streakRiskTime = streakRiskTime.value;
    saveState();
    evaluateReminderTriggers();
  });
}

let workoutSubviewTransitionId = 0;
function setWorkoutView(view) {
  const current = document.querySelector('.workout-subpage.active');
  const next = document.getElementById(`workout-view-${view}`);
  if (!next || (current && current.id === `workout-view-${view}`)) return;

  const transitionId = ++workoutSubviewTransitionId;
  document.querySelectorAll('.workout-subtab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.workout-subtab[data-workout-view="${view}"]`)?.classList.add('active');

  if (!current) {
    next.classList.add('active');
    return;
  }

  current.classList.add('leaving');
  next.classList.add('active', 'entering');
  setTimeout(() => {
    if (transitionId !== workoutSubviewTransitionId) return;
    current.classList.remove('active', 'leaving');
    next.classList.remove('entering');
  }, 200);
}

function initWorkoutSubpages() {
  document.querySelectorAll('.workout-subtab').forEach(tab => {
    tab.addEventListener('click', () => {
      setWorkoutView(tab.dataset.workoutView);
      if (tab.dataset.workoutView === 'progress') {
        renderProgressExerciseOptions();
        renderProgressChart();
      }
    });
  });

  document.querySelector('.nav-tab[data-tab="workout"]')?.addEventListener('click', () => {
    const activeSubview = document.querySelector('.workout-subtab.active')?.dataset.workoutView || 'builder';
    if (activeSubview === 'progress') {
      renderProgressExerciseOptions();
      renderProgressChart();
    }
  });
}

function initIOSHeaderBehavior() {
  const app = document.getElementById('app');
  const scroller = document.querySelector('.main-content');
  if (!app || !scroller) return;
  const onScroll = () => {
    const y = scroller.scrollTop;
    app.classList.toggle('is-scrolled', y > 8);
    app.classList.toggle('is-toolbar-condensed', y > 56);
  };
  scroller.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Workout form
document.getElementById('workoutForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const type = document.getElementById('workoutType').value;
  const duration = parseInt(document.getElementById('duration').value);
  const intensity = document.getElementById('intensity').value;
  const notes = document.getElementById('notes').value;

  const intensityMultiplier = { light: 0.7, moderate: 1, intense: 1.5 };
  const baseXP = Math.floor(duration / 5) * 10;
  const xp = Math.floor(baseXP * intensityMultiplier[intensity]);

  const workout = {
    id: Date.now(),
    type,
    duration,
    intensity,
    notes,
    xp,
    date: new Date().toISOString()
  };

  state.workouts.unshift(workout);
  updateStreak();
  addXP(xp);
  checkQuests(workout);
  saveState();

  document.getElementById('workoutForm').reset();
  document.getElementById('duration').value = 30;
  document.getElementById('intensity').value = 'moderate';

  // Switch to dashboard to show the new activity
  document.querySelector('.nav-tab[data-tab="dashboard"]').click();
});

// Check quest completion
function checkQuests(workout) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  QUESTS.forEach(quest => {
    if (state.completedQuests.includes(quest.id)) return;

    let progress = 0;
    if (quest.type === 'any') {
      progress = state.workouts.filter(w => new Date(w.date) >= weekStart).length;
    } else if (quest.type === 'streak') {
      progress = state.streak;
    } else if (quest.type === workout.type) {
      const weekWorkouts = state.workouts.filter(w => {
        const d = new Date(w.date);
        return d >= weekStart && w.type === quest.type;
      });
      if (quest.type === 'run' || quest.type === 'walk') {
        progress = weekWorkouts.reduce((sum, w) => sum + w.duration, 0);
      } else {
        progress = weekWorkouts.length;
      }
    }

    if (progress >= quest.target) {
      state.completedQuests.push(quest.id);
      addXP(quest.xp);
    }
  });
}

// UI Updates
function updateUI() {
  document.getElementById('playerLevel').textContent = state.level;
  document.getElementById('streakCount').textContent = state.streak;

  const xpPercent = (state.xp / state.xpToNextLevel) * 100;
  document.getElementById('xpFill').style.width = `${xpPercent}%`;
  document.getElementById('xpText').textContent = `${state.xp} / ${state.xpToNextLevel}`;

  renderTodayQuests();
  renderRecentActivity();
  renderQuests();
  renderAchievements();
  renderHard75();
  renderTodayPlannedWorkout();
  renderRoutinePlanner();
  updateSaveTemplateButton();
  updateRepeatLastWorkoutButtons();
}

function getDateKey(date = new Date()) {
  return new Date(date).toDateString();
}

function getRoutineDayIdByDate(date = new Date()) {
  const dayIndex = new Date(date).getDay();
  const day = ROUTINE_WEEK_DAYS.find(d => d.index === dayIndex);
  return day ? day.id : 'mon';
}

function getCurrentWeekDateByDayIndex(targetDayIndex) {
  const today = new Date();
  const monday = new Date(today);
  const diffToMonday = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - diffToMonday);
  const out = new Date(monday);
  const dayOffset = targetDayIndex === 0 ? 6 : targetDayIndex - 1;
  out.setDate(monday.getDate() + dayOffset);
  return out;
}

function getTemplateById(templateId) {
  return (state.workoutTemplates || []).find(t => String(t.id) === String(templateId)) || null;
}

function getPlannedTemplateForDate(date = new Date()) {
  const dayId = getRoutineDayIdByDate(date);
  const templateId = state.routineSchedule?.[dayId];
  if (!templateId) return null;
  return getTemplateById(templateId);
}

function isRoutineCompletedForDate(date = new Date(), expectedTemplateId = null) {
  const key = getDateKey(date);
  const completion = state.routineCompletions?.[key];
  if (!completion) return false;
  if (expectedTemplateId == null) return true;
  return String(completion.templateId) === String(expectedTemplateId);
}

function renderTodayPlannedWorkout() {
  const container = document.getElementById('todaysPlannedWorkout');
  if (!container) return;
  const todayTemplate = getPlannedTemplateForDate(new Date());
  if (!todayTemplate) {
    container.innerHTML = `<p class="today-plan-empty">No workout planned for today.</p>`;
    return;
  }
  const completed = isRoutineCompletedForDate(new Date(), todayTemplate.id);
  container.innerHTML = `
    <div class="today-plan-item">
      <div>
        <div class="today-plan-title">${todayTemplate.name}</div>
        <div class="today-plan-meta">${(todayTemplate.exercises || []).length} exercises</div>
      </div>
      <span class="plan-status ${completed ? 'complete' : 'pending'}">${completed ? 'Complete' : 'Planned'}</span>
    </div>
  `;
}

function renderRoutinePlanner() {
  const container = document.getElementById('routinePlannerList');
  if (!container) return;

  const templates = state.workoutTemplates || [];
  container.innerHTML = ROUTINE_WEEK_DAYS.map(day => {
    const assignedTemplateId = state.routineSchedule?.[day.id] || '';
    const assignedTemplate = assignedTemplateId ? getTemplateById(assignedTemplateId) : null;
    const weekDate = getCurrentWeekDateByDayIndex(day.index);
    const complete = assignedTemplate ? isRoutineCompletedForDate(weekDate, assignedTemplateId) : false;
    const statusText = assignedTemplate ? (complete ? 'Complete' : 'Pending') : 'Unassigned';
    const statusClass = assignedTemplate ? (complete ? 'complete' : 'pending') : '';
    return `
      <div class="routine-row">
        <span class="routine-day">${day.label}</span>
        <select data-routine-day="${day.id}">
          <option value="">No template</option>
          ${templates.map(t => `<option value="${t.id}" ${String(assignedTemplateId) === String(t.id) ? 'selected' : ''}>${t.name}</option>`).join('')}
        </select>
        <span class="plan-status ${statusClass}">${statusText}</span>
      </div>
    `;
  }).join('');

  container.querySelectorAll('select[data-routine-day]').forEach(select => {
    select.addEventListener('change', (e) => {
      const dayId = e.target.dataset.routineDay;
      const templateId = e.target.value || null;
      if (!state.routineSchedule || typeof state.routineSchedule !== 'object') state.routineSchedule = {};
      if (!templateId) delete state.routineSchedule[dayId];
      else state.routineSchedule[dayId] = templateId;
      saveState();
      renderRoutinePlanner();
      renderTodayPlannedWorkout();
    });
  });
}

function doesWorkoutMatchTemplate(workoutExercises, templateExercises) {
  const workoutIds = (workoutExercises || []).map(ex => String(ex.id || ''));
  const templateIds = (templateExercises || []).map(ex => String(ex.id || ''));
  if (!workoutIds.length || workoutIds.length !== templateIds.length) return false;
  return workoutIds.every((id, idx) => id === templateIds[idx]);
}

function markRoutineCompletionIfMatched(gymWorkout, activeTemplateId) {
  const today = new Date();
  const dayId = getRoutineDayIdByDate(today);
  const plannedTemplateId = state.routineSchedule?.[dayId];
  if (!plannedTemplateId) return false;

  const plannedTemplate = getTemplateById(plannedTemplateId);
  if (!plannedTemplate) return false;

  const matchedByActiveTemplate = activeTemplateId && String(activeTemplateId) === String(plannedTemplateId);
  const matchedByStructure = doesWorkoutMatchTemplate(gymWorkout.exercises || [], plannedTemplate.exercises || []);
  if (!matchedByActiveTemplate && !matchedByStructure) return false;

  state.routineCompletions = state.routineCompletions || {};
  state.routineCompletions[getDateKey(today)] = {
    templateId: plannedTemplateId,
    workoutId: gymWorkout.id,
    completedAt: new Date().toISOString()
  };
  return true;
}

function renderTodayQuests() {
  const container = document.getElementById('todayQuestsList');
  const todayQuests = QUESTS.filter(q => !state.completedQuests.includes(q.id)).slice(0, 3);

  if (todayQuests.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎉</div>
        <p>All quests completed! New ones tomorrow.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = todayQuests.map(quest => `
    <div class="quest-item">
      <span class="quest-icon">${quest.icon}</span>
      <div class="quest-content">
        <div class="quest-title">${quest.title}</div>
        <div class="quest-desc">${quest.desc}</div>
        <div class="quest-xp">+${quest.xp} XP</div>
      </div>
    </div>
  `).join('');
}

function renderRecentActivity() {
  const container = document.getElementById('recentActivityList');
  const recent = state.workouts.slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p>No workouts yet. Log your first one!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = recent.map(w => {
    const date = new Date(w.date);
    const timeAgo = getTimeAgo(date);
    const gymDetail = w.type === 'gym' && w.notes ? ` · ${w.notes}` : '';
    return `
      <div class="activity-item">
        <span class="activity-icon">${getWorkoutIcon(w.type)}</span>
        <div class="activity-details">
          <div class="activity-type">${w.type.charAt(0).toUpperCase() + w.type.slice(1)}</div>
          <div class="activity-meta">${w.duration} min · ${timeAgo}${gymDetail}</div>
        </div>
        <span class="activity-xp">+${w.xp} XP</span>
      </div>
    `;
  }).join('');
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function renderQuests() {
  const container = document.getElementById('questsList');

  container.innerHTML = QUESTS.map(quest => {
    const completed = state.completedQuests.includes(quest.id);
    let progress = 0;
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    if (quest.type === 'any') {
      progress = Math.min(quest.target, state.workouts.filter(w => new Date(w.date) >= weekStart).length);
    } else if (quest.type === 'streak') {
      progress = Math.min(quest.target, state.streak);
    } else {
      const weekWorkouts = state.workouts.filter(w => {
        const d = new Date(w.date);
        return d >= weekStart && w.type === quest.type;
      });
      if (quest.type === 'run' || quest.type === 'walk') {
        progress = Math.min(quest.target, weekWorkouts.reduce((sum, w) => sum + w.duration, 0));
      } else {
        progress = Math.min(quest.target, weekWorkouts.length);
      }
    }

    const percent = Math.min(100, (progress / quest.target) * 100);

    return `
      <div class="quest-item ${completed ? 'completed' : ''}">
        <span class="quest-icon">${quest.icon}</span>
        <div class="quest-content">
          <div class="quest-title">${quest.title} ${completed ? '✓' : ''}</div>
          <div class="quest-desc">${quest.desc}</div>
          <div class="quest-xp">+${quest.xp} XP</div>
          ${!completed ? `
            <div class="quest-progress">
              <div class="quest-progress-fill" style="width: ${percent}%"></div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderAchievements() {
  const container = document.getElementById('achievementsList');

  container.innerHTML = ACHIEVEMENTS.map(ach => {
    const unlocked = ach.check();
    return `
      <div class="achievement ${unlocked ? '' : 'locked'}">
        <div class="achievement-icon">${ach.icon}</div>
        <div class="achievement-title">${ach.title}</div>
        <div class="achievement-desc">${ach.desc}</div>
      </div>
    `;
  }).join('');
}

// ========== GYM TRACKER ==========

function getDefaultRestSeconds() {
  return parseInt(document.getElementById('defaultRest')?.value || 90);
}

function getExerciseRestSeconds(exercise) {
  const value = Number(exercise?.restPresetSeconds);
  if (Number.isFinite(value) && value > 0) return Math.floor(value);
  return getDefaultRestSeconds();
}

function getMostRecentGymWorkout() {
  const workouts = state.gymWorkouts || [];
  if (!workouts.length) return null;
  const toTimestamp = (value) => {
    const parsed = Date.parse(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return workouts.reduce((latest, current) => {
    if (!latest) return current;
    const latestTime = toTimestamp(latest.date);
    const currentTime = toTimestamp(current.date);
    return currentTime > latestTime ? current : latest;
  }, null);
}

function cloneWorkoutExercises(exercises) {
  return (exercises || []).map(ex => ({
    id: ex.id,
    name: ex.name,
    muscle: ex.muscle,
    restPresetSeconds: Number.isFinite(Number(ex.restPresetSeconds))
      ? Math.floor(Number(ex.restPresetSeconds))
      : null,
    sets: (ex.sets || [{ reps: '', weight: '' }]).map(set => ({
      reps: set.reps ?? '',
      weight: set.weight ?? ''
    }))
  }));
}

function getExerciseRecentSessions(exerciseId, limit = 3) {
  return (state.gymWorkouts || [])
    .filter(w => Array.isArray(w.exercises) && w.exercises.some(ex => String(ex.id) === String(exerciseId)))
    .sort((a, b) => Date.parse(b.date || 0) - Date.parse(a.date || 0))
    .slice(0, limit)
    .map(workout => workout.exercises.find(ex => String(ex.id) === String(exerciseId)))
    .filter(Boolean)
    .map(ex => ({
      id: ex.id,
      name: ex.name,
      sets: (ex.sets || []).map(set => ({
        reps: Number.parseFloat(set.reps) || 0,
        weight: Number.parseFloat(set.weight) || 0
      }))
    }));
}

function getSetValueFromSession(session, setIndex) {
  const direct = session.sets?.[setIndex];
  const hasDirect = direct && (direct.reps > 0 || direct.weight > 0);
  if (hasDirect) return direct;

  const fallbackSets = (session.sets || []).filter(s => (s.reps > 0 || s.weight > 0));
  if (!fallbackSets.length) return null;
  return fallbackSets[fallbackSets.length - 1];
}

function getWeightStep(weight) {
  if (weight >= 100) return 2.5;
  if (weight >= 50) return 1.25;
  if (weight >= 20) return 1;
  return 0.5;
}

function roundToWeightStep(weight, step) {
  const rounded = Math.round(weight / step) * step;
  return Number(rounded.toFixed(2));
}

function getSetSuggestionForExercise(exercise, setIndex) {
  const sessions = getExerciseRecentSessions(exercise.id, 3);
  if (sessions.length < 2) return null;

  const values = sessions
    .map(session => getSetValueFromSession(session, setIndex))
    .filter(Boolean);
  if (values.length < 2) return null;

  const latest = values[0];
  const previous = values.slice(1);
  const avgPrevReps = previous.reduce((sum, v) => sum + (v.reps || 0), 0) / previous.length;
  const avgPrevWeight = previous.reduce((sum, v) => sum + (v.weight || 0), 0) / previous.length;

  const latestReps = Number.isFinite(latest.reps) ? latest.reps : 0;
  const latestWeight = Number.isFinite(latest.weight) ? latest.weight : 0;
  const performative = latestReps >= 8 && latestReps >= avgPrevReps && latestWeight >= avgPrevWeight;

  let suggestedWeight = latestWeight;
  let suggestedReps = latestReps || Math.max(6, Math.round(avgPrevReps || 8));
  let reason = 'repeat';

  if (performative && latestWeight > 0) {
    const step = getWeightStep(latestWeight);
    suggestedWeight = roundToWeightStep(latestWeight + step, step);
    suggestedReps = Math.max(6, Math.round(latestReps - 1));
    reason = 'weight-up';
  } else {
    suggestedWeight = latestWeight > 0 ? latestWeight : Number(avgPrevWeight.toFixed(2));
    suggestedReps = Math.min(15, Math.max(1, Math.round((latestReps || avgPrevReps || 0) + 1)));
    reason = 'reps-up';
  }

  // Guardrail to avoid extreme jumps from noisy data.
  const maxAllowedWeight = latestWeight > 0 ? latestWeight + Math.max(2.5, getWeightStep(latestWeight) * 2) : suggestedWeight;
  suggestedWeight = Math.min(suggestedWeight, maxAllowedWeight);

  if (!Number.isFinite(suggestedReps) || suggestedReps <= 0) return null;
  if (!Number.isFinite(suggestedWeight) || suggestedWeight < 0) suggestedWeight = 0;

  return {
    reps: Math.round(suggestedReps),
    weight: Number(suggestedWeight.toFixed(2)),
    reason
  };
}

function applySetSuggestion(exerciseIndex, setIndex) {
  const exercise = gymState.exercises[exerciseIndex];
  if (!exercise) return;
  const suggestion = getSetSuggestionForExercise(exercise, setIndex);
  if (!suggestion) return;
  updateSet(exerciseIndex, setIndex, 'reps', String(suggestion.reps));
  updateSet(exerciseIndex, setIndex, 'weight', String(suggestion.weight));
}

function updateRepeatLastWorkoutButtons() {
  const hasRepeatSource = !!getMostRecentGymWorkout();
  document.querySelectorAll('.repeat-last-workout-btn').forEach(btn => {
    btn.disabled = !hasRepeatSource;
  });
}

function repeatLastWorkout() {
  const lastWorkout = getMostRecentGymWorkout();
  if (!lastWorkout || !Array.isArray(lastWorkout.exercises) || lastWorkout.exercises.length === 0) {
    alert('No previous gym workout found yet.');
    return;
  }

  gymState.exercises = cloneWorkoutExercises(lastWorkout.exercises);
  gymState.startTime = new Date();
  gymState.activeTemplateId = lastWorkout.templateId || null;
  renderGymExercises();
  updateSaveTemplateButton();
  document.getElementById('finishGymWorkout').disabled = false;
  switchMainTab('workout');
  setWorkoutView('builder');
  showToast(`Loaded last workout (${lastWorkout.exercises.length} exercises)`);
}

function addExerciseToWorkout(exercise) {
  if (!gymState.startTime) gymState.startTime = new Date();
  gymState.activeTemplateId = null;
  gymState.exercises.push({
    id: exercise.id,
    name: exercise.name,
    muscle: exercise.muscle,
    restPresetSeconds: null,
    sets: [{ reps: '', weight: '' }]
  });
  renderGymExercises();
  updateSaveTemplateButton();
  document.getElementById('finishGymWorkout').disabled = gymState.exercises.length === 0;
  document.getElementById('addExerciseModal').classList.add('hidden');
}

function removeExerciseFromWorkout(index) {
  gymState.activeTemplateId = null;
  gymState.exercises.splice(index, 1);
  renderGymExercises();
  updateSaveTemplateButton();
  document.getElementById('finishGymWorkout').disabled = gymState.exercises.length === 0;
}

function addSet(exerciseIndex) {
  gymState.exercises[exerciseIndex].sets.push({ reps: '', weight: '' });
  renderGymExercises();
}

function removeSet(exerciseIndex, setIndex) {
  const sets = gymState.exercises[exerciseIndex].sets;
  if (sets.length > 1) {
    sets.splice(setIndex, 1);
    renderGymExercises();
  }
}

function updateSet(exerciseIndex, setIndex, field, value) {
  gymState.exercises[exerciseIndex].sets[setIndex][field] = value;
}

function nudgeSetValue(exerciseIndex, setIndex, field, delta) {
  const set = gymState.exercises[exerciseIndex]?.sets?.[setIndex];
  if (!set) return;

  const current = Number.parseFloat(set[field]);
  const parsedDelta = Number(delta);
  const min = field === 'reps' ? 1 : 0;
  const step = field === 'reps' ? 1 : 0.5;
  const normalizedCurrent = Number.isFinite(current) ? current : 0;
  let next = normalizedCurrent + parsedDelta;

  if (field === 'reps') {
    next = Math.round(next);
  } else {
    next = Math.round(next / step) * step;
  }
  next = Math.max(min, next);

  const formatted = field === 'reps'
    ? String(Math.floor(next))
    : String(Number(next.toFixed(2)));
  updateSet(exerciseIndex, setIndex, field, formatted);
}

function updateExerciseRestPreset(exerciseIndex, value) {
  const parsed = Number(value);
  if (value === '' || value === 'default') {
    gymState.exercises[exerciseIndex].restPresetSeconds = null;
    return;
  }
  if (Number.isFinite(parsed) && parsed > 0) {
    gymState.exercises[exerciseIndex].restPresetSeconds = Math.floor(parsed);
  } else {
    gymState.exercises[exerciseIndex].restPresetSeconds = null;
  }
}

function startRestTimer(secondsOverride, callback) {
  if (gymState.restTimerInterval) {
    clearInterval(gymState.restTimerInterval);
  }
  const candidate = Number(secondsOverride);
  gymState.restSecondsRemaining = Number.isFinite(candidate) && candidate > 0
    ? Math.floor(candidate)
    : getDefaultRestSeconds();
  const overlay = document.getElementById('restTimerOverlay');
  overlay.classList.remove('hidden');

  function tick() {
    const mins = Math.floor(gymState.restSecondsRemaining / 60);
    const secs = gymState.restSecondsRemaining % 60;
    document.getElementById('restTimerDisplay').textContent =
      `${mins}:${secs.toString().padStart(2, '0')}`;

    if (gymState.restSecondsRemaining <= 0) {
      clearInterval(gymState.restTimerInterval);
      gymState.restTimerInterval = null;
      overlay.classList.add('hidden');
      if (callback) callback();
      return;
    }
    gymState.restSecondsRemaining--;
  }

  tick();
  gymState.restTimerInterval = setInterval(tick, 1000);
}

function skipRestTimer() {
  if (gymState.restTimerInterval) {
    clearInterval(gymState.restTimerInterval);
    gymState.restTimerInterval = null;
  }
  document.getElementById('restTimerOverlay').classList.add('hidden');
}

function renderGymExercises() {
  const container = document.getElementById('gymExercisesList');
  if (gymState.exercises.length === 0) {
    container.innerHTML = `
      <div class="gym-empty">
        <div class="gym-empty-icon">🏋️</div>
        <p>No exercises added yet.</p>
        <p class="gym-empty-hint">Click "Add Exercise" to build your workout.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = gymState.exercises.map((ex, exIdx) => `
    <div class="gym-exercise-card" data-exercise-index="${exIdx}">
      <div class="gym-exercise-header">
        <h4>${ex.name}</h4>
        <span class="gym-exercise-muscle">${ex.muscle}</span>
        <div class="exercise-rest-control">
          <label>Rest</label>
          <select class="exercise-rest-preset" data-ex="${exIdx}">
            <option value="default" ${!ex.restPresetSeconds ? 'selected' : ''}>Default</option>
            <option value="60" ${ex.restPresetSeconds === 60 ? 'selected' : ''}>60s</option>
            <option value="90" ${ex.restPresetSeconds === 90 ? 'selected' : ''}>90s</option>
            <option value="120" ${ex.restPresetSeconds === 120 ? 'selected' : ''}>120s</option>
            <option value="180" ${ex.restPresetSeconds === 180 ? 'selected' : ''}>180s</option>
            <option value="custom" ${(ex.restPresetSeconds && ![60, 90, 120, 180].includes(ex.restPresetSeconds)) ? 'selected' : ''}>Custom</option>
          </select>
          <input
            type="number"
            class="exercise-rest-custom ${(!ex.restPresetSeconds || [60, 90, 120, 180].includes(ex.restPresetSeconds)) ? 'hidden' : ''}"
            data-ex="${exIdx}"
            min="5"
            step="5"
            placeholder="sec"
            value="${(ex.restPresetSeconds && ![60, 90, 120, 180].includes(ex.restPresetSeconds)) ? ex.restPresetSeconds : ''}"
          >
        </div>
        <button type="button" class="btn-icon btn-remove-exercise" data-index="${exIdx}" title="Remove exercise">&times;</button>
      </div>
      <div class="gym-sets-table">
        <div class="gym-sets-header">
          <span>Set</span>
          <span>Reps</span>
          <span>Weight (kg)</span>
          <span></span>
        </div>
        ${ex.sets.map((set, setIdx) => `
          ${(() => {
            const suggestion = getSetSuggestionForExercise(ex, setIdx);
            const suggestionText = suggestion
              ? `${suggestion.weight}kg × ${suggestion.reps}`
              : '';
            return `
          <div class="gym-set-row">
            <span class="set-number">${setIdx + 1}</span>
            <div class="set-input-control">
              <button type="button" class="set-stepper" data-ex="${exIdx}" data-set="${setIdx}" data-field="reps" data-delta="-1" title="Decrease reps">−</button>
              <input type="number" class="set-input reps-input" placeholder="—" min="1" max="999"
                value="${set.reps || ''}" data-ex="${exIdx}" data-set="${setIdx}" data-field="reps">
              <button type="button" class="set-stepper" data-ex="${exIdx}" data-set="${setIdx}" data-field="reps" data-delta="1" title="Increase reps">+</button>
            </div>
            <div class="set-input-control">
              <button type="button" class="set-stepper" data-ex="${exIdx}" data-set="${setIdx}" data-field="weight" data-delta="-0.5" title="Decrease weight">−</button>
              <input type="number" class="set-input weight-input" placeholder="—" min="0" step="0.5"
                value="${set.weight || ''}" data-ex="${exIdx}" data-set="${setIdx}" data-field="weight">
              <button type="button" class="set-stepper" data-ex="${exIdx}" data-set="${setIdx}" data-field="weight" data-delta="0.5" title="Increase weight">+</button>
            </div>
            <div class="set-actions">
              ${suggestion ? `<span class="set-suggestion-badge" title="Suggested next target">${suggestionText}</span>` : ''}
              ${suggestion ? `<button type="button" class="btn-apply-suggestion" data-ex="${exIdx}" data-set="${setIdx}" title="Apply suggestion">Apply</button>` : ''}
              <button type="button" class="btn-rest" data-ex="${exIdx}" data-set="${setIdx}" title="Start rest timer">⏱</button>
              <button type="button" class="btn-remove-set ${ex.sets.length <= 1 ? 'hidden' : ''}" data-ex="${exIdx}" data-set="${setIdx}" title="Remove set">&times;</button>
            </div>
          </div>
        `;
          })()}
        `).join('')}
        <button type="button" class="btn-add-set" data-ex="${exIdx}">+ Add Set</button>
      </div>
    </div>
  `).join('');

  // Attach event listeners
  container.querySelectorAll('.reps-input, .weight-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const ex = parseInt(e.target.dataset.ex);
      const set = parseInt(e.target.dataset.set);
      const field = e.target.dataset.field;
      updateSet(ex, set, field, e.target.value);
    });
  });

  container.querySelectorAll('.set-stepper').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ex = parseInt(e.currentTarget.dataset.ex);
      const set = parseInt(e.currentTarget.dataset.set);
      const field = e.currentTarget.dataset.field;
      const delta = parseFloat(e.currentTarget.dataset.delta);
      nudgeSetValue(ex, set, field, delta);
      const input = container.querySelector(`.set-input[data-ex="${ex}"][data-set="${set}"][data-field="${field}"]`);
      if (input) input.value = gymState.exercises[ex].sets[set][field];
    });
  });

  container.querySelectorAll('.btn-apply-suggestion').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ex = parseInt(e.currentTarget.dataset.ex);
      const set = parseInt(e.currentTarget.dataset.set);
      applySetSuggestion(ex, set);
      const repsInput = container.querySelector(`.set-input[data-ex="${ex}"][data-set="${set}"][data-field="reps"]`);
      const weightInput = container.querySelector(`.set-input[data-ex="${ex}"][data-set="${set}"][data-field="weight"]`);
      if (repsInput) repsInput.value = gymState.exercises[ex].sets[set].reps;
      if (weightInput) weightInput.value = gymState.exercises[ex].sets[set].weight;
    });
  });

  container.querySelectorAll('.btn-rest').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const exIdx = parseInt(e.target.dataset.ex);
      const setIdx = parseInt(e.target.dataset.set);
      const reps = gymState.exercises[exIdx].sets[setIdx].reps;
      const weight = gymState.exercises[exIdx].sets[setIdx].weight;
      if (reps || weight) {
        const restSeconds = getExerciseRestSeconds(gymState.exercises[exIdx]);
        startRestTimer(restSeconds);
      }
    });
  });

  container.querySelectorAll('.exercise-rest-preset').forEach(select => {
    select.addEventListener('change', (e) => {
      const exIdx = parseInt(e.target.dataset.ex);
      if (e.target.value === 'default') {
        updateExerciseRestPreset(exIdx, 'default');
      } else if (e.target.value === 'custom') {
        const customInput = container.querySelector(`.exercise-rest-custom[data-ex="${exIdx}"]`);
        customInput?.classList.remove('hidden');
        if (!customInput?.value) customInput.value = '75';
        updateExerciseRestPreset(exIdx, customInput?.value || 75);
      } else {
        updateExerciseRestPreset(exIdx, e.target.value);
      }
      renderGymExercises();
    });
  });

  container.querySelectorAll('.exercise-rest-custom').forEach(input => {
    input.addEventListener('input', (e) => {
      const exIdx = parseInt(e.target.dataset.ex);
      updateExerciseRestPreset(exIdx, e.target.value);
    });
  });

  container.querySelectorAll('.btn-add-set').forEach(btn => {
    btn.addEventListener('click', (e) => {
      addSet(parseInt(e.target.dataset.ex));
    });
  });

  container.querySelectorAll('.btn-remove-set').forEach(btn => {
    btn.addEventListener('click', (e) => {
      removeSet(parseInt(e.target.dataset.ex), parseInt(e.target.dataset.set));
    });
  });

  container.querySelectorAll('.btn-remove-exercise').forEach(btn => {
    btn.addEventListener('click', (e) => {
      removeExerciseFromWorkout(parseInt(e.target.dataset.index));
    });
  });
}

function openExercisePicker() {
  document.getElementById('addExerciseModal').classList.remove('hidden');
  renderExercisePicker();
  document.getElementById('exerciseSearch').value = '';
  document.getElementById('muscleGroupFilter').value = '';
}

function renderExercisePicker() {
  const search = (document.getElementById('exerciseSearch')?.value || '').toLowerCase();
  const muscle = document.getElementById('muscleGroupFilter')?.value || '';
  const addedIds = gymState.exercises.map(e => e.id);

  let filtered = GYM_EXERCISES.filter(ex => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search);
    const matchMuscle = !muscle || ex.muscle === muscle;
    const notAdded = !addedIds.includes(ex.id);
    return matchSearch && matchMuscle && notAdded;
  });

  const container = document.getElementById('exercisePickerList');
  if (filtered.length === 0) {
    container.innerHTML = '<div class="picker-empty">No exercises match. Try a different search.</div>';
    return;
  }

  container.innerHTML = filtered.map(ex => `
    <button type="button" class="exercise-picker-item" data-id="${ex.id}">
      <span class="picker-name">${ex.name}</span>
      <span class="picker-meta">${ex.muscle} · ${ex.equipment}</span>
    </button>
  `).join('');

  container.querySelectorAll('.exercise-picker-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const exercise = GYM_EXERCISES.find(e => e.id === btn.dataset.id);
      if (exercise) addExerciseToWorkout(exercise);
    });
  });
}

function finishGymWorkout() {
  if (gymState.exercises.length === 0) return;

  const endTime = new Date();
  const startTime = gymState.startTime || endTime;
  const durationMs = endTime - startTime;
  const durationMin = Math.round(durationMs / 60000) || 1;

  const totalSets = gymState.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = gymState.exercises.reduce((sum, ex) => {
    return sum + ex.sets.filter(s => s.reps || s.weight).length;
  }, 0);

  const baseXP = 20 + (completedSets * 5) + (durationMin * 2);
  const xp = Math.min(200, Math.floor(baseXP));

  const gymWorkout = {
    id: Date.now(),
    type: 'gym',
    templateId: gymState.activeTemplateId ?? null,
    duration: durationMin,
    exercises: gymState.exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      muscle: ex.muscle,
      restPresetSeconds: ex.restPresetSeconds ?? null,
      sets: ex.sets.map(s => ({ reps: s.reps, weight: s.weight }))
    })),
    xp,
    date: new Date().toISOString()
  };

  const routineCompleted = markRoutineCompletionIfMatched(gymWorkout, gymState.activeTemplateId);

  state.gymWorkouts.unshift(gymWorkout);
  state.workouts.unshift({
    id: gymWorkout.id,
    type: 'gym',
    duration: durationMin,
    intensity: 'moderate',
    notes: `${gymState.exercises.length} exercises, ${completedSets} sets`,
    xp,
    date: gymWorkout.date
  });

  gymState.exercises = [];
  gymState.startTime = null;
  gymState.activeTemplateId = null;
  renderGymExercises();
  document.getElementById('finishGymWorkout').disabled = true;

  updateStreak();
  addXP(xp);
  checkQuests({ type: 'gym', duration: durationMin });
  saveState();
  if (routineCompleted) showToast('Today\'s planned workout marked complete');

  document.querySelector('.nav-tab[data-tab="dashboard"]').click();
}

function initGymTracker() {
  document.getElementById('addExerciseBtn').addEventListener('click', openExercisePicker);
  document.getElementById('closeExerciseModal').addEventListener('click', () => {
    document.getElementById('addExerciseModal').classList.add('hidden');
  });
  document.getElementById('restTimerSkip').addEventListener('click', skipRestTimer);
  document.getElementById('finishGymWorkout').addEventListener('click', finishGymWorkout);

  document.getElementById('loadTemplateBtn').addEventListener('click', openLoadTemplateModal);
  document.getElementById('saveTemplateBtn').addEventListener('click', openSaveTemplateModal);
  document.getElementById('closeLoadTemplateModal').addEventListener('click', () => {
    document.getElementById('loadTemplateModal').classList.add('hidden');
  });
  document.getElementById('closeSaveTemplateModal').addEventListener('click', () => {
    document.getElementById('saveTemplateModal').classList.add('hidden');
  });
  document.getElementById('confirmSaveTemplate').addEventListener('click', saveWorkoutTemplate);
  document.querySelectorAll('.repeat-last-workout-btn').forEach(btn => {
    btn.addEventListener('click', repeatLastWorkout);
  });

  document.getElementById('exerciseSearch')?.addEventListener('input', renderExercisePicker);
  document.getElementById('muscleGroupFilter')?.addEventListener('change', renderExercisePicker);

  document.getElementById('addExerciseModal').addEventListener('click', (e) => {
    if (e.target.id === 'addExerciseModal') e.target.classList.add('hidden');
  });
  document.getElementById('loadTemplateModal').addEventListener('click', (e) => {
    if (e.target.id === 'loadTemplateModal') e.target.classList.add('hidden');
  });
  document.getElementById('saveTemplateModal').addEventListener('click', (e) => {
    if (e.target.id === 'saveTemplateModal') e.target.classList.add('hidden');
  });
}

// ========== WORKOUT TEMPLATES ==========
function updateSaveTemplateButton() {
  const btn = document.getElementById('saveTemplateBtn');
  if (btn) btn.disabled = gymState.exercises.length === 0;
}

function openLoadTemplateModal() {
  document.getElementById('loadTemplateModal').classList.remove('hidden');
  renderTemplateList();
}

function renderTemplateList() {
  const container = document.getElementById('templateList');
  const templates = state.workoutTemplates || [];
  if (templates.length === 0) {
    container.innerHTML = '<div class="picker-empty">No saved templates. Save your current workout as a template.</div>';
    return;
  }
  container.innerHTML = templates.map((t, i) => `
    <div class="template-item" data-index="${i}">
      <div class="template-item-info">
        <div class="template-item-name">${t.name}</div>
        <div class="template-item-meta">${t.exercises.length} exercises</div>
      </div>
      <button type="button" class="template-item-delete" data-index="${i}" title="Delete">&times;</button>
    </div>
  `).join('');
  container.querySelectorAll('.template-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (!e.target.classList.contains('template-item-delete')) {
        loadTemplate(parseInt(el.dataset.index));
        document.getElementById('loadTemplateModal').classList.add('hidden');
      }
    });
  });
  container.querySelectorAll('.template-item-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTemplate(parseInt(btn.dataset.index));
      renderTemplateList();
    });
  });
}

function loadTemplate(index) {
  const t = state.workoutTemplates[index];
  if (!t) return;
  gymState.exercises = t.exercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    muscle: ex.muscle,
    restPresetSeconds: Number.isFinite(Number(ex.restPresetSeconds)) ? Math.floor(Number(ex.restPresetSeconds)) : null,
    sets: (ex.sets || [{ reps: '', weight: '' }]).map(s => ({ reps: s.reps || '', weight: s.weight || '' }))
  }));
  gymState.startTime = new Date();
  gymState.activeTemplateId = t.id;
  renderGymExercises();
  document.getElementById('finishGymWorkout').disabled = false;
}

function deleteTemplate(index) {
  const deleted = state.workoutTemplates[index];
  state.workoutTemplates.splice(index, 1);
  if (deleted?.id != null) {
    const deletedId = String(deleted.id);
    Object.keys(state.routineSchedule || {}).forEach(dayId => {
      if (String(state.routineSchedule[dayId]) === deletedId) {
        delete state.routineSchedule[dayId];
      }
    });
    Object.keys(state.routineCompletions || {}).forEach(dateKey => {
      if (String(state.routineCompletions[dateKey]?.templateId) === deletedId) {
        delete state.routineCompletions[dateKey];
      }
    });
  }
  saveState();
  renderRoutinePlanner();
  renderTodayPlannedWorkout();
}

function openSaveTemplateModal() {
  document.getElementById('templateName').value = '';
  document.getElementById('saveTemplateModal').classList.remove('hidden');
}

function saveWorkoutTemplate() {
  const name = document.getElementById('templateName').value?.trim();
  if (!name) return;
  if (gymState.exercises.length === 0) return;
  const template = {
    id: Date.now(),
    name,
    exercises: gymState.exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      muscle: ex.muscle,
      restPresetSeconds: ex.restPresetSeconds ?? null,
      sets: ex.sets.map(s => ({ reps: s.reps, weight: s.weight }))
    }))
  };
  state.workoutTemplates = state.workoutTemplates || [];
  state.workoutTemplates.push(template);
  saveState();
  renderRoutinePlanner();
  renderTodayPlannedWorkout();
  document.getElementById('saveTemplateModal').classList.add('hidden');
}

// ========== PROGRESS CHARTS ==========
let progressChartInstance = null;

function getExerciseHistory(exerciseId) {
  const data = [];
  (state.gymWorkouts || []).forEach(w => {
    const ex = w.exercises?.find(e => e.id === exerciseId);
    if (!ex) return;
    const date = w.date.split('T')[0];
    ex.sets?.forEach(set => {
      const reps = parseFloat(set.reps) || 0;
      const weight = parseFloat(set.weight) || 0;
      if (reps || weight) {
        data.push({ date, reps, weight, volume: reps * weight });
      }
    });
  });
  data.sort((a, b) => a.date.localeCompare(b.date));
  return data;
}

function getUniqueExercisesFromHistory() {
  const seen = new Set();
  const result = [];
  (state.gymWorkouts || []).forEach(w => {
    w.exercises?.forEach(ex => {
      if (ex.id && !seen.has(ex.id)) {
        seen.add(ex.id);
        result.push({ id: ex.id, name: ex.name });
      }
    });
  });
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

function aggregateByDate(history, metric) {
  const byDate = {};
  history.forEach(h => {
    if (!byDate[h.date]) byDate[h.date] = { weights: [], reps: [], volumes: [] };
    byDate[h.date].weights.push(h.weight);
    byDate[h.date].reps.push(h.reps);
    byDate[h.date].volumes.push(h.volume);
  });
  return Object.entries(byDate)
    .map(([date, v]) => {
      let value;
      if (metric === 'weight') value = v.weights.length ? Math.max(...v.weights) : 0;
      else if (metric === 'reps') value = v.reps.length ? (v.reps.reduce((a, b) => a + b, 0) / v.reps.length) : 0;
      else value = v.volumes.reduce((a, b) => a + b, 0);
      return { date, value };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function renderProgressChart() {
  const exerciseId = document.getElementById('progressExerciseSelect')?.value;
  const metric = document.getElementById('progressMetric')?.value || 'weight';
  if (!exerciseId) return;

  const history = getExerciseHistory(exerciseId);
  const aggregated = aggregateByDate(history, metric);

  const chartCanvas = document.getElementById('progressChart');
  const emptyEl = document.getElementById('progressEmpty');

  if (aggregated.length === 0) {
    chartCanvas.parentElement.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    if (progressChartInstance) {
      progressChartInstance.destroy();
      progressChartInstance = null;
    }
    return;
  }

  chartCanvas.parentElement.classList.remove('hidden');
  emptyEl.classList.add('hidden');

  const ctx = chartCanvas.getContext('2d');
  if (progressChartInstance) progressChartInstance.destroy();

  const labels = aggregated.map(a => {
    const d = new Date(a.date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const values = aggregated.map(a => Math.round(a.value * 10) / 10);

  progressChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: metric === 'weight' ? 'Weight (kg)' : metric === 'reps' ? 'Reps' : 'Volume',
        data: values,
        borderColor: '#00d9a5',
        backgroundColor: 'rgba(0, 217, 165, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(45, 53, 72, 0.5)' },
          ticks: { color: '#94a3b8' }
        },
        x: {
          grid: { color: 'rgba(45, 53, 72, 0.5)' },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  });
}

function renderProgressExerciseOptions() {
  const exerciseSelect = document.getElementById('progressExerciseSelect');
  if (!exerciseSelect) return;
  const current = exerciseSelect.value;
  const exercises = getUniqueExercisesFromHistory();
  exerciseSelect.innerHTML = '<option value="">Select exercise</option>' +
    exercises.map(ex => `<option value="${ex.id}">${ex.name}</option>`).join('');
  if (current && exercises.some(ex => ex.id === current)) {
    exerciseSelect.value = current;
  }
}

function initProgressTab() {
  const exerciseSelect = document.getElementById('progressExerciseSelect');
  const metricSelect = document.getElementById('progressMetric');
  if (!exerciseSelect) return;

  renderProgressExerciseOptions();
  exerciseSelect.addEventListener('change', renderProgressChart);
  metricSelect?.addEventListener('change', renderProgressChart);
}

// ========== 75 HARD ==========
const HARD75_TASKS = ['diet', 'workout1', 'workout2Outdoor', 'water', 'read', 'photo'];

function getTodayKey() {
  return new Date().toDateString();
}

function getHard75TodayLog() {
  const key = getTodayKey();
  state.hard75 = state.hard75 || { dayStreak: 0, lastCompletedDate: null, logs: {} };
  if (!state.hard75.logs[key]) {
    state.hard75.logs[key] = { diet: false, workout1: false, workout2Outdoor: false, water: false, read: false, photo: false };
  }
  return state.hard75.logs[key];
}

function renderHard75() {
  const h = state.hard75 || { dayStreak: 0, lastCompletedDate: null, logs: {} };
  const dayEl = document.getElementById('hard75DayCount');
  if (dayEl) dayEl.textContent = h.dayStreak || 0;

  const log = getHard75TodayLog();
  HARD75_TASKS.forEach(task => {
    const cb = document.querySelector(`[data-task="${task}"]`);
    if (cb) {
      cb.checked = log[task] || false;
      cb.onchange = () => {
        log[task] = cb.checked;
        state.hard75.logs[getTodayKey()] = log;
        saveState();
      };
    }
  });
}

function completeHard75Day() {
  const log = getHard75TodayLog();
  const allDone = HARD75_TASKS.every(t => log[t]);
  if (!allDone) {
    alert('Complete all 5 tasks before marking the day complete.');
    return;
  }

  const today = getTodayKey();
  if (state.hard75.lastCompletedDate === today) {
    return; // Already completed today
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  state.hard75 = state.hard75 || { dayStreak: 0, lastCompletedDate: null, logs: {} };
  if (state.hard75.lastCompletedDate === yesterdayStr) {
    state.hard75.dayStreak = (state.hard75.dayStreak || 0) + 1;
  } else {
    state.hard75.dayStreak = 1;
  }
  state.hard75.lastCompletedDate = today;
  saveState();
  renderHard75();
}

function initHard75() {
  document.getElementById('hard75CompleteDay')?.addEventListener('click', completeHard75Day);
}

function initReminderSystem() {
  startReminderScheduler();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) evaluateReminderTriggers();
  });
  window.addEventListener('online', () => evaluateReminderTriggers());
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Init
loadState();
state.xpToNextLevel = state.xpToNextLevel || xpForLevel(state.level);
state.gymWorkouts = state.gymWorkouts || [];
state.workoutTemplates = state.workoutTemplates || [];
state.routineSchedule = state.routineSchedule || {};
state.routineCompletions = state.routineCompletions || {};
state.reminderSettings = normalizeReminderSettings(state.reminderSettings || {});
state.reminderMeta = normalizeReminderMeta(state.reminderMeta || {});
state.hard75 = state.hard75 || { dayStreak: 0, lastCompletedDate: null, logs: {} };
updateUI();
initCloudSync();
initToolbarSettings();
initReminderSystem();
initGymTracker();
initWorkoutSubpages();
initProgressTab();
initHard75();
initIOSHeaderBehavior();
