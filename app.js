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
  completedQuests: [],
  hard75: {
    dayStreak: 0,
    lastCompletedDate: null,
    logs: {}
  }
};

// Gym tracker state
let gymState = {
  exercises: [],
  startTime: null,
  restTimerInterval: null,
  restSecondsRemaining: 0
};

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
  const saved = localStorage.getItem('fitquest-state');
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
  localStorage.setItem('fitquest-state', JSON.stringify({
    level: state.level,
    xp: state.xp,
    xpToNextLevel: state.xpToNextLevel,
    streak: state.streak,
    lastWorkoutDate: state.lastWorkoutDate,
    workouts: state.workouts,
    gymWorkouts: state.gymWorkouts,
    workoutTemplates: state.workoutTemplates,
    completedQuests: state.completedQuests,
    hard75: state.hard75
  }));
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
    const raw = localStorage.getItem('fitquest-toolbar-tabs');
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
  const modal = document.getElementById('toolbarSettingsModal');
  if (!openBtn || !closeBtn || !saveBtn || !modal) return;

  applyToolbarTabs(getSavedToolbarTabs());

  openBtn.addEventListener('click', () => {
    renderToolbarOptions(getSavedToolbarTabs());
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
    localStorage.setItem('fitquest-toolbar-tabs', JSON.stringify(selected));
    applyToolbarTabs(selected);
    modal.classList.add('hidden');
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
    app.classList.toggle('is-scrolled', scroller.scrollTop > 8);
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
  updateSaveTemplateButton();
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

function addExerciseToWorkout(exercise) {
  if (!gymState.startTime) gymState.startTime = new Date();
  gymState.exercises.push({
    id: exercise.id,
    name: exercise.name,
    muscle: exercise.muscle,
    sets: [{ reps: '', weight: '' }]
  });
  renderGymExercises();
  updateSaveTemplateButton();
  document.getElementById('finishGymWorkout').disabled = gymState.exercises.length === 0;
  document.getElementById('addExerciseModal').classList.add('hidden');
}

function removeExerciseFromWorkout(index) {
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

function startRestTimer(callback) {
  if (gymState.restTimerInterval) {
    clearInterval(gymState.restTimerInterval);
  }
  gymState.restSecondsRemaining = getDefaultRestSeconds();
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
          <div class="gym-set-row">
            <span class="set-number">${setIdx + 1}</span>
            <input type="number" class="set-input reps-input" placeholder="—" min="1" max="999"
              value="${set.reps || ''}" data-ex="${exIdx}" data-set="${setIdx}" data-field="reps">
            <input type="number" class="set-input weight-input" placeholder="—" min="0" step="0.5"
              value="${set.weight || ''}" data-ex="${exIdx}" data-set="${setIdx}" data-field="weight">
            <div class="set-actions">
              <button type="button" class="btn-rest" data-ex="${exIdx}" data-set="${setIdx}" title="Start rest timer">⏱</button>
              <button type="button" class="btn-remove-set ${ex.sets.length <= 1 ? 'hidden' : ''}" data-ex="${exIdx}" data-set="${setIdx}" title="Remove set">&times;</button>
            </div>
          </div>
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

  container.querySelectorAll('.btn-rest').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const exIdx = parseInt(e.target.dataset.ex);
      const setIdx = parseInt(e.target.dataset.set);
      const reps = gymState.exercises[exIdx].sets[setIdx].reps;
      const weight = gymState.exercises[exIdx].sets[setIdx].weight;
      if (reps || weight) {
        startRestTimer();
      }
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
    duration: durationMin,
    exercises: gymState.exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      muscle: ex.muscle,
      sets: ex.sets.map(s => ({ reps: s.reps, weight: s.weight }))
    })),
    xp,
    date: new Date().toISOString()
  };

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
  renderGymExercises();
  document.getElementById('finishGymWorkout').disabled = true;

  updateStreak();
  addXP(xp);
  checkQuests({ type: 'gym', duration: durationMin });
  saveState();

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
    sets: (ex.sets || [{ reps: '', weight: '' }]).map(s => ({ reps: s.reps || '', weight: s.weight || '' }))
  }));
  gymState.startTime = new Date();
  renderGymExercises();
  document.getElementById('finishGymWorkout').disabled = false;
}

function deleteTemplate(index) {
  state.workoutTemplates.splice(index, 1);
  saveState();
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
      sets: ex.sets.map(s => ({ reps: s.reps, weight: s.weight }))
    }))
  };
  state.workoutTemplates = state.workoutTemplates || [];
  state.workoutTemplates.push(template);
  saveState();
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

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Init
loadState();
state.xpToNextLevel = state.xpToNextLevel || xpForLevel(state.level);
state.gymWorkouts = state.gymWorkouts || [];
state.workoutTemplates = state.workoutTemplates || [];
state.hard75 = state.hard75 || { dayStreak: 0, lastCompletedDate: null, logs: {} };
updateUI();
initToolbarSettings();
initGymTracker();
initWorkoutSubpages();
initProgressTab();
initHard75();
initIOSHeaderBehavior();
