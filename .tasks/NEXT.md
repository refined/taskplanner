# Next

## TASK-024: Performance measurement and scalability limits
**Priority:** P2 | **Tags:** core, testing
**Updated:** 2026-04-01 19:36

Measure performance of the current parser, serializer, and webview rendering with large task sets. Identify limitations and bottlenecks. Propose architectural updates (pagination, lazy loading, indexing) that would allow the system to handle significantly more tasks.
The first ideas for performance:
Use Async instead of Sync on file loads. Do not load Done and Rejected, before clicing on them. The number of tasks there might be stored in meta data.

---
