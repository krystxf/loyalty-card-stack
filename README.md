# Loyalty card stack

A self-hosted loyalty card system that issues Apple Wallet passes for cafes and small businesses. Customers add a pass to their phone, staff scan its QR code to add stamps, and the pass updates over the air via Apple's PassKit web service.

Built to deploy on Vercel out of the box — connect the repo, add the env vars below, and the rest (Postgres via the Prisma Postgres marketplace integration, Fluid Compute functions, automatic HTTPS) is handled by the platform. Self-hosting on your own infrastructure works too; nothing here is Vercel-specific.

## Setup

### Cloudflare Quick Tunnel (optional)

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

> [!NOTE]
> - Quick Tunnel URLs are ephemeral — you get a new hostname every run. Re-issued passes will reference the old URL, so regenerate any passes you want to test live updates on after restarting the tunnel.
> - For a stable hostname, use a named tunnel (`cloudflared tunnel create`) bound to a domain on your Cloudflare account.



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

6. **Convert `.p12` to PEM** (the format `passkit-generator` consumes):

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
