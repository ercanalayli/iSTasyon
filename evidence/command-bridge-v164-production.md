# ApeirON command bridge v164 production deployment

- Worker: `aperion-command-bridge`
- Version: `cf145401-69a1-4592-a02c-9cf6d4fc3cec`
- D1: `aperion-control-plane` (`8f32b3b1-5451-4c9e-9bd2-5d3626e4a561`)
- Production idempotency namespace: `production:user-command`
- Test namespaces: `test:stress`, `test:acceptance`, `test:fixture`
- Key identity: namespace + event ID + normalized command.
- Same event retry maps to the same task; a later identical command with a new event ID maps to a new task.
- User-visible response contains only `message` and `reply_options`; exact command/hash/conversation binding is carried in `_internal_approval_context` and must never be rendered.
- Command ID, payload binding, internal account IDs, duplicate state and proof remain in D1/audit and are not included in the normal user response.
- Live production dry-run command ID (audit only): `861ef9f2-06f9-4895-8066-66d320179a77`.
- No approval endpoint was invoked during acceptance; financial and BizimHesap writes remained zero.
