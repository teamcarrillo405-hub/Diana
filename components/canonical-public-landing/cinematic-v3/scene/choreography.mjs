import {productSlides, studentDaySlides} from './content.mjs';
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const smooth = (value, low, high) => {
  const t = clamp((value - low) / (high - low), 0, 1);
  return t * t * (3 - 2 * t);
};

export function createChoreography({height, span, tutorWidth}) {
  // Keep native input untouched while holding each readable beat for roughly one viewport.
  const unit = height * 1.28;
  const opening = height;
  const entry = opening * .18;
  const tutorLockStart = opening * .56;
  const startX = span * .95;
  const endX = -span * .58 - tutorWidth / 2 - 1.4;
  const textExit = height * 2.4;
  const tutorX = 0;
  const tutorY = height < 720 ? 1.1 : 2.05;
  const speed = (startX - endX) / (textExit - entry);
  const previousRange = entry + span * 1.6 / speed;
  const carouselStart = textExit + unit * .08;
  // Give the product screens room to arrive, settle, and leave without a hurried snap.
  const entrance = unit * 1.16;
  const hold = unit * 1.24;
  const firstHold = hold + unit * .82;
  const turn = unit * 1.08;
  const productHolds = productSlides.map((_, index) => index === 0 ? firstHold : hold);
  const centers = productSlides.map((_, index) => carouselStart + entrance + index * (hold + turn) + (index > 0 ? firstHold - hold : 0));
  const first = centers[0], last = centers.at(-1);
  const exit = unit * 1.08;
  const exitEnd = last + hold + exit;
  const growthStart = last + hold + exit * .45;
  const growthEnd = exitEnd + unit * .44;
  const waveStart = growthEnd + unit * .1;
  const waveEnd = waveStart + unit * 1.62;
  const visionStart = waveEnd + unit * .28;
  // Seven calm, scroll-led statements need a full reading beat rather than a timed loop.
  const visionEnd = visionStart + unit * 8.4;
  const visionSequenceStart = visionStart + unit * .48;
  const visionSequenceEnd = visionEnd;
  const diveStart = visionEnd + unit * .18;
  const diveEnd = diveStart + unit * 1.25;
  const dayStart = diveEnd - unit * .13;
  const daySettled = dayStart + unit * .82;
  const dayHold = unit * 1.58;
  const dayTurn = unit * 1.4;
  // A video supplies its own reading time. Do not add a second long scroll hold after it ends.
  const dayHolds = studentDaySlides.map(slide => slide.video ? unit * .10 : dayHold);
  const dayCenters = [daySettled];
  for (let index = 1; index < studentDaySlides.length; index++) dayCenters.push(dayCenters[index - 1] + dayHolds[index - 1] + dayTurn);
  const dayLast = dayCenters.at(-1);
  const dayExitEnd = dayLast + dayHolds.at(-1) + unit * 1.2;
  const breachStart = dayExitEnd + unit * .06;
  // Let the transition fracture slowly enough to read as a physical change, not a flash.
  const breachEnd = breachStart + unit * 2.1;
  const controlStart = breachStart + unit * 1.8;
  const controlTitleStop = controlStart + unit * .32;
  const controlTitleHoldEnd = controlStart + unit * .84;
  const controlTitleExitEnd = controlStart + unit * 1.55;
  const controlFirst = controlTitleExitEnd + unit * .36;
  const controlHold = unit * .68;
  const controlTurn = unit * .96;
  const controlCenters = [controlFirst, controlFirst + controlHold + controlTurn, controlFirst + 2 * (controlHold + controlTurn)];
  // The final composition stays visible as the sticky stage scrolls into the Q&A.
  const controlEnd = controlCenters.at(-1) + controlHold;
  const end = controlEnd;
  const dayReadingStops = dayCenters.map((value, index) => value + dayHolds[index] * .18);
  const dayPlaybackStops = dayCenters.map((point, index) => studentDaySlides[index].video ? point : null);
  const stops = centers.map(value => value + hold * .45);
  const controlReadingStops = controlCenters.map(value => value + controlHold * .2);
  const visionReadingStops = Array.from({length: 7}, (_, index) => visionSequenceStart + (index + .30) / 7 * (visionSequenceEnd - visionSequenceStart));
  const readingStops = [...visionReadingStops.map((point, index) => ({id: `vision-${index}`, point, duration: index === 3 ? 1800 : 2300})), {id: 'control-title', point: controlTitleStop, duration: 2200}];
  const sequenceIndex = (pixels, values, duration, exit) => values.reduce((sum, value, index) => {
    const holdDuration = Array.isArray(duration) ? duration[index] : duration;
    return sum + smooth(pixels, value + holdDuration, values[index + 1] ?? exit);
  }, 0);
  const finaleStops = [growthEnd, waveStart + (waveEnd - waveStart) * .5, waveEnd + height * .2];

  return {
    end, nativeEnd: end - (textExit - tutorLockStart), textExit, tutorLockStart, tutorX, tutorY, carouselStart, stops, finaleStops, waveStart, waveEnd, exitEnd, startX, endX, tutorWidth,
    visionStart, visionEnd,
    diveStart, diveEnd, dayStart, daySettled,
    dayReadingStops, dayPlaybackStops, dayExitEnd, breachStart, breachEnd, controlStart, controlEnd, controlReadingStops, readingStops, visionReadingStops,
    controlStop: controlTitleStop,
    dayStops: [diveStart + height * .7, diveStart + height * 1.35, dayStart + height * .3, daySettled + height * .4],
    visionStops: [visionStart + height * .6, visionStart + height * 1.7, visionEnd],
    progressAt(pixels, tutorProgress = null) {
      const visiblePixels = tutorProgress === null ? pixels : tutorLockStart + clamp(tutorProgress, 0, 1) * (textExit - tutorLockStart);
      return clamp(visiblePixels / end, 0, 1);
    },
    at(pixels) {
      const travel = clamp((pixels - entry) / (textExit - entry), 0, 1);
      const stage = smooth(pixels, carouselStart, first);
      const index = sequenceIndex(pixels, centers, productHolds, exitEnd);
      const activeProduct = Math.min(productSlides.length - 1, Math.round(index));
      const productHoldProgress = clamp((pixels - centers[activeProduct]) / productHolds[activeProduct], 0, 1);
      const dayIndex = sequenceIndex(pixels, dayCenters, dayHolds, dayExitEnd);
      const dayActive = Math.min(studentDaySlides.length - 1, Math.round(dayIndex));
      const dayHoldProgress = clamp((pixels - dayCenters[dayActive]) / dayHolds[dayActive], 0, 1);
      const dayCaption = smooth(pixels, dayStart + height * .35, daySettled)
        * (1 - smooth(Math.abs(dayIndex - Math.round(dayIndex)), .32, .5))
        * (1 - smooth(dayIndex, studentDaySlides.length - .6, studentDaySlides.length));
      const controlScene = clamp((pixels - controlStart) / (controlEnd - controlStart), 0, 1);
      const controlIntro = clamp((pixels - controlStart) / (controlTitleExitEnd - controlStart), 0, 1);
      const controlBeatIndex = smooth(pixels, controlCenters[0] + controlHold, controlCenters[1]) + smooth(pixels, controlCenters[1] + controlHold, controlCenters[2]);
      return {
        // Let the DIANA wordmark fully dissolve under native scrolling before the tutor holds the stage.
        opening: 1 - smooth(pixels, opening * .015, tutorLockStart),
        tutor: 0,
        x: tutorX,
        y: tutorY,
        stage, index,
        productDetail: smooth(productHoldProgress, .42, .54),
        growth: smooth(pixels, growthStart, growthEnd),
        wave: clamp((pixels - waveStart) / (waveEnd - waveStart), 0, 1),
        vision: smooth(pixels, visionStart, visionStart + height * 1.5),
        draw: clamp((pixels - visionStart) / (height * 1.2), 0, 1),
        explanation: smooth(pixels, visionSequenceStart, visionSequenceStart + unit * .22),
        visionSequence: clamp((pixels - visionSequenceStart) / (visionSequenceEnd - visionSequenceStart), 0, 1),
        gridTravel: clamp(pixels - visionStart, 0, visionEnd - visionStart) * .42,
        dive: clamp((pixels - diveStart) / (diveEnd - diveStart), 0, 1),
        visionFade: 1 - smooth(pixels, diveStart, diveStart + height * .5),
        day: clamp((pixels - dayStart) / (daySettled - dayStart), 0, 1),
        dayTravel: clamp((pixels - diveStart) / height, 0, (end - diveStart) / height),
        dayIndex, dayActive, dayDetail: smooth(dayHoldProgress, .42, .58),
        dayCopy: dayCaption,
        dayHeading: smooth(pixels, dayStart + height * .35, daySettled) * (1 - smooth(pixels, dayLast + dayHolds.at(-1), dayExitEnd)),
        breach: clamp((pixels - breachStart) / (breachEnd - breachStart), 0, 1),
        control: smooth(pixels, controlStart, controlStart + unit * .3),
        controlScene,
        controlIntro,
        controlDim: smooth(pixels, controlTitleHoldEnd, controlTitleExitEnd),
        controlTitle: smooth(pixels, controlStart + unit * .05, controlTitleStop) * (1 - smooth(pixels, controlTitleHoldEnd, controlTitleExitEnd)),
        controlEnter: smooth(pixels, controlTitleHoldEnd + unit * .30, controlFirst),
        controlExit: 0,
        controlBeatIndex,
        controlBeatActive: Math.min(2, Math.round(controlBeatIndex)),
        active: Math.min(productSlides.length - 1, Math.round(index)),
        copy: smooth(stage, .28, .86) * (1 - smooth(Math.abs(index - Math.round(index)), .22, .5)) * (1 - smooth(index, productSlides.length - .8, productSlides.length - .35)),
      };
    },
  };
}
