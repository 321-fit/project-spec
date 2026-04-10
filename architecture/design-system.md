# 321Fit Design System Reference

> Last updated: 2026-04-06
> Source: Figma UI Kit

## Typography

**Font:** Rubik (Google Fonts)

| Style | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|
| Heading 1 | 22px | Regular (400) | 120% | 0 |
| Heading 2 | 18px | Medium (500) | 125% | 0 |
| Button 1 | 16px | Medium (500) | 130% | 0 |
| Button 2 | 14px | Medium (500) | 155% | 0 |
| Body 1 Bold | 14px | Semi Bold (600) | 155% | 0 |
| Body 1 | 14px | Regular (400) | 155% | 0 |
| Body 2 Bold | 12px | Semi Bold (600) | 155% | 0 |
| Body 2 | 12px | Regular (400) | 155% | 0 |
| Caption | 10px | Regular (400) | 140% | 0 |

## Spacing Scale

0, 4, 8, 16, 20, 24, 32, 40, 48 px

## Border Radius

| Token | Value |
|---|---|
| xs | 4px |
| sm | 8px |
| md | 12px |
| lg | 16px |
| full | 50% (circle) |

## Themes

**Dark Theme** = Coach role (always)
**Light Theme** = Athlete role (always)

### Dark Theme (Coach)

| Token | Role | Hex |
|---|---|---|
| Screen Bg | Page background | #121417 |
| Surface Default | Cards, inputs | #1E2126 |
| Surface High | Elevated cards | #282D34 |
| Surface Higher | Highest elevation | #333841 |
| Surface Low | Recessed areas | #0D0F12 |
| On Surface Primary | Primary text | #FFFFFF |
| On Surface Secondary | Secondary text | #8B9099 |
| On Surface Tertiary | Muted text | #5C6370 |
| Divider | Borders, separators | #2E333A |

### Light Theme (Athlete)

| Token | Role | Hex |
|---|---|---|
| Screen Bg | Page background | #FFFFFF |
| Surface Default | Cards | #FFFFFF |
| Surface High | Elevated cards | #FFFFFF |
| Surface Higher | Inputs bg | #F5F5F7 |
| Surface Low | Recessed | #E8E8ED |
| On Surface Primary | Primary text | #242424 |
| On Surface Secondary | Secondary text | #A7A7A7 |
| On Surface Tertiary | Muted text | #6D6D6D |
| Divider | Borders | #E5E5EA |

### Brand Colors (Both Themes)

| Token | Hex | Usage |
|---|---|---|
| Brand Primary | #00A7D0 | Primary accent, links |
| Brand Secondary | #00E29D | Secondary accent |
| Brand Gradient Start | #00A7D0 | Button gradient start |
| Brand Gradient End | #00E29D | Button gradient end |
| On Brand Primary | #FFFFFF | Text on brand elements |

### Semantic Colors

**Error:**
| Token | Dark | Light |
|---|---|---|
| Error Background | #3D1C1E | #FFF0F0 |
| Error Surface | #FF4D35 | #FF4D35 |
| On Error Surface | #FFFFFF | #FFFFFF |

**Warning:**
| Token | Dark | Light |
|---|---|---|
| Warning Background | #3D351C | #FFF8DB |
| Warning Surface | #FFC635 | #FFC635 |
| On Warning Surface | #000000 | #000000 |

**Success:**
| Token | Dark | Light |
|---|---|---|
| Success Background | #1A3D2A | #EAFBEB |
| Success Surface | #00E29D | #36B03D |
| On Success Surface | #000000 | #FFFFFF |

## Tonal Palettes

Each palette has 10 steps: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900

- **Blue** — information, links
- **Teal** — brand, primary actions
- **Neutral** — text, backgrounds, borders
- **Red** — errors, destructive actions
- **Yellow** — warnings, pending states
- **Green** — success, confirmed states

## Component Patterns (from UI Kit)

### Inputs
- Dark: Surface Default bg (#1E2126), 12px radius, 48px height
- Light: Surface Higher bg (#F5F5F7), 12px radius, 48px height
- Label above input, Body 2 Bold style, secondary color
- Placeholder text in tertiary color

### Buttons
- Primary: Brand gradient, 12px radius, 52px height, Button 1 style
- Secondary: Outlined, surface default bg
- Destructive: Red surface color

### Cards
- Dark: Surface Default (#1E2126), 16px radius
- Light: Surface Default (#FFFFFF), 16px radius, subtle shadow
- Padding: 16-20px

### Navigation Header
- Back arrow + title (Heading 2)
- Dark: screen bg, light text
- Light: white bg, dark text

### Sport Chips (Grid)
- 2-column grid of icon + label
- Dark: Surface Default bg, 12px radius
- Selected: Brand tint overlay, cyan/teal border

### Status Badges
- Confirmed/Approved: Green bg + text
- Pending/Request: Yellow bg + text
- Declined/Cancelled: Red bg + text
- Group: Cyan/teal bg + text
