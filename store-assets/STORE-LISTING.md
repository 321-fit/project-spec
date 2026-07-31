# 321Fit — Google Play Store Listing

Everything needed to fill the Play Console listing + App content declarations.
Copy is written for the **athlete** audience (matches the 6 screenshot frames in `config.js`),
with a coach paragraph at the end.

Companion files: `config.js` (screenshot copy), `export/*.png` (1290×2796 screenshots).

---

## 1. Store listing — text fields

### App name — max 30 chars

```
321Fit: Personal Training
```
*(25 chars)*

Alternatives:
| Option | Chars | Note |
|---|---|---|
| `321Fit: Personal Training` | 25 | **Recommended** — brand + category, no keyword stuffing |
| `321Fit — Book Your Coach` | 24 | More action-oriented, weaker on search |
| `321Fit: Find a Personal Coach` | 29 | Max keyword coverage, close to the 30 limit |

Do **not** add descriptors like "#1", "Best", "Free" — Play's metadata policy rejects them.

---

### Short description — max 80 chars

```
Find a personal trainer, book sessions, and train on your schedule.
```
*(67 chars)*

Alternatives:
| Option | Chars |
|---|---|
| `Find a personal trainer, book sessions, and train on your schedule.` | 67 |
| `Book real personal trainers near you. Sessions, payments and chat in one app.` | 76 |
| `Your coach, your calendar, your progress — all in one app.` | 58 |

This line shows in search results under the icon — it is the highest-leverage string in the listing.

---

### Full description — max 4000 chars

Play supports limited HTML (`<b>`, `<i>`, `<u>`, `<br>`). Plain text below renders fine as-is;
wrap the section headers in `<b>…</b>` if you want them bold.

```
321Fit connects you with real personal trainers — and keeps your whole training life in one place.

Browse coaches near you, see who they actually are before you book, reserve a slot in two taps, and message your coach without leaving the app. No group chats, no spreadsheets, no back-and-forth about times.

FIND A COACH WHO GETS YOU
Search by sport, city, language and price. 33 sports covered — from strength training and running to yoga, boxing and swimming. Your filters are remembered, so you see relevant coaches first every time you open the app.

KNOW EXACTLY WHO YOU'RE BOOKING
Every coach profile shows an intro video, real client reviews, the sports they coach, session prices and locations. You decide before you pay, not after.

BOOK IN TWO TAPS
Pick a session, pick a free slot, done. You only ever see times your coach is genuinely available — their weekly schedule, travel time between locations and time off are all accounted for. Train in person, online, or have your coach come to you.

PERSONAL, GROUP OR SELF-PACED
One-on-one sessions, small group trainings you can join, or self-paced programs your coach builds for you to do on your own time.

YOUR TRAINING LIFE IN ONE VIEW
A dashboard with your next session, what needs your attention and what you owe. A calendar with every booking, plus reminders so you never miss a session.

PAY ONCE, BOOK ANYTIME
Top up your balance by card and book without re-entering payment details. Prefer cash? Pay your coach directly and the app still keeps track. Session packages let you buy several sessions upfront.

STAY IN SYNC WITH YOUR COACH
Direct messages, booking confirmations and schedule changes all land in one inbox. Sync your bookings to Google or Apple Calendar so training sits next to the rest of your life.

ALSO BUILT FOR COACHES
321Fit is a complete business tool on the other side. Publish your profile, define your sessions and prices, set your weekly availability and locations, manage your clients, track cash and card payments, run group trainings and get paid — replacing the WhatsApp + calendar + spreadsheet setup most coaches live in.

Free for athletes. Find your coach and book your next session today.

Support: [SUPPORT EMAIL — TBD] · https://t.me/f321_support
```

*(~2 350 chars — comfortable room under the 4 000 limit if you want to add more.)*

⚠️ Replace `[SUPPORT EMAIL — TBD]` before publishing — Play requires a working support email in
Store settings anyway, use the same one here.

---

### What's new (release notes) — max 500 chars

First release:
```
Welcome to 321Fit.

• Search personal trainers by sport, city, language and price
• Coach profiles with intro video, reviews and real prices
• Book personal, group or self-paced sessions in two taps
• Pay by card or cash, with balance top-ups and session packages
• Chat with your coach and sync bookings to your calendar

Found a bug or have an idea? Reach us at https://t.me/f321_support
```
*(~400 chars)*

---

## 2. Graphics checklist

| Asset | Spec | Status |
|---|---|---|
| App icon | 512×512 PNG, 32-bit, **no alpha**, ≤1 MB | ⚠️ Needs a proper source — see note below |
| Feature graphic | 1024×500 PNG/JPG, no alpha | ✅ `export/feature-graphic.jpg` — `node export-feature.mjs` |
| Phone screenshots | 2–8, 1290×2796 | ✅ `export/01-search…06-messages.png` |
| 7" tablet screenshots | up to 8, min 320 px | ⚠️ Optional, but without them Play flags the app as "not optimised for tablets" |
| 10" tablet screenshots | up to 8 | ⚠️ Same |
| Promo video | YouTube URL | Optional — skip for v1 |

