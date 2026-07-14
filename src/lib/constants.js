// Rule 4: tasks estimated above this should be broken down into sub-tasks.
export const MAX_RECOMMENDED_ESTIMATE = 7

// Shared Tailwind classes for the text/number inputs in inline edit forms
// (Inventory, Today's Tasks).
export const inputClass =
  'bg-cream/5 border border-cream/15 rounded-xl text-cream placeholder:text-sage/50 outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-3 py-2 text-sm font-sans'

// Records Log's inline row editor is more compact (smaller padding/text, no
// placeholder color, less rounding) to fit inside a table row.
export const compactInputClass =
  'bg-cream/5 border border-cream/15 rounded-lg text-cream outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/40 px-2 py-1 text-xs font-sans'

// A small curated palette for user-created categories — deliberately not
// reusing tomato/amber, which already mean specific things elsewhere (work/
// danger and break/"took less", respectively); a category swatch in one of
// those colors would visually collide with the diff charts. Muted, warm
// tones chosen to fit the app's existing earthy palette without clashing.
// `name` is the English dev-facing label (used as a fallback and in
// non-UI contexts); `key` looks up the translated label via
// t(`categoryColors.${key}`) wherever the color name is shown to the user.
export const CATEGORY_COLORS = [
  { name: 'Teal', key: 'teal', value: '#4a8c82' },
  { name: 'Plum', key: 'plum', value: '#8a5a7d' },
  { name: 'Slate', key: 'slate', value: '#5b7290' },
  { name: 'Moss', key: 'moss', value: '#6b8a4f' },
  { name: 'Mustard', key: 'mustard', value: '#c9a227' },
  { name: 'Rose', key: 'rose', value: '#b56576' },
  { name: 'Ochre', key: 'ochre', value: '#b8803f' },
  { name: 'Indigo', key: 'indigo', value: '#5a5a9c' },
]

// Seeded once (see useCategories.js) for a brand new account/guest with no
// categories at all yet — a reasonable, editable/deletable starting point
// rather than an empty list. `labelKey` looks up the localized name via
// t(`defaultCategories.${labelKey}`); `colorIndex` picks from CATEGORY_COLORS
// above, spread out rather than adjacent so the starter set reads as visually
// distinct at a glance.
export const DEFAULT_CATEGORY_SEEDS = [
  { labelKey: 'work', colorIndex: 2 }, // Slate
  { labelKey: 'study', colorIndex: 0 }, // Teal
  { labelKey: 'personal', colorIndex: 5 }, // Rose
  { labelKey: 'admin', colorIndex: 4 }, // Mustard
  { labelKey: 'health', colorIndex: 3 }, // Moss
]

