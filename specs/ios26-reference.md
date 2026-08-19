# iOS 26 — what we took from Apple's kit, and why

> Source: **iOS and iPadOS 26 UI Kit**, Apple Design Resources, read on 2026-08-19 through the
> Figma MCP (file `Wn1Cu8fuTNULEhWbhYRuIU`, a duplicate in 321 Team).
> Used by: [`prototypes/lab/components.html`](../prototypes/lab/components.html) → `Palette: iOS`.
> Related: [`theme-contrast.md`](theme-contrast.md).

**This file is an extract, not a copy.** Apple ships a new kit every year — iOS 27 is already
out — so hoarding the whole thing would rot. What is written down here is the part that is
stable and that we actually build against; anything else we look up in the live kit when a
feature needs it.

**Our brand stays ours.** Teal and green where they belong. Apple's neutrals, type and metrics
are what we are borrowing. Worth noting the accident: Apple's own `Mint #00dac3` and
`Teal #00d2e0` sit either side of our brand `#05e0a6` — our identity already reads native on
that platform.

---

## 1. Type scale — the real numbers

`SF Pro`, at the default Dynamic Type size (Large). **Emphasized = weight 590**, not 600 —
that is SF Pro Semibold. The two biggest titles emphasise with Bold 700 instead.

| style | size | line-height | regular | emphasized | tracking |
|---|---:|---:|---:|---:|---:|
| Large Title | 34 | 41 | 400 | **700** | +0.40 |
| Title 1 | 28 | 34 | 400 | **700** | +0.38 |
| Title 2 | 22 | 28 | 400 | **700** | −0.26 |
| Title 3 | 20 | 25 | 400 | 590 | −0.45 |
| Headline | 17 | 22 | — | **590 always** | −0.43 |
| Body | 17 | 22 | 400 | 590 | −0.43 |
| Callout | 16 | 21 | 400 | 590 | −0.31 |
| Subheadline | 15 | 20 | 400 | 590 | −0.23 |
| Footnote | 13 | 18 | 400 | 590 | −0.08 |
| Caption 1 | 12 | 16 | 400 | 590 | 0 |
| Caption 2 | 11 | 13 | 400 | 590 | +0.06 |

**Tracking flips sign with size.** Negative for body and below-ish sizes, positive again at
Title 1 and Large Title. Our type is set at 0 everywhere, which is a large part of why the
same words feel different in the two systems.

**Dynamic Type is the point, not a bonus.** The kit carries seven content sizes plus five
accessibility sizes (AX1–AX5), where Body grows 17 → 53. Our screens are fixed-px. That is a
real divergence and a separate decision, not something a palette switch can fix.

---

## 2. Colours — exact values from the kit (dark), Apple's standard light

| role | dark (from the kit) | light (Apple standard) |
|---|---|---|
| Label / primary | `#ffffff` | `#000000` |
| Label / secondary | `#ebebf5` @ 70% | `#3c3c43` @ 60% |
| Label / tertiary | `#ebebf5` @ 30% | `#3c3c43` @ 30% |
| Label / quaternary | `#ebebf5` @ 16% | `#3c3c43` @ 18% |
| Background / primary | `#000000` | `#ffffff` |
| Background / secondary | `#1c1c1e` | `#f2f2f7` |
| Background / tertiary | `#2c2c2e` | `#ffffff` |
| Elevated (sheets over) | `#1c1c1e` · `#2c2c2e` · `#3a3a3c` | same as base |
| Separator / non-opaque | `#ffffff` @ 17% | `#3c3c43` @ 29% |
| Separator / opaque | `#38383a` | `#c6c6c8` |
| Grays 1–6 | `#8e8e93` `#aeaeb2` `#48484a` `#3a3a3c` `#2c2c2e` `#1c1c1e` | ramp inverts |

**Accents were rewritten for 26** — these are not the iOS 18 values:

```
Blue   #0091ff    Green  #30d158    Mint   #00dac3    Teal  #00d2e0
Cyan   #3cd3fe    Indigo #6d7cff    Purple #db34f2    Pink  #ff375f
Red    #ff4245    Orange #ff9230    Yellow #ffd600    Brown #b78a66
```

**Vibrant variants** (content over glass) are resolved, not alpha — e.g. tertiary label becomes
`#bfbfbf` light / `#404040` dark. Measured against white that is **1.84 : 1**. Apple ships it
anyway, which is the whole argument of §4.

---

## 3. Metrics, measured from the components

Menu (iPhone), from `Menus` page:

```
container 238 wide · rows inset 16 both sides → 206
row 40 · two-line row 60 · separator block 21 · section title 29
```

Liquid Glass parameters, straight out of the kit's variables:

```
Refraction 100 · Frost (medium) 12 · Depth (medium/large) 16
Splay (regular) 6 · Opacity 60 · Light angle −45°
```

---

## 4. What we are taking, and what we are not

**Taking:** the type scale (sizes, line-heights, weights and especially **tracking**), the list
grammar — one container, hairline separators inset past the leading element — and the control
metrics.

**Not taking:** the neutral palette. Measured on our own components it scores worse than ours
(dark 29 / light 57 below AA against our 18 / 50), because Apple's quiet labels are 30% ink and
their card sits 1.09 : 1 from the page.

**And the reason that is fine for them and not for us:** Apple compensates elsewhere — SF's
optical sizing at small sizes, tracking, separators carrying the structure, Dynamic Type, and
generous touch targets. Take the compensation, not just the colours.

**So the audit changes job.** It is not a verdict on taste; it is a floor under a short list
where being hard to read costs money: prices and debts, states, error text, anything read once
before a decision. Everything else may follow iOS grammar even where it measures below 4.5.
