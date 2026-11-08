import type { CSSProperties } from "react";

import type { TourArtVariant } from "./tourSteps";

function fade(delay: number, extra?: CSSProperties): CSSProperties {
  return { animation: "tour-fade-up 420ms cubic-bezier(0.2,0.7,0.2,1) both", animationDelay: `${delay}ms`, ...extra };
}

function pop(delay: number): CSSProperties {
  return { animation: "tour-pop 420ms cubic-bezier(0.2,0.8,0.2,1) both", animationDelay: `${delay}ms` };
}

function draw(delay: number, length = 400): CSSProperties {
  return {
    strokeDasharray: length,
    strokeDashoffset: length,
    animation: "tour-draw 900ms cubic-bezier(0.3,0.7,0.2,1) both",
    animationDelay: `${delay}ms`,
  };
}

const textClass = "fill-current text-[10px] text-white/55";
const faintClass = "fill-current text-[9px] text-white/35";
const strongClass = "fill-current text-white/90";

export function TourArt({ variant }: { variant: TourArtVariant }) {
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-bg/60">
      <svg viewBox="0 0 320 148" className="block h-[148px] w-full" aria-hidden="true" role="presentation">
        <defs>
          <pattern id="tour-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-white/10" />
          </pattern>
        </defs>
        <rect width="320" height="148" fill="url(#tour-grid)" opacity="0.5" />
        {renderVariant(variant)}
      </svg>
    </div>
  );
}

