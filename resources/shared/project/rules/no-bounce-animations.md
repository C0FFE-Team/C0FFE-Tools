# No Bouncy Entrance Animations

STRICTLY FORBIDDEN: any entrance/appear animation that bounces, overshoots, wobbles, or shakes as an element comes into view.

## What is banned
- Screens, modals, bottom sheets, popovers, toasts, lists, cards, pills, chips, buttons, badges — **when they appear**, they must NOT bounce, spring, overshoot, scale-in with elastic, or wobble into place.
- No `withSpring` (Reanimated), spring physics, `BounceIn`, `ZoomIn` with overshoot, elastic/back easing (`Easing.elastic`, `Easing.back`, `Easing.bounce`), or any `LayoutAnimation` spring preset for **entrances**.
- No scale-from-0 pop, no "jelly"/rubber-band settle, no oscillation.

## What to use instead
- Entrances: a clean, quick **fade** (opacity) and/or a small **slide** using `withTiming` with an ease-out curve (`Easing.out(Easing.cubic)` or similar). The element settles directly into its final position with **zero overshoot**. Keep it subtle and fast (≈180–260ms). Prefer no motion over bad motion.
- Never let a container's layout stretch/distort a child during a transition (constrain sizes; use `alignItems: 'center'`, avoid stretch, keep horizontal strips `flexGrow: 0`).

## What is still allowed
- **Interactive** micro-feedback (press/tap scale-down, drag follow, active-tab indicator) may use springs, but must be tight and must NOT visibly overshoot or oscillate.
- Continuous/ambient motion (loaders, skeletons shimmer) is fine.

## Rule of thumb
If an element "arrives and then bounces/settles/wobbles," it's wrong. Elements should arrive and **stop**.
