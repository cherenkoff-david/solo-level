import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { TourArt } from "./TourArt";
import type { TourStep } from "./tourSteps";

interface Rect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

interface Point {
  readonly top: number;
  readonly left: number;
}

interface Metrics {
  readonly scale: number;
  readonly width: number;
  readonly height: number;
}

interface Placement {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly maxHeight: number;
  readonly side: "below" | "above" | "right" | "left" | "center";
  readonly compact: boolean;
}

const MAX_CARD_WIDTH = 424;
const MIN_CARD_WIDTH = 280;
const MIN_SIDE_WIDTH = 300;
const MIN_CARD_HEIGHT = 300;
const MIN_COMPACT_HEIGHT = 210;
const CARD_GAP = 16;
const EDGE = 16;
const ANCHORED_MIN_WIDTH = 760;
const FOCUS_TOP_MARGIN = 72;
const MIN_SLICE_HEIGHT = 160;
const TIGHT_HEIGHT = 140;
const INTERACTIVE = "button, a, input, select, textarea, label, [role='switch']";

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
}

function readMetrics(root: HTMLElement | null): Metrics {
  if (root === null) {
    return { scale: 1, width: window.innerWidth, height: window.innerHeight };
  }
  const box = root.getBoundingClientRect();
  const layout = root.offsetWidth || window.innerWidth;
  const raw = layout > 0 ? box.width / layout : 1;
  return {
    scale: raw > 0.5 && raw < 4 ? raw : 1,
    width: box.width || window.innerWidth,
    height: box.height || window.innerHeight,
  };
}

