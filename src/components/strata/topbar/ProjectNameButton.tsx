import React, { useEffect, useRef, useState } from 'react';
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
	const inputRef = useRef<HTMLInputElement>(null);

	const iconColor = dk(dark, T.dark, T.textDark) as string;

	// One commit per editing session, whichever route gets there first: pointerdown
	// outside, blur or Enter can all fire for a single interaction, and without this
	// the later ones re-dispatch a name that is already set.
	const committedRef = useRef(false);

	const commitFilename = () => {
		if (committedRef.current) return;
		committedRef.current = true;
		setEditing(false);
		const trimmed = draft.trim();
		// An empty field and the default label itself both mean "no name given". The
		// label has to collapse back to the sentinel because the draft is SEEDED with
		// it: opening the pill and touching elsewhere without typing would otherwise
		// store "Proyecto sin título" verbatim, binding the .dior to the UI language —
		// the one thing constants/project.ts says must never happen. Looks identical on
		// screen, so it went unnoticed; measured in the saved payload.
		const next = (trimmed === '' || trimmed === t('topbar.file.untitledProject'))
			? UNTITLED_PROJECT_SENTINEL
			: trimmed;
		if (next !== filename) {
			dispatch({ type: 'SET_PROJECT_NAME', payload: next });
		}
	};

	// Committing on blur alone stopped working in v3.17.21: every action button now
	// preventDefaults its mousedown so it never takes the focus — which also means the
	// focus never LEAVES this input. Clicking Save saved the PREVIOUS name, as the
	// download filename and inside the .dior alike, and Enter became the only way to
	// confirm. Unacceptable on an iPad, where nobody knows to press it.
	//
	// pointerdown outside is the fix: it fires BEFORE mousedown, so no button's
	// preventDefault can suppress it, and it is one event for mouse, touch and Pencil.
	// Capture phase, so nothing downstream can swallow it first.
	//
	// It commits directly instead of calling blur(): blur() is a no-op unless the input
	// actually holds the focus, and that is not guaranteed — measured here in a DOM
	// where the input was mounted with document.activeElement still on BODY. The commit
	// must not depend on who has the focus.
	const commitRef = useRef(commitFilename);
	commitRef.current = commitFilename;

	useEffect(() => {
		if (!editing) return;
		const commitOnPointerDownOutside = (e: PointerEvent) => {
			const el = inputRef.current;
			if (!el || el.contains(e.target as Node)) return;
			commitRef.current();
		};
		document.addEventListener('pointerdown', commitOnPointerDownOutside, true);
		return () => document.removeEventListener('pointerdown', commitOnPointerDownOutside, true);
	}, [editing]);

	// Wrapper constrains both display and edit modes to the same fixed width,
	// preventing the pill from growing when switching to edit mode.
	return (
		<div style={{ width: NAME_WIDTH, flexShrink: 0, overflow: 'hidden' }}>
			{editing ? (
				<input
					ref={inputRef}
					autoFocus
					value={draft}
					onChange={e => setDraft(e.target.value)}
					onBlur={commitFilename}
					onKeyDown={e => {
						if (e.key === 'Enter') commitFilename();
						if (e.key === 'Escape') { committedRef.current = true; setDraft(displayedName); setEditing(false); }
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
					onClick={() => { committedRef.current = false; setDraft(displayedName); setEditing(true); }}
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
