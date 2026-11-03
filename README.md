
# poke_binder
 
Backend for Pokémon Binder, a web app for scanning and cataloguing a Pokémon card collection.
 
The app is split across three repos that run together locally:
 
| Repo | Local folder | What it does | Port |
|---|---|---|---|
| [`poke_binder`](https://github.com/skylordjedi/poke_binder) (this one) | `pokemon-cards-node` | Node/Express API: cards CRUD, card identification (OCR + Pokémon TCG API + vision), image storage | `3000` |
| [`poke_binder_frontend`](https://github.com/skylordjedi/poke_binder_frontend) | `pokemon-cards-frontend` | React + Vite UI | `5173` |
| [`poke_binder_vision`](https://github.com/skylordjedi/poke_binder_vision) | `poke_binder_vision` | Python FastAPI service that returns CLIP image embeddings | `8000` |
 
Alongside those, the backend needs two pieces of local infrastructure:
 
| Service | What it's for | Port |
|---|---|---|
| Postgres (via `prisma dev`) | Card data | `51214` (direct), `51215` (shadow) |
| MinIO-compatible S3 (Docker) | Card images | `9000` (S3 API), `9001` (console) |
 
---
 
## Prerequisites
 
- **Node.js** (LTS) and npm
- **Python 3**
- **Docker Desktop** (on Windows this needs WSL 2, with virtualisation enabled in the BIOS)
- **Git**
### One-time machine setup
 
```bash
# Block npm postinstall scripts (supply-chain safety). Because this is on,
# `npx prisma generate` has to be run by hand after installing.
npm config set ignore-scripts true
```
 
**Windows only:**
 
```powershell
# Keep LF line endings, so files match the Mac
git config --global core.autocrlf input
 
# Allow npm/npx scripts to run in PowerShell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
 
---
 
## First-time setup
 
### 1. Clone all three repos side by side
 
```bash
git clone https://github.com/skylordjedi/poke_binder.git pokemon-cards-node
git clone https://github.com/skylordjedi/poke_binder_frontend.git pokemon-cards-frontend
git clone https://github.com/skylordjedi/poke_binder_vision.git poke_binder_vision
```
 
Folder names don't matter, because nothing refers to the other repos by path.
 
### 2. Install backend dependencies
 
```bash
cd pokemon-cards-node
npm ci
npx prisma generate     # required because ignore-scripts is on
```
 
Use `npm ci` rather than `npm install`, so you get exactly the versions in `package-lock.json`.
 
### 3. Start the database
 
In its own terminal, which you leave running:
 
```bash
npx prisma dev
```
 
This starts a local Prisma Postgres and prints its connection strings. Press `h` in that terminal to show them again. These URLs are different on every machine, so don't copy them from another one.
 
### 4. Create `.env`
 
Create `.env` in the repo root, next to `prisma.config.ts`. It's gitignored, so it never gets committed.
 
```env
# Database: both point at the prisma dev database
DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0"
DIRECT_DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"
SHADOW_DATABASE_URL="postgres://postgres:postgres@localhost:51215/template1?sslmode=disable"
 
# Image storage (MinIO-compatible S3)
S3_ENDPOINT_URL="http://localhost:9000"
S3_REGION="us-east-1"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="pokemon-cards"
 
# Pokémon TCG API key (optional: without it you get the lower rate limit)
POKEMON_TCG_API_KEY=""
 
PORT=3000
```
 
| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | Prisma CLI (`prisma.config.ts`) | Migrations, Studio, etc. Use the URL `prisma dev` prints. |
| `DIRECT_DATABASE_URL` | The running server (`src/db.ts`, via `@prisma/adapter-pg`) | Plain Postgres URL with **no Prisma-only options** (`connection_limit` and the like), which the `pg` driver doesn't understand. If it's missing, `/health` fails with a blank Prisma error. |
| `S3_*` | `src/storage.ts` | The access and secret keys must match `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`. The bucket is created automatically when the server starts. |
| `POKEMON_TCG_API_KEY` | `src/pokemonTcgApi.ts` | Sent as `X-Api-Key` if set. |
| `PORT` | `src/server.ts` | Defaults to `3000`. |
| `DEBUG_OCR` | `src/ocr.ts` | Optional. Set it to write OCR debug images. |
 
### 5. Build the tables
 
In a second terminal, with `prisma dev` still running:
 
```bash
npx prisma migrate dev
```
 
To check it worked, run `npx prisma studio` and confirm the tables are there.
 
### 6. Start image storage
 
The official `minio/minio` image is no longer on Docker Hub, so this uses the `pgsty/silo` fork, which is S3-compatible and works as a drop-in replacement. Make sure Docker Desktop is running first.
 
macOS / Linux:
 
```bash
docker run -d --name minio -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  -v minio-data:/data docker.io/pgsty/silo:RELEASE.2026-09-16T00-00-00Z \
  server /data --console-address ":9001"
```
 
Windows (PowerShell):
 
```powershell
docker run -d --name minio -p 9000:9000 -p 9001:9001 `
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin `
  -v minio-data:/data docker.io/pgsty/silo:RELEASE.2026-09-16T00-00-00Z `
  server /data --console-address ":9001"
```
 
The console is at http://localhost:9001, and you log in with the root user and password from the command above. The `minio-data` volume keeps images across restarts. After a reboot, run `docker start minio`.
 
### 7. Set up the vision service
 
```bash
cd ../poke_binder_vision
python -m venv .venv
 
# macOS / Linux
source .venv/bin/activate
# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1
 
pip install -r requirements.txt
```
 
Don't copy a venv between machines, because venvs are OS-specific. On Windows, `uvloop` doesn't install, since it only supports macOS and Linux. Its line in `requirements.txt` needs the marker `; sys_platform != "win32"`. Uvicorn falls back to asyncio without it.
 
### 8. Set up the frontend
 
```bash
cd ../pokemon-cards-frontend
npm ci
```
 
No `.env` is needed, because `VITE_API_URL` defaults to `http://localhost:3000`.
 
---
 
## Running everything
 
Five processes, each in its own terminal (MinIO runs in the background in Docker):
 
| # | Folder | Command |
|---|---|---|
| 1 | `pokemon-cards-node` | `npx prisma dev` |
| 2 | — | `docker start minio` (if it isn't already running) |
| 3 | `poke_binder_vision` | activate the venv, then `uvicorn main:app --port 8000` |
| 4 | `pokemon-cards-node` | `npx tsx watch src/server.ts` |
| 5 | `pokemon-cards-frontend` | `npm run dev` |
 
Then open http://localhost:5173.
 
The first time the vision service starts, it downloads the `clip-ViT-B-32` model. The first time the backend runs OCR, tesseract.js downloads `eng.traineddata`, which is gitignored. Both are one-off downloads.
 
`tsx watch` restarts on code changes but **not** on `.env` changes, so restart the server by hand after editing `.env`.
 
### Health checks
 
| URL | Expect |
|---|---|
| http://localhost:3000/health | `{"status":"ok","cardCount":N}`, which confirms the database connection |
| http://localhost:8000/health | vision service is up |
| http://localhost:9001 | MinIO console, where the `pokemon-cards` bucket should be listed |
 
---
 
## API
 
All routes are under `http://localhost:3000`. CORS allows `http://localhost:5173`.
 
| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Status and card count |
| `GET` | `/api/cards` | List cards |
| `GET` | `/api/cards/:id` | Get one card |
| `POST` | `/api/cards` | Create a card (multipart, with an `image` field) |
| `PATCH` | `/api/cards/:id` | Update a card |
| `DELETE` | `/api/cards/:id` | Delete a card and its image |
| `POST` | `/api/identify` | Identify a card from a photo (multipart, with an `image` field) |
 
---
 
## Database changes
 
```bash
# after editing prisma/schema.prisma
npx prisma migrate dev --name describe_the_change
npx prisma generate
```
 
Commit the new folder under `prisma/migrations/`.
 
---
 
## Moving to a new machine
 
GitHub has the code but not your data. On a new machine you need to:
 
- recreate `.env` (step 4), using that machine's `prisma dev` URLs
- run the migrations again (step 5). The database starts empty.
- start a new MinIO volume (step 6). Images don't come across.
- make a new Python venv (step 7)
---
 
## Troubleshooting
 
| Error | Cause and fix |
|---|---|
| `The datasource.url property is required in your Prisma config file` | `DATABASE_URL` isn't set. Check that `.env` exists in the repo root and isn't saved as `.env.txt` (`Get-ChildItem -Force .env*` on Windows). |
| `P3005: The database schema is not empty` | The database has tables but no migration history. On a local `prisma dev` database, `npx prisma migrate reset` wipes it and applies all migrations. **Never run that against a database with real data.** |
| Blank `PrismaClientKnownRequestError` on `prisma.card.count()` | `DIRECT_DATABASE_URL` is missing, or `prisma dev` isn't running. |
| `Could not ensure S3 bucket exists: Region is missing` | The `S3_*` variables aren't in `.env`, or the server wasn't restarted after you added them. |
| `failed to connect to the docker API ... dockerDesktopLinuxEngine` | Docker Desktop isn't running. Start it and wait for "Engine running". |
| `pull access denied for minio/minio` | That image has been removed. Use the `pgsty/silo` image from step 6. |
| `Prisma client not generated` | Run `npx prisma generate`. With `ignore-scripts` on, npm won't do it for you. |
| `npx`/`npm` blocked in PowerShell | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |