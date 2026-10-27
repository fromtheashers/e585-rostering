# E585 Rostering

A small roster for a Friday small group of up to ten people. No accounts: everyone opens one secret group link, picks their name and makes their own PIN. The person who sets it up is the owner, and the owner can make other people admins.

What it does:

- The organiser marks which Fridays have a meeting on a shared calendar.
- People mark which Fridays they can make and which roles they love, are fine with, or would rather not do.
- People take open roles themselves (Praise, Worship, Play Guitar, SongSheets, Games).
- Praise and Worship leaders add songs (title, artist, key). Open song slots let more people lead a song.
- The organiser can assign people, or press "Suggest people for open slots" and confirm the suggestions.
- The roster can be copied as text for the group chat.

## Deploy to Cloudflare Workers

The app runs on Cloudflare Workers and keeps using your Neon database, so all your people, Fridays, roles and songs stay as they are. Unlike Render's free plan, a Worker never sleeps, so the first visit of the day opens straight away.

You need about 30 minutes, your Neon login, your Render login and your GitHub login. You don't need to install anything.

### 1. Create a Cloudflare account

1. Go to https://dash.cloudflare.com/sign-up.
2. Type your email address and a password, then click **Sign up**.
3. Open the email from Cloudflare and click the link in it to verify your address.
4. If Cloudflare asks what you want to do first, click **Skip** (or close the dialog). You land on the account home page.

