import React from 'react';
import { DiModal } from './index';
import { T, dk } from '../../../design-system/tokens';

// ── ComplexSceneModalV2 ───────────────────────────────────────────────────────

interface ComplexSceneModalV2Props {
	open:             boolean;
	onClose:          () => void;
	onContinue:       () => void;
	onUseCompressed:  () => void;
	shapeCount:       number;
	dark:             boolean;
}

export function ComplexSceneModalV2({ open, onClose, onContinue, onUseCompressed, shapeCount, dark }: ComplexSceneModalV2Props) {
	const formattedShapeCount = new Intl.NumberFormat('en-US').format(shapeCount);

	return (
		<DiModal open={open} onClose={onClose} variant="dialog" size="md" dark={dark}>
			<DiModal.Header title="Complex scene" />
			<DiModal.Body>
				<p style={{ margin: 0 }}>
					Your drawing contains {formattedShapeCount} shapes. Vector exports of complex scenes may take
					several seconds and produce large files.
				</p>
				<div style={{
					marginTop: 12,
					padding: 12,
					borderRadius: 12,
					background: dk(dark, T.purple10, T.purple20) as string,
					color: T.purple,
				}}>
					Try SVG (Compressed) for smaller files without quality loss.
				</div>
			</DiModal.Body>
			<DiModal.Footer>
				<DiModal.TertiaryAction onClick={onUseCompressed}>Use Compressed instead</DiModal.TertiaryAction>
				<div style={{ flex: 1 }} />
				<DiModal.SecondaryAction onClick={onClose}>Cancel</DiModal.SecondaryAction>
				<DiModal.PrimaryAction onClick={onContinue}>Continue</DiModal.PrimaryAction>
			</DiModal.Footer>
		</DiModal>
	);
}
