# Landing FAQ — source copy

> Status: Draft — copy is written, facts are checked against the specs, nothing is published yet
> Owner: product (copy) · growth (placement on the site)
> Last updated: 2026-09-08 — answers walked against the **live Android build** (dev, emulator) and checked against `strings.xml` + the iOS `Localizable.strings`
> Companion: [§ 15 Videos](#15-videos--the-step-by-step-clips) sets the format for the step-by-step clips; [video-storyboards.md](./video-storyboards.md) holds their shot lists.

This file is the **source of truth for FAQ copy on the marketing site** — both the short block on the landing and the full /faq page (§ 0a). The site copies from here; nobody writes FAQ answers directly in the website CMS. When a feature changes, the spec changes first, this file second, the site third.

## 0. How to write an entry

- **One question = one job the visitor is trying to do.** Not one feature. "Can I train with my own coach?" is a job; "Coach relationship model" is not.
- **Answer in the first sentence.** Everything after it is detail the reader may skip.
- **Three sentences, maximum.** If an answer needs more, it is two questions.
- **Say "you".** Name the role only when the answer differs for a coach and an athlete.
- **Only words that exist in the app.** No "anchor seat", no "event approval", no "CRM". If the product's own screen says *Requests*, the FAQ says Requests.
- **No numbers that drift.** Prices, commissions and percentages do not belong here. Product constants that specs pin down (48 hours to answer a request, free cancellation up to 24 hours) are fine — they are linked to their spec so they can be re-checked.
- **Everything above § 16 is true today.** Anything not yet built lives in § 16 and does not go on the site.

---

## 0a. Where each answer goes

Two surfaces, two jobs — **one source, this file**. Never write an answer twice: the landing block renders a subset of the same entries.

| | **Landing block** | **/faq page** |
|---|---|---|
| Job | remove the objection that stops a signup | answer everything, once someone is interested |
| Length | 6 questions, accordion, all closed | the full file, sectioned, anchor-linkable |
| Voice | the shortest true answer | the same answers, with the detail |
| Role | matches the section it sits in (coach block / athlete block) | a role switch at the top — half of this file is irrelevant to whoever is reading |
| Video | none — a clip on the landing competes with the CTA | inline, next to the section it belongs to |

**The six for the landing**, in this order — they are the six things a visitor decides on, not the six we most want to say:

1. § 1 — What is 321Fit?
2. § 1 — Do I need a coach to use it?
3. § 1 — What does it cost me as an athlete?
4. § 2 — Why isn't my booking confirmed straight away?
5. § 7 — How do I pay for training?
6. § 14 — What do other people see about me?

Everything else is a reason to open **/faq**, and the landing block ends with one link to it — not a "read more" per answer.

**Two notes for whoever builds the page.**

- **The role switch is not a nicety.** An athlete reading "how do I get paid" and a coach reading "how do I find a coach" both conclude the product is not for them. If the page cannot switch, split it into two pages instead.
- **Don't build it for FAQ rich results.** Google restricted FAQ rich snippets to a narrow set of sites in 2023, so `FAQPage` markup buys almost nothing in search now. Mark it up for accessibility — real headings, real `<details>`, linkable anchors — and let the content do the SEO.

---

## 1. What 321Fit is

**What is 321Fit?**
A place where coaches run their training business and athletes train with them. Coaches keep their clients, schedule, payments and programmes in one app; athletes book sessions, pay, and see everything they have coming up.

**Is it a gym membership?**
No. 321Fit does not sell training — coaches do. You choose the coach, and the price is theirs.

**Do I need a coach to use it?**
As an athlete, yes: the app is built around working with a coach. If you already train with someone, invite them — they can join and keep working with you here.

**What does it cost me as an athlete?**
Nothing. Athletes use 321Fit for free and pay only their coach for training.

---

## 2. Finding a coach and booking (athlete)

**How do I find a coach?**
Search by sport, city and language, and open a coach's profile to see what they offer, their prices and what other athletes say. If your coach is already on 321Fit, they can send you an invite instead.

**How do I book a session?**
Open the coach's profile, pick the training you want, then a free time on their calendar, and send the request — you can add a note for the coach on the way. You'll see it as *Awaiting* until they accept.

**Why isn't my booking confirmed straight away?**
Every session is confirmed by the coach — they may be double-booked, travelling or out of hours. Coaches have **48 hours** to answer, and the request expires on its own if they don't ([booking-flow.md](../specs/booking-flow.md) § 7 — the number is under review, see § 17).

**Why are some times greyed out?**
Because the coach is busy then — their own sessions, anything in a calendar they've connected, and hours they don't work. You only get offered times they can actually take.

**Can the coach book me in?**
Yes. If a coach schedules a session for you, it lands in your app as a request and nothing is booked until you accept it.

**What if the time doesn't suit me?**
Propose a different one — from the session, choose *Reschedule*. The other side confirms it the same way a new request is confirmed.

---

## 3. Personal sessions

**What is a personal session?**
One-to-one training with your coach at an agreed time and place — a gym, a studio, outdoors, online, or at your home if the coach offers home visits.

**Can I cancel?**
Yes, free of charge up to **24 hours** before the session, and the money goes back to your balance. Later than that it depends on your coach's own policy.

**What happens if I don't show up?**
The coach marks what happened after the session. A missed session is recorded as missed, and money follows the coach's own terms.

**Where does the session take place?**
Wherever the coach set for it — the address is on the session, with directions. For a home visit, it's your address, and the coach's travel time is blocked around it.

---

## 4. Group training

**What is group training?**
A session with several athletes at one time and price, run by the coach — a bootcamp, a class, a squad session.

**How do I join one?**
Your coach shares the session or invites you directly; you take a seat if there is one free. You'll see how many places are left before you commit.

**What if it fills up?**
You can't take a seat that isn't there. Ask your coach — they can tell you when the next one runs.

**Can I leave a group session?**
Yes, and your seat goes back to the group. Leave more than 24 hours before it starts and anything you paid comes back to your balance; later than that it may not.

**Can the coach cancel a group session?**
Yes — if too few people sign up, or anything else. Everyone is notified, and anyone who paid online gets their money back.

---

## 5. Self-paced training

**What is self-paced training?**
Training your coach sends you to do on your own time — a workout, a plan, a set of exercises — with no time slot to book.

**How does it work?**
Your coach sends the workout, you do it whenever suits you and submit it, and the coach reviews what you sent and replies. Everything stays in one thread so you can look back at it.

**Do I have to film myself?**
Only if your coach asks for it. Some coaches review video, some just want you to mark it done.

---

## 6. Session packages

**What is a package?**
A block of sessions bought at once, usually cheaper per session than paying each time. Your coach decides which sessions they offer as a package and at what price.

**How do I use it?**
Book as usual — a session is taken from your package instead of being paid for separately, and the app shows how many you have left. If the coach sells one for the training you're booking, you'll see the offer on the booking screen before you send it.

**What happens if a session I paid for with a package is cancelled?**
The session comes back to your package. Nothing is lost when a coach declines, cancels, or a request expires unanswered.

---

## 7. Paying (athlete)

**How do I pay for training?**
Whatever your coach accepts: cash in person, or online from your 321Fit balance, which you top up by card.

**What is the balance?**
Money you keep in the app for training. You top it up by card, and each online booking reserves its price from it.

**When is the money actually taken?**
It is reserved when you book and goes to the coach after the session. If the coach declines or cancels, the reservation comes back to you.

**Do you keep my card details?**
Card payments are handled by Stripe. 321Fit never sees or stores your card number.

**How does paying cash work?**
Nothing is reserved. You pay the coach in person, and they confirm they received it — you'll see the session settle in the app.

**Can I get a refund?**
Money reserved for a session that doesn't happen comes back to your balance: the coach declined, cancelled, or never answered in time.

---

## 8. Calendar and sync

**Where do I see my training?**
In the calendar: everything booked, waiting, and finished, day by day.

**What is calendar sync?**
Connect your Google calendar and 321Fit reads what's already in it, so a coach's free slots never fall on top of your dentist appointment. You also choose which calendar 321Fit writes its own sessions into.

**Will my personal appointments be visible to anyone?**
No. Events imported from your calendar are only used to keep your schedule honest — no title, no detail, is shown to anyone else.

**Do I have to connect a calendar?**
No. Without it, 321Fit only knows about training booked in 321Fit.

**Coach: what stops someone booking me while I'm busy?**
Your available hours, plus anything in a connected calendar, plus time off you've set. A slot outside those isn't offered.

---

## 9. Messages and notifications

**Can I message my coach?**
Yes — Messages holds your direct conversations with the people you train with, coach or athlete. Group sessions also get their own chat with everyone in them.

**Where do messages live?**
In one place, not scattered across sessions: open Messages, pick the person, and the whole history is there.

**What will 321Fit notify me about?**
The things that need you: a request to answer, a session confirmed or moved, money owed, and a reminder before training starts.

**Can I turn notifications off?**
Yes, in settings — but requests and changes to your sessions are the ones worth keeping on.

---

## 10. Getting started as a coach

**What do I need to start?**
A profile with your sports, location and prices, and at least one session type to sell. Athletes can book you as soon as that exists.

**What is a session type?**
The training you offer — its name, length and price. You create it once and use it for every booking, and you can adjust price or place on a single session without changing the rest.

**How do I set when I work?**
Set your available hours per weekday, add the places you train at, and block time off when you're away. Athletes only ever see slots that fit all of it.

**Can I train people at their home?**
Yes — mark the session as a home visit, and the app blocks your travel time around it.

**Can I take a holiday?**
Yes. Set time off and the app stops offering those days; anything already booked is yours to move or cancel.

---

## 11. Clients and groups (coach)

**How do I get my existing clients in?**
Invite them by link or phone, or import your contacts and invite in bulk. Until they join, you can still keep them as contacts and book them in yourself.

**Can I work with someone who isn't in the app?**
Yes. Keep them as a contact, book their sessions, and settle cash as usual — if they join later, their history comes with them.

**What are client groups?**
A way to organise the people you train — a squad, a level, a location — so you can schedule and message them together.

**Can I stop working with someone?**
You can archive a client to clear your list, or block them so they can't book you. Money they still owe stays on record either way.

---

## 12. Money (coach)

**How do I get paid?**
Cash in person, or online — online money lands in your 321Fit balance and is paid out to your bank account through Stripe.

**When does the money arrive?**
Card money clears about 24 hours after the session and then becomes available; payouts run to your bank on the schedule shown in Earnings.

**What about clients who pay cash?**
Mark the session as paid when you receive the money. Anything unpaid stays visible so nothing quietly disappears.

**Can I charge different prices for different clients?**
Yes — price lives on the session, so you can set it per booking without touching your standard price.

---

## 13. What you'll see in the app

Not a tour of every screen — five places, each answering one question the app has to answer for you every day.

**Home**
Where you land: what is next, what needs an answer, what is unfinished. If nothing here asks anything of you, your day is clear.

**Calendar**
Your training in time. Everything booked, waiting and finished, day by day — a coach also sees their working hours, blocked time and anything synced from another calendar.

**Clients** *(coach)* **· My Coaches** *(athlete)*
Your people. A coach opens a client and sees their sessions, money, packages, groups and notes in one place; an athlete opens a coach and sees what they offer and everything they've trained together.

**Messages**
Direct conversations with the people you train with, plus a chat for each group session.

**Balance** *(athlete)* **· Earnings** *(coach)*
The money side: what you've topped up and spent, or what you've earned, what's still owed in cash and what has been paid out.

---

## 14. Account, roles and privacy

**Can I be a coach and an athlete at once?**
Yes, on one account. Switch roles in the app; each side keeps its own profile and schedule.

**What do other people see about me?**
Coaches have a public profile — name, photo, sports, prices, reviews. An athlete's profile is not public: your coach sees what they need to train you, other athletes see nothing.

**How do I delete my account?**
From settings. The app tells you first if anything is unfinished — sessions still booked or money not settled.

**Where is my data?**
On our servers in the EU, and with the services that run parts of the product: payments with Stripe, push notifications with the app stores. We don't sell it.

---

## 15. Videos — the step-by-step clips

The written answer says *what*; a short clip shows *how*. The clips sit next to the FAQ entry they belong to, not in a separate "watch our video" section.

### Format

- **20–40 seconds**, portrait, no voice-over — captions only, so it works muted and needs no localisation to be understood.
- **One job per clip**, matching one FAQ entry exactly. If a clip needs two jobs, the FAQ entry is wrong.
- **Real app, real data-shaped content.** Recorded from the app, not from the prototype: a landing that shows screens the user won't recognise is worse than no video.
- **Every clip ends on the result**, not on a tap — the confirmed session, the connected calendar, the money in the balance.

### The first set

Shot lists live in **[video-storyboards.md](./video-storyboards.md)** — screen by screen, with a board link per shot and the caption text.

| # | Clip | FAQ entry | Storyboard: screens it walks |
|---|---|---|---|
| 1 | Book a session with a coach | § 2 | search → coach profile → session type → time → confirm → *Awaiting* → confirmed |
| 2 | Accept a request (coach) | § 2 | notification → calendar → event drawer → Accept |
| 3 | Connect your calendar | § 8 | settings → calendar sync → Google/Apple → what gets written where |
| 4 | Join a group session | § 4 | invite/link → group session → seats left → join → confirmed |
| 5 | Send self-paced training (coach) | § 5 | client → self-paced → build → send → athlete submits → review |
| 6 | Top up and pay online | § 7 | balance → top up → book with balance → session settles after training |
| 7 | Set your working hours (coach) | § 10 | availability → weekly hours → locations → time off |
| 8 | Sell a package (coach) | § 6 | session → package → athlete buys → credits count down on booking |

**The storyboard already exists.** Every one of those sequences is on the prototype board — the screen order and the copy on each screen come from there, so a clip cannot invent a flow that does not ship. Start from [board.html](https://321-fit.github.io/project-spec/prototypes/board.html), open the module, and read the screens in order.

### Open before we shoot

1. **Who records** — screen capture from a build, or motion design over exported frames? Capture is honest and cheap to redo; motion looks better and dates faster.
2. **Which device frame**, if any. `store-assets/` already renders App Store frames; the same config could produce video frames instead of inventing a second look.
3. **Where they live on the site** — inline in the FAQ entry, or a gallery at the top? Inline is the reason to have them; a gallery is how they get ignored.

---

## 16. Not on the site yet

Do not publish an answer for anything in this list — the words would be a promise. Move an entry up into the FAQ in the same commit that ships the feature.

| Feature | Why it is not here |
|---|---|
| A second person on a personal session (semi-private) | Designed and specced ([semi-private.md](../specs/semi-private.md)), not built |
| Written reviews | Ratings exist; the review module is not finished |
| AI assistant | In the app but still changing — check with product before it goes on the site |
| Referral rewards | Invites work; the reward mechanics are not decided |
| **How 321Fit makes money** — subscription, commission, anything with a price | Not decided/announced. Removed from § 1 and § 12 on 2026-09-08; put it back only when growth says what it is |
| **Apple calendar sync** | Google is what the copy names for now. The Apple half is not advertised until product says it is |
| Payout timing in days | Owned by finance, not by this file |

## 17. Checked against the app — 2026-09-08

Walked on the live Android build (dev flavour, emulator) and cross-read against `strings.xml` and the iOS `Localizable.strings`. Everything above uses words the app actually shows: *Requests*, *Awaiting*, *Balance*, *Top up*, *Calendar sync*, *Available hours*, *Time off*, *Home visit*, *Self-paced*, *Packages*, *Earnings*, *Mark as paid*, *Clients*, *Groups*.

**One conflict found, and it is a product decision, not a bug to file yet.** The booking screen on both platforms says *"Coach has 24h to approve"*; the backend auto-declines at **48 hours** (`auto_decline_pending_requests`, `timedelta(hours=48)`) and the spec has said 48h since 2026-06-26. Which number is right is **open with product** — the window may go back to 24h. Until it is decided, do not touch either side, and treat the 48h in § 2 as provisional: whatever is decided lands in the spec first, then here, then the apps.

## Related

- Product specs: [`../specs/`](../specs/) — each FAQ section names the spec it is checked against
- Screens: [prototype board](https://321-fit.github.io/project-spec/prototypes/board.html)
- Store copy (a different voice — short, promotional): [`../store-assets/STORE-LISTING.md`](../store-assets/STORE-LISTING.md)
