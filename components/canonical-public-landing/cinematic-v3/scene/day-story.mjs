import {MathUtils} from 'three';
import {studentDaySlides} from './content.mjs';

export const daySlides = studentDaySlides;

export function dayStoryPose(entrance, index, slide) {
  const {smoothstep, lerp, clamp} = MathUtils;
  const local = index - slide;
  const incoming = slide === 0 && index <= 0 ? entrance : smoothstep(1 + local, .32, 1);
  const leaving = clamp(local, 0, 1);
  const travel = smoothstep(incoming, .12, 1);
  const exit = smoothstep(leaving, 0, .9);
  const angle = -.92 * (1 - travel + exit);
  return {
    angle, yaw: angle * .48, y: -.3 * (1 - travel) + exit * .65,
    opacity: smoothstep(incoming, 0, .35) * (1 - smoothstep(leaving, .32, .9)),
    curvature: 64,
  };
}

export function gridDrift(time) {
  return time * .18;
}
