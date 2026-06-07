import React, { useState } from 'react';
import { TYPE, dk, T } from '../../../design-system/tokens';
import { useStrata } from '../StrataContext';
import { useTranslation } from '../../../i18n';
import { UNTITLED_PROJECT_SENTINEL } from '../../../constants/project';

interface ProjectNameButtonProps { dark: boolean; }

const NAME_WIDTH = 150;

export function ProjectNameButton({ dark }: ProjectNameButtonProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	const filename = state.projectName;
	const displayedName = filename === UNTITLED_PROJECT_SENTINEL
		? t('topbar.file.untitledProject')
		: filename;
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(filename);

	const iconColor = dk(dark, T.dark, T.textDark) as string;

	const commitFilename = () => {
		setEditing(false);
		const trimmed = draft.trim();
		if (trimmed === '') {
			if (filename !== UNTITLED_PROJECT_SENTINEL) {
				dispatch({ type: 'SET_PROJECT_NAME', payload: UNTITLED_PROJECT_SENTINEL });
			}
		} else if (trimmed !== filename) {
			dispatch({ type: 'SET_PROJECT_NAME', payload: trimmed });
		}
	};

	// Wrapper constrains both display and edit modes to the same fixed width,
	// preventing the pill from growing when switching to edit mode.
	return (
		<div style={{ width: NAME_WIDTH, flexShrink: 0, overflow: 'hidden' }}>
			{editing ? (
				<input
					autoFocus
					value={draft}
					onChange={e => setDraft(e.target.value)}
					onBlur={commitFilename}
					onKeyDown={e => {
						if (e.key === 'Enter') commitFilename();
						if (e.key === 'Escape') { setDraft(displayedName); setEditing(false); }
					}}
					style={{
						width: '100%',
						boxSizing: 'border-box',
						background: 'transparent',
						border: 'none',
						outline: 'none',
						fontFamily: TYPE.manrope,
						fontSize: 13,
						fontWeight: 600,
						color: iconColor,
						padding: '0 8px',
					}}
				/>
			) : (
				<button
					onClick={() => { setDraft(displayedName); setEditing(true); }}
					style={{
						width: '100%',
						background: 'transparent',
						border: 'none',
						cursor: 'text',
						fontFamily: TYPE.manrope,
						fontSize: 13,
						fontWeight: 600,
						color: iconColor,
						padding: '0 8px',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
						textAlign: 'left',
					}}
				>
					{displayedName}
				</button>
			)}
		</div>
	);
}
