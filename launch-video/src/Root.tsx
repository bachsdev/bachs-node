import React from 'react';
import { Composition } from 'remotion';
import { Launch } from './Launch';
import timeline from './timeline.json';
import { FrameColdOpen, FrameReading, FrameReceipt } from './skills/Styleframes';
import { SkillsVideo } from './skills/SkillsVideo';
import { TOTAL as SKILLS_TOTAL } from './skills/grid';
import { McpVideo } from './mcp/McpVideo';
import { SAMPLE_TOTAL, TutorialSample } from './tutorial/Sample';
import { cutLength, Episode01, type Cut } from './tutorial/ep01/Episode01';
import { nodeChapters, nodeTakes } from './tutorial/ep01/node';
import { pythonChapters, pythonTakes } from './tutorial/ep01/python';
import { BUY_CREDITS_TOTAL, BuyCredits } from './inaction/BuyCredits';
import { DOIT_TOTAL, DoIt } from './doit/DoIt';
import { BUILDWITH_TOTAL, BuildWith } from './buildwith/BuildWith';
import { MCP_LAUNCH_TOTAL, McpLaunch } from './mcplaunch/McpLaunch';
import { MCP_HYPE_TOTAL, McpHype } from './mcphype/McpHype';
import { FrameLedger, FrameRiso, FrameSignal } from './mcpstyle/Frames';
import { FrameBrandAnswer, FrameBrandCover } from './mcpstyle/BrandFrames';
import { FrameBoard, FrameNetwork, FrameRoute } from './mcpstyle/TransitFrames';
import { TOTAL as MCP_TOTAL } from './mcp/grid';

const still = { durationInFrames: 1, fps: 30, width: 1920, height: 1080 };
const ep01Node: Cut = { lang: 'node', label: 'Node.js · @bachs/sdk', chapters: nodeChapters, takes: nodeTakes };
const ep01Python: Cut = { lang: 'python', label: 'Python · bachs', chapters: pythonChapters, takes: pythonTakes };

export const Root: React.FC = () => (
  <>
    <Composition id="StyleBoard" component={FrameBoard} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="StyleRoute" component={FrameRoute} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="StyleNetwork" component={FrameNetwork} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="StyleBrandAnswer" component={FrameBrandAnswer} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="StyleBrandCover" component={FrameBrandCover} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="StyleLedger" component={FrameLedger} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="StyleSignal" component={FrameSignal} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="StyleRiso" component={FrameRiso} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="McpHype" component={McpHype} durationInFrames={MCP_HYPE_TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="McpLaunch" component={McpLaunch} durationInFrames={MCP_LAUNCH_TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="BuildWith" component={BuildWith} durationInFrames={BUILDWITH_TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="DoIt" component={DoIt} durationInFrames={DOIT_TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="BuyCredits" component={BuyCredits} durationInFrames={BUY_CREDITS_TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="TutorialSample" component={TutorialSample} durationInFrames={SAMPLE_TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="Ep01Node" component={Episode01} defaultProps={{ cut: ep01Node }} durationInFrames={cutLength(ep01Node)} fps={30} width={1920} height={1080} />
    <Composition id="Ep01Python" component={Episode01} defaultProps={{ cut: ep01Python }} durationInFrames={cutLength(ep01Python)} fps={30} width={1920} height={1080} />
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
