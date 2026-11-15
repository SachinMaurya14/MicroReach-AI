# MicroReach AI — Practical 5–7 Minute Screen Recording Script

This script outlines a clear, step-by-step walkthrough for recording the evaluator demo video for MicroReach AI.

---

## Preparation Before Recording

1. **Local Server**: Ensure the dev server is running on `http://localhost:3000`.
2. **Browser Window**: Open Google Chrome or Firefox maximized at 1920x1080 resolution.
3. **Outreach Mode**: Confirm `.env.local` has `OUTREACH_MODE=simulation` so all outreach actions are safely simulated and logged.
4. **Recording Tool**: Use OBS Studio, Loom, or macOS Screen Recorder capturing system audio and microphone clearly.

---

## Demonstration Sequence (Total Duration: 5–7 Minutes)

### Stage 1: Landing Page & Workspace Dashboard (0:00 – 0:45)
- **Action**: Navigate to `http://localhost:3000/`.
- **Narration**: "Welcome to MicroReach AI, an enterprise-grade multi-platform influencer discovery and personalized outreach platform. The landing page highlights our key value propositions: multi-channel discovery, explainable qualification, and anti-hallucination AI pitch generation."
- **Action**: Click **Launch App** or navigate to `/dashboard`.
- **Narration**: "On the main dashboard, we see the real-time campaign overview, key metrics, discovered creators count, and system health status."

### Stage 2: Campaign Selection & Filtering Settings (0:45 – 1:30)
- **Action**: Navigate to the Campaigns section or observe the active campaign "GlowCare — India Skincare Campaign".
- **Narration**: "MicroReach AI uses strict qualification rules rather than vanity matching. In this active campaign, we target creators in Beauty & Skincare with 5,000 to 100,000 followers, a minimum 2.0% engagement rate, and verified Indian audience or geography."
- **Action**: Show the campaign parameters and qualification thresholds.

### Stage 3: Multi-Platform Influencer Discovery (1:30 – 2:30)
- **Action**: Navigate to `/dashboard/influencers`.
- **Narration**: "Here in the Influencer Explorer, we have 119 genuine discovered creator profiles across YouTube and Instagram."
- **Action**: Filter by platform (YouTube vs Instagram) to showcase multi-platform capability.
- **Narration**: "YouTube profiles are discovered using the YouTube Data API v3, while Instagram profiles are indexed via Apify Actors. Notice that creator handles, video titles, and engagement rates are pulled directly from live platform data, never fabricated."

### Stage 4: Strict 3-State Qualification & Review (2:30 – 3:30)
- **Action**: Toggle the Qualification Filter tabs (`All`, `Qualified`, `Needs Review`, `Rejected`).
- **Narration**: "Our qualification engine employs a strict 3-state system:
  1. **PASS (Qualified)**: Creators meeting all follower, engagement, niche, and country criteria.
  2. **REVIEW_REQUIRED (Needs Review)**: Creators with borderline metrics, hidden video statistics, or unverified countries that require human discernment.
  3. **FAIL (Rejected)**: Creators strictly outside bounds (e.g. over 100K followers or under 2% engagement). We never loosen campaign criteria to artificially boost numbers."
- **Action**: Click on a creator card to open the slide-out detail drawer. Show the **Brand Fit Breakdown** and exact rejection/review reasons.

### Stage 5: Contact Channels & Email Enrichment (3:30 – 4:15)
- **Action**: Scroll to the Contact Channels section in the creator detail drawer.
- **Narration**: "For each creator, MicroReach AI indexes available contact channels: Business Email, Instagram profile, LinkedIn, and YouTube. Profiles are only associated when an explicit public link exists—never by guessing names. Contact emails are enriched via public bio extraction and verified against an SSRF security guard to protect internal networks."

### Stage 6: Gemini AI Multi-Channel Personalization (4:15 – 5:15)
- **Action**: Navigate to the AI Pitch Studio or click **Generate Pitch** for a qualified creator.
- **Narration**: "Our personalization engine is powered by the Google Gemini Developer API using the `gemini-3.6-flash` model. We strictly enforce channel-specific length and style constraints:
  - **Email**: 60 to 90 words with brand introduction and value proposal.
  - **Instagram DM**: 15 to 30 words, friendly and conversational.
  - **LinkedIn Message**: 20 to 75 words, focused on professional synergy.
  Notice how the generated pitch incorporates actual creator signals—like recent video topics and specific skin concerns—without hallucinating fake collaborations."

### Stage 7: Message Approval, Simulation Sending & Audit Logs (5:15 – 6:15)
- **Action**: Click **Approve Message** and then click **Send Outreach (Simulation)**.
- **Narration**: "Human-in-the-loop review ensures that every pitch is approved before transmission. In simulation mode (`OUTREACH_MODE=simulation`), outreach attempts are safely executed, idempotency keys are recorded, and full audit logs are persisted to Supabase without sending live emails."
- **Action**: Navigate to the Outreach Logs / Activity tab to display the recorded simulation log and timestamp.

### Stage 8: Reports & CSV Export (6:15 – 7:00)
- **Action**: Click **Export CSV** on the Influencers page and open `/submission/datasets/influencer_dataset.csv`.
- **Narration**: "Finally, all discovered creator records and outreach tracking data can be exported cleanly as sanitised CSV files. Both `influencer_dataset.csv` and `outreach_tracker.csv` contain genuine, validated records ready for stakeholder reporting."
- **Conclusion**: "MicroReach AI demonstrates end-to-end functionality, high data integrity, robust error handling, and production-ready engineering."
