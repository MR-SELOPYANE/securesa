# POPIA compliance and security hardening

## Goal
Replace the browser-only, honour-system setup with real officer accounts, protected shared records, a tamper-evident audit trail and POPIA data-protection features.

## 1. Real officer accounts (security)
- Turn on Lovable Cloud. Officers sign in with email and password (no more "type any badge").
- Officer profile: full name, badge ID, station.
- Roles kept in a separate table: **officer**, **supervisor**, **admin**. Admins approve new officers before they can use the system.
- Auto sign-out after 15 minutes of inactivity; leaked-password check turned on.

## 2. Protected shared records
- Scans, incidents and inspections move from the browser into the central database.
- Access rules: officers see their own station's records; supervisors see all; nobody can edit or delete a finished scan.
- Officer name and badge are stamped by the server, so nobody can pretend to be another officer.

## 3. Tamper-evident audit trail
- Every action (sign-in, scan, denial, incident stage change, export, record view) is written to an append-only audit log.
- Each entry is chained to the previous one with a fingerprint (hash), so any edited or deleted entry is detectable.
- New "Audit" tab for supervisors with a "Verify integrity" button and CSV export.

## 4. POPIA data protection
- **Data minimisation:** only a masked ID number (e.g. 8001******084) and a match score are stored; no face images or fingerprints are kept.
- **Purpose and notice:** a POPIA processing notice shown at each scan, with the lawful purpose (Immigration Act enforcement) recorded on every record.
- **Retention:** records older than a set period (default 90 days, adjustable by admin) are flagged and can be purged; purges are logged.
- **Data subject requests:** supervisors can look up, export or correct a person's records, with a reason that's logged.
- **Exports gated:** only supervisors can export, every export is logged.
- **Information Officer page:** contact details and a breach-report form.

## Technical details
- Tables: profiles, user_roles (app_role enum + has_role security definer), scans, incidents, incident_events, inspections, audit_log, settings. RLS on all; GRANTs per table.
- audit_log: insert-only via a SECURITY DEFINER function computing `sha256(prev_hash || row_json)`; UPDATE/DELETE revoked; triggers on scans/incidents write audit rows automatically.
- Officer/station fields set from `auth.uid()` in triggers, not from client input.
- Replace localStorage modules in src/lib/{history,operator}.ts with Cloud queries; keep the existing UI and the sim data generator.
- Zod validation on all forms.
- Run a security scan at the end.

## Not in scope
Real biometric hardware, legal sign-off (a lawyer still needs to review the POPIA notice and retention period).
