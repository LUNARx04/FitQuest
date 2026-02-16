# FitQuest ⚔️

**Level up your fitness** — A gamified fitness tracker that turns workouts into quests, XP, and achievements.

## Features

- **Dashboard** — Overview of today's quests and recent activity
- **Quests** — Complete challenges like "Run 30 min" or "5 workouts this week" to earn XP
- **Gym Tracker** — Hevy-style workout builder with 80+ exercises, set/rep/weight tracking, rest timer
- **Progress Graphs** — Chart weight, reps, or volume over time for each exercise
- **Workout Templates** — Save and load workout routines for quick reuse
- **75 Hard** — Track the mental toughness challenge (diet, 2 workouts, water, reading, photo)
- **Log Workouts** — Track runs, gym sessions, yoga, cycling, and more with duration and intensity
- **Achievements** — Unlock badges for milestones (first workout, level 5, 7-day streak, etc.)
- **Streaks** — Build momentum with consecutive workout days
- **Leveling** — Earn XP to level up (100 XP for level 2, +50 per level)

## How to Run

1. Open `index.html` in your web browser
2. No build step or server required — it's a single-page app

Your progress is saved automatically in your browser's local storage.

## Use on iPhone (PWA)

To install FitQuest as an app on your iPhone:

1. **Host the app** — PWA features require HTTPS. Use [GitHub Pages](https://pages.github.com/), [Netlify](https://netlify.com), or any static host. Or run a local server: `npx serve .`
2. Open the site in **Safari** (Chrome on iOS doesn't support Add to Home Screen)
3. Tap the **Share** button (square with arrow)
4. Tap **Add to Home Screen**
5. Tap **Add**

The app opens full-screen with the iOS 26 Liquid Glass design. Data is stored in your browser.

## Tech Stack

- Vanilla HTML, CSS, JavaScript
- No dependencies — works offline
- Fonts: Outfit, JetBrains Mono (from Google Fonts)
