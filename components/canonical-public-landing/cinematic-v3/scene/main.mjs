import * as THREE from 'three';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {makeEnvironment, makeGlass, makeWordmark} from './glass.mjs';
import {makePixelScreen} from './screen.mjs';
import {makeCarousel, slides} from './carousel.mjs';
import {createChoreography} from './choreography.mjs';
import {makeOutlineWave, waveBoundary} from './finale.mjs';
import {makeJewelFinish} from './jewel.mjs';
import {makePassage} from './passage.mjs';
import {daySlides} from './day-story.mjs';
import {createReadingHolds, phrasePose} from './reading-holds.mjs';

const canvas = document.querySelector('#scene');
const hero = document.querySelector('.hero');
const header = document.querySelector('.header');
const motionButton = document.querySelector('#motion');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const story = document.querySelector('.hero-story');
const productCopy = document.querySelector('.carousel-copy');
const productControls = document.querySelector('.carousel-controls');
const openingCopy = document.querySelector('.hero-footer');
const tutorIntro = document.querySelector('.tutor-intro');
const visionCopy = document.querySelector('.vision-copy');
const dayCopy = document.querySelector('.day-copy');
const dayCaption = dayCopy.querySelector('.day-caption');
const dayControls = dayCopy.querySelector('.day-controls');
const controlCopy = document.querySelector('.control-chapter');
const controlPhoto = controlCopy.querySelector('.control-photo');
const controlBeats = [...controlCopy.querySelectorAll('.control-beat')];
const productParagraphs = [...productCopy.querySelectorAll('p')];
const daySummary = dayCaption.querySelector('.day-summary');
const dayDetail = dayCaption.querySelector('.day-detail');
const fallbackControl = controlCopy.cloneNode(true);
const storyProgress = document.querySelector('.story-progress');
fallbackControl.removeAttribute('id'); fallbackControl.removeAttribute('aria-labelledby');
fallbackControl.removeAttribute('aria-hidden'); fallbackControl.inert = false;
fallbackControl.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
document.querySelector('.fallback-control').append(fallbackControl);
document.querySelectorAll('.closing-emblem path').forEach(path => path.setAttribute('pathLength', '1'));
const drawnLetters = [...visionCopy.querySelectorAll('.outline-title path')];
const visionPhrases = [...visionCopy.querySelectorAll('.vision-sequence > *')];
const state = {ready: false, playing: !reduced.matches, renders: 0, time: 0, progress: 0, rotation: 0, rotating: !reduced.matches, reducedMotion: reduced.matches};
window.__dianaComposition = state;
gsap.registerPlugin(ScrollTrigger);
const emitLanding = (name, detail = {}) => window.dispatchEvent(new CustomEvent('diana:cinematic-event', {detail: {name, ...detail}}));
document.querySelectorAll('a[href="#waitlist"]').forEach(link => link.addEventListener('click', () => emitLanding('cta', {location: link.classList.contains('header-cta') ? 'header' : 'hero'})));
document.querySelectorAll('.chapter-menu a').forEach(link => link.addEventListener('click', () => { link.closest('details').open = false; }));

const dialog = document.querySelector('#work-dialog');
function inspectAsset(slide) {
  dialog.classList.remove('zoomed');
  document.querySelector('#zoom-screen').setAttribute('aria-pressed', 'false');
  dialog.querySelector('source').srcset = slide.mobile || slide.image;
  dialog.querySelector('img').src = slide.image;
  dialog.querySelector('img').alt = slide.alt;
  document.querySelector('#dialog-heading').textContent = slide.title;
  dialog.showModal();
}
function inspect(index = 0, day = false) { inspectAsset((day ? daySlides : slides)[index]); }
document.querySelectorAll('[data-control]').forEach(button => button.addEventListener('click', () => {
  const article = button.closest('.control-beat');
  const image = article.querySelector('img');
  inspectAsset({title: article.querySelector('h3').textContent, image: image.getAttribute('src'), alt: image.alt});
}));
document.querySelectorAll('[data-slide]').forEach(button => button.addEventListener('click', () => inspect(Number(button.dataset.slide))));
document.querySelectorAll('[data-day]').forEach(button => button.addEventListener('click', () => inspect(Number(button.dataset.day), true)));
document.querySelector('#zoom-screen').addEventListener('click', event => {
  const enlarged = dialog.classList.toggle('zoomed');
  event.currentTarget.setAttribute('aria-pressed', String(enlarged));
});
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

