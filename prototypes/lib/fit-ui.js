/**
 * FitUI Interaction Library
 * 321Fit Design System — JS Interactions
 *
 * Auto-initializes on DOMContentLoaded.
 * All interactions are opt-in via data attributes on HTML elements.
 *
 * Patterns:
 *   [data-fit-swipe]          — swipe left/right actions
 *   [data-fit-longpress]      — long press → bottom sheet
 *   [data-fit-toggle]         — tap to toggle state
 *   [data-fit-sheet]          — bottom sheet (target id)
 *   [data-fit-day-strip]      — horizontal day wheel
 *   [data-fit-stepper]        — number stepper ± buttons
 *
 * Best practices applied:
 *   - Passive touch listeners where possible (scroll perf)
 *   - RequestAnimationFrame for drag transforms (60fps)
 *   - Touch + mouse support (mobile + desktop preview)
 *   - Velocity-based swipe detection (not just distance)
 *   - Haptic-ready thresholds (44px iOS / 48px Android touch targets)
 *   - WCAG: respects prefers-reduced-motion
 *   - No ghost clicks: pointer-events managed during gestures
 *   - Cleanup: MutationObserver for dynamically added elements
 */

(function () {
  'use strict';

  // ============================================================
  // CONFIG
  // ============================================================
  const CFG = {
    swipe: {
      threshold: 60,        // px to trigger action
      maxDisplace: 100,      // max visual displacement
      velocityThreshold: 0.3, // px/ms — fast swipe triggers even if short
      animDuration: 250,     // ms bounce-back
      removeDuration: 300,   // ms remove animation
    },
    longPress: {
      delay: 500,            // ms to trigger
      moveCancel: 10,        // px movement cancels long press
    },
    dayStrip: {
      snapDuration: 300,     // ms scroll animation
    },
    stepper: {
      min: 1,
      max: 100,
      holdDelay: 500,        // ms before repeat
      holdInterval: 100,     // ms between repeats
    },
  };

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dur = (ms) => prefersReducedMotion ? 0 : ms;

  // ============================================================
  // UTILITIES
  // ============================================================
  function getX(e) {
    if (e.touches) return e.touches[0].clientX;
    if (e.changedTouches) return e.changedTouches[0].clientX;
    return e.clientX;
  }

  function setTransform(el, x) {
    el.style.transform = x === 0 ? '' : `translateX(${x}px)`;
  }

  function animate(el, props, duration, onDone) {
    el.style.transition = Object.keys(props).join(' ') + ` ${dur(duration)}ms ease`;
    requestAnimationFrame(() => {
      Object.assign(el.style, props);
      setTimeout(() => {
        el.style.transition = '';
        if (onDone) onDone();
      }, dur(duration));
    });
  }

  // ============================================================
  // SWIPE ACTIONS
  // ============================================================
  // Usage: <div data-fit-swipe
  //             data-swipe-right-action="paid"
  //             data-swipe-left-action="remove">
  //          ...content...
  //          <div class="fit-swipe-right">✓ Paid</div>
  //          <div class="fit-swipe-left">Remove</div>
  //        </div>
  //
  // Events dispatched: 'fit:swipe-right', 'fit:swipe-left'

  function initSwipe(el) {
    if (el._fitSwipe) return;
    el._fitSwipe = true;

    let startX = 0, startY = 0, currentX = 0, startTime = 0;
    let dragging = false, moved = false, locked = false;
    let lpTimer = null;

    const rightReveal = el.querySelector('.fit-swipe-right');
    const leftReveal = el.querySelector('.fit-swipe-left');

    function onStart(x, y) {
      startX = x; startY = y; currentX = x;
      startTime = Date.now();
      dragging = true; moved = false; locked = false;

      // Long press timer
      if (el.hasAttribute('data-fit-longpress')) {
        lpTimer = setTimeout(() => {
          if (!moved && dragging) {
            dragging = false;
            triggerLongPress(el);
          }
        }, CFG.longPress.delay);
      }
    }

    function onMove(x, y) {
      if (!dragging) return;
      currentX = x;

      // Determine scroll direction lock on first significant move
      if (!locked && !moved) {
        const dx = Math.abs(x - startX);
        const dy = Math.abs(y - startY);
        if (dy > dx && dy > 8) {
          // Vertical scroll — cancel swipe
          dragging = false;
          clearTimeout(lpTimer);
          return;
        }
        if (dx > 8) {
          locked = true;
          moved = true;
          clearTimeout(lpTimer);
        } else {
          return;
        }
      }

      const diff = x - startX;
      const clamped = Math.max(-CFG.swipe.maxDisplace, Math.min(CFG.swipe.maxDisplace, diff));

      requestAnimationFrame(() => {
        setTransform(el, clamped);
        if (rightReveal) {
          rightReveal.style.opacity = diff > 20 ? '1' : '0';
        }
        if (leftReveal) {
          leftReveal.style.opacity = diff < -20 ? '1' : '0';
        }
      });
    }

    function onEnd(x) {
      clearTimeout(lpTimer);
      if (!dragging) return;
      dragging = false;

      const diff = x - startX;
      const elapsed = Date.now() - startTime;
      const velocity = Math.abs(diff) / elapsed; // px/ms

      const triggered = Math.abs(diff) > CFG.swipe.threshold || velocity > CFG.swipe.velocityThreshold;

      // Swipe right action
      if (triggered && diff > 0 && rightReveal) {
        el.dispatchEvent(new CustomEvent('fit:swipe-right', { bubbles: true }));
        bounceBack(el, rightReveal, leftReveal);
        return;
      }

      // Swipe left action
      if (triggered && diff < 0 && leftReveal) {
        el.dispatchEvent(new CustomEvent('fit:swipe-left', { bubbles: true }));
        removeRow(el);
        return;
      }

      // Bounce back
      bounceBack(el, rightReveal, leftReveal);
    }

    function bounceBack(el, right, left) {
      animate(el, { transform: '' }, CFG.swipe.animDuration);
      if (right) animate(right, { opacity: '0' }, CFG.swipe.animDuration);
      if (left) animate(left, { opacity: '0' }, CFG.swipe.animDuration);
    }

    function removeRow(el) {
      animate(el, {
        transform: 'translateX(-100%)',
        opacity: '0',
      }, CFG.swipe.removeDuration, () => {
        el.style.maxHeight = el.offsetHeight + 'px';
        requestAnimationFrame(() => {
          animate(el, {
            maxHeight: '0',
            padding: '0',
            margin: '0',
            borderWidth: '0',
          }, CFG.swipe.removeDuration);
        });
      });
    }

    // Touch events
    el.addEventListener('touchstart', (e) => onStart(getX(e), e.touches[0].clientY), { passive: true });
    el.addEventListener('touchmove', (e) => {
      onMove(getX(e), e.touches[0].clientY);
      if (moved) e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchend', (e) => onEnd(getX(e)));

    // Mouse events (desktop preview)
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onStart(e.clientX, e.clientY);
      const onMouseMove = (e) => onMove(e.clientX, e.clientY);
      const onMouseUp = (e) => {
        onEnd(e.clientX);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Block click after swipe
    el.addEventListener('click', (e) => {
      if (moved) { e.stopImmediatePropagation(); e.preventDefault(); moved = false; }
    }, true);

    // Context menu (right-click → long press on desktop)
    el.addEventListener('contextmenu', (e) => {
      if (el.hasAttribute('data-fit-longpress')) {
        e.preventDefault();
        triggerLongPress(el);
      }
    });
  }

  // ============================================================
  // LONG PRESS → BOTTOM SHEET
  // ============================================================
  // Usage: <div data-fit-longpress data-fit-sheet="my-sheet">
  // Sheet: <div class="fit-sheet-overlay" id="my-sheet">

  function triggerLongPress(el) {
    const sheetId = el.getAttribute('data-fit-sheet');
    if (!sheetId) {
      el.dispatchEvent(new CustomEvent('fit:longpress', { bubbles: true }));
      return;
    }

    // Find sheet within the same screen
    const screen = el.closest('.fit-phone');
    const sheet = screen ? screen.querySelector('#' + sheetId) : document.getElementById(sheetId);
    if (!sheet) return;

    // Populate sheet name if data-name provided
    const name = el.getAttribute('data-fit-name') ||
                 el.querySelector('.fit-participant-name')?.textContent || '';
    const nameEl = sheet.querySelector('.fit-sheet-title');
    if (nameEl && name) nameEl.textContent = name;

    sheet.classList.add('visible');
  }

  function initSheet(overlay) {
    if (overlay._fitSheet) return;
    overlay._fitSheet = true;

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('visible');
    });

    // Close on sheet item click
    overlay.querySelectorAll('.fit-sheet-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action');
        if (action) {
          overlay.dispatchEvent(new CustomEvent('fit:sheet-action', {
            bubbles: true,
            detail: { action },
          }));
        }
        overlay.classList.remove('visible');
      });
    });

    // Swipe down to dismiss
    let startY = 0;
    const sheet = overlay.querySelector('.fit-sheet');
    if (!sheet) return;

    sheet.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    }, { passive: true });
    sheet.addEventListener('touchmove', (e) => {
      const diff = e.touches[0].clientY - startY;
      if (diff > 0) {
        sheet.style.transform = `translateY(${diff}px)`;
      }
    }, { passive: true });
    sheet.addEventListener('touchend', (e) => {
      const diff = e.changedTouches[0].clientY - startY;
      if (diff > 80) {
        animate(sheet, { transform: 'translateY(100%)' }, 200, () => {
          overlay.classList.remove('visible');
          sheet.style.transform = '';
        });
      } else {
        animate(sheet, { transform: '' }, 200);
      }
    });
  }

  // ============================================================
  // TAP TOGGLE
  // ============================================================
  // Usage: <div data-fit-toggle="paid"
  //             data-toggle-class="paid"
  //             data-toggle-target=".fit-checkbox">
  //
  // Toggles class on element + optional child target
  // Dispatches 'fit:toggle' with { state: bool, name: string }

  function initToggle(el) {
    if (el._fitToggle) return;
    el._fitToggle = true;

    el.addEventListener('click', (e) => {
      // Don't toggle if this was a swipe
      if (el._fitSwipe && e.defaultPrevented) return;

      const toggleClass = el.getAttribute('data-toggle-class') || 'active';
      const isActive = el.classList.toggle(toggleClass);

      // Toggle child target too (e.g. checkbox)
      const targetSel = el.getAttribute('data-toggle-target');
      if (targetSel) {
        const target = el.querySelector(targetSel);
        if (target) target.classList.toggle('checked', isActive);
      }

      el.dispatchEvent(new CustomEvent('fit:toggle', {
        bubbles: true,
        detail: {
          state: isActive,
          name: el.getAttribute('data-fit-toggle'),
        },
      }));
    });
  }

  // ============================================================
  // SELECTION CHIPS (mutually exclusive or multi-select)
  // ============================================================
  // Usage: <div data-fit-selection="single|multi">
  //          <div class="fit-selection-chip" data-value="cash">Cash</div>
  //          <div class="fit-selection-chip selected" data-value="card">Card</div>
  //        </div>

  function initSelection(group) {
    if (group._fitSelection) return;
    group._fitSelection = true;

    const mode = group.getAttribute('data-fit-selection') || 'single';
    const chips = group.querySelectorAll('.fit-selection-chip');

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (mode === 'single') {
          chips.forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
        } else {
          chip.classList.toggle('selected');
        }
        group.dispatchEvent(new CustomEvent('fit:selection', {
          bubbles: true,
          detail: {
            values: Array.from(group.querySelectorAll('.selected'))
              .map(c => c.getAttribute('data-value') || c.textContent.trim()),
          },
        }));
      });
    });
  }

  // ============================================================
  // DAY STRIP (horizontal wheel)
  // ============================================================
  // Usage: <div data-fit-day-strip
  //             data-month="4" data-year="2026"
  //             data-today="7" data-selected="7">
  //          <div class="fit-day-strip-inner"></div>
  //        </div>

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function initDayStrip(strip) {
    if (strip._fitDayStrip) return;
    strip._fitDayStrip = true;

    const month = parseInt(strip.getAttribute('data-month') || '4') - 1;
    const year = parseInt(strip.getAttribute('data-year') || '2026');
    const today = parseInt(strip.getAttribute('data-today') || '7');
    const selected = parseInt(strip.getAttribute('data-selected') || today);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const inner = strip.querySelector('.fit-day-strip-inner');
    if (!inner) return;
    inner.innerHTML = '';

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayName = DAYS[date.getDay()];
      const chip = document.createElement('div');
      chip.className = 'fit-day-chip' + (d === today ? ' today' : '') + (d === selected ? ' selected' : '');
      chip.dataset.day = d;
      // Event dots — check data-events attribute (format: "10:pg,12:p,15:e,18:g")
      var eventsAttr = strip.dataset.events || '';
      var dayEvents = {};
      if (eventsAttr) {
        eventsAttr.split(',').forEach(function(entry) {
          var parts = entry.split(':');
          if (parts.length === 2) dayEvents[parseInt(parts[0])] = parts[1];
        });
      }
      var dots = '';
      if (dayEvents[d]) {
        var types = dayEvents[d];
        dots = '<span class="fit-day-chip-dots">';
        if (types.indexOf('p') !== -1) dots += '<span class="fit-day-chip-dot personal"></span>';
        if (types.indexOf('g') !== -1) dots += '<span class="fit-day-chip-dot group"></span>';
        if (types.indexOf('e') !== -1) dots += '<span class="fit-day-chip-dot external"></span>';
        dots += '</span>';
      } else {
        dots = '<span class="fit-day-chip-dots"></span>';
      }
      chip.innerHTML = `<span class="fit-day-chip-name">${dayName}</span><span class="fit-day-chip-num">${d}</span>${dots}`;
      chip.addEventListener('click', () => selectDay(strip, d));
      inner.appendChild(chip);
    }

    // Center on selected day after render
    requestAnimationFrame(() => centerDay(strip, selected, false));
  }

  function selectDay(strip, d) {
    strip.querySelectorAll('.fit-day-chip').forEach(c => c.classList.remove('selected'));
    const chip = strip.querySelector(`[data-day="${d}"]`);
    if (chip) chip.classList.add('selected');
    centerDay(strip, d, true);

    strip.dispatchEvent(new CustomEvent('fit:day-select', {
      bubbles: true,
      detail: { day: d },
    }));
  }

  function centerDay(strip, d, smooth) {
    const chip = strip.querySelector(`[data-day="${d}"]`);
    if (!chip) return;
    const chipCenter = chip.offsetLeft + chip.offsetWidth / 2;
    const scrollTo = chipCenter - strip.offsetWidth / 2;
    strip.scrollTo({
      left: scrollTo,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }

  // Today button helper
  window.fitDayStripToday = function (stripId) {
    const strip = document.getElementById(stripId) || document.querySelector('[data-fit-day-strip]');
    if (!strip) return;
    const today = parseInt(strip.getAttribute('data-today') || '7');
    selectDay(strip, today);
  };

  // ============================================================
  // STEPPER (± number input)
  // ============================================================
  // Usage: <div data-fit-stepper data-min="1" data-max="50" data-value="10">
  //          <button class="fit-stepper-btn" data-dir="-1">−</button>
  //          <div class="fit-stepper-value"><span data-stepper-display>10</span> athletes</div>
  //          <button class="fit-stepper-btn" data-dir="1">+</button>
  //        </div>

  function initStepper(el) {
    if (el._fitStepper) return;
    el._fitStepper = true;

    let value = parseInt(el.getAttribute('data-value') || '10');
    const min = parseInt(el.getAttribute('data-min') || CFG.stepper.min);
    const max = parseInt(el.getAttribute('data-max') || CFG.stepper.max);
    const display = el.querySelector('[data-stepper-display]');

    function update(newVal) {
      value = Math.max(min, Math.min(max, newVal));
      if (display) display.textContent = value;
      el.setAttribute('data-value', value);
      el.dispatchEvent(new CustomEvent('fit:stepper', {
        bubbles: true,
        detail: { value },
      }));
    }

    el.querySelectorAll('.fit-stepper-btn').forEach(btn => {
      const dir = parseInt(btn.getAttribute('data-dir') || '1');
      let holdTimer, holdInterval;

      function startHold() {
        update(value + dir);
        holdTimer = setTimeout(() => {
          holdInterval = setInterval(() => update(value + dir), CFG.stepper.holdInterval);
        }, CFG.stepper.holdDelay);
      }

      function stopHold() {
        clearTimeout(holdTimer);
        clearInterval(holdInterval);
      }

      btn.addEventListener('mousedown', (e) => { e.preventDefault(); startHold(); });
      btn.addEventListener('mouseup', stopHold);
      btn.addEventListener('mouseleave', stopHold);
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); startHold(); });
      btn.addEventListener('touchend', stopHold);
    });
  }

  // ============================================================
  // SYNC BUTTON (rotation animation)
  // ============================================================
  // Usage: <button data-fit-sync>...</button>

  function initSync(btn) {
    if (btn._fitSync) return;
    btn._fitSync = true;

    btn.addEventListener('click', () => {
      const svg = btn.querySelector('svg');
      if (!svg) return;
      svg.style.transition = `transform ${dur(600)}ms ease`;
      svg.style.transform = 'rotate(360deg)';
      setTimeout(() => {
        svg.style.transition = 'none';
        svg.style.transform = '';
      }, dur(650));

      btn.dispatchEvent(new CustomEvent('fit:sync', { bubbles: true }));
    });
  }

  // ============================================================
  // COUNTER (auto-update from toggles)
  // ============================================================
  // Usage: <span data-fit-counter
  //              data-count-selector=".fit-participant.paid"
  //              data-total-selector=".fit-participant">0 / 0</span>

  function updateCounters(root) {
    root.querySelectorAll('[data-fit-counter]').forEach(counter => {
      const countSel = counter.getAttribute('data-count-selector');
      const totalSel = counter.getAttribute('data-total-selector');
      const scope = counter.closest('.fit-phone-content') || counter.closest('.fit-phone') || document;
      const count = scope.querySelectorAll(countSel).length;
      const total = scope.querySelectorAll(totalSel).length;
      counter.textContent = `${count} / ${total}`;
    });
  }

  // ============================================================
  // INIT ALL
  // ============================================================
  function initAll(root) {
    root.querySelectorAll('[data-fit-swipe]').forEach(initSwipe);
    root.querySelectorAll('.fit-sheet-overlay').forEach(initSheet);
    root.querySelectorAll('[data-fit-toggle]').forEach(initToggle);
    root.querySelectorAll('[data-fit-selection]').forEach(initSelection);
    root.querySelectorAll('[data-fit-day-strip]').forEach(initDayStrip);
    root.querySelectorAll('[data-fit-stepper]').forEach(initStepper);
    root.querySelectorAll('[data-fit-sync]').forEach(initSync);
    updateCounters(root);

    // Listen for toggle events to update counters
    root.addEventListener('fit:toggle', () => updateCounters(root));
    root.addEventListener('fit:swipe-left', () => {
      setTimeout(() => updateCounters(root), CFG.swipe.removeDuration + 50);
    });
  }

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll(document));
  } else {
    initAll(document);
  }

  // Watch for dynamically added elements
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) initAll(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ============================================================
  // EVENT SHEET — dynamic injection helper
  //
  // Opens the unified event-detail sheet anywhere in the app.
  // CSS contract lives in fit-ui.css (.fit-sheet, .fit-sheet-status-header,
  // .fit-sheet-descriptor, .fit-sheet-footer-variant.ev-*).
  //
  // Usage:
  //   FitUI.openEventSheet(containerOrEl, {
  //     state:    'planned',  // planned | request | awaiting | review | missed | finished
  //     event: {
  //       athleteName: 'Anna K.',
  //       athleteInitials: 'AK',
  //       title:     'Basketball Training',
  //       time:      '08:00 – 09:00',
  //       location:  'TNT Studio',
  //       price:     '€50',
  //       payment:   'Card',           // 'Cash' | 'Card' — optional
  //       descriptor:'Confirmed session' // optional override
  //     },
  //     onAction: (action) => { /* action = 'reschedule' | 'cancel' | 'accept' | ... */ }
  //   });
  //
  // container: the .fit-phone element or any element to mount the sheet into.
  //            If null, uses the nearest .fit-phone of document.activeElement.
  // ============================================================

  const EVENT_STATES = {
    planned:  { descriptor: 'Confirmed session',              pill: null },
    request:  { descriptor: 'Athlete requested this session', pill: { text: 'Request',  mod: 'request'  } },
    awaiting: { descriptor: "Waiting for athlete's response", pill: { text: 'Awaiting', mod: 'awaiting' } },
    review:   { descriptor: 'Session ended — complete it',    pill: { text: 'Review',   mod: 'review'   } },
    missed:   { descriptor: 'Marked as missed',               pill: { text: 'Missed',   mod: 'missed'   } },
    finished: { descriptor: 'Completed',                      pill: null }
  };

  function buildEventSheetHTML(opts) {
    const ev = opts.event || {};
    const state = opts.state || 'planned';
    const meta = EVENT_STATES[state] || EVENT_STATES.planned;
    const descriptor = ev.descriptor || meta.descriptor;
    const pillHTML = meta.pill
      ? `<span class="fit-cal-event-pill fit-cal-event-pill--${meta.pill.mod}">${meta.pill.text}</span>`
      : '';
    const badgeHTML = ev.payment
      ? `<span class="fit-badge fit-badge-neutral">${ev.payment}</span>`
      : '';

    return `
<div class="fit-sheet-overlay fit-event-sheet-overlay" data-fit-event-sheet>
  <div class="fit-sheet" data-event-state="${state}">
    <div class="fit-sheet-handle"></div>
    <div class="fit-sheet-status-header">
      <div class="fit-sheet-descriptor">${descriptor}</div>
      ${pillHTML}
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;cursor:pointer;" data-fit-ev-person>
      <div style="width:44px;height:44px;border-radius:50%;background:var(--fit-gray-600);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:500;color:var(--fit-white);flex-shrink:0;">${ev.athleteInitials || '?'}</div>
      <div style="flex:1;">
        <div style="font-size:16px;font-weight:500;color:var(--fit-text-primary);">${ev.athleteName || 'Athlete'}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fit-text-tertiary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M9 18l6-6-6-6"/></svg>
    </div>
    <div style="font-size:18px;font-weight:600;color:var(--fit-text-primary);margin-bottom:12px;">${ev.title || ''}</div>
    <div style="display:flex;align-items:center;gap:6px;font-size:14px;color:var(--fit-text-secondary);margin-bottom:12px;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
      ${ev.time || ''}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;">
      <div style="display:flex;align-items:center;gap:6px;font-size:14px;color:var(--fit-brand-primary);">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
        ${ev.location || ''}
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:14px;font-weight:500;color:var(--fit-teal-500);">${ev.price || ''}</span>
        ${badgeHTML}
      </div>
    </div>
    <div class="fit-sheet-footer-variant ev-planned">
      <button style="width:50px;height:50px;border:none;border-radius:99px;background:var(--fit-surface-high);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;" data-ev-action="message">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--fit-brand-primary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      </button>
      <button class="fit-btn fit-btn-secondary" style="flex:1;height:50px;font-size:16px;" data-ev-action="reschedule">Reschedule</button>
      <button class="fit-btn fit-btn-destructive" style="flex:1;height:50px;font-size:16px;" data-ev-action="cancel">Cancel</button>
    </div>
    <div class="fit-sheet-footer-variant ev-request">
      <button class="fit-btn fit-btn-destructive" style="flex:1;height:50px;font-size:16px;" data-ev-action="decline">Decline</button>
      <button class="fit-btn fit-btn-primary" style="flex:1;height:50px;font-size:16px;" data-ev-action="accept">Accept</button>
    </div>
    <div class="fit-sheet-footer-variant ev-awaiting">
      <button class="fit-btn fit-btn-destructive--low" style="flex:1;height:50px;font-size:16px;" data-ev-action="cancel-request">Cancel request</button>
    </div>
    <div class="fit-sheet-footer-variant ev-review">
      <button class="fit-btn fit-btn-primary" style="flex:1;height:50px;font-size:16px;" data-ev-action="complete">Complete training</button>
    </div>
    <div class="fit-sheet-footer-variant ev-missed">
      <button class="fit-btn fit-btn-secondary" style="flex:1;height:50px;font-size:16px;" data-ev-action="reschedule">Reschedule</button>
    </div>
    <div class="fit-sheet-footer-variant ev-finished">
      <button class="fit-btn fit-btn-secondary" style="flex:1;height:50px;font-size:16px;" data-ev-action="view-history">View history</button>
    </div>
  </div>
</div>`.trim();
  }

  function openEventSheet(container, opts) {
    if (!opts) { opts = container; container = null; }
    const host = container || document.querySelector('.fit-phone.active') || document.querySelector('.fit-phone');
    if (!host) return null;

    // Clean up any previously-injected sheet in this host
    host.querySelectorAll('[data-fit-event-sheet]').forEach(function(el){ el.remove(); });

    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildEventSheetHTML(opts);
    const overlay = wrapper.firstElementChild;
    host.appendChild(overlay);

    // Dismiss on overlay background tap
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) close();
    });
    // Action button handlers
    overlay.querySelectorAll('[data-ev-action]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const action = btn.getAttribute('data-ev-action');
        close();
        if (typeof opts.onAction === 'function') opts.onAction(action);
      });
    });

    // Show
    requestAnimationFrame(function() { overlay.classList.add('visible'); });

    function close() {
      overlay.classList.remove('visible');
      setTimeout(function(){ overlay.remove(); }, 250);
    }

    return { close: close, element: overlay };
  }

  // ============================================================
  // HASH ROUTING
  // ============================================================
  // Hooks into the page-level go() function to sync screen id ↔ URL hash.
  // - go('s-foo', btn) → URL becomes  …page.html#s-foo
  // - Opening a URL with #s-foo     → activates that screen on load
  // - Browser back/forward          → switches screens via popstate
  //
  // Works automatically: wraps window.go() once on DOMContentLoaded.
  // No changes needed in individual HTML files.

  function initHashRouting() {
    // Only activate if the page defines go()
    if (typeof window.go !== 'function') return;

    var originalGo = window.go;

    // Some pages define go(id, btn) without a null-guard on btn — when we restore
    // from a hash / popstate there may be no matching sidebar button (sub-screens).
    // Swallow the resulting throw so navigation never breaks (screen still switches;
    // only the sidebar highlight may lag on those pages).
    function safeGo(id, btn) {
      try { originalGo(id, btn); } catch (e) { /* page go() not null-safe — ignore */ }
    }
    // history API can throw on file:// (opaque origin) in some browsers — guard so a
    // blocked pushState never breaks the actual screen switch. URL just won't sync there.
    function safeHistory(method, id) {
      try { history[method]({ fitScreen: id }, '', '#' + id); } catch (e) { /* URL sync unavailable */ }
    }

    window.go = function (id, btn) {
      originalGo(id, btn);
      // Push hash (skip if we're already on this screen to avoid duplicate entries)
      if (location.hash === '#' + id) return;
      safeHistory('pushState', id);
    };

    // Restore screen from hash on page load
    var hash = location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
      // Find matching sidebar button
      var sidebarBtn = document.querySelector('.sidebar button[onclick*="\'' + hash + '\'"]');
      safeGo(hash, sidebarBtn);
      safeHistory('replaceState', hash);
    }

    // Handle browser back / forward
    window.addEventListener('popstate', function (e) {
      var screenId = (e.state && e.state.fitScreen) || location.hash.replace('#', '');
      if (screenId && document.getElementById(screenId)) {
        var sidebarBtn = document.querySelector('.sidebar button[onclick*="\'' + screenId + '\'"]');
        safeGo(screenId, sidebarBtn);
      }
    });
  }

  // Init hash routing after a tick — let page scripts define go() first
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(initHashRouting, 0);
    });
  } else {
    setTimeout(initHashRouting, 0);
  }

  // Expose for manual init
  window.FitUI = {
    initAll,
    selectDay: fitDayStripToday,
    updateCounters,
    openEventSheet: openEventSheet
  };
})();
