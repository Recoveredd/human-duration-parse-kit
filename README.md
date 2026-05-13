# human-duration-parse-kit

[![License: MPL-2.0](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![CI](https://github.com/Recoveredd/human-duration-parse-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/Recoveredd/human-duration-parse-kit/actions/workflows/ci.yml)

Parse short human duration strings into milliseconds with structured tokens and diagnostics.

## Package quality

- TypeScript types are generated from the source.
- ESM-only package marked as side-effect free for bundlers.
- CI runs `npm ci`, `typecheck`, `build`, and `test`.
- Tested on Node.js 20 and 22 with GitHub Actions.

## Demo

[Try the interactive demo](https://packages.wasta-wocket.fr/human-duration-parse-kit/)

## Install

```bash
npm install human-duration-parse-kit
```

## Usage

```ts
import { parseHumanDuration } from "human-duration-parse-kit";

const result = parseHumanDuration("2 weeks, 3 days and 45 minutes");

if (result.ok) {
  result.milliseconds;
  result.tokens;
}
```

## Why

Small apps often need to accept values like `15 min`, `two hours`, or `1 week - 2 days`.
A plain number is hard to explain in forms, CLIs, and import tools. This package returns
the parsed value, the matched tokens, and stable issue codes for rejected input.

## API

### `parseHumanDuration(input, options?)`

Returns a discriminated result:

```ts
type HumanDurationResult =
  | { ok: true; input: string; milliseconds: number; tokens: DurationToken[]; issues: [] }
  | { ok: false; input: string; milliseconds: undefined; tokens: DurationToken[]; issues: DurationIssue[] };
```

### `humanDurationMilliseconds(input, options?)`

Returns the parsed number of milliseconds, or `undefined` when validation fails.

### `isHumanDuration(input, options?)`

Returns `true` when the input is accepted.

## Options

- `allowNegative`: allow negative terms and subtraction operators. Default: `true`.
- `allowCalendarUnits`: allow `month` and `year` approximations. Default: `false`.
- `maxInputLength`: reject overly long input before scanning. Default: `200`.
- `emptyIsZero`: treat blank input as zero. Default: `false`.

Calendar units are intentionally opt-in because months and years are approximate.
When enabled, a month is 30 days and a year is 365 days.

## Supported units

- millisecond: `ms`, `msec`, `millisecond`, `milliseconds`
- second: `s`, `sec`, `secs`, `second`, `seconds`
- minute: `m`, `min`, `mins`, `minute`, `minutes`
- hour: `h`, `hr`, `hrs`, `hour`, `hours`
- day: `d`, `day`, `days`
- week: `w`, `wk`, `wks`, `week`, `weeks`
- month: `mo`, `month`, `months` when `allowCalendarUnits` is enabled
- year: `y`, `yr`, `yrs`, `year`, `years` when `allowCalendarUnits` is enabled

Whole number words from zero to ninety-nine are supported, including hyphenated forms
such as `twenty-five minutes`.

## Notes

This is a parser for compact duration input, not natural-language date extraction.
It does not read the current date, schedule timers, or handle locale-specific grammar.

## Browser compatibility

The core uses only strings, numbers, arrays, objects, and regular expressions. It has no runtime dependencies and no required Node APIs.

## CLI

No CLI is included. The natural use is as an embeddable parser for forms,
configuration screens, import tools, and small command-line apps that already
have their own input/output flow.

## License

MPL-2.0