**Feature graphic** — done, generated by the same pipeline: brand gradient, the real wordmark
(1:1 SVG conversion of the app's `logo.xml`) and a three-beat tagline, no phone since Play crops
this asset hard. Copy lives in `config.js → FEATURE.tagline`; re-run `node export-feature.mjs`
after any change. Upload the **`.jpg`** — Play requires no alpha channel.

**App icon** — the repo only has a 432×432 adaptive-icon foreground on a flat background colour,
so a 512×512 export would be an upscale. Best path is a clean 512 export from the Figma source;
failing that, rebuilding the stacked "321 / FIT" lockup from `logo.xml` at 512 is the fallback.
Either way it needs its own small task, not a resample.

---

## 3. Store settings

| Field | Value |
|---|---|
| App category | **Health & Fitness** |
| Tags (≤5) | Personal trainer · Fitness · Workout · Gym · Wellness *(pick from Play's fixed list)* |
| Contact email | [TBD] — must be monitored, shown publicly |
| Contact website | https://321.fit *(verify it resolves)* |
| Contact phone | Optional — leave blank |
| External marketing | Opt in |

---

## 4. App content declarations

### Privacy policy
Required, must be a **public URL** reachable without login and must cover every data type declared
in Data safety. ⚠️ The app references a "Privacy Policy" string (`account_access_v2_privacy_policy`)
but no URL is wired in the code — needs to exist before submit.

### Ads
**No** — the app serves no ads. AppsFlyer is install attribution, not ad serving.
(But it *does* use the Advertising ID — declare that in Data safety, see below.)

### App access
Login is required for everything → you **must** provide reviewer credentials.
⚠️ `test321fit@gmail.com / Test1234` is a **staging** account; the Play build points at
`api.321.fit` (prod). Create a prod test account, ideally with:
- a coach and an athlete account (the app has two completely different UIs by role)
- some seeded bookings/messages so the reviewer doesn't see empty states
- instructions: "Log in with the athlete account to see search + booking; use Switch Role in Profile to see the coach side."

### Content rating (IARC questionnaire)
Expected outcome: **Everyone / PEGI 3**, but answer honestly:
- Users can interact with each other → **Yes** (DMs, bookings)
- Users can share content → **Yes** (profiles, photos, videos, reviews, messages)
- User location shared with other users → **Yes** (coach locations / home visit addresses)
- Digital purchases → **Yes** (balance top-ups)

⚠️ Answering yes to UGC triggers Play's **User-Generated Content policy**: the app must have
in-app **reporting** and **blocking**, plus a moderation process. Blocking exists (Clients CRM),
and the `moderation` / `moderation_backend` repos + `review-queue.md` cover the backend — verify
there is a user-visible **Report** action on profiles, reviews and messages before submitting.

### Target audience
Recommend **18 and over**.
The app collects DOB with a <13 block, but it handles payments and physical meetings between
adults. Selecting 13–17 pulls you into Play's Families policy (extra requirements on ads SDKs,
data collection, and a Families-specific review). 18+ avoids all of it.

### Financial features
**No** — Play's definition covers banking, loans, crypto, investments and insurance.
Paying a coach for a service is e-commerce, not a financial feature.

### Health apps
**Not applicable** — the app doesn't integrate Health Connect and makes no medical claims.
(Height/weight are still *health data* for Data safety purposes — see below.)

### Government apps / News
**No** to both.

---

## 5. Data safety form

### Security practices — the section you asked about
| Question | Answer |
|---|---|
| Is all user data encrypted in transit? | **Yes** |
| Do you provide a way for users to request data deletion? | **Yes** |

Encryption evidence: prod endpoints `api.321.fit` / `voice-api.321.fit` serve **TLS 1.3** with
`http://` → **308 redirect** to https; Android `targetSdk 35` blocks cleartext by default and the
only `network_security_config.xml` lives in the **dev** flavour; media URLs are force-prefixed
`https://` in `storage.py`; LiveKit audio is WebRTC (DTLS/SRTP).

⚠️ **Deletion:** the in-app delete-account flow exists (`AccountAccessV2DeleteInfoScreen`), but Play
also requires a **web URL** where users can request account deletion without installing the app.
That page does not exist yet — it's a hard blocker for the form.

### Data types — declare these

| Category | Data type | Collected | Shared | Required | Purpose |
|---|---|---|---|---|---|
| Personal info | Name | ✅ | — | Required | App functionality, Account management |
| Personal info | Email address | ✅ | — | Required | App functionality, Account management |
| Personal info | Phone number | ✅ | — | Optional | App functionality, Account management |
| Personal info | Address | ✅ | — | Optional | App functionality *(home-visit athlete address)* |
| Personal info | User IDs | ✅ | ✅ | Required | App functionality, Analytics *(Sentry, AppsFlyer)* |
| Personal info | Other info | ✅ | — | Optional | DOB, gender, country, city, languages, time zone |
| Financial info | Purchase history | ✅ | — | Optional | App functionality *(balance, packages, sessions paid)* |
| Financial info | Payment info | ❌ | — | — | Card data goes **directly to Stripe** — the app never receives it |
| Location | Approximate location | ✅ | — | Optional | App functionality *(coach search near you)* |
| Location | Precise location | ✅ | — | Optional | App functionality *(location picker, gyms near you)* |
| Health & fitness | Fitness info | ✅ | — | Optional | App functionality *(height, weight, training history)* |
| Messages | Other in-app messages | ✅ | — | Optional | App functionality *(coach ↔ athlete DMs)* |
| Photos & videos | Photos | ✅ | — | Optional | App functionality *(avatar, cover image)* |
| Photos & videos | Videos | ✅ | ✅ | Optional | App functionality *(coach intro video — hosted on **Mux**)* |
| Audio | Voice or sound recordings | ✅ | ✅ | Optional | App functionality *(voice assistant — audio reaches **OpenAI** via LiveKit)* |
| Contacts | Contacts | ✅ | — | Optional | App functionality *(coach CRM contact import)* |
| App activity | App interactions | ✅ | ✅ | Optional | Analytics *(AppsFlyer, Firebase)* |
| App info & perf | Crash logs | ✅ | ✅ | Optional | Crash reporting *(Sentry)* |
| App info & perf | Diagnostics | ✅ | ✅ | Optional | Performance monitoring *(Sentry)* |
| Device or other IDs | Device or other IDs | ✅ | ✅ | Required | Analytics, Attribution *(Advertising ID via AppsFlyer, FCM token)* |

**Shared** = transferred to a third party (Stripe, Mux, OpenAI, Sentry, AppsFlyer, Firebase, LiveKit).
Every one of these must also appear in the privacy policy.

Two rows to double-check against the shipped build before you submit:
1. **Contacts** — confirm imported contacts are actually stored server-side (they are, for CRM). If
   yes, "Collected" is correct and you cannot mark it processed-ephemerally.
2. **Voice recordings** — confirm whether audio is retained anywhere or only streamed. If only
   streamed and never stored, you may mark it "processed ephemerally" instead of collected.

---

## 6. Permissions — what Play will ask about

| Permission | Why | Risk |
|---|---|---|
| `READ_CONTACTS` | Coach CRM bulk import | ⚠️ **Sensitive.** Play requires a **prominent in-app disclosure shown *before* the system dialog**, explaining what is collected and why. Verify the rationale screen (`coach_import_denied_sub`) fires *before*, not only after a denial. |
| `FOREGROUND_SERVICE_MEDIA_PROJECTION` | Almost certainly pulled in by the LiveKit SDK for screen-share | ⚠️ **Flag.** Screen capture in a fitness app is a review red flag and requires a foreground-service-type justification. If screen sharing isn't a feature, strip it: `tools:node="remove"` in the app manifest. |
| `ACCESS_FINE_LOCATION` / `COARSE` | Coach search, location picker | ✅ Foreground only — no background-location declaration form needed. Keep it that way. |
| `RECORD_AUDIO` | Voice assistant | ✅ Justify in the review notes |
| `CAMERA` | Avatar / intro video capture | ✅ Fine |
| `ACCESS_ADSERVICES_AD_ID` | AppsFlyer attribution | ✅ Must be reflected in Data safety (Device IDs, Advertising ID) |
| `POST_NOTIFICATIONS` | Booking reminders | ✅ Fine |

---

## 7. Blockers before you can hit Submit

1. ✅ ~~Feature graphic 1024×500~~ — `export/feature-graphic.jpg`
2. ❌ **Privacy policy URL** — required, not wired anywhere in the app
3. ❌ **Web account-deletion URL** — required for any app with account creation
4. ⚠️ **Prod reviewer credentials** — current test account is staging-only
5. ⚠️ **512×512 icon** — needs a real 512 source (Figma export or a vector rebuild), not an upscale
6. ⚠️ **Support email** — needed in Store settings and in the full description
7. ⚠️ **`FOREGROUND_SERVICE_MEDIA_PROJECTION`** — remove it or be ready to justify screen capture
8. ⚠️ **Report/block UI for UGC** — required by the UGC policy once you answer "users can interact"
9. ⚠️ **`NSAllowsArbitraryLoads`** on iOS — not a Play issue, but fix before the App Store submission

Items 2, 3, 4 and 6 need a decision from you; 5, 7 and 8 are dev tasks.
