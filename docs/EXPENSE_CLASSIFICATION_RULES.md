# Expense Classification Rules

This note defines the generic classification logic for company expense records.

## Main classes

- Staff costs
- Vehicle costs
- Operating costs
- Finance costs
- Product and supplier purchases
- Review needed

## Operating costs

Use this class for rent, utilities, communication, cargo, cleaning, stationery, advertising, office and store needs.

## Vehicle costs

Use this class for fuel, service, repair, insurance, tax, penalty, shipping and major vehicle related purchases.

## Finance costs

Use this class for bank fees, card fees, commissions, finance charges, tax payments and refund or deduction records.

## Product and supplier purchases

Use this class for commercial purchases, supplier payments and current account closing payments.

## Review needed

Use this class only when the description is unclear or the amount/source needs confirmation.

## Workflow

1. Read the document or statement.
2. Classify the expense.
3. Detect the payment source.
4. Mark paid or waiting.
5. Match with bank, card or cash movement.
6. Check duplicates.
7. Send unresolved records to approval.

## Decision

The uploaded expense file is a learning reference for future classification. Do not ask the user about every row. Ask only for unclear, risky or wrongly classified records.