The free plan is enough. See [Limits and cost](#limits-and-cost) below.

### 2. Copy a direct Neon connection string

Cloudflare's database helper, Hyperdrive, keeps its own pool of connections, so Cloudflare recommends giving it Neon's **direct** address, not the pooled one.

1. Sign in at https://console.neon.tech and open your project.
2. Click **Connect** (top right of the project dashboard).
3. Leave **Branch** as `main` and **Database** as `neondb` (the same ones Render uses).
4. Switch **Connection pooling** **off**. The address in the box changes: the part after the `@` no longer has `-pooler` in it.
5. Click **Show password** if the password is hidden, then click **Copy snippet**. It looks like `postgresql://neondb_owner:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.
6. Keep it somewhere private for steps 3 and 6. Don't paste it into the code or a chat.

### 3. Create the Hyperdrive configuration

Hyperdrive is how the Worker reaches Neon quickly.

1. Open https://dash.cloudflare.com/?to=/:account/workers/hyperdrive. (Or, in the left sidebar, open **Storage & databases** and click **Hyperdrive**. On some accounts it sits under **Workers & Pages**.)
2. Click **Create configuration** (if this is your first one, the button is in the middle of the page).
3. **Name:** type `e585-neon`.
4. **Connection string:** paste the Neon string from step 2. If the form shows separate boxes instead (host, port, database, user, password), click the **Connection string** tab above them first.
5. **Caching:** switch it **off** (untick **Enable caching**, or pick **Disabled**). With caching on, Hyperdrive can hand back a saved copy of a query for up to a minute, so someone could take a role and still see it open, or see an old roster.
6. Click **Create**. Cloudflare checks it can reach Neon; this takes a few seconds.
7. On the configuration's page, find **ID** (a long string of letters and numbers) and click the copy icon next to it.
8. Check caching is off: click the **Settings** tab and look at **Caching**. If it says enabled, click **Edit** (or the toggle), turn it off, and click **Save**.

### 4. Put the Hyperdrive ID into the code

1. Open https://github.com/fromtheashers/e585-rostering and make sure the branch picker (top left of the file list) says `main`.
2. Click the file `wrangler.jsonc`.
3. Click the pencil icon (**Edit this file**), top right of the file.
4. Find the line `"id": "REPLACE_WITH_YOUR_HYPERDRIVE_ID"`. Select only the words `REPLACE_WITH_YOUR_HYPERDRIVE_ID` (keep the quotes) and paste the ID from step 3.
5. Click **Commit changes...** (top right). Leave **Commit directly to the `main` branch** selected and click **Commit changes**.

The ID isn't a secret: on its own it can't reach your database.

### 5. Copy SESSION_SECRET from Render

The new app must sign sign-ins with the same secret as the Render one, so both treat a sign-in the same way while both are running.

1. Sign in at https://dashboard.render.com.
2. Click the `e585-rostering` service.
3. In the left menu, click **Environment**.
4. Find the row **SESSION_SECRET**. Click the eye icon (or the hidden value) to show it, then copy the whole value.
5. Keep it private for step 7.

### 6. Connect the repository to Cloudflare

1. Open https://dash.cloudflare.com and, in the left sidebar, click **Workers & Pages** (under **Compute**).
2. Click **Create application** (top right).
3. Under **Import a repository**, click **Connect GitHub** (or **Continue with GitHub**).
4. GitHub opens. Pick the account `fromtheashers`, choose **Only select repositories**, pick `e585-rostering`, and click **Install & Authorize** (GitHub may ask for your password). You come back to Cloudflare.
5. Click `e585-rostering` in the repository list.
6. Fill in the **Set up your application** page:
   - **Project name:** `cgroster`. It must match the `name` in `wrangler.jsonc`, or the build fails.
   - **Build command:** `npm run cf:build` (it updates the database tables, then builds the app).
   - **Deploy command:** `npx wrangler deploy` (it hands over to OpenNext's deploy, which needs the placeholder `localConnectionString` already in `wrangler.jsonc`)
   - **Path** (root directory): leave it as `/`.
7. Click **Advanced settings** (below the commands), then under **Build variables** click **Add variable**:
   - **Variable name:** `DATABASE_URL`
   - **Value:** the Neon string from step 2.
   - Tick **Encrypt** if it's offered.
8. Make sure the production branch is `main` (it's shown on this page, or under **Settings**, **Build** later), then click **Create and deploy** (or **Deploy**).
9. Wait for the build log to finish with a green **Success** (5 minutes or so the first time). If it fails at `db:migrate` saying `DATABASE_URL is not set`, go to the Worker's **Settings**, **Build**, **Variables and secrets**, add `DATABASE_URL` there, then open **Deployments** and click **Retry build**.

`DATABASE_URL` is only used while building, to bring the Neon tables up to date. The running Worker reaches Neon through Hyperdrive, so you don't add `DATABASE_URL` as a runtime variable.

### 7. Add SESSION_SECRET to the Worker

1. In **Workers & Pages**, click `e585-rostering`.
2. Click the **Settings** tab, then **Variables and Secrets**.
3. Click **Add**.
4. **Type:** **Secret**. **Variable name:** `SESSION_SECRET`. **Value:** paste the value from step 5.
5. Click **Deploy** (or **Save and deploy**). This restarts the Worker with the secret.

### 8. Stop test branches from touching the real database

The build command updates the real Neon tables, so only `main` should build.

1. Still in the Worker's **Settings**, click **Build**.
2. Under **Branch control**, untick **Builds for non-production branches** (or set it to **None**), then click **Save**.

### 9. Open the new address and check it

1. Click the **Overview** tab (or **Deployments**). Under **Domains** (or **Visit**), click the address ending in `.workers.dev`, for example `https://cgroster.your-name.workers.dev`.
2. You should see **This roster is private.** That means the Worker reached your Neon data and found your group. (If you see **Set up your group's roster** instead, the Hyperdrive string points at the wrong Neon database: don't fill it in; go back to step 3 and check the branch and database.)
3. Take your group link, for example `https://e585-rostering.onrender.com/g/k7pq-2xvn-9trb`, and swap the part before `/g/` for the new address: `https://cgroster.your-name.workers.dev/g/k7pq-2xvn-9trb`. The code after `/g/` stays the same.
4. Open it. You see **Who are you?** with everyone's names, because this phone hasn't signed in on the new address yet.
5. Tap your name and enter your usual PIN. You see the roster with all your Fridays, roles and songs.
6. Try one tap, for example mark yourself **Maybe** for a Friday, then open the old Render link and check it shows the same.

### 10. Move the group over

1. Send the new link in the group chat, with a note like: "The roster has a new address. Open this link, tap your name and enter your PIN once."
2. Everyone signs in once on the new address with their same PIN. Sign-ins can't move between addresses, which is why each phone asks once.
3. The first time someone signs in after this update (on either address), their PIN is moved to a stronger lock. Their other phones then ask for the PIN once more. Nothing else changes.

### 11. Switch off Render

Wait until everyone has used the new link (a week is plenty). Both addresses use the same database, so nothing is lost while both run.

1. Sign in at https://dashboard.render.com and click the `e585-rostering` service.
2. Click **Settings** in the left menu.
3. Scroll to the bottom and click **Suspend Web Service**, then confirm. The old link stops working; you can **Resume** it if you need it back.
4. Once you're sure, come back to the same page and click **Delete Web Service** to remove it for good. Your data is in Neon, not Render, so deleting the service deletes no data.
5. Optional: in Neon, the pooled connection string Render used is no longer needed. Leave the database itself alone.

### Limits and cost

- Workers Free covers 100,000 requests a day, far more than a group of ten uses.
- Free Workers get 10 ms of CPU time per request (time spent waiting for the database doesn't count). Checking a PIN takes roughly 20 ms, which a Worker is allowed to go over now and then. If anyone sees **Worker exceeded resource limits** (error 1102) when signing in, upgrade: in **Workers & Pages**, click **Plans** (or **Upgrade**), pick **Workers Paid** (US$5 a month) and add a card. It raises the limit to 30 seconds.
- Size: Free Workers were long capped at 3 MiB compressed; Cloudflare's limits page now lists 64 MiB uncompressed on both plans. This app's Worker is about 1.1 MiB compressed (5.3 MiB uncompressed), so it fits either way. The build log shows the current numbers on the `Total Upload: ... / gzip: ...` line.
- Hyperdrive is included on the free plan.

### Run the Workers version on your computer

`npm run dev` runs the app in Node as before (see [Run it locally](#run-it-locally)). To try it in the real Workers runtime:

1. Have a local Postgres database with a password, with the tables created (`node --env-file=.env scripts/migrate.mjs` with `DATABASE_URL` pointing at it).
2. Copy `.dev.vars.example` to `.dev.vars` and set `SESSION_SECRET`. `.dev.vars` holds the Worker's secrets on your computer and is never committed.
3. In `.env` (or your shell), set `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` to that database, for example `postgresql://postgres:password@127.0.0.1:5432/e585`. The local Hyperdrive binding connects there. It is kept out of `wrangler.jsonc` so no connection string is committed.
4. Run `npm run preview` and open http://localhost:8787.

After changing bindings in `wrangler.jsonc`, run `npm run cf-typegen` to refresh `cloudflare-env.d.ts`.

## Deploy to Render with Neon (the old way)

This is how the app ran before Cloudflare. It still works, and the Render service keeps running until you switch it off (step 11 above).

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

1. Open the app's address: the `.workers.dev` one on Cloudflare, or on Render the address under the service name (it ends in `.onrender.com`).
2. You land on **Set up your group’s roster**. Type the group name, the usual start time, your own name and a 4 to 6 digit PIN. Click **Create the roster**. You are now the owner.
3. On **People**, type each person's name and click **Add**. Everyone gets a colour.
4. Click **Add meeting Fridays** and tap each Friday you meet.
5. Go to **More**, copy the group link, and send it to the group chat.

Each person opens the link, taps their name and makes their own PIN. Once a name has a PIN, it leaves the pick list, so nobody else can choose it. Then they mark their Fridays and preferences under **Me**.

### Good to know

- Anyone with the group link can open the roster. If it leaks, go to **More**, **Settings**, **Make a new link**. The old link stops working straight away.
- On Cloudflare the app never sleeps. On Render's free plan (the old way) it sleeps after 15 minutes without visitors, and the first visit after that takes about a minute to wake up.
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
