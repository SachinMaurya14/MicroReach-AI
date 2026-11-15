# MicroReach AI — Comprehensive Screenshot & Working Demo Capture Guide

This guide provides exact routes, interaction steps, and instructions for capturing the ten required application screens for assignment evaluation.

---

## 1. Working Demo Access for Evaluators

MicroReach AI is fully operational and can be accessed live by evaluators via:
- **Shared App URL**: `https://ais-pre-rxy3slkhavbjot74kr2vpd-857534031587.asia-southeast1.run.app`
- **Development App URL**: `https://ais-dev-rxy3slkhavbjot74kr2vpd-857534031587.asia-southeast1.run.app`
- **Local Dev Server**: `http://localhost:3000` (run `npm run dev`)

---

## 2. Existing Workspace Screenshots

The repository includes two verified system screenshots located under `public/assets/aistudio/`:
1. `Screenshot_2026-11-14_122029_db0de8f7.png`: AI Studio Cloud Secrets Management Console verifying server-side environment variables (`GEMINI_API_KEY`, `SUPABASE_SECRET_KEY`, `YOUTUBE_API_KEY`, `OUTREACH_MODE=simulation`, etc.).
2. `Screenshot_2026-11-14_175302_70f3541e.png`: Evaluator Invitation Link & Session Access Gate screen (`/demo-access#token=...`) illustrating workspace protection and HMAC session management.

---

## 3. Ten Required Application Screenshot Capture Checklist

Capture browser screenshots at **1920x1080 resolution** (Chrome or Firefox) using the steps below:

### Screenshot 1: Workspace Dashboard Overview
- **Route**: `http://localhost:3000/dashboard`
- **Content to Capture**: Key metrics cards (119 Discovered Creators, 2 Qualified, Active Campaigns, Simulation Outreach Mode indicator, and Quick Action buttons).
- **File Name**: `screenshot_01_dashboard.png`

### Screenshot 2: Campaign Selection & Settings
- **Route**: `http://localhost:3000/dashboard` (Campaigns module / modal)
- **Content to Capture**: Active campaign "GlowCare — India Skincare Campaign" showing target reach (5K–100K), min engagement (2.0%), niche (Beauty & Skincare), and target country (India).
- **File Name**: `screenshot_02_campaign_settings.png`

### Screenshot 3: Multi-Platform Influencer Discovery
- **Route**: `http://localhost:3000/dashboard/influencers`
- **Content to Capture**: Influencer Explorer table displaying both YouTube channels and Instagram creator cards with follower counts and engagement rates.
- **File Name**: `screenshot_03_influencer_discovery.png`

### Screenshot 4: 3-State Qualification (PASS / FAIL / REVIEW_REQUIRED)
- **Route**: `http://localhost:3000/dashboard/influencers` (Filter tab: `All`)
- **Content to Capture**: Qualification badges displaying green `PASS`, amber `REVIEW_REQUIRED`, and red `FAIL` pills with exact rejection reasons.
- **File Name**: `screenshot_04_qualification_states.png`

### Screenshot 5: Creator Profile & Contact Channels Drawer
- **Route**: `http://localhost:3000/dashboard/influencers` (Click creator "KRYSTALL CHOUDHARY" or "Ishika Garg")
- **Content to Capture**: Slide-out profile detail drawer showing follower reach, engagement calculation, public email status, and verified contact channels (Email, YouTube, Instagram).
- **File Name**: `screenshot_05_profile_enrichment.png`

### Screenshot 6: AI-Generated Personalized Email Pitch
- **Route**: AI Pitch Studio drawer (`Email` tab)
- **Content to Capture**: Generated 60–90 word email pitch, creator name, verified niche signals, brand value proposition, and word count indicator (e.g. `73 words`).
- **File Name**: `screenshot_06_email_pitch.png`

### Screenshot 7: AI-Generated Instagram DM
- **Route**: AI Pitch Studio drawer (`Instagram DM` tab)
- **Content to Capture**: Generated 15–30 word Instagram DM, conversational tone, specific content reference, and word count indicator (e.g. `25 words`).
- **File Name**: `screenshot_07_instagram_dm.png`

### Screenshot 8: Message Review & Approval Workflow
- **Route**: AI Pitch Studio drawer
- **Content to Capture**: Status transition showing **Approve Message** button and state change to `Approved (Ready for Simulation Send)`.
- **File Name**: `screenshot_08_message_approval.png`

### Screenshot 9: Outreach Tracker & Simulation Sending
- **Route**: `http://localhost:3000/dashboard` (Outreach / Activity tab)
- **Content to Capture**: Outreach activity feed displaying simulated message transmission, timestamp, channel type, and `OUTREACH_MODE=simulation` badge.
- **File Name**: `screenshot_09_outreach_tracker.png`

### Screenshot 10: Reports & Sanitized CSV Export
- **Route**: `http://localhost:3000/dashboard/influencers` (Click **Export CSV**)
- **Content to Capture**: Successful CSV download trigger or opened `influencer_dataset.csv` in spreadsheet view with sanitized columns.
- **File Name**: `screenshot_10_csv_export.png`
