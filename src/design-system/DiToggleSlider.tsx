import React from 'react';
import { cn } from '../components/ui/utils';
import { diTokens } from './tokens';

interface DiToggleSliderProps {
	label: React.ReactNode;
	checked: boolean;
	formattedValue: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onToggle: () => void;
	onSliderChange: (value: number) => void;
	children?: React.ReactNode;
}

export function DiToggleSlider({
	label,
	checked,
	formattedValue,
	value,
	min,
	max,
	step,
	onToggle,
	onSliderChange,
	children,
}: DiToggleSliderProps) {
	return (
		<div className="space-y-1.5">
			<div className="flex justify-between items-center text-xs opacity-70">
				<label className="flex items-center gap-2 cursor-pointer select-none">
					<input
						type="checkbox"
						checked={checked}
						onChange={onToggle}
						className={cn("rounded-sm w-3 h-3", diTokens.sliderAccent)}
					/>
					<span className="flex items-center gap-1">{label}</span>
				</label>
				<span>{formattedValue}</span>
			</div>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				disabled={!checked}
				value={value}
				onChange={(e) => onSliderChange(parseFloat(e.target.value))}
				className={cn(
					"w-full h-1.5 rounded-lg appearance-none cursor-pointer",
					diTokens.sliderBg, diTokens.sliderAccent,
					!checked && "opacity-50 cursor-not-allowed"
				)}
			/>
			{children}
		</div>
	);
}
