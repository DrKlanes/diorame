// Design System Icons — Diorame v2
// Inner SVG content only. The <svg> wrapper is provided by <Ico>.
// Parent SVG sets: fill="none" stroke="currentColor" strokeWidth={1.5}
//   strokeLinecap="round" strokeLinejoin="round"
// Filled shapes (dots, etc.) must declare fill="currentColor" stroke="none" explicitly.

export const ICONS: Record<string, string> = {

	// ─── Navigation & Global ────────────────────────────────────────────
	'draw-mode':
		`<path d="M15.5 4.5L19.5 8.5M14 6L18 10L9 19H5V15L14 6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19L5.5 15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
	'view-mode':
		`<rect x="2.5" y="6.5" width="19" height="13" rx="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.5 10.5H21.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7 6.5V10.5M12 6.5V10.5M17 6.5V10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
	'hide-ui':
		`<path d="M3 12C3 12 6 6.5 12 6.5C18 6.5 21 12 21 12C21 12 18 17.5 12 17.5C6 17.5 3 12 3 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M4 4L20 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
	'sun':
		`<path d="M12 4V6M12 18V20M4 12H6M18 12H20M6.2 6.2L7.6 7.6M16.4 16.4L17.8 17.8M6.2 17.8L7.6 16.4M16.4 7.6L17.8 6.2M15.6 12C15.6 13.99 13.99 15.6 12 15.6C10.01 15.6 8.4 13.99 8.4 12C8.4 10.01 10.01 8.4 12 8.4C13.99 8.4 15.6 10.01 15.6 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'moon':
		`<path d="M18.45 13.65C16.95 16.65 13.95 18.65 10.95 18.45C6.45 18.15 4.15 12.85 6.45 9.15C8.15 6.45 10.95 5.15 13.45 5.65C10.95 7.65 10.75 11.85 12.95 13.65C14.45 14.85 16.75 14.85 18.45 13.65Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'chevron-left':
		`<path d="M14 7L9 12L14 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'chevron-right':
		`<path d="M10 7L15 12L10 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'chevron-up':
		`<path d="M7 14L12 9L17 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'chevron-down':
		`<path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,

	// ─── Export ──────────────────────────────────────────────────────────
	'snapshot':
		`<path d="M9 4.5H15L16.5 6.5H19.5C20.1 6.5 20.5 6.9 20.5 7.5V17.5C20.5 18.1 20.1 18.5 19.5 18.5H4.5C3.9 18.5 3.5 18.1 3.5 17.5V7.5C3.5 6.9 3.9 6.5 4.5 6.5H7.5L9 4.5ZM12 15.5C13.93 15.5 15.5 13.93 15.5 12C15.5 10.07 13.93 8.5 12 8.5C10.07 8.5 8.5 10.07 8.5 12C8.5 13.93 10.07 15.5 12 15.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'record':
		`<path d="M4.5 7.5H14.5V16.5H4.5C3.95 16.5 3.5 16.05 3.5 15.5V8.5C3.5 7.95 3.95 7.5 4.5 7.5ZM14.5 10.5L19.5 8V16L14.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,

	// ─── FX ──────────────────────────────────────────────────────────────
	'fx-grain':
		`<circle cx="7" cy="8" r="1" fill="currentColor"/>` +
		`<circle cx="13" cy="6" r="1" fill="currentColor"/>` +
		`<circle cx="18" cy="9" r="1" fill="currentColor"/>` +
		`<circle cx="5" cy="14" r="1" fill="currentColor"/>` +
		`<circle cx="10" cy="12" r="1" fill="currentColor"/>` +
		`<circle cx="16" cy="13" r="1" fill="currentColor"/>` +
		`<circle cx="8" cy="18" r="1" fill="currentColor"/>` +
		`<circle cx="14" cy="17" r="1" fill="currentColor"/>` +
		`<circle cx="19" cy="16" r="1" fill="currentColor"/>` +
		`<circle cx="11" cy="19" r="1" fill="currentColor"/>`,
	'fx-vignette':
		`<path d="M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0" stroke="currentColor" stroke-width="0.75" stroke-linecap="round" opacity="0.45"/>`,
	'fx-chroma':
		`<circle cx="10" cy="12" r="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="14" cy="12" r="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>`,
	'fx-fog':
		`<path d="M4 10C6 9 8 11 10 10C12 9 14 11 16 10C18 9 20 11 21 10M4 14C6 13 8 15 10 14C12 13 14 15 16 14C18 13 20 15 21 14M6 18C8 17 10 19 12 18C14 17 16 19 18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'fx-glow':
		`<path d="M12 5V3M12 21V19M5 12H3M21 12H19M7.05 7.05L5.64 5.64M18.36 18.36L16.95 16.95M7.05 16.95L5.64 18.36M18.36 5.64L16.95 7.05M12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
	'fx-riso':
		`<circle cx="9.5" cy="13.5" r="5" stroke="currentColor" stroke-width="1.5"/><circle cx="14.5" cy="13.5" r="5" stroke="currentColor" stroke-width="1.5" opacity="0.5"/><circle cx="12" cy="9.5" r="5" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>`,
	'fx-distortion':
		`<path d="M4 8C6 7 7 9.5 9 9C11 8.5 11 6 13 6.5C15 7 15 9.5 17 9C19 8.5 20 7 21 8M4 14C5.5 13 7 16 9 15C11 14 11 12 13 12.5C15 13 16 15.5 18 15C19.5 14.5 20.5 13 21 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
	'fx-wiggle':
		`<path d="M3 12C4.5 9 6 15 7.5 12C9 9 10.5 15 12 12C13.5 9 15 15 16.5 12C18 9 19.5 15 21 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'fx-grunge':
		`<path d="M5 6L7 9M9 5L8 8M12 4L11 7M15 5L14 8M18 6L16 9M6 13L4 16M8 11L6 14M11 10L10 13M14 11L13 14M17 12L15 15M19 10L17 13M7 18L9 15M12 19L13 16M16 18L17 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
	'fx-particles':
		`<circle cx="6" cy="9" r="1.2" fill="currentColor"/>` +
		`<circle cx="12" cy="5" r="0.9" fill="currentColor"/>` +
		`<circle cx="17" cy="8" r="1.4" fill="currentColor"/>` +
		`<circle cx="4" cy="15" r="0.8" fill="currentColor"/>` +
		`<circle cx="9" cy="14" r="1.3" fill="currentColor"/>` +
		`<circle cx="15" cy="13" r="0.7" fill="currentColor"/>` +
		`<circle cx="19" cy="17" r="1.1" fill="currentColor"/>` +
		`<circle cx="7" cy="19" r="0.9" fill="currentColor"/>` +
		`<circle cx="13" cy="18" r="1.2" fill="currentColor"/>`,
	'fx-dof':
		`<ellipse cx="12" cy="12" rx="8" ry="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="12" cy="12" rx="4" ry="2.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.5"/><line x1="4" y1="12" x2="2" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="20" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
	'fx-pixel':
		`<rect x="4" y="4" width="5" height="5" fill="currentColor" stroke="none"/>` +
		`<rect x="10" y="4" width="5" height="5" fill="currentColor" stroke="none" opacity="0.4"/>` +
		`<rect x="16" y="4" width="4" height="5" fill="currentColor" stroke="none"/>` +
		`<rect x="4" y="10" width="5" height="5" fill="currentColor" stroke="none" opacity="0.4"/>` +
		`<rect x="10" y="10" width="5" height="5" fill="currentColor" stroke="none"/>` +
		`<rect x="16" y="10" width="4" height="5" fill="currentColor" stroke="none" opacity="0.4"/>` +
		`<rect x="4" y="16" width="5" height="4" fill="currentColor" stroke="none" opacity="0.4"/>` +
		`<rect x="10" y="16" width="5" height="4" fill="currentColor" stroke="none"/>` +
		`<rect x="16" y="16" width="4" height="4" fill="currentColor" stroke="none" opacity="0.4"/>`,

	// ─── Camera Presets ──────────────────────────────────────────────────
	'cam-forward':
		`<path d="M12 19V8M12 5V8M12 8L8 12M12 8L16 12M5 16C5 17.1 5.9 18 7 18H17C18.1 18 19 17.1 19 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'cam-spiral':
		`<path d="M12 12C12 12 14 10 14 8C14 6 12 5 10 6C8 7 7 9.5 8 12C9 14.5 12 16 14.5 15.5C17 15 18.5 12.5 18 10C17.5 7.5 15 5.5 12 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'cam-yoyo':
		`<path d="M12 4V20M9 7L12 4L15 7M9 17L12 20L15 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'cam-pulse':
		`<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>` +
		`<circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="1" opacity="0.5"/>` +
		`<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="0.75" opacity="0.25"/>`,
	'cam-twist':
		`<path d="M12 4C8.69 4 6 6.69 6 10C6 13 8 14.5 10 15.5M12 20C15.31 20 18 17.31 18 14C18 11 16 9.5 14 8.5M10 15.5C11 16 12 17 12 20M14 8.5C13 8 12 7 12 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'cam-arc':
		`<path d="M4 12C4 12 7 7 12 7C17 7 20 12 20 12M4 12C4 12 7 17 12 17C17 17 20 12 20 12M8 12H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'cam-crane':
		`<path d="M12 19V5M12 5L6 11M12 5L18 11M5 19H19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'cam-truck':
		`<path d="M5 12H19M5 12L9 8M5 12L9 16M19 12L15 8M19 12L15 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'cam-orbit':
		`<path d="M20 12C20 16.42 16.42 20 12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C14.1 4 16 4.78 17.46 6.07M20 4L17.46 6.07M17.46 6.07L17 9.5L20.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'cam-zoom':
		`<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M20 20L16.65 16.65M8 11H14M11 8V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,

	// ─── Camera Controls ─────────────────────────────────────────────────
	'ctrl-speed':
		`<path d="M5 18C5 14.13 8.13 11 12 11C15.87 11 19 14.13 19 18M12 11V8M9 9L12 11L15 9M12 18L15.5 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'ctrl-handshake':
		`<path d="M6 9L4 11L9 16L11 14M18 15L20 13L15 8L13 10M11 14L10 15.5M13 10L14 8.5M11 14L13 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'ctrl-handshake-off':
		`<path d="M6 9L4 11L9 16L11 14M18 15L20 13L15 8L13 10M11 14L10 15.5M13 10L14 8.5M11 14L13 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>`,
	'ctrl-focal':
		`<path d="M4 8H8L10 5H14L16 8H20M4 8V18H20V8M12 16C13.66 16 15 14.66 15 13C15 11.34 13.66 10 12 10C10.34 10 9 11.34 9 13C9 14.66 10.34 16 12 16Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'ctrl-distance':
		`<path d="M4 12H20M4 12L7 9M4 12L7 15M20 12L17 9M20 12L17 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'ctrl-spacing':
		`<path d="M4 6H20M4 10H20M4 14H20M4 18H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/><path d="M4 8H20M4 16H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
	'ctrl-dof-free':
		`<path d="M3 12H7M17 12H21M7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17C9.24 17 7 14.76 7 12ZM12 10V12L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'ctrl-dof-lock':
		`<path d="M12 5V8M12 16V19M5 12H8M16 12H19M8.5 8.5L10.5 10.5M13.5 13.5L15.5 15.5M15.5 8.5L13.5 10.5M10.5 13.5L8.5 15.5M10 12C10 10.9 10.9 10 12 10C13.1 10 14 10.9 14 12C14 13.1 13.1 14 12 14C10.9 14 10 13.1 10 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,

	// ─── Brush line modes (cyclic modifier) ─────────────────────────────
	'line-tapered':
		`<path d="M2 12 Q6 8 12 8 Q18 8 22 12 Q18 16 12 16 Q6 16 2 12 Z" fill="currentColor" stroke="none"/>`,
	'line-uniform':
		`<path d="M4 12 Q8 11.7 12 12 Q16 12.3 20 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
	'line-ink':
		`<path d="M4 13 Q7 11 11 12 Q15 13 19 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="7" cy="13.5" r="1" fill="currentColor"/><circle cx="14" cy="11.5" r="0.8" fill="currentColor"/><circle cx="18" cy="12" r="0.6" fill="currentColor"/>`,

	// ─── Drawing Tools ───────────────────────────────────────────────────
	'brush':
		`<path d="M9.52 13.25C7.52 15.25 3.52 18.25 4.02 19.25C5.52 21.25 9.02 16.75 11.02 14.75M16.02 13.25L10.89 8.38L9.44 9.84C8.65 10.62 8.65 11.88 9.44 12.66L11.61 14.84C12.39 15.62 13.65 15.62 14.44 14.84L16.02 13.25ZM16.02 13.25L20.02 9.25L15.02 4.25L10.52 8.75M14.52 8.25L16.52 6.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'eraser':
		`<path d="M12.05 19.03L5.55 19.03M10.55 8.53L16.55 12.53M12.35 18.73L18.72 10.07C19.06 9.61 18.95 8.96 18.47 8.65L13.22 5.14C12.78 4.85 12.2 4.95 11.88 5.36L5.29 13.77C4.91 14.27 5.07 14.99 5.62 15.28L12.35 18.73Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'blob':
		`<path d="M16.55 12.05L13.55 15.05M14.55 11.05L10.55 15.05M12.05 11.05L9.05 13.55M9.05 9.05C7.25 6.9 9.15 3.65 12.65 4.25C16.05 4.75 18.95 7.85 19.05 12.05C19.15 15.95 18.25 18.15 14.65 19.35C10.65 20.75 4.95 19.05 4.95 14.85C5.05 11.05 10.84 11.2 9.05 9.05Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'text':
		`<path d="M4.7 6.4C6.7 6.1 10.7 6 12.7 6C14.7 6 17.9 6 19.3 6.3M11.9 6.4C11.8 9 11.7 12 11.8 17M9.9 18C10.9 17.7 12.7 17.7 13.8 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'move':
		`<path d="M12 4V20M4 12H20M9.6 6.6L12 4.2L14.4 6.6M9.6 17.4L12 19.8L14.4 17.4M6.6 9.6L4.2 12L6.6 14.4M17.4 9.6L19.8 12L17.4 14.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'symmetry':
		`<path d="M12 3.5V20.5M4 9C6 8.5 8 9 10 10M20 9C18 8.5 16 9 14 10M19 13.08C17 13.55 15 13.03 14.01 12.02M5 12.92C7 13.44 9 12.97 10.01 11.98M14.54 16.82C12.65 16.01 10.59 16.2 9.45 17.03" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'smooth':
		`<path d="M3.5 15C6.69 10.2 10.94 8.28 15.19 9.24C18.38 10.2 19.97 12.12 20.5 15M5.7 13.95C5.7 14.34 5.39 14.65 5 14.65C4.61 14.65 4.3 14.34 4.3 13.95C4.3 13.56 4.61 13.25 5 13.25C5.39 13.25 5.7 13.56 5.7 13.95ZM10.1 11.15C10.1 11.65 9.7 12.05 9.2 12.05C8.7 12.05 8.3 11.65 8.3 11.15C8.3 10.65 8.7 10.25 9.2 10.25C9.7 10.25 10.1 10.65 10.1 11.15ZM14.3 10.45C14.3 11.06 13.81 11.55 13.2 11.55C12.59 11.55 12.1 11.06 12.1 10.45C12.1 9.84 12.59 9.35 13.2 9.35C13.81 9.35 14.3 9.84 14.3 10.45ZM17.5 12.15C17.5 12.59 17.14 12.95 16.7 12.95C16.26 12.95 15.9 12.59 15.9 12.15C15.9 11.71 16.26 11.35 16.7 11.35C17.14 11.35 17.5 11.71 17.5 12.15Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'organic':
		`<path d="M4 10.5C6 6.5 8 14.5 10 10.5C12 6.5 14 14.5 16 10.5C18 6.5 19 11.5 20 10.5M4.5 14.5C6.5 12.5 9 16.5 11 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'draw-behind':
		`<path d="M13.6 10.22C14.1 7.72 12.1 5.22 9.6 4.72C7.1 4.22 4.1 5.22 4.1 7.72C4.1 10.72 6.1 12.72 9.1 12.72M10.1 11.72C10.1 9.22 13.1 8.22 15.6 8.72C19.1 9.72 20.6 13.22 19.6 16.22C18.6 19.22 14.1 20.22 11.1 18.72C8.6 17.42 8.6 13.72 10.1 11.72Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'draw-inside':
		`<path d="M8.37 11.05L11.37 14.05M10.37 10.05L14.37 14.05M12.87 10.05L15.87 12.55M4.87 10.05C4.87 5.05 10.87 4.05 13.87 5.05C17.87 6.05 19.87 10.05 18.87 14.05C17.87 18.05 12.87 20.05 8.87 19.05C4.87 18.05 4.87 14.05 4.87 10.05Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'rotate':
		`<path d="M19.2 11.85C19.1 15.65 16 19.05 12 19.15C8 19.25 4.8 16.05 4.8 12.05C4.8 8.05 8.1 4.85 12 4.85C14.8 4.85 17.2 6.35 18.6 8.55M19.2 5.05L18.8 8.85L15 8.35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,

	// ─── File Operations ─────────────────────────────────────────────────
	'new':
		`<path d="M13.75 4.5H5.75V19.5H18.25V9M13.75 4.5L18.25 9M13.75 4.5V9H18.25M8.75 14H14.75M11.75 11V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'open':
		`<path d="M3.86 6.5C3.86 5.5 4.86 5 5.86 5H9.36L11.06 6.7H18.86C19.76 6.7 20.36 7.5 20.26 8.5L19.36 17.5C19.26 18.4 18.36 19 17.36 19H5.36C4.36 19 3.56 18.2 3.76 17.2L3.86 6.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'save':
		`<path d="M8 5.25V9.75H15V5.55M8 13.75H16M8 16.25H14M5 5.25H16.5L19 7.75V18.75H5V5.25Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'export':
		`<path d="M12 4.5V15M12 4.5L8.4 8M12 4.5L15.6 8M5 14.5V19.5H19V14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'undo':
		`<path d="M8.9 9.7L8.4 6L4.9 9.5C9.4 8 14.4 8.2 17.4 10.5C19.9 12.5 19.4 16 17.4 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'redo':
		`<path d="M15.1 9.7L15.6 6L19.1 9.5C14.6 8 9.6 8.2 6.6 10.5C4.1 12.5 4.6 16 6.6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,

	// ─── Layer Panel ─────────────────────────────────────────────────────
	'eye':
		`<path d="M3 12C5.5 7.5 9 6 12 6C15 6 18.5 7.5 21 12C18.5 16.5 15 18 12 18C9 18 5.5 16.5 3 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14.5C13.38 14.5 14.5 13.38 14.5 12C14.5 10.62 13.38 9.5 12 9.5C10.62 9.5 9.5 10.62 9.5 12C9.5 13.38 10.62 14.5 12 14.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'eye-off':
		`<path d="M4 4L20 20M3 12C5.5 7.5 9 6 12 6C15 6 18.5 7.5 21 12C18.5 16.5 15 18 12 18C9 18 5.5 16.5 3 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'layers':
		`<path d="M12 3.5L18.5 7L12 10.5L5.5 7L12 3.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 11.5L12 15L18.5 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 16L12 19.5L18.5 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'duplicate':
		`<path d="M9 6.25H18V14.75H15M6 8.75H15V17.75H6V8.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'trash':
		`<path d="M5 7.25H19M9 4.75H15M6.5 7.25L7.5 19.25H16.5L17.5 7.25M10 10.75V16.25M14 10.75V16.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'arrow-up':
		`<path d="M12 19V5.5M7 10L12 5L17 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'arrow-down':
		`<path d="M12 5V18.5M7 14L12 19L17 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'opacity':
		`<path d="M9 15C9 17 10.5 18.3 12 18.3M12 4C8 9 6 12 6 15C6 18 8.8 20 12 20C15.2 20 18 18 18 15C18 12 16 9 12 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'plus-layer':
		`<path d="M12 5.5V18.5M5.5 12H18.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'drag':
		`<circle cx="9"  cy="7"  r="1" fill="currentColor"/>` +
		`<circle cx="15" cy="7"  r="1" fill="currentColor"/>` +
		`<circle cx="9"  cy="12" r="1" fill="currentColor"/>` +
		`<circle cx="15" cy="12" r="1" fill="currentColor"/>` +
		`<circle cx="9"  cy="17" r="1" fill="currentColor"/>` +
		`<circle cx="15" cy="17" r="1" fill="currentColor"/>`,
	'blend-normal':
		`<path d="M12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'camera':
		`<rect x="4" y="8" width="16" height="11" rx="2"/>` +
		`<path d="M9.5 8V6.5C9.5 6.22 9.72 6 10 6H14C14.28 6 14.5 6.22 14.5 6.5V8"/>` +
		`<circle cx="12" cy="13.5" r="2.5"/>`,
	'depth-far':
		`<path d="M4 7H20M7 12H17M9.5 17H14.5"/>`,

	// ─── Custom additions (not in original design set — preserved as-is) ──
	'align-left':
		`<line x1="21" y1="6"  x2="3" y2="6"/> <line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/>`,
	'align-center':
		`<line x1="18" y1="6"  x2="6" y2="6"/> <line x1="21" y1="12" x2="3" y2="12"/><line x1="16" y1="18" x2="8" y2="18"/>`,
	'align-right':
		`<line x1="21" y1="6"  x2="3" y2="6"/> <line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/>`,
	'lock':
		`<rect width="18" height="11" x="3" y="11" rx="2"/>` +
		`<path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
	'unlock':
		`<rect width="18" height="11" x="3" y="11" rx="2"/>` +
		`<path d="M7 11V7a5 5 0 0 1 9.9-1"/>`,
	'pin':
		`<path d="M9,10.76h6 M10.44,20h3.12 M9,10.76v4.01 M15,10.76v4.01 M7,14.76h10 M12,14.76v5.24"/>`,
	'pin-off':
		`<path d="M9,4h6 M9,4v4 M15,4v4 M7,8h10 M12,8v9.17"/>`,
	'flip-horizontal':
		`<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/>` +
		`<path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/>` +
		`<path d="M12 20v2M12 14v2M12 8v2M12 2v2"/>`,
	'maximize':
		`<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3"/>`,
	'minimize':
		`<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>`,
	'cloud-fog':
		`<path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24"/>` +
		`<path d="M16 17H7"/><path d="M17 21H9"/>`,
	'globe':
		`<circle cx="12" cy="12" r="10"/>` +
		`<path d="M12 2a14.5 14.5 0 0 0 0 20A14.5 14.5 0 0 0 12 2"/>` +
		`<path d="M2 12h20"/>`,
	'scan-line':
		`<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>` +
		`<path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>` +
		`<path d="M7 12h10"/>`,
	'zoom-in':
		`<circle cx="11" cy="11" r="8"/>` +
		`<path d="m21 21-4.35-4.35"/><path d="M8 11h6M11 8v6"/>`,
	'target':
		`<circle cx="12" cy="12" r="10"/>` +
		`<circle cx="12" cy="12" r="6"/>` +
		`<circle cx="12" cy="12" r="2"/>`,
	'loader':
		`<path d="M21 12a9 9 0 1 1-6.22-8.56"/>`,
	'monitor':
		`<rect width="20" height="14" x="2" y="3" rx="2"/>` +
		`<path d="M8 21h8M12 17v4"/>`,
	'tablet':
		`<rect width="16" height="20" x="4" y="2" rx="2"/>` +
		`<circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>`,
	'sparkles':
		`<path d="m12 3-1.91 5.81a2 2 0 0 1-1.28 1.28L3 12l5.81 1.91a2 2 0 0 1 1.28 1.28L12 21l1.91-5.81a2 2 0 0 1 1.28-1.28L21 12l-5.81-1.91a2 2 0 0 1-1.28-1.28z"/>` +
		`<path d="M5 3v4M19 17v4M3 5h4M17 19h4"/>`,
	'guide':
		`<circle cx="6" cy="6" r="1" fill="currentColor"/>` +
		`<circle cx="12" cy="6" r="1" fill="currentColor"/>` +
		`<circle cx="18" cy="6" r="1" fill="currentColor"/>` +
		`<circle cx="6" cy="12" r="1" fill="currentColor"/>` +
		`<circle cx="12" cy="12" r="1" fill="currentColor"/>` +
		`<circle cx="18" cy="12" r="1" fill="currentColor"/>` +
		`<circle cx="6" cy="18" r="1" fill="currentColor"/>` +
		`<circle cx="12" cy="18" r="1" fill="currentColor"/>` +
		`<circle cx="18" cy="18" r="1" fill="currentColor"/>`,
	'info':
		`<circle cx="12" cy="12" r="10"/>` +
		`<path d="M12 16v-4"/><path d="M12 8h.01"/>`,
	'check':
		`<path d="M20 6 9 17l-5-5"/>`,
	'x':
		`<path d="M18 6 6 18M6 6l12 12"/>`,
	'plus':
		`<path d="M12 5v14M5 12h14"/>`,
	'hand':
		`<path d="M8 13V5a1 1 0 0 1 2 0v4m0 0V4a1 1 0 0 1 2 0v5m0 0a1 1 0 0 1 2 0v2m0 0a1 1 0 0 1 2 0v2a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6v-2"/>`,
	'move-vertical':
		`<path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4"/>`,
	'move-horizontal':
		`<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/>`,
	'aperture':
		`<circle cx="12" cy="12" r="10"/>` +
		`<path d="m14.31 8 5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16 3.95 6.06M14.31 16H2.83m13.79-4-5.74 9.94"/>`,
	'wand':
		`<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2 19l3 3 16.36-16.36a1.21 1.21 0 0 0 0-1.72z"/>` +
		`<path d="m14 7 3 3"/>`,
	'tornado':
		`<path d="M21 4H3M18 8H6M17 12H7M14 16h-4M13 20h-2"/>`,
	'pen':
		`<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>`,
	'image':
		`<rect width="18" height="18" x="3" y="3" rx="2"/>` +
		`<circle cx="9" cy="9" r="2"/>` +
		`<path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>`,

	// ─── Animation ───────────────────────────────────────────────────────
	'play':
		`<path d="M6 4.5L19.5 12L6 19.5V4.5Z" fill="currentColor" stroke="none"/>`,
	'pause':
		`<rect x="5" y="4" width="4.5" height="16" rx="1.5" fill="currentColor" stroke="none"/>` +
		`<rect x="14.5" y="4" width="4.5" height="16" rx="1.5" fill="currentColor" stroke="none"/>`,
	'film':
		`<rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/>` +
		`<line x1="7" y1="4" x2="7" y2="20" stroke="currentColor" stroke-width="1.5"/>` +
		`<line x1="17" y1="4" x2="17" y2="20" stroke="currentColor" stroke-width="1.5"/>` +
		`<line x1="2" y1="9" x2="7" y2="9" stroke="currentColor" stroke-width="1.5"/>` +
		`<line x1="17" y1="9" x2="22" y2="9" stroke="currentColor" stroke-width="1.5"/>` +
		`<line x1="2" y1="15" x2="7" y2="15" stroke="currentColor" stroke-width="1.5"/>` +
		`<line x1="17" y1="15" x2="22" y2="15" stroke="currentColor" stroke-width="1.5"/>`,
	'bounce':
		`<path d="M4 10Q10 14 13 21Q15 14 17.5 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>` +
		`<line x1="11" y1="22" x2="15" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>` +
		`<circle cx="18.5" cy="8.5" r="3.4" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
	'frame-back':
		`<path d="M5 4V20M19 4L9 12L19 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'frame-fwd':
		`<path d="M19 4V20M5 4L15 12L5 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
	'anim-loop':
		`<path d="M17 2L21 6L17 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` +
		`<path d="M21 6H9C6.24 6 4 8.24 4 11C4 13.76 6.24 16 9 16H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
	'anim-pingpong':
		`<path d="M4 12H20M7 7L2 12L7 17M17 7L22 12L17 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,

	// ─── Depth ───────────────────────────────────────────────────────────
	// depth-on: three cards in diagonal perspective stack → real 3D depth active
	// Back+middle show only the peeking top/right edges; front card is full outline.
	'depth-on':
		`<path d="M11 5H19.5Q20.5 5 20.5 6V12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
		`<path d="M7.5 9H16Q17 9 17 10V16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
		`<rect x="4" y="13" width="9.5" height="7" rx="1.2" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
	// depth-off: three bars aligned flat → zero-Z / flat playback active
	'depth-off':
		`<rect x="6.5" y="6.5" width="11" height="3" rx="0.8" stroke="currentColor" stroke-width="1.5" fill="none"/>` +
		`<rect x="6.5" y="11" width="11" height="3" rx="0.8" stroke="currentColor" stroke-width="1.5" fill="none"/>` +
		`<rect x="6.5" y="15.5" width="11" height="3" rx="0.8" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
};

