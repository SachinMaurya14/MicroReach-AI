# MicroReach AI — Profile Enrichment & Gemini AI Personalization

This document details the contact discovery, SSRF-guarded email enrichment, and context-aware AI pitch personalization systems in MicroReach AI.

---

## 1. Contact Discovery & SSRF-Guarded Enrichment

MicroReach AI extracts contact channels exclusively from authentic public sources, strictly rejecting synthetic email generation or guessing.

### 1.1 Multi-Platform Contact Channels
For every discovered creator, available channels are indexed with explicit linking evidence:
- **Business Email**: Extracted from public bio text, channel descriptions, or linked website mailto links.
- **Instagram Profile**: Associated only when an explicit URL link exists on the creator's channel.
- **LinkedIn Profile**: Associated strictly when explicitly linked (never matched by name alone).
- **YouTube Channel**: Direct channel contact URL.

### 1.2 SSRF Protection on External Website Scrapes
When scraping an influencer's public portfolio or link-in-bio website for contact information:
1. **Pre-flight DNS Resolution**: Resolves hostnames to IP addresses before initiating connections.
2. **IP Range Blacklisting**: Aborts immediately if the target IP falls into:
   - Loopback: `127.0.0.0/8`
   - Private RFC1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
   - Carrier-Grade NAT: `100.64.0.0/10`
   - Link-Local & Cloud Metadata: `169.254.169.254`
   - IPv4-Mapped IPv6: `::ffff:0:0/96`
3. **HTTP Constraints**: `redirect: 'manual'` (re-validates target IPs on up to 3 hops) and max read size of 200 KB.

---

## 2. Gemini AI Personalization Engine

Outreach personalization is driven by the Google Gemini Developer API using `@google/genai`.

### 2.1 Model Selection & Fallback Architecture
The system dynamically queries `ai.models.list()` to discover available models, utilizing an ordered preference:
1. `gemini-3.6-flash` (Primary fast multimodal model)
2. `gemini-3.5-flash`
3. `gemini-3.1-flash-lite`

### 2.2 Strict Channel Length & Style Constraints
To maximize response rates and comply with channel etiquette, generated pitches are strictly constrained by word count:

| Channel | Target Length | Tone & Focus |
|---|---|---|
| **Email Pitch** | **60 to 90 words** | Professional, concise value proposition with brand intro and collaboration offer |
| **Instagram DM** | **15 to 30 words** | Casual, direct, praising a specific post and asking for collaboration interest |
| **LinkedIn Message** | **20 to 75 words** | Formal, partnership synergy, cross-channel reach discussion |
| **YouTube Contact** | **50 to 80 words** | Channel-specific compliment referencing recent videos and sponsorship fit |

### 2.3 Anti-Hallucination & Creator Signals
The prompt injects genuine signals extracted from platform APIs:
- Verified niche and detected content themes.
- Exact recent video titles or public bio snippets.
- Specific collaboration type (e.g. "Sponsorship", "UGC creation", "Affiliate").
- Explicit instruction: *Never invent subscriber numbers, past brand deals, or fake personal anecdotes.*

If Gemini's raw output violates word count bounds or schema rules, the engine automatically attempts bounded regeneration or cleanly truncates to sentence boundaries while maintaining tone.
