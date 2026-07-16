# Progress

Ongoing source of truth for where this project stands. Update incrementally as work lands — check off items as they're verified working, add new items under the right phase rather than letting this drift out of sync with the codebase.

---

## Completed

- [x] Core Pomodoro timer — circular SVG countdown, absolute `endAt`-timestamp-based (not per-tick decrement, so it survives throttled/backgrounded tabs and reloads), Pause/Resume, Void with an optional reason logged to a daily journal
- [x] Fullscreen Focus Mode — auto-hiding chrome (mouse-idle timeout), custom uploaded backgrounds (signed-in only), Picture-in-Picture mini timer, sudden/unplanned task capture available inside fullscreen
- [x] Planning tab — Today's Tasks, Inventory, Available Pomodoros, Timetable, multi-category tagging via `CategoryTagPicker`
- [x] Reports tab — sidebar+stepper navigation across **6** sections (Today's Summary, Estimation Accuracy, Interruption Trends, Pause Trends, Pomodoros by Category, Long-Term Heatmap), plus Records Log and per-day Review
- [x] Dual-provider storage architecture — guest/localStorage and signed-in/Supabase, single access point (`storage.js`), swappable `activeProvider`
- [x] Full i18n — Turkish/English, `en.js`/`tr.js` dictionaries
- [x] Theme system — Dark + 4 light variants (Terracotta, Sage, Sand, Dusty Blue) + Custom (independent per-session-type colors)
- [x] Ambient sounds — Web Audio API, fully synthesized (no audio files), available with no account requirement
- [x] Auth — Google OAuth + email/password; automatic local-to-cloud sync deliberately removed in favor of manual JSON/CSV export-import (Settings > Data)
- [x] Account setup wizard — 5-step skippable flow (welcome, language, name, theme, goal), shown only on a true first-ever sign-up
- [x] Contextual coach-mark onboarding system + `MethodologyGuideModal` deep-dive
- [x] Guest signup nudge
- [x] Category creation gated to signed-in accounts (guests keep full use of existing categories)
- [x] Motivation card feature — pixel-art tomato character, round mystical table, 6 categories (5 weighted + Rare at a 2% independent roll), card-draw history persistence, Settings > Achievements stats view (`CardCollectionStats`) — **content is placeholder, being written by the project owner**
- [x] AGENTS.md as primary signal-dense context file
- [x] Security hardening pass — CSV/formula-injection fix, password `minLength` raised to 8, CSP added to `index.html`, defense-in-depth query scoping (`remoteProvider.js` deletes)
- [x] Performance optimization pass — parallelized sign-in table fetches, `React.memo` on non-ticking panels, lazy-loaded `SettingsModal`/`MotivationOverlay`, per-item collection writes (`stampUpdated` + diffed upserts instead of rewriting whole collections), deduplicated `CategoryTag`/`Dot` components

---

## Short-term (next up — no strict priority order, any sequence or in parallel)

- [ ] Full Achievements system: real badge/achievement logic (not just draw statistics) — a meaningful set tied to actual usage (e.g. first Rare card, category collector, streak milestones, total Pomodoros)
- [ ] Real streak system: freeze/grace mechanic, milestone-only celebrations (7/30/100 days), streak animations — replacing the current `alert('coming soon')` stub in the header
- [ ] Fully integrate and finish the motivation card feature end-to-end: replace all placeholder content with real, finished copy; confirm all 6 categories (including Personal Stat Card's real-data templates and the Rare card) are complete and polished
- [ ] Reports tab: deeper, more detailed, visually improved — open-ended redesign/expansion, specifics TBD
- [ ] Planning tab: usability/design improvements — open-ended redesign, specifics TBD
- [ ] General stabilization pass across the whole app: minimize bugs, maximize performance, before moving to versioned releases

---

## Milestone: move to semantic versioning

*Not started — will be explicitly kicked off later, once the short-term phase above is solid. Noted here as a future milestone, not an active task.*

- [ ] Adopt a version-numbered release model (e.g. 0.1, 0.11, etc.); app name TBD
- [ ] From that point forward, build new features in a way that's compatible with and doesn't break the established versioning system
- [ ] Possible content idea under consideration (not committed): a development log / "building in public" content series about the app's development — status: idea stage only

---

## Mid-term

- [ ] Expanded social/profile features: send motivation to friends, friend streaks, possible leaderboards (builds on the previously-deferred friends/groups/presence system, now with more specific mechanics)
- [ ] Gamification layer exploration: possible story-driven RPG element, or alternatively a lightweight "school life simulation" concept (Pomodoros completed improve in-fiction grades/popularity/stats) — direction not yet decided between these or other concepts, still in ideation
- [ ] Mobile packaging: Android first, then Apple/iOS, including platform-specific testing phases for each
- [ ] General app mascot / visual identity decision (separate from the motivation card's tomato character)
- [ ] Preset background gallery
- [ ] Component test coverage review

---

## Long-term

- [ ] Public app store releases (Android/Apple)
- [ ] AI API integration within the app itself (beyond development tooling — an in-product AI feature)
- [ ] Payment system integration
- [ ] Desktop apps for Mac, Windows, and Linux
- [ ] Much larger and more detailed game/ecosystem system, building on the mid-term gamification exploration
- [ ] Additional language support beyond Turkish/English
- [ ] Real-time multi-device sync
- [ ] Book notes feature
