<div align="center">
  <img src="./assets/profile.png" width="110" alt="JXNN Store logo">

  <h1>JXNN. STORE</h1>

  <p><strong>YOUR STORY. CUT SHARPER.</strong></p>
  <p>Cinematic, high-retention video editing for creators and brands.</p>

  <p>
    <img src="https://img.shields.io/badge/STATUS-BOOKING_NOW-c8ff32?style=for-the-badge&labelColor=070709&color=c8ff32" alt="Booking now">
    <img src="https://img.shields.io/badge/BUILD-HTML_·_CSS_·_JS-8d68ff?style=for-the-badge&labelColor=070709&color=8d68ff" alt="HTML CSS JavaScript">
  </p>
</div>

---

## The studio

JXNN. Store turns raw footage into sharp, high-retention stories through purposeful pacing, clean sound, motion design and platform-ready finishing.

This repository contains the complete studio portfolio: selected edits, thumbnail work, service rates, production information and contact routes.

> **Built to feel like an editing timeline — dark, dimensional and always in motion.**

## Selected clients

| Client | Work |
| --- | --- |
| [OkHarry](https://twitch.tv/okharry) | Gaming, IRL editing and thumbnail design |

## Services

- Long-form YouTube editing
- TikTok, Reels and YouTube Shorts
- Motion design and animated graphics
- Subtitles and retention-led formatting
- Sound design, colour and final delivery
- High-click-through thumbnail design

## Design system

| Element | Direction |
| --- | --- |
| Visual language | Cinematic dark interface with glass panels and editorial spacing |
| Accent palette | Acid green `#C8FF32` and violet `#8D68FF` |
| Motion | Scroll reveals, progress feedback and interactive CSS 3D scenes |
| Typography | Manrope paired with DM Mono |
| Experience | Responsive, keyboard accessible and reduced-motion friendly |

The site is built with semantic HTML, modern CSS and lightweight vanilla JavaScript. It has no framework or build-step dependency.

## Project structure

```text
work-rates/
├── index.html          # Portfolio, showreel and detailed case studies
├── rates.html          # Editing and thumbnail pricing
├── thumbnail.html      # Thumbnail portfolio and lightbox
├── faq.html            # Production questions and answers
├── contact.html        # X-first project contact page
├── admin.html          # Legacy private dashboard (not linked publicly)
├── client.html         # Legacy private Client Room (not linked publicly)
├── recover.html        # Legacy room recovery (not linked publicly)
├── privacy.html        # Project-form privacy notice
├── tos.html            # Terms of service
├── 404.html            # Custom missing-sequence page
├── theme.css           # Shared secondary-page design system
├── shared.js           # Scroll, reveal, gallery and mobile-menu interactions
├── site-notifications.js # Legacy Client Room alerts (not loaded publicly)
├── contact.js          # Legacy verified enquiry submission
├── analytics.js        # Anonymous first-party event tracking
├── admin.js            # Enquiry, notes and analytics controls
├── client.js           # Private Client Room messages and project signals
├── recover.js          # Recovery request and token redemption
├── supabase-config.js  # Browser-safe project connection values
├── supabase-schema.sql # Enquiry table and access policies
├── supabase/           # Verified submissions, analytics and rate limiting
└── assets/             # Logos, social card, client images and portfolio artwork
```

## Run locally

Open the project folder in VS Code and select **Go Live**, or open `index.html` directly in a browser.

Keep `theme.css`, `shared.js` and every HTML page in the same folder. The `assets` directory should remain beside them.

The public contact flow opens the existing [@jxnn122](https://x.com/jxnn122) profile on X. The previous enquiry, dashboard and Client Room files remain in the repository for compatibility and data/security continuity, but they are no longer linked or loaded by the public site. The site records anonymous page and interaction totals without cookies or stored IP addresses.

Accepted projects can be given a private **Client Room**. New enquiries receive a random same-device notification token; only its salted hash is stored. When the studio creates a room, the client sees a themed website notification in the browser they used for the enquiry and can open the private conversation immediately. The room link keeps its access token in the URL fragment. Clients can send messages, request revisions, ask to talk or approve a cut without creating an account. If a client loses the link, the recovery page can send a time-limited, one-use replacement to the email address on the enquiry. New client signals alert the studio through Discord; studio replies remain organised in the private dashboard and appear in the client timeline. Clients can also opt in to private Discord bot alerts for replies and project-status changes, then disconnect those alerts whenever they like.

The Edge Functions expect `TURNSTILE_SECRET_KEY` and `RATE_LIMIT_SALT` as private Supabase secrets. Recovery email delivery also uses `RESEND_API_KEY` and `RECOVERY_FROM_EMAIL`. `DISCORD_WEBHOOK_URL` enables private studio alerts. Discord client DMs also use `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID` and `DISCORD_REDIRECT_URI`; private values must stay in Supabase Edge Function Secrets. Direct public database inserts are disabled, and the dashboard remains restricted to the approved studio email. Never place a Supabase `service_role`, Turnstile secret, Discord credential or any other private key in this repository.

## Contact

<div align="center">

[![Message on X](https://img.shields.io/badge/MESSAGE_ON_X-%40JXNN122-c8ff32?style=for-the-badge&labelColor=070709&color=c8ff32)](https://x.com/jxnn122)
[![Instagram](https://img.shields.io/badge/INSTAGRAM-%40JAXONGARFORTH1-f4f2eb?style=for-the-badge&labelColor=070709&color=f4f2eb)](https://instagram.com/jaxongarforth1)

<sub>© 2026 JXNN. STORE — CUT DIFFERENT.</sub>

</div>
