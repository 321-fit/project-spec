# 321Fit Design System — Architecture Overview

> Status: Canonical reference (updated post-Phase 2)
> Last updated: 2026-04-24
> Related:
> - Token source: [design-tokens/tokens/*.json](../../design-tokens/tokens/)
> - Component inventory: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> - Prototype library: [prototypes/lib/fit-ui.css](../prototypes/lib/fit-ui.css)
> - Canonical scales: memory `feedback_spacing_typography`

This document describes the **architecture** of the 321Fit design system — how tokens, components, and prototype fit together, how they flow to iOS/Android/web, and the cross-cutting rules that govern visual decisions. It is the orientation point for anyone (dev, designer, PM) asking "how does our design system work?".

It is NOT a per-component API reference (that lives in `design-tokens/docs/components.md`) or a per-module spec (those live in `specs/`).

---

## Pipeline

```
prototypes/            ← canonical source of UX decisions (battle-tested)
    │
    ├──▶ tokens/*.json  ← hand-edited. Values pulled from prototype reality.
    │        │
    │        ▼ npm run build (Style Dictionary)
    │        │
    │        ├── design-tokens/Sources/FitUI/Tokens/Generated/*.swift  (committed)
    │        ├── design-tokens/android/src/main/res/values/*.xml       (committed)
    │        └── design-tokens/build/css/tokens.css                   (copied → prototypes/lib/)
    │
    ├──▶ design-tokens/Sources/FitUI/Components/        ← SwiftUI library
    └──▶ design-tokens/android/src/main/kotlin/…/components/ ← Compose library

Consumers:
    iOS app     →  SwiftPM: `.package(url: "https://github.com/321-fit/design-tokens", from: "1.0.0")`
    Android app →  Gradle:  includeBuild(":android") or Maven publish
    Web prototype → imports build/css/tokens.css, uses fit-ui.css on top
```

**Prototype is canonical.** Figma is reference/exploration space; not part of the pipeline. When Figma disagrees with prototype, prototype wins. See memory `feedback_pipeline_principle`.

---

## Canonical scales (post Phase 2)

### Typography

Font: **Rubik** (Google Fonts).

| Style | Size | Weight | Line height | Apple HIG analogue |
|---|---|---|---|---|
| Headline | 28 | 600 | 1.2 | Title 1+ |
| Heading 1 | 24 | 600 | 1.2 | Title 1 |
| Heading 2 | 22 | 600 | 1.25 | Title 2 |
| Heading 3 | 20 | 500 | 1.3 | Title 3 |
| Nav title | **17** | 600 | 1.3 | Headline (inline nav bar) |
| Button 1 | 18 | 500 | 1.3 | Headline |
| Button 2 | 16 | 500 | 1.35 | Callout |
| Body 1 | 16 | 400 | 1.35 | Callout |
| Body 2 | 14 | 400 | 1.4 | Subheadline |
| Footnote | **13** | 400 | 1.4 | Footnote |
| Caption | 12 | 400 | 1.4 | Caption 1 |
| Caption micro | 10 | 500 | 1.2 | Caption 2- (letter-spacing 0.5) |
| Pill | **11** | 500 | 1.2 | Caption 2 |

**Odd-size exceptions** (documented in memory):
1. 17 — nav title (Apple Headline inline-bar convention)
2. 11 — event pills, payment badges, share-sheet icon captions
3. 13 — footnote (formalized from 36+ prototype uses)
4. (10 allowed as "micro" for labels)

All other odd sizes (15, 19, 23) are forbidden. To add an exception, cite Apple HIG / Material Design / established DS (Tailwind, IBM Carbon) + discuss.

### Spacing

Extended Tailwind half-step scale:

```
0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48
```

| Tier | Values | When |
|---|---|---|
| Integer core | 4 · 8 · 12 · 16 · 20 · 24 · 28 · 32 · 40 · 48 | Layout — screen padding, section gaps, card spacing |
| Half-step | 2 · 6 · 10 · 14 · 18 | Component internals — pill padding, chip gaps, micro adjustments |

Both tiers are canonical. Half-steps aren't "drift" — they're legitimate component-level granularity (Tailwind / IBM Carbon use the same pattern).

Token name convention: `--fit-sp-4 = 16px`, `--fit-sp-1_5 = 6px` (underscore for half-step).

### Border radius

| Value-named | Semantic alias | When |
|---|---|---|
| `--fit-radius-4` | xs | Chip, tiny badge |
| `--fit-radius-6` | — | Small badge, input inner |
| `--fit-radius-8` | sm | Small button, tag |
| `--fit-radius-10` | — | Rounded-rect icon (avatar substitute) |
| `--fit-radius-12` | md | Card compact |
| `--fit-radius-14` | — | Card standard |
| `--fit-radius-16` | lg | Card large, sheet inner |
| `--fit-radius-20` | — | Sheet top corners |
| `--fit-radius-28` | — | Extended FAB (Material 3), large container |
| `--fit-radius-full` | — | Pill buttons, avatar circles (9999) |

### Avatar sizes (semantic)

| Token | Px | Usage |
|---|---|---|
| `--fit-avatar-xs` | 24 | Inline chip |
| `--fit-avatar-sm` | 32 | Compact list |
| `--fit-avatar-md` | 40 | Standard list |
| `--fit-avatar-lg` | 48 | Event sheet, card |
| `--fit-avatar-xl` | 80 | Profile hero |

### Component heights

| Token | Px | Usage |
|---|---|---|
| `--fit-height-tap-min` | 44 | iOS HIG minimum tap target |
| `--fit-height-btn-sm` | 40 | Compact button |
| `--fit-height-btn-md` | 44 | Card-level CTA |
| `--fit-height-btn-lg` | 50 | Footer primary CTA (Apple HIG reduction from 56) |
| `--fit-height-icon-btn` | 32 | Header icon button |

### Animation

| Duration | Value | Usage |
|---|---|---|
| instant | 120 ms | Context menu pop-in, tiny feedback |
| fast | 150 ms | Hover, button press |
| base | 200 ms | Fade, slide, tap scale |
| medium | 250 ms | Sheet slide-up, dialog |
| slow | 300 ms | Progress fill, expand / collapse |
| spinner | 800 ms | Loading spinner rotation |
| shimmer | 1400 ms | Skeleton pulse |

Easings: `linear` (constant motion), `out` (enter animations), `in` (exit), `inOut` (symmetrical), `standard` (CSS default).

### Elevation (shadow tokens)

| Level | Usage | Dark example | Light example |
|---|---|---|---|
| 0 | Flat — no elevation | `none` | `none` |
| 1 | Touch card, minimal | `0 0 8px rgba(0,0,0,0.05)` | same |
| 2 | Card shadow | `0 0 12px rgba(0,0,0,0.07)` | same |
| 3 | Popover, inline float | `0 4px 16px rgba(0,0,0,0.3)` | `0 4px 16px rgba(0,0,0,0.12)` |
| 4 | Context menu, dropdown | `0 4px 20px rgba(0,0,0,0.35)` | `0 4px 20px rgba(0,0,0,0.12)` |
| 5 | Modal, bottom sheet | `0 8px 24px rgba(0,0,0,0.4)` | `0 0 24px rgba(0,0,0,0.15)` |

---

## Destructive button — 4-tier severity system

Documented in memory `feedback_destructive_actions`. Canonical location for the rule.

**User must sense risk visually before reading the label.** Pick tier by impact, not by "it's a red button".

| Tier | Class (CSS) | Component prop | Visual | Use when | Examples |
|---|---|---|---|---|---|
| **High** (filled) | `.fit-btn-destructive--high` | `FitButtonStyle.DestructiveHigh` | Solid red bg, white text | Irreversible data loss | Delete training template, Delete account, Remove recurring series forever |
| **Medium** (tinted, default) | `.fit-btn-destructive` | `FitButtonStyle.Destructive` | `rgba(240,92,91,0.15)` bg + red text | Cancel with impact on another user | Cancel confirmed session (Planned), Decline incoming request, Archive client, Remove participant |
| **Low** (outlined) | `.fit-btn-destructive--low` | `FitButtonStyle.DestructiveLow` | Transparent bg, red border, red text | Roll back your OWN pending action, other side not committed | Cancel outgoing request (Awaiting), Mark session missed |
| **Minimal** (text-only) | `.fit-btn-destructive--minimal` | `FitButtonStyle.DestructiveMinimal` | Transparent, red text only | Secondary "Cancel" in confirm dialogs where primary IS destructive | "Cancel" in "Delete account?" alert |

### Icon destructive (trash icon in header)

Separate pattern from labeled buttons. Placement rule: **trash icon in top-right of header** as `fit-icon-btn` with subtle red tint:

```css
background: rgba(240,92,91,0.10);
color: var(--fit-red-400);
```

Tap → confirmation sheet with tier-appropriate button (usually Medium or High).

---

## Color semantics

### Palette (canonical)

Neutral gray scale + 4 branded colors + 1 external namespace.

- Gray 50 … 900 + white + black
- Blue 300 … 700 (primary brand = `--fit-blue-500`)
- Teal 200 … 600 (secondary brand = `--fit-teal-500`)
- Red 50, 400, 700, 900 (destructive = `--fit-red-400`)
- Yellow 50, 400, 600, 900 (warning)
- Green 50, 400, 500, 900 (success)
- **External** (OAuth / partner brands — isolated, NOT themed): Google blue/red/yellow/green, Apple system red/orange/indigo, WhatsApp green, Zoom blue, Stripe purple, Telegram blue

### Brand gradients

- `--fit-gradient-brand-135` — primary CTAs (135°)
- `--fit-gradient-brand-horizontal` — button fills (left→right)
- `--fit-gradient-selection-overlay` — active state overlays (sidebar active, selected chips, selected calendar rows)

### Semantic colors (theme-aware)

Text primary / secondary / tertiary / placeholder / disabled / on-brand, plus divider, focus border, error border, selection border. Mapped per theme (dark / light) via `.fit-dark` / `.fit-light` class on root phone container.

Generated CSS exposes theme-qualified tokens (`--fit-color-text-primary-dark`); prototype's fit-ui.css declares theme-scoped semantic aliases that point to the right variant per theme class.

---

## Native theming contract

How the design system flows into iOS (SwiftUI) and Android (Compose) screens. **This is the canonical rule for native code** — every native-bound spec links here under Platform notes.

### Required

- **Wrap screens in the FitUI theme provider** at the root composable / view:
  - SwiftUI: `FitTheme(.dark) { … }` (or `.light`) — provides `@Environment(\.fitTheme)`
  - Compose: `FitTheme(isDark = isDark) { … }` — provides `LocalFitTheme.current`
- **Read all colors via the theme**, not via Material / system defaults:
  - SwiftUI: `theme.surfaceDefault`, `theme.textPrimary`, `theme.divider`, `theme.bgErrorTinted`, etc.
  - Compose: `LocalFitTheme.current.surfaceDefault`, etc.
- **Use FitUI components** (`FitCard`, `FitNavbar`, `FitButton`, `FitHeader`, `FitSheet`, `FitInput`, `FitSelectRow`, `FitToast`, …) instead of bare `Card` / `NavigationBar` / `Button` / `BottomSheet` from Material / UIKit.
- **Use FitUI primitives** for every dimension that has a token: `FitSpacing.sp4`, `FitRadius.card`, `FitFont.body1`, `FitSize.tapMin`. No raw `dp` / `pt` literals where a token exists.
- **Theme is a user preference.** A single `isDark` switch per device, persisted, applies to both Coach and Athlete identically. Never derive theme from role (`isCoach`) or from a stale Compose `MaterialTheme`.
- **For tinted backgrounds use `bg.<status>-subtle` / `bg.<status>-tinted` tokens** — never compose tints inline (`.opacity(N)` / `.copy(alpha = N)` over a base color). Alpha that reads on white differs from alpha that reads on dark; tokens carry per-theme opacities. Memory: `feedback_native_theme_tokens`.
- **Respect device safe areas.** Screen content must not slide under the status bar / Dynamic Island / home indicator. Default-on; opt out only for explicitly full-bleed backgrounds, and even then keep foreground content (header, scrollable, footer CTA) inside the safe area.
  - SwiftUI: do **not** apply `.ignoresSafeArea(.top)` on the screen root; either let the default safe-area handling take over, or use `.ignoresSafeArea(.container, edges: .top)` *only* on a background layer with foreground content layered above. For full-bleed visuals use `safeAreaInset(edge: .top) { … }`.
  - Compose: wrap the screen root in `Modifier.systemBarsPadding()` (or `Modifier.statusBarsPadding()` + `Modifier.navigationBarsPadding()`); avoid `WindowCompat.setDecorFitsSystemWindows(window, false)` without compensating insets in the host.
  - The header (`FitHeader`) sits below the status bar at all times. The bottom `FitNavbar` floats above the home-indicator area with `safeAreaInset(.bottom)` / `Modifier.navigationBarsPadding()`.

### Forbidden in new screens (anti-patterns)

| ❌ Don't | ✅ Do |
|---|---|
| `Color(0xFF1F2123)` / `Color.Black` / `Color.White` literals | `LocalFitTheme.current.screenBg` / `theme.textPrimary` |
| `Color(red:0.1,green:…)` / `Color(hex:"#1F2123")` in SwiftUI | `theme.screenBg` from `FitTheme` |
| `MaterialTheme.colorScheme.background` in screens | `LocalFitTheme.current.surfaceDefault` |
| Custom `darkColorScheme(...)` / `lightColorScheme(...)` parallel themes | One `FitTheme` provider; never declare a parallel `ColorScheme` |
| `if (isCoach) DarkScheme else LightScheme` | `FitTheme(isDark = userPrefersDark)` — role-agnostic |
| `Color.Red.copy(alpha = 0.12f)` / `.opacity(0.18)` over base color | `theme.bgErrorSubtle` / `theme.bgErrorTinted` (per-theme alphas) |
| `Card { … }` / `NavigationBar { … }` / `Button { … }` (bare Material) | `FitCard { … }` / `FitNavbar(...)` / `FitButton(...)` |
| `8.dp` / `16.dp` / `12.pt` literals on layout | `FitSpacing.sp2` / `sp4` / `sp3` |
| Hardcoded `RoundedCornerShape(16.dp)` for cards | `RoundedCornerShape(FitRadius.card)` |
| Local `enum Theme { Coach, Athlete }` shadow systems | Read theme from `FitTheme` only |

### Missing component? Add it upstream

If a needed pattern is not in `design-tokens/docs/components.md`, the order is:

1. Spec the component in `design-tokens/docs/components.md` (purpose, props, states, dark/light, iOS/Android/Web notes).
2. Build the SwiftUI version in `Sources/FitUI/Components/<Name>.swift`.
3. Build the Compose mirror in `android/src/main/kotlin/.../components/<file>.kt`.
4. Add the CSS class in `project-spec/prototypes/lib/fit-ui.css` (e.g. `.fit-<name>` with `--<variant>` modifiers consuming the `tokens.css` variables).
5. Reference tokens — never hardcode dimensions or colors.
6. **Then** consume in app screens / prototypes.

This applies equally to **decorative elements** that often live in CSS-only on the prototype (icon plates, accent dots, custom dividers, status badges, leading-icon containers). They are real components — spec them, mirror across all four artifacts, give them a name. Inlining a parallel implementation in `321fit_ios` / `321fit_android_new` is a memory-anti-pattern (see `feedback_no_parallel_theme`) — fix the library, not the screen.

**For architect agents (`/ios-architect impl-doc`, `/android-architect impl-doc`):** when reading the prototype CSS, every recurring decorative class is a candidate component. Don't paper over it with inline styling instructions in §6 UI mapping — propose the kit component first, spec it, then reference it from the impl-doc.

### Pending component extractions (tech debt)

Some recurring prototype patterns are still **inline-styled per file** instead of shared CSS classes / FitUI components — so copies **drift** (different gradients, fonts, metrics, missing affordances) when reused in another flow. Extract these to `fit-ui.css` (+ FitUI mirrors) during design-system formalization. Until then, when reusing them, **copy the exact markup + metrics from the source file — do not re-approximate.**

- **Unified Inbox tabs** — the 3-way segmented tab row (Activity / To reply / Waiting) in `coach/dashboard.html#s-notifications` is inline-styled (wrapper `surface-high` `padding:3px` `radius:10px`; buttons `8px/radius:8px/13px/500`; active = `--fit-brand-gradient`; `(N)` count span). Surfaced 2026-06-11 when the self-paced Inbox mock diverged. → a `.fit-segmented-tabs` component.
- **`.req-card`** — the inbox request-card shell (44px neutral avatar + name + sub + chevron · title · meta · action row) is inline-styled in `coach/dashboard.html`. Reused ad-hoc by self-paced (`.spq` lookalike). → a `FitRequestCard` / `.fit-request-card` component.
- ✅ **Transaction ledger — DONE (2026-06-17).** The coach Earnings ledger (`.earn-txn*`) and athlete Balance ledger (`.bal-txn*`) were duplicate copies; extracted to canonical **`.fit-txn*`** (rows + intent icon/amt modifiers `--in/--out/--info/--danger` / `--plus/--minus`), **`.fit-filter-chip`** + **`.fit-filter-row`**, **`.fit-kv*`** + **`.fit-detail-hero`** in `fit-ui.css`. Both `coach/balance.html` and `athlete/balance.html` migrated; coach's internal `earn-filter` vs `earn-filter-chip` dupe resolved (one tint-active chip, works in both themes). Empty/section/summary also moved to existing kit (`.fit-empty-state` / `.fit-section-title--md` / `.fit-stat-strip`).

### Greenfield isolation — new modules go in new files

Phase 4 modules are **not migrations** of legacy screens. Each module ships as **net-new files in a new namespace**, sitting next to the legacy version, not on top of it. The legacy screen keeps working until the redesign cuts over wholesale.

**Rule:**

- New iOS screen for module `Foo` lives in **its own folder** under the relevant tab — e.g. `TabBar/Tabs/Dashboard/V2/…` or `Foo/V2/…`. Type names take a `V2` / `New` suffix when they collide (`DashboardV2View`, `DashboardV2ViewModel`).
- New Android screen lives in **its own package** — e.g. `ui/screens/coach_dashboard_v2/…`. File names take the same `V2` / `New` suffix where collisions exist (`CoachDashboardV2Screen.kt`).
- Legacy file is **not touched** — not for refactors, not for "while we're here" tweaks, not for opportunistic style fixes. If it has a real bug, fix the bug in legacy as a separate task.
- Legacy → new switch happens at the **navigation / Coordinator layer** (route the tab / coordinator at the V2 entry point), not by editing the legacy view.
- When all screens for a feature are V2 and the legacy is unreachable, a discrete cleanup task removes the legacy files. Until then the two coexist.

**Why:** mixing legacy and FitUI in the same file means one screen ends up with both `Color(0xFF…)` and `theme.surfaceDefault`, both `Card()` and `FitCard`, both role-gated and user-pref theme — i.e. the worst of both worlds, harder to review and harder to delete later. Greenfield isolation keeps the diff tight, the review obvious, and the legacy removal trivial.

**For agents (`/ios-develop`, `/android-develop`):** when the file map mentions an existing screen, **add a new file beside it; do not modify the existing one.** This rule supersedes any "modify existing X" instruction inherited from older skill docs.

### Coexistence patterns (V2 next to legacy)

Five patterns govern how V2 modules ship next to a still-running legacy version. Apply them on every Phase 4 module, not just dashboard.

**1. V2-default with reverse legacy flag.**
Each module defines a `<module>LegacyEnabled: Bool` (default `false`) in `EnvironmentConfig`. Default is V2. Flipping the flag (debug menu / xcconfig override) routes the tab back to the legacy screen. The flag is a safety-net for QA side-by-side, not a long-lived feature switch.

**2. Transitional bridging — V2 may push into legacy screens.**
When a V2 module references a destination that does not yet have a V2 (e.g. dashboard V2 has no Earnings V2 screen), the Effect/Coordinator pushes to the **existing legacy screen** instead. The V2 module is not modified to follow the legacy code; it just routes there. When the destination ships in V2, the Effect's destination changes — the ViewModel surface stays the same.

**3. Per-module deeplink handler — no central router yet.**
Each V2 module owns a `<Module>V2DeeplinkHandler` (new file in its V2 namespace) that subscribes to the existing `AppFlowManager` event bus / Combine subjects. **Do not modify `AppFlowManager` itself** to add module-specific routing. Once all top modules are V2, a future task extracts a unified `DeeplinkRouter` — until then, per-module is fine.

**4. V2 lives inside existing top-level navigation routes.**
Do **not** add new cases to `MainFlow` / top-level navigation enums. V2 is a detail of "what `.tab(.dashboard)` resolves to", chosen at the AppCoordinator / TabBar layer. Top-level navigation graph is untouched.

**5. Mock flag via extension in new file.**
Per-module mock toggles (`MOCK_DASHBOARD`, `MOCK_CLIENTS`, …) live in xcconfig keys (Dev / Prod / additional config files) **plus** an extension in a new file at the env-config path:

- iOS: `Core/EnvironmentConfig/EnvironmentConfig+MockFlags.swift` (extension, not modification of `EnvironmentConfig.swift`)
- Android: `app/src/main/java/com/threetwoonefit/core/config/MockFlags.kt` (or similar — new file in same package, not modifying existing config classes)

Adding xcconfig / `.gradle.properties` keys is config-infrastructure, not a "modification of legacy code", and is the only acceptable seam between V2 modules and config plumbing.

### Why these rules exist

This contract exists because Phase 4 dashboard pilot on Android shipped with hardcoded `#242424` / role-gated theme / bare `Card()` calls — the design-tokens module was technically present but the app had a parallel `NewTheme.kt` that bypassed it entirely. Result: the implementation visually diverged from the prototype (no fills, wrong navbar gradient, wrong tab content), and the gap was architectural, not stylistic. New code is written against this contract from day one.

---

## Sheet layout rules

Canonical per memory `feedback_sheet_rules`:

| Element | Value |
|---|---|
| Handle → first content | 16 (via sheet padding-top 8 + handle margin-bottom 16) |
| Between major blocks (status header / avatar / info / footer) | 28 |
| Between info rows | 12 |
| Side padding | 16 |
| Bottom padding (safe area) | 40 standard / 28 compact |

Status header is a **standalone top row** (descriptor + optional pill). Avatar row has **no subtitle** (status lives in header).

---

## Empty, loading, error states

Per memories `feedback_empty_states`, `feedback_loading_states`, `feedback_error_states`.

### Empty

Always: illustration + title (16pt 500, text-secondary) + subtitle (14pt text-tertiary) + optional CTA (primary button, `sm` size).

### Loading

- List screens → skeleton with shimmer (FitSkeleton family)
- Single-element empty first fetch → centered spinner
- Button submit → inline dot spinner inside button

### Error

4 patterns:
1. **Inline banner** (blocking error in a form or screen body) — red-tinted bg, icon + message + optional retry button
2. **Toast** (top-anchored async success/failure) — 3s auto-dismiss
3. **Snackbar** (bottom pill, validation + side-effect) — 4s auto-dismiss, optional Undo action
4. **Modal** (destructive confirmation only) — blocks UI, explicit action required

---

## Navbar visibility rule

Per memory `feedback_navbar_visibility`:

> Tab bar (FitNavbar) renders ONLY on 5 root tab screens. Nested / pushed / modal screens must NOT have the tab bar.

Five root tabs: **Dashboard, Clients, Calendar, Messages (TBD), Settings** (Profile).

Everything else (event detail sheet, invite flow, balance, account access, etc.) is a push / modal and must NOT render the tab bar.

---

## Header patterns

Per memory `feedback_header_actions`:

- **Left:** back button only (chevron) on push screens; nothing on root tabs.
- **Right:** 1 icon norm, 2 OK, 3+ always in `⋯` (context menu).
- **Title:** centered (absolute), 17pt semibold (Apple Headline token).
- **Back vs. close:** chevron = push navigation; `×` = dismiss modal/sheet.

---

## Copy standards

Per memory `feedback_copy_standards`:

- Sentence case everywhere ("Pending requests" not "Pending Requests")
- Verb CTAs ("Connect Stripe", "Mark complete", "Book training")
- Date format: "Tue, Apr 10 · 10:00"
- Currency: `€25`, `€25.50` (Euro symbol prefix, no trailing currency code)
- Explicit plurals ("1 pending request", "3 pending requests")
- No blame tone (never "you failed to …", "your mistake …")

Documented exceptions: proper nouns stay as-is (Apple Calendar, Google Calendar, Stripe, training-template names like "Yoga Morning Flow").

---

## Meta-rule: exceptions are allowed when…

Rules exist to prevent drift, but thoughtful exceptions grounded in real-world practice are better than force-fitting values that look wrong in context.

Exceptions are allowed when **ALL** conditions are met:

1. Backed by Apple HIG, Material Design, or an established industry DS (Tailwind, IBM Carbon, Adobe Spectrum) — cite the source
2. Documented in memory (e.g., `feedback_spacing_typography` odd-size exceptions list)
3. Discussed and approved (not self-introduced)
4. Used consistently across similar contexts (not a one-off)

Examples of exceptions that passed this bar:
- 17pt nav title (Apple HIG)
- 11pt event pills / payment badges / share-sheet captions (iOS share sheet pattern)
- 13pt footnote (Apple HIG Footnote style)
- External OAuth colors (Google blue #4285F4 etc. — brand legal requirement, kept in `external` palette namespace, never themed)

Future exception proposals: tag with owner + reasoning + citation; land the decision in memory before applying.

---

## Accessibility baselines

- **Tap targets:** 44pt minimum (iOS HIG). Matches `--fit-height-tap-min`.
- **Contrast:** text-primary vs. background ≥ WCAG AA (4.5:1 body, 3:1 large).
- **Dynamic Type:** text scales within reason. Cap at Accessibility 3 (per iOS HIG guidance) to prevent layout breakage.
- **VoiceOver / TalkBack:** all actionable elements must have accessibility labels. Decorative icons → `.accessibility(hidden: true)`.
- **prefers-reduced-motion:** respect — disable non-essential animations (slide, bounce). Keep opacity fade.
- **Keyboard navigation (iOS iPad / Android tablet):** supported at native-component level; verify during QA per module.

---

## How this doc is maintained

- **Not per-module** — this is the cross-cutting reference. Per-module specs live in `specs/`.
- **Changes land when scales or rules change.** Small rule additions can be a PR; big restructures need discussion.
- **Sync with memory:** source of truth for rules is `~/.claude/.../memory/feedback_*.md`. When memory rule changes, this doc updates. If this doc is modified without memory, memory wins (revert).

---

## Related specs / references

- Per-component API: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
- Token JSON source: [design-tokens/tokens/](../../design-tokens/tokens/)
- Prototype library: [prototypes/lib/fit-ui.css](../prototypes/lib/fit-ui.css)
- Memory: `feedback_spacing_typography`, `feedback_destructive_actions`, `feedback_sheet_rules`, `feedback_empty_states`, `feedback_loading_states`, `feedback_error_states`, `feedback_navbar_visibility`, `feedback_header_actions`, `feedback_copy_standards`, `feedback_animation_tokens`, `feedback_pipeline_principle`, `feedback_icon_system`, `feedback_card_styling`, `feedback_light_theme_rules`, `feedback_hig_compliance`, `feedback_haptic_feedback`, `feedback_character_counter`, `feedback_note_block`, `feedback_selection_chips`, `feedback_footer_patterns`, `feedback_screen_vs_sheet_vs_toast`, `feedback_back_vs_close`, `feedback_context_menu_pattern`
- Related spec: every `specs/*.md` references components + tokens from here
