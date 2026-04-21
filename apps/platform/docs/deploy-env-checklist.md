# XRNotify Platform — Railway Deploy Env Checklist

## Required for deploy stability

### NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
- **Purpose:** Stabilizes Next.js Server Action IDs across Railway builds.
  Without this, each rebuild regenerates hashes, causing stale-client
  POSTs to fail with "Failed to find Server Action" runtime errors.
- **Required format:** 32 random bytes, base64-encoded.
- **Generate once, reuse across every deploy:**
```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
- **Set in:** Railway → xrnotify-platform service → Variables
- **Critical:** Use the SAME value across all replicas/services of this app.
  Changing this value invalidates all in-flight client actions — only
  rotate if you have to.

### RAILWAY_GIT_COMMIT_SHA
Railway provides this automatically. No action needed — `generateBuildId`
in `next.config.js` reads it.
