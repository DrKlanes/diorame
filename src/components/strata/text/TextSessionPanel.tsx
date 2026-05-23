import React, { useEffect, useRef } from 'react';
import { Ico } from '../../../design-system';
import { T, TYPE, RADIUS, SHADOW, dk } from '../../../design-system/tokens';
import { useStrata } from '../StrataContext';

// Font CSS values keyed by TextSession font name
const FONT_CSS: Record<string, string> = {
	noir:     "'Courier Prime', monospace",
	mansion:  "'Cinzel', serif",
	pharma:   "'Inter', sans-serif",
	comic:    "'Bangers', cursive",
	dungeons: "'Inknut Antiqua', serif",
};

const FONT_LABELS: Record<string, string> = {
	noir:     'Noir',
	mansion:  'Mansion',
	pharma:   'Pharma',
	comic:    'Comic',
	dungeons: 'Dungeon',
};

const FONT_ORDER = ['noir', 'mansion', 'pharma', 'comic', 'dungeons'] as const;
const ALIGN_ORDER = ['left', 'center', 'right'] as const;
const ALIGN_ICONS: Record<string, string> = { left: 'align-left', center: 'align-center', right: 'align-right' };
const MAX_CHARS = 140;

interface TextSessionPanelProps {
	dark: boolean;
}

export function TextSessionPanel({ dark }: TextSessionPanelProps) {
	const { state, dispatch } = useStrata();
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const session = state.textSession;

	useEffect(() => {
		if (!session.isActive) return;
		textareaRef.current?.focus();
	}, [session.isActive]);

	if (!session.isActive) return null;

	const bgColor       = dk(dark, T.white, T.panelDarkOpaque);
	const borderColor   = dk(dark, T.border, T.borderDark);
	const textColor     = dk(dark, T.dark, T.textDark);
	const mutedColor    = dk(dark, T.muted, T.textDarkMuted) as string;
	const hoverBg       = dk(dark, 'rgba(0,0,0,0.04)', T.hoverDark);
	const activeBg      = dk(dark, T.purple10, T.purple20);
	const activeColor   = dk(dark, T.purple, T.purpleLight) as string;

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Escape') {
			e.preventDefault();
			dispatch({ type: 'CANCEL_TEXT_SESSION' });
		}
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			dispatch({ type: 'COMMIT_TEXT_SESSION' });
		}
	};

	return (
		<div style={{
			backgroundColor: bgColor,
			border: `1px solid ${borderColor}`,
			borderRadius: RADIUS.panel,
			boxShadow: dk(dark, SHADOW.modal, SHADOW.modalDark),
			backdropFilter: T.blur,
			WebkitBackdropFilter: T.blur,
			width: 280,
			display: 'flex',
			flexDirection: 'column',
			gap: 0,
			overflow: 'hidden',
		}}>
			{/* Font row */}
			<div style={{
				display: 'flex',
				padding: '8px 8px 6px',
				gap: 4,
				borderBottom: `1px solid ${borderColor}`,
			}}>
				{FONT_ORDER.map(f => {
					const isActive = session.font === f;
					return (
						<button
							key={f}
							onClick={() => dispatch({ type: 'UPDATE_TEXT_SESSION', payload: { font: f } })}
							title={FONT_LABELS[f]}
							style={{
								flex: 1,
								height: 32,
								border: 'none',
								borderRadius: RADIUS.segmentItem,
								background: isActive ? activeBg : 'transparent',
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontFamily: FONT_CSS[f],
								fontSize: 14,
								fontWeight: 600,
								color: isActive ? activeColor : (mutedColor),
								transition: 'background 0.1s, color 0.1s',
							}}
							onPointerEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = hoverBg; }}
							onPointerLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
						>
							Aa
						</button>
					);
				})}
			</div>

			{/* Textarea */}
			<textarea
				ref={textareaRef}
				value={session.content}
				onChange={e => {
					if (e.target.value.length <= MAX_CHARS) {
						dispatch({ type: 'UPDATE_TEXT_SESSION', payload: { content: e.target.value } });
					}
				}}
				onKeyDown={handleKeyDown}
				rows={3}
				placeholder="Type here…"
				style={{
					width: '100%',
					boxSizing: 'border-box',
					padding: '10px 12px',
					fontFamily: FONT_CSS[session.font],
					fontSize: 14,
					color: textColor,
					background: 'transparent',
					border: 'none',
					outline: 'none',
					resize: 'none',
					lineHeight: 1.5,
				}}
			/>

			{/* Bottom row: align + counter + actions */}
			<div style={{
				display: 'flex',
				alignItems: 'center',
				padding: '6px 8px 8px',
				gap: 4,
				borderTop: `1px solid ${borderColor}`,
			}}>
				{/* Align buttons */}
				{ALIGN_ORDER.map(a => {
					const isActive = session.align === a;
					return (
						<button
							key={a}
							onClick={() => dispatch({ type: 'UPDATE_TEXT_SESSION', payload: { align: a } })}
							title={`Align ${a}`}
							style={{
								width: 28,
								height: 28,
								border: 'none',
								borderRadius: RADIUS.iconBtn,
								background: isActive ? activeBg : 'transparent',
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								transition: 'background 0.1s',
							}}
							onPointerEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = hoverBg; }}
							onPointerLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
						>
							<Ico name={ALIGN_ICONS[a]} size={14} color={isActive ? activeColor : mutedColor} />
						</button>
					);
				})}

				{/* Spacer + char counter */}
				<span style={{
					flex: 1,
					textAlign: 'right',
					fontFamily: TYPE.numericValue.family,
					fontSize: TYPE.numericValue.size,
					fontWeight: TYPE.numericValue.weight,
					color: session.content.length > 130 ? T.warning : mutedColor,
				}}>
					{session.content.length}/{MAX_CHARS}
				</span>

				{/* Cancel */}
				<button
					onClick={() => dispatch({ type: 'CANCEL_TEXT_SESSION' })}
					style={{
						padding: '4px 10px',
						borderRadius: RADIUS.pill,
						border: `1px solid ${borderColor}`,
						background: 'transparent',
						cursor: 'pointer',
						fontFamily: TYPE.controlLabel.family,
						fontSize: TYPE.controlLabel.size,
						fontWeight: TYPE.controlLabel.weight,
						color: mutedColor,
					}}
				>
					Cancel
				</button>

				{/* Done */}
				<button
					onClick={() => dispatch({ type: 'COMMIT_TEXT_SESSION' })}
					style={{
						padding: '4px 10px',
						borderRadius: RADIUS.pill,
						border: 'none',
						background: T.purple,
						cursor: 'pointer',
						fontFamily: TYPE.controlLabel.family,
						fontSize: TYPE.controlLabel.size,
						fontWeight: TYPE.controlLabel.weight,
						color: T.white,
					}}
				>
					Done
				</button>
			</div>
		</div>
	);
}
