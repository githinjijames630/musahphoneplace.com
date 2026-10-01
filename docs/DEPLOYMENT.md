# GitHub and Live Deployment

## GitHub

Create a private GitHub repository, then push the project from its folder:

```powershell
git add .
git status --short
git commit -m "Prepare Musah Mobiles for deployment"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

Review `git status --short` before committing. `.gitignore` excludes `.env` files, local databases, uploads, logs, `node_modules`, and the duplicate `- Copy` files. Do not force-add those files or put passwords in GitHub.

## Host the Application

GitHub stores the source code; GitHub Pages cannot run this app's Express API or SQLite database. Connect the repository to a Node.js host that supports a persistent disk, use Node.js 20 or newer, and configure:

- Build/install command: `npm install`
- Start command: `npm start`
- `NODE_ENV=production`
- `SESSION_SECRET`: a long, random secret stored in the host's environment settings
- `OWNER_PASSWORD_HASH`: generate locally with `node scripts/hash-password.js` (input is hidden) and store the resulting hash in the host's environment settings for initial setup. The first startup seeds it into the private database; later owner dashboard password changes persist there and take precedence over this initial value.
- `STORAGE_DIRECTORY`: the absolute path of the host's persistent disk mount, for example `/var/data`

Attach persistent storage at the same `STORAGE_DIRECTORY`. The SQLite database and uploaded product photos are both kept there. Do not use an ephemeral filesystem for this path. Back up the database and uploads, and use HTTPS.

The customer storefront and owner dashboard should remain on the same origin so the secure, HTTP-only owner session cookie works. Unauthenticated requests for `/owner.html` redirect to `/owner-login.html`; owner APIs require the same server session. The current session store is in process memory, so run one application instance unless sessions are moved to shared storage.

After deployment, test the customer URL, `/owner.html` while signed out, owner sign-in, product and payment-method updates, and the public site from a separate browser session. The owner dashboard should never be added to public navigation.