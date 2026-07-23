import { VISUAL_THEME } from '../config/VisualTheme';

/** 向现有 UI 组件提供稳定别名，色值统一来自 VisualTheme。 */
export const UI_THEME = {
  colors: {
    ink: VISUAL_THEME.reality.doorway,
    inkCss: VISUAL_THEME.css.ink,
    charcoal: VISUAL_THEME.murmur.charcoal,
    paper: VISUAL_THEME.reality.limeWhite,
    paperCss: VISUAL_THEME.css.paper,
    chalk: '#eee9dc',
    dust: VISUAL_THEME.reality.dustYellow,
    dustCss: '#b89a62',
    ochre: VISUAL_THEME.memory.darkGold,
    clay: VISUAL_THEME.memory.oldRed,
    fadedGreen: VISUAL_THEME.reality.deadGrass,
    memory: '#a8b09a',
    ghost: '#b7b5aa',
  },
  fonts: VISUAL_THEME.fonts,
} as const;

