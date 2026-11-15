export function getStudySceneLayout(viewWidth: number, compact: boolean) {
  const width = Math.max(0.1, viewWidth);
  return {
    x: compact ? 0 : width * 0.27,
    scale: Math.min(1, width * (compact ? 0.72 : 0.4) / 3.2),
    surfaceY: -1.7,
  };
}
