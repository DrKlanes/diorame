import React from 'react';
import { useTheme } from '../../../design-system/useTheme';
import { useIsStandalone } from '../../../hooks/useIsStandalone';
import { ModeSwitchPill } from './ModeSwitchPill';
import { ThemeTogglePill } from './ThemeTogglePill';
import { AnimationPlayerUI } from './AnimationPlayerUI';
import { DocumentPill } from './DocumentPill';
import { ExportPill } from './ExportPill';

/**
 * TopBar — three-column grid layout (auto / 1fr / auto).
 *
 * Left  (auto):  DocumentPill — transversal, both modes.
 *                new / open / save / name / info + undo/redo (DRAW only).
 * Center (1fr):  ModeSwitchPill + AnimationPlayerUI — unchanged.
 * Right  (auto): ExportPill (contextual per mode) + ThemeTogglePill.
 *
 * Grid prevents center group from overlapping left/right cells on any screen
 * width, fixing the tablet overlap issue without conditional pill positions.
 */
export function TopBar() {
	const { dark } = useTheme();
	const isStandalone = useIsStandalone();

	return (
		<div style={{
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			padding: '12px',
			// In standalone PWA (iOS) the system status strip overlays the content; reserve the
			// top safe-area inset so the DocumentPill clears it. Browser (isStandalone=false) →
			// plain 12px, byte-identical. paddingTop after padding so the longhand wins.
			paddingTop: isStandalone ? 'calc(12px + env(safe-area-inset-top, 0px))' : '12px',
			display: 'grid',
			gridTemplateColumns: 'auto 1fr auto',
			alignItems: 'start',
			gap: 8,
			zIndex: 50,
			pointerEvents: 'none',
		}}>
			{/* Left cell — document operations (transversal) */}
			<div style={{ pointerEvents: 'auto' }}>
				<DocumentPill dark={dark} />
			</div>

			{/* Center cell — mode switch + animation player */}
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
				<ModeSwitchPill dark={dark} />
				<AnimationPlayerUI />
			</div>

			{/* Right cell — export (contextual) + theme toggle */}
			<div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', pointerEvents: 'auto' }}>
				<ExportPill dark={dark} />
				<ThemeTogglePill dark={dark} />
			</div>
		</div>
	);
}
