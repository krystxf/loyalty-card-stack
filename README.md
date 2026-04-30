# Loyalty card stack

A self-hosted loyalty card system that issues Apple Wallet **and** Google Wallet passes for cafes and small businesses. Customers add a pass to their phone, staff scan its QR code to add stamps, and the pass updates over the air via Apple's PassKit web service or the Google Wallet REST API.

## Setup

### Cloudflare Quick Tunnel

Apple Wallet requires the pass web service to be reachable over public HTTPS, so for local development you need to expose `next dev` through a tunnel. Cloudflare Quick Tunnels are the simplest option — no account, no DNS, no config.

1. Install `cloudflared`:

   ```sh
   brew install cloudflared
   ```

2. In a second terminal, open a quick tunnel to it:

   ```sh
   cloudflared tunnel --url http://localhost:3000
   ```

   `cloudflared` will print a `https://<random>.trycloudflare.com` URL. That URL is your public HTTPS endpoint for as long as the command is running.

3. Put the tunnel URL in `.env.local` so the pass and its web service point at the public host:

   ```sh
   PUBLIC_BASE_URL=https://<random>.trycloudflare.com
   ```

   Start `pnpm dev` after changing env vars.

Notes:

- Quick Tunnel URLs are ephemeral — you get a new hostname every run. Re-issued passes will reference the old URL, so regenerate any passes you want to test live updates on after restarting the tunnel.
- For a stable hostname, use a named tunnel (`cloudflared tunnel create`) bound to a domain on your Cloudflare account.

### Apple Wallet certificates

To sign passes you need three things from Apple: your **Team Identifier**, a **Pass Type Identifier**, and a **Pass Type ID certificate** (with its private key). All of this requires a paid Apple Developer Program membership.

1. **Find your Team Identifier.** Sign in to the [Apple Developer account page](https://developer.apple.com/account) → *Membership details*. Copy the 10-character Team ID into `APPLE_TEAM_IDENTIFIER`.

2. **Register a Pass Type Identifier.** Go to [Certificates, Identifiers & Profiles → Identifiers](https://developer.apple.com/account/resources/identifiers/list/passTypeId), click **+**, choose *Pass Type IDs*, and pick a reverse-DNS name like `pass.com.yourdomain.loyalty`. Put that exact string in `APPLE_PASS_TYPE_IDENTIFIER`.

3. **Create the signing certificate.** On macOS open *Keychain Access* → *Certificate Assistant* → *Request a Certificate From a Certificate Authority…*

   - Email: your Apple ID email
   - Common Name: e.g. `Loyalty Pass Signing`
   - **Saved to disk** (do not select "let CA issue")

   This produces a `.certSigningRequest` file and stores the matching **private key** in your login keychain.

4. **Issue the certificate.** Back in the Apple Developer portal, open your Pass Type ID, click **Create Certificate**, upload the `.certSigningRequest`, and download the resulting `pass.cer`.

5. **Export key + cert as a `.p12`.** Double-click `pass.cer` to import it into Keychain Access. In *login* → *My Certificates*, find the entry that expands to show its private key, right-click → *Export…* → save as `pass.p12`. Set a passphrase when prompted.

6. **Convert `.p12` to PEM** (the format `@walletpass/pass-js` consumes):

   ```sh
   mkdir -p .secrets/apple-wallet
   # public certificate
   openssl pkcs12 -in pass.p12 -clcerts -nokeys -out .secrets/apple-wallet/pass.pem -legacy
   # private key (encrypted; passphrase will go in APPLE_PASS_KEY_PASSPHRASE)
   openssl pkcs12 -in pass.p12 -nocerts -out .secrets/apple-wallet/pass-signing.key -legacy
   ```

   The `-legacy` flag is needed on OpenSSL 3+ because Keychain still exports `.p12` files using the older RC2/3DES algorithms.

7. **Apple WWDR intermediate.** PassKit also needs Apple's *Worldwide Developer Relations G4* intermediate certificate to complete the trust chain. A copy is checked in at `cert/AppleWWDRCAG4.pem` (it's a public CA cert from <https://www.apple.com/certificateauthority/>) — no action needed.

8. **Wire it up in `.env.local`:**

   ```sh
   APPLE_TEAM_IDENTIFIER=ABCDE12345
   APPLE_PASS_TYPE_IDENTIFIER=pass.com.yourdomain.loyalty
   APPLE_PASS_CERT_PATH=.secrets/apple-wallet/pass.pem
   APPLE_PASS_KEY_PATH=.secrets/apple-wallet/pass-signing.key
   APPLE_PASS_KEY_PASSPHRASE=<the passphrase from step 5>
   ```

   For deployments where you can't ship files, paste the PEM contents into `APPLE_PASS_CERT_PEM` / `APPLE_PASS_PRIVATE_KEY_PEM` instead — they take precedence over the path variables.

Pass Type ID certificates expire after one year. When that happens, repeat steps 3–6 with a fresh CSR; the Pass Type ID itself stays the same.

### Google Wallet credentials

To issue Google Wallet loyalty passes you need an **Issuer ID** and a **Service Account** with the *Wallet Object Issuer* role. All of this is set up through the [Google Wallet API console](https://pay.google.com/business/console/) and [Google Cloud console](https://console.cloud.google.com/).

1. **Enable the Google Wallet API.** In the Google Cloud project that will host the integration, enable the *Google Wallet API* under [APIs & Services](https://console.cloud.google.com/apis/library/walletobjects.googleapis.com).

2. **Create the issuer account.** Go to the [Google Wallet Business Console](https://pay.google.com/business/console/), accept the terms, and copy the numeric **Issuer ID** into `GOOGLE_WALLET_ISSUER_ID`. Until your account is approved for production, only the email addresses you list under *Test accounts* can save passes from your issuer.

3. **Create a service account.** In the Google Cloud project, open [IAM → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts), create a new service account (e.g. `loyalty-wallet@<project>.iam.gserviceaccount.com`), and give it no IAM roles — Wallet permissions are granted in the Wallet console, not Cloud IAM.

4. **Authorize the service account in the Wallet console.** Back in the Wallet Business Console, open *Users* and add the service account email with the *Developer* role so it can manage classes and objects for the issuer.

5. **Download a JSON key.** From the service account page, *Keys → Add key → Create new key → JSON*. Save the file at `.secrets/google-wallet/service-account.json` (this path is the default `GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH`). Treat it like a password.

6. **Wire it up in `.env.local`:**

   ```sh
   IS_GOOGLE_WALLET_ENABLED=true
   GOOGLE_WALLET_ISSUER_ID=3388000000022XXXXXX
   GOOGLE_WALLET_CLASS_SUFFIX=loyalty
   GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=loyalty-wallet@<project>.iam.gserviceaccount.com
   GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH=.secrets/google-wallet/service-account.json
   ```

   For deployments where you can't ship files, paste the JSON contents into `GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_JSON`, or supply just the PEM in `GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY` alongside `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL`. Inline values take precedence over the path variable.

   `PUBLIC_BASE_URL` is required when Google Wallet is enabled — the loyalty class references `${PUBLIC_BASE_URL}/google-wallet/logo.png` for the program logo, and the save link's JWT lists it under `origins`.

7. **Loyalty class.** The class is created and updated automatically on first save (id: `${GOOGLE_WALLET_ISSUER_ID}.${GOOGLE_WALLET_CLASS_SUFFIX}`). New issuers start in `UNDER_REVIEW`, which is fine for testing — only listed test accounts can save the pass until the class is approved by Google for production.

When stamps change, the server `PATCH`es the loyalty object via the Wallet REST API; saved passes refresh automatically on the user's device.
