import React from 'react';
import { Composition } from 'remotion';
import { Launch } from './Launch';
import timeline from './timeline.json';
import { FrameColdOpen, FrameReading, FrameReceipt } from './skills/Styleframes';
import { SkillsVideo } from './skills/SkillsVideo';
import { TOTAL as SKILLS_TOTAL } from './skills/grid';
import { McpVideo } from './mcp/McpVideo';
import { TOTAL as MCP_TOTAL } from './mcp/grid';

const still = { durationInFrames: 1, fps: 30, width: 1920, height: 1080 };

export const Root: React.FC = () => (
  <>
    <Composition id="Mcp" component={McpVideo} durationInFrames={MCP_TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="Skills" component={SkillsVideo} durationInFrames={SKILLS_TOTAL} fps={30} width={1920} height={1080} />
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
