# AperiON Google Bridge

This is the minimum-permission Google Apps Script bridge.

It checks only:

- the AperiON Drive root folder;
- the AperiON Control Center spreadsheet;
- the Cloudflare D1 health endpoint.

It does not read Gmail, send messages, or create financial records.

Required Script Properties:

- `APERION_GOOGLE_BRIDGE_KEY`
- `APERION_DRIVE_ROOT_ID=1fhXPpZVAefKk0JjYhMRB-dbhsXUgANd4`
- `APERION_CONTROL_SHEET_ID=155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc`

Activation requires explicit Google authorization because it grants read-only access to Drive and Sheets and creates a daily trigger.
