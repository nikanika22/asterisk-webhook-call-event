# Proposal: document-src-event-flow

## Summary
Add developer-facing Markdown documents inside `src/` that explain:
- how the event-driven call flow works
- what business features the application provides
- how the key files in `src` connect to each other

## Why
The project mixes HTTP APIs, Socket.IO handlers, Asterisk AMI events, webhook dispatch, and shared in-memory state. The current code is workable, but the execution path is not obvious for someone new to the codebase.

## Scope
- Document runtime entrypoints related to `src`
- Explain major event sources and event consumers
- Explain how shared state is populated and consumed
- Map file-to-file dependencies for the main call flow
- Document the application's main user-facing and operator-facing functions
- Describe the execution flow of each major function

## Out of Scope
- Refactoring runtime behavior
- Changing API contracts
- Updating business logic
