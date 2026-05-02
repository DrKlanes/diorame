// Design System Icons — Diorame v2
// Inner SVG content only. The <svg> wrapper is provided by <Ico>.
// Parent SVG sets: fill="none" stroke="currentColor" strokeWidth={1.5}
//   strokeLinecap="round" strokeLinejoin="round"
// Filled shapes (dots, etc.) must declare fill="currentColor" stroke="none" explicitly.

export const ICONS: Record<string, string> = {

	// ─── Navigation & Global ────────────────────────────────────────────
	'draw-mode':
		`<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>`,
	'view-mode':
		`<path d="M5 3l14 9-14 9V3z"/>`,
	'hide-ui':
		`<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/>`,
	'sun':
		`<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>`,
	'moon':
		`<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`,
	'chevron-left':
		`<path d="M15 18l-6-6 6-6"/>`,
	'chevron-right':
		`<path d="M9 18l6-6-6-6"/>`,

	// ─── Export ──────────────────────────────────────────────────────────
	'snapshot':
		`<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>`,
	'record':
		`<path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.889L15 14v-4z"/><rect x="2" y="6" width="13" height="12" rx="2"/>`,

	// ─── FX ──────────────────────────────────────────────────────────────
	'fx-grain':
		`<circle cx="8"  cy="8"  r="1.2" fill="currentColor" stroke="none"/>` +
		`<circle cx="16" cy="6"  r="1"   fill="currentColor" stroke="none"/>` +
		`<circle cx="5"  cy="15" r="1"   fill="currentColor" stroke="none"/>` +
		`<circle cx="13" cy="17" r="1.2" fill="currentColor" stroke="none"/>` +
		`<circle cx="19" cy="11" r="1"   fill="currentColor" stroke="none"/>` +
		`<circle cx="10" cy="4"  r="0.8" fill="currentColor" stroke="none"/>` +
		`<circle cx="7"  cy="19" r="0.8" fill="currentColor" stroke="none"/>` +
		`<circle cx="18" cy="19" r="0.8" fill="currentColor" stroke="none"/>` +
		`<circle cx="15" cy="13" r="0.8" fill="currentColor" stroke="none"/>`,
	'fx-vignette':
		`<ellipse cx="12" cy="12" rx="10" ry="8"/><ellipse cx="12" cy="12" rx="5.5" ry="4"/>`,
	'fx-chroma':
		`<circle cx="10" cy="10" r="5"/><circle cx="14" cy="10" r="5"/><circle cx="12" cy="15" r="5"/>`,
	'fx-fog':
		`<path d="M5 9c1.5-1.5 3.5-1.5 5 0s3.5 1.5 5 0 3.5-1.5 5 0"/><path d="M3 13c1.5-1.5 3.5-1.5 5 0s3.5 1.5 5 0 3.5-1.5 5 0"/><path d="M5 17h14"/>`,
	'fx-glow':
		`<circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>`,
	'fx-riso':
		`<circle cx="9"  cy="11" r="5"/><circle cx="15" cy="11" r="5"/><circle cx="12" cy="16" r="5"/>`,
	'fx-distortion':
		`<path d="M3 6h18"/><path d="M3 12c3-4 6 4 9 0s6-4 9 0"/><path d="M3 18h18"/>`,
	'fx-wiggle':
		`<path d="M2 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0"/>`,
	'fx-grunge':
		`<path d="M4 8l3-3 2 4 3-5 2 6 3-3 3 4"/><path d="M3 16l4-2 2 3 3-4 3 3 3-2 2 3"/>`,
	'fx-particles':
		`<circle cx="6"  cy="6"  r="1.5" fill="currentColor" stroke="none"/>` +
		`<circle cx="18" cy="5"  r="1"   fill="currentColor" stroke="none"/>` +
		`<circle cx="4"  cy="17" r="1"   fill="currentColor" stroke="none"/>` +
		`<circle cx="15" cy="18" r="1.5" fill="currentColor" stroke="none"/>` +
		`<circle cx="20" cy="13" r="1"   fill="currentColor" stroke="none"/>` +
		`<circle cx="11" cy="11" r="0.8" fill="currentColor" stroke="none"/>` +
		`<circle cx="16" cy="11" r="0.5" fill="currentColor" stroke="none"/>`,
	'fx-dof':
		`<ellipse cx="12" cy="12" rx="3" ry="9"/><ellipse cx="12" cy="12" rx="9" ry="3"/>`,
	'fx-pixel':
		`<rect x="3"  y="3"  width="5" height="5" rx="1"/>` +
		`<rect x="10" y="3"  width="5" height="5" rx="1"/>` +
		`<rect x="17" y="3"  width="4" height="5" rx="1"/>` +
		`<rect x="3"  y="10" width="5" height="5" rx="1"/>` +
		`<rect x="10" y="10" width="5" height="5" rx="1"/>` +
		`<rect x="17" y="10" width="4" height="5" rx="1"/>` +
		`<rect x="3"  y="17" width="5" height="4" rx="1"/>` +
		`<rect x="10" y="17" width="5" height="4" rx="1"/>`,

	// ─── Camera Presets ──────────────────────────────────────────────────
	'cam-forward':
		`<path d="M5 12h14"/><path d="m15 8 4 4-4 4"/>`,
	'cam-spiral':
		`<path d="M12 12c0-1.1.9-2 2-2s2 .9 2 2a4 4 0 0 1-4 4 6 6 0 0 1-6-6 8 8 0 0 1 8-8"/>`,
	'cam-yoyo':
		`<path d="M4 8l4 4-4 4"/><path d="M20 8l-4 4 4 4"/><path d="M4 12h16"/>`,
	'cam-pulse':
		`<circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>` +
		`<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="10"/>`,
	'cam-twist':
		`<path d="M4 9c0-2 3.6-4 8-4s8 2 8 4-3.6 4-8 4"/>` +
		`<path d="M20 15c0 2-3.6 4-8 4s-8-2-8-4 3.6-4 8-4"/>`,
	'cam-arc':
		`<path d="M5 19A9 9 0 0 1 5 5"/><path d="m9 9-4 4 4 4"/>`,
	'cam-crane':
		`<path d="M12 20V4"/><path d="m8 8 4-4 4 4"/><path d="m8 16 4 4 4-4"/>`,
	'cam-truck':
		`<path d="M4 12h16"/><path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/>`,
	'cam-orbit':
		`<ellipse cx="12" cy="12" rx="10" ry="4"/>` +
		`<circle cx="12" cy="12" r="2"/>`,
	'cam-zoom':
		`<circle cx="10" cy="10" r="6"/><path d="m21 21-4.35-4.35"/><path d="M7 10h6M10 7v6"/>`,

	// ─── Camera Controls ─────────────────────────────────────────────────
	'ctrl-speed':
		`<path d="M3.05 12a9 9 0 1 1 .5 3M12 12l3-5"/>` +
		`<circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>`,
	'ctrl-handshake':
		`<path d="M8 13V5a1 1 0 0 1 2 0v4m0 0V4a1 1 0 0 1 2 0v5m0 0a1 1 0 0 1 2 0v2m0 0a1 1 0 0 1 2 0v2a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6v-2"/>`,
	'ctrl-handshake-off':
		`<path opacity="0.35" d="M8 13V5a1 1 0 0 1 2 0v4m0 0V4a1 1 0 0 1 2 0v5m0 0a1 1 0 0 1 2 0v2m0 0a1 1 0 0 1 2 0v2a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6v-2"/><path d="m2 2 20 20"/>`,
	'ctrl-focal':
		`<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>`,
	'ctrl-distance':
		`<path d="M3 12h18"/><path d="M6 8v8"/><path d="M18 8v8"/>`,
	'ctrl-spacing':
		`<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>` +
		`<path d="M21 3v18"/><path d="M3 3v18"/>`,
	'ctrl-dof-free':
		`<circle cx="12" cy="12" r="5"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>`,
	'ctrl-dof-lock':
		`<rect x="8" y="11" width="8" height="7" rx="1.5"/>` +
		`<path d="M10 11V7.5a2 2 0 0 1 4 0V11"/>` +
		`<circle cx="12" cy="15" r="1" fill="currentColor" stroke="none"/>`,

	// ─── Drawing Tools ───────────────────────────────────────────────────
	'brush':
		`<path d="M9.06 11.9l8.07-8.07a2.85 2.85 0 1 1 4.03 4.03l-8.08 8.07"/>` +
		`<path d="M7 14.94C5.34 14.94 4 16.3 4 17.97c0 1.33-2.5 1.52-2 2.02 1 1 2.48 1.01 3.5 1.01 1.66 0 3-1.35 3-3.02C8.5 16.32 8.5 14.94 7 14.94z"/>`,
	'eraser':
		`<path d="m7 21-4-4 14.5-14.5a2 2 0 0 1 2.83 0l1.17 1.17a2 2 0 0 1 0 2.83L7 21z"/><path d="m2 13.5 5 5"/>`,
	'blob':
		`<path d="M8 5c-2 0-4 1.5-4 4 0 1.5 1 2.5 1 3.5S4 15 4 17c0 2 2 3 4 3 1.5 0 2.5-1 3.5-1s2 1 3.5 1c2 0 4-1 4-3 0-2-1-3-1-3.5s1-2 1-3.5c0-2.5-2-4-4-4-1.5 0-2.5 1-3.5 1S9.5 5 8 5z"/>`,
	'text':
		`<path d="M4 7V5h16v2"/><path d="M9 20h6"/><path d="M12 5v15"/>`,
	'move':
		`<path d="M5 9l-3 3 3 3"/><path d="M19 9l3 3-3 3"/><path d="M9 5l3-3 3 3"/><path d="M9 19l3 3 3-3"/>` +
		`<path d="M2 12h20M12 2v20"/>`,
	'symmetry':
		`<path d="M12 3v18"/><path d="m5 8 4 4-4 4"/><path d="m19 8-4 4 4 4"/>`,
	'smooth':
		`<path d="M3 17C5 12 7 9 10 9s5 6 9 6"/>`,
	'organic':
		`<path d="M3 13c1.5-3 3-5 5-5s3 4 5 4 4-4 6-2"/>`,
	'draw-behind':
		`<rect x="8" y="8" width="13" height="13" rx="2"/>` +
		`<rect x="3" y="3" width="13" height="13" rx="2"/>`,
	'draw-inside':
		`<rect x="3" y="3" width="18" height="18" rx="2"/>` +
		`<rect x="7" y="7" width="10" height="10" rx="1"/>`,
	'rotate':
		`<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>`,

	// ─── File Operations ─────────────────────────────────────────────────
	'new':
		`<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>` +
		`<path d="M14 2v6h6"/>`,
	'open':
		`<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>`,
	'save':
		`<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>` +
		`<path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>`,
	'export':
		`<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>` +
		`<path d="M17 8l-5-5-5 5"/><line x1="12" y1="3" x2="12" y2="15"/>`,
	'undo':
		`<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>`,
	'redo':
		`<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/>`,

	// ─── Layer Panel ─────────────────────────────────────────────────────
	'eye':
		`<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>`,
	'eye-off':
		`<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/>`,
	'duplicate':
		`<rect width="14" height="14" x="8" y="8" rx="2"/>` +
		`<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>`,
	'trash':
		`<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>` +
		`<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>`,
	'arrow-up':
		`<path d="m18 15-6-6-6 6"/>`,
	'arrow-down':
		`<path d="m6 9 6 6 6-6"/>`,
	'opacity':
		`<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/>`,
	'plus-layer':
		`<path d="M12 8v8M8 12h8"/>` +
		`<rect x="3" y="3" width="18" height="18" rx="2"/>`,
	'drag':
		`<circle cx="9"  cy="7"  r="1.5" fill="currentColor" stroke="none"/>` +
		`<circle cx="15" cy="7"  r="1.5" fill="currentColor" stroke="none"/>` +
		`<circle cx="9"  cy="12" r="1.5" fill="currentColor" stroke="none"/>` +
		`<circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none"/>` +
		`<circle cx="9"  cy="17" r="1.5" fill="currentColor" stroke="none"/>` +
		`<circle cx="15" cy="17" r="1.5" fill="currentColor" stroke="none"/>`,
	'blend-normal':
		`<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>`,

	// ─── Custom additions ─────────────────────────────────────────────────
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
};
