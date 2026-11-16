import { describe, expect, it } from "vitest";
import { pointFromPhoto, readGraphSettings, readPhotoCalibration, suggestPhotoAxisCrossing } from "./graph-work";

const reference = {
  origin: { u: .2, v: .8, x: 0, y: 0 },
  xTick: { u: .8, v: .74, value: 6 },
  yTick: { u: .16, v: .3, value: 10 },
};

describe("student-confirmed graph photo readings", () => {
  it("reads a coordinate on skewed axes with different scales", () => {
    const calibration = readPhotoCalibration(reference);
    expect(calibration).not.toBeNull();
    expect(pointFromPhoto({ u: .48, v: .52 }, calibration!)).toEqual({ x: 3, y: 5 });
  });

  it("requires distinct values and spaced axis markers", () => {
    expect(readPhotoCalibration({ ...reference, yTick: { ...reference.yTick, value: 0 } })).toBeNull();
    expect(readPhotoCalibration({ ...reference, yTick: { ...reference.xTick, value: 1 } })).toBeNull();
  });

  it("keeps the source and calibration and bounds saved readings", () => {
    const settings = readGraphSettings({ photo: {
      sourceId: "11111111-1111-4111-8111-111111111111", title: "Worksheet.jpg", calibration: reference,
      marks: Array.from({ length: 30 }, () => ({ u: .48, v: .52 })),
    }, points: [{ x: 3, y: 5 }] });
    expect(settings.photo?.marks).toHaveLength(12);
    expect(settings.photo?.calibration).toEqual(reference);
    expect(settings.points).toEqual([{ x: 3, y: 5 }]);
  });

  it("suggests a pixel location for clear axes and declines a blank photo", () => {
    const width = 100, height = 100;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
    expect(suggestPhotoAxisCrossing(pixels, width, height)).toBeNull();
    for (let index = 5; index < 95; index++) {
      const vertical = (index * width + 25) * 4;
      const horizontal = (72 * width + index) * 4;
      pixels.fill(0, vertical, vertical + 3);
      pixels.fill(0, horizontal, horizontal + 3);
    }
    expect(suggestPhotoAxisCrossing(pixels, width, height)).toEqual({ u: .25, v: .72 });
  });
});
