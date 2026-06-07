'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import type { WebGLRenderer } from 'three';

import { ClassroomQuizVocabularyImageMesh } from '@/components/classroom-quiz/classroom-quiz-vocabulary-image-mesh';
import {
  ClassroomQuizVocabularyLetterMesh,
  VOCAB_LETTER_FONT,
  VOCAB_LETTER_PIXEL_SCALE,
} from '@/components/classroom-quiz/classroom-quiz-vocabulary-letter-mesh';
import { ClassroomQuizVocabularyShapeMesh } from '@/components/classroom-quiz/classroom-quiz-vocabulary-shape-mesh';
import { normalizeTypefaceJson } from '@/lib/course-quiz/typeface-json';
import type { VocabChipVisualSpec } from '@/lib/course-quiz/vocabulary-chip-visual';
import type { CourseQuizVocabularyDisplay } from '@/types/database.types';
import type { VocabChipBody } from '@/lib/course-quiz/vocabulary-drop-physics';

const MIN_CANVAS_ARENA = 80;

type VocabGlContextValue = {
  glLost: boolean;
  sceneActive: boolean;
};

const VocabGlContext = createContext<VocabGlContextValue>({
  glLost: false,
  sceneActive: true,
});

function isGlContextLost(gl: WebGLRenderer): boolean {
  try {
    return gl.getContext().isContextLost();
  } catch {
    return true;
  }
}

function VocabCanvasFrameLoop({ active }: { active: boolean }) {
  const setFrameloop = useThree((state) => state.setFrameloop);
  const { glLost } = useContext(VocabGlContext);

  useEffect(() => {
    if (glLost) {
      setFrameloop('never');
      return;
    }
    setFrameloop(active ? 'always' : 'never');
  }, [active, glLost, setFrameloop]);

  useEffect(
    () => () => {
      setFrameloop('never');
    },
    [setFrameloop],
  );

  return null;
}

function VocabGlLifecycle({
  onContextLost,
}: {
  onContextLost: () => void;
}) {
  const gl = useThree((state) => state.gl);
  const setFrameloop = useThree((state) => state.setFrameloop);

  useEffect(() => {
    const canvas = gl.domElement;

    const onLost = (event: Event) => {
      event.preventDefault();
      setFrameloop('never');
      onContextLost();
    };

    canvas.addEventListener('webglcontextlost', onLost, false);
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost, false);
      setFrameloop('never');
    };
  }, [gl, onContextLost, setFrameloop]);

  return null;
}

function VocabSceneGate({ children }: { children: React.ReactNode }) {
  const gl = useThree((state) => state.gl);
  const { glLost, sceneActive } = useContext(VocabGlContext);

  if (!sceneActive || glLost || isGlContextLost(gl)) {
    return null;
  }

  return children;
}

function VocabularyLettersScene({
  bodiesRef,
  chipSpecs,
  displayMode,
  holdingIndexRef,
  pendingPickIndexRef,
  arenaWidth,
  arenaHeight,
  animating,
  onContextLost,
}: {
  bodiesRef: RefObject<VocabChipBody[]>;
  chipSpecs: VocabChipVisualSpec[];
  displayMode: CourseQuizVocabularyDisplay;
  holdingIndexRef: RefObject<number | null>;
  pendingPickIndexRef: RefObject<number | null>;
  arenaWidth: number;
  arenaHeight: number;
  animating: boolean;
  onContextLost: () => void;
}) {
  const characterTypeface = normalizeTypefaceJson(VOCAB_LETTER_FONT);
  const halfW = Math.max(0.05, (arenaWidth * VOCAB_LETTER_PIXEL_SCALE) / 2);
  const halfH = Math.max(0.05, (arenaHeight * VOCAB_LETTER_PIXEL_SCALE) / 2);
  const bodies = bodiesRef.current;
  const meshCount = Math.min(bodies.length, chipSpecs.length);

  return (
    <>
      <VocabCanvasFrameLoop active={animating} />
      <VocabGlLifecycle onContextLost={onContextLost} />
      <OrthographicCamera
        makeDefault
        position={[0, 0, 100]}
        left={-halfW}
        right={halfW}
        top={halfH}
        bottom={-halfH}
        near={0.1}
        far={500}
      />
      <ambientLight intensity={0.58} />
      <directionalLight position={[8, 10, 14]} intensity={1.2} color="#fffef8" />
      <directionalLight position={[-6, 5, 8]} intensity={0.42} color="#e8f4ff" />
      <pointLight position={[0, -6, 10]} intensity={0.35} color="#ffffff" />

      <VocabSceneGate>
        {bodies.slice(0, meshCount).map((body, index) => {
          const spec = chipSpecs[index];
          if (!spec) return null;
          if (spec.imageUrl) {
            return (
              <ClassroomQuizVocabularyImageMesh
                key={`img-${body.id}`}
                bodyIndex={index}
                bodiesRef={bodiesRef}
                holdingIndexRef={holdingIndexRef}
                pendingPickIndexRef={pendingPickIndexRef}
                imageUrl={spec.imageUrl}
                optionIndex={index}
                arenaWidth={arenaWidth}
                arenaHeight={arenaHeight}
              />
            );
          }
          if (displayMode === 'shape' && spec.shapeKind) {
            return (
              <ClassroomQuizVocabularyShapeMesh
                key={`shape-${body.id}-${spec.shapeKind}`}
                bodyIndex={index}
                bodiesRef={bodiesRef}
                holdingIndexRef={holdingIndexRef}
                pendingPickIndexRef={pendingPickIndexRef}
                shapeKind={spec.shapeKind}
                optionLabel={spec.optionLabel}
                optionIndex={index}
                arenaWidth={arenaWidth}
                arenaHeight={arenaHeight}
              />
            );
          }
          return (
            <ClassroomQuizVocabularyLetterMesh
              key={body.id}
              bodyIndex={index}
              bodiesRef={bodiesRef}
              holdingIndexRef={holdingIndexRef}
              pendingPickIndexRef={pendingPickIndexRef}
              glyph={spec.glyph || '?'}
              typeface={characterTypeface}
              glyphMode="character"
              optionIndex={index}
              arenaWidth={arenaWidth}
              arenaHeight={arenaHeight}
            />
          );
        })}
      </VocabSceneGate>
    </>
  );
}

