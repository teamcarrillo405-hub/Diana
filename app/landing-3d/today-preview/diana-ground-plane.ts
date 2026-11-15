export type DianaPose = "original" | "motion" | "relit";
export type DianaFloorMaterial = "atrium" | "satin";

// The floor is a small projection surface, not a second video decoder.
// Anchors are in the same normalized 564 x 1440 portrait coordinates.
export const DIANA_FLOOR = {
  sourceWidth: 564,
  sourceHeight: 1440,
  width: 864,
  height: 200,
  baseline: 60,
  contactRadiusY: 4.5,
  original: { ground: 1398, shoes: [[180, 1380, 39], [451, 1394, 76]] },
  motion: { ground: 1372, shoes: [[169, 1360, 30], [444, 1371, 59]] },
  // Median sole supports from the 193-frame, 1504 x 3840 relit source.
  relit: { ground: 1362, shoes: [[174.9375, 1350, 31.5], [484.125, 1362, 33.9375]] },
} as const;

export function paintDianaFloor(
  context: CanvasRenderingContext2D,
  reflection: CanvasRenderingContext2D,
  source: CanvasImageSource,
  pose: DianaPose,
  material: DianaFloorMaterial = "atrium",
  reflectionOutput: "composite" | "separate" = "composite",
) {
  const { width, height, baseline, sourceWidth, sourceHeight, contactRadiusY } = DIANA_FLOOR;
  const satin = material === "satin";
  const reflectionScale = satin ? .18 : .24;
  const leftMargin = 300;
  const { ground, shoes } = DIANA_FLOOR[pose];
  context.save();
  context.clearRect(0, 0, width, height);
  // Overhead/right daylight casts a short, soft shadow toward the foreground left.
  context.filter = "blur(5px)";
  context.setTransform(1, 0, .24, -.075, leftMargin - ground * .24, baseline + ground * .075);
  context.drawImage(source, 0, 0, sourceWidth, sourceHeight);
  context.resetTransform();
  context.filter = "none";
  context.globalCompositeOperation = "source-in";
  context.fillStyle = "rgba(4, 11, 14, .24)";
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "source-over";

  reflection.save();
  reflection.clearRect(0, 0, width, height);
  reflection.filter = satin ? "blur(3px) saturate(.55) brightness(.65)" : "blur(2px) saturate(.55) brightness(.65)";
  reflection.setTransform(1, 0, 0, -reflectionScale, leftMargin, baseline + ground * reflectionScale);
  reflection.drawImage(source, 0, 0, sourceWidth, sourceHeight);
  reflection.resetTransform();
  reflection.filter = "none";
  reflection.globalCompositeOperation = "destination-in";
  const fade = reflection.createLinearGradient(0, baseline - 8, 0, baseline + (satin ? 64 : 96));
  fade.addColorStop(0, satin ? "rgba(0, 0, 0, .07)" : "rgba(0, 0, 0, .14)");
  fade.addColorStop(.45, satin ? "rgba(0, 0, 0, .018)" : "rgba(0, 0, 0, .045)");
  fade.addColorStop(1, "transparent");
  reflection.fillStyle = fade;
  reflection.fillRect(0, 0, width, height);
  reflection.restore();
  // A separate display layer can share the character grade without tinting shadows.
  if (reflectionOutput === "composite") context.drawImage(reflection.canvas, 0, 0);

  context.filter = satin ? "blur(1.25px)" : "blur(2px)";
  context.fillStyle = satin ? "rgba(3, 10, 12, .82)" : "rgba(3, 10, 12, .60)";
  for (const [x, y, radius] of shoes) {
    context.beginPath();
    context.ellipse(leftMargin + x, baseline + y - ground, radius, contactRadiusY, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}
