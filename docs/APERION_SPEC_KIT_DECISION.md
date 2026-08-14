# AperiON Spec Kit and Personal AI architecture decision

## Decision

Adopt Spec-Driven Development as AperiON's development standard. Specifications
are the product-requirements source of truth, GitHub is the code source of truth,
and D1 plus evidence/source-health records are operational truth.

## Thesis

The largest risk is not lack of ideas; it is prompt-driven drift across a large,
connected, consequential system. Constitution, acceptance criteria, task ordering,
approval boundaries, and verification make parallel AI-assisted development safer.

## Strongest attack

Specifications can become stale documentation theater and slow down small changes.
GraphRAG and multi-agent terminology can also create expensive architecture before
recall quality and coordination needs are measured.

## What survives the attack

- Constitution and acceptance criteria are mandatory for material changes.
- Small reversible changes may use a short spec, but cannot skip safety invariants.
- ReAct-style tool routing is useful now because connectors already exist.
- Relational graph edges are useful now; a graph database/GraphRAG is deferred.
- A2A is deferred until independently deployed agents need a measured protocol.
- CLIP/BLIP-like multimodal capability is consumed through proven models; AperiON
  does not train these models.
- RLHF, MoE, FlashAttention, RoPE, KV cache, and chain-of-thought internals are model
  provider concerns, not AperiON product milestones.

## Alternatives rejected

1. Continue with prompts and ad-hoc task lists: fast initially, high drift and audit risk.
2. Build a full agent mesh and GraphRAG now: impressive surface, weak evidence of need.
3. Store every chat and send it to the model: costly, noisy, privacy-heavy, poor recall.

## Failure conditions

Revisit this decision if specs are not referenced by changes, acceptance criteria do
not detect regressions, or the process adds material delay without improving defect
rate, recall quality, or auditability.

## Reversible test

Use APERION-001 for the memory/context vertical slice. Measure reference resolution,
memory precision, secret rejection, context latency, and verified-action coverage
before expanding the process to all roadmap modules.

