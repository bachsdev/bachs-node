import React from 'react';
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { px } from '../mcpstyle/PixelFrames';
import { Phone3D } from './Phone3D';

// A look test for the 3D phone: placeholder screen on the campaign's grid paper.
export const PhoneTest: React.FC = () => {
  const frame = useCurrentFrame();
  const rotY = interpolate(frame, [0, 89], [-0.32, 0.32]);
  return (
    <AbsoluteFill style={{ background: px.paper, backgroundImage: 'linear-gradient(rgba(28,29,43,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(28,29,43,0.06) 1px, transparent 1px)', backgroundSize: '48px 48px' }}>
      <div style={{ position: 'absolute', left: 760, top: 990, width: 400, height: 40, borderRadius: '50%', background: 'rgba(28,29,43,0.22)', filter: 'blur(22px)' }} />
      <Phone3D width={1920} height={1080} pose={{ x: 0, y: 0, scale: 1.18, rotX: 0.06, rotY, rotZ: 0 }} screen={{ video: staticFile('mcphowto/test-screen.mp4') }} taps={[{ f: 45, x: 1030, y: 2335 }]} />
    </AbsoluteFill>
  );
};