export function ClassroomQuizVocabularyLettersCanvas({
  bodiesRef,
  chipSpecs,
  displayMode,
  arenaWidth,
  arenaHeight,
  holdingIndexRef,
  pendingPickIndexRef,
  animating,
  sceneActive = true,
  invalidateRef,
  meshSeed = 0,
}: {
  bodiesRef: RefObject<VocabChipBody[]>;
  chipSpecs: VocabChipVisualSpec[];
  displayMode: CourseQuizVocabularyDisplay;
  arenaWidth: number;
  arenaHeight: number;
  holdingIndexRef: RefObject<number | null>;
  pendingPickIndexRef: RefObject<number | null>;
  animating: boolean;
  sceneActive?: boolean;
  invalidateRef?: RefObject<(() => void) | null>;
  meshSeed?: number;
}) {
  const [glLost, setGlLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const mountGenRef = useRef(0);
  const sceneActiveRef = useRef(sceneActive);
  const glLostRef = useRef(glLost);

  sceneActiveRef.current = sceneActive;
  glLostRef.current = glLost;

  const arenaReady =
    arenaWidth >= MIN_CANVAS_ARENA &&
    arenaHeight >= MIN_CANVAS_ARENA &&
    bodiesRef.current.length > 0 &&
    chipSpecs.length > 0;

  const showLetters = sceneActive && arenaReady && !glLost;

  useEffect(() => {
    // Helps debug "letters missing" / "interaction blocked" cases in dev.
    console.debug('[classroom-quiz][vocab-letters]', {
      arenaReady,
      showLetters,
      arenaWidth,
      arenaHeight,
      bodiesLen: bodiesRef.current.length,
      chipSpecsLen: chipSpecs.length,
      glLost,
      sceneActive,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bodiesRef is a stable ref object
  }, [arenaReady, showLetters, arenaWidth, arenaHeight, glLost, sceneActive, chipSpecs.length]);

  const handleContextLost = useCallback(() => {
    glLostRef.current = true;
    setGlLost(true);
    if (invalidateRef) {
      invalidateRef.current = null;
    }
  }, [invalidateRef]);

  const handleContextRestored = useCallback(() => {
    glLostRef.current = false;
    setGlLost(false);
    mountGenRef.current += 1;
    setCanvasKey((k) => k + 1);
  }, []);

  useEffect(() => {
    mountGenRef.current += 1;
    glLostRef.current = false;
    setGlLost(false);
    return () => {
      mountGenRef.current += 1;
      if (invalidateRef) {
        invalidateRef.current = null;
      }
    };
  }, [invalidateRef]);

  const glContext = useMemo(
    (): VocabGlContextValue => ({ glLost, sceneActive: showLetters }),
    [glLost, showLetters],
  );

  if (!arenaReady) {
    return null;
  }

  return (
    <VocabGlContext.Provider value={glContext}>
      <div className="classroom-quiz-vocab-three-canvas-wrap" aria-hidden>
        {glLost ? (
          <div className="classroom-quiz-vocab-gl-recovering" aria-hidden>
            字母載入中…
          </div>
        ) : (
          <Canvas
            key={canvasKey}
            orthographic
            dpr={1}
            frameloop="demand"
            resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
            gl={{
              alpha: true,
              antialias: false,
              powerPreference: 'default',
              preserveDrawingBuffer: false,
            }}
            style={{ pointerEvents: 'none' }}
            onCreated={(state) => {
              const gen = mountGenRef.current;

              const safeInvalidate = () => {
                if (gen !== mountGenRef.current) return;
                if (glLostRef.current || !sceneActiveRef.current) return;
                if (isGlContextLost(state.gl)) return;
                state.invalidate();
              };

              if (invalidateRef) {
                invalidateRef.current = safeInvalidate;
              }

              const canvas = state.gl.domElement;
              const onLost = (event: Event) => {
                event.preventDefault();
                handleContextLost();
                state.setFrameloop('never');
              };
              const onRestored = () => {
                handleContextRestored();
                safeInvalidate();
              };
              canvas.addEventListener('webglcontextlost', onLost, false);
              canvas.addEventListener('webglcontextrestored', onRestored, false);

              safeInvalidate();
            }}
          >
            <Suspense fallback={null}>
              {showLetters ? (
                <VocabularyLettersScene
                  key={`vocab-meshes-${meshSeed}`}
                  bodiesRef={bodiesRef}
                  chipSpecs={chipSpecs}
                  displayMode={displayMode}
                  arenaWidth={arenaWidth}
                  arenaHeight={arenaHeight}
                  holdingIndexRef={holdingIndexRef}
                  pendingPickIndexRef={pendingPickIndexRef}
                  animating={animating}
                  onContextLost={handleContextLost}
                />
              ) : null}
            </Suspense>
          </Canvas>
        )}
      </div>
    </VocabGlContext.Provider>
  );
}
