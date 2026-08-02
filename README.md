# 🕷️ SPIDEY OFFICIAL — Instagram Downloader Bot (v3.1)

A Telegram bot that downloads Instagram reels, videos, photos, and full
carousels in HD. This is a refactored, bug-fixed version of the original
single-file bot.

## Project structure

```
index.js              Entry point: wires everything together, global error handlers
config.js             Reads all settings from environment variables

ig/                   Instagram core
  downloader.js       URL validation, media extraction, file download
  caption.js          Real caption resolution (scraper + IG embed fallback)

plugins/              Telegram-facing features
  handlers.js         Main download flow
  commands.js         /start, /stats, all callback buttons
  keyboards.js        Inline keyboard builders
  forcesub.js         Force-subscription gate
  media.js            Media delivery (albums, videos, carousels, sessions)

automation/           Infrastructure
  database.js         JSON persistence + admin notifications
  server.js           Keep-alive web server (Render health checks)
  utils.js            Shared helpers + safe Markdown escaping
```

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in `BOT_TOKEN` (from @BotFather).
3. `npm start`

On Render, set the same variables under **Environment**, use `npm install` as
the build command and `npm start` as the start command.

## Bugs fixed in v3.1

1. **Username / account details** — usernames and captions containing
   `_ * [ ` characters no longer crash Telegram's Markdown parser; all
   user-supplied text is escaped.
2. **Video download crashes** — added `bot.catch`, process-level handlers, a
   50 MB upload guard with a direct-link fallback, and removed the fragile
   HEAD request that skipped valid media.
3. **Caption parsing** — the real caption is now fetched from Instagram's
   public embed endpoint when the scraper returns nothing.
4. **Carousels / multiple slides** — deduplication no longer collapses
   distinct slides; every item is delivered (albums batched by 10, videos sent
   individually) and navigation buttons work.
5. **Security & polish** — bot token moved to an environment variable, all
   menu buttons (About/Help/Support/Premium/Get Started) are now functional.

## ⚠️ Security note

The original code had the real bot token hard-coded. **Regenerate your token
in @BotFather**, since the old one is exposed, and set the new one only via the
`BOT_TOKEN` environment variable.
