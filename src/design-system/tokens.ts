// Design System Tokens — Diorame v1.11.0
// Single source of truth for all UI visual values.
// Import this instead of prop-drilling uiTheme or using hardcoded color strings.

export const diTokens = {
	// --- Superficies ---
	bg:         "bg-white/95",
	bgAlt:      "bg-white/90",
	bgPanel:    "bg-white/90",
	bgPanelAlt: "bg-white/80",

	// --- Bordes y separadores ---
	border:  "border-slate-200",
	divider: "bg-slate-200",

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
