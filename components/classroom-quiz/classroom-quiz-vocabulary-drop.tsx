'use client';

import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';

import { ClassroomQuizOutcomeAnnounce } from '@/components/classroom-quiz/classroom-quiz-outcome-announce';
import { ClassroomQuizVocabularyLettersCanvas } from '@/components/classroom-quiz/classroom-quiz-vocabulary-letters-canvas';
import { isVocabularyThreeDDisplay } from '@/lib/course-quiz/vocabulary-display';
import { buildVocabChipVisualSpecs } from '@/lib/course-quiz/vocabulary-chip-visual';
import {
  VOCAB_SHAPE_DRAG_SPIN_GAIN,
  vocabularyShapeUsesDragSpin,
  type VocabularyShapeKind,
} from '@/lib/course-quiz/vocabulary-shape-presets';
import {
  createVocabChipBodies,
  findPickableVocabBodyIndex,
  isVocabBodyCenterInDropZone,
  pointInRect,
  stepVocabChipPhysics,
  type VocabChipBody,
  type VocabCollisionEvent,
} from '@/lib/course-quiz/vocabulary-drop-physics';
import {
  playQuizVocabCollision,
  playQuizVocabLettersDrop,
  recoverQuizAudio,
} from '@/lib/quiz/rpg-audio';
import type { CourseQuizPlayTheme, CourseQuizVocabularyDisplay } from '@/types/database.types';
import { cn } from '@/lib/utils';

const LONG_PRESS_MS = 100;
const PICK_MOVE_SLOP_PX = 32;
const DROP_ZONE_HIT_PADDING_PX = 52;
const MIN_ARENA_SIZE = 80;
const HINT_LETTER_EN = '長按字母約 0.1 秒即可撿起';
const HINT_SHAPE_EN = '長按圖形約 0.1 秒即可撿起';
const DROP_ZONE_EN = 'Put the answer here';
const PICKUP_ANNOUNCE_EN = 'PICK UP THE RIGHT ANSWER';
const COLLISION_SFX_MIN_INTERVAL_MS = 72;

type DropZoneLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function ClassroomQuizVocabularyDrop({
  isAdmin = false,
  playTheme,
  displayMode,
  shapeTypefaceUrl,
  optionTexts,
  optionImageUrls = [],
  optionShapeGlyphs = [],
  correctIndex,
  sceneRef,
  videoRef,
  freezeThreeCanvas = false,
  onLetterPickup,
  onAnswer,
}: {
  isAdmin?: boolean;
  playTheme: CourseQuizPlayTheme;
  displayMode: CourseQuizVocabularyDisplay;
  shapeTypefaceUrl?: string | null;
  optionTexts: string[];
  optionImageUrls?: string[];
  optionShapeGlyphs?: string[];
  correctIndex: number;
  sceneRef: RefObject<HTMLElement | null>;
  videoRef: RefObject<HTMLElement | null>;
  freezeThreeCanvas?: boolean;
  onLetterPickup: (index: number) => void;
  onAnswer: (index: number) => void;
}) {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const bodiesRef = useRef<VocabChipBody[]>([]);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const longPressTimerRef = useRef<number | null>(null);
  const draggingIndexRef = useRef<number | null>(null);
  const pendingPickRef = useRef<{
    index: number;
    startX: number;
    startY: number;
  } | null>(null);
  const pointerOffsetRef = useRef({ x: 0, y: 0 });
  const lastPointerClientRef = useRef({ x: 0, y: 0 });
  const dropZoneRectRef = useRef<DropZoneLayout | null>(null);
  const threeInvalidateRef = useRef<(() => void) | null>(null);
  const holdingIndexRef = useRef<number | null>(null);
  const pendingPickIndexRef = useRef<number | null>(null);

  const [bodies, setBodies] = useState<VocabChipBody[]>([]);
  const [phase, setPhase] = useState<'announce' | 'falling' | 'ready'>('announce');
  const [holdingIndex, setHoldingIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [dropZoneStyle, setDropZoneStyle] = useState<CSSProperties>({ opacity: 0 });
  const [arenaSize, setArenaSize] = useState({ w: 0, h: 0 });
  const [pendingPickIndex, setPendingPickIndex] = useState<number | null>(null);
  const [announceRect, setAnnounceRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const chipSpecs = useMemo(
    () =>
      buildVocabChipVisualSpecs(
        optionTexts,
        displayMode,
        optionImageUrls,
        optionShapeGlyphs,
      ),
    [optionTexts, displayMode, optionImageUrls, optionShapeGlyphs],
  );
  const specsKey = useMemo(
    () =>
      chipSpecs
        .map(
          (s) =>
            `${s.glyph}\u0001${s.imageUrl ?? ''}\u0001${s.shapeKind ?? ''}\u0001${s.optionLabel}`,
        )
        .join('\u0002'),
    [chipSpecs],
  );
  const isThreeDMode = isVocabularyThreeDDisplay(displayMode);
  const spawnTokenRef = useRef(0);
  const [spawnToken, setSpawnToken] = useState(0);
  const lastCollisionSfxAtRef = useRef(0);
  const [scenePortalEl, setScenePortalEl] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setScenePortalEl(sceneRef.current);
  }, [sceneRef, specsKey]);

  const syncBodies = useCallback((next: VocabChipBody[]) => {
    bodiesRef.current = next;
    setBodies(next);
  }, []);

  const syncBodiesVisual = useCallback(() => {
    if (isThreeDMode) {
      threeInvalidateRef.current?.();
      return;
    }
    setBodies([...bodiesRef.current]);
  }, [isThreeDMode]);

  useEffect(() => {
    holdingIndexRef.current = holdingIndex;
  }, [holdingIndex]);

  useEffect(() => {
    pendingPickIndexRef.current = pendingPickIndex;
  }, [pendingPickIndex]);

  useEffect(
    () => () => {
      threeInvalidateRef.current = null;
    },
    [],
  );

  const syncAnnounceFrame = useCallback(() => {
    const scene = sceneRef.current;
    const video = videoRef.current;
    if (!scene || !video) {
      setAnnounceRect(null);
      return;
    }
    const sr = scene.getBoundingClientRect();
    const vr = video.getBoundingClientRect();
    const sceneScaleX = scene.offsetWidth > 0 ? sr.width / scene.offsetWidth : 1;
    const sceneScaleY = scene.offsetHeight > 0 ? sr.height / scene.offsetHeight : 1;
    setAnnounceRect({
      left: (vr.left - sr.left) / (sceneScaleX || 1),
      top: (vr.top - sr.top) / (sceneScaleY || 1),
      width: vr.width / (sceneScaleX || 1),
      height: vr.height / (sceneScaleY || 1),
    });
  }, [sceneRef, videoRef]);

  const updateDropZoneLayout = useCallback(() => {
    const scene = sceneRef.current;
    const video = videoRef.current;
    if (!scene || !video) return;

    const vr = video.getBoundingClientRect();
    const width = Math.min(vr.width * 0.72, 320);
    const height = Math.min(vr.height * 0.38, 140);
    const zoneLeft = vr.left + vr.width / 2 - width / 2;
    const zoneTop = vr.top + vr.height / 2 - height / 2;

    dropZoneRectRef.current = {
      left: zoneLeft,
      top: zoneTop,
      width,
      height,
    };

    if (isThreeDMode) {
      const arenaEl = arenaRef.current;
      const ar = arenaEl?.getBoundingClientRect();
      const scaleX =
        ar && arenaEl && arenaEl.offsetWidth > 0 ? ar.width / arenaEl.offsetWidth : 1;
      const scaleY =
        ar && arenaEl && arenaEl.offsetHeight > 0 ? ar.height / arenaEl.offsetHeight : 1;
      setDropZoneStyle({
        left: (zoneLeft - (ar?.left ?? 0)) / (scaleX || 1),
        top: (zoneTop - (ar?.top ?? 0)) / (scaleY || 1),
        width: width / (scaleX || 1),
        height: height / (scaleY || 1),
        opacity: 1,
      });
      return;
    }

    const sr = scene.getBoundingClientRect();
    const sceneScaleX = scene.offsetWidth > 0 ? sr.width / scene.offsetWidth : 1;
    const sceneScaleY = scene.offsetHeight > 0 ? sr.height / scene.offsetHeight : 1;
    setDropZoneStyle({
      left: (zoneLeft - sr.left) / (sceneScaleX || 1),
      top: (zoneTop - sr.top) / (sceneScaleY || 1),
      width: width / (sceneScaleX || 1),
      height: height / (sceneScaleY || 1),
      opacity: 1,
    });
  }, [isThreeDMode, sceneRef, videoRef]);

  const measureArenaBounds = useCallback(() => {
    const rect = arenaRef.current?.getBoundingClientRect();
    const sceneRect = sceneRef.current?.getBoundingClientRect();
    if (isThreeDMode) {
      const w = rect?.width || sceneRect?.width || 0;
      const h = rect?.height || sceneRect?.height || 0;
      if (w > 0 && h > 0) return { w, h };
      if (typeof window !== 'undefined') {
        const vv = window.visualViewport;
        return {
          w: vv?.width ?? window.innerWidth,
          h: vv?.height ?? window.innerHeight,
        };
      }
      return { w: 0, h: 0 };
    }
    const w = Math.max(rect?.width ?? 0, sceneRect?.width ?? 0);
    const h = Math.max(rect?.height ?? 0, sceneRect?.height ?? 0);
    return { w, h };
  }, [isThreeDMode, sceneRef]);

  const syncArenaSize = useCallback(() => {
    const { w, h } = measureArenaBounds();
    if (w >= MIN_ARENA_SIZE && h >= MIN_ARENA_SIZE) {
      setArenaSize({ w, h });
    }
  }, [measureArenaBounds]);

  const trySpawn = useCallback((): boolean => {
    const el = arenaRef.current;
    if (!el || chipSpecs.length === 0) return false;

    const { w: boundsW, h: boundsH } = measureArenaBounds();
    if (boundsW < MIN_ARENA_SIZE || boundsH < MIN_ARENA_SIZE) {
      return false;
    }

    const baseW = isThreeDMode ? 165 : 112;
    const chipW = isThreeDMode
      ? Math.min(260, Math.max(baseW, boundsW * 0.2))
      : Math.min(148, Math.max(baseW, boundsW * 0.22));
    const chipH = isThreeDMode
      ? Math.min(300, Math.max(185, chipW * 1.06))
      : Math.max(44, chipW * 0.36);

    const next = createVocabChipBodies(
      chipSpecs.length,
      boundsW,
      boundsH,
      chipW,
      chipH,
    );
    syncBodies(next);
    setArenaSize({ w: boundsW, h: boundsH });
    lastTsRef.current = 0;
    spawnTokenRef.current += 1;
    setSpawnToken(spawnTokenRef.current);
    setHoldingIndex(null);
    setSubmitted(false);
    draggingIndexRef.current = null;
    return true;
  }, [chipSpecs.length, isThreeDMode, measureArenaBounds, syncBodies]);

  const beginLetterFall = useCallback(() => {
    void recoverQuizAudio();
    playQuizVocabLettersDrop(chipSpecs.length);
    if (trySpawn()) {
      setPhase('falling');
      return;
    }
    let attempts = 0;
    const retry = () => {
      if (attempts >= 24) {
        if (bodiesRef.current.length > 0) {
          setPhase('ready');
        }
        return;
      }
      attempts += 1;
      updateDropZoneLayout();
      if (trySpawn()) {
        setPhase('falling');
        return;
      }
      requestAnimationFrame(retry);
    };
    requestAnimationFrame(retry);
  }, [chipSpecs.length, trySpawn, updateDropZoneLayout]);

  const handlePickupAnnounceDone = useCallback(() => {
    beginLetterFall();
  }, [beginLetterFall]);

  useEffect(() => {
    setPhase('announce');
    setHoldingIndex(null);
    setSubmitted(false);
    syncBodies([]);
    lastCollisionSfxAtRef.current = 0;
  }, [specsKey, syncBodies]);

  useLayoutEffect(() => {
    let cancelled = false;

    updateDropZoneLayout();
    syncArenaSize();
    syncAnnounceFrame();

    const scene = sceneRef.current;
    const video = videoRef.current;
    const ro = new ResizeObserver(() => {
      if (!cancelled) {
        updateDropZoneLayout();
        syncArenaSize();
      }
    });
    if (scene) ro.observe(scene);
    if (video) ro.observe(video);

    const onScroll = () => {
      updateDropZoneLayout();
      syncAnnounceFrame();
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);

    return () => {
      cancelled = true;
      ro.disconnect();
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [specsKey, updateDropZoneLayout, syncArenaSize, syncAnnounceFrame, sceneRef, videoRef]);

  useEffect(() => {
    if (!isThreeDMode) return;
    const onResize = () => {
      syncArenaSize();
      updateDropZoneLayout();
      threeInvalidateRef.current?.();
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onResize);
    document.addEventListener('webkitfullscreenchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', onResize);
      document.removeEventListener('webkitfullscreenchange', onResize);
    };
  }, [isThreeDMode, syncArenaSize, updateDropZoneLayout]);

  useEffect(() => {
    if (phase !== 'falling') return;

    let active = true;

    const loop = (ts: number) => {
      if (!active || phase !== 'falling') return;

      const list = bodiesRef.current;
      if (list.length === 0) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const el = arenaRef.current;
      if (!el) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const last = lastTsRef.current || ts;
      const dt = Math.min(0.032, Math.max(0.001, (ts - last) / 1000));
      lastTsRef.current = ts;

      const { w: boundsW, h: boundsH } = measureArenaBounds();
      if (boundsW < MIN_ARENA_SIZE || boundsH < MIN_ARENA_SIZE) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const collisionEvents: VocabCollisionEvent[] = [];
      const allSettled = stepVocabChipPhysics(
        list,
        boundsW,
        boundsH,
        dt,
        collisionEvents,
        draggingIndexRef.current,
        { characterMode: isThreeDMode },
      );

      const now = performance.now();
      if (now - lastCollisionSfxAtRef.current >= COLLISION_SFX_MIN_INTERVAL_MS) {
        let loudestBoundary: VocabCollisionEvent | null = null;
        let loudestBody: VocabCollisionEvent | null = null;
        for (const ev of collisionEvents) {
          if (ev.kind === 'body') {
            if (!loudestBody || ev.strength > loudestBody.strength) {
              loudestBody = ev;
            }
          } else if (!loudestBoundary || ev.strength > loudestBoundary.strength) {
            loudestBoundary = ev;
          }
        }
        const toPlay = loudestBoundary ?? loudestBody;
        if (toPlay) {
          playQuizVocabCollision(toPlay.kind, toPlay.strength);
          lastCollisionSfxAtRef.current = now;
        }
      }

      if (isThreeDMode) {
        threeInvalidateRef.current?.();
      } else {
        setBodies([...list]);
      }

      if (allSettled) {
        setPhase('ready');
        if (isThreeDMode) {
          const { w, h } = measureArenaBounds();
          if (w >= MIN_ARENA_SIZE && h >= MIN_ARENA_SIZE) {
            setArenaSize({ w, h });
          }
          threeInvalidateRef.current?.();
          requestAnimationFrame(() => threeInvalidateRef.current?.());
        }
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [phase, spawnToken, measureArenaBounds, isThreeDMode]);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const clientToArena = useCallback((clientX: number, clientY: number) => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const isInVideoDropZone = useCallback((clientX: number, clientY: number) => {
    const zone = dropZoneRectRef.current;
    if (!zone) return false;
    return pointInRect(clientX, clientY, zone, DROP_ZONE_HIT_PADDING_PX);
  }, []);

  const applyDragSpin = useCallback(
    (body: VocabChipBody, dx: number, dy: number, shapeKind: VocabularyShapeKind | null) => {
      if (!shapeKind || !vocabularyShapeUsesDragSpin(shapeKind)) return;
      body.spinY += dx * VOCAB_SHAPE_DRAG_SPIN_GAIN;
      body.spinX += dy * VOCAB_SHAPE_DRAG_SPIN_GAIN;
    },
    [],
  );

  const beginDrag = useCallback(
    (index: number, clientX: number, clientY: number) => {
      const b = bodiesRef.current[index];
      if (!b) return;
      const { x, y } = clientToArena(clientX, clientY);
      pointerOffsetRef.current = { x: x - b.x, y: y - b.y };
      b.vx = 0;
      b.vy = 0;
      b.angularVelocity = 0;
      b.spinX = 0;
      b.spinY = 0;
      b.settledFrames = 99;
      lastPointerClientRef.current = { x: clientX, y: clientY };
      draggingIndexRef.current = index;
      setHoldingIndex(index);
      setPendingPickIndex(null);
      syncBodiesVisual();
    },
    [clientToArena, syncBodiesVisual],
  );

  const finishDrag = useCallback(
    (clientX: number, clientY: number) => {
      const idx = draggingIndexRef.current;
      draggingIndexRef.current = null;
      pendingPickRef.current = null;
      setPendingPickIndex(null);
      setHoldingIndex(null);

      if (idx === null || submitted) return;

      const b = bodiesRef.current[idx];
      const arenaRect = arenaRef.current?.getBoundingClientRect();
      const zone = dropZoneRectRef.current;
      const inZone =
        isInVideoDropZone(clientX, clientY) ||
        Boolean(
          b &&
            arenaRect &&
            zone &&
            isVocabBodyCenterInDropZone(b, arenaRect, zone, DROP_ZONE_HIT_PADDING_PX),
        );

      if (inZone && idx === correctIndex) {
        setSubmitted(true);
        if (b && dropZoneRectRef.current) {
          const zone = dropZoneRectRef.current;
          const local = clientToArena(
            zone.left + zone.width / 2,
            zone.top + zone.height / 2,
          );
          b.x = local.x;
          b.y = local.y;
          b.vy = 160;
          syncBodiesVisual();
        }
        window.setTimeout(() => onAnswer(idx), 280);
        return;
      }

      if (inZone && idx !== correctIndex) {
        onAnswer(idx);
        setSubmitted(true);
        return;
      }

      if (b) {
        b.vy = 140;
        b.vx = (Math.random() - 0.5) * 100;
        b.settledFrames = 0;
        lastTsRef.current = 0;
        setPhase('falling');
        syncBodiesVisual();
      }
    },
    [submitted, isInVideoDropZone, correctIndex, clientToArena, onAnswer, syncBodiesVisual],
  );

  const onPointerDownArena = useCallback(
    (e: React.PointerEvent) => {
      if (phase !== 'ready' || submitted || holdingIndex !== null) return;

      if (isThreeDMode) {
        const { x, y } = clientToArena(e.clientX, e.clientY);
        const index = findPickableVocabBodyIndex(bodiesRef.current, x, y, phase);
        if (index === null) return;

        e.preventDefault();
        arenaRef.current?.setPointerCapture(e.pointerId);
        lastPointerClientRef.current = { x: e.clientX, y: e.clientY };
        clearLongPress();
        pendingPickRef.current = { index, startX: e.clientX, startY: e.clientY };
        setPendingPickIndex(index);
        onLetterPickup(index);
        const pickIndex = index;
        longPressTimerRef.current = window.setTimeout(() => {
          longPressTimerRef.current = null;
          const pending = pendingPickRef.current;
          if (!pending || pending.index !== pickIndex) return;
          const ptr = lastPointerClientRef.current;
          beginDrag(pending.index, ptr.x, ptr.y);
          pendingPickRef.current = null;
        }, LONG_PRESS_MS);
        return;
      }
    },
    [submitted, holdingIndex, isThreeDMode, phase, clearLongPress, clientToArena, beginDrag, onLetterPickup],
  );

  const onPointerMoveArena = useCallback(
    (e: React.PointerEvent) => {
      const pending = pendingPickRef.current;
      if (pending && draggingIndexRef.current === null) {
        const dx = e.clientX - pending.startX;
        const dy = e.clientY - pending.startY;
        if (Math.hypot(dx, dy) > PICK_MOVE_SLOP_PX) {
          clearLongPress();
          pendingPickRef.current = null;
          setPendingPickIndex(null);
        }
        return;
      }

      const idx = draggingIndexRef.current;
      if (idx === null) return;
      const b = bodiesRef.current[idx];
      if (!b) return;
      const prev = lastPointerClientRef.current;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      lastPointerClientRef.current = { x: e.clientX, y: e.clientY };
      applyDragSpin(b, dx, dy, chipSpecs[idx]?.shapeKind ?? null);
      const { x, y } = clientToArena(e.clientX, e.clientY);
      b.x = x - pointerOffsetRef.current.x;
      b.y = y - pointerOffsetRef.current.y;
      syncBodiesVisual();
    },
    [clearLongPress, clientToArena, syncBodiesVisual, applyDragSpin, chipSpecs],
  );

  const onPointerUpArena = useCallback(
    (e: React.PointerEvent) => {
      clearLongPress();
      pendingPickRef.current = null;
      setPendingPickIndex(null);
      if (arenaRef.current?.hasPointerCapture(e.pointerId)) {
        arenaRef.current.releasePointerCapture(e.pointerId);
      }
      if (draggingIndexRef.current === null) return;
      finishDrag(e.clientX, e.clientY);
    },
    [clearLongPress, finishDrag],
  );

  useEffect(() => {
    if (holdingIndex === null) return;

    const onWindowMove = (e: PointerEvent) => {
      const idx = draggingIndexRef.current;
      if (idx === null) return;
      const b = bodiesRef.current[idx];
      if (!b) return;
      const prev = lastPointerClientRef.current;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      lastPointerClientRef.current = { x: e.clientX, y: e.clientY };
      applyDragSpin(b, dx, dy, chipSpecs[idx]?.shapeKind ?? null);
      const { x, y } = clientToArena(e.clientX, e.clientY);
      b.x = x - pointerOffsetRef.current.x;
      b.y = y - pointerOffsetRef.current.y;
      syncBodiesVisual();
    };

    const onWindowUp = (e: PointerEvent) => {
      if (draggingIndexRef.current === null) return;
      clearLongPress();
      pendingPickRef.current = null;
      finishDrag(e.clientX, e.clientY);
    };

    window.addEventListener('pointermove', onWindowMove);
    window.addEventListener('pointerup', onWindowUp);
    window.addEventListener('pointercancel', onWindowUp);

    return () => {
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onWindowUp);
      window.removeEventListener('pointercancel', onWindowUp);
    };
  }, [
    holdingIndex,
    clientToArena,
    clearLongPress,
    finishDrag,
    syncBodiesVisual,
    applyDragSpin,
    chipSpecs,
  ]);

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  if (chipSpecs.length === 0) {
    return null;
  }

  /** ready 階段須持續繪製，否則 frameloop=never 會清空 WebGL 畫面導致字母消失 */
  const threeAnimating =
    phase !== 'announce' &&
    (phase === 'falling' ||
      phase === 'ready' ||
      holdingIndex !== null ||
      submitted);

  const pickupAnnouncePortal =
    phase === 'announce' &&
    announceRect && (
      <div
        className="classroom-quiz-vocab-pickup-announce-portal"
        style={{
          top: announceRect.top,
          left: announceRect.left,
          width: announceRect.width,
          height: announceRect.height,
        }}
      >
        <ClassroomQuizOutcomeAnnounce
          text={PICKUP_ANNOUNCE_EN}
          onDone={handlePickupAnnounceDone}
          sfxMode="start"
        />
      </div>
    );

  const layer = (
    <div
      className={cn(
        'classroom-quiz-vocab-layer',
        isThreeDMode && scenePortalEl && 'classroom-quiz-vocab-layer--scene',
      )}
      aria-label="Vocabulary drop answers"
    >
      {pickupAnnouncePortal}
      {process.env.NODE_ENV === 'development' && isAdmin ? (
        <div
          style={{
            position: 'fixed',
            left: 10,
            top: 10,
            zIndex: 2000,
            padding: '6px 8px',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            fontSize: 12,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            pointerEvents: 'none',
            maxWidth: 320,
            lineHeight: 1.35,
            whiteSpace: 'pre-wrap',
          }}
          aria-hidden
        >
          {`vocab debug
phase=${phase}
display=${displayMode}
freezeThreeCanvas=${freezeThreeCanvas}
arena=${Math.round(arenaSize.w)}x${Math.round(arenaSize.h)}
bodies=${bodiesRef.current.length}
chipSpecs=${chipSpecs.length}
spawn=${spawnToken}
glInvalidate=${Boolean(threeInvalidateRef.current)}`}
        </div>
      ) : null}
      <div
        ref={arenaRef}
        className={cn(
          'classroom-quiz-vocab-arena',
          isThreeDMode && phase === 'ready' && 'classroom-quiz-vocab-arena--can-pick',
          freezeThreeCanvas && 'classroom-quiz-vocab-arena--frozen',
        )}
        onPointerDown={onPointerDownArena}
        onPointerMove={onPointerMoveArena}
        onPointerUp={onPointerUpArena}
        onPointerCancel={onPointerUpArena}
      >
        <div
          className="classroom-quiz-vocab-drop-zone"
          data-vocab-drop-zone
          style={dropZoneStyle}
        >
          <p className="classroom-quiz-vocab-drop-zone-text">{DROP_ZONE_EN}</p>
        </div>

        {phase === 'ready' && holdingIndex === null && !submitted ? (
          <p className="classroom-quiz-vocab-hint">
            {displayMode === 'shape' ? HINT_SHAPE_EN : HINT_LETTER_EN}
          </p>
        ) : null}

        {isThreeDMode && arenaSize.w >= MIN_ARENA_SIZE ? (
          <ClassroomQuizVocabularyLettersCanvas
            bodiesRef={bodiesRef}
            chipSpecs={chipSpecs}
            displayMode={displayMode}
            arenaWidth={arenaSize.w}
            arenaHeight={arenaSize.h}
            holdingIndexRef={holdingIndexRef}
            pendingPickIndexRef={pendingPickIndexRef}
            animating={threeAnimating}
            sceneActive={true}
            invalidateRef={threeInvalidateRef}
            meshSeed={spawnToken}
          />
        ) : null}
      </div>
    </div>
  );

  if (isThreeDMode && scenePortalEl) {
    return (
      <>
        {createPortal(layer, scenePortalEl)}
      </>
    );
  }

  return (
    <>
      {layer}
    </>
  );
}
