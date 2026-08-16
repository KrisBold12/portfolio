# Deployment

One 4-vCPU Infomaniak VPS on Ubuntu 24.04 serves the whole site from one
origin: nginx terminates TLS, serves the built front end, and forwards `/api`
to a container on loopback. There is no CORS configuration anywhere in the
FastAPI service because from the browser's point of view there is one host.

The server holds a clone of this repository at `/opt/portfolio`. Nothing is
copied onto it by hand, which is the property the rest of this file exists to
keep: `git log -1` there answers what is deployed, and `git status` answers
whether anyone changed it outside git.

Getting to that took two corrections. The compose file was originally copied up
with `scp` while its own header claimed the deploy was answerable from git, and
the front end was copied the same way for longer, because `dist/` is not in the
repository and there was nothing to pull. Both are pulls now.

## Deploying

The two halves move independently and neither waits for the other.

**The API.** The model is baked into the image, so a deploy is a tag change.
Build and push from a machine with Docker, tagging with the commit being
deployed, which must already be on `main`:

```
cd serving
docker build -t ghcr.io/krisbold12/dogbreed-serving:<commit> .
docker run --rm -p 8000:8000 ghcr.io/krisbold12/dogbreed-serving:<commit>
curl -s localhost:8000/health          # must name the experiment you expect
docker push ghcr.io/krisbold12/dogbreed-serving:<commit>
```

Then pin the tag in `serving/compose.yaml`, commit, push, and on the server:

```
cd /opt/portfolio && git pull
docker compose -f serving/compose.yaml pull
docker compose -f serving/compose.yaml up -d
```

`up -d` on an unchanged tag is a no-op, so running it twice costs nothing and
proves nothing changed.

**The front end.** `dist/` is not versioned, so the build runs on the server
and nginx's root points straight at its output:

```
cd /opt/portfolio && git pull
cd web && npm ci && npm run build
```

No reload is needed. nginx serves files, and `npm run build` replaces them.
Only a change to a file in `deploy/nginx/` needs `sudo nginx -t && sudo
systemctl reload nginx` after the pull, and both files are symlinks into the
clone so the pull is the update.

## What the build produces

`npm run build` does four things, and the last two are the ones worth knowing
about:

```
tsc -b                                          typecheck
vite build                                      the client bundle
vite build --ssr src/entry-server.tsx           the same app, for Node
node scripts/prerender.mjs                      one real HTML file per route
```

The site is a client-rendered SPA, so before the prerender step every URL
served an empty `<div id="root">` and the home page's title. Anything that does
not execute JavaScript received a blank document, and a shared link to the
project page previewed as the portfolio index. The prerender writes
`dist/index.html` and `dist/projects/dog-breed/index.html` with the markup and
the per-route head tags, and React hydrates on top.

`web/public/og.png` is generated, not drawn: `python scripts/og-image.py` reads
the palette out of `src/styles/tokens.css`, so the link preview cannot end up a
different colour from the site. It is committed, so the build does not need
Pillow.

## First-time setup

Recorded because it is otherwise only in one person's memory.

```
sudo git clone https://github.com/KrisBold12/portfolio.git /opt/portfolio
sudo chown -R ubuntu:ubuntu /opt/portfolio

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs

sudo ln -sfn /opt/portfolio/deploy/nginx/tls-common.conf /etc/nginx/snippets/tls-common.conf
sudo ln -sfn /opt/portfolio/deploy/nginx/kb-portfolio.conf /etc/nginx/sites-available/kb-portfolio.conf
sudo ln -sfn /etc/nginx/sites-available/kb-portfolio.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Node comes from NodeSource because Ubuntu 24.04 packages 18.19 and Vite 8 needs
20.19 or newer.

Certificates are issued with `certbot certonly --webroot`, which never touches
nginx configuration, so the file in this directory stays the only description
of the server. The webroot is `/var/www/kb-portfolio`, which is now an empty
directory kept only for that: it used to hold the site, and the path is
recorded in certbot's renewal config, so it cannot be tidied away without
updating that too.

Only 80, 443 and SSH are open. The container binds to `127.0.0.1:8000`, so
nginx is the only route to the API and the upload limit, TLS and the access log
cannot be bypassed by finding the host and guessing the port.

## Checking a deploy

```
curl -s https://kb-portfolio.dev/api/health
curl -s https://kb-portfolio.dev/projects/dog-breed | grep -o "<title>[^<]*</title>"
```

The first must name the experiment that was built into the image. The second
must be the project page's own title and not the home page's, which is the
symptom that returns if the prerender step is ever skipped.

## What is still manual

The image tag is written by hand into `serving/compose.yaml`, which is the one
step where a deploy can point at the wrong commit and nothing will notice. A
GitHub Action building and pushing on merge to `main` would take that out, and
is the obvious next thing to build here.
