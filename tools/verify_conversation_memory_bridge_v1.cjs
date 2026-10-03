const fs = require('node:fs');

function assert(value, message) {
  if (!value) throw new Error('FAIL ' + message);
  process.stdout.write('OK   ' + message + '\n');
}

const writer = fs.readFileSync('functions/api/conversation-memory-writer.js', 'utf8');
const bootstrap = fs.readFileSync('functions/api/session-bootstrap.js', 'utf8');

assert(writer.includes("containsSecret(body)"), 'writer rejects secret-like payloads');
assert(writer.includes("memory_sources"), 'writer records canonical source provenance');
assert(writer.includes("memory_fact_sources"), 'writer links facts to sources');
assert(writer.includes("status='superseded'"), 'writer preserves supersede history');
assert(writer.includes("memory_events"), 'writer appends memory event ledger evidence');
assert(writer.includes("financial_writes: 0"), 'writer explicitly reports zero financial writes');
assert(writer.includes("supersedesKey"), 'decision supersede requires explicit prior key');
assert(writer.includes("working_state_snapshots"), 'writer can persist compact working state');

assert(bootstrap.includes("aperion-session-bootstrap-v3"), 'bootstrap protocol upgraded to v3');
assert(bootstrap.includes("conversation_memory_writer: true"), 'bootstrap advertises memory writer support');
assert(bootstrap.includes("project_memory_facts"), 'bootstrap reads active project facts');
assert(bootstrap.includes("project_memory_decisions"), 'bootstrap reads active decisions');
assert(bootstrap.includes("recent_memory_events"), 'bootstrap reads recent memory events');
assert(bootstrap.includes("raw_chat_loaded: false"), 'bootstrap avoids loading raw chat by default');

process.stdout.write('PASS conversation memory writer + bootstrap reader static verification\n');
