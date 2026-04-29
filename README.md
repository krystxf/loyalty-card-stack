# Loyalty card stack

A self-hosted loyalty card system that issues Apple Wallet passes for cafes and small businesses. Customers add a pass to their phone, staff scan its QR code to add stamps, and the pass updates over the air via Apple's PassKit web service.

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