/**
 * Section metadata for the icon gallery.
 * Maps each section title to its ordered list of icon names.
 * Used by PreviewPage to render the Icon Gallery sections.
 *
 * When adding new icons:
 * 1. Add the icon path to ICONS above (in its appropriate section comment)
 * 2. Add the icon name to the corresponding array here
 * Both steps are needed for the icon to appear in the preview gallery.
 */
export const ICON_SECTIONS: Record<string, string[]> = {
	'Navigation & Global': ['draw-mode', 'view-mode', 'hide-ui', 'sun', 'moon', 'chevron-left', 'chevron-right', 'chevron-up', 'chevron-down'],
	'Export':              ['snapshot', 'record'],
	'FX':                  ['fx-grain', 'fx-vignette', 'fx-chroma', 'fx-fog', 'fx-glow', 'fx-riso', 'fx-distortion', 'fx-wiggle', 'fx-grunge', 'fx-particles', 'fx-dof', 'fx-pixel'],
	'Camera Presets':      ['cam-forward', 'cam-spiral', 'cam-yoyo', 'cam-pulse', 'cam-twist', 'cam-arc', 'cam-crane', 'cam-truck', 'cam-orbit', 'cam-zoom'],
	'Camera Controls':     ['ctrl-speed', 'ctrl-handshake', 'ctrl-handshake-off', 'ctrl-focal', 'ctrl-distance', 'ctrl-spacing', 'ctrl-dof-free', 'ctrl-dof-lock'],
	'Drawing Tools':       ['brush', 'eraser', 'blob', 'text', 'move', 'symmetry', 'smooth', 'organic', 'draw-behind', 'draw-inside', 'rotate', 'pen', 'line-tapered', 'line-uniform', 'line-ink'],
	'File Operations':     ['new', 'open', 'save', 'export', 'undo', 'redo'],
	'Layer Panel':         ['eye', 'eye-off', 'layers', 'duplicate', 'trash', 'arrow-up', 'arrow-down', 'opacity', 'plus-layer', 'drag', 'blend-normal'],
	'Custom Additions':    ['align-left', 'align-center', 'align-right', 'lock', 'unlock', 'pin', 'pin-off', 'flip-horizontal', 'maximize', 'minimize', 'cloud-fog', 'globe', 'scan-line', 'zoom-in', 'target', 'loader', 'monitor', 'tablet', 'sparkles', 'guide', 'info', 'check', 'x', 'plus', 'hand', 'move-vertical', 'move-horizontal', 'aperture', 'wand', 'tornado', 'image'],
	'Animation':           ['play', 'pause', 'film', 'bounce', 'frame-back', 'frame-fwd', 'anim-loop', 'anim-pingpong'],
	'Depth':               ['depth-on', 'depth-off'],
};
