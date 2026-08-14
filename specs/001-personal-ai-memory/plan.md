# Implementation plan

## Existing foundation reused

- D1 `memory_items`, `session_checkpoints`, `canonical_events`, `source_health`
- `objectives`, `work_items`, `commitments`, `approval_queue`, `action_log`
- `connector_registry` and `connector_capabilities`

## Architecture

1. Add normalized conversation turns, working-state snapshots, current-state facts,
   generic memory relations, recall runs, and context manifests.
2. Keep D1 as the operational store. Keep large documents in Drive and store only
   references, metadata, hashes, and derived chunks in the control plane.
3. Start recall with deterministic filters, full-text/lexical search, recency, and
   relationship expansion. Add embeddings only after a labeled recall benchmark.
4. Represent graph relationships in relational tables first. Adopt GraphRAG only if
   multi-hop benchmark quality materially beats the simpler pipeline.
5. Use a ReAct-style runtime for tool selection: reason over capability metadata,
   act through one connector, observe evidence, then update state.
6. Introduce A2A only after independently deployed agents need cross-agent task and
   status exchange; connector calls remain tool/data interactions.

## Rollout

- Phase 1: schema, invariants, verifier, and labeled reference-resolution fixtures.
- Phase 2: memory extraction candidates with human review for durable rules/facts.
- Phase 3: hybrid recall and context manifests in the assistant response path.
- Phase 4: connector routing, approval lifecycle, and read-back enforcement.
- Phase 5: measured GraphRAG/A2A experiments behind feature flags if justified.

## Rollback

New tables are additive. Disable the memory-context feature flag and return to
session checkpoints; no existing finance or connector table is removed or rewritten.

