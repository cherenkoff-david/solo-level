const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

/**
 * Инициалы для аватара: «david.cherenkov@mail.ru» → «DC».
 * Берутся первые буквы частей локальной части адреса; если частей нет —
 * первая буква адреса. Пустая строка и мусор дают «?», чтобы аватар
 * никогда не оставался пустым квадратом.
 */
export function initialsFromEmail(email: string | null): string {
  if (email === null) return "?";
  const trimmed = email.trim();
  if (trimmed === "") return "?";
  const local = trimmed.split("@")[0] ?? "";
  const parts = local
    .split(/[._+\-]+/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
  if (parts.length === 0) return trimmed.slice(0, 1).toUpperCase();
  const letters = parts
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");
  return letters === "" ? "?" : letters;
}

/** Короткий идентификатор для показа: полный UUID в интерфейсе бесполезен. */
export function shortUserId(id: string | null): string {
  if (id === null || id === "") return "—";
  return id.slice(0, 8);
}

export interface FormatMomentOptions {
  /** Часовой пояс IANA. По умолчанию — локальный пояс пользователя. */
  readonly timeZone?: string;
  /** Добавить время после даты. */
  readonly withTime?: boolean;
}

/**
 * Дата (и время) в русском формате: «22 ноября 2026», «22 ноября 2026, 19:04».
 * Собирается вручную из частей: `Intl` с локалью ru добавляет «г.» и зависит
 * от версии ICU, а формат должен быть предсказуемым и проверяемым в тестах.
 */
export function formatMoment(iso: string | null, options: FormatMomentOptions = {}): string {
  if (iso === null || iso === "") return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: options.timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: options.withTime === true ? "2-digit" : undefined,
    minute: options.withTime === true ? "2-digit" : undefined,
    hour12: false,
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  const day = pick("day").replace(/^0/, "");
  const monthIndex = Number(pick("month")) - 1;
  const month = MONTHS_GENITIVE[monthIndex] ?? "";
  const year = pick("year");

  if (options.withTime !== true) return `${day} ${month} ${year}`;

  // Intl в режиме 24 часов может вернуть «24» для полуночи — приводим к «00».
  const hour = pick("hour") === "24" ? "00" : pick("hour");
  return `${day} ${month} ${year}, ${hour}:${pick("minute")}`;
}

/** Человеческое название способа входа вместо технического имени провайдера. */
export function providerLabel(provider: string | null): string {
  switch (provider) {
    case null:
    case "":
      return "почта и пароль";
    case "email":
      return "почта и пароль";
    case "email_otp":
    case "magiclink":
      return "ссылка на почту";
    case "google":
      return "Google";
    case "github":
      return "GitHub";
    case "apple":
      return "Apple";
    default:
      return provider;
  }
}
