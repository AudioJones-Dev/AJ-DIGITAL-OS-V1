# Client Memory

## Purpose

Stores tenant-scoped client profiles, constraints, preferences, and operating context.

## What Belongs Here

- Client profile summaries
- Approved business context
- Engagement constraints
- Tenant-scoped preferences
- Public or approved facts needed for delivery

## What Does Not Belong Here

- Raw private communications
- Payment details
- Secrets, tokens, credentials, or account recovery data
- Unapproved sensitive facts

## Write Access

Human operators approve client memory. Agents may draft updates into an approval queue or working note when permitted.

## Agent Read Access

Agents may read client memory only through tenant-isolated Memory Router requests.

## Promotion Path

Approved client facts become canonical `clients` and `memory_records` rows when the Postgres memory layer is implemented.
