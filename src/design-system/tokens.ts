// Design System Tokens — Diorame v2
// Single source of truth for all UI visual values.

// ──────────────────────────────────────────────────────────────────
// Layer 1: Raw values (no contextual)
// ──────────────────────────────────────────────────────────────────
export const T = {
	// Brand
	purple:      'rgb(154, 15, 249)',
	purple10:    'rgba(154, 15, 249, 0.10)',
	purple20:    'rgba(154, 15, 249, 0.22)',
	purpleLight: 'rgb(196, 130, 255)',

	// Light mode base
	dark:   'rgb(26, 26, 26)',
	border: 'rgb(212, 212, 212)',
	muted:  'rgb(140, 140, 140)',
	light:  'rgb(245, 245, 245)',
	white:  'rgb(255, 255, 255)',

	// Dark mode base
	panelDark:        'rgba(28, 25, 36, 0.92)',
	panelDarkOpaque:  'rgb(28, 25, 36)',
	borderDark:       'rgba(255, 255, 255, 0.10)',
	textDark:         'rgba(255, 255, 255, 0.85)',
	textDarkMuted:    'rgba(255, 255, 255, 0.40)',
	textDarkSubtle:   'rgba(255, 255, 255, 0.30)',
	hoverDark:        'rgba(255, 255, 255, 0.07)',
	hoverDarkStrong:  'rgba(255, 255, 255, 0.10)',
	tabBgDark:        'rgba(255, 255, 255, 0.06)',
	tabActiveDark:    'rgba(255, 255, 255, 0.10)',
	trackDark:        'rgba(255, 255, 255, 0.08)',
	scrollbarDark:    'rgba(0, 0, 0, 0.15)',

	// Stage (outside canvas) — always this regardless of dark mode
	stage: '#0e0e0e',

	// Shadows & blur
	shadow:       '0 2px 16px rgba(0,0,0,0.09), 0 1px 3px rgba(0,0,0,0.06)',
	shadowStrong: '0 8px 28px rgba(0,0,0,0.14)',
	blur:         'blur(12px)',

	// Danger / Destructive
	danger:          'rgb(220, 38, 38)',
	dangerDark:      'rgb(248, 113, 113)',
	dangerHover:     'rgb(185, 28, 28)',
	dangerHoverDark: 'rgb(252, 165, 165)',
} as const;

// ──────────────────────────────────────────────────────────────────
// Layer 2: Typography
// ──────────────────────────────────────────────────────────────────
export const TYPE = {
	manrope: "'Manrope', sans-serif",
	sora:    "'Sora', sans-serif",

	panelHeader:   { family: "'Manrope', sans-serif", weight: 700, size: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const },
	controlLabel:  { family: "'Manrope', sans-serif", weight: 600, size: 11 },
	toolName:      { family: "'Manrope', sans-serif", weight: 600, size: 11 },
	numericValue:  { family: "'Sora', sans-serif",    weight: 600, size: 10 },
	badge:         { family: "'Sora', sans-serif",    weight: 700, size: 9  },
	fileName:      { family: "'Manrope', sans-serif", weight: 600, size: 13 },
} as const;

// ──────────────────────────────────────────────────────────────────
// Layer 3: Spacing & Layout
// ──────────────────────────────────────────────────────────────────
export const SPACE = {
	edge:       12,  // Screen edge margin
	iconGap:     2,  // Between icon buttons
	vsepMargin:  6,  // VSep horizontal margin
	fxRowGap:    3,
	swatchGap:   3,
} as const;

// ──────────────────────────────────────────────────────────────────
// Layer 4: Border radius
// ──────────────────────────────────────────────────────────────────
export const RADIUS = {
	pill:                24,
	panel:               20,
	panelFx:             18,
	panelFxCollapsed:    22,
	iconBtn:              9,
	modeBtn:             18,
	segment:              6,
	segmentSmall:         4,
	segmentItem:          6,
	segmentItemSmall:     4,
	layerThumb:           7,
	fxRow:               10,
	modal:               24,
} as const;

// ──────────────────────────────────────────────────────────────────
// Layer 5: Box shadows
// ──────────────────────────────────────────────────────────────────
export const SHADOW = {
	modal:     '0 24px 64px -16px rgba(0,0,0,0.24), 0 8px 24px -8px rgba(0,0,0,0.16)',
	modalDark: '0 24px 64px -16px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
} as const;

// ──────────────────────────────────────────────────────────────────
// Layer 6: Z-index scale
// ──────────────────────────────────────────────────────────────────
export const Z_INDEX = {
	onboarding:    800,
	toast:         900,
	popover:       950,
	modalBackdrop: 999,
	modal:        1000,
} as const;

// ──────────────────────────────────────────────────────────────────
// Helper: dk(dark, lightVal, darkVal)
// Returns lightVal when dark=false, darkVal when dark=true.
// Usage: style={{ color: dk(dark, T.dark, T.textDark) }}
// ──────────────────────────────────────────────────────────────────
export function dk<L, D>(dark: boolean, lightVal: L, darkVal: D): L | D {
	return dark ? darkVal : lightVal;
}

// ──────────────────────────────────────────────────────────────────
// DEPRECATED — kept for backward-compat during migration.
// Existing components still reference diTokens; do NOT remove until
// Phase 8 (cleanup). New components use T / TYPE / SPACE / RADIUS / dk().
// ──────────────────────────────────────────────────────────────────
export const diTokens = {
	// --- Superficies ---
	bg:         "bg-white/95",
	bgAlt:      "bg-white/90",
	bgPanel:    "bg-white/90",
	bgPanelAlt: "bg-white/80",

	// --- Bordes y separadores ---
	border:       "border-slate-200",
	borderSubtle: "border-slate-200/50",
	divider:      "bg-slate-200",

	// --- Texto ---
	text:       "text-slate-900",
	textMuted:  "text-slate-600",
	textSubtle: "text-slate-400",
	iconColor:  "text-slate-700",

	// --- Interacción ---
	hover:    "hover:bg-slate-50",
	hoverAlt: "hover:bg-slate-100",

	// --- Controles (sliders, toggles, badges) ---
	sliderBg:         "bg-slate-200",
	sliderAccent:     "accent-slate-900",
	badgeBg:          "bg-slate-100",
	toggleBg:         "bg-slate-100",
	toggleHoverBg:    "hover:bg-white",
	toggleActiveText: "text-slate-900",
	toggleActiveBg:   "bg-slate-900",

	// --- Selectores segmentados en paneles (estilo claro) ---
	segmentActiveBg:  "bg-white",
	segmentHoverBg:   "hover:bg-white/50",
	segmentHoverText: "hover:text-slate-900",

	// --- Capa activa (LayersPanel) ---
	layerBgActive:     "bg-blue-50",
	layerBorderActive: "border-blue-400",

	// --- Spinners ---
	spinnerBorder: "border-slate-400",
	spinnerTop:    "border-t-slate-900",

	// --- Marca (hardcodeados en Controls.tsx) ---
	brandPurple:      "#9a0ff9",
	brandPurpleHover: "#8a0fe0",

	// --- Dialog de complejidad (hardcodeados en ControlsExport.tsx / ControlsCinematic.tsx) ---
	dialogText:         "#353535",
	dialogTextMuted:    "#666666",
	dialogProceedBg:    "rgb(3,2,19)",
	dialogProceedHover: "#1d293d",
} as const;

export type DiTokens = typeof diTokens;
