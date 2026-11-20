# Home server deployment

The app is entirely client-side (studies live in the browser's localStorage), so
it is served as a static export. It moved off Vercel in November 2026.

- **Host**: CT 106 `tools-hub` on pve3 (`192.168.1.40`), next to the other
  engineering tools.
- **Files**: `/var/www/el-protection`, served by nginx on port **8081**
  (`/etc/nginx/sites-available/static-sites.conf`). Clean URLs: `/report`
  serves `report.html`.
- **Tailnet**: `https://el-protection.tail6b765.ts.net`, a userspace Tailscale
  node (`tailscaled-site@el-protection.service`) with `tailscale serve` in front
  of port 8081. Tailnet-only; don't enable Funnel.
- **Use the HTTPS tailnet URL.** The app calls `crypto.randomUUID()`, which
  browsers only provide in a secure context, so the plain-HTTP LAN address
  (`http://192.168.1.40:8081`) shows "This page couldn't load".

## Updating

```bash
npm ci
STATIC_EXPORT=1 npx next build          # writes out/
tar czf /tmp/el-protection-out.tgz -C out .
scp -i ~/.ssh/pve_orca_dev /tmp/el-protection-out.tgz root@192.168.1.176:/tmp/
ssh -i ~/.ssh/pve_orca_dev root@192.168.1.176 "
  pct push 106 /tmp/el-protection-out.tgz /tmp/el.tgz &&
  pct exec 106 -- bash -c 'rm -rf /var/www/el-protection.new && mkdir /var/www/el-protection.new &&
    tar xzf /tmp/el.tgz -C /var/www/el-protection.new &&
    rm -rf /var/www/el-protection.old && mv /var/www/el-protection /var/www/el-protection.old &&
    mv /var/www/el-protection.new /var/www/el-protection && rm /tmp/el.tgz'
"
```

No restart is needed. Roll back by swapping `el-protection.old` back in.

Note: studies saved on the old `el-protection.vercel.app` address stay in that
origin's localStorage and don't carry over to the new address.
