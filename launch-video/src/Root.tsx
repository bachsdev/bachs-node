import React from 'react';
import { Composition } from 'remotion';
import { Launch } from './Launch';
import timeline from './timeline.json';
import { FrameColdOpen, FrameReading, FrameReceipt } from './skills/Styleframes';

const still = { durationInFrames: 1, fps: 30, width: 1920, height: 1080 };

export const Root: React.FC = () => (
  <>
    <Composition id="SkillsColdOpen" component={FrameColdOpen} {...still} />
    <Composition id="SkillsReading" component={FrameReading} {...still} />
    <Composition id="SkillsReceipt" component={FrameReceipt} {...still} />
    <Composition
    id="Launch"
    component={Launch}
    durationInFrames={timeline.total}
    fps={timeline.fps}
    width={timeline.width}
    height={timeline.height}
    />
  </>
);