function overlapArea(
  a: { top: number; left: number; width: number; height: number },
  b: { top: number; left: number; width: number; height: number },
): number {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

// Блок выше экрана целиком подсветить нельзя: вокруг него не остаётся места
// для карточки. Тогда подсветка укорачивается сверху — ровно настолько,
// чтобы карточка встала под ней, не накрывая вырез.
function focusOf(rect: Rect, sliceHeight: number | null, viewportHeight: number, scale: number): Rect {
  if (sliceHeight === null) return rect;
  const height = Math.min(rect.height, sliceHeight);
  const lowest = Math.max(viewportHeight - height - EDGE * scale, 0);
  const top = Math.min(Math.max(rect.top, FOCUS_TOP_MARGIN * scale), lowest);
  return { top, left: rect.left, width: rect.width, height };
}

export function TourOverlay({
  steps,
  onClose,
}: {
  steps: readonly TourStep[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [metrics, setMetrics] = useState<Metrics>(() => ({
    scale: 1,
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 800 : window.innerHeight,
  }));
  const [placed, setPlaced] = useState<Placement | null>(null);
  const placedRef = useRef<Placement | null>(null);
  const [compact, setCompact] = useState(false);
  const [manualPos, setManualPos] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);
  const [cardTick, setCardTick] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const cardRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<Rect | null>(null);
  const sliceRef = useRef<number | null>(null);
  const ringlessRef = useRef(false);
  const compactRectRef = useRef<Rect | null>(null);
  const step = steps[index];
  placedRef.current = placed;

  const { scale, width: visualWidth, height: visualHeight } = metrics;

  // Пересчёт масштаба и размеров наложенного слоя: реагирует на зум страницы
  // (CSS zoom меняет offsetWidth, не вызывая resize) и на смену размера окна.
  useLayoutEffect(() => {
    const update = () => {
      const next = readMetrics(rootRef.current);
      setMetrics((current) =>
        current.scale === next.scale && current.width === next.width && current.height === next.height
          ? current
          : next,
      );
    };
    update();
    const root = rootRef.current;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    if (root !== null) observer?.observe(root);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  // Затемнение и вырез живут на отдельном слое и обновляются напрямую в DOM: при скролле
  // они совпадают со страницей в том же кадре, а затемнение остаётся, даже если подсвеченный
  // блок ушёл за пределы экрана (вырез просто перестаёт вырезаться).
  const paintRing = useCallback((next: Rect | null, animated: boolean) => {
    const dim = dimRef.current;
    const ring = ringRef.current;
    if (dim === null || ring === null) return;

    // getBoundingClientRect отдаёт визуальные пиксели (с учётом зума страницы),
    // а inline-стили и clip-path живут в layout-пикселях, которые зум ещё умножит.
    const ratio = (() => {
      const root = rootRef.current;
      if (root === null) return 1;
      const layout = root.offsetWidth || window.innerWidth;
      const visual = root.getBoundingClientRect().width || layout;
      const raw = layout > 0 ? visual / layout : 1;
      return raw > 0.5 && raw < 4 ? raw : 1;
    })();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const borderTransition = "380ms cubic-bezier(0.2,0.8,0.2,1)";
    const transition = animated
      ? `clip-path ${borderTransition}, top ${borderTransition}, left ${borderTransition}, width ${borderTransition}, height ${borderTransition}, opacity 220ms ease-out`
      : "none";

    dim.style.transition = animated ? `clip-path ${borderTransition}` : "none";

    if (next === null) {
      ring.style.opacity = "0";
      ring.style.transition = transition;
      dim.style.clipPath = "none";
      return;
    }

    const top = (next.top - 6) / ratio;
    const left = (next.left - 6) / ratio;
    const width = (next.width + 12) / ratio;
    const height = (next.height + 12) / ratio;
    const holeBottom = top + height;
    const holeRight = left + width;
    const visible = holeBottom > 0 && top < viewportHeight && holeRight > 0 && left < viewportWidth;

    ring.style.transition = transition;
    ring.style.top = `${top}px`;
    ring.style.left = `${left}px`;
    ring.style.width = `${width}px`;
    ring.style.height = `${height}px`;
    ring.style.opacity = visible ? "1" : "0";

    if (!visible) {
      // Блок ушёл за пределы экрана: вырез не нужен, затемнение остаётся сплошным.
      dim.style.clipPath = "none";
      return;
    }

    const x1 = Math.max(left, 0);
    const y1 = Math.max(top, 0);
    const x2 = Math.min(holeRight, viewportWidth);
    const y2 = Math.min(holeBottom, viewportHeight);
    dim.style.clipPath =
      `polygon(evenodd, 0px 0px, ${viewportWidth}px 0px, ${viewportWidth}px ${viewportHeight}px, 0px ${viewportHeight}px, 0px 0px, ` +
      `${x1}px ${y1}px, ${x2}px ${y1}px, ${x2}px ${y2}px, ${x1}px ${y2}px, ${x1}px ${y1}px)`;
  }, []);

  const go = useCallback(
    (next: number) => {
      if (next < 0) return;
      if (next >= steps.length) {
        onClose();
        return;
      }
      setRect(null);
      setPlaced(null);
      setManualPos(null);
      setCompact(false);
      compactRectRef.current = null;
      sliceRef.current = null;
      ringlessRef.current = false;
      setReady(false);
      setIndex(next);
    },
    [onClose, steps.length],
  );

  useEffect(() => {
    if (step?.route !== undefined && step.route !== location.pathname) {
      navigate(step.route);
    }
  }, [step, location.pathname, navigate]);

  useLayoutEffect(() => {
    if (step === undefined) return;
    let frame = 0;
    let timer = 0;
    let cancelled = false;
    let ensureVisible = true;

    const measure = (animated: boolean, syncCard: boolean) => {
      if (cancelled) return;
      const selector = step.target === undefined ? null : `[data-tour="${step.target}"]`;
      const element = selector === null ? null : document.querySelector<HTMLElement>(selector);
      if (element === null) {
        rectRef.current = null;
        paintRing(null, false);
        setRect(null);
        setReady(true);
        return;
      }
      const box = element.getBoundingClientRect();
      const next: Rect = { top: box.top, left: box.left, width: box.width, height: box.height };
      const visibleTop = 72 * scale;
      const visibleBottom = window.innerHeight - 72 * scale;
      const outside = box.top < visibleTop || box.bottom > visibleBottom;
      if (outside && ensureVisible) {
        element.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      ensureVisible = false;
      rectRef.current = next;
      const slice = sliceRef.current === null ? null : sliceRef.current * scale;
      paintRing(ringlessRef.current ? null : focusOf(next, slice, window.innerHeight, scale), animated);
      // Во время прокрутки карточка обычно стоит на месте, но если блок «наехал» на неё,
      // раскладку надо пересчитать сразу — иначе подсветка будет перекрыта до остановки.
      const current = placedRef.current;
      const collides =
        current !== null &&
        overlapArea(
          { top: next.top, left: next.left, width: next.width, height: next.height },
          { top: current.top, left: current.left, width: current.width, height: current.maxHeight },
        ) > 0;
      if (syncCard || collides) setRect((prev) => (sameRect(prev, next) ? prev : next));
      setReady(true);
    };

    let settle = 0;

    frame = window.requestAnimationFrame(() => {
      timer = window.setTimeout(() => measure(true, true), 220);
    });

    // Во время прокрутки карточка не переезжает (иначе она бы дёргалась), но после
    // остановки раскладка пересчитывается заново — иначе она остаётся там, где была
    // до прокрутки, и может перекрыть подсвеченный блок.
    const onScroll = () => {
      if (cancelled) return;
      measure(false, false);
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        if (cancelled) return;
        measure(true, true);
      }, 160);
    };
    const onResize = () => {
      if (cancelled) return;
      ensureVisible = true;
      measure(true, true);
    };

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onScroll);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.clearTimeout(settle);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onScroll);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [step, location.pathname, scale, paintRing]);

  useLayoutEffect(() => {
    paintRing(rectRef.current, true);
  }, [rect, index, metrics, paintRing]);

  // Card меняет высоту при смене шага и при переключении компактного режима.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (card === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setCardTick((value) => value + 1));
    observer.observe(card);
    return () => observer.disconnect();
  }, [index]);

  // Раскладка карточки: сначала ищем направление, где она не перекрывает подсвеченный блок.
  // Для крупных блоков приоритет у боковых сторон — сверху и снизу места обычно нет.
  useLayoutEffect(() => {
    if (rect === null || visualWidth / scale < ANCHORED_MIN_WIDTH) {
      setPlaced(null);
      sliceRef.current = null;
      return;
    }
    const card = cardRef.current;
    if (card === null) return;

    // Компактный вид привязан к конкретной геометрии блока: если блок сдвинулся
    // (прокрутка, смена шага), пробуем обычную карточку заново.
    const compactActive = compact && sameRect(compactRectRef.current, rect);
    if (compact !== compactActive) {
      setCompact(compactActive);
      return;
    }

    // offsetHeight ограничен текущим max-height от прошлого шага, поэтому измеряем
    // «естественную» высоту без ограничения — иначе раскладка считается по урезанной карточке.
    const previousMaxHeight = card.style.maxHeight;
    card.style.maxHeight = "none";
    const naturalHeight = card.offsetHeight || 460;
    card.style.maxHeight = previousMaxHeight;
    const gap = CARD_GAP;
    const edge = EDGE;
    const viewportWidth = visualWidth / scale;
    const viewportHeight = visualHeight / scale;
    const anchor = {
      top: rect.top / scale,
      left: rect.left / scale,
      width: rect.width / scale,
      height: rect.height / scale,
    };
    const baseWidth = Math.max(
      MIN_CARD_WIDTH,
      Math.min(MAX_CARD_WIDTH, viewportWidth - edge * 2),
    );
    const minHeight = compactActive ? MIN_COMPACT_HEIGHT : MIN_CARD_HEIGHT;
    const viewportArea = viewportWidth * viewportHeight;

    const layout = (
      focus: { top: number; left: number; width: number; height: number },
      limit = minHeight,
    ): Placement | null => {
      const spaceBelow = viewportHeight - (focus.top + focus.height) - gap - edge;
      const spaceAbove = focus.top - gap - edge;
      const spaceRight = viewportWidth - (focus.left + focus.width) - gap - edge;
      const spaceLeft = focus.left - gap - edge;
      const horizontalCenter = Math.min(
        Math.max(focus.left + focus.width / 2 - baseWidth / 2, edge),
        Math.max(viewportWidth - baseWidth - edge, edge),
      );
      const candidates: Placement[] = [];

      if (spaceBelow >= limit) {
        candidates.push({
          top: focus.top + focus.height + gap,
          left: horizontalCenter,
          width: baseWidth,
          maxHeight: Math.min(naturalHeight, spaceBelow),
          side: "below",
          compact: compactActive,
        });
      }
      if (spaceAbove >= limit) {
        const height = Math.min(naturalHeight, spaceAbove);
        candidates.push({
          top: focus.top - gap - height,
          left: horizontalCenter,
          width: baseWidth,
          maxHeight: height,
          side: "above",
          compact: compactActive,
        });
      }
      if (spaceRight >= MIN_SIDE_WIDTH) {
        const width = Math.min(baseWidth, spaceRight);
        const height = Math.min(naturalHeight, viewportHeight - edge * 2);
        candidates.push({
          top: Math.min(
            Math.max(focus.top + focus.height / 2 - height / 2, edge),
            Math.max(viewportHeight - height - edge, edge),
          ),
          left: focus.left + focus.width + gap,
          width,
          maxHeight: height,
          side: "right",
          compact: compactActive,
        });
      }
      if (spaceLeft >= MIN_SIDE_WIDTH) {
        const width = Math.min(baseWidth, spaceLeft);
        const height = Math.min(naturalHeight, viewportHeight - edge * 2);
        candidates.push({
          top: Math.min(
            Math.max(focus.top + focus.height / 2 - height / 2, edge),
            Math.max(viewportHeight - height - edge, edge),
          ),
          left: focus.left - gap - width,
          width,
          maxHeight: height,
          side: "left",
          compact: compactActive,
        });
      }

      const bigAnchor =
        focus.width * focus.height > viewportArea * 0.35 || focus.width > viewportWidth * 0.6;
      const order = bigAnchor
        ? ["right", "left", "below", "above"]
        : ["below", "above", "right", "left"];

      const scored = candidates
        .map((candidate) => ({
          candidate,
          overlap: overlapArea(focus, {
            top: candidate.top,
            left: candidate.left,
            width: candidate.width,
            height: candidate.maxHeight,
          }),
        }))
        .sort((left, right) => {
          if (left.overlap !== right.overlap) return left.overlap - right.overlap;
          return order.indexOf(left.candidate.side) - order.indexOf(right.candidate.side);
        });

      const best = scored[0];
      return best !== undefined && best.overlap === 0 ? best.candidate : null;
    };

    const apply = (placement: Placement, slice: number | null) => {
      setPlaced(placement);
      ringlessRef.current = false;
      if (sliceRef.current !== slice) {
        sliceRef.current = slice;
        paintRing(focusOf(rect, slice === null ? null : slice * scale, visualHeight, scale), true);
      }
    };

    const direct = layout(anchor);
    if (direct !== null) {
      apply(direct, null);
      return;
    }

    // Свободного места нет: пробуем компактный вид (без иллюстрации) — он ниже.
    if (!compactActive) {
      setCompact(true);
      compactRectRef.current = rect;
      return;
    }

    // Блок выше экрана: укорачиваем подсветку сверху ровно настолько,
    // чтобы компактная карточка встала под ней.
    const focusTop = Math.max(anchor.top, FOCUS_TOP_MARGIN);
    const slice = Math.min(anchor.height, viewportHeight - edge - gap - minHeight - focusTop);
    if (slice >= MIN_SLICE_HEIGHT && slice < anchor.height) {
      const sliced = layout({ top: focusTop, left: anchor.left, width: anchor.width, height: slice });
      if (sliced !== null) {
        apply(sliced, slice);
        return;
      }
    }

    // Узкий экран или крупный зум: подсветка остаётся, а карточка сжимается по высоте
    // и прокручивается внутри. Лучше тесная карточка с видимым блоком, чем карточка,
    // закрывающая подсветку.
    const tight = layout(anchor, TIGHT_HEIGHT);
    if (tight !== null) {
      apply(tight, null);
      return;
    }

    // Места нет даже под укороченной подсветкой (маленький экран, крупный зум):
    // убираем вырез совсем и ставим карточку по центру — подсветка без выреза
    // не бывает перекрыта.
    const height = Math.min(naturalHeight, viewportHeight - edge * 2);
    ringlessRef.current = true;
    sliceRef.current = null;
    paintRing(null, true);
    setPlaced({
      top: Math.max((viewportHeight - height) / 2, edge),
      left: Math.max((viewportWidth - baseWidth) / 2, edge),
      width: baseWidth,
      maxHeight: height,
      side: "center",
      compact: true,
    });
  }, [rect, metrics, compact, cardTick, step, visualHeight, visualWidth, scale, paintRing]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(index + 1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, onClose]);

  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [index]);

  const clampCss = useCallback(
    (top: number, left: number): Point => {
      const card = cardRef.current;
      const height = card?.offsetHeight ?? 380;
      const width = card?.offsetWidth ?? MAX_CARD_WIDTH;
      const viewportWidth = visualWidth / scale;
      const viewportHeight = visualHeight / scale;
      return {
        top: Math.min(
          Math.max(top, EDGE),
          Math.max(viewportHeight - height - EDGE, EDGE),
        ),
        left: Math.min(
          Math.max(left, EDGE),
          Math.max(viewportWidth - width - EDGE, EDGE),
        ),
      };
    },
    [scale, visualHeight, visualWidth],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest(INTERACTIVE) !== null) return;
    const element = cardRef.current;
    if (element === null) return;
    const box = element.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - box.left,
      offsetY: event.clientY - box.top,
    };
    element.setPointerCapture(event.pointerId);
    setManualPos({ top: box.top / scale, left: box.left / scale });
    setDragging(true);
  };

  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    setManualPos(
      clampCss(
        (event.clientY - drag.offsetY) / scale,
        (event.clientX - drag.offsetX) / scale,
      ),
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag === null) return;
    if (cardRef.current?.hasPointerCapture(event.pointerId)) {
      cardRef.current.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
  };

  if (step === undefined) return null;

  const progress = ((index + 1) / steps.length) * 100;
  const last = index === steps.length - 1;
  const auto = placed;
  const style: CSSProperties =
    manualPos !== null
      ? {
          top: manualPos.top,
          left: manualPos.left,
          width: auto?.width ?? Math.min(MAX_CARD_WIDTH, visualWidth / scale - EDGE * 2),
        }
      : auto !== null
        ? { top: auto.top, left: auto.left, width: auto.width, maxHeight: auto.maxHeight }
        : { width: Math.min(MAX_CARD_WIDTH, visualWidth / scale - EDGE * 2) };

  if (manualPos !== null && auto !== null) {
    style.maxHeight = auto.maxHeight;
  }

  return (
    <div ref={rootRef} className="fixed inset-0 z-[60]" role="presentation" data-tour-overlay>
      <div
        ref={dimRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-black/65"
        style={{ willChange: "clip-path" }}
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ opacity: 0, willChange: "top, left, width, height, opacity" }}
      >
        <div
          className="absolute inset-0 rounded-lg ring-1 ring-white/45"
          style={{ animation: "tour-ring-pulse 2400ms ease-in-out infinite" }}
        />
      </div>

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-live="polite"
        aria-label={`Обучение: ${step.title}`}
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={[
          "absolute flex flex-col overflow-hidden rounded-lg border border-white/25 bg-[#0a0a0c] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)] outline-none",
          manualPos === null && auto === null ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" : "",
          dragging ? "cursor-grabbing select-none" : "cursor-grab",
        ].join(" ")}
        style={{
          ...style,
          animation: dragging ? undefined : "tour-card-in 300ms cubic-bezier(0.2,0.8,0.2,1) both",
          touchAction: "none",
        }}
        data-dragging={dragging ? "true" : "false"}
        data-side={manualPos === null ? auto?.side ?? "center" : "manual"}
      >
        <div className="h-0.5 w-full shrink-0 bg-white/10">
          <div
            className="h-full bg-white/80 transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4">
          <span className="text-[11px] uppercase tracking-[0.14em] text-white/35">
            {index + 1} / {steps.length} · обучение
          </span>
          <div className="flex items-center gap-1">
            <span
              aria-hidden="true"
              title="Карточку можно перетащить"
              className="select-none px-1 text-[13px] leading-none text-white/20"
            >
              ⠿
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть обучение"
              className="h-6 w-6 rounded text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {compact ? null : (
          <div className="shrink-0 px-5 pb-1 pt-3">
            <TourArt key={step.id} variant={step.art} />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-3">
          <h2
            key={`title-${step.id}`}
            className="text-lg font-medium text-white/90"
            style={{ animation: "tour-fade-up 300ms ease-out both" }}
          >
            {step.title}
          </h2>
          <p
            key={`body-${step.id}`}
            className="mt-2 text-sm leading-relaxed text-white/60"
            style={{ animation: "tour-fade-up 300ms ease-out both", animationDelay: "60ms" }}
          >
            {step.body}
          </p>

          {step.bullets === undefined ? null : (
            <ul className="mt-3 flex flex-col gap-1.5">
              {step.bullets.map((bullet, bulletIndex) => (
                <li
                  key={bullet}
                  className="flex items-start gap-2 text-xs text-white/55"
                  style={{
                    animation: "tour-fade-up 300ms ease-out both",
                    animationDelay: `${120 + bulletIndex * 70}ms`,
                  }}
                >
                  <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-white/40" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 px-5 py-3">
          <div className="flex items-center gap-1" aria-hidden="true">
            {steps.map((item, dotIndex) => (
              <span
                key={item.id}
                className={`h-1 rounded-full transition-all duration-300 ${
                  dotIndex === index
                    ? "w-5 bg-white/80"
                    : dotIndex < index
                      ? "w-1.5 bg-white/40"
                      : "w-1.5 bg-white/15"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={index === 0 ? onClose : () => go(index - 1)}
              className="inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              {index === 0 ? "Пропустить" : "Назад"}
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={!ready}
              className="inline-flex h-7 items-center rounded-md border border-white/85 bg-white/85 px-2.5 text-xs font-medium text-[#0a0a0c] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {last ? "Начать" : "Далее"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
