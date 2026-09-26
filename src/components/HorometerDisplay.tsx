import React from 'react';

interface HorometerDisplayProps {
  hours: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showDecimals?: boolean;
}

export const HorometerDisplay: React.FC<HorometerDisplayProps> = ({
  hours,
  size = 'md',
  label = 'HORÓMETRO',
  showDecimals = true,
}) => {
  const formattedHours = hours.toFixed(1);
  const [whole, decimal] = formattedHours.split('.');
  // Pad whole part to 5 digits (e.g., 03488)
  const paddedWhole = whole.padStart(5, '0');

  const sizeClasses = {
    sm: {
      digit: 'w-5 h-7 text-xs font-mono font-bold',
      decimal: 'w-5 h-7 text-xs font-mono font-bold',
      container: 'p-1',
      label: 'text-[9px]',
      dot: 'text-xs',
    },
    md: {
      digit: 'w-7 h-9 text-base font-mono font-bold',
      decimal: 'w-7 h-9 text-base font-mono font-bold',
      container: 'p-1.5',
      label: 'text-[10px]',
      dot: 'text-sm',
    },
    lg: {
      digit: 'w-9 h-12 text-xl font-mono font-black',
      decimal: 'w-9 h-12 text-xl font-mono font-black',
      container: 'p-2',
      label: 'text-xs',
      dot: 'text-lg',
    },
  }[size];

  return (
    <div className="inline-flex flex-col items-center">
      {label && (
        <span
          className={`font-semibold tracking-wider text-slate-400 uppercase mb-1 ${sizeClasses.label}`}
        >
          {label}
        </span>
      )}
      <div
        className={`bg-zinc-950 border-2 border-zinc-800 rounded-md shadow-inner flex items-center gap-0.5 ${sizeClasses.container}`}
      >
        {/* Whole hour digits (Black background with white text) */}
        {paddedWhole.split('').map((digit, i) => (
          <div
            key={i}
            className={`bg-zinc-900 border border-zinc-700/60 text-zinc-100 flex items-center justify-center rounded shadow-sm select-none ${sizeClasses.digit}`}
            style={{
              fontFamily: "'Courier New', Courier, monospace",
              textShadow: '0 0 2px rgba(255,255,255,0.4)',
            }}
          >
            {digit}
          </div>
        ))}

        {showDecimals && (
          <>
            <span className={`text-amber-500 font-bold px-0.5 ${sizeClasses.dot}`}>.</span>
            {/* Decimal digit (White background with red/black text like real mechanical/digital horometers) */}
            <div
              className={`bg-amber-500 text-zinc-950 font-black border border-amber-600 flex items-center justify-center rounded shadow-sm select-none ${sizeClasses.decimal}`}
              style={{ fontFamily: "'Courier New', Courier, monospace" }}
            >
              {decimal || '0'}
            </div>
          </>
        )}
        <span className="text-[10px] text-zinc-400 font-bold ml-1 tracking-tighter">HRS</span>
      </div>
    </div>
  );
};
