# MicroReach AI — Sending Mechanisms, Safety Gates & Tracking

This document details the multi-channel dispatch architecture, simulation safeguards, idempotency controls, and audit tracking in MicroReach AI.

---

## 1. Operating Modes & The Simulation Safety Gate

MicroReach AI strictly adheres to the principle of responsible outreach through two distinct operational modes:

### 1.1 Default Simulation Mode (`OUTREACH_MODE=simulation`)
- **Safety Guarantee**: In this mode, no real external emails, direct messages, or HTTP mutations are sent to creators or email servers.
- **Workflow Simulation**:
  1. The user clicks **Send Outreach**.
  2. The server verifies campaign criteria, creator approval status, and contact availability.
  3. A deterministic idempotency key is computed.
  4. The message status updates to `sent` in the database with a simulated delivery timestamp.
  5. An entry is recorded in `outreach_logs` and `demo_audit_logs`.
  6. The UI reflects the transition instantly without external side effects.

### 1.2 Live Gmail Mode (`OUTREACH_MODE=live`)
- **Prerequisites for Live Transmission**:
  1. `OUTREACH_MODE=live` configured server-side.
  2. Google OAuth 2.0 connected with `https://www.googleapis.com/auth/gmail.send`.
  3. Creator must be `qualified`.
  4. Contact email must be verified.
  5. Message status must be `approved`.
  6. Creator must not be on the suppression list.
  7. Atomic daily quota cap enforced (max 5 live emails/campaign/day).

---

## 2. Multi-Channel Dispatch Protocols

Because different social platforms enforce different third-party API restrictions, MicroReach AI implements channel-specific dispatch strategies:

| Channel | Sending Method | Workflow & UI Experience |
|---|---|---|
| **Business Email** | Automated Simulation / Gmail API | Full automated lifecycle with idempotency and audit logs. |
| **Instagram DM** | Manual-Assisted Copy Link | Generates pre-formatted pitch; provides a **Copy Message & Open Profile** action opening the creator's Instagram profile in a new tab. |
| **LinkedIn Message** | Manual-Assisted Copy Link | Pre-formats concise pitch (20–75 words); provides direct link to the verified LinkedIn profile. Blocked if no explicit LinkedIn link exists. |
| **YouTube Contact** | Manual-Assisted Brief | Prepares creator brief with direct link to the channel's About tab or business inquiry contact. |

---

## 3. Idempotency & Duplicate Prevention

To eliminate accidental duplicate outreach to the same creator:
- **Deterministic Key**: An SHA-256 hash is generated from:
  $$\text{Idempotency Key} = \text{SHA256}(\text{Campaign ID} + \text{Creator ID} + \text{Channel} + \text{Recipient})$$
- **Database Unique Constraints**: `outreach_logs` enforces a partial unique constraint on active claims, rejecting re-send requests with HTTP `409 Conflict`.
- **Suppression Registry**: Global suppression lists (`outreach_suppressions`) automatically block outreach to opted-out contacts.

---

## 4. Comprehensive Audit Trail

All operations are permanently recorded in Supabase PostgreSQL:
- `outreach_logs`: Records message ID, channel, recipient contact, stage (`draft_created`, `approved`, `simulated_send`, `delivered`), and provider latency.
- `demo_audit_logs`: Records user actions, model generation durations, and personalization signals.
- **Reporting**: Full history is exportable on demand via `GET /api/influencers/export.csv` and downloadable as `outreach_tracker.csv`.
