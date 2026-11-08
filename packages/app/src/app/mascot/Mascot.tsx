import { useEffect, useId, useRef, useState } from "react";

import "../../styles/mascot.css";

export type MascotVariant = "figure" | "mark";

interface MascotProps {
  readonly level: number;
  readonly className?: string;
  readonly label?: string;
  readonly variant?: MascotVariant;
  readonly parallax?: boolean;
}

const MAX_STAGE = 8;

const ROBE = "M100 94 C 86 94 76 101 72 112 C 64 136 55 196 50 244 C 47 262 54 276 66 280 C 82 286 118 286 134 280 C 146 276 153 262 150 244 C 145 196 136 136 128 112 C 124 101 114 94 100 94 Z";
const HOOD = "M100 30 C 86 30 76 40 75 55 C 74 72 78 92 86 104 C 90 110 95 113 100 113 C 105 113 110 110 114 104 C 122 92 126 72 125 55 C 124 40 114 30 100 30 Z";
const FACE = "M100 56 C 92 56 87 65 87 77 C 87 90 92 99 100 99 C 108 99 113 90 113 77 C 113 65 108 56 100 56 Z";
const SCARF_A = "M112 101 C 134 95 158 103 170 119 C 178 130 174 145 162 151";
const SCARF_B = "M108 107 C 128 109 144 121 150 136 C 154 147 149 156 138 159";
const SCARF_C = "M106 112 C 118 118 126 129 128 141";
const HEM = "M66 280 C 82 286 118 286 134 280";

