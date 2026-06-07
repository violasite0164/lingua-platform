export type VocabCollisionKind = 'body' | 'floor' | 'wall';

export type VocabCollisionEvent = {
  kind: VocabCollisionKind;
  /** 0–1，碰撞強度 */
  strength: number;
};

export type VocabChipBody = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  rotation: number;
  angularVelocity: number;
  settledFrames: number;
  /** 視覺深度（0=遠，1=近）用於由遠及近的墜落感 */
  depth: number;
  /** 拖動時 3D 自轉（球／盒／金字塔） */
  spinX: number;
  spinY: number;
};

const GRAVITY = 1680;
const RESTITUTION = 0.4;
const FLOOR_FRICTION = 0.8;
const AIR_DRAG = 0.996;
const SETTLE_VY = 36;
const SETTLE_FRAMES = 3;
const BODY_RESTITUTION = 0.32;
/** 字母圓碰撞體間隙（像素），避免 3D 字視覺重疊 */
const BODY_SEPARATION_GAP = 18;
const BODY_COLLISION_ITERATIONS = 4;
/** 碰撞時切向速度轉為角速度（越大越愛轉） */
const COLLISION_SPIN_GAIN = 0.0022;
/** 擦撞時額外翻滾 */
const COLLISION_CROSS_SPIN = 0.00085;
/** 角速度上限（rad/s） */
const MAX_ANGULAR_VELOCITY = 2.1;
const ANGULAR_DRAG_AIR = 0.9935;
const ANGULAR_DRAG_FLOOR = 0.962;
const ANGULAR_DRAG_SETTLED = 0.91;

/** 字元模式 3D 字視覺比碰撞盒更長，地板略抬高留白；卡片模式保留較大底邊距 */
export function getVocabFloorY(
  boundsH: number,
  options?: { characterMode?: boolean },
): number {
  if (boundsH <= 0) return 0;
  if (options?.characterMode) {
    return boundsH - Math.max(4, Math.round(boundsH * 0.003));
  }
  return boundsH - Math.max(8, Math.round(boundsH * 0.06));
}

function collisionRadius(body: VocabChipBody): number {
  return Math.max(body.width, body.height) * 0.5;
}

function bodiesOverlap(
  ax: number,
  ay: number,
  a: VocabChipBody,
  bx: number,
  by: number,
  b: VocabChipBody,
): boolean {
  const minDist = collisionRadius(a) + collisionRadius(b) + BODY_SEPARATION_GAP;
  return (ax - bx) ** 2 + (ay - by) ** 2 < minDist * minDist;
}

const COLLISION_MAX_RAW: Record<VocabCollisionKind, number> = {
  wall: 200,
  floor: 380,
  body: 220,
};

const COLLISION_MIN_STRENGTH: Record<VocabCollisionKind, number> = {
  wall: 0.08,
  floor: 0.08,
  body: 0.14,
};

function clampAngularVelocity(b: VocabChipBody): void {
  if (b.angularVelocity > MAX_ANGULAR_VELOCITY) b.angularVelocity = MAX_ANGULAR_VELOCITY;
  else if (b.angularVelocity < -MAX_ANGULAR_VELOCITY) {
    b.angularVelocity = -MAX_ANGULAR_VELOCITY;
  }
}

function pushCollisionEvent(
  events: VocabCollisionEvent[] | undefined,
  kind: VocabCollisionKind,
  rawStrength: number,
): void {
  if (!events) return;
  const maxRaw = COLLISION_MAX_RAW[kind];
  const strength = Math.min(1, Math.max(0, rawStrength / maxRaw));
  if (strength < COLLISION_MIN_STRENGTH[kind]) return;
  events.push({ kind, strength });
}

