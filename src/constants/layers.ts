// Layer and history constants of the document model. Out of StrataContext.tsx (v3.26.12), which
// re-exports them. No imports on purpose: the render, export and utils modules that only need a
// number take it from here without pulling the reducer. Eight of them used to keep their own copy
// of BASE_DEPTH_STEP for that reason.
export const BASE_DEPTH_STEP = 150;
export const MAX_LAYERS = 10;
export const MAX_HISTORY_STEPS = 50; // History limit
