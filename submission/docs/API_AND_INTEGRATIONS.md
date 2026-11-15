# MicroReach AI — REST API Contracts & Integrations Reference

This document details the HTTP route contracts, query parameters, request payloads, and status codes implemented in MicroReach AI.

---

## 1. System Health & Integration Status

### `GET /api/health`
- **Description**: Returns non-sensitive runtime diagnostics and integration availability.
- **Access**: Public.
- **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "demoAccessConfigured": true,
    "supabaseConfigured": true,
    "youtubeConfigured": true,
    "apifyConfigured": true,
    "geminiConfigured": true,
    "geminiModel": "gemini-3.6-flash",
    "outreachMode": "simulation",
    "gmailOAuthConfigured": true,
    "encryptionKeyConfigured": true,
    "supabaseReachable": true,
    "databaseSchemaCompatible": true
  }
  ```

---

## 2. Influencer Management Endpoints

### `GET /api/influencers`
- **Description**: Queries stored influencer profiles with optional filtering and sorting.
- **Query Parameters**:
  - `limit` (number, default: 150, max: 300)
  - `campaignId` (UUID)
  - `platform` (`youtube` | `instagram`)
  - `qualificationStatus` (`qualified` | `needs_review` | `rejected`)
  - `minFollowers`, `maxFollowers` (integers)
  - `minEngagement` (float)
  - `sortBy` (`relevance` | `followers-desc` | `followers-asc` | `engagement-desc`)
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "influencer": { "id": "...", "name": "...", "platform": "youtube", ... },
        "campaignInfluencer": { "qualification_status": "qualified", ... },
        "contactChannels": [ ... ],
        "channelAvailability": [ ... ],
        "recommendedChannel": "email"
      }
    ],
    "totalCount": 119
  }
  ```

### `GET /api/influencers/export.csv`
- **Description**: Exports the current filtered influencer dataset as a sanitized CSV file.
- **Response `200 OK`**: `Content-Type: text/csv; charset=utf-8`

### `POST /api/influencers/:id/enrich-email`
- **Description**: Triggers automated email enrichment with SSRF protection for a creator.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "email": "creator@example.com",
    "emailStatus": "unverified",
    "provenance": "youtube_channel_description"
  }
  ```

---

## 3. Multi-Platform Discovery Endpoints

### `POST /api/discovery/youtube`
- **Description**: Executes YouTube discovery against live YouTube Data API v3.
- **Payload**:
  ```json
  {
    "campaignId": "uuid",
    "niche": "Beauty & Skincare",
    "keywords": ["skincare routines", "honest reviews"],
    "maxResults": 25
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "discoveredCount": 25,
    "qualifiedCount": 1,
    "rejectedCount": 23,
    "needsReviewCount": 1
  }
  ```

### `POST /api/discovery/instagram`
- **Description**: Executes bounded resumable Instagram discovery via Apify Actor.
- **Payload**:
  ```json
  {
    "campaignId": "uuid",
    "hashtags": ["indianskincare", "cleanbeauty"],
    "maxResults": 15
  }
  ```
- **Response `200 OK`**: Detailed batch ingestion result.

---

## 4. AI Pitch Studio & Outreach Endpoints

### `POST /api/messages/generate`
- **Description**: Generates an anti-hallucination, channel-specific pitch using Google Gemini.
- **Payload**:
  ```json
  {
    "campaignInfluencerId": "uuid",
    "channel": "email" | "instagram_dm" | "linkedin_message" | "youtube_contact",
    "collaborationType": "Sponsorship",
    "regenerate": false
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "message": {
      "id": "uuid",
      "channel": "email",
      "message_body": "...",
      "word_count": 78,
      "status": "draft",
      "ai_model": "gemini-3.6-flash"
    }
  }
  ```

### `POST /api/messages/:id/approve`
- **Description**: Marks a draft pitch as approved for transmission.
- **Response `200 OK`**: Updated message object with `status: "approved"`.

### `POST /api/outreach/send`
- **Description**: Executes simulated sending (or live send if explicitly configured and approved).
- **Payload**:
  ```json
  {
    "messageId": "uuid",
    "confirmSend": true
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "outreachMode": "simulation",
    "idempotencyKey": "hash...",
    "log": { "stage": "simulated_send", "status": "delivered_simulation" }
  }
  ```
