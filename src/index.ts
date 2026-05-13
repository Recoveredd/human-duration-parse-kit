export type DurationUnit =
  | "millisecond"
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "year";

export type DurationIssueCode =
  | "empty-input"
  | "input-too-long"
  | "expected-number"
  | "expected-unit"
  | "unknown-unit"
  | "calendar-unit-disabled"
  | "negative-disabled"
  | "trailing-operator"
  | "unexpected-token";

export interface HumanDurationOptions {
  allowNegative?: boolean;
  allowCalendarUnits?: boolean;
  maxInputLength?: number;
  emptyIsZero?: boolean;
}

export interface DurationToken {
  value: number;
  unit: DurationUnit;
  milliseconds: number;
  sign: 1 | -1;
  start: number;
  end: number;
  text: string;
}

export interface DurationIssue {
  code: DurationIssueCode;
  message: string;
  start: number;
  end: number;
  text: string;
}

export type HumanDurationResult =
  | {
      ok: true;
      input: string;
      milliseconds: number;
      tokens: DurationToken[];
      issues: [];
    }
  | {
      ok: false;
      input: string;
      milliseconds: undefined;
      tokens: DurationToken[];
      issues: DurationIssue[];
    };

interface Lexeme {
  text: string;
  normalized: string;
  start: number;
  end: number;
}

const DEFAULT_MAX_INPUT_LENGTH = 200;

const UNIT_TO_MS: Record<DurationUnit, number> = {
  millisecond: 1,
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000
};

const UNIT_ALIASES: Record<string, DurationUnit> = {
  ms: "millisecond",
  msec: "millisecond",
  millisecond: "millisecond",
  milliseconds: "millisecond",
  s: "second",
  sec: "second",
  secs: "second",
  second: "second",
  seconds: "second",
  m: "minute",
  min: "minute",
  mins: "minute",
  minute: "minute",
  minutes: "minute",
  h: "hour",
  hr: "hour",
  hrs: "hour",
  hour: "hour",
  hours: "hour",
  d: "day",
  day: "day",
  days: "day",
  w: "week",
  wk: "week",
  wks: "week",
  week: "week",
  weeks: "week",
  mo: "month",
  month: "month",
  months: "month",
  y: "year",
  yr: "year",
  yrs: "year",
  year: "year",
  years: "year"
};

const SMALL_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90
};

export function parseHumanDuration(
  input: string,
  options: HumanDurationOptions = {}
): HumanDurationResult {
  const allowNegative = options.allowNegative ?? true;
  const allowCalendarUnits = options.allowCalendarUnits ?? false;
  const maxInputLength = options.maxInputLength ?? DEFAULT_MAX_INPUT_LENGTH;
  const emptyIsZero = options.emptyIsZero ?? false;
  const issues: DurationIssue[] = [];
  const tokens: DurationToken[] = [];

  if (input.length > maxInputLength) {
    return fail(input, tokens, [
      issue("input-too-long", "Input exceeds maxInputLength.", maxInputLength, input.length, input.slice(maxInputLength))
    ]);
  }

  if (input.trim().length === 0) {
    if (emptyIsZero) {
      return { ok: true, input, milliseconds: 0, tokens, issues: [] };
    }

    return fail(input, tokens, [issue("empty-input", "Input is empty.", 0, input.length, input)]);
  }

  const lexemes = lex(input);
  let cursor = 0;
  let sign: 1 | -1 = 1;
  let total = 0;
  let expected: "number" | "unit" = "number";
  let pending:
    | {
        value: number;
        sign: 1 | -1;
        start: number;
        text: string;
      }
    | undefined;

  while (cursor < lexemes.length) {
    const current = lexemes[cursor]!;

    if (isJoiner(current.normalized)) {
      cursor += 1;
      continue;
    }

    if (isOperator(current.normalized)) {
      if (expected === "unit") {
        issues.push(issue("expected-unit", "Expected a duration unit after this number.", current.start, current.end, current.text));
        expected = "number";
        pending = undefined;
      }

      if (!allowNegative && current.normalized === "-") {
        issues.push(issue("negative-disabled", "Negative duration terms are disabled.", current.start, current.end, current.text));
      }

      sign = current.normalized === "-" ? -1 : 1;
      cursor += 1;
      continue;
    }

    if (expected === "number") {
      const parsedNumber = readNumber(lexemes, cursor);
      if (!parsedNumber) {
        issues.push(issue("expected-number", "Expected a number or number word.", current.start, current.end, current.text));
        cursor += 1;
        continue;
      }

      pending = {
        value: parsedNumber.value,
        sign,
        start: parsedNumber.start,
        text: parsedNumber.text
      };
      cursor = parsedNumber.next;
      expected = "unit";
      sign = 1;
      continue;
    }

    const unit = UNIT_ALIASES[current.normalized];
    if (!unit) {
      issues.push(issue("unknown-unit", "Unknown duration unit.", current.start, current.end, current.text));
      pending = undefined;
      expected = "number";
      cursor += 1;
      continue;
    }

    if ((unit === "month" || unit === "year") && !allowCalendarUnits) {
      issues.push(issue("calendar-unit-disabled", "Calendar duration units are disabled by default.", current.start, current.end, current.text));
      pending = undefined;
      expected = "number";
      cursor += 1;
      continue;
    }

    if (!pending) {
      issues.push(issue("unexpected-token", "Unexpected unit without a number.", current.start, current.end, current.text));
      cursor += 1;
      continue;
    }

    const milliseconds = pending.value * UNIT_TO_MS[unit] * pending.sign;
    tokens.push({
      value: pending.value,
      unit,
      milliseconds,
      sign: pending.sign,
      start: pending.start,
      end: current.end,
      text: input.slice(pending.start, current.end)
    });
    total += milliseconds;
    pending = undefined;
    expected = "number";
    cursor += 1;
  }

  if (pending) {
    issues.push(issue("expected-unit", "Expected a duration unit after this number.", pending.start, input.length, input.slice(pending.start)));
  } else if (lexemes.length > 0 && isOperator(lexemes[lexemes.length - 1]?.normalized ?? "")) {
    const last = lexemes[lexemes.length - 1]!;
    issues.push(issue("trailing-operator", "Input ends with an operator.", last.start, last.end, last.text));
  }

  if (issues.length > 0) {
    return fail(input, tokens, issues);
  }

  return { ok: true, input, milliseconds: total, tokens, issues: [] };
}

