import React from 'react';
import { useStrata } from '../StrataContext';
import { DiPill, DiVSep } from '../../../design-system';
import { IconBtn } from '../topbar/_shared';
import { ToolBtn } from './_shared';
import type { ToolType } from '../StrataContext';

interface DrawingToolbarProps { dark: boolean; }

type ModifierConfig = {
	iconName: string;
	field: keyof ModifierFields;
	actionType: string;
	tooltip: string;
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
	'brush': [
		{ iconName: 'symmetry',    field: 'isSymmetryEnabled', actionType: 'TOGGLE_SYMMETRY',       tooltip: 'Symmetry' },
		{ iconName: 'draw-inside', field: 'isDrawInside',      actionType: 'TOGGLE_DRAW_INSIDE',    tooltip: 'Draw Inside' },
		{ iconName: 'draw-behind', field: 'isDrawBehind',      actionType: 'TOGGLE_DRAW_BEHIND',    tooltip: 'Draw Behind' },
		{ iconName: 'organic',     field: 'isOrganicMode',     actionType: 'TOGGLE_ORGANIC_MODE',   tooltip: 'Organic' },
		{ iconName: 'smooth',      field: 'blobSmoothing',     actionType: 'TOGGLE_BLOB_SMOOTHING', tooltip: 'Smooth' },
	],
	'line': [
		{ iconName: 'symmetry',    field: 'isSymmetryEnabled', actionType: 'TOGGLE_SYMMETRY',    tooltip: 'Symmetry' },
		{ iconName: 'draw-inside', field: 'isDrawInside',      actionType: 'TOGGLE_DRAW_INSIDE', tooltip: 'Draw Inside' },
		{ iconName: 'draw-behind', field: 'isDrawBehind',      actionType: 'TOGGLE_DRAW_BEHIND', tooltip: 'Draw Behind' },
	],
	'eraser': [
		{ iconName: 'symmetry', field: 'isSymmetryEnabled', actionType: 'TOGGLE_SYMMETRY',       tooltip: 'Symmetry' },
		{ iconName: 'smooth',   field: 'blobSmoothing',     actionType: 'TOGGLE_BLOB_SMOOTHING', tooltip: 'Smooth' },
	],
	'text': [],
	'move': [],
};

const TOOLS_WITH_DOT: ToolType[] = ['brush', 'line', 'text'];

export function DrawingToolbar({ dark }: DrawingToolbarProps) {
	const { state, dispatch } = useStrata();
	const tool = state.tool;
	const paletteColor = state.palette?.[state.currentColorIndex] ?? null;

	const setTool = (t: ToolType) => dispatch({ type: 'SET_TOOL', payload: t });

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
			{/* Tools — order: Blob, Brush, Eraser, Text, Move */}
			<ToolBtn
				name="blob" onClick={() => setTool('brush')} dark={dark}
				active={tool === 'brush'} tooltip="Blob"
				paletteColor={paletteColor} showDot={TOOLS_WITH_DOT.includes('brush')}
			/>
			<ToolBtn
				name="brush" onClick={() => setTool('line')} dark={dark}
				active={tool === 'line'} tooltip="Brush"
				paletteColor={paletteColor} showDot={TOOLS_WITH_DOT.includes('line')}
			/>
			<ToolBtn
				name="eraser" onClick={() => setTool('eraser')} dark={dark}
				active={tool === 'eraser'} tooltip="Eraser"
			/>
			<ToolBtn
				name="text" onClick={() => setTool('text')} dark={dark}
				active={tool === 'text'} tooltip="Text"
				paletteColor={paletteColor} showDot={TOOLS_WITH_DOT.includes('text')}
			/>
			<ToolBtn
				name="move" onClick={() => setTool('move')} dark={dark}
				active={tool === 'move'} tooltip="Move"
			/>

			{/* VSep + modifiers only when current tool has them */}
			{hasModifiers && (
				<>
					<DiVSep dark={dark} />
					{modifiers.map(mod => (
						<IconBtn
							key={mod.field}
							name={mod.iconName}
							onClick={() => dispatch({ type: mod.actionType } as any)}
							dark={dark}
							active={modifierFields[mod.field]}
							activeStyle="wash"
							iconWeight="secondary"
							tooltip={mod.tooltip}
						/>
					))}
				</>
			)}
		</DiPill>
	);
}
