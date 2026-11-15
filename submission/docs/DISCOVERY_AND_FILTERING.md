# MicroReach AI — Influencer Discovery & Filtering Logic

This document details the methodologies, algorithms, and strict mathematical thresholds governing creator discovery and 3-state qualification in MicroReach AI.

---

## 1. Discovery Methodology

MicroReach AI supports multi-platform creator discovery across YouTube and Instagram, focusing on authentic micro-influencers rather than broad directory scraping.

### 1.1 YouTube Discovery Pipeline
1. **Search Queries**: Issues targeted queries against `youtube.search.list` using combinations of niche keywords (e.g. "Indian skincare routines", "honest sunscreen reviews", "acne journey").
2. **Channel Resolution**: Ingests channel IDs and issues batch requests to `youtube.channels.list` retrieving full snippet descriptions, custom handles, subscriber counts, and country metadata.
3. **Engagement Sampling**: For channels falling within the target follower range (5,000 to 100,000), recent video uploads are sampled via `playlistItems.list` and `videos.list` to calculate real-world engagement metrics.

### 1.2 Instagram Discovery Pipeline
1. **Actor Ingestion**: Dispatches bounded scraping jobs to Apify's Instagram Actor using relevant campaign hashtags.
2. **Metadata Extraction**: Collects profile handle, follower count, biography, external link, and engagement stats from the most recent 12 posts.
3. **Resilient Polling**: Uses bounded 60-second polling to ensure long-running actor runs do not hang the backend server.

---

## 2. Strict 3-State Qualification System

Rather than binary acceptance or subjective score thresholds, MicroReach AI enforces a strict 3-state qualification model:

```text
               ┌───────────────────────────────┐
               │    Discovered Creator Data    │
               └──────────────┬────────────────┘
                              ▼
        ┌─────────────────────────────────────────────┐
        │  Check Criteria: Niche, Subs, Eng, Geo      │
        └─────────────────────┬───────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   [ PASS ]           [ REVIEW_REQUIRED ]       [ FAIL ]
Meets all 4 bounds:   Missing country, hidden   Violates one or more
• 5K-100K subs        stats, or borderline     hard bounds:
• Eng >= 2.0%         metrics. Never guessed    • Subs < 5K or > 100K
• Niche matched       as PASS automatically.    • Eng < 2.0%
• Country verified                              • Niche mismatch
```

### 2.1 Follower Boundaries
- **Minimum Followers**: 5,000
- **Maximum Followers**: 100,000
- **Rationale**: Micro-influencers in this window offer higher engagement rates, genuine community trust, and cost-effective collaboration ROI.

### 2.2 Engagement Formulas & Edge-Case Handling
- **YouTube Engagement Formula**:
  $$\text{Engagement Rate} = \left( \frac{\text{Average Likes} + \text{Average Comments}}{\text{Subscriber Count}} \right) \times 100$$
- **Instagram Engagement Formula**:
  $$\text{Engagement Rate} = \left( \frac{\text{Average Likes} + \text{Average Comments}}{\text{Follower Count}} \right) \times 100$$
- **Handling Hidden Metrics**: If a creator disables public like counts or video comments, the formula marks the metric as `Unavailable` and routes the creator to `REVIEW_REQUIRED` rather than falsely calculating `0%` engagement.

### 2.3 Geography Verification
- **Verified Evidence Only**: A channel's country is only verified if explicit platform metadata exists (e.g. YouTube `snippet.country = 'IN'`).
- **No Keyword Guessing**: A channel will never be marked as Indian purely because the bio mentions words like "Delhi", "Desi", or "Namaste". Unverified geography status defaults to `Unknown` and requires manual review.
