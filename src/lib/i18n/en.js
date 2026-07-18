export default {
  common: {
    appTitle: 'Pomodoro Technique',
    add: 'Add',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
    noCategory: 'No category',
    noCategories: 'No categories',
    descriptionPlaceholder: 'Description (optional)',
    descriptionAria: 'Description',
    showDescription: 'Show description',
    hideDescription: 'Hide description',
    collapseSectionAria: 'Collapse {{section}}',
    expandSectionAria: 'Expand {{section}}',
  },

  tabs: {
    timer: 'Timer',
    planning: 'Planning',
    reports: 'Reports',
  },

  header: {
    homeAria: 'Go to Timer',
    greeting: 'Hello, {{name}}! Focus',
    settingsAria: 'Settings',
    accountMenuAria: 'Account menu',
    streakAria: 'View streak details',
  },

  streak: {
    detailsTitle: 'Your Streak',
    closeAria: 'Close streak details',
    currentStreakLabel: '{{count}} day streak',
    longestStreakLabel: 'Longest: {{count}} days',
    freezeAvailableYes: 'Streak Freeze ready',
    freezeAvailableNo: 'Next Streak Freeze in {{days}} days',
    freezeExplainer: 'Miss a day and an available Streak Freeze protects your streak automatically — one per week.',
    nextMilestoneLabel: '{{days}} days to the {{milestone}}-day milestone',
    allMilestonesReached: "You've passed every milestone — impressive!",
    recentDaysCaption: 'Last 14 days',
    recentDayDone: '{{date}}: Pomodoro completed',
    recentDayFrozen: '{{date}}: covered by a Streak Freeze',
    recentDayMissed: '{{date}}: missed',
    // StreakDetailsModal's color legend under the 14-day strip.
    legendDone: 'Completed',
    legendFrozen: 'Frozen',
    legendMissed: 'Missed',
    celebrationIncrementAria: 'Streak increased to {{count}}',
    celebrationMilestoneTitle: '{{count}}-Day Streak!',
    celebrationMilestoneAria: 'Milestone reached: {{count}} day streak',
    // StreakCelebrationScreen's full-screen takeover (see App.jsx) — plain
    // increment reuses the same "{{count}}-Day Streak!" phrasing as the
    // milestone title above, just with a lighter subtitle; the badge line
    // is milestone-only.
    celebrationIncrementTitle: '{{count}}-Day Streak!',
    celebrationIncrementSubtitle: 'Keep the fire going.',
    celebrationMilestoneSubtitle: "You've hit a new milestone!",
    celebrationMilestoneBadge: 'Milestone',
    celebrationContinueButton: 'Continue',
  },

  timer: {
    focus: 'Focus',
    shortBreak: 'Short break',
    longBreak: 'Long break',
    switchTo: 'Switch to {{label}}',
    currentTask: 'Current task',
    noActiveTask: 'No active task. Add one in Planning to get started.',
    goToPlanningButton: 'Go to Planning',
    start: 'Start',
    resume: 'Resume',
    pause: 'Pause',
    pauseCount: 'Paused {{count}}x this session',
    noTaskStartHint: 'You can start without a task, or select one in Planning first.',
    voidPomodoro: 'Void Pomodoro',
    skipBreak: 'Skip break',
    hadInterruption: 'Had an interruption?',
    internalInterruption: 'Internal interruption ({{count}})',
    externalInterruption: 'External interruption ({{count}})',
    undoInternalAria: 'undo internal interruption',
    undoExternalAria: 'undo external interruption',
    keyboardShortcutsTitle: 'Keyboard shortcuts',
    keyboardModalTitle: 'Keyboard Shortcuts',
    keyboardColCommand: 'Command',
    keyboardColAction: 'Action',
    shortcutStartPause: 'Start the timer, or pause / resume it while running',
    shortcutVoid: 'Void the current Pomodoro',
    shortcutFullscreen: 'Toggle fullscreen focus mode',
    shortcutSkipBreak: 'Skip the current break',
    shortcutGoTimer: 'Go to the Timer tab',
    shortcutGoPlanning: 'Go to the Planning tab',
    shortcutGoReports: 'Go to the Reports tab',
    shortcutHelp: 'Show this shortcuts list',
    shortcutsCloseAria: 'close keyboard shortcuts',
    unplannedPrompt: "Unplanned & urgent? Jot it and keep going.",
    switchAwayConfirm:
      "The current Pomodoro will be abandoned before it rings and voided (it won't count). Switch to the break anyway?",
    voidPanelWarning: "This Pomodoro will be voided and won't count.",
    voidReasonLabel: 'Why did you void this Pomodoro? (optional)',
    voidReasonPlaceholder: 'e.g. got called into a meeting',
    voidReasonAria: 'Void reason (optional)',
    exitFullscreenAria: 'Exit fullscreen focus mode',
    enterFullscreenAria: 'Enter fullscreen focus mode',
    exitFullscreenTitle: 'Exit fullscreen (F or Esc)',
    enterFullscreenTitle: 'Fullscreen focus mode (F)',
    closeMiniTimerAria: 'Close mini timer window',
    openMiniTimerAria: 'Open mini timer window (picture-in-picture)',
    closeMiniTimerTitle: 'Close mini timer window',
    openMiniTimerTitle: 'Mini timer window (picture-in-picture)',
  },

  // Placeholder content only — the user is writing the real quotes/lines/
  // jokes/facts themselves. Kept as a handful of obviously-labeled
  // placeholder entries per category/sub-type so the feature is fully
  // functional/testable; each `entries` array is meant to be expanded later,
  // same shape, no code changes required. See MotivationOverlay.jsx and
  // src/lib/motivationCategories.js (the draw logic that reads these paths).
  motivation: {
    buttonAria: 'Motivational moment',
    buttonTitle: 'Draw a card for a motivational moment',
    usedBadgeAria: 'Already used this Pomodoro',
    overlayCloseAria: 'Close motivational moment',
    pickPrompt: 'Pick a card',
    revealAgainHint: 'Tap a card to see what it holds.',
    alreadyDrawnTitle: 'Already drawn this Pomodoro',
    alreadyDrawnMessage: "You've already pulled a card this Pomodoro. A new one will be ready next Pomodoro.",
    guessItShowAnswer: 'Show answer',
    rareBadge: 'Rare',
    // Shown instead of the card table when a guest (not signed in) opens
    // this — the feature itself is signed-in only. guestPreviewBubble is
    // the character's own speech-bubble line; guestPreviewMessage is the
    // explanatory blurb above the Sign Up button (see auth.signUpButton).
    guestPreviewBubble: "Sign up, and I'll deal you in.",
    guestPreviewMessage: 'Create a free account to draw motivational cards with me between your Pomodoros.',
    // One is picked at random each time the overlay opens — flavor/prompt
    // text only, not the motivational content itself. See MotivationOverlay.jsx.
    flavorLines: [
      'Feel which card truly calls to you, and choose it.',
      "Let your hand drift. The right card already knows it's yours.",
      "No wrong choice here. Just the one that's calling.",
      'Close your eyes for a breath, then pick what feels warm.',
      'Trust the pull. The cards already know.',
      'One of these is already waiting for you.',
      'Breathe once. Choose the one that feels right.',
      'The answer picks you back. Go on.',
    ],
    // Easter egg only — shown when the character's head is clicked/tapped.
    // No functional effect, purely a random reaction. See MotivationOverlay.jsx.
    headPokeReactions: [
      "Hey! Careful, I'm not a stress ball!",
      'Ow! Gentle, please, I bruise like a tomato!',
      "Don't squeeze the wise one, please!",
      "I'm ripe, not a button!",
      'Poke my wisdom, not my face!',
      "One more poke and I'm rolling away!",
    ],
    // The 6-category system — 5 normal categories drawn from a weighted
    // pick (see CATEGORY_WEIGHTS in motivationCategories.js) plus the
    // independent 2%-chance Rare roll. `label` is shown under the category
    // icon once a card is revealed.
    categories: {
      focusDiscipline: {
        label: 'Focus & Discipline',
        subTypes: {
          // A generically-framed notable figure — never a named real
          // person, same "generic thinker" approach the original 3-category
          // version used to avoid misattribution.
          notableFigure: {
            entries: [
              'A wise mentor once said: the work you avoid is usually the work that grows you most.',
              'An old craftsman had a motto: precision comes from patience, not from speed.',
              'A seasoned coach liked to say: discipline is choosing between what you want now and what you want most.',
              'A quiet philosopher once noted: small steps taken daily outrun great leaps taken rarely.',
              'A veteran teacher used to remind her students: focus is a muscle, and today is leg day.',
              'A wise elder once said: the pot only boils once you stop watching it and keep working.',
            ],
          },
          // Original archetypal voices only — never a real copyrighted
          // character or a verbatim line from one.
          fictional: {
            entries: [
              "The Old Mountain Sage: 'The summit does not move. Only your feet do.'",
              "The Clockwork Knight: 'A blade dulls from disuse, not from battle. Keep moving.'",
              "The Lighthouse Keeper: 'I do not light the lamp for calm seas. I light it for the storm.'",
              "The Wandering Scholar: 'Every page turned is a mile walked toward mastery.'",
              "The Star Navigator: 'Even off course, a ship that keeps sailing still finds land.'",
              "The Village Blacksmith: 'The iron does not ask to be hot before it is shaped. Neither should you.'",
            ],
          },
          proverb: {
            entries: [
              'A field is not plowed by wishing for rain.',
              'The tallest tree once stood as a single seed that refused to quit.',
              'A slow arrow that keeps flying still reaches farther than one left in the quiver.',
              'Even a small candle can outlast a long night, as long as it keeps burning.',
              'The river carves stone not with strength, but with patience.',
              'A single brick laid each day still builds a wall by winter.',
            ],
          },
        },
      },
      // Intended tone (for whoever writes the real content later): warm,
      // supportive, never judgmental about procrastination or an unfinished
      // task — the opposite register from Focus & Discipline.
      selfCompassion: {
        label: 'Self-Compassion',
        entries: [
          'You showed up today. That already counts for something.',
          'Unfinished does not mean failed. It means still in progress.',
          'Rest is not the opposite of productivity. It is part of it.',
          'You are allowed to have a slow day and still be proud of yourself.',
          'Progress does not need to be loud to be real.',
          'Be as patient with yourself as you would be with a good friend.',
        ],
      },
      // The character's own slightly cheeky-but-charming voice.
      tomatoManJokes: {
        label: 'Tomato Man Jokes',
        entries: [
          "I'm not saying I'm the most productive vegetable in the room, but I am technically a fruit, so take that as you will.",
          'They call it a Pomodoro because after twenty five minutes I turn a little red in the face too.',
          'I used to be a couch potato. Then I got ambitious and became a couch tomato.',
          "My favorite part of the break is pretending I'm not going to check my phone. Works every time.",
          'Some people count sheep to relax. I count finished Pomodoros. Works better.',
          "I'd tell you a joke about procrastination, but I keep putting it off.",
        ],
      },
      funFact: {
        label: 'Fun Fact',
        subTypes: {
          fact: {
            entries: [
              'Tomatoes were once feared as poisonous in parts of Europe, mostly because wealthy diners ate them off pewter plates that reacted with their acidity. The tomato was innocent all along.',
              'The Pomodoro Technique gets its name from a plain kitchen timer shaped like a tomato that its creator, Francesco Cirillo, used as a university student in the late 1980s.',
              'Botanically speaking, a tomato is a fruit. A famous 1893 US Supreme Court case ruled it a vegetable anyway, purely for tax purposes. Even the law could not stay focused on one answer.',
              'Attention research suggests the mind naturally starts to drift after roughly twenty to thirty minutes of focused work, which lines up almost exactly with one classic Pomodoro.',
              'There are more than ten thousand tomato varieties grown around the world, from cherry sized to ones that weigh over a kilogram.',
              'Short breaks between focused work sessions have been shown to help the brain consolidate memory, quietly filing away what you just learned.',
            ],
          },
          // Interactive: question shown first, answer revealed on tap (see
          // MotivationOverlay.jsx's GuessItReveal). Each entry is an
          // object, not a plain string — translate() returns whatever's at
          // the path untouched when called with no vars, so this round-trips
          // fine through the same t() lookup every other category uses.
          guessIt: {
            entries: [
              {
                question: 'True or false: a tomato is technically a fruit, not a vegetable.',
                answer: 'True. Botanically, a tomato is a fruit because it develops from a flower and carries seeds.',
              },
              {
                question: 'How many minutes does one classic Pomodoro work session last?',
                answer: 'Twenty five minutes, followed by a short break. You can adjust it in Settings, but 25 is the classic default.',
              },
              {
                question: 'What everyday object inspired the name of the Pomodoro Technique?',
                answer: "A tomato shaped kitchen timer. 'Pomodoro' is simply Italian for tomato.",
              },
              {
                question: 'Roughly how long can most people sustain deep focus before attention starts to drift?',
                answer: 'About twenty to thirty minutes, part of why short focused sessions tend to work so well.',
              },
              {
                question: 'True or false: taking short breaks during work can actually improve memory.',
                answer: 'True. Brief breaks help the brain consolidate what it just learned.',
              },
              {
                question: 'About how many tomato varieties exist worldwide?',
                answer: 'Over ten thousand, ranging from tiny cherry tomatoes to giants weighing more than a kilogram.',
              },
            ],
          },
        },
      },
      // NOT placeholder — real content, computed from the user's own ticks/
      // activity log at draw time (see motivationCategories.js's
      // computeStatValue). {{count}} is filled in with a real number.
      personalStatCard: {
        label: 'Personal Stat Card',
        templates: {
          today: "You've completed {{count}} Pomodoros today.",
          week: "You've completed {{count}} Pomodoros this week.",
          allTime: "You've completed {{count}} Pomodoros in total.",
          tasksDone: "You've finished {{count}} tasks so far.",
        },
      },
      // Independent 2%-chance roll (RARE_CARD_CHANCE), not part of the
      // weighted category pick above. One fixed line, not a random pool.
      rare: {
        label: 'Rare Card',
        openingLine: 'A rare thread in time has found you. Pause a moment, and let it land.',
      },
    },
  },

  // Settings > Achievements tab — see CardCollectionStats.jsx. Light-touch
  // stats view over the card-draw history; not a full achievement/badge
  // system (achievementsFooter says as much).
  motivationStats: {
    title: 'Card Collection',
    noDrawsYet: 'Draw your first card from the Timer to start your collection.',
    totalDrawsLabel: 'Cards drawn',
    distinctCategoriesLabel: 'Categories discovered',
    rareFoundLabel: 'Rare cards found',
    firstRareLabel: 'First Rare card',
    firstRareNone: 'Not found yet',
    byCategoryTitle: 'By category',
    achievementsFooter: 'More card badges are just below.',
  },

  streakMilestones: {
    title: 'Streak Milestones',
    summary: 'Current streak: {{current}} days · Longest: {{longest}} days',
    milestoneLabel: '{{days}}-day streak',
    reachedAria: 'Reached',
    lockedAria: 'Not reached yet',
  },

  // Settings > Achievements — see src/lib/achievements.js for the config
  // this renders (src/components/achievements/AchievementGrid.jsx) and
  // AchievementUnlockToast.jsx for the unlock notification.
  achievements: {
    title: 'Achievements',
    summary: '{{unlocked}}/{{total}} unlocked',
    categories: {
      dailyPomodoroCount: {
        label: 'Daily Focus',
        description: 'Complete multiple Pomodoros in a single day.',
      },
      cumulativeFocusHours: {
        label: 'Total Focus Time',
        description: 'Accumulate hours of focused work over time.',
      },
      cumulativeBreakHours: {
        label: 'Total Break Time',
        description: 'Accumulate time spent resting between Pomodoros.',
      },
      cumulativeTasksCompleted: {
        label: 'Tasks Finished',
        description: 'Complete tasks across all time.',
      },
      activeDaysLifetime: {
        label: 'Days Active',
        description: 'Show up for at least one Pomodoro, any day, in any order.',
      },
      motivationCardsDraws: {
        label: 'Card Draws',
        description: 'Draw cards from the motivation deck.',
      },
      motivationCardsRare: {
        label: 'Rare Finds',
        description: 'Draw Rare cards from the motivation deck.',
      },
      motivationCardsDiscovery: {
        label: 'Full Collection',
        description: 'Discover every card category.',
      },
      firsts: {
        label: 'Firsts',
        description: 'Milestones you only hit once.',
      },
      resilience: {
        label: 'Resilience',
        description: 'Name an interruption instead of letting it derail you.',
      },
      categoryDiversity: {
        label: 'Well Rounded',
        description: 'Finish tasks across different categories.',
      },
      earlyBird: {
        label: 'Early Bird',
        description: 'Complete a Pomodoro before 8 AM.',
      },
      nightOwl: {
        label: 'Night Owl',
        description: 'Complete a Pomodoro at 10 PM or later.',
      },
      reflectivePause: {
        label: 'Reflective Pause',
        description: "Write down why, when a Pomodoro doesn't go as planned.",
      },
    },
    dailyPomodoroCount: {
      tier1: { title: 'First Pomodoro', description: 'Complete your first Pomodoro of the day.' },
      tier2: { title: 'Warming Up', description: 'Complete 4 Pomodoros in a single day.' },
      tier3: { title: 'In the Zone', description: 'Complete 8 Pomodoros in a single day.' },
      tier4: { title: 'Deep Focus', description: 'Complete 12 Pomodoros in a single day.' },
      tier5: { title: 'Relentless', description: 'Complete 16 Pomodoros in a single day.' },
      tier6: { title: 'Unstoppable', description: 'Complete 20 Pomodoros in a single day.' },
      tier7: { title: 'Full Send', description: 'Complete 24 Pomodoros in a single day.' },
    },
    cumulativeFocusHours: {
      tier1: { title: '25 Hours Focused', description: 'Reach 25 total hours of focused work.' },
      tier2: { title: '50 Hours Focused', description: 'Reach 50 total hours of focused work.' },
      tier3: { title: '100 Hours Focused', description: 'Reach 100 total hours of focused work.' },
      tier4: { title: '250 Hours Focused', description: 'Reach 250 total hours of focused work.' },
      tier5: { title: '500 Hours Focused', description: 'Reach 500 total hours of focused work.' },
      tier6: { title: '1,000 Hours Focused', description: 'Reach 1,000 total hours of focused work.' },
    },
    cumulativeBreakHours: {
      tier1: { title: 'Taking It Easy', description: 'Reach 5 total hours of break time.' },
      tier2: { title: 'Well Rested', description: 'Reach 15 total hours of break time.' },
      tier3: { title: 'Balance Kept', description: 'Reach 30 total hours of break time.' },
      tier4: { title: 'Recharge Regular', description: 'Reach 75 total hours of break time.' },
      tier5: { title: 'Recovery Pro', description: 'Reach 150 total hours of break time.' },
      tier6: { title: 'Master of Rest', description: 'Reach 300 total hours of break time.' },
    },
    cumulativeTasksCompleted: {
      tier1: { title: 'Getting Things Done', description: 'Finish 5 tasks.' },
      tier2: { title: 'Steady Progress', description: 'Finish 25 tasks.' },
      tier3: { title: 'Task Crusher', description: 'Finish 50 tasks.' },
      tier4: { title: 'Momentum Builder', description: 'Finish 150 tasks.' },
      tier5: { title: 'Prolific', description: 'Finish 300 tasks.' },
      tier6: { title: 'Task Legend', description: 'Finish 600 tasks.' },
    },
    activeDaysLifetime: {
      tier1: { title: 'Day One', description: 'Complete a Pomodoro on your first active day.' },
      tier2: { title: "A Week's Worth", description: 'Be active on 7 different days.' },
      tier3: { title: "A Month's Worth", description: 'Be active on 30 different days.' },
      tier4: { title: 'Quarter Strong', description: 'Be active on 90 different days.' },
      tier5: { title: 'Half a Year', description: 'Be active on 180 different days.' },
      tier6: { title: 'A Full Year', description: 'Be active on 365 different days.' },
      tier7: { title: 'Two Years Strong', description: 'Be active on 730 different days.' },
    },
    motivationCardsDraws: {
      tier1: { title: 'First Draw', description: 'Draw your first motivation card.' },
    },
    motivationCardsRare: {
      tier1: { title: 'Rare Find', description: 'Draw your first Rare card.' },
      tier2: { title: 'Lucky Streak', description: 'Draw 5 Rare cards.' },
      tier3: { title: 'Rare Collector', description: 'Draw 10 Rare cards.' },
    },
    motivationCardsDiscovery: {
      tier1: { title: 'Card Connoisseur', description: 'Discover every motivation card category.' },
    },
    firsts: {
      task: { title: 'First Task Finished', description: 'Complete your very first task.' },
      break: { title: 'First Break Taken', description: 'Take your very first break.' },
    },
    resilience: {
      tier1: {
        title: 'Naming It',
        description: 'Log your first interruption instead of letting it slide by unnoticed.',
      },
      tier2: { title: 'Staying Aware', description: 'Log 10 interruptions.' },
      tier3: { title: 'Steady Hand', description: 'Log 25 interruptions.' },
      tier4: { title: 'Unshaken', description: 'Log 50 interruptions.' },
    },
    categoryDiversity: {
      tier1: { title: 'Branching Out', description: 'Finish tasks in 2 different categories.' },
      tier2: { title: 'Well Rounded', description: 'Finish tasks in 4 different categories.' },
      tier3: { title: 'All Over the Map', description: 'Finish tasks in 6 different categories.' },
    },
    earlyBird: {
      tier1: { title: 'Early Bird', description: 'Complete a Pomodoro before 8 AM.' },
    },
    nightOwl: {
      tier1: { title: 'Night Owl', description: 'Complete a Pomodoro at 10 PM or later.' },
    },
    reflectivePause: {
      tier1: {
        title: 'Reflective Pause',
        description: "Write down why, the first time a Pomodoro doesn't go as planned.",
      },
    },
    progress: {
      countFormat: '{{value}}/{{threshold}}',
      hoursFormat: '{{value}}h / {{threshold}}h',
      daysFormat: '{{value}}/{{threshold}} days',
    },
    toast: {
      unlockedLabel: 'Achievement Unlocked',
      dismissAria: 'Dismiss',
    },
    grid: {
      lockedAria: 'Locked',
      unlockedAria: 'Unlocked',
      allTiersDone: 'All tiers complete',
      cardBadgesTitle: 'Card Badges',
      specialTitle: 'Special',
    },
  },

  notifications: {
    pomodoroCompleteTitle: 'Pomodoro complete',
    longBreakBody: 'Time for a long break.',
    shortBreakBody: 'Time for a short break.',
    breakOverTitle: 'Break over',
    backToWorkBody: 'Time to get back to work.',
  },

  inventory: {
    title: 'Activity Inventory',
    itemsCount: '{{count}} items',
    newTaskPlaceholder: 'New task...',
    newTaskAria: 'New task',
    estimateLabel: 'Est.',
    estimatePlaceholder: '# pomodoros',
    estimateShortPlaceholder: 'Est.',
    estimateAria: 'Estimate',
    taskNameAria: 'Task name',
    deadlineAria: 'Deadline',
    markUnplannedTitle: 'Mark as unplanned',
    addButton: 'Add',
    saveButton: 'Save',
    cancelButton: 'Cancel',
    selectToCombineTitle: 'Select to combine with other small tasks (Rule 5)',
    selectAria: 'select {{text}} to combine',
    markDoneAria: 'mark as done',
    unplannedBadgeTitle: 'Unplanned',
    moreThanWarningInline: 'More than {{max}}. Break it up (Rule 4)',
    moreThanWarning: 'More than {{max}} pomodoros. Break the task into sub-tasks (Rule 4).',
    addToToday: 'Add to today',
    editAria: 'edit inventory item',
    editTitle: 'Edit',
    deleteConfirm: 'Delete this task from the inventory?',
    combinePrompt: '{{count}} tasks selected. Combine into one? (Rule 5)',
    combineButton: 'Combine',
    combineConfirm: "Combine {{count}} tasks into one? The originals will be replaced and this can't be undone.",
    emptyState: 'Add your first task above to start building your backlog.',
  },

  today: {
    title: "Today's Tasks",
    newTaskPlaceholder: 'New task...',
    newTaskAria: 'New task',
    estimateLabel: 'Est.',
    estimatePlaceholder: '# pomodoros',
    estimateShortPlaceholder: 'Est.',
    estimateAria: 'Estimate',
    taskNameAria: 'Task name',
    addButton: 'Add',
    saveButton: 'Save',
    cancelButton: 'Cancel',
    moreThanWarning: 'More than {{max}} pomodoros. Break the task into sub-tasks (Rule 4).',
    colTask: 'Task',
    colEstimate: 'Est.',
    colReal: 'Real',
    colDiff: 'Diff',
    emptyState: 'Nothing planned for today. Pick a task from your Inventory or add one directly.',
    unplannedUrgentTitle: 'Unplanned & Urgent',
    unplannedBadgeTitle: 'Unplanned',
    makeActiveAria: 'make active task',
    reestimateAria: 're-estimate task',
    reestimateTitleRunningLong: 'Running long? Click to re-estimate.',
    reestimateTitleAgain: 'Re-estimated: {{from}} → {{to}}{{extra}}. Click to re-estimate again.',
    finishTaskTitle: 'Finish task',
    finishTaskAria: 'finish task',
    editTaskTitle: 'Edit task',
    editTaskAria: 'edit task',
    deleteTaskTitle: 'Delete task',
    deleteTaskAria: 'delete task',
    deleteConfirm: 'Delete this task?',
    alreadyTwoReestimates:
      'This task already has two re-estimates (Diff I and Diff II). The second one is locked in.',
    reestimatePrompt: 'Re-estimate "{{text}}":',
    newEstimateAria: 'New estimate',
    moreThanWarningInline: 'More than {{max}}. Break it up (Rule 4)',
    bulkActionsAria: 'task list actions',
    clearFinishedLabel: 'Clear finished tasks',
    clearFinishedConfirm: "This will permanently remove all finished tasks from today's list. Continue?",
    clearAllLabel: 'Clear all tasks',
    clearAllConfirm:
      "This will permanently remove ALL tasks from today's list, including unfinished ones. This cannot be undone. Continue?",
  },

  availablePomodoros: {
    title: 'Available Pomodoros',
    hoursLabel: 'Hours available today',
    hoursPlaceholder: 'e.g. 6',
    useTimetableButton: 'Use timetable ({{hours}}h)',
    useTimetableTitle: "Fill in from today's timetable blocks",
    pomodorosAvailable: 'Pomodoros available',
    plannedLabel: '{{count}} planned',
    overCapacity: ". Over capacity, trim today's list",
  },

  timetable: {
    title: "Today's timetable",
    startAria: 'Block start time',
    endAria: 'Block end time',
    labelPlaceholder: 'Label (optional)',
    labelAria: 'Block label',
    addButton: 'Add',
    emptyState: 'No time blocks planned yet.',
    removeAria: 'remove block {{start}}-{{end}}',
    nowSuffix: ' (now)',
  },

  unplanned: {
    placeholder: 'Sudden task...',
    aria: 'Sudden task',
    addButton: 'Add',
  },

  categoryPicker: {
    noneSelected: 'No categories',
    noneYet: 'No categories yet',
    addCategory: 'Add category',
  },

  categorySelect: {
    allCategories: 'All categories',
    noCategory: 'No category',
  },

  categoryManager: {
    title: 'Categories',
    newCategoryPlaceholder: 'New category...',
    newCategoryAria: 'New category name',
    categoryNameAria: 'Category name',
    addButton: 'Add',
    saveButton: 'Save',
    cancelButton: 'Cancel',
    editAria: 'edit {{name}}',
    editTitle: 'Edit',
    deleteAria: 'delete {{name}}',
    deleteTitle: 'Delete',
    deleteConfirm: 'Delete category "{{name}}"? Tasks and records using it will show as uncategorized.',
    emptyState: 'No categories yet. Tasks will show as uncategorized.',
    // Guests keep full use of existing categories (assign/edit/delete) —
    // only creating a brand-new one requires an account. See CategoryManager.jsx.
    signUpToCreateHint: 'Creating new categories requires a free account. You can still use, edit, and delete your existing ones.',
  },

  // Seeded once for a brand new account/guest with zero categories ever
  // created (see useCategories.js's DEFAULT_CATEGORY_SEEDS) — plain starter
  // labels, not a fixed/protected set; the user can rename, recolor, or
  // delete any of them like any other category.
  defaultCategories: {
    work: 'Work',
    study: 'Study',
    personal: 'Personal',
    admin: 'Admin',
    health: 'Health',
  },

  categoryColors: {
    teal: 'Teal',
    plum: 'Plum',
    slate: 'Slate',
    moss: 'Moss',
    mustard: 'Mustard',
    rose: 'Rose',
    ochre: 'Ochre',
    indigo: 'Indigo',
  },

  reports: {
    title: 'Reports',
    reviewToday: 'Review today',
    periodToday: 'Today',
    periodWeek: 'This Week',
    periodMonth: 'This Month',
    periodYear: 'This Year',
    noHistoryHint: 'Not enough history yet. Filters will differ as you use the app across more days.',
    noDataForPeriod: 'No data for this period yet.',
    noDataAtAll:
      'Complete a few Pomodoros and finish a task to see your trends here: estimation accuracy, interruption patterns, and where your focus time goes.',
    totalFocusTime: 'Total focus time',
    totalFocusTimeTooltip:
      "Approximation: past Pomodoro count × today's current work-duration setting. If you change your work duration, historical totals shown here shift too. They aren't a literal record of how long each past session actually ran.",
    pomodorosToday: 'Pomodoros today',
    tasksToday: 'Tasks today',
    tasksTodayActiveCaption: '{{active}} active',
    interruptionsToday: 'Interruptions today',
    pausesToday: 'Pauses today',
    todaySummaryTitle: "Today's Summary",
    todaySummarySubtitle: '{{poms}} poms · {{interruptions}} interruptions',
    estimationAccuracyTitle: 'Estimation Accuracy',
    estimationAccuracySubtitle: 'Est. vs. Real',
    overestimated: 'Overestimated (took less)',
    underestimated: 'Underestimated (took longer)',
    diffChartCaption: 'Estimate vs. real, per task ({{count}})',
    avgErrorThisWeek: 'Avg error this week: {{value}}',
    avgErrorLastWeek: 'last week: {{value}}',
    interruptionTrendsTitle: 'Interruption Trends',
    interruptionTrendsSubtitle: 'Internal vs. external',
    avgInterruptionsPerTask: 'avg interruptions per task',
    thisWeek: 'this week: {{value}}',
    lastWeek: 'last week: {{value}}',
    interruptionCount: '{{count}} ({{internal}} int · {{external}} ext)',
    pauseTrendsTitle: 'Pause Trends',
    pauseTrendsSubtitle: 'How often you pause',
    avgPausesPerDay: 'avg pauses per day',
    categoryBreakdownTitle: 'Pomodoros by Category',
    categoryBreakdownSubtitle: 'Time by category',
    pomSuffix: '{{count}} pom.',
    uncategorized: 'Uncategorized',
    longTermTitle: 'Long-Term Heatmap',
    longTermSubtitle: 'Last {{weeks}} weeks',
    stepPrevious: '← Previous',
    stepNext: 'Next →',
    stepIndicator: '{{current}} / {{total}}',
    noChartDataTitle: 'Nothing here yet',
    collapse: '▾ collapse',
    expand: '▸ expand',
    activityCaption: 'Activity (last 13 weeks)',
    pomodorosThisMonth: 'Pomodoros this month',
    pomodorosThisQuarter: 'Pomodoros this quarter',
    avgInterruptionsMonth: 'Avg interruptions/task (month)',
    avgInterruptionsQuarter: 'Avg interruptions/task (quarter)',
    heatmapAriaLabel: 'Daily Pomodoro activity, last 13 weeks',
    heatmapTooltipOne: '{{date}}: {{count}} pomodoro',
    heatmapTooltipOther: '{{date}}: {{count}} pomodoros',
    less: 'Less',
    more: 'More',
    noEstimatedTasks: 'No estimated tasks completed yet.',
    diffChartAriaLabel: 'Estimation diff per task',
    diffTooltip: '{{activity}}: {{diff}}{{reestimated}}',
    diffTooltipReestimated: ' (re-estimated)',
    tookLonger: 'Took longer',
    tookLess: 'Took less',
  },

  dayReview: {
    title: "Today's Review: {{date}}",
    closeAria: 'close review',
    pomodorosCompleted: 'Pomodoros completed',
    interruptions: 'Interruptions ({{internal}} internal · {{external}} external)',
    unplannedTasks: 'Unplanned tasks',
    mostAccurate: 'Most accurate estimate',
    biggestSurprise: 'Biggest surprise',
    tasksFinished: 'Tasks finished today ({{count}})',
    noTasksYet: 'No tasks finished yet today.',
    estimateLabel: 'Est. {{value}}',
    realLabel: 'Real {{value}}',
  },

  recordsLog: {
    title: 'Records Log',
    filterDateAria: 'Filter by date',
    clearFilters: 'Clear filters',
    noRecordsFiltered: 'No records match these filters.',
    noRecordsEmpty: 'Your completed tasks will show up here.',
    activityAria: 'Activity name',
    editAria: 'edit record',
    editTitle: 'Edit',
    deleteAria: 'delete record',
    deleteTitle: 'Delete',
    deleteConfirm: 'Delete this record?',
    estimateLabel: 'Estimate: {{value}}',
    actualLabel: 'Actual: {{value}}',
    diffLabel: 'Diff: {{value}}',
    diffILabel: 'Diff I: {{value}}',
    diffIILabel: 'Diff II: {{value}}',
    voidedPomodorosTitle: 'Voided Pomodoros',
    voidedAt: 'Voided at {{elapsed}} / {{total}}',
    deleteVoidConfirm: 'Delete this void log entry?',
    deleteVoidAria: 'delete void log entry',
    deleteVoidTitle: 'Delete',
  },

  chime: {
    classic: 'Classic',
    soft: 'Soft',
    alert: 'Alert',
  },

  // Contextual methodology hints — see constants.js's COACH_MARKS/
  // pickCoachMark. Several short, self-contained marks per section, each
  // triggered by a specific moment (first visit, first Pomodoro started,
  // first break, etc.) rather than one generic "welcome" per tab. Every
  // single one must make sense to someone who has never heard of the
  // Pomodoro Technique before — no term is used before it's been introduced.
  // Deliberately about the technique itself, never UI mechanics.
  coachMarks: {
    gotIt: 'Got it',
    learnMore: 'Learn more',
    timerIntro: {
      title: "Here's the idea",
      body: 'A Pomodoro is 25 minutes of focused work on one task, followed by a short break. Add a task in the Planning tab, then come back here and press Start to begin your first one.',
    },
    timerFirstStart: {
      title: 'This Pomodoro should run to the end',
      body: "Once started, a Pomodoro is meant to run uninterrupted for the full 25 minutes. There are two deliberate exceptions:\n\n- Pause holds your spot for a brief interruption, like someone knocking on your door. It's this app's own addition, not part of the original technique.\n- Void discards the session entirely, for when the work itself has to stop.",
    },
    timerFirstInterruption: {
      title: 'You just marked an interruption',
      body: "That's the point. You note a distraction instead of acting on it right away. Internal interruptions come from you; external ones come from someone else. Either way, your Pomodoro keeps running, and you'll see these patterns later in Reports.",
    },
    timerFirstBreak: {
      title: 'This is your break',
      body: "A short break after each Pomodoro helps you reset before the next one. Every 4th Pomodoro, you'll get a longer break instead. That's the technique's rhythm for staying sharp across a whole day.",
    },
    planningIntro: {
      title: 'Plan your day here',
      body: "Add tasks to your Inventory, your running backlog of everything you need to do. Then pick what you'll actually work on today and estimate how many Pomodoros (25-minute sessions) each one will take.",
    },
    planningFirstTodayTask: {
      title: 'Why the estimate matters',
      body: "Once a task is in Today's list, you'll be able to see how close your estimate was once you finish it. This app compares what you estimated to what actually happened, and that comparison is what Reports uses to help you plan better over time.",
    },
    reportsIntro: {
      title: 'Your numbers, not a scoreboard',
      body: "Once you've completed some Pomodoros, this tab turns that history into patterns: how accurate your estimates were, what kept interrupting you, and where your focus time actually went.",
    },
    reportsFirstData: {
      title: 'Reading these charts',
      body: '"Overestimated"/"Underestimated" compares your estimate (or your latest re-estimate, if you revised it) to what really happened. Interruption trends show what pulled your attention away. Together, they\'re meant to sharpen tomorrow\'s planning, not just record the past.',
    },
    settingsIntro: {
      title: "The technique's default rhythm",
      body: "The Pomodoro Technique's classic rhythm is 25 minutes of work, a short break, then a longer break every 4th Pomodoro. The durations below control it directly. Changing them is your choice, but it's a deliberate departure from the original method.",
    },
    settingsDataIntro: {
      title: 'Categories help you see patterns',
      body: "Tagging tasks with a category (like Work or Study) lets Reports show you where your focus time actually goes. This becomes especially useful once you're comparing weeks, not just today.",
    },
    motivationIntro: {
      title: 'A small moment, on your terms',
      body: "Tap the card icon any time, whether you're idle, mid-Pomodoro, or on a break, to draw a card for a short quote, joke, fact, or a look at your own stats. One draw per Pomodoro; it resets the next one. Purely optional, and it never touches your running timer.",
    },
  },

  // The optional "deeper learning path" — see MethodologyGuideModal.jsx.
  // Longer and more explanatory than a coach mark, but each topic still has
  // to stand completely on its own for someone who's never read Cirillo's
  // book — paraphrased in this app's own words, like docs/methodology.md.
  methodologyGuide: {
    title: 'How the Pomodoro Technique works',
    closeAria: 'close methodology guide',
    whatIsIt: {
      title: 'What is a Pomodoro?',
      body: 'The Pomodoro Technique is a time-management method created by Francesco Cirillo in the late 1980s. Its name comes from the tomato-shaped kitchen timer he originally used to time his work sessions. ("Pomodoro" is Italian for tomato.)\n\nThe core idea is simple. Instead of working for as long as you can and hoping to stay focused, you work in fixed, uninterrupted blocks called Pomodoros.\n\n## The basic rhythm\n\n- Each Pomodoro is 25 minutes of focused work on a single task.\n- It\'s followed by a short break of a few minutes.\n- After every 4th Pomodoro, you take a longer break instead, usually 15 to 30 minutes, before the cycle starts again.\n\nBecause each block is short and clearly bounded, a Pomodoro feels achievable even when the whole task feels overwhelming. Because the break is built in, you\'re not relying on willpower alone to avoid burning out.',
    },
    rules: {
      title: 'The two core rules',
      body: "A Pomodoro is indivisible. It can't be split or partially counted. You either complete the full 25 minutes, or you don't.\n\nIf something genuinely forces you to stop, like an emergency or an unavoidable meeting, the Pomodoro is void. It's discarded entirely, as if it never started: no credit, no partial record, just an honest reset.\n\nOnce a Pomodoro begins, it's meant to ring in full. If you finish your task early, you don't stop the timer. Instead, you use the remaining time to review or refine what you did. The discipline is in the container, not in rushing to fill it.\n\n## Pause: this app's own exception\n\nThis app adds one deliberate, transparent exception to these rules. Pause is not part of Cirillo's original technique; it's an honest addition here for real-life brief interruptions, like a knock at the door or a two-minute distraction, that don't really deserve a full Void.\n\n- Pause holds your session exactly where it is, with nothing lost.\n- Pressing Start again picks up right where you left off.\n- It's tracked openly, so you can see how often you pause in Reports, keeping it a visible habit rather than a hidden shortcut.",
    },
    sizing: {
      title: 'Sizing your tasks',
      body: "Before you start working, you estimate how many Pomodoros a task will take. Two simple rules keep that estimate realistic.\n\n## If a task is too big\n\nIf a task looks like it'll take more than about 5 to 7 Pomodoros, break it into smaller sub-tasks in your Inventory instead. Big, vague tasks are hard to estimate accurately, and they don't give you the regular sense of progress that keeps you motivated.\n\n## If a task is too small\n\nIf a task will take less than one full Pomodoro, don't run a whole 25-minute block for it. Combine it with other small tasks until together they fill one. This app's Inventory has a \"combine\" feature for exactly this: select two or more small tasks and merge them into a single one, with their estimates summed.",
    },
    interruptions: {
      title: 'Handling interruptions',
      body: "The technique treats interruptions as something to manage, not just something to feel bad about. It splits them into two kinds.\n\n- Internal interruptions come from you: a sudden urge to check something else, a thought unrelated to your current task.\n- External interruptions come from someone or something else: a colleague, a phone call, a notification.\n\nFor both kinds, the response is the same. Don't act on the interruption immediately, and don't just try to ignore it either.\n\n## What to actually do\n\n- Mark it. This app has an internal/external counter for exactly this.\n- Quickly note the distraction down somewhere so you won't lose it.\n- Get back to your current Pomodoro.\n\nFor an external interruption you can't just wave off, the classic approach is a bit more involved: inform the person you're busy, negotiate a specific time to get back to them, write that promised time down immediately so it's off your mind, then actually follow through once your Pomodoro ends.\n\nThe point isn't to never get interrupted. It's to notice how often it happens and keep it from derailing the Pomodoro you're in.",
    },
    estimation: {
      title: 'Estimate vs. Real',
      body: "Every task gets an estimate before you start it: how many Pomodoros you think it'll take. If a task runs long, you can re-estimate it up to twice partway through instead of just letting the original guess go stale.\n\n\"Real\" is how many Pomodoros it actually took, counted automatically each time you complete one on that task. The diff is the difference between real and whichever estimate is most current: your latest re-estimate if you made one, otherwise your original estimate.\n\n- A diff of zero means your estimate was spot-on.\n- A positive diff means the task ran longer than planned (underestimation).\n- A negative diff means it went faster than planned (overestimation).\n\nNeither is a failure by itself. The point of tracking diff over time is noticing your own patterns, so your next estimate is a little more honest than the last one.\n\nThere's a second, subtler kind of error worth watching for: not estimating a known task wrong, but failing to anticipate a task at all, something unplanned that shows up mid-day. This app tracks those separately as \"unplanned\" tasks, since they point to a gap in your planning rather than in your time estimate.",
    },
    reports: {
      title: 'Reading your Reports',
      body: "Cirillo describes five stages to a working day: Planning, Tracking, Recording, Processing, and Visualizing. This app handles the first three automatically as you work. Reports is where the last two happen: Processing, turning raw records into conclusions, and Visualizing, seeing those conclusions clearly.\n\n## What each section asks\n\n- Estimation Accuracy: how close are your estimates to reality, and is that gap shrinking over time?\n- Interruption Trends: what's actually breaking your focus, and how often?\n- Pause Trends: how often are you using this app's Pause feature? Pausing a lot might be worth noticing on its own.\n- Category breakdown: where are your Pomodoros actually going, once you tag tasks with categories?\n\nNone of these numbers are meant to be maximized. A high Pomodoro count isn't automatically good if your estimates are consistently far off. The goal is a process that gets more honest and predictable over time, not a bigger number.",
    },
  },

  settings: {
    title: 'Settings',
    closeAria: 'close settings dialog',
    categoryGeneral: 'General',
    categoryTimer: 'Timer',
    categorySound: 'Sound',
    categoryAccount: 'Account',
    categoryData: 'Data',
    categoryAchievements: 'Achievements',
    categoryAbout: 'About',
    signInPromptLabel: 'Sync your data across devices',
    aboutDescription:
      'A faithful implementation of the Pomodoro Technique: planning, tracking, interruption management, estimation, and recording, all in one place. Not just a timer.',
    aboutContactLabel: 'Contact',
    aboutSourceLabel: 'Source code',
    aboutAttribution:
      'Implements the Pomodoro Technique® as created by Francesco Cirillo. "Pomodoro Technique" and "Pomodoro" as a time management method are associated with Francesco Cirillo; this app avoids using "Pomodoro" in its own name out of respect for active trademark considerations.',
    replayCoachMarks: 'Show onboarding hints again',
    howItWorksButton: 'How the Pomodoro Technique works',
    signedInAs: 'Signed in as {{email}}',
    notSignedIn: 'Not signed in',
    signOutButton: 'Sign out',
    signOutConfirm: 'Are you sure you want to sign out?',
    changePasswordLabel: 'Password',
    changePasswordButton: 'Change Password',
    changePasswordTitle: 'Change Password',
    newPasswordLabel: 'New password',
    changePasswordSuccess: 'Your password has been changed.',
    changePasswordCloseAria: 'close change password dialog',
    longBreakEvery: 'Long break every',
    pomodoroUnit: 'pomodoro',
    resetTitle: 'Reset to default ({{value}})',
    resetButton: 'Reset',
    soundLabel: 'Sound',
    testButton: 'Test',
    themeLabel: 'Theme',
    themeDark: 'Dark',
    themeDarkEspresso: 'Dark Espresso',
    themeDarkSlate: 'Dark Slate',
    themeLightTerracotta: 'Light Terracotta',
    themeLightSage: 'Light Sage',
    themeLightSand: 'Light Sand',
    themeLightDustyBlue: 'Light Dusty Blue',
    themeVividCoral: 'Vivid Coral',
    themeVividCitrus: 'Vivid Citrus',
    themeVividMint: 'Vivid Mint',
    themeTierDark: 'Dark',
    themeTierLightPastel: 'Light Pastel',
    themeTierLightVivid: 'Light Vivid',
    themeRecommendedBadge: 'Recommended',
    themeCustom: 'Custom',
    customThemeGeneralLabel: 'General',
    customThemeFocusLabel: 'Focus / Work session',
    customThemeShortBreakLabel: 'Short Break',
    customThemeLongBreakLabel: 'Long Break',
    customThemeHint: 'General applies to every screen except the Timer, which follows whichever session is active.',
    backgroundLabel: 'Fullscreen background image',
    backgroundHint: 'Only shown in Fullscreen Focus Mode. Not on the Timer, Planning, Reports, or Settings screens.',
    backgroundSignInHint: 'Sign in to unlock this feature',
    backgroundUploadButton: 'Upload image',
    backgroundUploading: 'Uploading…',
    backgroundRemoveButton: 'Remove',
    backgroundErrorType: 'Please choose a JPG, PNG, or WEBP image.',
    backgroundErrorSize: 'Image must be {{max}}MB or smaller.',
    backgroundErrorUpload: 'Something went wrong uploading that image. Please try again.',
    backgroundPresetGalleryHint: 'A curated gallery of ready-made backgrounds (no upload needed) is planned for a future update.',
    workDurationLabel: 'Pomodoro (work) duration',
    workDurationDeviationNote:
      'The Pomodoro Technique specifically uses 25 minutes as the standard work interval. This is a deliberate deviation from the original technique.',
    shortBreakLabel: 'Short break duration',
    longBreakLabel: 'Long break duration',
    minutesUnit: 'min',
    minutesRangeHint: 'Range: {{min}}-{{max}} min',
    shortBreakRecommendedHint: 'Recommended range is 3-5 minutes',
    longBreakRecommendedHint: 'Recommended range is 15-30 minutes',
    autoStartBreaksLabel: 'Auto-start breaks',
    autoStartBreaksHint: 'When a Pomodoro ends, start the break automatically instead of waiting for Start.',
    autoStartPomodorosLabel: 'Auto-start Pomodoros',
    autoStartPomodorosHint: 'When a break ends, start the next Pomodoro automatically instead of waiting for Start.',
    effectsVolumeLabel: 'Sound effects volume',
    ambientVolumeLabel: 'Ambient sound volume',
    testingButton: 'Testing…',
    ambientSoundLabel: 'Ambient sound',
    ambientSoundHint: 'Plays quietly during an active Pomodoro, stopping on pause, void, or completion.',
    ambientNone: 'None',
    ambientTicking: 'Ticking',
    ambientRain: 'Rain',
    ambientCafe: 'Cafe',
    ambientWhiteNoise: 'White Noise',
    checkToBottomLabel: 'Check to bottom',
    checkToBottomHint: "Move a task to the bottom of today's list once it's checked off as done.",
    displayNameLabel: 'Your name',
    displayNameHint: 'Shown in a personalized greeting in the header.',
    displayNamePlaceholder: 'e.g. Alex',
    dailyGoalLabel: 'Daily Pomodoro goal',
    dailyGoalHint: "How many Pomodoros you're aiming for per day. Optional, shown in Reports once set.",
    languageLabel: 'Language',
    languageEnglish: 'English',
    languageTurkish: 'Türkçe',
    dangerZoneTitle: 'Danger Zone',
    dangerZoneWarning: 'These actions permanently delete data and cannot be undone.',
    deleteButton: 'Delete',
    resetFactoryButton: 'Reset to Factory Settings',
    resetFactoryHint: 'Deletes everything, including these settings, and returns the app to its default state.',
    deleteAccountButton: 'Delete Account',
    deleteAccountConfirm:
      'This will PERMANENTLY DELETE your account and all data associated with it from our servers. This cannot be undone. Are you absolutely sure?',
    deleteAccountHint: 'Permanently deletes your account and all its data. You will be signed out and returned to guest mode.',
    deleteAccountError: "Couldn't delete your account. Please try again in a moment.",
    resetRecordsLabel: 'Records / Activity Log',
    resetRecordsConfirm: 'This will permanently delete all your Records. This cannot be undone. Continue?',
    resetTicksLabel: 'Interruption data (ticks)',
    resetTicksConfirm:
      'This will permanently delete all your interruption and Pomodoro tick history (used by Reports). This cannot be undone. Continue?',
    resetTodayLabel: "Today's Tasks",
    resetTodayConfirm:
      "This will permanently delete Today's Tasks and today's Timetable. This cannot be undone. Continue?",
    resetInventoryLabel: 'Activity Inventory',
    resetInventoryConfirm: 'This will permanently delete your Activity Inventory. This cannot be undone. Continue?',
    resetTimerLabel: 'Timer state',
    resetTimerConfirm:
      'This will reset the saved timer state (useful if a Pomodoro looks stuck after a refresh). This cannot be undone. Continue?',
    resetCategoriesLabel: 'Categories',
    resetCategoriesConfirm:
      'This will permanently delete all your Categories. Tasks and records using them will show as uncategorized. This cannot be undone. Continue?',
    resetVoidLogLabel: 'Void log',
    resetVoidLogConfirm:
      'This will permanently delete your Void log (voided Pomodoros and their reasons). This cannot be undone. Continue?',
    resetCardDrawsLabel: 'Card collection',
    resetCardDrawsConfirm:
      'This will permanently delete your Motivational Card draw history (Achievements stats). This cannot be undone. Continue?',
    resetAchievementsLabel: 'Achievements',
    resetAchievementsConfirm:
      'This will permanently delete your unlocked Achievements. Anything you still qualify for will unlock again the next time it re-evaluates. This cannot be undone. Continue?',
    factoryResetConfirm:
      "This will permanently delete EVERYTHING: Activity Inventory, Today's Tasks, Records, interruption history, Categories, the Void log, your Card collection, your unlocked Achievements, AND your settings (cycle length, sound, theme). The app will return to its first-launch state. This cannot be undone. Continue?",
  },

  dataImport: {
    title: 'Import & Export Data',
    jsonExportLabel: 'JSON Export',
    jsonExportDesc: 'Downloads everything: tasks, categories, records, settings. Full backup.',
    csvExportLabel: 'CSV Export',
    csvExportDesc: 'Downloads completed task records only, as a spreadsheet.',
    jsonImportLabel: 'JSON Import',
    jsonImportDesc: 'Restore a full backup. Brings back everything including tasks.',
    csvImportLabel: 'CSV Import',
    csvImportDesc: "Import records only. Won't bring back tasks or categories.",
    exportButton: 'Export',
    chooseFileButton: 'Choose file',
    invalidJsonError: "This file doesn't look like a valid backup. No changes were made.",
    invalidCsvError: "This file doesn't look like a valid Records CSV export. No changes were made.",
    choosePrompt: 'How should this be imported?',
    replaceButton: 'Replace all data',
    mergeButton: 'Merge with existing',
    jsonReplaceConfirm:
      "This will permanently REPLACE all your data (Activity Inventory, Today's Tasks, Records, interruption history, Categories, Void log, AND settings) with the contents of this file. This cannot be undone. Continue?",
    jsonMergeConfirm:
      'This will merge the imported file into your existing data: matching records are kept if newer, and anything only in the file is added. Your current settings are not changed. Continue?',
    csvReplaceConfirm:
      'This will permanently REPLACE your Records / Activity Log with the contents of this CSV file. This cannot be undone. Continue?',
    csvMergeConfirm:
      "This will add records from the CSV that don't already exist (matched by date, time, and activity name). Existing records are not changed. Continue?",
  },

  auth: {
    signInTitle: 'Sign in',
    signUpTitle: 'Create an account',
    closeAria: 'close sign-in dialog',
    googleButton: 'Continue with Google',
    orDivider: 'or',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    confirmPasswordLabel: 'Confirm password',
    passwordMismatch: 'Passwords do not match.',
    showPasswordAria: 'show password',
    hidePasswordAria: 'hide password',
    signInButton: 'Sign in',
    signUpButton: 'Sign up',
    switchToSignUp: "Don't have an account? Sign up",
    switchToSignIn: 'Already have an account? Sign in',
    continueWithoutAccount: 'Continue without an account',
    signUpSuccessMessage: 'Check your email to confirm your account.',
  },

  // A one-time growth nudge for guests (see GuestSignupNudge.jsx) — shown
  // once, the first time a guest starts a Pomodoro. Deliberately not part
  // of the coachMarks namespace: this is a product nudge, not a methodology
  // hint, and never shows once signed in.
  guestNudge: {
    title: 'Get more with an account',
    body: "- Sync your tasks and history across every device\n- Create unlimited categories\n- Custom fullscreen backgrounds",
    dismissAria: 'dismiss account nudge',
  },

  // Sign-in error only — see App.jsx. Signing in no longer merges/migrates
  // local guest data at all, so there's no separate "synced" success notice
  // or merge-confirmation prompt to translate anymore; only "couldn't load
  // your account, here's why we fell back to guest mode" remains.
  account: {
    loadErrorNotice: "Couldn't load your account. Working in guest mode for now.",
    dismissAria: 'dismiss notice',
  },

  // First-time account setup wizard (AccountSetupFlow.jsx) — shown once,
  // right after a brand-new account's first-ever sign-in. A separate
  // mechanism from the coach-mark system: this is about the account/app
  // itself (language, name, theme, a daily goal), not the Pomodoro
  // Technique's methodology.
  accountSetup: {
    stepIndicator: 'Step {{current}} of {{total}}',
    backButton: 'Back',
    continueButton: 'Continue',
    finishButton: 'Finish',
    skipStepButton: 'Skip this step',
    skipButton: 'Skip setup entirely',
    welcome: {
      title: 'Your account is ready',
      body: "Let's quickly set a few preferences. Every step is optional, and you can change any of this later in Settings.",
      dataNote:
        "Any local data from browsing as a guest isn't moved into this account automatically. To bring it over, use Export/Import in Settings > Data anytime.",
    },
    // 'guestIntro' variant only — shown to a first-time guest, before any
    // account exists, so the copy can't reference "your account" yet.
    welcomeGuest: {
      title: 'Where should we start?',
      body: "Let's quickly set a few preferences. Every step is optional, and you can change any of this later in Settings.",
    },
    language: {
      title: 'Choose your language',
    },
    name: {
      title: 'What should we call you?',
    },
    theme: {
      title: 'Pick a look',
    },
    goal: {
      title: 'Set a daily Pomodoro goal',
      body: "How many Pomodoros are you aiming for per day? This is entirely optional and just for your own reference.",
      placeholder: 'e.g. 8',
    },
    // 'guestIntro' variant's closing step — the pitch to create an account,
    // plus the two outcomes (see App.jsx's onRequestSignUp/onContinueAsGuest).
    signup: {
      title: 'Create a free account to unlock more',
      body: 'Custom categories for your tasks, motivation cards, achievements, and streaks are all free with an account — and everything you just picked here comes with you.',
      createAccountButton: 'Create free account',
      continueLocallyButton: 'Continue with local storage',
    },
  },
}
