# Design: document-src-event-flow

## Approach
Create Markdown documents in `src/` so the explanation lives close to the implementation.

The documentation set should cover two complementary views:
- technical event flow
- application functions and their runtime flow

The content should be structured for fast codebase onboarding:

1. High-level startup flow
2. Main folders and responsibilities
3. Shared state usage
4. Socket event handlers
5. AMI event handlers
6. Webhook dispatch path
7. Request/event flow examples
8. File relationship map
9. Business functions and their per-feature flow

## Content Principles
- Use concrete file paths
- Explain who calls whom
- Separate inbound request flow from asynchronous event flow
- Separate "what the app does" from "how the code is wired"
- Focus on the real runtime path, not generic architecture wording

## Risks
- Documentation can drift if runtime logic changes later
- Some socket event names are legacy and overlap with HTTP endpoint names, so wording must clearly distinguish client-emitted events from server-emitted broadcasts
