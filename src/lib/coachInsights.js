// Heuristic coach. Pure function: data in, ranked insights out.
//
// Each insight has:
//   id:       stable string
//   kind:     'win' | 'warn' | 'info' | 'nudge'
//   priority: 0..100 (higher = surfaced first)
//   headline: short string
//   detail:   optional longer line of context

const dayKey = (date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const daysAgo = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00')
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

const round1 = (n) => Math.round(n * 10) / 10

const meanByDay = (entries, getValue) => {
  if (entries.length === 0) return { mean: 0, days: 0 }
  const byDay = {}
  entries.forEach(e => {
    if (!byDay[e.date]) byDay[e.date] = 0
    byDay[e.date] += getValue(e) || 0
  })
  const days = Object.keys(byDay).length
  const sum = Object.values(byDay).reduce((a, b) => a + b, 0)
  return { mean: sum / days, days }
}

const lastNDays = (entries, n) => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - n)
  return entries.filter(e => new Date(e.date + 'T12:00:00') >= cutoff)
}

// ─── individual rules ───────────────────────────────────────────────

function ruleNoWorkoutGap(exercises, settings) {
  if (exercises.length === 0) return null
  const workoutDays = [...new Set(exercises.map(e => e.date))]
    .sort((a, b) => new Date(b) - new Date(a))
  const last = workoutDays[0]
  const gap = daysAgo(last)
  if (gap >= 4) {
    return {
      id: 'workout-gap',
      kind: 'warn',
      priority: 80 + Math.min(15, gap),
      headline: `${gap} days since your last workout`,
      detail: `Your usual cadence is ${settings.workoutDaysGoal || 4}× a week — time to ease back in.`,
    }
  }
  return null
}

function ruleStreak(exercises) {
  if (exercises.length === 0) return null
  const set = new Set(exercises.map(e => e.date))
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const k = dayKey(d)
    if (set.has(k)) streak++
    else if (i > 0) break
  }
  if (streak >= 5) {
    return {
      id: 'streak',
      kind: 'win',
      priority: 70,
      headline: `${streak}-day workout streak — strong`,
      detail: 'Consistency is the multiplier. Keep showing up.',
    }
  }
  if (streak >= 3) {
    return {
      id: 'streak',
      kind: 'win',
      priority: 50,
      headline: `${streak}-day streak going`,
      detail: 'Few more days and you lock in a real groove.',
    }
  }
  return null
}

function ruleWorkoutsThisWeek(exercises, settings) {
  const target = settings.workoutDaysGoal || 4
  const recent = lastNDays(exercises, 7)
  const days = new Set(recent.map(e => e.date)).size
  // Mid-week status (Wed–Sun): warn if behind pace
  const dow = new Date().getDay() // 0=Sun
  const expectedByNow = Math.round((target / 7) * (dow === 0 ? 7 : dow + 1))
  if (days < expectedByNow && days < target) {
    const behind = expectedByNow - days
    return {
      id: 'week-pace',
      kind: 'nudge',
      priority: 60,
      headline: `${behind} workout${behind === 1 ? '' : 's'} behind weekly pace`,
      detail: `${days}/${target} this week. Schedule one in.`,
    }
  }
  if (days >= target) {
    return {
      id: 'week-pace',
      kind: 'win',
      priority: 55,
      headline: `Weekly target hit: ${days}/${target}`,
      detail: 'Everything else is a bonus this week.',
    }
  }
  return null
}

function ruleProtein(meals, settings) {
  if (!settings.trackMacros) return null
  const goal = settings.proteinGoal
  if (!goal) return null
  const recent = lastNDays(meals, 7)
  const { mean, days } = meanByDay(recent, m => m.protein)
  if (days < 3) return null
  const pct = mean / goal
  if (pct < 0.75) {
    return {
      id: 'protein-low',
      kind: 'warn',
      priority: 75,
      headline: `Protein low: ${Math.round(mean)}g/day avg`,
      detail: `Target is ${goal}g — about ${Math.round(goal - mean)}g short daily over the past ${days} days.`,
    }
  }
  if (pct >= 0.95 && pct <= 1.15) {
    return {
      id: 'protein-ok',
      kind: 'win',
      priority: 40,
      headline: `Protein on target: ${Math.round(mean)}g/day`,
      detail: `Right in the ${goal}g zone for ${days} days running.`,
    }
  }
  return null
}

function ruleCalories(meals, settings) {
  const goal = settings.calorieGoal
  if (!goal) return null
  const recent = lastNDays(meals, 7)
  const { mean, days } = meanByDay(recent, m => m.calories)
  if (days < 3) return null
  const diff = mean - goal
  const pct = Math.abs(diff) / goal
  if (pct < 0.05) return null
  if (diff > 0 && pct >= 0.1) {
    return {
      id: 'calories-over',
      kind: 'warn',
      priority: 65,
      headline: `Calories ${Math.round(diff)} over goal on average`,
      detail: `Last ${days} days averaged ${Math.round(mean)} kcal vs ${goal} target.`,
    }
  }
  if (diff < 0 && pct >= 0.1) {
    return {
      id: 'calories-under',
      kind: 'info',
      priority: 35,
      headline: `Eating ${Math.round(-diff)} below goal on average`,
      detail: `${Math.round(mean)} kcal/day — fine if cutting, watch energy if not.`,
    }
  }
  return null
}

function ruleNotLoggedToday(meals, exercises) {
  const today = dayKey()
  const hasMeals = meals.some(m => m.date === today)
  const hasWorkout = exercises.some(e => e.date === today)
  const hour = new Date().getHours()
  if (!hasMeals && hour >= 13) {
    return {
      id: 'no-meals-today',
      kind: 'nudge',
      priority: 78,
      headline: `Nothing logged today`,
      detail: hasWorkout
        ? 'You logged a workout — close the loop with what you ate.'
        : 'Tap + to add a meal or workout while it\'s fresh.',
    }
  }
  return null
}

