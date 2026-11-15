import { describe, expect, it, vi } from "vitest";
import { DIANA_FLOOR, paintDianaFloor } from "./diana-ground-plane";

function context() {
  const gradient = { addColorStop: vi.fn() };
  return {
    gradient,
    canvas: {}, save: vi.fn(), restore: vi.fn(), clearRect: vi.fn(), setTransform: vi.fn(),
    resetTransform: vi.fn(), drawImage: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(),
    ellipse: vi.fn(), fill: vi.fn(function(this: { fillStyle?: string; filter?: string }) { return { color: this.fillStyle, filter: this.filter }; }), createLinearGradient: vi.fn(() => gradient),
  };
}

describe("Diana scene floor", () => {
  it.each(["original", "motion", "relit"] as const)("reduces satin reflections while retaining %s shoe contact and cast-shadow geometry", pose => {
    const source = {} as CanvasImageSource;
    const atrium = context(), atriumReflection = context();
    const satin = context(), satinReflection = context();
    paintDianaFloor(atrium as unknown as CanvasRenderingContext2D, atriumReflection as unknown as CanvasRenderingContext2D, source, pose);
    paintDianaFloor(satin as unknown as CanvasRenderingContext2D, satinReflection as unknown as CanvasRenderingContext2D, source, pose, "satin");
    expect(satin.ellipse.mock.calls).toEqual(atrium.ellipse.mock.calls);
    expect(satin.setTransform.mock.calls).toEqual(atrium.setTransform.mock.calls);
    expect(atrium.fill.mock.results.map(result => result.value)).toEqual(Array(2).fill({ color: "rgba(3, 10, 12, .60)", filter: "blur(2px)" }));
    expect(satin.fill.mock.results.map(result => result.value)).toEqual(Array(2).fill({ color: "rgba(3, 10, 12, .82)", filter: "blur(1.25px)" }));
    const { baseline } = DIANA_FLOOR;
    const { ground } = DIANA_FLOOR[pose];
    expect(atriumReflection.setTransform).toHaveBeenCalledWith(1, 0, 0, -.24, 300, baseline + ground * .24);
    expect(satinReflection.setTransform).toHaveBeenCalledWith(1, 0, 0, -.18, 300, baseline + ground * .18);
    expect(atriumReflection.createLinearGradient).toHaveBeenCalledWith(0, baseline - 8, 0, baseline + 96);
    expect(satinReflection.createLinearGradient).toHaveBeenCalledWith(0, baseline - 8, 0, baseline + 64);
    expect(atriumReflection.gradient.addColorStop).toHaveBeenCalledWith(0, "rgba(0, 0, 0, .14)");
    expect(satinReflection.gradient.addColorStop).toHaveBeenCalledWith(0, "rgba(0, 0, 0, .07)");
    expect(satinReflection.gradient.addColorStop).toHaveBeenCalledWith(.45, "rgba(0, 0, 0, .018)");
    expect(satinReflection.gradient.addColorStop).toHaveBeenCalledWith(1, "transparent");
  });

  it.each(["original", "motion", "relit"] as const)("projects the same displayed %s source into both layers", pose => {
    const floor = context();
    const reflection = context();
    const frame = {} as CanvasImageSource;
    paintDianaFloor(floor as unknown as CanvasRenderingContext2D, reflection as unknown as CanvasRenderingContext2D, frame, pose);
    expect(floor.drawImage).toHaveBeenNthCalledWith(1, frame, 0, 0, 564, 1440);
    expect(floor.drawImage).toHaveBeenNthCalledWith(2, reflection.canvas, 0, 0);
    expect(reflection.drawImage).toHaveBeenCalledWith(frame, 0, 0, 564, 1440);
    expect(floor.clearRect).toHaveBeenCalledWith(0, 0, DIANA_FLOOR.width, DIANA_FLOOR.height);
    expect(floor.ellipse).toHaveBeenCalledTimes(2);
    expect(floor.restore).toHaveBeenCalledOnce();
    expect(reflection.restore).toHaveBeenCalledOnce();
  });

  it.each(["atrium", "satin"] as const)("keeps %s reflection separate from ungraded cast/contact shadows when requested", material => {
    const floor = context();
    const reflection = context();
    const frame = {} as CanvasImageSource;
    paintDianaFloor(floor as unknown as CanvasRenderingContext2D, reflection as unknown as CanvasRenderingContext2D, frame, "motion", material, "separate");
    expect(floor.drawImage).toHaveBeenCalledExactlyOnceWith(frame, 0, 0, 564, 1440);
    expect(reflection.drawImage).toHaveBeenCalledExactlyOnceWith(frame, 0, 0, 564, 1440);
    expect(floor.drawImage).not.toHaveBeenCalledWith(reflection.canvas, 0, 0);
    expect(floor.ellipse).toHaveBeenCalledTimes(2);
    expect(floor.fill.mock.results.map(result => result.value)).toEqual(Array(2).fill(material === "satin"
      ? { color: "rgba(3, 10, 12, .82)", filter: "blur(1.25px)" }
      : { color: "rgba(3, 10, 12, .60)", filter: "blur(2px)" }));
  });
});