function resolveBoundsForBody(
  b: VocabChipBody,
  boundsW: number,
  boundsH: number,
  floorY: number,
  events?: VocabCollisionEvent[],
): { onFloor: boolean } {
  const halfW = b.width / 2;
  const halfH = b.height / 2;

  if (b.x - halfW < 0) {
    b.x = halfW;
    const impact = Math.abs(b.vx);
    b.vx = impact * RESTITUTION;
    b.angularVelocity += b.vx * 0.002;
    clampAngularVelocity(b);
    pushCollisionEvent(events, 'wall', impact);
  } else if (b.x + halfW > boundsW) {
    b.x = boundsW - halfW;
    const impact = Math.abs(b.vx);
    b.vx = -impact * RESTITUTION;
    b.angularVelocity -= b.vx * 0.002;
    clampAngularVelocity(b);
    pushCollisionEvent(events, 'wall', impact);
  }

  if (b.y - halfH < 0) {
    b.y = halfH;
    const impact = Math.abs(b.vy);
    if (b.vy < 0) b.vy = impact * RESTITUTION;
    else b.vy = -impact * RESTITUTION;
    b.angularVelocity += b.vx * 0.0014;
    clampAngularVelocity(b);
    pushCollisionEvent(events, 'wall', impact);
  }

  const bottom = b.y + halfH;
  const onFloor = bottom >= floorY;

  if (onFloor) {
    b.y = floorY - halfH;
    if (b.vy > 0) {
      const impactVy = b.vy;
      b.vy = -b.vy * RESTITUTION;
      b.vx *= FLOOR_FRICTION;
      b.angularVelocity += b.vx * 0.0016;
      clampAngularVelocity(b);
      pushCollisionEvent(events, 'floor', impactVy);
    }
    if (Math.abs(b.vy) < SETTLE_VY && Math.abs(b.vx) < 52) {
      b.settledFrames += 1;
      b.vy = 0;
      b.vx *= 0.9;
    } else {
      b.settledFrames = 0;
    }
  } else {
    b.settledFrames = 0;
  }

  return { onFloor };
}

/** 分離重疊的剛體（位置 + 速度衝量） */
function resolveBodyCollisions(
  bodies: VocabChipBody[],
  iterations: number,
  events?: VocabCollisionEvent[],
  pinnedBodyId?: number | null,
): void {
  for (let iter = 0; iter < iterations; iter += 1) {
    for (let i = 0; i < bodies.length; i += 1) {
      const a = bodies[i]!;
      if (a.id === pinnedBodyId) continue;
      for (let j = i + 1; j < bodies.length; j += 1) {
        const b = bodies[j]!;
        if (b.id === pinnedBodyId) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = collisionRadius(a) + collisionRadius(b) + BODY_SEPARATION_GAP;

        if (distSq >= minDist * minDist) continue;

        const dist = Math.sqrt(distSq) || 0.001;
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;
        const half = overlap * 0.5;

        a.x -= nx * half;
        a.y -= ny * half;
        b.x += nx * half;
        b.y += ny * half;

        const relVx = b.vx - a.vx;
        const relVy = b.vy - a.vy;
        const closing = relVx * nx + relVy * ny;
        if (closing < 0) {
          const impulse = (-(1 + BODY_RESTITUTION) * closing) / 2;
          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;

          pushCollisionEvent(events, 'body', impulse);

          const tx = -ny;
          const ty = nx;
          const relVt = relVx * tx + relVy * ty;
          const spin = relVt * COLLISION_SPIN_GAIN + impulse * COLLISION_CROSS_SPIN;
          a.angularVelocity += spin;
          b.angularVelocity -= spin;
          clampAngularVelocity(a);
          clampAngularVelocity(b);
        }
      }
    }
  }
}

/** 全視窗範圍隨機生成（含左右留白、畫面上半部與頂部外側） */
export function createVocabChipBodies(
  count: number,
  boundsW: number,
  boundsH: number,
  chipW: number,
  chipH: number,
): VocabChipBody[] {
  const bodies: VocabChipBody[] = [];
  const padX = boundsW * 0.03;
  const padY = boundsH * 0.03;
  const spawnMaxX = Math.max(chipW, boundsW - padX * 2);
  const spawnMaxY = Math.max(chipH, boundsH - padY * 2);

  for (let i = 0; i < count; i += 1) {
    const depth = 0.35 + Math.random() * 0.65;
    const scale = 0.78 + depth * 0.42;
    const w = chipW * scale;
    const h = chipH * scale;
    const halfW = w * 0.5;
    const halfH = h * 0.5;

    let x = padX + halfW + Math.random() * Math.max(1, spawnMaxX - w);
    const fromSky = Math.random() < 0.45;
    let y = fromSky
      ? -halfH - Math.random() * boundsH * 0.35 - padY
      : padY + halfH + Math.random() * Math.max(halfH, boundsH * 0.88 - h - padY);

    const draft: VocabChipBody = {
      id: i,
      x,
      y,
      vx: 0,
      vy: 0,
      width: w,
      height: h,
      rotation: 0,
      angularVelocity: 0,
      settledFrames: 0,
      depth,
      spinX: 0,
      spinY: 0,
    };

    for (let attempt = 0; attempt < 28; attempt += 1) {
      const candidateX = padX + halfW + Math.random() * Math.max(1, spawnMaxX - w);
      const candidateY = fromSky
        ? -halfH - Math.random() * boundsH * 0.35 - padY
        : padY + halfH + Math.random() * Math.max(halfH, boundsH * 0.88 - h - padY);
      const overlaps = bodies.some((other) =>
        bodiesOverlap(candidateX, candidateY, draft, other.x, other.y, other),
      );
      if (!overlaps) {
        x = candidateX;
        y = candidateY;
        break;
      }
    }

    bodies.push({
      id: i,
      x,
      y,
      vx: (Math.random() - 0.5) * (360 + depth * 160),
      vy: fromSky
        ? 120 + Math.random() * 280 + depth * 90
        : 30 + Math.random() * 120 + depth * 40,
      width: w,
      height: h,
      rotation: (Math.random() - 0.5) * 0.8,
      angularVelocity: (Math.random() - 0.5) * 3.2,
      settledFrames: 0,
      depth,
      spinX: 0,
      spinY: 0,
    });
  }

  resolveBodyCollisions(bodies, 10);
  return bodies;
}

