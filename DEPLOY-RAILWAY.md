# Deploying Route Runner to Railway

## Prerequisites
- A [Railway](https://railway.com) account (sign up with GitHub)
- This repo pushed to GitHub (see below)

---

## Step 1: Create a Railway Project

1. Go to [railway.com/new](https://railway.com/new)
2. Click **"Deploy from GitHub repo"**
3. If prompted, link your GitHub account
4. Select the **route-runner** repository
5. Click **"Deploy Now"**

Railway will auto-detect the Dockerfile and start building.

---

## Step 2: Add a Persistent Volume (Critical)

SQLite stores your data in a file. Without a persistent volume, your data disappears every time Railway redeploys.

1. Click on your **route-runner** service in the project canvas
2. Go to the **"Volumes"** tab (or Settings → Volumes)
3. Click **"Add Volume"**
4. Set the **Mount Path** to: `/data`
5. Click **"Add"**

This gives you persistent storage at `/data` inside the container. The app is already configured to store the database at `/data/database.sqlite`.

---

## Step 3: Set Environment Variables

1. Click on your service → go to the **"Variables"** tab
2. Add these variables:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_PATH` | `/data/database.sqlite` |
| `PORT` | `3000` |

Railway auto-sets PORT, but it's good to be explicit.

3. Click **"Deploy"** to apply changes

---

## Step 4: Configure Health Check

1. Go to **Settings** → scroll to **"Deploy"** section
2. Set **Healthcheck Path** to: `/health`
3. This ensures Railway only routes traffic to healthy instances

---

## Step 5: Generate Your Public URL

1. Go to **Settings** → **"Networking"**
2. Click **"Generate Domain"**
3. Railway will give you a URL like: `https://route-runner-production.up.railway.app`

That's your live app URL. Share it with your Route Runner subscribers.

---

## Step 6: (Optional) Custom Domain

Want `routes.sixfigurecourier.com`?

1. In **Settings** → **"Networking"** → **"Custom Domain"**
2. Enter your domain: `routes.sixfigurecourier.com`
3. Railway shows you a CNAME record to add
4. Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
5. Add a CNAME record pointing `routes` to the Railway domain
6. Wait for DNS propagation (usually 5-30 minutes)

---

## Default Login Credentials

After the first deploy, the seed script auto-creates these accounts:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@sixfigurecourier.com` | `admin123` |
| **Demo** | `demo@example.com` | `demo123` |

**Change these passwords immediately after first login** by updating the seed.ts file or adding a password change feature.

---

## Updating the App

Any push to your GitHub repo's main branch automatically triggers a new deploy on Railway. The persistent volume keeps your database intact across deploys.

```bash
git add .
git commit -m "Update routes"
git push origin main
# Railway auto-deploys within ~2 minutes
```

---

## Costs

Railway's pricing (as of 2026):
- **Hobby plan**: $5/month includes $5 of usage credit
- **Pro plan**: $20/month includes $20 of usage credit
- Typical cost for this app: **$5-10/month** (low traffic, SQLite is lightweight)

This is well within your $19/month subscription revenue per customer.

---

## Troubleshooting

**Data disappeared after redeploy?**
→ Volume not attached. Check Step 2.

**"Cannot open database" error?**
→ Check that `DATABASE_PATH` env var is set to `/data/database.sqlite` and the volume is mounted at `/data`.

**Build fails?**
→ Check the build logs in Railway dashboard. Usually a missing dependency. The Dockerfile handles `better-sqlite3` native compilation.

**App runs but shows 0 routes?**
→ The seed script only runs on first deploy (when no database exists). If you need to re-seed, delete the database file from the Railway shell: `rm /data/database.sqlite` then redeploy.
