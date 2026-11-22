import { test } from "node:test";
import assert from "node:assert/strict";

import {
  formatMoment,
  initialsFromEmail,
  providerLabel,
  shortUserId,
} from "../src/app/profile/profile.ts";

test("Инициалы из адреса почты", () => {
  assert.equal(initialsFromEmail("david.cherenkov@mail.ru"), "DC");
  assert.equal(initialsFromEmail("david_cherenkov@mail.ru"), "DC");
  assert.equal(initialsFromEmail("d.cherenkov@mail.ru"), "DC");
  assert.equal(initialsFromEmail("test@solo.local"), "T");
});

test("Инициалы не пустые для странного ввода", () => {
  assert.equal(initialsFromEmail(null), "?");
  assert.equal(initialsFromEmail(""), "?");
  assert.equal(initialsFromEmail("   "), "?");
  assert.equal(initialsFromEmail("@mail.ru"), "@");
});

test("Инициалы не больше двух букв", () => {
  assert.equal(initialsFromEmail("a.b.c.d.e@mail.ru").length, 2);
});

test("Короткий идентификатор обрезает UUID", () => {
  assert.equal(shortUserId("9f1c2e7a-4b3d-4f8e-9a11-2c3d4e5f6a7b"), "9f1c2e7a");
  assert.equal(shortUserId(null), "—");
  assert.equal(shortUserId(""), "—");
});

test("Дата регистрации в русском формате", () => {
  assert.equal(formatMoment("2026-11-22T19:04:00Z", { timeZone: "UTC" }), "22 ноября 2026");
  assert.equal(formatMoment("2026-01-01T00:00:00Z", { timeZone: "UTC" }), "1 января 2026");
});

test("Дата со временем", () => {
  assert.equal(
    formatMoment("2026-11-22T19:04:00Z", { timeZone: "UTC", withTime: true }),
    "22 ноября 2026, 19:04",
  );
  assert.equal(
    formatMoment("2026-11-22T00:05:00Z", { timeZone: "UTC", withTime: true }),
    "22 ноября 2026, 00:05",
  );
});

test("Часовой пояс влияет на дату, а не на строку", () => {
  const iso = "2026-11-22T22:30:00Z";
  assert.equal(formatMoment(iso, { timeZone: "UTC" }), "22 ноября 2026");
  assert.equal(formatMoment(iso, { timeZone: "Europe/Moscow" }), "23 ноября 2026");
});

test("Пустая и битая дата дают прочерк, а не «Invalid Date»", () => {
  assert.equal(formatMoment(null), "—");
  assert.equal(formatMoment(""), "—");
  assert.equal(formatMoment("не дата"), "—");
});

test("Способ входа переводится на человеческий язык", () => {
  assert.equal(providerLabel("email"), "почта и пароль");
  assert.equal(providerLabel(null), "почта и пароль");
  assert.equal(providerLabel("magiclink"), "ссылка на почту");
  assert.equal(providerLabel("email_otp"), "ссылка на почту");
  assert.equal(providerLabel("google"), "Google");
  assert.equal(providerLabel("unknown-provider"), "unknown-provider");
});