function ruleWeightTrend(weighIns, settings) {
  if (weighIns.length < 2) return null
  const sorted = [...weighIns].sort((a, b) => new Date(a.date) - new Date(b.date))
  const recent = lastNDays(sorted, 21)
  if (recent.length < 2) return null
  const first = recent[0].weight
  const last = recent[recent.length - 1].weight
  const delta = round1(last - first)
  if (Math.abs(delta) < 0.3) return null

  const target = settings.targetWeight ? parseFloat(settings.targetWeight) : null
  const unit = settings.weightUnit || 'lbs'
  const heading = target ? (target < first ? 'cut' : 'bulk') : null

  // Aligned with goal direction?
  if (target) {
    const wantDown = target < first
    const movingRight = (wantDown && delta < 0) || (!wantDown && delta > 0)
    if (movingRight) {
      return {
        id: 'weight-trend',
        kind: 'win',
        priority: 60,
        headline: `${Math.abs(delta)} ${unit} ${delta < 0 ? 'down' : 'up'} in 3 weeks`,
        detail: `Trending toward your ${target} ${unit} ${heading} goal.`,
      }
    } else {
      return {
        id: 'weight-trend',
        kind: 'warn',
        priority: 62,
        headline: `Weight moving away from goal`,
        detail: `${Math.abs(delta)} ${unit} ${delta < 0 ? 'down' : 'up'}, target is ${target} ${unit}.`,
      }
    }
  }
  return {
    id: 'weight-trend',
    kind: 'info',
    priority: 30,
    headline: `${Math.abs(delta)} ${unit} ${delta < 0 ? 'down' : 'up'} in 3 weeks`,
    detail: `Set a target weight in Goals to track direction.`,
  }
}

function ruleRecentPR(exercises) {
  // Look for resistance exercises where the most recent session's max weight
  // exceeds all prior sessions of the same exercise.
  const byName = {}
  exercises.forEach(e => {
    if (e.measurementType && e.measurementType !== 'resistance') return
    const key = e.name?.toLowerCase().trim()
    if (!key) return
    const maxW = Array.isArray(e.measurementValue)
      ? Math.max(...e.measurementValue.map(Number).filter(Number.isFinite))
      : Number(e.measurementValue || e.resistance || 0)
    if (!Number.isFinite(maxW) || maxW <= 0) return
    if (!byName[key]) byName[key] = []
    byName[key].push({ date: e.date, maxW, name: e.name })
  })

  let bestPR = null
  Object.values(byName).forEach(rows => {
    if (rows.length < 2) return
    rows.sort((a, b) => new Date(a.date) - new Date(b.date))
    const latest = rows[rows.length - 1]
    if (daysAgo(latest.date) > 7) return
    const priorMax = Math.max(...rows.slice(0, -1).map(r => r.maxW))
    if (latest.maxW > priorMax) {
      const gain = round1(latest.maxW - priorMax)
      if (!bestPR || gain > bestPR.gain) {
        bestPR = { name: latest.name, weight: latest.maxW, gain, date: latest.date }
      }
    }
  })

  if (!bestPR) return null
  return {
    id: 'pr',
    kind: 'win',
    priority: 95,
    headline: `New PR · ${bestPR.name}`,
    detail: `${bestPR.weight} lb (+${bestPR.gain}). Banked ${daysAgo(bestPR.date) === 0 ? 'today' : daysAgo(bestPR.date) + ' days ago'}.`,
  }
}

function ruleConsistency(meals, exercises) {
  const days7 = lastNDays(meals.concat(exercises), 7)
  const mealDays = new Set(days7.filter(x => 'calories' in x).map(x => x.date))
  const exDays = new Set(days7.filter(x => 'measurementType' in x || 'reps' in x).map(x => x.date))
  let bothCount = 0
  mealDays.forEach(d => { if (exDays.has(d)) bothCount++ })
  if (bothCount >= 5) {
    return {
      id: 'consistency',
      kind: 'win',
      priority: 45,
      headline: `${bothCount}/7 days fully logged`,
      detail: 'Meals + workouts both tracked. Best data → best advice.',
    }
  }
  return null
}

function ruleSparse(meals, exercises, weighIns) {
  const total = meals.length + exercises.length + weighIns.length
  if (total >= 5) return null
  return {
    id: 'sparse',
    kind: 'info',
    priority: 10,
    headline: 'Log a few more entries and I\'ll start spotting trends',
    detail: 'Coach reads your data — about a week of logging unlocks the good stuff.',
  }
}

// ─── public API ─────────────────────────────────────────────────────

export function generateInsights({ exercises = [], meals = [], weighIns = [], settings = {} }) {
  const rules = [
    ruleRecentPR(exercises),
    ruleNoWorkoutGap(exercises, settings),
    ruleNotLoggedToday(meals, exercises),
    ruleProtein(meals, settings),
    ruleCalories(meals, settings),
    ruleWeightTrend(weighIns, settings),
    ruleWorkoutsThisWeek(exercises, settings),
    ruleStreak(exercises),
    ruleConsistency(meals, exercises),
    ruleSparse(meals, exercises, weighIns),
  ].filter(Boolean)

  // Sort highest priority first
  rules.sort((a, b) => b.priority - a.priority)

  // De-dupe by id (rules can fire mutually exclusive insights, but safety net)
  const seen = new Set()
  return rules.filter(r => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })
}
