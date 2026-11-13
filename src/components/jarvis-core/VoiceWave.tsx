import React from 'react';

interface VoiceWaveProps {
  isActive: boolean;
  color?: string;
  barsCount?: number;
}

export const VoiceWave: React.FC<VoiceWaveProps> = ({
  isActive,
  color = 'cyan',
  barsCount = 24,
}) => {
  return (
    <div className="flex items-center justify-center space-x-1 h-10 px-4">
      {Array.from({ length: barsCount }).map((_, i) => {
        // Compute pseudo-random or stepped heights
        const delay = (i % 6) * 0.15;
        const baseHeight = 4;
        const activeHeight = Math.sin(i * 0.5) * 16 + 18;

        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-150 ${
              isActive
                ? color === 'rose'
                  ? 'bg-rose-400 shadow-[0_0_8px_#f43f5e]'
                  : 'bg-cyan-400 shadow-[0_0_8px_#00f3ff]'
                : 'bg-cyan-950/60'
            }`}
            style={{
              height: isActive ? `${activeHeight}px` : `${baseHeight}px`,
              animation: isActive ? `pulse 0.8s ease-in-out infinite alternate ${delay}s` : 'none',
            }}
          />
        );
      })}
    </div>
  );
};
