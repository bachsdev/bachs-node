import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { Grain, SceneShell } from './components';
import { Checkout, Code, Dashboard, Install, Intro, Languages, MeetSnapKit, Outro } from './scenes';
import { fontFaceCss } from './theme';
import timeline from './timeline.json';

const scenes: Record<string, React.FC> = {
  intro: Intro,
  snapkit: MeetSnapKit,
  install: Install,
  code: Code,
  checkout: Checkout,
  dashboard: Dashboard,
  languages: Languages,
  outro: Outro,
};

export const Launch: React.FC = () => (
  <AbsoluteFill style={{ background: '#0d0e16' }}>
    <style>{fontFaceCss}</style>
    {timeline.scenes.map(({ id, from, dur }, i) => {
      const Scene = scenes[id];
      return (
        <Sequence key={id} from={from} durationInFrames={dur} name={id}>
          <SceneShell dur={dur} exit={i < timeline.scenes.length - 1}>
            <Scene />
          </SceneShell>
        </Sequence>
      );
    })}
    <Grain />
    <Audio src={staticFile('audio/mix.wav')} />
  </AbsoluteFill>
);
