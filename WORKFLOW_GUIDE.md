# Development Workflow Guide

## 🏠 Local Development (Your Daily Work)

**Yes, you can work locally!** This is your normal workflow:

### Start Local Server

```bash
cd /Users/elijahtye/Learning

# For development (auto-restarts on file changes)
npm run dev

# OR for production mode
npm start
```

Your app runs at: **http://localhost:5000**

### Workflow:
1. ✅ Make changes to files
2. ✅ Test locally at `http://localhost:5000`
3. ✅ Repeat until everything works
4. ✅ **No need to push to GitHub or Vercel while developing**

---

## 🚀 Deploying Updates (When Ready)

When you're happy with your changes and want to update the live site:

### Step 1: Commit Changes

```bash
cd /Users/elijahtye/Learning

# See what changed
git status

# Add all changes
git add .

# Commit with a message
git commit -m "Add new feature"  # or whatever describes your changes

# Push to GitHub
git push origin main
```

### Step 2: Vercel Auto-Deploys! 🎉

**That's it!** Vercel automatically:
- Detects the push to GitHub
- Deploys your changes
- Updates your live site

**No need to:**
- ❌ Go to Vercel dashboard
- ❌ Click "Deploy" button
- ❌ Manually trigger deployment

**You only need to manually redeploy if:**
- You add/change environment variables (then go to Vercel → Settings → Environment Variables → Redeploy)
- Something goes wrong and you need to force a redeploy

---

## 📋 Summary

| Task | What to Do |
|------|------------|
| **Daily Development** | Work locally with `npm run dev` or `npm start` |
| **Test Changes** | Visit `http://localhost:5000` |
| **Deploy Updates** | `git add .` → `git commit -m "message"` → `git push` |
| **Vercel Updates** | Automatic! (no action needed) |

---

## 🔄 Complete Workflow Example

```bash
# 1. Work locally
npm run dev
# Make changes, test at localhost:5000

# 2. When ready to deploy
git add .
git commit -m "Fix timer bug"
git push origin main

# 3. Wait ~30 seconds
# Vercel automatically deploys!

# 4. Visit your live site to verify
# https://your-project.vercel.app
```

---

## 💡 Pro Tips

1. **Test locally first** - Always test changes locally before pushing
2. **Commit often** - Small commits are easier to debug
3. **Check Vercel logs** - If something breaks, check Vercel Dashboard → Deployments → Logs
4. **Environment variables** - If you add new ones, add them in Vercel Dashboard → Settings → Environment Variables, then redeploy

---

## 🆘 Troubleshooting

**Local server won't start?**
- Check if port 5000 is in use: `lsof -i :5000`
- Make sure `.env` file exists with all variables

**Changes not showing on live site?**
- Check Vercel Dashboard → Deployments to see if deployment succeeded
- Check deployment logs for errors
- Make sure you pushed to `main` branch

**Need to test production build locally?**
- Use `npm start` (production mode)
- Or test on Vercel preview deployments

