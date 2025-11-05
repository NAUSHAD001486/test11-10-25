# 📋 Manual Git Commands

Terminal stuck ho raha hai, isliye aap manually ye commands run karein:

## ✅ Step-by-Step Commands

### Step 1: Open New Terminal Window
Press: `Cmd+T` (new terminal tab) ya `Cmd+N` (new window)

### Step 2: Navigate to Project
```bash
cd /Users/nausadalam/11.0
```

### Step 3: Check Changes
```bash
git status
```

### Step 4: Add All Changes
```bash
git add -A
```

### Step 5: Commit Changes
```bash
git commit -m "Fix: Single file download (direct), Multiple files (ZIP), Missing icon removed, Deprecated meta tag fixed, Error handling improved"
```

### Step 6: Push to GitHub
```bash
git push origin main
```

## 🔍 Verify Changes

After push, check:
```bash
git log --oneline -1
```

Should show: Latest commit with fixes

---

**Note**: Terminal stuck issue ke liye new terminal window use karein.

