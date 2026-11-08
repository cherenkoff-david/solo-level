import { Reveal } from "./Reveal";
import { SphereRadar } from "../spheres/SphereRadar";
import { getSphereProgress, SPHERES } from "../spheres/spheres";

const progress = getSphereProgress(SPHERES);

export function Spheres() {
  return (
    <section aria-labelledby="spheres-title" className="landing-section">
      <Reveal className="landing-wrap landing-spheres-grid">
        <div className="reveal-child w-full" data-ui>
          <SphereRadar progress={progress} />
        </div>

        <div className="landing-spheres-text">
          <h2 id="spheres-title" className="landing-heading reveal-child">
            Пять направлений, не счётчик
          </h2>
          <p className="landing-body reveal-child mt-6 max-w-[42ch]">
            Один и тот же опыт идёт и в общий уровень, и в сферу. По радару видно, куда ты
            вкладываешься больше, а какое направление просело — без упрёков и оценок.
          </p>

          <ul className="landing-spheres-list reveal-child">
            {progress.map((item) => (
              <li key={item.sphere.id}>
                <span>{item.sphere.name}</span>
                <span className="nums">
                  ур. {item.level} · {item.totalXp} XP
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
