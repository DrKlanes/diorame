import React, { ReactNode } from 'react';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';

// Shared by SuperRisoBlock (Riso) and XeroxControls (Fotocopia).
type FieldProps = { label: string; value?: string; dark: boolean; muted: boolean; children: ReactNode };

export function Field({ label, value, dark, muted, children }: FieldProps) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
				<span style={{
					fontFamily: TYPE.numericValue.family, fontWeight: TYPE.numericValue.weight, fontSize: TYPE.numericValue.size,
					color: dk(dark, T.muted, T.textDarkMuted), letterSpacing: '0.05em',
				}}>{label}</span>
				{value !== undefined && (
					<span style={{
						fontFamily: TYPE.numericValue.family, fontWeight: TYPE.numericValue.weight, fontSize: TYPE.numericValue.size,
						color: muted ? dk(dark, T.muted, T.textDarkMuted) : T.purple,
					}}>{value}</span>
				)}
			</div>
			{children}
		</div>
	);
}

export const segmentWrap = (dark: boolean): React.CSSProperties =>
	({ borderRadius: RADIUS.segmentSmall + 2, overflow: 'hidden', background: dk(dark, T.white, T.panelDarkOpaque) });

export const pct = (v: number) => `${Math.round(v * 100)}`;

export const labelStyle: React.CSSProperties = {
	fontFamily: TYPE.controlLabel.family, fontWeight: TYPE.controlLabel.weight, fontSize: TYPE.controlLabel.size,
};

export const Divider = ({ dark }: { dark: boolean }) => <div style={{ height: 1, backgroundColor: dk(dark, T.border, T.borderDark) }} />;
