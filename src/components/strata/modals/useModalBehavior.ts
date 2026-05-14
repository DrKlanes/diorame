import { useEffect, RefObject } from 'react';
import { DiModalVariant } from './DiModalContext';

const FOCUSABLE = [
	'button:not([disabled])',
	'[href]',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join(', ');

type UseModalBehaviorOptions = {
	isOpen: boolean;
	onClose: () => void;
	variant: DiModalVariant;
	modalRef: RefObject<HTMLDivElement>;
	initialFocusRef?: RefObject<HTMLElement>;
	closeOnEsc?: boolean;
};

export function useModalBehavior({
	isOpen,
	onClose,
	variant,
	modalRef,
	initialFocusRef,
	closeOnEsc = true,
}: UseModalBehaviorOptions): void {
	// Scroll lock
	useEffect(() => {
		if (!isOpen) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = prev; };
	}, [isOpen]);

	// Esc key — alert variant cannot be dismissed with Esc
	useEffect(() => {
		if (!isOpen || !closeOnEsc || variant === 'alert') return;
		const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	}, [isOpen, closeOnEsc, variant, onClose]);

	// Initial focus
	useEffect(() => {
		if (!isOpen) return;
		const modal = modalRef.current;
		if (!modal) return;
		requestAnimationFrame(() => {
			if (initialFocusRef?.current) {
				initialFocusRef.current.focus();
				return;
			}
			if (variant === 'alert') {
				const cancel = modal.querySelector<HTMLElement>('[data-di-cancel="true"]');
				if (cancel) { cancel.focus(); return; }
			}
			const first = modal.querySelector<HTMLElement>(FOCUSABLE);
			first?.focus();
		});
	}, [isOpen, variant, modalRef, initialFocusRef]);

	// Focus trap
	useEffect(() => {
		if (!isOpen) return;
		const modal = modalRef.current;
		if (!modal) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key !== 'Tab') return;
			const nodes = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE));
			if (nodes.length === 0) return;
			const first = nodes[0];
			const last = nodes[nodes.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		};
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	}, [isOpen, modalRef]);
}
