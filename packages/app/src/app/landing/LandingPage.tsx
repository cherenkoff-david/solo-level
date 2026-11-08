import { Link } from "react-router-dom";

import { Logo } from "../shell/Logo";
import { Cta } from "./Cta";
import { Faq } from "./Faq";
import { FinanceSection } from "./Finance";
import { HeroDemo } from "./HeroDemo";
import { Spheres } from "./Spheres";
import { Stages } from "./Stages";
import { TodayPanel } from "./TodayPanel";
import "../../styles/landing.css";

export function LandingPage() {
  return (
    <div className="landing">
      <div className="landing-wrap">
        <header className="landing-bar">
          <Link
            to="/welcome"
            className="flex items-center gap-2 text-body font-medium tracking-[-0.01em]"
          >
            <Logo />
            Solo
          </Link>
          <a href="#how" className="landing-bar__link">
            Как это работает
          </a>
        </header>
      </div>

      <div className="landing-wrap">
        <section aria-labelledby="hero-title" className="landing-hero">
          <div className="landing-hero__left">
            <h1 id="hero-title" className="landing-hero__title">
              <span className="mask-line">
                <span>Расти</span>
              </span>
              <span className="mask-line">
                <span>каждый день</span>
              </span>
            </h1>

            <p className="landing-hero__sentence hero-fade">
              Solo превращает ежедневные дела в опыт, уровни и сферы жизни. Пропуск не отнимает
              награду — можно продолжать с того места, где остановился.
            </p>

            <div className="landing-hero__actions hero-fade">
              <Link to="/" className="landing-button">
                Открыть Solo
              </Link>
              <a href="#how" className="landing-bar__link">
                Сначала покажите
              </a>
            </div>
          </div>

          <div className="landing-hero__right">
            <div className="flex w-full flex-col items-center">
              <HeroDemo />
              <p className="landing-hint">
                Отметь дело — Искра вырастет. Числа считает тот же код, что и в приложении,
                поэтому сумма всегда сходится.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="landing-section">
        <div className="landing-wrap">
          <TodayPanel />
        </div>
      </div>

      <Stages />

      <Spheres />

      <FinanceSection />

      <div className="landing-section">
        <div className="landing-wrap">
          <Faq />
        </div>
      </div>

      <Cta />

      <footer className="landing-footer">
        <div className="landing-wrap landing-footer-grid">
          <p>Solo — личный трекер привычек</p>
          <nav aria-label="Разделы приложения" className="flex flex-wrap gap-6">
            <Link to="/">Сегодня</Link>
            <Link to="/progress">Прогресс</Link>
            <Link to="/finance">Финансы</Link>
          </nav>
          <p>2026 · данные видны только тебе</p>
        </div>
      </footer>
    </div>
  );
}
