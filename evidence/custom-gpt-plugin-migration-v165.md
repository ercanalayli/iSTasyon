# ApeirON interaction adapter migration

The Hermes/D1/Windows-worker execution plane remains unchanged. Channel-specific input is normalized by `finance-command-adapter.js` into a stable prepare/approval contract.

Supported adapter targets: Custom GPT Action, Plugin tool, connector, and remote MCP. Every approval carries command ID, immutable payload hash, and conversation identity. No channel is allowed to bypass the existing Hermes approval gate.

The stable mobile entry should target the ApeirON GPT identity, not an individual conversation URL. Existing conversations retain their configuration snapshot; a new conversation is required after a GPT schema/configuration update. The home-screen link therefore opens the GPT landing URL and allows ChatGPT to create/use the current configuration rather than pinning an old conversation.
