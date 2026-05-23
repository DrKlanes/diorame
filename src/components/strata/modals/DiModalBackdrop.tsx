import React from 'react';
import { motion } from 'framer-motion';
import { Z_INDEX } from '../../../design-system/tokens';

const variants = {
	hidden:  { opacity: 0, transition: { duration: 0.20 } },
	visible: { opacity: 1, transition: { duration: 0.15 } },
};

type DiModalBackdropProps = {
	dark: boolean;
	onClick?: () => void;
};

export function DiModalBackdrop({ dark, onClick }: DiModalBackdropProps) {
	return (
		<motion.div
			variants={variants}
			initial="hidden"
			animate="visible"
			exit="hidden"
			onClick={onClick}
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: Z_INDEX.modalBackdrop,
				backgroundColor: dark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.32)',
				backdropFilter: 'blur(8px)',
				WebkitBackdropFilter: 'blur(8px)',
			}}
		/>
	);
}
