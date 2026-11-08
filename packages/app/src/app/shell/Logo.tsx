import { useId } from "react";

type LogoProps = {
  monochrome?: boolean;
};

export function Logo({ monochrome = false }: LogoProps) {
  const id = useId();
  const halo = `logo-halo-${id}`;
  const glow = `logo-glow-${id}`;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={`size-5 shrink-0 ${monochrome ? "text-text" : "text-accent"}`}
    >
      <defs>
        <radialGradient id={halo}>
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="58%" stopColor="currentColor" stopOpacity="0.07" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.45" />
        </filter>
      </defs>

      <circle cx="19.3" cy="4.8" r="6.4" fill={`url(#${halo})`} className="logo-halo" />

      <path
        d="M4.8 19.2C13.4 18.9 16.2 14.2 19.3 4.8"
        stroke="currentColor"
        strokeOpacity="0.38"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      <path
        d="M4.8 19.2C13.4 18.9 16.2 14.2 19.3 4.8"
        pathLength={100}
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="7 93"
        filter={`url(#${glow})`}
        className="logo-spark"
      />

      <circle cx="19.3" cy="4.8" r="2.4" stroke="currentColor" strokeWidth="0.9" className="logo-ripple" />
      <circle cx="19.3" cy="4.8" r="1.8" fill="currentColor" className="logo-node" />
      <circle cx="4.8" cy="19.2" r="1.35" fill="currentColor" className="logo-start" />
    </svg>
  );
}
