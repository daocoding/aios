# aiOS Content Review on Cloudflare (Pages + Functions + D1)

The same approval UI and JSON API as `apps/content-review`, running on **your own** Cloudflare account. Your queue lives in your own D1 database, and you can stay on the free tier.

```
cloudflare/
  public/index.html            # UI (identical to the Python app)
  functions/api/[[path]].js    # API: /api/login, /api/posts, /api/bulk, ...
  schema.sql                   # D1 table
  wrangler.toml                # Pages config + D1 binding
```
Differences from the Python app: health check is `/api/healthz`; images are served by redirecting to the `image_path` when it's an `https://` URL (for example an R2 public bucket), not from local disk.

Deploy steps are in [`AGENT_SETUP.md`](../AGENT_SETUP.md).
