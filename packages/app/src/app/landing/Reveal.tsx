import { useEffect, useRef, type ReactNode } from "react";

interface RevealProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    let done = false;
    const show = () => {
      if (done) {
        return;
      }
      done = true;
      node.dataset.reveal = "in";
    };

    if (!("IntersectionObserver" in window)) {
      show();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const passedAbove = entry.boundingClientRect.bottom < 0;
          if (entry.isIntersecting || passedAbove) {
            show();
            observer.disconnect();
          }
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(node);

    const check = () => {
      const box = node.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.9) {
        show();
        window.removeEventListener("scroll", check);
      }
    };

    window.addEventListener("scroll", check, { passive: true });
    check();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", check);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