async function initialize() {
  await Promise.all([document.fonts.load('600 100px Outfit'), document.fonts.load('700 200px Outfit')]);
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.transmissionResolutionScale = 1;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#08090c');
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 80);
  camera.position.set(0, .12, 10.8); camera.lookAt(0, 0, 0);
  const environment = makeEnvironment(renderer); scene.environment = environment.texture;
  const symbol = await makeGlass();
  const jewel = makeJewelFinish(symbol);
  const finale = makeOutlineWave(symbol);
  const wordmark = makeWordmark();
  const wall = makePixelScreen();
  const carousel = await makeCarousel(renderer);
  const passage = await makePassage(renderer, environment.texture);
  // Project the crisp underlay into the opaque wall pass, preserving transmission during fades.
  wall.uniforms.uBrand.value = wordmark.material.map;
  const brandProjection = new THREE.Matrix4();
  scene.add(wall.mesh, symbol, carousel.group, finale.backdrop);
  const key = new THREE.DirectionalLight('#ffffff', 2); key.position.set(-3, 5, 6); scene.add(key);
  const fill = new THREE.DirectionalLight('#e0eaff', .45); fill.position.set(4, -1, 3); scene.add(fill);
  const target = new THREE.Vector2(), pose = new THREE.Vector2();
  let frame = 0, lastTime = 0, inView = true, sequence, choreography, resizeFrame = 0, symbolBaseScale = 1, symbolBaseY = 0, previousStoryScrollPixels = 0, directNavigation = false;
  let currentSlide = -1, currentDay = -1, currentControlBeat = -1, productVisible = false;
  const beat = {progress: 0};
  const tutorBeat = {active: false, complete: false, departed: false, startedAt: 0, lockedY: 0, duration: 6200, progress: 0};
  const dayVideoBeat = {active: false, index: -1, lockedY: 0, lockedTimeline: 0};
  const readingHolds = createReadingHolds();
  let previousTimelinePixels = 0, readingLockedY = 0;
  const timings = [];
  const blockingKeys = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);

  function smooth01(value, low, high) {
    const t = THREE.MathUtils.clamp((value - low) / (high - low), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function blockTutorScroll(event) {
    if (!tutorBeat.active && !dayVideoBeat.active && !readingHolds.active) return;
    if (event.type === 'keydown' && !blockingKeys.has(event.key)) return;
    event.preventDefault();
  }
  window.addEventListener('wheel', blockTutorScroll, {passive: false});
  window.addEventListener('touchmove', blockTutorScroll, {passive: false});
  window.addEventListener('keydown', blockTutorScroll);

  function holdDayVideoPosition() {
    const lockedY = dayVideoBeat.active ? dayVideoBeat.lockedY : readingHolds.active ? readingLockedY : null;
    if (lockedY === null || Math.abs(scrollY - lockedY) <= 1) return;
    window.scrollTo({top: lockedY, left: 0, behavior: 'instant'});
  }
  window.addEventListener('scroll', holdDayVideoPosition, {passive: true});
  passage.setVideoCallbacks({
    onStart(index, timelinePixels) {
      if (!choreography || reduced.matches || dayVideoBeat.active) return;
      dayVideoBeat.active = true;
      dayVideoBeat.index = index;
      // The checkpoint is already fully framed; discard any queued wheel distance.
      dayVideoBeat.lockedY = storyPosition(timelinePixels);
      dayVideoBeat.lockedTimeline = timelinePixels;
      beat.progress = (dayVideoBeat.lockedY - story.offsetTop) / Math.max(1, sequence.scrollTrigger.end - sequence.scrollTrigger.start);
      holdDayVideoPosition();
    },
    onEnd(index) {
      if (dayVideoBeat.index !== index) return;
      dayVideoBeat.active = false;
      dayVideoBeat.index = -1;
      dayVideoBeat.lockedTimeline = 0;
    },
  });

  function cancelHolds() {
    readingHolds.cancel();
    passage.cancelPlayback();
    dayVideoBeat.active = false;
    tutorBeat.active = false;
  }

  function render() {
    const scrollRange = Math.max(1, (sequence?.scrollTrigger?.end - sequence?.scrollTrigger?.start) || 1);
    const nativeProgress = THREE.MathUtils.clamp((scrollY - story.offsetTop) / scrollRange, 0, 1);
    if (directNavigation && Math.abs(beat.progress - nativeProgress) < .001) directNavigation = false;
    const progress = reduced.matches ? 0 : directNavigation ? nativeProgress : beat.progress;
    state.progress = progress;
    const scrollPixels = progress * scrollRange;
    const storyScrollPixels = Math.max(0, scrollY - story.offsetTop);
    let scrollSettled = Math.abs(scrollPixels - storyScrollPixels) < innerHeight * .3;
    const scrollDirection = storyScrollPixels < previousStoryScrollPixels - 1 ? -1 : storyScrollPixels > previousStoryScrollPixels + 1 ? 1 : 0;
    const tutorSkipPixels = Math.max(0, choreography.textExit - choreography.tutorLockStart);
    if (tutorBeat.complete && storyScrollPixels > choreography.tutorLockStart + innerHeight * .5) {
      tutorBeat.departed = true;
    }
    if (tutorBeat.complete && tutorBeat.departed && scrollDirection < 0 && storyScrollPixels <= choreography.tutorLockStart + innerHeight * .08) {
      tutorBeat.complete = false;
      tutorBeat.departed = false;
      tutorBeat.progress = 0;
    }
    const rawTimelinePixels = tutorBeat.complete
      ? Math.max(choreography.textExit, scrollPixels + tutorSkipPixels)
      : scrollPixels;
    let timelinePixels = dayVideoBeat.active ? dayVideoBeat.lockedTimeline : rawTimelinePixels;
    if (state.playing && !reduced.matches && !directNavigation && !dayVideoBeat.active) {
      timelinePixels = readingHolds.update(previousTimelinePixels, timelinePixels, performance.now(), choreography.readingStops);
      const videos = passage.videoState();
      const videoStop = choreography.dayPlaybackStops.find((point, index) => point !== null && !videos[index].started && !videos[index].finished && previousTimelinePixels <= point && timelinePixels >= point);
      if (videoStop !== undefined) timelinePixels = videoStop;
      if (readingHolds.active || videoStop !== undefined) {
        readingLockedY = storyPosition(timelinePixels);
        if (Math.abs(scrollY - readingLockedY) > 1) window.scrollTo({top: readingLockedY, left: 0, behavior: 'instant'});
        beat.progress = (readingLockedY - story.offsetTop) / scrollRange;
        scrollSettled = true;
      }
    }
    let motion = choreography.at(timelinePixels);
    let tutorOverlayOpacity = 0;
    let tutorOverlayY = 14;
    let tutorOverlayScale = .985;
    if (scrollPixels < choreography.tutorLockStart - 48) {
      tutorBeat.complete = false;
      tutorBeat.active = false;
      tutorBeat.departed = false;
      tutorBeat.progress = 0;
    }
    const shouldHoldTutor = !reduced.matches
      && !tutorBeat.complete
      && scrollSettled
      && (tutorBeat.active || (scrollPixels >= choreography.tutorLockStart && scrollPixels < choreography.carouselStart));
    if (shouldHoldTutor) {
      if (!tutorBeat.active) {
        tutorBeat.active = true;
        tutorBeat.startedAt = performance.now();
        tutorBeat.lockedY = story.offsetTop + choreography.tutorLockStart;
      }
      if (Math.abs(scrollY - tutorBeat.lockedY) > 1) window.scrollTo({top: tutorBeat.lockedY, left: 0, behavior: 'instant'});
      const tutorProgress = THREE.MathUtils.clamp((performance.now() - tutorBeat.startedAt) / tutorBeat.duration, 0, 1);
      const enter = smooth01(tutorProgress, .025, .43);
      const leave = smooth01(tutorProgress, .74, .98);
      const exitRise = smooth01(tutorProgress, .74, 1);
      tutorBeat.progress = tutorProgress;
      tutorOverlayOpacity = enter * (1 - leave);
      tutorOverlayY = THREE.MathUtils.lerp(18, -70, exitRise);
      tutorOverlayScale = THREE.MathUtils.lerp(.982, 1, enter) - exitRise * .018;
      motion = {
        ...motion,
        opening: 0,
        tutor: 0,
        x: choreography.tutorX,
        y: choreography.tutorY,
        stage: 0,
        copy: 0,
      };
      if (tutorProgress >= 1) {
        tutorBeat.active = false;
        tutorBeat.complete = true;
        tutorBeat.departed = false;
        motion = choreography.at(choreography.textExit);
      }
    } else if (tutorBeat.complete && scrollPixels < choreography.textExit) {
      motion = {...motion, tutor: 0, x: choreography.tutorX, y: choreography.tutorY};
    }
    if (tutorIntro) {
      tutorIntro.style.setProperty('--tutor-alpha', String(tutorOverlayOpacity));
      tutorIntro.style.setProperty('--tutor-y', `${tutorOverlayY}px`);
      tutorIntro.style.setProperty('--tutor-scale', String(tutorOverlayScale));
    }
    const progressPercent = Math.round(progress * 100);
    storyProgress.style.setProperty('--story-progress', `${progressPercent}%`);
    storyProgress.setAttribute('aria-valuenow', String(progressPercent));
    const progressLabel = motion.control > .4 ? 'Your control' : motion.day > .2 ? 'Your day' : motion.vision > .1 ? 'Why Diana' : motion.stage > .2 ? 'Diana workspace' : 'Introduction';
    storyProgress.querySelector('b').textContent = progressLabel;
    jewel.update(motion.vision, state.time);
    finale.update(motion.vision, state.time);
    wall.mesh.visible = state.layers?.wall !== false && motion.vision === 0;
    wall.uniforms.uTime.value = state.time;
    wall.uniforms.uOpening.value = motion.opening;
    wall.uniforms.uTutor.value = motion.tutor;
    wall.uniforms.uTutorOffset.value.set(motion.x, motion.y);
    wall.uniforms.uBrandOpacity.value = wordmark.visible ? motion.opening : 0;
    wall.uniforms.uIntensity.value = .55 - motion.stage * .25;
    carousel.update(motion.stage, motion.index, motion.productDetail);
    state.finalizing = motion.growth > 0;
    const portraitTablet = canvas.clientWidth >= 700 && canvas.clientWidth < 1000 && canvas.clientHeight > canvas.clientWidth;
    const closingScale = portraitTablet ? 1.14 * .62 : 1.14;
    symbol.scale.setScalar(symbolBaseScale * THREE.MathUtils.lerp(1 - motion.stage * .42, closingScale, motion.growth) * (1 - .2 * motion.vision));
    symbol.position.set(0, symbolBaseY * (1 - motion.growth), -motion.stage * 1.2 * (1 - motion.growth));
    hero.classList.toggle('light-chapter', (motion.breach > .75 && motion.controlIntro < .2) || (motion.dive < .43 && motion.wave > 0 && waveBoundary(motion.wave, .5) > 1 - (state.headerBottom || 80) * .5 / canvas.clientHeight));
    const headerOpacity = 1 - THREE.MathUtils.smoothstep(motion.breach, .25, .45) * (1 - THREE.MathUtils.smoothstep(motion.breach, .76, .94));
    header.style.opacity = String(headerOpacity);
    header.inert = headerOpacity < .05;
    openingCopy.style.opacity = String(motion.opening);
    openingCopy.inert = motion.opening < .1;
    const activeProduct = slides[motion.active] ?? slides[0];
    const productDetail = activeProduct.detail ? motion.productDetail : 0;
    productCopy.style.opacity = String(motion.copy);
    productCopy.style.setProperty('--product-detail', String(productDetail));
    productParagraphs[0].setAttribute('aria-hidden', String(productDetail > .5));
    productParagraphs[1].setAttribute('aria-hidden', String(productDetail <= .5));
    const showVision = motion.draw > 0 && motion.visionFade > 0 && !reduced.matches;
    visionCopy.style.visibility = showVision ? 'visible' : 'hidden';
    visionCopy.style.opacity = String(motion.visionFade);
    visionCopy.inert = !showVision;
    visionCopy.setAttribute('aria-hidden', String(!showVision));
    dayCopy.style.opacity = String(motion.dayHeading);
    dayCaption.style.opacity = String(motion.dayCopy);
    dayCaption.style.transform = `translateY(${(motion.dayActive - motion.dayIndex) * innerHeight * .75}px)`;
    dayControls.style.opacity = String(motion.dayCopy);
    const activeDaySlide = daySlides[motion.dayActive] ?? daySlides[0];
    const dayDetailProgress = activeDaySlide.detail ? motion.dayDetail : 0;
    daySummary.style.opacity = String(1 - THREE.MathUtils.smoothstep(dayDetailProgress, 0, .45));
    dayDetail.style.opacity = String(THREE.MathUtils.smoothstep(dayDetailProgress, .55, 1));
    daySummary.setAttribute('aria-hidden', String(dayDetailProgress > .5));
    dayDetail.setAttribute('aria-hidden', String(dayDetailProgress <= .5));
    dayCopy.style.visibility = motion.dayHeading > 0 && !reduced.matches ? 'visible' : 'hidden';
    dayCopy.inert = motion.dayCopy === 0 || reduced.matches;
    dayCopy.setAttribute('aria-hidden', String(dayCopy.inert));
    if (currentDay !== motion.dayActive) {
      currentDay = motion.dayActive;
      const slide = daySlides[currentDay];
      dayCaption.querySelector('h3').textContent = slide.title;
      daySummary.textContent = slide.description;
      dayDetail.textContent = slide.detail;
      dayCaption.querySelector('button').firstChild.textContent = `${slide.action} `;
      document.querySelector('#day-count').textContent = `0${currentDay + 1} / 0${daySlides.length}`;
      document.querySelector('#previous-day').disabled = currentDay === 0;
      document.querySelector('#next-day').disabled = currentDay === daySlides.length - 1;
      emitLanding('section', {section: 'your_day', scene: currentDay});
    }
    const controlEnter = motion.controlEnter;
    const controlExit = motion.controlExit;
    const storyGate = controlEnter * (1 - controlExit);
    controlCopy.style.opacity = String(motion.control);
    controlCopy.style.setProperty('--control-photo', String(THREE.MathUtils.smoothstep(motion.controlIntro, .05, .22)));
    controlCopy.style.setProperty('--control-dim', String(motion.controlDim));
    controlCopy.style.setProperty('--control-title', String(motion.controlTitle));
    controlCopy.style.setProperty('--control-travel', `${motion.controlScene * -innerHeight * .95}px`);
    for (let index = 0; index < 3; index++) {
      const distance = Math.abs(motion.controlBeatIndex - index);
      const opacity = storyGate * (1 - THREE.MathUtils.smoothstep(distance, .62, .9));
      controlCopy.style.setProperty(`--beat-${index}`, String(opacity));
      const travel = (index - motion.controlBeatIndex) * innerHeight * .86 + (1 - controlEnter) * innerHeight * .58 - controlExit * innerHeight * .28;
      controlBeats[index].style.transform = `translate(-50%, calc(-50% + ${travel}px))`;
      controlBeats[index].inert = opacity < .95;
      controlBeats[index].setAttribute('aria-hidden', String(opacity < .05));
    }
    if (motion.control > .9 && currentControlBeat !== motion.controlBeatActive) {
      currentControlBeat = motion.controlBeatActive;
      emitLanding('section', {section: 'control', scene: currentControlBeat});
    }
    controlPhoto.style.opacity = String(THREE.MathUtils.smoothstep(motion.controlIntro, .05, .22));
    controlCopy.style.visibility = motion.control > 0 && !reduced.matches ? 'visible' : 'hidden';
    controlCopy.inert = motion.control < .9 || reduced.matches;
    controlCopy.setAttribute('aria-hidden', String(controlCopy.inert));
    drawnLetters.forEach((path, index) => {
      const start = index / drawnLetters.length * .58;
      const drawn = THREE.MathUtils.smoothstep(motion.draw, start, start + .42);
      path.style.strokeDashoffset = String(1 - drawn);
    });
    const phraseSpan = 1 / visionPhrases.length;
    visionPhrases.forEach((phrase, index) => {
      const localProgress = THREE.MathUtils.clamp((motion.visionSequence - index * phraseSpan) / phraseSpan, 0, 1);
      const {opacity, y} = phrasePose(localProgress, index === visionPhrases.length - 1);
      phrase.style.opacity = String(opacity);
      phrase.style.transform = `translateY(${y}px)`;
      phrase.setAttribute('aria-hidden', String(opacity < .1));
    });
    visionCopy.querySelector('.vision-sequence').style.opacity = String(motion.explanation);
    productControls.style.opacity = String(THREE.MathUtils.smoothstep(motion.stage, .85, 1) * (1 - THREE.MathUtils.smoothstep(motion.index, slides.length - .95, slides.length - .5)));
    const showProduct = motion.stage > .95 && motion.index < slides.length - .5 && !reduced.matches;
    if (productVisible !== showProduct) {
      productVisible = showProduct;
      productCopy.inert = !showProduct; productControls.inert = !showProduct;
      productCopy.setAttribute('aria-hidden', String(!showProduct));
      productControls.setAttribute('aria-hidden', String(!showProduct));
    }
    if (currentSlide !== motion.active) {
      currentSlide = motion.active;
      productCopy.querySelector('h2').textContent = slides[currentSlide].title;
      productParagraphs[0].textContent = slides[currentSlide].description;
      productParagraphs[1].textContent = slides[currentSlide].detail;
      document.querySelector('#slide-count').textContent = `0${currentSlide + 1} / 0${slides.length}`;
      document.querySelector('#previous-screen').disabled = currentSlide === 0;
      document.querySelector('#next-screen').disabled = currentSlide === slides.length - 1;
      emitLanding('product', {scene: currentSlide});
    }
    const yaw = -.16 + state.rotation + pose.x * .045 * (1 - motion.growth);
    const toFront = Math.atan2(Math.sin(-yaw), Math.cos(-yaw));
    symbol.rotation.set((.035 + pose.y * .04) * (1 - motion.growth) - .12 * motion.vision, yaw + toFront * motion.growth + .6 * motion.vision, -.018 * (1 - motion.growth) - .08 * motion.vision);
    camera.position.x = pose.x * .11 * (1 - motion.growth);
    camera.position.y = .12 + pose.y * .04 * (1 - motion.growth);
    camera.position.z = 10.8;
    camera.lookAt(0, 0, 0);
    passage.prepare(camera, symbol, motion);
    camera.updateMatrixWorld(); wordmark.updateMatrixWorld();
    brandProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(wordmark.matrixWorld);
    const m = brandProjection.elements;
    wall.uniforms.uBrandScreenToLocal.value.set(m[0], m[4], m[12], m[1], m[5], m[13], m[3], m[7], m[15]).invert();
    motion.timelinePixels = timelinePixels;
    passage.setPlayback(state.playing && inView && (dayVideoBeat.active || scrollSettled) && !document.hidden && !dialog.open);
    // The opaque control chapter does not need the expensive transmission passes underneath.
    if (motion.control < 1) passage.render(renderer, () => finale.render(renderer, scene, camera, motion.wave), motion, state.time);
    Object.assign(state, {dive: motion.dive, day: motion.day, dayCopy: motion.dayCopy, dayStops: choreography.dayStops, diveStart: choreography.diveStart, diveEnd: choreography.diveEnd, dayStart: choreography.dayStart, daySettled: choreography.daySettled, cameraPosition: camera.position.toArray()});
    Object.assign(state, {dayIndex: motion.dayIndex, dayReadingStops: choreography.dayReadingStops, dayExitEnd: choreography.dayExitEnd, breachStart: choreography.breachStart, breachEnd: choreography.breachEnd, breach: motion.breach, control: motion.control, controlScene: motion.controlScene, controlIntro: motion.controlIntro, controlDim: motion.controlDim, controlStop: choreography.controlStop});
    Object.assign(state, {controlReadingStops: choreography.controlReadingStops, controlStart: choreography.controlStart, controlEnd: choreography.controlEnd, dayDetail: dayDetailProgress, videoPlayback: passage.videoState()});
    Object.assign(state, {readingHold: readingHolds.active?.id ?? null, readingStops: choreography.readingStops, videoLocked: dayVideoBeat.active, dayPlaybackStops: choreography.dayPlaybackStops, nativeEnd: choreography.nativeEnd});
    Object.assign(state, {renders: state.renders + 1, yaw: symbol.rotation.y, scrollPixels, timelinePixels, scrollRange, growth: motion.growth, wave: motion.wave, vision: motion.vision, draw: motion.draw, gridTravel: motion.gridTravel, visionStops: choreography.visionStops, visionStart: choreography.visionStart, visionEnd: choreography.visionEnd, finaleStops: choreography.finaleStops, waveStart: choreography.waveStart, waveEnd: choreography.waveEnd, exitEnd: choreography.exitEnd, wordmarkOpacity: motion.opening, tutorOpacity: motion.tutor, tutorOverlayOpacity, tutorOverlayY, tutorOverlayScale, tutorOffset: wall.uniforms.uTutorOffset.value.toArray(), tutorSequenceProgress: tutorBeat.progress, tutorSequenceActive: tutorBeat.active, carousel: motion.stage, carouselIndex: motion.index, activeSlide: currentSlide, checkInOpacity: carousel.panels[0].detailMesh?.material.opacity ?? 0, lobbyOpacity: carousel.panels[0].mesh.material.opacity, textExit: choreography.textExit, carouselStart: choreography.carouselStart, stops: choreography.stops, textRightEdge: motion.x + choreography.tutorWidth / 2, width: canvas.clientWidth, height: canvas.clientHeight, triangles: renderer.info.render.triangles});
    previousStoryScrollPixels = storyScrollPixels;
    previousTimelinePixels = timelinePixels;
  }
  function updateControl() {
    motionButton.innerHTML = document.querySelector(state.playing ? '#pause-icon' : '#play-icon').innerHTML;
    const label = reduced.matches ? 'Motion disabled by reduced-motion preference' : state.playing ? 'Pause motion' : 'Play motion';
    motionButton.setAttribute('aria-label', label); motionButton.title = label;
    motionButton.setAttribute('aria-pressed', String(!state.playing)); motionButton.disabled = reduced.matches;
  }
  function tick(now) {
    frame = 0;
    if (!state.playing || !inView || document.hidden || !state.ready) return;
    const elapsed = Math.max(0, (now - lastTime) / 1000); lastTime = now;
    const dt = Math.min(elapsed, .1);
    timings.push(elapsed * 1000); if (timings.length > 120) timings.shift();
    state.time += dt;
    if (state.rotating && !state.finalizing) state.rotation += Math.PI * 2 / 28 * dt;
    pose.lerp(target, 1 - Math.exp(-6 * dt));
    render(); frame = requestAnimationFrame(tick);
  }
  function start() {
    if (frame || !state.playing || !inView || document.hidden || !state.ready) return;
    lastTime = performance.now(); frame = requestAnimationFrame(tick);
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; passage.setPlayback(false); state.videoPlayback = passage.videoState(); }
  function pause() { state.playing = false; readingHolds.cancel(); stop(); updateControl(); }
  function resize() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    const pixelRatio = Math.min(devicePixelRatio, fine.matches ? 1.5 : 1.25);
    renderer.setPixelRatio(pixelRatio); renderer.setSize(width, height, false);
    finale.resize(width, height, pixelRatio);
    passage.resize(width, height, pixelRatio);
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(16)) * 10.8;
    const visibleWidth = visibleHeight * camera.aspect;
    const mobile = width < 700;
    const footerTop = document.querySelector('.hero-footer').offsetTop;
    const headerBottom = document.querySelector('.header').offsetHeight;
    // Preserve the approved glass framing when the repeated mobile headline is removed.
    const compositionBottom = mobile ? Math.min(footerTop, height - (height < 680 ? 252 : 268)) : footerTop;
    const focalCenter = (headerBottom + compositionBottom) / 2;
    const availableHeight = Math.max(150, compositionBottom - headerBottom - 48);
    const scale = Math.min(.87, visibleWidth / (mobile ? 5.5 : 5.1), availableHeight / height * visibleHeight / 4.45);
    symbolBaseScale = scale;
    symbolBaseY = (.5 - focalCenter / height) * visibleHeight;
    symbol.scale.setScalar(scale);
    symbol.position.y = symbolBaseY;
    const maxTextWidth = availableHeight / height * visibleHeight * 4;
    const textWidth = Math.min(visibleWidth * (mobile ? .95 : .895), maxTextWidth) * (10.8 + 1.8) / 10.8 * .9;
    wordmark.scale.set(textWidth, textWidth / 4, 1);
    wordmark.position.set(0, symbol.position.y * (10.8 + 1.8) / 10.8, -1.8);
    // Match the approved wall's projection behind the refracting foreground.
    const portrait = width < height;
    const fov = portrait ? 56 : 48;
    const xy = 2 * Math.tan(THREE.MathUtils.degToRad(16)) / Math.tan(THREE.MathUtils.degToRad(fov / 2));
    wall.mesh.scale.set(xy, xy, 2); wall.mesh.position.z = 10.8 - 24;
    wall.uniforms.uMobile.value = width <= 960 || portrait ? 1 : 0;
    wall.uniforms.uPitch.value = mobile ? .032 : .045;
    wall.uniforms.uSpan.value = 2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * 12 * camera.aspect;
    wall.uniforms.uTextCenter.value = symbol.position.y * 24 / 10.8 / xy;
    wall.uniforms.uCopyBottom.value = 1 - footerTop / height;
    wall.uniforms.uCopyTop.value = 1 - headerBottom / height;
    const span = wall.uniforms.uSpan.value;
    const tutorWidth = (wall.uniforms.uMobile.value ? span * .84 * .68 : 16 * .45);
    choreography = createChoreography({height: innerHeight, span, tutorWidth});
    if (tutorIntro) {
      tutorIntro.style.setProperty('--tutor-font-size', '100px');
      const targetWidth = Math.max(280, width - (mobile ? 24 : 36));
      const fittedSize = 100 * targetWidth / Math.max(1, tutorIntro.scrollWidth);
      tutorIntro.style.setProperty('--tutor-font-size', `${fittedSize}px`);
    }
    story.style.setProperty('--scroll-distance', `${choreography.nativeEnd}px`);
    carousel.resize({width, height, headerBottom, copyTop: productCopy.offsetTop});
    Object.assign(state, {symbolScale: scale, focalCenter, headerBottom, footerTop}); render();
    if (sequence) {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => { ScrollTrigger.refresh(); render(); });
    }
  }
  motionButton.addEventListener('click', () => {
    if (reduced.matches) return;
    if (state.playing) pause(); else { state.playing = true; updateControl(); start(); }
  });
  hero.addEventListener('pointermove', event => {
    if (!state.playing || reduced.matches || !fine.matches || event.pointerType !== 'mouse') return;
    const box = hero.getBoundingClientRect();
    target.set((event.clientX / box.width - .5) * 2, (.5 - (event.clientY - box.top) / box.height) * 2);
  });
  hero.addEventListener('pointerleave', () => target.set(0, 0));
  function configureScroll() {
    sequence?.scrollTrigger?.kill(); sequence?.kill(); beat.progress = 0;
    document.body.classList.toggle('motion-ready', !reduced.matches && state.ready);
    if (!reduced.matches && state.ready) {
      sequence = gsap.fromTo(beat, {progress: 0}, {
      progress: 1, ease: 'none',
      scrollTrigger: {trigger: story, start: 'top top', end: 'bottom bottom', scrub: .38},
      onUpdate: () => {
          render();
      },
      });
      ScrollTrigger.refresh();
    }
    render();
  }
  function storyPosition(timelineStop) {
    const tutorSkipPixels = timelineStop >= choreography.textExit ? Math.max(0, choreography.textExit - choreography.tutorLockStart) : 0;
    return story.offsetTop + timelineStop - tutorSkipPixels;
  }
  function jumpTo(hash, top) {
    if (location.hash !== hash) history.pushState(null, '', hash);
    cancelHolds();
    tutorBeat.complete = top > story.offsetTop + choreography.tutorLockStart;
    previousTimelinePixels = top - story.offsetTop + (tutorBeat.complete ? choreography.textExit - choreography.tutorLockStart : 0);
    directNavigation = true;
    window.scrollTo({top, behavior: 'instant'});
    sequence?.scrollTrigger?.update();
    render();
  }
  function goToSlide(index) {
    const destination = storyPosition(choreography.stops[THREE.MathUtils.clamp(index, 0, slides.length - 1)]);
    window.scrollTo({top: destination, behavior: reduced.matches ? 'instant' : 'smooth'});
  }
  document.querySelectorAll('a[href="#homework"]').forEach(link => link.addEventListener('click', event => {
    if (!state.ready || reduced.matches) return;
    event.preventDefault(); jumpTo('#homework', storyPosition(choreography.stops[0]));
  }));
  document.querySelector('#previous-screen').addEventListener('click', () => goToSlide(currentSlide - 1));
  document.querySelector('#next-screen').addEventListener('click', () => goToSlide(currentSlide + 1));
  document.querySelector('#inspect-screen').addEventListener('click', () => inspect(currentSlide));
  document.querySelector('#inspect-day').addEventListener('click', () => inspect(currentDay, true));
  function goToDay(index) {
    window.scrollTo({top: storyPosition(choreography.dayReadingStops[THREE.MathUtils.clamp(index, 0, daySlides.length - 1)]), behavior: reduced.matches ? 'instant' : 'smooth'});
  }
  document.querySelector('#previous-day').addEventListener('click', () => goToDay(currentDay - 1));
  document.querySelector('#next-day').addEventListener('click', () => goToDay(currentDay + 1));
  document.querySelectorAll('a[href="#your-day"]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    if (reduced.matches || !state.ready) document.querySelector('.fallback-day-heading').scrollIntoView();
    else jumpTo('#your-day', storyPosition(choreography.dayReadingStops[0]));
  }));
  document.querySelectorAll('.questions details').forEach(item => item.addEventListener('toggle', () => ScrollTrigger.refresh()));
  document.querySelectorAll('a[href="#your-control"]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    if (reduced.matches || !state.ready) fallbackControl.scrollIntoView();
    else jumpTo('#your-control', storyPosition(choreography.controlStop));
  }));
  const closing = document.querySelector('.closing');
  document.querySelectorAll('a[href="#waitlist"]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); jumpTo('#waitlist', closing.getBoundingClientRect().top + scrollY);
  }));
  document.querySelectorAll('a[href="#opening"]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); jumpTo('#opening', 0);
  }));
  function updateClosing(progress) {
    closing.style.setProperty('--closing-progress', String(progress));
    for (let index = 0; index < 5; index++) {
      const letter = THREE.MathUtils.clamp((progress - (.42 + index * .045)) / .28, 0, 1);
      closing.style.setProperty(`--letter-${index}-alpha`, String(letter));
      closing.style.setProperty(`--letter-${index}-clip`, `${(1 - letter) * 100}%`);
    }
  }
  const closingMotion = ScrollTrigger.create({trigger: closing, start: 'top bottom', end: 'bottom bottom', onUpdate: self => {
    updateClosing(reduced.matches ? 1 : self.progress);
  }});
  state.closingMotion = closingMotion;
  updateClosing(reduced.matches ? 1 : closingMotion.progress);
  reduced.addEventListener('change', () => {
    cancelHolds();
    state.reducedMotion = reduced.matches; pause(); pose.set(0, 0); target.set(0, 0);
    state.rotating = !reduced.matches;
    if (reduced.matches) { state.time = 0; state.rotation = 0; }
    updateClosing(reduced.matches ? 1 : closingMotion.progress);
    configureScroll(); updateControl();
  });
  fine.addEventListener('change', () => { pose.set(0, 0); target.set(0, 0); resize(); });
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(entries => {
    // The sticky stage remains visible for the entire story, even after the initial hero has scrolled away.
    // Observe that full story region so a reload or deep link cannot leave the visible canvas frozen.
    inView = entries[0].isIntersecting;
    if (inView) start(); else stop();
  }, {threshold: 0}).observe(story);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  canvas.addEventListener('webglcontextlost', event => {
    cancelHolds();
    event.preventDefault(); stop(); state.ready = false; sequence?.scrollTrigger?.kill(); sequence?.kill(); document.body.classList.remove('ready', 'motion-ready');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    resize(); state.ready = true; document.body.classList.add('ready'); configureScroll(); start();
  });
  state.seek = value => { pause(); state.time = Math.max(0, Number(value) || 0); pose.set(0, 0); target.set(0, 0); render(); };
  state.setAngle = value => { pause(); state.rotation = Number(value) + .16; pose.set(0, 0); target.set(0, 0); render(); };
  state.play = () => { if (!reduced.matches) { state.playing = true; updateControl(); start(); } };
  state.redraw = render;
  state.performance = () => ({samples: timings.length, meanFrameMs: timings.reduce((a, b) => a + b, 0) / Math.max(1, timings.length), drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles});
  state.goToSlide = goToSlide;
  state.goToDay = goToDay;
  state.layers = {wall: true, wordmark: true, symbol: true};
  state.showLayer = (name, shown) => {
    const layer = {wall: wall.mesh, wordmark, symbol}[name];
    if (!layer) return;
    layer.visible = shown; state.layers[name] = shown; render();
  };
  resize(); state.ready = true; updateControl(); document.body.classList.add('ready'); configureScroll(); start();
}

initialize().catch(error => {
  state.error = String(error); document.body.classList.remove('ready', 'motion-ready'); motionButton.disabled = true;
  motionButton.title = 'Motion unavailable'; motionButton.setAttribute('aria-label', 'Motion unavailable');
});
