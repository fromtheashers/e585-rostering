# E585 Rostering

A small roster for a Friday small group of up to ten people. No accounts: everyone opens one secret group link, picks their name and makes their own PIN. The person who sets it up is the owner, and the owner can make other people admins.

What it does:

- The organiser marks which Fridays have a meeting on a shared calendar.
- People mark which Fridays they can make and which roles they love, are fine with, or would rather not do.
- People take open roles themselves (Praise, Worship, Play Guitar, SongSheets, Games).
- Praise and Worship leaders add songs (title, artist, key). Open song slots let more people lead a song.
- The organiser can assign people, or press "Suggest people for open slots" and confirm the suggestions.
- The roster can be copied as text for the group chat.

## Deploy to Render with Neon

You need a Neon project and a Render account. Both are free to start.

### 1. Copy your Neon connection string

1. Sign in at https://console.neon.tech.
2. Open your project.
3. Click **Connect** (top right of the project dashboard).
4. In the dialog, leave the branch as `main` and the database as `neondb` (or pick the one you want).
5. Make sure **Connection pooling** is switched **on**.
6. Click **Copy snippet** next to the connection string. It looks like `postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require`.
7. Keep it somewhere private for step 2. Do not paste it into the code or a chat.

### 2. Create the web service on Render

1. Sign in at https://dashboard.render.com.
2. Click **New +** (top right), then **Blueprint**.
3. If Render asks, click **Connect GitHub** and allow access to the `e585-rostering` repository.
4. Pick the `fromtheashers/e585-rostering` repository and the branch you deploy from (usually `main`).
5. Render reads `render.yaml` and shows one service, `e585-rostering`.
6. It asks for a value for `DATABASE_URL`. Paste the Neon string from step 1.
7. Leave `SESSION_SECRET` alone: Render makes a random one for you.
8. Click **Apply** (or **Deploy Blueprint**).
9. Wait for the deploy log to say **Your service is live**. The first build takes a few minutes. The database tables are created automatically when the app starts.

If you'd rather not use a Blueprint, click **New +** then **Web Service**, pick the repo, and fill in:

- Runtime: **Node**
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Environment variables: `DATABASE_URL` (the Neon string), `SESSION_SECRET` (any long random text, at least 32 characters), `NODE_VERSION` = `22`

### 3. Set up your group

1. On the Render service page, click the address under the service name (it ends in `.onrender.com`).
2. You land on **Set up your group’s roster**. Type the group name, the usual start time, your own name and a 4 to 6 digit PIN. Click **Create the roster**. You are now the owner.
3. On **People**, type each person's name and click **Add**. Everyone gets a colour.
4. Click **Add meeting Fridays** and tap each Friday you meet.
5. Go to **More**, copy the group link, and send it to the group chat.

Each person opens the link, taps their name and makes their own PIN. Once a name has a PIN, it leaves the pick list, so nobody else can choose it. Then they mark their Fridays and preferences under **Me**.

### Good to know

- Anyone with the group link can open the roster. If it leaks, go to **More**, **Settings**, **Make a new link**. The old link stops working straight away.
- On Render's free plan the app sleeps after 15 minutes without visitors. The first visit after that takes about a minute to wake up.
- **Owner and admins:** admins can do everything the owner can, except remove the owner or reset the owner's PIN. To make someone an admin, go to **More**, **People**, tap **Edit** under their name, then tap **Make admin**. **Remove as admin** in the same place takes it away.
- **Signing in on a new phone:** on **Who are you?**, tap your name under **Already made your PIN?** and enter your PIN.
- **Forgot a PIN:** the owner or an admin goes to **More**, **People**, taps **Edit** under that person's name, then **Reset PIN**. That person picks their name again and makes a new PIN. To change your own PIN, go to **Me**, **Change my PIN**.
- **Owner forgot their PIN:** nobody in the app can reset it. Ask someone with access to the Neon database for help rather than deleting anything.
- **A group set up before personal PINs:** whoever has the old organiser PIN picks their name, makes their PIN, then goes to **More**, **Become the owner** and enters the old PIN once.

## Run it locally

1. Install Node 20 or newer and a Postgres database (or use a Neon branch).
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `SESSION_SECRET`.
3. Run `npm install`.
4. Run `node --env-file=.env scripts/migrate.mjs` to create the tables.
5. Run `npm run dev` and open http://localhost:3000.

Checks: `npm run typecheck` and `npm test`.
