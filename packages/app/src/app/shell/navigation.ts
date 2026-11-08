export interface NavItem {
  readonly path: string;
  readonly label: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: "/", label: "Сегодня" },
  { path: "/progress", label: "Прогресс" },
  { path: "/spheres", label: "Сферы" },
  { path: "/settings", label: "Настройки" },
  { path: "/finance", label: "Финансы" },
];
