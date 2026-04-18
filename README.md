# 🏓 Slip 12 Pickleball League

Your apartment complex pickleball league manager. Shareable URL, aesthetic PNG exports for GroupMe, data stored in your browser.

---

## 🚀 DEPLOY IT (15 minutes, no coding)

You don't need to install anything on your computer. Everything happens in your browser.

### Step 1 — Make a GitHub account (free)
GitHub is where your code lives online.

1. Go to **https://github.com** and sign up (use your email, pick any username).
2. Verify your email.

### Step 2 — Upload this folder to GitHub

1. While logged in, click the **"+"** in the top-right → **"New repository"**.
2. Name it whatever you want (e.g. `pickleball-league`). Leave it **Public**.
3. **Do not** check any of the "Add a README" / "Add .gitignore" boxes (we already have them).
4. Click **"Create repository"**.
5. On the next page, click **"uploading an existing file"** (it's a blue link in the middle).
6. Drag this **entire folder's contents** (every file and folder you see — `src`, `public`, `package.json`, everything) into the upload area.
   - ⚠️ Don't drag the folder itself. Open it and drag what's inside.
7. Scroll down, click **"Commit changes"**. Wait for the upload to finish.

### Step 3 — Deploy to Vercel (free)
Vercel is what turns your code into a live website.

1. Go to **https://vercel.com** and click **"Sign Up"**.
2. Choose **"Continue with GitHub"** (this connects the two accounts).
3. Once logged in, click **"Add New..."** → **"Project"**.
4. You'll see your `pickleball-league` repository — click **"Import"**.
5. Don't change any settings. Just click **"Deploy"**.
6. Wait 30–60 seconds. ☕
7. When done, you'll see **"Congratulations!"** with a screenshot of your app.
8. Click **"Continue to Dashboard"** → your URL is at the top (something like `pickleball-league-abc123.vercel.app`).

### Step 4 — Make the URL prettier (optional)

In the Vercel dashboard → **Settings** → **Domains** → you can change the subdomain to something like `slip12pickleball.vercel.app` if it's available. Free.

### Step 5 — Add to your phone's home screen

**iPhone:** Open the URL in Safari → tap the Share button → "Add to Home Screen".
**Android:** Open the URL in Chrome → tap the three-dot menu → "Add to Home screen".

Now it looks and feels exactly like an installed app.

---

## 💡 How to use the app

- **Players** — Add them manually or paste rows from your Google Sheets signup form (format: `Name, Skill, Unit` per line — Skill is A/B/C)
- **Teams** — Hit Generate. "Skill-balanced" keeps teams fair. Click team names to rename them.
- **Schedule** — Round-robin generated automatically; pick a season start date. Type scores in as games are played.
- **Standings** — Auto-updates. Sorted by wins, then point differential.
- **Bracket** — Once you've played some games, seed a playoff bracket. Tap team names to advance winners.
- **Export PNG** — Every tab has an export button. Downloads a shareable PNG for GroupMe.

**Important:** Your league data is stored in your browser's local storage. It stays private to your device. If you clear your browser data or switch devices, the data won't follow. The app has the data you need for one season, and when you wrap up you can start fresh for the next season.

---

## 🔧 Updating the app later

If you want to make changes (tweak colors, add features, fix a bug):
1. Edit files on GitHub directly (click any file, hit the pencil icon), OR
2. Upload new versions the same way you did in Step 2.

Vercel will automatically redeploy within a minute. Your live URL stays the same.

---

## 🆘 Troubleshooting

- **Vercel says build failed** → Make sure you uploaded the _contents_ of the folder, not the folder itself. The `package.json` file must be at the top level of your repository.
- **Data disappeared** → Check if you're on the same browser/device. Data is stored locally per-browser.
- **PNG export blurry** → Try on desktop; mobile browsers sometimes downscale. PNGs export at 2x resolution.

---

## 🛠 For developers (optional)

```bash
npm install
npm run dev        # local dev server on http://localhost:5173
npm run build      # production build to ./dist
```

Stack: Vite + React 18. No backend. localStorage for persistence. html2canvas for PNG export.
