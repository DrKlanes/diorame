import React from 'react';
import { DiActionButton } from '../../../design-system';
import { useStrata } from '../StrataContext';

interface InfoButtonProps { dark: boolean; }

export function InfoButton({ dark }: InfoButtonProps) {
	const { dispatch } = useStrata();
	return (
		<DiActionButton
			name="info"
			onClick={() => dispatch({ type: 'TOGGLE_WELCOME_MODAL' })}
			dark={dark}
			tooltip="About Diorame"
			shortcut="Shift+?"
		/>
	);
}
