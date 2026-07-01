# Prototype & Component Index

> **Read this BEFORE building or editing any screen.** This is the "grep one place" map so we
> reuse what exists instead of reinventing it. Pair with `feedback_reuse_canon_first`,
> `feedback_clone_dont_author_prototype`, and `design-tokens/docs/components.md` (native spec).
>
> **Hard rule:** a new screen = `cp` the closest file below, then replace ONLY the in-phone content.
> A new visual = grep `lib/fit-ui.css` for an existing class family before writing page-local CSS.
> Page-local CSS is only for genuinely novel visuals (and must use a `fit-*` / `pf-*` prefix that
> isn't already a global — see `feedback_design_token_namespace`).

---

## 1. Screen catalog

Default theme per role: **athlete = light, coach = dark** (`feedback_prototype_theme_role_default`).
Path root: `project-spec/prototypes/flows/`

### Coach (`coach/`)
| File | What it is | Clone for… |
|---|---|---|
| `dashboard.html` | Coach home / dashboard | any coach root tab |
| `calendar.html` | Coach calendar (state-aware event drawer, 96px grid) | any calendar/schedule surface |
| `clients.html` | Clients CRM (state matrix, Mark Paid, notes) | list-with-detail + context menus |
| `sessions.html` | Training Sessions (templates) | create/edit template flows |
| `availability.html` | Availability hub (TZ, Time off, conflict drawer) | settings-hub-style screens |
| `available-hours.html` | Weekly available-hours editor | day/time editors |
| `locations.html` | Training locations (in-person/online/home-visit) | multi-item + default + maps |
| `balance.html` / `balance-v2.html` | Coach Earnings (v2 = Revolut-style swiper + Pending) | money/ledger screens |
| `stripe.html` | Stripe Connect onboarding + control center | multi-step onboarding |
| `profile.html` | Coach Profile (video header, stats, reviews) | public profile surfaces |
| `settings.html` | Settings menu | any settings list |
| `personal-data.html` | Personal data form | profile/data forms |
| `sport-types.html` | Sport selection (+ custom for coach) | taxonomy pickers |
| `calendar-sync.html` | Calendar sync (Google/Apple) | account-connect lists |
| `invite.html` | Coach invite card | invite/share surfaces |
| `invite-coach.html` | Invite-a-Coach (referral, placeholder) | — (deferred) |

### Athlete (`athlete/`)
| File | What it is | Clone for… |
|---|---|---|
| `dashboard.html` | Athlete home (+ setup widget states) | any athlete root tab |
| `calendar.html` | Athlete schedule (coach-parity drawer, accept/decline, reschedule) | athlete calendar surfaces |
| `my-coaches.html` | My Coaches (+ loupe-push to Search) | coach-list cards |
| `search.html` | Coach search + filters | results + filter chips |
| `balance.html` / `balance-v2.html` | Athlete balance (v2 = Revolut) | money screens |
| `profile.html` | Athlete private hub (stats, training history, reviews) | athlete profile |
| `settings.html` | Athlete settings | settings list |
| `personal-data.html` | Personal data (no video/cover; +H/W kg/cm) | data forms |
| `sport-types.html` | Sport selection (no custom for athlete) | taxonomy pickers |
| `calendar-sync.html` | Calendar sync | account-connect lists |
| `integrations.html` | Integrations | toggle lists |

### Shared (`shared/`)
| File | What it is | Clone for… |
|---|---|---|
| `auth.html` | Authentication (sign in/up) | auth surfaces |
| `account-access.html` | Account access (email+password, re-auth, social) | security settings |
| `onboarding.html` | Fullscreen post-signup flow (athlete 5 / coach 7 steps) | mandatory wizards |
| `invite.html` | Global invite (canonical) | repoint here, don't fork |
| `messages.html` | DM messages | chat/thread surfaces |
| `voice-assistant.html` | Voice assistant (canvas, athlete+coach views) | assistant surfaces |
| `self-paced.html` | Self-paced training builder (WIP) | step-builder flows |
| `profile.html` | Coach profile (shared variant) | — |

### Journeys (`journeys/`)
End-to-end annotated walkthroughs, not screens to clone. `home-visit.html` = booking-with-address journey.

---

## 2. Reusable CSS class families (`lib/fit-ui.css`, ~2900 lines)

Grep `fit-ui.css` for the prefix before inventing anything. Native equivalents are documented per
component in `design-tokens/docs/components.md` (and live in `design-tokens/Sources/FitUI/Components/Fit*.swift`).

| Prefix | Purpose | Native (FitUI) |
|---|---|---|
| `.fit-phone-*` | Phone shell / footer (prototype-only) | — |
| `.fit-header` | Screen header (back + title + right actions) | `FitHeader` |
| `.fit-navbar` | Bottom tab bar (root screens only) | `FitNavbar` |
| `.fit-btn-*` | Buttons, 4-tier severity | `FitButton` |
| `.fit-icon-*` | Circular icon buttons / icon plates | `FitIconBtn`, `FitIconPlate` |
| `.fit-card` | Generic card (light=shadow, dark=clean) | `FitCard` |
| `.fit-sheet` | Bottom sheet (handle + backdrop dismiss) | `FitSheet` |
| `.fit-input` | Text fields / form inputs | `FitInput` |
| `.fit-selection` | Selection rows / groups | `FitSelectRow`, `FitSelectionGroup` |
| `.fit-chip` / chips | Selection & filter chips (`.selected` only) | `FitChip` |
| `.fit-badge` | Status badges | `FitBadge` |
| `.fit-toggle` | Switches | `FitToggle` |
| `.fit-stepper` | Steppers | `FitStepper` |
| `.fit-cal-*` | Calendar grid + event pills | `FitCalEvent`, `FitCalEventPill` |
| `.fit-day-*` | Day strips / circles | `FitDayStrip` |
| `.fit-availability-*` | Availability day cells | `FitAvailabilityDay` |
| `.fit-avatar` | Avatars | `FitAvatar` |
| `.fit-profile-*` | Profile hero / header | `FitProfileHero`, `FitProfileHeader` |
| `.fit-stat-*` | Stat strips / tiles | `FitStatStrip`, `FitStatTile` |
| `.fit-review` | Review cards | `FitReviewCard` |
| `.fit-rating` | Star ratings | `FitRating` |
| `.fit-txn` / `.fit-transaction` | Transaction rows | `FitTransactionRow` |
| `.fit-earnings-*` | Earnings hero | `FitEarningsHero` |
| `.fit-payment-*` | Payment method cards | `FitPaymentMethodCard` |
| `.fit-vuc-*` | Video upload card | `FitVideoUploadCard` |
| `.fit-maturity-*` | Coach maturity progress | `FitMaturityProgress` |
| `.fit-participant` / `.fit-spot(s)` | Group participants / spot counters | `FitParticipant`, `FitSpotCounter` |
| `.fit-toast` / `.fit-snackbar` | Transient feedback | `FitToast`, `FitSnackbar` |
| `.fit-context` | Context (⋯) menu | `FitContextMenu` |
| `.fit-empty` | Empty states | `FitEmptyState` |
| `.fit-skeleton` | Loading skeletons | `FitSkeleton` |
| `.fit-ticket` | Ticket / booking cards | `FitTicket` |
| `.fit-invite` | Invite rows | `FitInviteRow` |
| `.fit-settings-*` | Settings cards | `FitSettingsCard` |
| `.fit-wheel` | Wheel picker (native on device) | — (platform-native) |
| `.fit-light` / `.fit-dark` | Theme scopes | `FitTheme` |

Pickers (wheel/time/date/map) are **platform-native** on device — prototype CSS is approximation only
(`feedback_native_pickers`).

---

## 3. The pre-flight (every time)

1. **Screen exists?** Find the closest file in §1 → `cp` it, edit in-phone content only.
2. **Visual exists?** Grep `fit-ui.css` for the §2 family → reuse the class.
3. **Genuinely new?** Page-local CSS with a non-colliding `fit-*`/`pf-*` prefix (grep first).
4. **Render in-place + eyeball** before calling it done (`feedback_headless_render_gotcha`).
