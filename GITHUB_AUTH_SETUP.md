# GitHub Authentication Setup

GitHub no longer accepts passwords. You need to use a **Personal Access Token** or **SSH keys**.

## Option 1: Personal Access Token (Easiest)

### Step 1: Create a Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Name it: `Sationly Deployment`
4. Select expiration: `90 days` (or `No expiration` if you prefer)
5. **Select scopes**: Check `repo` (this gives full access to repositories)
6. Click **"Generate token"**
7. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)

### Step 2: Use the Token

When you run `git push`, it will ask for:
- **Username**: `elijahtye`
- **Password**: **Paste your token here** (not your GitHub password!)

### Step 3: Push

```bash
cd /Users/elijahtye/Learning
git push -u origin main
```

When prompted:
- Username: `elijahtye`
- Password: `paste_your_token_here`

## Option 2: SSH Keys (More Secure, No Re-authentication)

### Step 1: Check if you have SSH keys

```bash
ls -la ~/.ssh/id_*.pub
```

If you see files, you have SSH keys. If not, create them:

### Step 2: Generate SSH Key (if needed)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter to accept default location
# Press Enter for no passphrase (or set one)
```

### Step 3: Add SSH Key to GitHub

1. Copy your public key:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # Copy the entire output
   ```

2. Go to: https://github.com/settings/keys
3. Click **"New SSH key"**
4. Title: `MacBook Air`
5. Key: Paste your public key
6. Click **"Add SSH key"**

### Step 4: Update Git Remote to Use SSH

```bash
cd /Users/elijahtye/Learning
git remote set-url origin git@github.com:elijahtye/sationly.git
git push -u origin main
```

## Option 3: GitHub CLI (Easiest Long-term)

```bash
# Install GitHub CLI
brew install gh

# Login
gh auth login
# Follow the prompts - it will open browser for authentication

# Then push
git push -u origin main
```

---

**Recommendation**: Use Option 1 (Personal Access Token) for quick setup, or Option 3 (GitHub CLI) for the easiest long-term solution.