export function stepVocabChipPhysics(
  bodies: VocabChipBody[],
  boundsW: number,
  boundsH: number,
  dt: number,
  collisionEvents?: VocabCollisionEvent[],
  pinnedBodyId?: number | null,
  options?: { characterMode?: boolean },
): boolean {
  const floorY = getVocabFloorY(boundsH, options);
  let allSettled = bodies.length > 0;

  for (const b of bodies) {
    if (b.id === pinnedBodyId) continue;
    b.vy += GRAVITY * dt;
    b.vx *= AIR_DRAG;
    b.vy *= AIR_DRAG;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.rotation += b.angularVelocity * dt;
    clampAngularVelocity(b);
  }

  resolveBodyCollisions(
    bodies,
    BODY_COLLISION_ITERATIONS,
    collisionEvents,
    pinnedBodyId,
  );
  resolveBodyCollisions(bodies, 2, collisionEvents, pinnedBodyId);

  for (const b of bodies) {
    if (b.id === pinnedBodyId) continue;
    const { onFloor } = resolveBoundsForBody(
      b,
      boundsW,
      boundsH,
      floorY,
      collisionEvents,
    );

    const angularDrag =
      b.settledFrames >= SETTLE_FRAMES
        ? ANGULAR_DRAG_SETTLED
        : onFloor
          ? ANGULAR_DRAG_FLOOR
          : ANGULAR_DRAG_AIR;
    b.angularVelocity *= angularDrag;

    if (b.settledFrames < SETTLE_FRAMES) allSettled = false;
  }

  return allSettled;
}

/** 僅在地板穩定後才可撿起，避免空中／彈跳中的字母搶走點擊 */
export function isVocabBodyPickable(
  body: VocabChipBody,
  phase: 'announce' | 'falling' | 'ready',
): boolean {
  if (phase === 'announce') return false;
  return body.settledFrames >= SETTLE_FRAMES;
}

/** 圓形撿取半徑（外圈容錯） */
export function vocabBodyPickRadius(body: VocabChipBody): number {
  return Math.max(body.width, body.height) * 1.08 + 72;
}

/** 矩形撿取範圍（貼合 Tall 3D 字） */
export function vocabBodyPickExtents(body: VocabChipBody) {
  const pad = 52;
  return {
    halfW: body.width * 0.62 + pad,
    halfH: body.height * 0.62 + pad,
  };
}

/**
 * 撿取評分：優先框內點擊 → 距離近 → 深度大（靠近鏡頭的字母）
 */
export function findPickableVocabBodyIndex(
  bodies: VocabChipBody[],
  arenaX: number,
  arenaY: number,
  phase: 'announce' | 'falling' | 'ready',
): number | null {
  let bestIndex: number | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let i = 0; i < bodies.length; i += 1) {
    const b = bodies[i];
    if (!isVocabBodyPickable(b, phase)) continue;

    const dx = arenaX - b.x;
    const dy = arenaY - b.y;
    const dist = Math.hypot(dx, dy);
    const { halfW, halfH } = vocabBodyPickExtents(b);
    const inBox = Math.abs(dx) <= halfW && Math.abs(dy) <= halfH;
    const radius = vocabBodyPickRadius(b);

    if (!inBox && dist > radius) continue;

    const score = (inBox ? 0 : 800) + dist * (inBox ? 0.72 : 1) - b.depth * 48;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/** 字母中心是否落在投放區（含 padding） */
export function isVocabBodyCenterInDropZone(
  body: VocabChipBody,
  arenaRect: DOMRect,
  zone: { left: number; top: number; width: number; height: number },
  padding: number,
): boolean {
  const cx = arenaRect.left + body.x;
  const cy = arenaRect.top + body.y;
  return pointInRect(cx, cy, zone, padding);
}

export function pointInRect(
  px: number,
  py: number,
  rect: { left: number; top: number; width: number; height: number },
  padding = 0,
): boolean {
  return (
    px >= rect.left - padding &&
    px <= rect.left + rect.width + padding &&
    py >= rect.top - padding &&
    py <= rect.top + rect.height + padding
  );
}
