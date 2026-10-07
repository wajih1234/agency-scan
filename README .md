# Agency Scan

A SaaS for web agencies. An agency adds its clients' websites, proves it controls each domain, runs a passive security scan, and downloads a PDF report branded with the agency's own name, color, and logo.

Target market: web agencies in Tunisia (and later abroad) that want to offer website security audits to their clients without doing the work by hand.

> Status: the full flow works locally (sign up, add a site, verify, scan, report, PDF, branding). Not deployed yet. See [Roadmap](#roadmap).

## What it does

1. An agency signs up and gets an account.
2. It adds a client's website (a domain).
3. It proves ownership of the domain by adding a DNS TXT record.
4. It scans the site. Six groups of passive checks run in a few seconds.
5. It reads the result (score from 0 to 100, issues sorted by severity, a "how to fix" for each) and downloads a PDF report with its own branding.

### The six checks

| Group | What is checked |
|---|---|
| Security headers | HSTS, Content-Security-Policy, X-Content-Type-Options, clickjacking protection, Referrer-Policy, Permissions-Policy |
| SSL certificate | Valid and trusted, expiry (flagged when under 14 days), modern TLS version |
| Exposed files | `/.env`, `/.git/config`, `/backup.sql`, `/wp-config.php.bak`, `/backup.zip`, `/phpinfo.php` (the content is verified, so a site that answers 200 to everything is not a false alarm) |
| Email records | SPF present and sane, DMARC present, DMARC policy enforcing |
| Redirects and cookies | HTTP redirects to HTTPS, Secure / HttpOnly / SameSite flags on homepage cookies |
| Software exposure | Version shown in the `Server` header, `X-Powered-By` header, and the CMS `generator` meta tag |

### Score

The score starts at 100 and every failed finding subtracts points: critical 30, high 12, medium 6, low 2 (never below 0). If no HTTPS connection can be opened, the scan status is `unreachable` and the score is `null` ("Not available") instead of a misleading number. A scan where some check did not finish is marked `complete: false`, and the report says so.

## Tech stack

| Part | Technology |
|---|---|
| Backend | Node.js, Express 5, MongoDB with Mongoose |
| Validation and security | Zod, argon2, jsonwebtoken, helmet, cors, cookie-parser, express-rate-limit |
| PDF | pdfmake |
| Frontend | React 19, Vite 7, Tailwind CSS 4, React Router 7 |
| Language | JavaScript (no TypeScript), ES modules |

Everything used so far is free and open source.

## Project structure

```
agency-scan/
  server/
    src/
      api.js                  starts the server and connects to MongoDB
      app.js                  Express app and route mounting
      middleware/             errors, validate (Zod), requireAuth, rateLimit
      modules/
        auth/                 register, login, refresh, logout, /me
        orgs/                 agency profile and branding
        sites/                add, list, delete, DNS verification
        scans/                start a scan, history, results
        reports/              PDF generation
      scanner/
        ssrfGuard.js          refuses private and internal addresses
        safeGet.js            the only way the scanner fetches a page
        runScan.js            runs all checks and computes the score
        checks/               headers, ssl, exposedFiles, emailRecords,
                              redirectsCookies, techExposure
  client/
    src/
      App.jsx                 session state and routes
      api.js                  fetch helper with automatic session refresh
      Login.jsx  Register.jsx  Layout.jsx
      Sites.jsx  VerifyPanel.jsx  ScanButton.jsx
      SiteDetail.jsx          report page and PDF download
      Settings.jsx            branding settings
```

Each backend module keeps its own routes, service, model, and validation schema.

## Getting started

### Prerequisites

- Node.js 20.19 or newer (tested on Node 24)
- MongoDB running locally on the default port (`mongodb://localhost:27017`)
- Git

### 1. Backend

```bash
cd server
npm install
```

Create `server/.env` (copy `server/.env.example`):

```
PORT=4000
MONGO_URI=mongodb://localhost:27017/agencyscan
JWT_ACCESS_SECRET=
```

Generate the secret and paste it after `JWT_ACCESS_SECRET=`:

```bash
node -p "require('crypto').randomBytes(48).toString('hex')"
```

Start the API:

```bash
npm run dev
```

You should see `MongoDB connected` and `API running on http://localhost:4000`. Check `http://localhost:4000/health`, which returns `{"ok":true}`.

### 2. Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server forwards every `/api` call to the API on port 4000, so the browser only talks to one address and login cookies stay first-party. This is the same idea as the Vercel rewrite planned for production.

### 3. Try the whole flow

1. Click **Create one** and register an agency.
2. Add a site (for example `example.com`).
3. Real verification needs a DNS record on a domain you control. For local testing only, open MongoDB Compass, go to the `agencyscan` database, then the `sites` collection, and set `verified` to `true` on your site.
4. Reload the page and click **Scan now**, then open **Report** and **Download PDF report**.
5. Open **Settings** to change the name, color, and logo, and download the report again.

Open downloaded PDFs in a browser. On some Windows setups the default PDF app is Word, which rearranges the layout.

## Environment variables

| Variable | Used by | Meaning |
|---|---|---|
| `PORT` | server | Port of the API (default 4000) |
| `MONGO_URI` | server | MongoDB connection string |
| `JWT_ACCESS_SECRET` | server | Secret that signs login tokens (at least 32 random characters) |
| `NODE_ENV` | server | Set to `production` in production: turns on the `Secure` cookie flag |

Never commit `.env`. It is listed in `.gitignore`, and so is `*.pdf`.

## API reference

All routes live under `/api`. Authentication uses two httpOnly cookies, so there is no token to store in the browser.

| Method and path | Description |
|---|---|
| `POST /auth/register` | Create an agency and its owner account |
| `POST /auth/login` | Log in |
| `POST /auth/refresh` | Get a new access cookie and replace the refresh token |
| `POST /auth/logout` | Log out and delete the refresh token on the server |
| `GET /auth/me` | The current user (also used to check the session) |
| `GET /org`, `PATCH /org` | Read or update name, brand color, and logo |
| `POST /sites`, `GET /sites` | Add a site, list sites |
| `DELETE /sites/:id` | Delete a site |
| `POST /sites/:id/verify` | Check the DNS TXT record and mark the site verified |
| `POST /sites/:id/scans` | Start a scan (answers 202 right away) |
| `GET /sites/:id/scans` | Scan history of a site (without findings) |
| `GET /scans/:id` | One scan with all its findings |
| `GET /scans/:id/report.pdf` | The branded PDF report |

Errors always look like `{ "error": "message" }`, and validation errors add a `details` list.

### Domain verification

Before a site can be scanned, the agency adds this DNS record at the domain's DNS provider:

```
Type:   TXT
Name:   _agencyscan.<domain>
Value:  agencyscan-verify=<token shown in the app>
```

DNS changes can take a few minutes to appear.

## Security design

The product scans other people's websites, so the rules below are not optional.

- **Ownership first.** No scan runs on a site whose domain has not been verified through DNS.
- **SSRF protection.** The scanner resolves the domain itself and refuses private, loopback, link-local, and other non-public addresses. It then connects to the approved address, never resolving the name a second time, and re-checks every redirect.
- **Limited fetching.** Only ports 80 and 443, at most 3 redirects, 8 seconds per request, and about 200 KB per response.
- **Passive checks only.** The scanner reads what any browser can read. There are no attack payloads, no port scans, and no password guessing.
- **Tenant isolation.** Every query includes the agency's `orgId` taken from the login cookie, never from the request, so one agency cannot read or change another's data.
- **Passwords and sessions.** argon2 hashes, a 10-character minimum, a 15-minute access token, and a 7-day refresh token that is single-use, stored only as a hash, and deleted on logout.
- **Brute-force limits.** Login allows 10 failed attempts per 15 minutes per IP (successful logins do not count), and registration allows 5 per hour per IP.
- **Input handling.** Every request body is validated with Zod and unknown fields are dropped (so nobody can send `"plan":"agency"`). Logos must be PNG or JPEG (SVG is refused because it can contain scripts). Text copied from scanned sites is shown as plain text, never as HTML.
- **PDF library locked down.** It cannot download anything or read files except its own fonts.

## Known limitations

- Report and finding texts are in English only.
- There is no email verification or password reset yet.
- Registering with an existing email answers 409, which reveals that the email exists.
- Replaying an old refresh token is rejected, but it does not log out the whole account yet.
- Rate-limit counters live in server memory and reset when the server restarts.
- The DNS lookup used by "Check now" can take several seconds when the record does not exist. It needs a shorter time limit.
- The exposed-files check only looks at a handful of very common paths, so a pass means "not found there", not "nothing is exposed".
- DKIM is not checked (its record name depends on the mail provider).
- The TLS check reports the version negotiated with us; it cannot prove that old versions are refused.
- Plans exist in the data model (`free`, `starter`, `pro`, `agency`, default limit of 3 sites) but there is no billing.
- There are no automated tests yet.

## Roadmap

Done: authentication with refresh tokens, rate limiting, sites with DNS verification, the six scan checks, scoring, scans API, branding, PDF reports, and the React frontend (register, login, sites, report page, settings).

Next, roughly in this order:

1. Show the demo to real agencies and note their objections and the price they would accept.
2. French reports and screens.
3. Weekly automatic scans and an email alert when a score drops.
4. Automated tests (auth, sites, scanner checks).
5. Scan history on the report page.
6. Hardening: shorter DNS time limit, environment validation, `trust proxy` setting.
7. Deployment: MongoDB Atlas free tier for the database, Render for the API, Vercel for the frontend.

### Deployment notes

- Render's free web service sleeps after 15 minutes without traffic. Weekly scans will need an external trigger (a scheduled GitHub Actions workflow or cron-job.org that calls an endpoint).
- Vercel's free Hobby plan is for non-commercial use only. Upgrade before charging customers.
- In production the frontend should proxy `/api` to the API (a rewrite in `vercel.json`), so cookies stay first-party.
- Behind Vercel and Render the server sees the proxy's address instead of the visitor's, so `trust proxy` must be set correctly or all visitors would share one rate limit.

## Troubleshooting

**`Cannot find native binding`, `not a valid Win32 application`, or a missing `lightningcss...node` file (Windows).** These come from interrupted downloads of npm's native optional packages. In `client`:

```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm cache clean --force
npm config set fetch-retries 5
npm install
```

If `lightningcss` is still missing, check the versions with `npm ls lightningcss @tailwindcss/oxide`, then install the Windows packages with the same versions:

```powershell
npm i --no-save lightningcss-win32-x64-msvc@<version> @tailwindcss/oxide-win32-x64-msvc@<version>
```

`--no-save` keeps these Windows-only packages out of `package.json`.

**`ECONNRESET` during `npm install`.** The connection dropped. Run the command again; npm continues with what it already downloaded.

**`http proxy error ... ECONNREFUSED` in the Vite terminal.** The API is not running. Start it in `server` with `npm run dev`.

**Login answers 429.** The login limit was reached. Wait 15 minutes or restart the API (counters are in memory).

**"Not authenticated" while testing with PowerShell.** The access cookie lasts 15 minutes. Log in again, or call `POST /api/auth/refresh` with the same session.

## Working together

- Nobody pushes directly to `main`. Each feature gets its own branch, then a pull request, and the other person reviews and merges.
- Keep `.env` and `*.pdf` out of Git. Before committing, run `git status` and check that neither shows up.
- Only scan sites you own or have written permission to test.

## License

Private project. License to be decided.
