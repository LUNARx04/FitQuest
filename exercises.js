// FitQuest — Commercial Gym Exercise Library
// Organized by muscle group for easy browsing

const GYM_EXERCISES = [
  // CHEST
  { id: 'bench-press', name: 'Barbell Bench Press', muscle: 'chest', equipment: 'barbell' },
  { id: 'incline-bench', name: 'Incline Barbell Bench Press', muscle: 'chest', equipment: 'barbell' },
  { id: 'decline-bench', name: 'Decline Barbell Bench Press', muscle: 'chest', equipment: 'barbell' },
  { id: 'db-bench', name: 'Dumbbell Bench Press', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'db-incline', name: 'Incline Dumbbell Press', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'db-decline', name: 'Decline Dumbbell Press', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'db-fly', name: 'Dumbbell Fly', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'db-pullover', name: 'Dumbbell Pullover', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'cable-fly', name: 'Cable Fly', muscle: 'chest', equipment: 'cable' },
  { id: 'cable-crossover', name: 'Cable Crossover', muscle: 'chest', equipment: 'cable' },
  { id: 'pec-deck', name: 'Pec Deck / Machine Fly', muscle: 'chest', equipment: 'machine' },
  { id: 'chest-press-machine', name: 'Chest Press Machine', muscle: 'chest', equipment: 'machine' },
  { id: 'push-up', name: 'Push-Up', muscle: 'chest', equipment: 'bodyweight' },
  { id: 'dips-chest', name: 'Chest Dips', muscle: 'chest', equipment: 'bodyweight' },

  // BACK
  { id: 'deadlift', name: 'Barbell Deadlift', muscle: 'back', equipment: 'barbell' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscle: 'back', equipment: 'barbell' },
  { id: 'barbell-row', name: 'Barbell Bent-Over Row', muscle: 'back', equipment: 'barbell' },
  { id: 'pendlay-row', name: 'Pendlay Row', muscle: 'back', equipment: 'barbell' },
  { id: 't-bar-row', name: 'T-Bar Row', muscle: 'back', equipment: 'barbell' },
  { id: 'db-row', name: 'Dumbbell Single-Arm Row', muscle: 'back', equipment: 'dumbbell' },
  { id: 'db-pullover-back', name: 'Dumbbell Pullover', muscle: 'back', equipment: 'dumbbell' },
  { id: 'pull-up', name: 'Pull-Up', muscle: 'back', equipment: 'bodyweight' },
  { id: 'chin-up', name: 'Chin-Up', muscle: 'back', equipment: 'bodyweight' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscle: 'back', equipment: 'machine' },
  { id: 'cable-row', name: 'Seated Cable Row', muscle: 'back', equipment: 'cable' },
  { id: 'seated-row', name: 'Seated Row Machine', muscle: 'back', equipment: 'machine' },
  { id: 'face-pull', name: 'Face Pull', muscle: 'back', equipment: 'cable' },
  { id: 'barbell-shrug', name: 'Barbell Shrug', muscle: 'back', equipment: 'barbell' },
  { id: 'db-shrug', name: 'Dumbbell Shrug', muscle: 'back', equipment: 'dumbbell' },
  { id: 'back-extension', name: 'Back Extension', muscle: 'back', equipment: 'machine' },

  // SHOULDERS
  { id: 'ohp', name: 'Barbell Overhead Press', muscle: 'shoulders', equipment: 'barbell' },
  { id: 'db-ohp', name: 'Dumbbell Shoulder Press', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'arnold-press', name: 'Arnold Press', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'lateral-raise', name: 'Lateral Raise', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'front-raise', name: 'Front Raise', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'reverse-fly', name: 'Reverse Fly', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'cable-lateral', name: 'Cable Lateral Raise', muscle: 'shoulders', equipment: 'cable' },
  { id: 'machine-shoulder-press', name: 'Machine Shoulder Press', muscle: 'shoulders', equipment: 'machine' },
  { id: 'upright-row', name: 'Upright Row', muscle: 'shoulders', equipment: 'barbell' },

  // BICEPS
  { id: 'barbell-curl', name: 'Barbell Curl', muscle: 'biceps', equipment: 'barbell' },
  { id: 'ez-bar-curl', name: 'EZ Bar Curl', muscle: 'biceps', equipment: 'barbell' },
  { id: 'db-curl', name: 'Dumbbell Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'hammer-curl', name: 'Hammer Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'preacher-curl', name: 'Preacher Curl', muscle: 'biceps', equipment: 'barbell' },
  { id: 'cable-curl', name: 'Cable Curl', muscle: 'biceps', equipment: 'cable' },
  { id: 'concentration-curl', name: 'Concentration Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'incline-curl', name: 'Incline Dumbbell Curl', muscle: 'biceps', equipment: 'dumbbell' },

  // TRICEPS
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', muscle: 'triceps', equipment: 'cable' },
  { id: 'skull-crusher', name: 'Skull Crusher', muscle: 'triceps', equipment: 'barbell' },
  { id: 'close-grip-bench', name: 'Close-Grip Bench Press', muscle: 'triceps', equipment: 'barbell' },
  { id: 'overhead-tricep', name: 'Overhead Tricep Extension', muscle: 'triceps', equipment: 'dumbbell' },
  { id: 'tricep-dips', name: 'Tricep Dips', muscle: 'triceps', equipment: 'bodyweight' },
  { id: 'db-kickback', name: 'Tricep Kickback', muscle: 'triceps', equipment: 'dumbbell' },
  { id: 'cable-overhead', name: 'Cable Overhead Extension', muscle: 'triceps', equipment: 'cable' },

  // LEGS - QUADS
  { id: 'squat', name: 'Barbell Back Squat', muscle: 'quads', equipment: 'barbell' },
  { id: 'front-squat', name: 'Front Squat', muscle: 'quads', equipment: 'barbell' },
  { id: 'leg-press', name: 'Leg Press', muscle: 'quads', equipment: 'machine' },
  { id: 'leg-extension', name: 'Leg Extension', muscle: 'quads', equipment: 'machine' },
  { id: 'hack-squat', name: 'Hack Squat', muscle: 'quads', equipment: 'machine' },
  { id: 'goblet-squat', name: 'Goblet Squat', muscle: 'quads', equipment: 'dumbbell' },
  { id: 'bulgarian-split', name: 'Bulgarian Split Squat', muscle: 'quads', equipment: 'dumbbell' },

  // LEGS - HAMSTRINGS
  { id: 'leg-curl', name: 'Leg Curl', muscle: 'hamstrings', equipment: 'machine' },
  { id: 'romanian-deadlift-leg', name: 'Romanian Deadlift', muscle: 'hamstrings', equipment: 'barbell' },
  { id: 'stiff-leg-deadlift', name: 'Stiff-Leg Deadlift', muscle: 'hamstrings', equipment: 'barbell' },
  { id: 'good-morning', name: 'Good Morning', muscle: 'hamstrings', equipment: 'barbell' },
  { id: 'db-rdl', name: 'Dumbbell RDL', muscle: 'hamstrings', equipment: 'dumbbell' },

  // LEGS - GLUTES
  { id: 'hip-thrust', name: 'Hip Thrust', muscle: 'glutes', equipment: 'barbell' },
  { id: 'glute-bridge', name: 'Glute Bridge', muscle: 'glutes', equipment: 'barbell' },
  { id: 'cable-kickback', name: 'Cable Kickback', muscle: 'glutes', equipment: 'cable' },
  { id: 'hip-abductor', name: 'Hip Abductor Machine', muscle: 'glutes', equipment: 'machine' },

  // LEGS - CALVES
  { id: 'standing-calf', name: 'Standing Calf Raise', muscle: 'calves', equipment: 'machine' },
  { id: 'seated-calf', name: 'Seated Calf Raise', muscle: 'calves', equipment: 'machine' },
  { id: 'leg-press-calf', name: 'Leg Press Calf Raise', muscle: 'calves', equipment: 'machine' },
  { id: 'barbell-calf', name: 'Barbell Calf Raise', muscle: 'calves', equipment: 'barbell' },

  // LUNGES (multi)
  { id: 'walking-lunge', name: 'Walking Lunge', muscle: 'quads', equipment: 'dumbbell' },
  { id: 'reverse-lunge', name: 'Reverse Lunge', muscle: 'quads', equipment: 'dumbbell' },
  { id: 'lateral-lunge', name: 'Lateral Lunge', muscle: 'quads', equipment: 'dumbbell' },

  // CORE
  { id: 'plank', name: 'Plank', muscle: 'core', equipment: 'bodyweight' },
  { id: 'crunch', name: 'Crunch', muscle: 'core', equipment: 'bodyweight' },
  { id: 'leg-raise', name: 'Hanging Leg Raise', muscle: 'core', equipment: 'bodyweight' },
  { id: 'cable-crunch', name: 'Cable Crunch', muscle: 'core', equipment: 'cable' },
  { id: 'ab-wheel', name: 'Ab Wheel Rollout', muscle: 'core', equipment: 'other' },
  { id: 'russian-twist', name: 'Russian Twist', muscle: 'core', equipment: 'dumbbell' },
  { id: 'dead-bug', name: 'Dead Bug', muscle: 'core', equipment: 'bodyweight' },
  { id: 'pallof-press', name: 'Pallof Press', muscle: 'core', equipment: 'cable' },
];

const MUSCLE_GROUPS = [
  { id: 'chest', name: 'Chest', icon: '🫁' },
  { id: 'back', name: 'Back', icon: '🔙' },
  { id: 'shoulders', name: 'Shoulders', icon: '💪' },
  { id: 'biceps', name: 'Biceps', icon: '💪' },
  { id: 'triceps', name: 'Triceps', icon: '💪' },
  { id: 'quads', name: 'Quads', icon: '🦵' },
  { id: 'hamstrings', name: 'Hamstrings', icon: '🦵' },
  { id: 'glutes', name: 'Glutes', icon: '🍑' },
  { id: 'calves', name: 'Calves', icon: '🦶' },
  { id: 'core', name: 'Core', icon: '🎯' },
];