export function humanDurationMilliseconds(
  input: string,
  options?: HumanDurationOptions
): number | undefined {
  const result = parseHumanDuration(input, options);
  return result.ok ? result.milliseconds : undefined;
}

export function isHumanDuration(input: string, options?: HumanDurationOptions): boolean {
  return parseHumanDuration(input, options).ok;
}

function fail(input: string, tokens: DurationToken[], issues: DurationIssue[]): HumanDurationResult {
  return { ok: false, input, milliseconds: undefined, tokens, issues };
}

function issue(code: DurationIssueCode, message: string, start: number, end: number, text: string): DurationIssue {
  return { code, message, start, end, text };
}

function lex(input: string): Lexeme[] {
  const matches = input.matchAll(/[+-]|\d+(?:\.\d+)?|[A-Za-z]+(?:-[A-Za-z]+)?/g);
  return Array.from(matches, (match) => {
    const text = match[0];
    const start = match.index;
    return {
      text,
      normalized: text.toLowerCase(),
      start,
      end: start + text.length
    };
  });
}

function isJoiner(value: string): boolean {
  return value === "and";
}

function isOperator(value: string): boolean {
  return value === "+" || value === "-";
}

function readNumber(
  lexemes: Lexeme[],
  startIndex: number
):
  | {
      value: number;
      start: number;
      next: number;
      text: string;
    }
  | undefined {
  const first = lexemes[startIndex];
  if (!first) {
    return undefined;
  }

  const numeric = Number(first.normalized);
  if (Number.isFinite(numeric)) {
    return { value: numeric, start: first.start, next: startIndex + 1, text: first.text };
  }

  const hyphenated = readHyphenatedNumber(first.normalized);
  if (hyphenated !== undefined) {
    return { value: hyphenated, start: first.start, next: startIndex + 1, text: first.text };
  }

  const small = SMALL_NUMBERS[first.normalized];
  if (small !== undefined) {
    return { value: small, start: first.start, next: startIndex + 1, text: first.text };
  }

  const tens = TENS[first.normalized];
  if (tens !== undefined) {
    const second = lexemes[startIndex + 1];
    const smallSecond = second ? SMALL_NUMBERS[second.normalized] : undefined;
    if (smallSecond !== undefined && smallSecond > 0 && smallSecond < 10) {
      return {
        value: tens + smallSecond,
        start: first.start,
        next: startIndex + 2,
        text: `${first.text} ${second!.text}`
      };
    }

    return { value: tens, start: first.start, next: startIndex + 1, text: first.text };
  }

  return undefined;
}

function readHyphenatedNumber(value: string): number | undefined {
  const [left, right] = value.split("-");
  if (!left || !right) {
    return undefined;
  }

  const tens = TENS[left];
  const small = SMALL_NUMBERS[right];
  if (tens === undefined || small === undefined || small < 1 || small > 9) {
    return undefined;
  }

  return tens + small;
}
