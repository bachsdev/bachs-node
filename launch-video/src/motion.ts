import { Easing, interpolate, spring } from 'remotion';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// A soft, slightly-overshooting spring that reads as "physical", not linear.
export const soft = (frame: number, fps: number, delay = 0, damping = 16, mass = 0.9) =>
  spring({ frame: frame - delay, fps, config: { damping, mass, stiffness: 120 } });

// Slower, no-overshoot settle for big camera-like moves.
export const glide = (frame: number, fps: number, delay = 0, durationInFrames = 40) =>
  spring({ frame: frame - delay, fps, durationInFrames, config: { damping: 200 } });

export const ease = (frame: number, input: [number, number], output: [number, number], curve = Easing.bezier(0.22, 1, 0.36, 1)) =>
  interpolate(frame, input, output, { ...clamp, easing: curve });

export const mix = (t: number, a: number, b: number) => a + (b - a) * t;
