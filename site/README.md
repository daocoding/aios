# site/: aios.pages.dev landing page
This is a static site with no build step. To deploy it to Cloudflare Pages: `npx wrangler pages deploy site --project-name aios` (production URL `aios.pages.dev` if the project name is available), or connect the repo in the Pages dashboard with build output directory `site`.
