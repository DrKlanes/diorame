import React from 'react';
import { X } from 'lucide-react';

interface ControlsExportProps {
	showComplexityWarning: boolean;
	totalShapes: number;
	onCancel: () => void;
	onProceed: () => void;
}

export const ControlsExport = ({ showComplexityWarning, totalShapes, onCancel, onProceed }: ControlsExportProps) => {
	if (!showComplexityWarning) return null;

	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[2px] transition-all duration-300 opacity-100"
			onClick={onCancel}
		>
			<div
				className="relative bg-white w-[90%] max-w-[420px] p-8 flex flex-col items-center text-center shadow-2xl transition-all duration-300 scale-100 opacity-100"
				style={{ borderRadius: '2rem' }}
				onClick={(e) => e.stopPropagation()}
			>
				<button
					onClick={onCancel}
					className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-all duration-200 text-slate-400 hover:text-slate-600 hover:scale-110 active:scale-95"
				>
					<X className="w-5 h-5" />
				</button>

				<h1
					className="text-2xl mb-4 leading-tight"
					style={{ color: '#353535', fontWeight: 678, letterSpacing: '-0.02em' }}
				>
					Complex Scene Warning
				</h1>

				<div
					className="text-base leading-relaxed max-w-[360px] space-y-4"
					style={{ color: '#666666', fontWeight: 398 }}
				>
					<p>
						Your scene contains <span className="font-semibold" style={{ color: '#353535' }}>{totalShapes} shapes</span>, which may cause export to fail due to browser memory limits.
					</p>

					<div className="text-left">
						<p className="font-medium mb-2" style={{ color: '#353535', fontWeight: 500 }}>
							Recommendations:
						</p>
						<ul className="list-disc pl-5 space-y-1 text-sm">
							<li>Save your project (.dior) before exporting</li>
							<li>Use SVG (Compressed) format for better performance</li>
							<li>Consider reducing scene complexity or hiding unused layers</li>
						</ul>
					</div>

					<p className="text-sm">
						Do you want to continue with the export?
					</p>
				</div>

				<div className="flex gap-3 mt-6 w-full max-w-[320px]">
					<button
						onClick={onCancel}
						className="flex-1 px-4 py-2.5 bg-slate-100 rounded-full text-sm font-medium tracking-wide transition-colors cursor-pointer hover:bg-slate-200 active:scale-95"
						style={{ color: '#353535' }}
					>
						Cancel
					</button>
					<button
						onClick={onProceed}
						className="flex-1 px-4 py-2.5 bg-[rgb(3,2,19)] rounded-full text-sm text-white font-medium tracking-wide transition-colors cursor-pointer hover:bg-[#1d293d] shadow-sm active:scale-95"
					>
						Continue Anyway
					</button>
				</div>
			</div>
		</div>
	);
};
