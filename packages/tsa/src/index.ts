export interface StepReason {
  code: string;
  message: string;
}

export interface StepSuccess {
  status: 'success';
  expression: string;
}

export interface StepFailure {
  status: 'error';
  reason: StepReason;
}

export type StepResult = StepSuccess | StepFailure;

export interface StepExample {
  id: string;
  title: string;
  expression: string;
  description: string;
}

const FRACTION_BAR_MESSAGES: Record<string, StepReason> = {
  'простой бар': {
    code: 'FRACTION_BAR_NO_INTEGER',
    message: 'Добавьте целую часть или используйте leading zero перед дробной чертой.'
  },
  'сложный бар': {
    code: 'FRACTION_BAR_COMPLEX',
    message: 'Используйте скобки вокруг числителя и знаменателя для сложных выражений.'
  }
};

export const STEP_EXAMPLES: StepExample[] = [
  {
    id: 'simple-bar',
    title: 'Простой бар',
    expression: 'простой бар',
    description: 'Валидация простого деления без целой части.'
  },
  {
    id: 'complex-bar',
    title: 'Сложный бар',
    expression: 'сложный бар',
    description: 'Валидация сложного числителя и знаменателя.'
  },
  {
    id: 'fraction-compose',
    title: 'Композиция дробей',
    expression: '1/2 + 3/4',
    description: 'Пример корректного шага — дроби будут показаны с горизонтальной чертой.'
  }
];

const SUCCESS_TEMPLATE = (input: string): StepSuccess => ({
  status: 'success',
  expression: input
});

const normalize = (input: string): string => input.trim().toLowerCase();

export function applyStep(raw: string): StepResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      status: 'error',
      reason: {
        code: 'EMPTY_STEP',
        message: 'Введите описание шага, чтобы продолжить.'
      }
    };
  }

  const normalized = normalize(trimmed);
  const fractionReason = FRACTION_BAR_MESSAGES[normalized];
  if (fractionReason) {
    return {
      status: 'error',
      reason: fractionReason
    };
  }

  return SUCCESS_TEMPLATE(trimmed);
}