function renderVariant(variant: TourArtVariant) {
  switch (variant) {
    case "welcome":
      return (
        <g>
          {[0, 1, 2].map((index) => (
            <g key={index} style={fade(index * 140)} transform={`translate(24 ${26 + index * 34})`}>
              <rect width="272" height="26" rx="6" fill="none" stroke="currentColor" className="text-white/30" />
              <rect x="10" y="10" width="6" height="6" rx="1.5" className="fill-white/85" opacity="0.8" />
              <rect x="24" y="10" width={[90, 120, 74][index]} height="6" rx="3" className="fill-white/45" />
              <rect x="228" y="10" width="34" height="6" rx="3" className="fill-white/25" />
            </g>
          ))}
        </g>
      );

    case "setup":
      return (
        <g>
          <g style={fade(0)}>
            <rect x="24" y="24" width="272" height="100" rx="8" fill="none" stroke="currentColor" className="text-white/30" />
            <rect x="40" y="38" width="72" height="7" rx="3.5" className="fill-white/25" />
            <rect x="40" y="54" width="132" height="26" rx="6" className="fill-white/10" stroke="currentColor" strokeWidth="1" />
          </g>
          <text x="52" y="73" style={pop(220)} className={strongClass} fontSize="15">
            45 000 ₽
          </text>
          <g style={fade(360)}>
            <rect x="184" y="54" width="96" height="26" rx="6" fill="none" stroke="currentColor" className="text-white/30" />
            <text x="196" y="71" className={faintClass}>
              01.11.2026
            </text>
          </g>
          <g style={pop(520)}>
            <rect x="40" y="92" width="82" height="20" rx="10" className="fill-white/85" />
            <text x="52" y="106" className="fill-current text-[#0a0a0c]" fontSize="9">
              Начать
            </text>
          </g>
          <g style={fade(620)}>
            <rect x="132" y="92" width="164" height="20" rx="10" fill="none" stroke="currentColor" className="text-white/14" />
            <text x="144" y="106" className={faintClass}>
              12 категорий по умолчанию
            </text>
          </g>
        </g>
      );

    case "balance":
      return (
        <g>
          <rect x="24" y="24" width="272" height="100" rx="8" fill="none" stroke="currentColor" className="text-white/30" />
          <text x="40" y="44" className={faintClass} style={fade(0)}>
            СЕЙЧАС НА РУКАХ
          </text>
          <text x="40" y="76" style={pop(140)} className={strongClass} fontSize="24">
            60 000 ₽
          </text>
          <g style={fade(320)}>
            <text x="40" y="98" className={textClass}>
              по плану
            </text>
            <text x="88" y="98" className={strongClass} fontSize="12">
              70 000 ₽
            </text>
          </g>
          <g style={fade(460)}>
            <rect x="228" y="48" width="54" height="22" rx="11" fill="none" stroke="currentColor" className="text-white/30" />
            <text x="240" y="63" className={textClass}>
              −10 000
            </text>
          </g>
          <line x1="40" y1="112" x2="280" y2="112" stroke="currentColor" strokeWidth="1" className="text-white/14" strokeDasharray="2 4" />
        </g>
      );

    case "deviation":
      return (
        <g>
          <text x="24" y="30" className={faintClass} style={fade(0)}>
            ПЛАН
          </text>
          <rect x="24" y="38" width="200" height="10" rx="5" fill="none" stroke="currentColor" strokeDasharray="3 3" className="text-white/45" style={fade(100)} />
          <text x="24" y="70" className={faintClass} style={fade(200)}>
            ФАКТ
          </text>
          <rect x="24" y="78" width="160" height="10" rx="5" className="fill-white/85" style={{ ...pop(260), transformOrigin: "24px 83px" }} />
          <g style={fade(420)}>
            <rect x="24" y="100" width="120" height="22" rx="11" fill="none" stroke="currentColor" className="text-white/30" />
            <text x="38" y="115" className={textClass}>
              −8 000 ₽ ниже плана
            </text>
          </g>
          <g style={fade(560)}>
            <rect x="216" y="26" width="80" height="64" rx="8" fill="none" stroke="currentColor" className="text-white/14" />
            <text x="228" y="44" className={faintClass}>
              СНИМОК
            </text>
            <text x="228" y="60" className={textClass}>
              сентябрь
            </text>
            <text x="228" y="76" className={textClass}>
              −12 000 ₽
            </text>
          </g>
        </g>
      );

    case "chart":
      return (
        <g>
          <line x1="24" y1="120" x2="296" y2="120" stroke="currentColor" strokeWidth="1" className="text-white/30" />
          <path
            d="M24 88 L60 92 L88 74 L112 80 L140 58 L168 64 L196 44 L224 52 L252 36 L296 44"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="text-white/45"
            style={draw(120, 320)}
          />
          <path
            d="M24 88 L60 96 L88 84 L112 92 L140 76 L168 84 L196 68 L224 78 L252 70 L296 88"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-white/85"
            style={draw(300, 320)}
          />
          <g style={pop(900)}>
            <circle cx="140" cy="76" r="3" className="fill-white/85" />
            <text x="140" y="132" textAnchor="middle" className={faintClass}>
              минимум 12.11
            </text>
          </g>
          <g style={fade(560)}>
            <line x1="24" y1="132" x2="24" y2="120" stroke="currentColor" className="text-white/14" />
            <line x1="296" y1="132" x2="296" y2="120" stroke="currentColor" className="text-white/14" />
          </g>
        </g>
      );

    case "planfact":
      return (
        <g>
          {[
            { name: "Кафе", plan: 92, fact: 128, note: "сверх плана" },
            { name: "Аренда", plan: 128, fact: 128, note: "по плану" },
            { name: "Продукты", plan: 140, fact: 96, note: "экономия" },
          ].map((row, index) => (
            <g key={row.name} style={fade(index * 150)} transform={`translate(24 ${26 + index * 36})`}>
              <text x="0" y="12" className={textClass}>
                {row.name}
              </text>
              <rect x="86" y="2" width="150" height="8" rx="4" fill="none" stroke="currentColor" strokeDasharray="2 3" className="text-white/45" />
              <rect
                x="86"
                y="2"
                width={row.fact}
                height="8"
                rx="4"
                className={row.fact > row.plan ? "fill-white/85" : "fill-white/40"}
                style={{ ...pop(220 + index * 150), transformOrigin: "86px 6px" }}
              />
              <text x="246" y="11" className={faintClass}>
                {row.note}
              </text>
            </g>
          ))}
          <g style={fade(860)}>
            <line x1="24" y1="132" x2="296" y2="132" stroke="currentColor" className="text-white/14" />
            <text x="24" y="144" className={faintClass}>
              план — пунктир, факт — сплошная
            </text>
          </g>
        </g>
      );

    case "queue":
      return (
        <g>
          <g style={fade(0)}>
            <rect x="24" y="24" width="272" height="46" rx="8" fill="none" stroke="currentColor" className="text-white/30" />
            <text x="38" y="42" className={textClass}>
              5 ноября · Аренда
            </text>
            <text x="38" y="58" className={faintClass}>
              35 000 ₽ · план
            </text>
          </g>
          {["Подтвердить", "Изменить", "Не было"].map((label, index) => (
            <g key={label} style={pop(240 + index * 130)}>
              <rect
                x={38 + index * 84}
                y="80"
                width={76}
                height="22"
                rx="6"
                fill={index === 0 ? "currentColor" : "none"}
                stroke="currentColor"
                className={index === 0 ? "fill-white/85 text-white/85" : "text-white/30"}
                strokeWidth="1"
              />
              <text x={76 + index * 84} y="95" textAnchor="middle" className={index === 0 ? "fill-current text-[#0a0a0c]" : textClass} fontSize="9">
                {index === 0 ? "✓ " : ""}
                {label}
              </text>
            </g>
          ))}
          <g style={fade(700)}>
            <text x="24" y="124" className={faintClass}>
              через 3 дня — «требует решения»
            </text>
          </g>
          <g style={{ animation: "tour-pulse 1600ms ease-in-out infinite" }}>
            <circle cx="284" cy="36" r="4" className="fill-white/85" />
          </g>
        </g>
      );

    case "calendar":
      return (
        <g>
          {Array.from({ length: 21 }).map((_, index) => {
            const col = index % 7;
            const row = Math.floor(index / 7);
            const highlighted = index === 10;
            return (
              <g key={index} style={fade(index * 18)}>
                <rect
                  x={24 + col * 39}
                  y={26 + row * 31}
                  width="35"
                  height="27"
                  rx="4"
                  fill={highlighted ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1"
                  className={highlighted ? "fill-white/85 text-white/30" : "text-white/14"}
                />
                {index % 5 === 0 ? (
                  <circle cx={24 + col * 39 + 27} cy={26 + row * 31 + 8} r="1.6" className={highlighted ? "fill-[#0a0a0c]" : "fill-white/45"} />
                ) : null}
                {index % 3 === 0 ? (
                  <rect x={24 + col * 39 + 6} y={26 + row * 31 + 15} width="17" height="3" rx="1.5" className={highlighted ? "fill-[#0a0a0c]" : "fill-white/25"} />
                ) : null}
              </g>
            );
          })}
          <text x="24" y="132" className={faintClass} style={fade(700)}>
            остаток на конец дня
          </text>
        </g>
      );

    case "operations":
      return (
        <g>
          <g style={fade(0)}>
            <rect x="24" y="22" width="78" height="18" rx="5" fill="none" stroke="currentColor" className="text-white/30" />
            <text x="34" y="34" className={faintClass}>
              месяц
            </text>
            <rect x="110" y="22" width="64" height="18" rx="5" fill="none" stroke="currentColor" className="text-white/14" />
            <text x="120" y="34" className={faintClass}>
              тип
            </text>
            <rect x="182" y="22" width="114" height="18" rx="5" fill="none" stroke="currentColor" className="text-white/14" />
            <text x="192" y="34" className={faintClass}>
              поиск по заметке
            </text>
          </g>
          {[
            { name: "Продукты", value: "− 6 500 ₽", chip: "факт" },
            { name: "Аренда", value: "− 35 000 ₽", chip: "план" },
            { name: "Зарплата", value: "+ 120 000 ₽", chip: "факт" },
          ].map((row, index) => (
            <g key={row.name} style={fade(200 + index * 150)} transform={`translate(24 ${52 + index * 28})`}>
              <rect width="272" height="24" rx="5" fill="none" stroke="currentColor" className="text-white/14" />
              <rect x="8" y="8" width="8" height="8" rx="2" className="fill-white/45" />
              <text x="22" y="15" className={textClass}>
                {row.name}
              </text>
              <rect x="86" y="6" width="30" height="12" rx="6" fill="none" stroke="currentColor" className="text-white/30" />
              <text x="94" y="15" className={faintClass}>
                {row.chip}
              </text>
              <text x="264" y="15" textAnchor="end" className={strongClass} fontSize="10">
                {row.value}
              </text>
            </g>
          ))}
        </g>
      );

    case "series":
      return (
        <g>
          <line x1="30" y1="86" x2="292" y2="86" stroke="currentColor" strokeWidth="1" className="text-white/30" />
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <g key={index} style={pop(150 + index * 130)}>
              <circle cx={40 + index * 48} cy="86" r="5" className="fill-white/85" />
              <text x={40 + index * 48} y="106" textAnchor="middle" className={faintClass}>
                {index === 0 ? "01.11" : `+${index} мес`}
              </text>
            </g>
          ))}
          <g style={fade(950)}>
            <path d="M34 66 H250" stroke="currentColor" className="text-white/45" strokeWidth="1" />
            <path d="M34 66 V60 M250 66 V60" stroke="currentColor" className="text-white/45" strokeWidth="1" />
            <text x="142" y="54" textAnchor="middle" className={textClass}>
              12 повторов
            </text>
          </g>
          <g style={fade(1100)}>
            <rect x="248" y="24" width="48" height="18" rx="9" fill="none" stroke="currentColor" className="text-white/30" />
            <text x="258" y="36" className={faintClass}>
              граница
            </text>
          </g>
        </g>
      );

    case "baseline":
      return (
        <g>
          <path d="M24 96 L80 88 L136 74 L192 78 L248 52 L296 46" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" className="text-white/45" style={draw(0, 300)} />
          <path d="M24 100 L80 96 L136 88 L192 94 L248 74 L296 72" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/85" style={draw(220, 300)} />
          <g style={pop(700)} transform="translate(176 0)">
            <line x1="0" y1="30" x2="0" y2="118" stroke="currentColor" className="text-white/85" strokeWidth="1" strokeDasharray="4 3" />
            <rect x="-42" y="14" width="84" height="18" rx="9" className="fill-white/85" />
            <text x="0" y="26" textAnchor="middle" className="fill-current text-[#0a0a0c]" fontSize="9">
              новый отсчёт
            </text>
          </g>
          <text x="24" y="134" className={faintClass} style={fade(900)}>
            прошлое остаётся в снимках
          </text>
        </g>
      );

    case "categories":
      return (
        <g>
          {[
            { x: 24, y: 28, w: 68, name: "Аренда" },
            { x: 100, y: 28, w: 62, name: "Кредит" },
            { x: 170, y: 28, w: 70, name: "Продукты" },
            { x: 24, y: 56, w: 58, name: "Кафе" },
            { x: 90, y: 56, w: 86, name: "Развлечения" },
            { x: 184, y: 56, w: 56, name: "Одежда" },
          ].map((chip, index) => (
            <g key={chip.name} style={fade(index * 90)}>
              <rect x={chip.x} y={chip.y} width={chip.w} height="20" rx="10" fill="none" stroke="currentColor" className="text-white/30" />
              <text x={chip.x + chip.w / 2} y={chip.y + 14} textAnchor="middle" className={faintClass}>
                {chip.name}
              </text>
            </g>
          ))}
          <g style={fade(620)}>
            <rect x="24" y="94" width="140" height="30" rx="6" fill="none" stroke="currentColor" className="text-white/14" strokeDasharray="3 3" />
            <text x="38" y="113" className={faintClass}>
              архив
            </text>
          </g>
          <g style={fade(820)}>
            <rect x="196" y="94" width="76" height="20" rx="10" fill="none" stroke="currentColor" className="text-white/45" />
            <text x="234" y="108" textAnchor="middle" className={faintClass}>
              «Одежда»
            </text>
          </g>
          <g style={{ animation: "tour-fade-in 600ms ease-out both", animationDelay: "700ms" }}>
            <path d="M212 84 C204 90 190 92 176 96" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" className="text-white/45" />
          </g>
        </g>
      );

    case "calm":
      return (
        <g>
          <g style={fade(0)}>
            <text x="40" y="52" className={strongClass} fontSize="20">
              60 000 ₽
            </text>
            <text x="40" y="70" className={faintClass}>
              на руках
            </text>
          </g>
          <g style={{ animation: "tour-calm 1400ms ease-in-out both", animationDelay: "500ms" }}>
            <rect x="176" y="34" width="112" height="24" rx="12" fill="none" stroke="currentColor" className="text-white/30" />
            <text x="190" y="50" className={textClass}>
              −10 000 ниже плана
            </text>
            <line x1="182" y1="46" x2="282" y2="46" stroke="currentColor" className="text-white/85" strokeWidth="1.5" />
          </g>
          <g style={fade(900)}>
            <rect x="40" y="88" width="240" height="34" rx="6" fill="none" stroke="currentColor" className="text-white/14" />
            <text x="52" y="109" className={faintClass}>
              отклонение скрыто · прогноз остаётся
            </text>
          </g>
          <g style={{ animation: "tour-pulse 1800ms ease-in-out infinite" }}>
            <circle cx="268" cy="46" r="3" className="fill-white/85" />
          </g>
        </g>
      );

    case "export":
      return (
        <g>
          <g style={fade(0)}>
            <rect x="112" y="22" width="96" height="66" rx="8" fill="none" stroke="currentColor" className="text-white/30" />
            <path d="M186 22 L208 44 V88 H112 V22 Z" fill="none" stroke="currentColor" className="text-white/30" />
            <text x="126" y="52" className={faintClass}>
              JSON
            </text>
            <rect x="126" y="60" width="52" height="4" rx="2" className="fill-white/25" />
            <rect x="126" y="70" width="38" height="4" rx="2" className="fill-white/25" />
          </g>
          <g style={pop(400)}>
            <path d="M160 96 V120 M148 110 L160 122 L172 110" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/85" style={draw(420, 80)} />
          </g>
          <g style={fade(700)}>
            <rect x="24" y="122" width="82" height="18" rx="9" fill="none" stroke="currentColor" className="text-white/30" />
            <text x="34" y="134" className={faintClass}>
              экспорт
            </text>
            <rect x="216" y="122" width="82" height="18" rx="9" fill="none" stroke="currentColor" className="text-white/30" />
            <text x="226" y="134" className={faintClass}>
              повтор
            </text>
          </g>
        </g>
      );

    case "finish":
      return (
        <g>
          <circle cx="160" cy="70" r="34" fill="none" stroke="currentColor" className="text-white/30" />
          <path d="M146 70 L156 80 L176 58" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/85" style={draw(200, 80)} />
          <text x="160" y="122" textAnchor="middle" className={faintClass} style={fade(700)}>
            план → подтверждение → факт
          </text>
          <g style={{ animation: "tour-pulse 2000ms ease-in-out infinite" }}>
            <circle cx="160" cy="70" r="42" fill="none" stroke="currentColor" className="text-white/14" />
          </g>
        </g>
      );

    default:
      return null;
  }
}
