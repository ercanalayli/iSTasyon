const fs = require('fs');

const required = {
  '.specify/memory/constitution.md': [
    'Evidence before confidence', 'Selective, temporal memory',
    'Human authority for consequential actions', 'Idempotent, auditable execution'
  ],
  'specs/001-personal-ai-memory/spec.md': [
    'Working memory', 'Long-term memory', 'Current state', 'FR-014',
    'Acceptance criteria', 'Non-goals', 'Success measures'
  ],
  'specs/001-personal-ai-memory/plan.md': [
    'GraphRAG', 'ReAct', 'A2A', 'Rollback'
  ],
  'specs/001-personal-ai-memory/tasks.md': ['T005', 'T013'],
  'migrations/0007_personal_ai_memory_context.sql': [
    'conversation_threads', 'conversation_turns', 'working_state_snapshots',
    'current_state_facts', 'memory_relations', 'recall_runs', 'context_manifests'
  ]
};

let failed = false;
for (const [file, needles] of Object.entries(required)) {
  if (!fs.existsSync(file)) {
    console.error(`MISSING ${file}`);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) {
      console.error(`MISSING ${needle} in ${file}`);
      failed = true;
    }
  }
}

const migration = fs.readFileSync('migrations/0007_personal_ai_memory_context.sql', 'utf8');
if (!migration.includes('UNIQUE(thread_id, sequence_no)')) {
  console.error('MISSING conversation idempotency constraint');
  failed = true;
}
if (!migration.includes('supersedes_fact_id')) {
  console.error('MISSING temporal supersession');
  failed = true;
}

if (failed) process.exit(1);
console.log('AperiON Spec Kit + personal AI memory foundation: VERIFIED');

