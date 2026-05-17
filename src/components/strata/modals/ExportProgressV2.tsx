import React, { useState, useEffect } from 'react';
import { DiModal } from './index';
import { T, TYPE, dk } from '../../../design-system/tokens';
import { Ico } from '../../../design-system';
import type { ExportType } from '../../../types/strataTypes';

// ── Config ────────────────────────────────────────────────────────────────────

// Fallbacks: 'video' → 'record', 'code' → 'export' (not yet in ICONS — pre-Fase 8 task)
const EXPORT_CONFIG: Record<ExportType, { icon: string; label: string }> = {
	png:  { icon: 'camera', label: 'Capturing snapshot…'  },
	mp4:  { icon: 'record', label: 'Rendering animation…' },
	svg:  { icon: 'export', label: 'Exporting vector…'    },
	svgz: { icon: 'export', label: 'Exporting vector…'    },
};

// ── ExportProgressV2 ──────────────────────────────────────────────────────────

interface ExportProgressV2Props {
	open:       boolean;
	exportType: ExportType;
	dark:       boolean;
}

export function ExportProgressV2({ open, exportType, dark }: ExportProgressV2Props) {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		if (!open) {
			setProgress(0);
			return;
		}
		const interval = setInterval(() => {
			setProgress(p => p + (100 - p) * 0.02);
		}, 50);
		return () => clearInterval(interval);
	}, [open]);

	const { icon, label } = EXPORT_CONFIG[exportType];
	const muted      = dk(dark, T.muted,  T.textDarkMuted) as string;
	const labelColor = dk(dark, T.dark,   T.textDark)      as string;
	const trackColor = dk(dark, T.border, T.borderDark)    as string;
	const pct        = Math.floor(progress);

	return (
		<DiModal open={open} onClose={() => {}} variant="banner" size="md" dark={dark}>
			<DiModal.Body>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

					{/* Pulsing icon */}
					<Ico
						name={icon}
						size={16}
						color={T.purple}
						style={{ animation: 'ico-pulse 1.5s ease-in-out infinite' }}
					/>

					{/* Label */}
					<span style={{
						fontFamily: TYPE.controlLabel.family,
						fontWeight: TYPE.controlLabel.weight,
						fontSize:   TYPE.controlLabel.size,
						color:      labelColor,
						whiteSpace: 'nowrap',
					}}>
						{label}
					</span>

					{/* Spacer */}
					<div style={{ flex: 1 }} />

					{/* Progress bar track + fill */}
					<div style={{
						width:      80,
						height:     4,
						borderRadius: 2,
						background: trackColor,
						flexShrink: 0,
						overflow:   'hidden',
					}}>
						<div style={{
							height:     '100%',
							width:      `${pct}%`,
							background: T.purple,
							transition: 'width 100ms ease-out',
						}} />
					</div>

					{/* Percentage */}
					<span style={{
						fontFamily:  TYPE.numericValue.family,
						fontWeight:  TYPE.numericValue.weight,
						fontSize:    TYPE.numericValue.size,
						color:       muted,
						width:       32,
						textAlign:   'right' as const,
						flexShrink:  0,
					}}>
						{pct}%
					</span>

				</div>
			</DiModal.Body>
		</DiModal>
	);
}
