# Security Specification: AlquilaYa Data Rules & Invariants

## 1. Data Invariants
1. **Ownership & Tenant Isolation**: Every document in `/objects`, `/rentals`, `/receipts`, `/allocations`, `/settings`, and `/audit_logs` must have an `ownerId` strictly matching `request.auth.uid`. Cross-user data reading, listing, and writing is denied.
2. **Immutability of Key Identities**: `id` and `ownerId` cannot be changed after creation (`incoming().ownerId == existing().ownerId`).
3. **Rental Pricing Integrity**: Daily rentals store a snapshot `dailyRateSnapshot` taken from the object at the time of scheduling. Historical records remain unchanged if the object's base rate is modified.
4. **Non-negative Monetary Values**: All rates, totals, and allocations must be >= 0.
5. **Payment Application Integrity**: `paidAmount` on a rental day cannot exceed `dailyRateSnapshot` and cannot be negative.
6. **Strict Status Transitions**: Rentals can only be `pending_confirmation`, `confirmed_unpaid`, or `confirmed_paid`.
7. **No Unbounded Writes**: Strings have explicit `maxLength` validation to prevent storage exhaustion.
8. **Audit Trail Append-Only**: Audit logs cannot be updated or deleted by clients once created.

## 2. The "Dirty Dozen" Threat Payloads (Must Return PERMISSION_DENIED)
1. **Payload 1 (Identity Spoofing in Object Creation)**: User A creates an object with `ownerId: "user_b"`.
2. **Payload 2 (Cross-User List Query)**: User A attempts `getDocs` or queries without filtering by `ownerId == auth.uid`.
3. **Payload 3 (Negative Daily Rate Injection)**: Attacker attempts to create an object with `dailyRate: -50000`.
4. **Payload 4 (Rental Day Rate Tampering via Update)**: User attempts to modify `dailyRateSnapshot` on an existing rental to reduce debt.
5. **Payload 5 (Overpayment Poisoning)**: Malicious payload setting `paidAmount: 99999999` on a 31,000 COP daily rental.
6. **Payload 6 (Invalid Status Value Injection)**: Sending `status: "free_of_charge"` to a rental.
7. **Payload 7 (Audit Log Destruction)**: Attempting `deleteDoc` on `/audit_logs/{logId}`.
8. **Payload 8 (Resource Exhaustion DOS)**: Payload with a 50KB name string or arbitrary shadow keys (`evilKey: "malware"`).
9. **Payload 9 (Cross-User Payment Receipt Modification)**: User B attempts to edit or delete User A's `/receipts/{receiptId}`.
10. **Payload 10 (Orphan Allocation Hijack)**: Creating a `PaymentAllocation` where `ownerId` does not match the active session.
11. **Payload 11 (Path Variable Poisoning)**: Requesting document ID with illegal directory traversal or giant junk characters.
12. **Payload 12 (Unauthenticated Public Read)**: Requesting objects or receipts without an active Firebase Auth token.
