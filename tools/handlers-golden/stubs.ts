// What the bundle of harness.mjs resolves, for ANY module in it, in place of sonner, the analytics
// facade and canvas/transformUtils.ts (handlers sprint, v3.26.60). Same stand-ins as the ones
// harness.mjs puts in place of StrataCanvas.tsx's own imports: this covers a module the handlers
// were moved to, which imports those three by itself.
import { __stubs } from './runtime';

export const toast = __stubs.toast;
export const analytics = __stubs.analytics;
export const getLayerBoundingBox = __stubs.getLayerBoundingBox;
