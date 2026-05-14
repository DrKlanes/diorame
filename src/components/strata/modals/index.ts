// DiModal — compound component modal system
// Usage: <DiModal open={...} onClose={...} dark={dark}>
//   <DiModal.Header title="..." />
//   <DiModal.Body>...</DiModal.Body>
//   <DiModal.Footer>
//     <DiModal.SecondaryAction onClick={onClose}>Cancel</DiModal.SecondaryAction>
//     <DiModal.PrimaryAction onClick={onConfirm}>Confirm</DiModal.PrimaryAction>
//   </DiModal.Footer>
// </DiModal>

export type { DiModalVariant } from './DiModalContext';
export { useModalBehavior } from './useModalBehavior';

import { DiModalRoot } from './DiModal';
import { DiModalHeader } from './DiModalHeader';
import { DiModalBody } from './DiModalBody';
import { DiModalFooter } from './DiModalFooter';
import { DiModalCloseButton } from './DiModalCloseButton';
import {
	PrimaryAction,
	SecondaryAction,
	DestructiveAction,
	TertiaryAction,
} from './DiModalActions';

export const DiModal = Object.assign(DiModalRoot, {
	Header:            DiModalHeader,
	Body:              DiModalBody,
	Footer:            DiModalFooter,
	CloseButton:       DiModalCloseButton,
	PrimaryAction,
	SecondaryAction,
	DestructiveAction,
	TertiaryAction,
});
