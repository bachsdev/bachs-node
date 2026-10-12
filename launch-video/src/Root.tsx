import React from 'react';
import { Composition } from 'remotion';
import { Launch } from './Launch';
import timeline from './timeline.json';

export const Root: React.FC = () => (
  <Composition
    id="Launch"
    component={Launch}
    durationInFrames={timeline.total}
    fps={timeline.fps}
    width={timeline.width}
    height={timeline.height}
  />
);
