import React, { useEffect, useRef } from 'react';

interface ArcReactorProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  isThinking?: boolean;
  size?: number;
}

export const ArcReactor: React.FC<ArcReactorProps> = ({
  isListening = false,
  isSpeaking = false,
  isThinking = false,
  size = 280,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high DPI canvas resolution
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    let animationFrameId: number;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;

      // Dynamic rotation speed based on state
      const speed = isThinking ? 0.04 : isSpeaking ? 0.025 : isListening ? 0.02 : 0.008;
      angle += speed;

      // Dynamic pulse intensity
      const pulse = Math.sin(Date.now() * (isListening || isSpeaking ? 0.008 : 0.003)) * 0.15 + 0.85;

      // 1. Outer Hologram Ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.46, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 243, 255, ${0.15 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Outer dashed compass ring
      ctx.rotate(-angle * 0.5);
      ctx.beginPath();
      ctx.setLineDash([4, 8]);
      ctx.arc(0, 0, size * 0.43, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 102, 255, ${0.4 * pulse})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 2. Segmented Rotating Gear / Energy Nodes
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      const segments = 12;
      for (let i = 0; i < segments; i++) {
        const segAngle = (i * (Math.PI * 2)) / segments;
        ctx.save();
        ctx.rotate(segAngle);

        // Segment block
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.36, -0.12, 0.12);
        ctx.lineWidth = 8;
        ctx.strokeStyle =
          isListening || isSpeaking
            ? `rgba(0, 243, 255, ${0.8 * pulse})`
            : `rgba(0, 243, 255, ${0.45 * pulse})`;
        ctx.stroke();

        // Inner glowing notch
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.32, -0.06, 0.06);
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * pulse})`;
        ctx.stroke();

        ctx.restore();
      }
      ctx.restore();

      // 3. Counter-rotating Intermediate Tech Ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-angle * 1.4);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.26, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(0, 243, 255, ${0.5 * pulse})`;
      ctx.stroke();

      // 4 Tech marker ticks
      for (let i = 0; i < 8; i++) {
        const tickAngle = (i * Math.PI) / 4;
        const x1 = Math.cos(tickAngle) * (size * 0.24);
        const y1 = Math.sin(tickAngle) * (size * 0.24);
        const x2 = Math.cos(tickAngle) * (size * 0.28);
        const y2 = Math.sin(tickAngle) * (size * 0.28);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00f3ff';
        ctx.stroke();
      }
      ctx.restore();

      // 4. Central Glowing Arc Reactor Core
      ctx.save();
      ctx.translate(centerX, centerY);

      // Core Radial Gradient Glow
      const glowRadius = size * 0.22 * pulse;
      const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
      if (isThinking) {
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        coreGradient.addColorStop(0.3, 'rgba(0, 243, 255, 0.8)');
        coreGradient.addColorStop(0.7, 'rgba(138, 43, 226, 0.5)'); // purple energy surge
        coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (isListening) {
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        coreGradient.addColorStop(0.25, 'rgba(0, 243, 255, 0.9)');
        coreGradient.addColorStop(0.6, 'rgba(0, 102, 255, 0.6)');
        coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        coreGradient.addColorStop(0.25, 'rgba(0, 243, 255, 0.7)');
        coreGradient.addColorStop(0.65, 'rgba(0, 102, 255, 0.3)');
        coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.beginPath();
      ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      // Inner white focal spark
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.06 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 20;
      ctx.fill();

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isListening, isSpeaking, isThinking, size]);

  return (
    <div className="relative flex items-center justify-center p-2">
      {/* Outer ambient glow background */}
      <div
        className={`absolute rounded-full transition-all duration-700 pointer-events-none ${
          isThinking
            ? 'w-72 h-72 bg-purple-500/10 blur-2xl animate-pulse'
            : isListening
            ? 'w-72 h-72 bg-cyan-400/20 blur-2xl animate-pulse'
            : 'w-64 h-64 bg-cyan-500/10 blur-xl'
        }`}
      />
      <canvas ref={canvasRef} className="relative z-10 drop-shadow-[0_0_25px_rgba(0,243,255,0.4)]" />
    </div>
  );
};
