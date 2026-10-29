# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router, TypeScript) on Cloudflare Workers via the OpenNext adapter, Postgres on Neon reached through Cloudflare Hyperdrive (caching off), Drizzle ORM. The user chose Neon; the app moved from a Render web service to Workers, and the code still runs on Node so the Render service works until it is switched off.

## Users

The members of one Christian small group (E585), at most 10 people, mostly opening the app on their phones from a link in the group chat. One organiser (asher) sets up the group, meeting dates and the roster. Members check who is serving at the next meeting, mark when they are free, say which areas they want to serve in, and pick up open slots.

## Product Purpose

A serving roster for the group's Friday meetings. It replaces a manual roster: everyone can see at a glance who is doing what at the next meeting, which roles still need someone, and which songs are being sung in which key. Success is every required role filled before Friday without the organiser chasing people one by one.

## Positioning

Built for one small group of friends rather than a church-wide planning tool: no accounts, one private link, tap your name, and the roster for the next Friday is the first thing you see.

## Operating Context

- The group meets on Fridays, 2 to 3 times a month. The organiser marks which Fridays have a meeting; other Fridays are "No meeting".
- Roles, one person each: Praise, Worship, Play Guitar, SongSheets, Games. Games is optional; an empty Games slot is never treated as a gap.
- The Praise leader and the Worship leader each add songs for their set: title, artist and key, all optional.
- Anyone can add an extra "open song slot" that someone else signs up to lead, so more people can serve.
- Members offer for open roles on each Friday; an admin (or the owner) puts them on, assigns people directly, or uses auto-fill, which picks people who offered first. Admins can take a role for themselves.
- The link is shared in a group chat (WhatsApp or Telegram).

## Capabilities and Constraints

- No accounts or passwords. Identity is: a secret group link, then tap your name (remembered on the device), with an organiser PIN for admin actions.
- The organiser can add, rename and remove names on the pick-your-name list; removing hides the name but keeps history.
- Availability per meeting (Yes / Maybe / No) with a default; serving preference per role (Love / Happy / Rather not); an optional cap on times per month.
- Auto-fill: only people marked Yes (Maybe as fallback), never "Rather not", one role per person per meeting, respects caps, prefers Love and whoever served least, fills required roles first, never fills open song slots, never overwrites sign-ups or organiser assignments.
- Cloudflare Workers don't sleep, so there is no cold start. Free plan: 10 ms CPU per request (database waits don't count). While the old Render free service is still running, it sleeps after 15 minutes idle (30 to 60 second cold start).
- Out of scope: accounts, chat, payments, automated SMS or email.

## Evidence on Hand

No real member names or songs were provided. Any names or songs in demos and seed data are samples and must be labelled as such; the organiser adds the real names.

## Product Principles

1. The next Friday comes first: who is on, what is open, which songs.
2. One tap to help: taking an open slot is never more than one tap from where it is shown.
3. Trust over control: no logins, and an activity log makes mix-ups easy to spot and undo.
4. Gaps are invitations, not alarms: open slots ask for help in a friendly voice.

## Accessibility & Inclusion

Phone-first. Touch targets at least 44px, WCAG AA contrast, works with reduced motion.