// Contextual onboarding: several short coach marks per core section, each
// shown at most once (see storage.js's DEFAULT_SETTINGS.seenCoachMarks).
// Deliberately about the *methodology* — what a Pomodoro/an estimate/a
// break/the rhythm settings actually mean — never UI mechanics (those
// already have their own, unrelated hints: the keyboard shortcuts modal,
// "+ Add category", etc.). Unlike a single "first visit" hint per section,
// each mark below has its own trigger — some fire on first visiting the
// section at all, others only once a specific, meaningful event happens
// there (starting a first Pomodoro, finishing a first break, adding a first
// task to Today, etc. — see the `pickCoachMark` callers in Timer.jsx/App.jsx/
// Reports.jsx/SettingsModal.jsx for the actual trigger conditions). Within a
// section, marks are listed in the order they're meant to appear — only one
// is ever shown at a time (the earliest one in this list whose condition is
// currently true and hasn't been seen yet), so they naturally chain as the
// user reaches each milestone instead of stacking up.
// `guideSection` is which MethodologyGuideModal topic "Learn more" opens to.
export const COACH_MARKS = [
  {
    id: 'timer-intro',
    section: 'timer',
    titleKey: 'coachMarks.timerIntro.title',
    bodyKey: 'coachMarks.timerIntro.body',
    guideSection: 'what-is-it',
  },
  {
    id: 'timer-first-start',
    section: 'timer',
    titleKey: 'coachMarks.timerFirstStart.title',
    bodyKey: 'coachMarks.timerFirstStart.body',
    guideSection: 'rules',
  },
  {
    id: 'timer-first-interruption',
    section: 'timer',
    titleKey: 'coachMarks.timerFirstInterruption.title',
    bodyKey: 'coachMarks.timerFirstInterruption.body',
    guideSection: 'interruptions',
  },
  {
    id: 'timer-first-break',
    section: 'timer',
    titleKey: 'coachMarks.timerFirstBreak.title',
    bodyKey: 'coachMarks.timerFirstBreak.body',
    guideSection: 'what-is-it',
  },
  {
    id: 'planning-intro',
    section: 'planning',
    titleKey: 'coachMarks.planningIntro.title',
    bodyKey: 'coachMarks.planningIntro.body',
    guideSection: 'what-is-it',
  },
  {
    id: 'planning-first-today-task',
    section: 'planning',
    titleKey: 'coachMarks.planningFirstTodayTask.title',
    bodyKey: 'coachMarks.planningFirstTodayTask.body',
    guideSection: 'estimation',
  },
  {
    id: 'reports-intro',
    section: 'reports',
    titleKey: 'coachMarks.reportsIntro.title',
    bodyKey: 'coachMarks.reportsIntro.body',
    guideSection: 'reports',
  },
  {
    id: 'reports-first-data',
    section: 'reports',
    titleKey: 'coachMarks.reportsFirstData.title',
    bodyKey: 'coachMarks.reportsFirstData.body',
    guideSection: 'reports',
  },
  {
    id: 'settings-intro',
    section: 'settings',
    titleKey: 'coachMarks.settingsIntro.title',
    bodyKey: 'coachMarks.settingsIntro.body',
    guideSection: 'what-is-it',
  },
  {
    id: 'settings-data-intro',
    section: 'settings',
    titleKey: 'coachMarks.settingsDataIntro.title',
    bodyKey: 'coachMarks.settingsDataIntro.body',
    guideSection: 'reports',
  },
]

// Picks which (if any) coach mark should currently be visible for a section:
// the first one, in COACH_MARKS' listed order, that hasn't been seen yet AND
// whose trigger condition currently holds. `conditions` maps a mark id to a
// boolean; a mark with no entry defaults to "always true" (e.g. a plain
// first-visit intro mark has no extra condition beyond "not seen yet").
// Returns the full mark object (or null), not just an id, so callers don't
// also need a second COACH_MARKS.find() to get its titleKey/bodyKey.
export function pickCoachMark(section, seenIds, conditions = {}) {
  return (
    COACH_MARKS.find(
      (mark) => mark.section === section && !seenIds.includes(mark.id) && (conditions[mark.id] ?? true)
    ) ?? null
  )
}

// MethodologyGuideModal's content — a longer, structured, paraphrased
// explanation of the Pomodoro Technique for anyone who wants more than a
// coach mark's one- or two-sentence hint. Each topic is meant to be
// understandable completely on its own, with no assumed prior knowledge
// (not even of the other topics) — written in this app's own words
// (docs/methodology.md already is; nothing here quotes Cirillo's book).
export const GUIDE_SECTIONS = [
  { id: 'what-is-it', titleKey: 'methodologyGuide.whatIsIt.title', bodyKey: 'methodologyGuide.whatIsIt.body' },
  { id: 'rules', titleKey: 'methodologyGuide.rules.title', bodyKey: 'methodologyGuide.rules.body' },
  { id: 'sizing', titleKey: 'methodologyGuide.sizing.title', bodyKey: 'methodologyGuide.sizing.body' },
  {
    id: 'interruptions',
    titleKey: 'methodologyGuide.interruptions.title',
    bodyKey: 'methodologyGuide.interruptions.body',
  },
  {
    id: 'estimation',
    titleKey: 'methodologyGuide.estimation.title',
    bodyKey: 'methodologyGuide.estimation.body',
  },
  { id: 'reports', titleKey: 'methodologyGuide.reports.title', bodyKey: 'methodologyGuide.reports.body' },
]
