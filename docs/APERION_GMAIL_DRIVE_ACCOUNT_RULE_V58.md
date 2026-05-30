# AperiON v58 Gmail Drive Account Rule

Company mailbox:

```text
alaylimedikal@gmail.com
```

Archive Drive account:

```text
ercanalayli@gmail.com
```

## Rule

Google Apps Script reads Gmail from the Google account where the script is installed.

For AperiON the default setup is:

```text
Read Gmail from alaylimedikal@gmail.com
Save files into a Drive folder owned by ercanalayli@gmail.com
```

The Drive folder must be shared with edit permission to the mailbox account.

## Flow

```text
Company Gmail
→ Apps Script
→ Shared Drive folder
→ AperiON document metadata
→ AperiON Document Center
```

## Required setup

1. Create an `AperiON Gelen Belgeler` folder in the Drive account.
2. Share that folder with the company mailbox account.
3. Copy the folder id.
4. Add the folder id to the Apps Script project properties.
5. Run `aperionProcessGmailToDriveV58` manually once.
6. Then install the 15-minute trigger.

## Gmail query

```text
to:alaylimedikal@gmail.com has:attachment newer_than:30d -label:APERION_PROCESSED
```

## Safety

Files are archived first. AperiON creates metadata first. Final finance records require review and approval.
