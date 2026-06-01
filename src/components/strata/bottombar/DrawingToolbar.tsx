import React from 'react';
import { useStrata } from '../StrataContext';
import { DiPill, DiVSep } from '../../../design-system';
import { DiActionButton } from '../../../design-system';
import { ToolBtn, BrushModeButton } from './_shared';
import type { ToolType } from '../StrataContext';
import { isLayerEmpty } from '../../../utils/animationFrames';
import { useTranslation } from '../../../i18n';

interface DrawingToolbarProps { dark: boolean; }

type ModifierConfig = {
	iconName: string;
	field: keyof ModifierFields;
	actionType: string;
	tooltipKey: string;
};

// Only the boolean modifier fields we read from state
type ModifierFields = {
	isSymmetryEnabled: boolean;
	isDrawInside: boolean;
	isDrawBehind: boolean;
	isOrganicMode: boolean;
	blobSmoothing: boolean;
};

const MODIFIERS_BY_TOOL: Record<ToolType, ModifierConfig[]> = {
	'blob': [
		{ iconName: 'symmetry',    field: 'isSymmetryEnabled', actionType: 'TOGGLE_SYMMETRY',       tooltipKey: 'bottombar.draw.mod.symmetry' },
		{ iconName: 'draw-inside', field: 'isDrawInside',      actionType: 'TOGGLE_DRAW_INSIDE',    tooltipKey: 'bottombar.draw.mod.drawInside' },
		{ iconName: 'draw-behind', field: 'isDrawBehind',      actionType: 'TOGGLE_DRAW_BEHIND',    tooltipKey: 'bottombar.draw.mod.drawBehind' },
		{ iconName: 'organic',     field: 'isOrganicMode',     actionType: 'TOGGLE_ORGANIC_MODE',   tooltipKey: 'bottombar.draw.mod.organic' },
		{ iconName: 'smooth',      field: 'blobSmoothing',     actionType: 'TOGGLE_BLOB_SMOOTHING', tooltipKey: 'bottombar.draw.mod.smooth' },
	],
	'brush': [
		{ iconName: 'symmetry',    field: 'isSymmetryEnabled', actionType: 'TOGGLE_SYMMETRY',    tooltipKey: 'bottombar.draw.mod.symmetry' },
		{ iconName: 'draw-inside', field: 'isDrawInside',      actionType: 'TOGGLE_DRAW_INSIDE', tooltipKey: 'bottombar.draw.mod.drawInside' },
		{ iconName: 'draw-behind', field: 'isDrawBehind',      actionType: 'TOGGLE_DRAW_BEHIND', tooltipKey: 'bottombar.draw.mod.drawBehind' },
	],
	'eraser': [
		{ iconName: 'symmetry', field: 'isSymmetryEnabled', actionType: 'TOGGLE_SYMMETRY',       tooltipKey: 'bottombar.draw.mod.symmetry' },
		{ iconName: 'smooth',   field: 'blobSmoothing',     actionType: 'TOGGLE_BLOB_SMOOTHING', tooltipKey: 'bottombar.draw.mod.smooth' },
	],
	'text': [],
	'move': [],
};

const TOOLS_WITH_DOT: ToolType[] = ['blob', 'brush', 'text'];

export function DrawingToolbar({ dark }: DrawingToolbarProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	const tool = state.tool;
	const paletteColor = state.palette?.[state.currentColorIndex] ?? null;
	const isPlaybackLocked = state.isAnimationMode && state.isAnimationPlaying;

	const setTool = (t: ToolType) => dispatch({ type: 'SET_TOOL', payload: t });

	const layerIsEmpty = isLayerEmpty(state, state.currentLayerIndex);

	const modifiers = MODIFIERS_BY_TOOL[tool] ?? [];
	const hasModifiers = modifiers.length > 0;

	// Typed accessor avoids casting to any for each modifier read
	const modifierFields: ModifierFields = {
		isSymmetryEnabled: state.isSymmetryEnabled,
		isDrawInside:      state.isDrawInside,
		isDrawBehind:      state.isDrawBehind,
		isOrganicMode:     state.isOrganicMode,
		blobSmoothing:     state.blobSmoothing,
	};

	return (
		<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
			{/* Block 1: Tool buttons — fixed position, never shifts */}
			<div style={{ display: 'flex', gap: 2, alignItems: 'center', flexShrink: 0, opacity: isPlaybackLocked ? 0.3 : undefined, pointerEvents: isPlaybackLocked ? 'none' : undefined }}>
				<ToolBtn
					name="blob" onClick={() => setTool('blob')} dark={dark}
					active={tool === 'blob'} tooltip={t('bottombar.draw.tool.blob')} shortcut="B"
					paletteColor={paletteColor} showDot={TOOLS_WITH_DOT.includes('blob')}
				/>
				<ToolBtn
					name="brush" onClick={() => setTool('brush')} dark={dark}
					active={tool === 'brush'} tooltip={t('bottombar.draw.tool.brush')} shortcut="L"
					paletteColor={paletteColor} showDot={TOOLS_WITH_DOT.includes('brush')}
				/>
				<ToolBtn
					name="eraser" onClick={() => setTool('eraser')} dark={dark}
					active={tool === 'eraser'} tooltip={t('bottombar.draw.tool.eraser')} shortcut="E"
				/>
				<ToolBtn
					name="text" onClick={() => setTool('text')} dark={dark}
					active={tool === 'text'} tooltip={t('bottombar.draw.tool.text')} shortcut="T"
					paletteColor={paletteColor} showDot={TOOLS_WITH_DOT.includes('text')}
				/>
				<ToolBtn
					name="move" onClick={() => setTool('move')} dark={dark}
					active={tool === 'move'} tooltip={t('bottombar.draw.tool.move')} shortcut="M"
				/>
			</div>
			{/* VSep estructural: siempre visible, comunica que la zona derecha es expansible */}
			<DiVSep dark={dark} />
			{/* Block 2: Modifier zone — minWidth 158 = 5 mods x 30 + 4 gaps x 2 */}
			<div style={{ display: 'flex', gap: 2, alignItems: 'center', minWidth: 158, flexShrink: 0, opacity: isPlaybackLocked ? 0.3 : undefined, pointerEvents: isPlaybackLocked ? 'none' : undefined }}>
				{hasModifiers && modifiers.map(mod => (
					<DiActionButton
						key={mod.field}
						name={mod.iconName}
						onClick={() => dispatch({ type: mod.actionType } as any)}
						dark={dark}
						active={modifierFields[mod.field]}
						activeStyle="wash"
						iconWeight="secondary"
						tooltip={t(mod.tooltipKey)}
						disabled={isPlaybackLocked || (layerIsEmpty && (mod.field === 'isDrawInside' || mod.field === 'isDrawBehind'))}
					/>
				))}
				{tool === 'brush' && <><DiVSep dark={dark} /><BrushModeButton dark={dark} /></>}
			</div>
		</DiPill>
	);
}
