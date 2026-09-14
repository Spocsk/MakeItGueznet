# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Next.js App Router (TypeScript) on Vercel for the frontend; Convex for Auth, file storage, and realtime (user chose Convex after a Supabase free-plan two-project cap). Polaroid visual world locked by the user (Impeccable pick, seed d59a9d30).

## Users

Primary users are Dylan and a small group of friends playing together on phones and laptops during a soirée. They arrive ready to play, not to configure a product. Each person who wants a lasting library has an account; others can join a room with a nickname.

## Product Purpose

MakeItGueznet is a private party game: people join a room, contribute their own images and GIFs, caption a template, then rate the results without knowing who wrote what. It exists so the group can play with **their** kits instead of paying Make It Meme to upload custom images and GIFs. Success is a complete round on phone and desktop in one sitting, using only files the group brought.

## Positioning

The mechanism is a shared pool of player-owned files, a different template dealt to each player in a round, and anonymous five-star ratings (impress, don’t pick a single winner). Neighboring party games cannot truthfully claim this group’s own GIF/image library with no upload paywall.

## Operating Context

- Create or join a room with a short code.
- Logged-in players keep a personal library; anyone in the lobby can drop files for **this game only**.
- Players select library items and lobby drops into a common pool.
- One play mode: each player receives a different image or GIF from the pool, writes a caption (text overlay, including on GIFs without re-encoding), then rates every meme 1–5 stars without seeing the author.
- After votes: reveal authors, show scores (sum of stars), next round.
- Responsive web only (no native apps in v1).

## Capabilities and Constraints

- **In v1:** accounts + library (images and GIFs), room codes, lobby pool, unique deal per player, caption overlay, anonymous 5-star voting, scores, desktop and phone.
- **Out of v1:** public matchmaking, multiple Make It Meme-style modes, coins, ads, achievements, Discord/Twitch, native apps.
- **Legal:** do not copy Make It Meme branding, UI, copy, or official packs. Do not scrape or reconstruct their templates. Generic starters, if any, must be original or CC0. Players are responsible for rights on uploads.
- **File cap:** keep uploads phone-friendly (about 8 MB).
- **Guests:** may join with a nickname and drop files into the current room; saving to a library requires an account.
- **Undecided:** exact auth provider UI (Google vs magic link) beyond “simple login”; round timer duration if any.

## Brand Commitments

- Product name: **MakeItGueznet**.
- Binding tone from the brief: premium, as minimal as possible — one obvious action per screen, no noisy gamification.
- Language of the product UI: French.
- Explicit anti-clone: not a visual or asset replica of Make It Meme.

## Evidence on Hand

No logos, photography, starter packs, or testimonials exist in the repo. Future work must not invent Make It Meme templates, downloaded meme celebrities, fake social proof, or pricing claims. Demonstration media in the UI must be original, CC0, or clearly labeled as synthetic placeholders the user can replace.

## Product Principles

- The files in the room are the product; chrome stays out of the way.
- Everyone can contribute; only an account keeps a library.
- Ratings impress anonymously; authorship is revealed after.
- Phone and desktop are first-class, not a stretched desktop.
- Original world, original media — never borrowed kits.
