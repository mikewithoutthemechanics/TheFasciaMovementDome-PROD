# Mobile Optimization Task List

> **Last Updated:** 2026-03-14  
> **Project:** Pause Fascia Movement Dome - Client-Facing App  
> **Status:** Active Development

---

## ✅ Recently Completed

- **Onboarding Credit Section Polish** (2026-03-14)
  - Removed `opacity-60` disabled look from credit packages
  - Added styled contact card with MailIcon when payments disabled
  - Added bonus credit badges matching ClientApp design
  - Added interactive hover states when payments enabled
  - File: `screens/OnboardingScreen.tsx` lines 205-260

---

## 📋 Task Overview

This document tracks mobile optimization tasks for the client-facing booking app. Tasks are prioritized by impact and organized for parallel execution where possible.

---

## 🎯 Priority Matrix

| Priority | Criteria | Response Time |
|----------|----------|---------------|
| **CRITICAL** | Accessibility, usability blockers | Immediate |
| **HIGH** | Core mobile UX, performance | This sprint |
| **MEDIUM** | Enhanced mobile experience | Next sprint |
| **LOW** | Nice-to-have improvements | Backlog |

---

## 🚀 Active Tasks

### CRITICAL Priority

#### Task 1: Replace Emoji Achievement Icons with SVG
- **File:** `screens/ClientApp.tsx` (lines 690-693)
- **Issue:** Uses emojis (🌱 🔥 ⭐ 👑) as icons - violates design guidelines
- **Solution:** Replace with Heroicons/Lucide SVG components
- **Prerequisites:** None
- **Test:** Verify all 4 achievement badges render with SVG icons
- **Status:** ✅ Completed

#### Task 2: Add cursor-pointer to Interactive Elements
- **Files:** Multiple components in `screens/ClientApp.tsx`
- **Issue:** Missing cursor-pointer on buttons decreases desktop UX
- **Solution:** Add CSS rule in `index.css` to add cursor:pointer to buttons on desktop
- **Prerequisites:** None
- **Test:** Hover over all buttons - cursor should change
- **Status:** ✅ Completed

---

### HIGH Priority

#### Task 3: Add Mobile Bottom Tab Navigation
- **File:** `screens/ClientApp.tsx`
- **Issue:** No persistent navigation - users rely on back button
- **Solution:** Add fixed bottom tab bar with 4 tabs: Classes, Bookings, Messages, Profile
- **Implementation:**
  ```tsx
  // Add to ClientApp render
  <nav className="fixed bottom-0 left-0 right-0 bg-[#FBF7EF]/95 backdrop-blur-lg border-t border-[#26150B]/5 pb-safe z-50">
    <div className="flex justify-around items-center h-16">
      {/* Tabs with active state */}
    </div>
  </nav>
  ```
- **Prerequisites:** None
- **Test:** Navigate via bottom tabs on mobile device
- **Status:** ✅ Completed (implemented in ClientApp.tsx lines 2528-2556)

#### Task 4: Enhance PWA Offline Support
- **File:** `sw.js`, `screens/ClientApp.tsx`
- **Issue:** Basic service worker - no offline class viewing
- **Solution:** 
  - Cache class data for offline viewing
  - Queue registrations when offline
  - Show offline indicator banner
- **Prerequisites:** None
- **Test:** Enable airplane mode, verify app loads cached data
- **Status:** ✅ Completed

---

### MEDIUM Priority

#### Task 5: Implement Skeleton Loading States
- **Files:** `screens/ClientApp.tsx`, components
- **Issue:** Only spinner shown during load
- **Solution:** Add skeleton components for:
  - Class cards (3-5 skeletons)
  - Profile stats
  - Bookings list
- **Implementation:**
  ```tsx
  // Use existing skeleton-shimmer class from index.css
  <div className="skeleton-shimmer h-32 rounded-2xl" />
  ```
- **Prerequisites:** None
- **Test:** Slow network throttling shows skeletons
- **Status:** ✅ Completed

#### Task 6: Add Pull-to-Refresh
- **Files:** `screens/ClientApp.tsx`, `App.tsx`
- **Issue:** No native pull-to-refresh on class listings
- **Solution:** Implemented touch event handlers on main content area + refresh callback
- **Prerequisites:** Task 3 (bottom nav) should be done first
- **Test:** Pull down on classes screen refreshes list
- **Status:** ✅ Completed

#### Task 7: Form Input Improvements
- **Files:** `screens/ClientApp.tsx` (Edit Profile modal)
- **Issue:** Poor mobile keyboard experience
- **Solution:** 
  - Added `inputMode="email"` to email inputs
  - Added `inputMode="tel"` to phone inputs
  - Added `autocomplete` attributes (name, email, tel, off)
  - Set font-size: 16px to prevent iOS zoom
- **Prerequisites:** None
- **Test:** Tap inputs - correct keyboard appears, no zoom
- **Status:** ✅ Completed

