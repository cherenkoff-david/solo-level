import type { DeviationDirection } from "@solo/finance";

/**
 * Слова для направления расхождения. Единственный источник пользовательских
 * формулировок: и список план/факт, и карточка баланса, и история месяцев
 * берут текст отсюда, чтобы «сверх плана» не превращалось в «перерасход»
 * на одном экране.
 */
export function deviationWords(direction: DeviationDirection): string {
  switch (direction) {
    case "over":
      return "сверх плана";
    case "under":
      return "ниже плана";
    case "no_plan":
      return "без плана";
    case "exact":
      return "по плану";
  }
}

/** Тот же смысл для чипа баланса, где нужен предлог: «ниже плана на 10 000 ₽». */
export function deviationWordsWithPreposition(direction: DeviationDirection): string {
  switch (direction) {
    case "over":
      return "выше плана на";
    case "under":
      return "ниже плана на";
    case "no_plan":
      return "без плана на";
    case "exact":
      return "ровно по плану";
  }
}
