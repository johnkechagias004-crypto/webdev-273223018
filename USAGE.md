
# Usage

One row per agent session.

## Exercise 1 - MCP Server

| Date | Tool | Input tokens | Output tokens | Credits (if no tokens) | List-price cost |
|---|---|---:|---:|---|---:|
| 2026-11-21 | Gemini CLI - Initial session | 27410 | 82 | N/A | Approx. $0.0057 |
| 2026-11-21 | Gemini CLI - Before modification | 50403 | 103 | N/A | Approx. $0.0081 |
| 2026-11-21 | Gemini CLI - After modification | 50481 | 102 | N/A | Approx. $0.0082 |

## Model

gemini-3.5-flash-lite

## Pricing reference

Google Gemini API official pricing:
https://ai.google.dev/gemini-api/docs/pricing

- Input: $0.30 per million tokens.
- Output, including thinking: $2.50 per million tokens.
- Cached input: $0.03 per million tokens.

## Notes

The initial session statistics were obtained from the Gemini CLI session summary.

The remaining figures were reconstructed from saved JSONL session records, counting identical token records once.

The estimated costs account for cached input and available thinking-token counts. They are approximate and do not represent verified billing charges.

Future sessions will be recorded using the /stats command before exiting Gemini CLI.