#### Task 8: Add Lazy Loading to Images
- **Files:** Multiple components
- **Issue:** Images load immediately causing LCP issues
- **Solution:** Added `loading="lazy"` to all non-critical images (QR codes). Main logo intentionally uses eager loading for LCP optimization.
- **Prerequisites:** None
- **Test:** Lighthouse performance check
- **Status:** ✅ Completed

#### Task 9: Update Safe Area Padding
- **File:** `index.css`
- **Issue:** Bottom nav padding insufficient for newer iPhones
- **Solution:** Updated `.pb-mobile-nav`:
  ```css
  .pb-mobile-nav {
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 20px) + 70px);
  }
  ```
- **Prerequisites:** None
- **Test:** Test on iPhone 14/15 Pro Max with home indicator
- **Status:** ✅ Completed

---

### LOW Priority

#### Task 10: Implement Swipe Gestures
- **File:** `screens/ClientApp.tsx` (BookingsScreen)
- **Issue:** No swipe actions on bookings
- **Solution:** Add swipe-to-delete/cancel using framer-motion
- **Prerequisites:** None
- **Test:** Swipe booking left/right - action appears
- **Status:** ⏳ Pending

#### Task 11: Add Haptic Feedback
- **Files:** `screens/ClientApp.tsx`
- **Issue:** No tactile feedback on actions
- **Solution:** Added haptic feedback utility with navigator.vibrate for:
  - Light tap: 10ms (navigation, buttons)
  - Success: 50ms (save profile)
  - Applied to: Register button, Cancel booking, Save profile, Share, Bottom nav tabs
- **Prerequisites:** None
- **Test:** Perform actions - vibration feedback
- **Status:** ✅ Completed

#### Task 12: Optimize Class Cards for Mobile
- **File:** `screens/ClientApp.tsx` (ClassCard component)
- **Issue:** Gradient borders heavy on mobile GPU
- **Solution:** Use solid border on mobile, gradient on desktop
- **Implementation:**
  ```css
  /* Mobile - solid border */
  .class-card { border: 1px solid #6E7568; }
  
  /* Desktop - gradient */
  @media (min-width: 768px) {
    .class-card { border: none; }
  }
  ```
- **Prerequisites:** None
- **Test:** Check GPU usage on mobile during scroll
- **Status:** ⏳ Pending

---

## ✅ Completed Tasks

| Task | Completed Date | Notes |
|------|---------------|-------|
| PWA manifest with icons | 2026-03-13 | Full icon set, shortcuts |
| Safe area insets | 2026-03-13 | CSS variables added |
| Touch targets (44px) | 2026-03-13 | Media query implemented |
| Viewport meta | 2026-03-13 | viewport-fit=cover |
| Horizontal scroll prevention | 2026-03-13 | overflow-x: hidden |
| Reduced motion support | 2026-03-13 | prefers-reduced-motion |
| Code splitting | 2026-03-13 | React.lazy implemented |

---

## 🔄 Task Dependencies

```
Task 1 (emoji icons) ─────┐
Task 2 (cursor-pointer) ───┼──> Independent
                           │
Task 3 (bottom nav) ───────►┤
                           ├──> Can run in parallel
Task 5 (skeletons) ────────►┤
                            │
Task 6 (pull-to-refresh) ───┴──> Depends on Task 3
```

---

## 🧪 Testing Checklist

### Pre-Delivery Mobile Verification
- [ ] No horizontal scroll at 375px, 768px, 1024px
- [ ] All touch targets ≥44px
- [ ] Text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard nav
- [ ] prefers-reduced-motion respected
- [ ] iOS Safari notch handling correct
- [ ] Android navigation bar handled

### Performance Targets
- [ ] Lighthouse Mobile Score > 80
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 4s
- [ ] Cumulative Layout Shift < 0.1

---

## 📁 File Reference

| File | Purpose |
|------|---------|
| `screens/ClientApp.tsx` | Main client app with all screens |
| `screens/ClientApp.tsx` lines 690-693 | Achievement emoji icons (Task 1) |
| `screens/ClientApp.tsx` lines 2528-2556 | Bottom tab navigation (Task 3) |
| `screens/ClientApp.tsx` lines 2365-2375 | Offline indicator banner (Task 4) |
| `screens/OnboardingScreen.tsx` lines 205-260 | Credit purchase section polish |
| `index.css` | Global styles, skeleton, animations |
| `index.css` lines 355-434 | Mobile optimizations |
| `sw.js` | Service worker (Task 4) |
| `dist/manifest.json` | PWA manifest |

---

## 🚦 Running This Task List

To update task status, edit this file directly. Use these status markers:

- ⏳ Pending - Not started
- 🔄 In Progress - Currently working
- ✅ Completed - Finished and tested
- ⛔ Blocked - Waiting on dependency

---

## 📞 Quick Commands

```bash
# Check current task status
cat docs/mobile-optimization-tasks.md | grep "Status:"

# Find specific task in code
grep -n "emoji\|achievement" screens/ClientApp.tsx
```
