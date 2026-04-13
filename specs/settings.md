# Settings

> Status: Draft
> Prototype: [settings.html](../prototypes/flows/settings.html)
> Last updated: 2026-04-13

## Overview

Main settings screen accessible from Profile tab. Role-specific — Coach sees Coaching section (sessions, hours, locations), Athlete does not.

## Screens

### Coach Settings
| Section | Items |
|---|---|
| Profile | Edit personal info (avatar, name, gender, height, weight), Invite a Coach |
| Coaching | Sport types, Training sessions, Available hours, GYM locations, Calendar Sync |
| Payments | Balance, Stripe Connect |
| Account | Account Access (Login and Security) |
| | Log out |

### Athlete Settings
| Section | Items |
|---|---|
| Profile | Edit personal info, Invite a Friend |
| Training | Choose a sport, Calendar Sync |
| Payments | Balance |
| Account | Account Access |
| | Log out |

## UI Components

- **set-card:** bg `#2B2E31` (dark) / `#FFFFFF` (light), radius 16px, padding 12px, icon 24px + title + subtitle + chevron
- **Section titles:** 16px, secondary color, not uppercase
- **Log out:** standalone text + icon, not in a card
- **Navigation:** tap card → dedicated screen (e.g., Calendar Sync, Account Access)

## Keyboard Behavior

No text inputs on main settings screen.

## Theme

- Coach: dark theme (always)
- Athlete: light theme (always, screen bg `#F7F7F8`, cards `#FFFFFF`)
