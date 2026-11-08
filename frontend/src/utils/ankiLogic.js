import { addDays, startOfDay } from 'date-fns';

/**
 * Algoritmo SM-2 (SuperMemo-2) simplificado
 * @param {number} quality - 0 (Errei), 3 (Difícil), 4 (Bom), 5 (Fácil)
 * @param {number} repetitions - Quantas vezes foi revisado com sucesso consecutivamente
 * @param {number} easiness - Fator de facilidade (padrão inicial 2.5)
 * @param {number} interval - Intervalo em dias
 */
export const calculateNextReview = (quality, repetitions, easiness, interval) => {
  let nextRepetitions;
  let nextEasiness;
  let nextInterval;

  if (quality >= 3) {
    if (repetitions === 0) {
      nextInterval = 1;
    } else if (repetitions === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(interval * easiness);
    }
    nextRepetitions = repetitions + 1;
  } else {
    nextRepetitions = 0;
    nextInterval = 1;
  }

  nextEasiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (nextEasiness < 1.3) nextEasiness = 1.3;

  const nextDate = addDays(startOfDay(new Date()), nextInterval);

  return {
    repetitions: nextRepetitions,
    easiness: nextEasiness,
    interval: nextInterval,
    nextReview: nextDate.toISOString(),
  };
};

/**
 * Formata o tópico do edital removendo a disciplina inicial
 * Ex: "DIREITO PENAL - Crimes contra a vida" -> "Crimes contra a vida"
 */
export const formatTopic = (topic, discipline) => {
  if (!topic || !discipline) return topic;
  const prefix = `${discipline} - `;
  if (topic.startsWith(prefix)) {
    return topic.replace(prefix, '');
  }
  return topic;
};

export const INITIAL_SM2_STATE = {
  repetitions: 0,
  easiness: 2.5,
  interval: 0,
  nextReview: new Date().toISOString(),
};