function clamp(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function useParallax(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const element = ref.current;
    if (!element) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    if (!window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    let frame = 0;
    const target = { x: 0, y: 0 };

    const apply = () => {
      frame = 0;
      element.style.setProperty("--mx", target.x.toFixed(3));
      element.style.setProperty("--my", target.y.toFixed(3));
    };

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      target.x = clamp((event.clientX - (rect.left + rect.width / 2)) / (rect.width * 0.9));
      target.y = clamp((event.clientY - (rect.top + rect.height / 2)) / (rect.height * 0.9));
      frame ||= requestAnimationFrame(apply);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [enabled]);

  return ref;
}

export function Mascot({
  level,
  className,
  label,
  variant = "figure",
  parallax = true,
}: MascotProps) {
  const id = useId();
  const aura = `m-aura-${id}`;
  const robeFill = `m-robe-${id}`;
  const robeLit = `m-lit-${id}`;
  const hoodFill = `m-hood-${id}`;
  const faceFill = `m-face-${id}`;
  const rimFill = `m-rim-${id}`;
  const emberFill = `m-ember-${id}`;
  const scarfFill = `m-scarf-${id}`;
  const haloFill = `m-halo-${id}`;
  const floorFill = `m-floor-${id}`;
  const robeClip = `m-clip-${id}`;
  const softBlur = `m-soft-${id}`;
  const glowBlur = `m-glow-${id}`;

  const stage = Math.min(MAX_STAGE, Math.max(1, Math.round(level)));
  const scale = 1 + (stage - 1) * 0.026;
  const core = 7.6 + stage * 1.05;
  const has = (min: number) => stage >= min;
  const strands = stage >= 8 ? 3 : stage >= 5 ? 2 : 1;
  const rings = stage >= 8 ? 2 : stage >= 6 ? 1 : 0;
  const motes = stage >= 8 ? 5 : stage >= 6 ? 3 : 0;
  const isMark = variant === "mark";

  const previous = useRef(stage);
  const [rise, setRise] = useState(0);

  useEffect(() => {
    if (stage > previous.current) {
      setRise((value) => value + 1);
    }
    previous.current = stage;
  }, [stage]);

  const ref = useParallax(parallax && !isMark);

  return (
    <div
      ref={ref}
      data-mascot=""
      data-stage={stage}
      data-level={level}
      className={className}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "50% 88%",
        transition: "transform 700ms cubic-bezier(0.22, 0.7, 0.3, 1)",
      }}
    >
      <svg
        viewBox={isMark ? "66 22 68 100" : "30 8 160 292"}
        role="img"
        aria-label={label ?? `Искра, странник — уровень ${level}`}
        focusable="false"
        className="mascot-svg"
      >
        <defs>
          <radialGradient id={aura}>
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.18" />
            <stop offset="40%" stopColor="var(--color-accent)" stopOpacity="0.07" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={robeFill} x1="60" y1="110" x2="146" y2="272" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2a1653" />
            <stop offset="30%" stopColor="#1c0e3a" />
            <stop offset="70%" stopColor="#120825" />
            <stop offset="100%" stopColor="#08030f" />
          </linearGradient>
          <linearGradient id={robeLit} x1="48" y1="120" x2="104" y2="270" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
            <stop offset="52%" stopColor="var(--color-accent)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={hoodFill} x1="78" y1="34" x2="120" y2="108" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3a2469" />
            <stop offset="34%" stopColor="#251246" />
            <stop offset="100%" stopColor="#0c0519" />
          </linearGradient>
          <radialGradient id={faceFill} cx="0.5" cy="0.56" r="0.66">
            <stop offset="0%" stopColor="#2a1348" />
            <stop offset="58%" stopColor="#0b0418" />
            <stop offset="100%" stopColor="#020006" />
          </radialGradient>
          <linearGradient id={rimFill} x1="74" y1="40" x2="96" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c9b6ff" stopOpacity="0.75" />
            <stop offset="60%" stopColor="var(--color-accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.05" />
          </linearGradient>
          <radialGradient id={emberFill}>
            <stop offset="0%" stopColor="#fffdf7" />
            <stop offset="28%" stopColor="#ffe3b0" />
            <stop offset="64%" stopColor="var(--color-progress)" />
            <stop offset="100%" stopColor="var(--color-progress)" stopOpacity="0.3" />
          </radialGradient>
          <linearGradient id={scarfFill} x1="106" y1="100" x2="180" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffe9c6" stopOpacity="0.95" />
            <stop offset="34%" stopColor="var(--color-progress)" stopOpacity="0.66" />
            <stop offset="100%" stopColor="var(--color-progress)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={haloFill} x1="74" y1="26" x2="126" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--color-progress)" stopOpacity="0" />
            <stop offset="46%" stopColor="#ffe9c6" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--color-progress)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={floorFill}>
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.2" />
            <stop offset="66%" stopColor="var(--color-accent)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
          <clipPath id={robeClip}>
            <path d={ROBE} />
          </clipPath>
          <filter id={softBlur} x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id={glowBlur} x="-90%" y="-90%" width="280%" height="280%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {isMark ? null : (
          <g aria-hidden="true">
            <ellipse cx="100" cy="168" rx="86" ry="110" fill={`url(#${aura})`} className="mascot-aura" />
            <ellipse cx="100" cy="286" rx="54" ry="10" fill={`url(#${floorFill})`} />
          </g>
        )}

        <g className="mascot-rig">
          <g className={isMark ? "mascot-mark" : "mascot-figure"}>
            {isMark ? (
              <g aria-hidden="true">
                <ellipse cx="100" cy="76" rx="36" ry="40" fill={`url(#${aura})`} opacity="0.9" />
                <path d={HOOD} fill={`url(#${hoodFill})`} />
                <path
                  d="M100 32 C 88 32 79 41 78 54"
                  fill="none"
                  stroke={`url(#${rimFill})`}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path d={FACE} fill={`url(#${faceFill})`} />
                <path
                  d="M100 56 C 92 56 87 65 87 77 C 87 90 92 99 100 99"
                  fill="none"
                  stroke="#05010e"
                  strokeOpacity="0.8"
                  strokeWidth="1.3"
                />
                <path d="M87 69 C 93 64 107 64 113 69 C 110 61 106 58 100 58 C 94 58 90 61 87 69 Z" fill="#04010b" />
                <g className="mascot-eyes">
                  <path d="M91 78 C 93 76 96 76 98 78 C 96 81 93 81 91 78 Z" fill="#ffe9c4" />
                  <path d="M102 78 C 104 76 107 76 109 78 C 107 81 104 81 102 78 Z" fill="#ffe9c4" />
                </g>
                <circle cx="100" cy="92" r="3.6" fill={`url(#${emberFill})`} className="mascot-ember" />
              </g>
            ) : (
              <>
                <ellipse cx="100" cy="285" rx="40" ry="5.5" fill="#020006" opacity="0.75" />

                {has(4) ? (
                  <g className="mascot-cape">
                    <path
                      d="M124 108 C 148 134 162 184 166 230 C 168 248 161 262 150 262 C 145 224 138 174 122 138 Z"
                      fill="#0c0419"
                    />
                    <path
                      d="M126 116 C 146 142 158 184 160 222"
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeOpacity="0.12"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </g>
                ) : null}

                <g className="mascot-body">
                  <path d={ROBE} fill={`url(#${robeFill})`} />

                  <g clipPath={`url(#${robeClip})`}>
                    <path d={ROBE} fill={`url(#${robeLit})`} opacity="0.9" />
                    <path
                      d="M72 112 C 64 136 55 196 50 244 C 47 262 54 276 66 280"
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeOpacity="0.42"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M100 96 C 100 140 100 210 100 282"
                      fill="none"
                      stroke="#04010b"
                      strokeOpacity="0.35"
                      strokeWidth="9"
                      className="mascot-placket"
                    />
                    <path
                      d="M118 100 C 124 148 130 214 133 280"
                      fill="none"
                      stroke="#04010b"
                      strokeOpacity="0.3"
                      strokeWidth="4"
                    />
                    <path
                      d="M132 104 C 140 152 146 216 149 278"
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeOpacity="0.14"
                      strokeWidth="1.6"
                    />
                  </g>

                  <path d={HEM} fill="none" stroke="var(--color-accent)" strokeOpacity="0.22" strokeWidth="1.4" strokeLinecap="round" />

                  {has(3) ? (
                    <g className="mascot-mantle">
                      <path
                        d="M100 94 C 85 94 75 101 71 113 C 80 124 90 129 100 129 C 111 129 121 124 129 113 C 125 101 115 94 100 94 Z"
                        fill="#20103f"
                      />
                      <path
                        d="M71 113 C 80 124 90 129 100 129 C 111 129 121 124 129 113"
                        fill="none"
                        stroke="#06010e"
                        strokeOpacity="0.9"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M76 112 C 84 120 92 123 100 123"
                        fill="none"
                        stroke="var(--color-accent)"
                        strokeOpacity="0.24"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </g>
                  ) : null}

                  <g className="mascot-core">
                    <ellipse cx="100" cy="170" rx={core + 8} ry={core + 9} fill="#030008" opacity="0.92" />
                    <circle cx="100" cy="168" r={core + 15} fill="var(--color-progress)" opacity="0.18" filter={`url(#${glowBlur})`} />
                    <circle cx="100" cy="168" r={core + 4} fill="var(--color-progress)" opacity="0.13" />
                    <circle cx="100" cy="168" r={core} fill={`url(#${emberFill})`} />
                    <circle cx="100" cy="168" r={core * 0.34} fill="#fffdf6" />
                  </g>

                  {rings > 0 ? (
                    <g className="mascot-orbits">
                      <ellipse
                        cx="100"
                        cy="172"
                        rx="52"
                        ry="13"
                        transform="rotate(-14 100 172)"
                        fill="none"
                        stroke="var(--color-progress)"
                        strokeWidth="0.8"
                        strokeOpacity="0.3"
                      />
                      <circle cx="52" cy="182" r="1.5" fill="var(--color-progress)" opacity="0.8" />
                      {rings >= 2 ? (
                        <>
                          <ellipse
                            cx="100"
                            cy="168"
                            rx="64"
                            ry="20"
                            transform="rotate(10 100 168)"
                            fill="none"
                            stroke="var(--color-accent)"
                            strokeWidth="0.7"
                            strokeOpacity="0.17"
                            strokeDasharray="2 8"
                          />
                          <circle cx="162" cy="162" r="1.3" fill="var(--color-accent)" opacity="0.6" />
                        </>
                      ) : null}
                    </g>
                  ) : null}

                  <g className="mascot-layer">
                    <g className="mascot-sway">
                      <path d={SCARF_A} fill="none" stroke={`url(#${scarfFill})`} strokeWidth={strands === 1 ? 4.4 : 5.4} strokeLinecap="round" />
                      {strands >= 2 ? (
                        <path d={SCARF_B} fill="none" stroke={`url(#${scarfFill})`} strokeWidth="3.4" strokeLinecap="round" opacity="0.85" />
                      ) : null}
                      {strands >= 3 ? (
                        <path d={SCARF_C} fill="none" stroke={`url(#${scarfFill})`} strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
                      ) : null}
                    </g>
                    <g className="mascot-sway mascot-sway--b">
                      <path d={SCARF_A} fill="none" stroke="#fff3da" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="10 96" className="mascot-glint" />
                      {strands >= 2 ? (
                        <path d={SCARF_B} fill="none" stroke="#fff3da" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="8 84" className="mascot-glint mascot-glint--b" />
                      ) : null}
                    </g>
                  </g>

                  {has(7) ? (
                    <g className="mascot-sigils">
                      <path
                        d="M78 108 L 84 112 L 78 116"
                        fill="none"
                        stroke="var(--color-accent)"
                        strokeOpacity="0.65"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M122 108 L 116 112 L 122 116"
                        fill="none"
                        stroke="var(--color-accent)"
                        strokeOpacity="0.65"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  ) : null}

                  {has(8) ? (
                    <g className="mascot-halo">
                      <path
                        d="M74 22 C 84 8 116 8 126 22"
                        fill="none"
                        stroke={`url(#${haloFill})`}
                        strokeWidth="5.5"
                        strokeLinecap="round"
                        filter={`url(#${glowBlur})`}
                        opacity="0.5"
                      />
                      <path
                        d="M74 22 C 84 8 116 8 126 22"
                        fill="none"
                        stroke={`url(#${haloFill})`}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </g>
                  ) : null}

                  <g className="mascot-head">
                    <path d={HOOD} fill={`url(#${hoodFill})`} stroke="#06010e" strokeOpacity="0.85" strokeWidth="1" />
                    <path
                      d="M100 32 C 88 32 79 41 78 54 C 77 70 80 88 87 100"
                      fill="none"
                      stroke={`url(#${rimFill})`}
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                    <path
                      d="M120 40 C 125 54 126 76 122 94"
                      fill="none"
                      stroke="var(--color-progress)"
                      strokeOpacity="0.2"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    <path d={FACE} fill={`url(#${faceFill})`} />
                    <path
                      d="M100 56 C 92 56 87 65 87 77 C 87 90 92 99 100 99"
                      fill="none"
                      stroke="#05010e"
                      strokeOpacity="0.8"
                      strokeWidth="1.4"
                    />
                    <path d="M87 69 C 93 64 107 64 113 69 C 110 61 106 58 100 58 C 94 58 90 61 87 69 Z" fill="#04010b" opacity="0.95" />
                    <g className="mascot-eyes">
                      <path d="M91 78 C 93 75.6 96 75.6 98 78 C 96 81 93 81 91 78 Z" fill="#ffe9c4" />
                      <path d="M102 78 C 104 75.6 107 75.6 109 78 C 107 81 104 81 102 78 Z" fill="#ffe9c4" />
                      <circle cx="94" cy="78" r="4" fill="var(--color-progress)" opacity="0.32" filter={`url(#${softBlur})`} />
                      <circle cx="106" cy="78" r="4" fill="var(--color-progress)" opacity="0.32" filter={`url(#${softBlur})`} />
                    </g>
                    <ellipse cx="100" cy="95" rx="7.4" ry="4" fill="var(--color-progress)" opacity="0.2" />
                    <path
                      d="M100 101 C 95 101 91 99 88 95 C 90 101 94 105 100 106 C 106 105 110 101 112 95 C 109 99 105 101 100 101 Z"
                      fill="#08030f"
                      opacity="0.9"
                    />
                  </g>

                  {motes > 0 ? (
                    <g className="mascot-motes">
                      <circle cx="54" cy="212" r="1.5" fill="var(--color-progress)" className="mascot-mote" />
                      <circle cx="146" cy="200" r="1.2" fill="var(--color-progress)" className="mascot-mote mascot-mote--b" />
                      <circle cx="44" cy="158" r="1" fill="var(--color-accent)" className="mascot-mote mascot-mote--c" />
                      {motes >= 5 ? (
                        <>
                          <circle cx="156" cy="134" r="1.1" fill="var(--color-progress)" className="mascot-mote mascot-mote--d" />
                          <circle cx="62" cy="96" r="0.9" fill="var(--color-accent)" className="mascot-mote mascot-mote--e" />
                        </>
                      ) : null}
                    </g>
                  ) : null}

                  {rise > 0 ? (
                    <g key={rise} className="mascot-rise">
                      <circle cx="100" cy="168" r="26" fill="none" stroke="var(--color-progress)" strokeWidth="1.5" />
                      <circle cx="100" cy="168" r="38" fill="none" stroke="var(--color-progress)" strokeWidth="0.8" opacity="0.6" />
                    </g>
                  ) : null}
                </g>
              </>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
}
