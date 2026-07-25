# AutoMaroc — Intelligent Car Rental Assistant

A French-language car rental chatbot built with Rasa 3.6. The stack runs as three
containers: a Rasa NLU/dialogue server, a Rasa SDK action server for pricing and
availability logic, and an nginx container serving the web frontend and proxying
the chat traffic.

## Live Demo

[Live Demo](http://134.112.57.46)

The deployed instance serves the AutoMaroc landing page with the chat widget in the
bottom-right corner. It is plain HTTP (no TLS), so some browsers may flag it as
"not secure".

## Run Locally with Docker

### Prerequisites

| Requirement | Notes |
|---|---|
| Docker Engine 20.10+ | With the Compose v2 plugin (`docker compose`, not `docker-compose`) |
| Git | To clone the repository |
| ~6 GB free disk space | The `rasa/rasa:3.6.20-full` base image is large |
| 4 GB+ RAM available to Docker | The model is trained during the image build |
| Port 80 free on the host | The frontend binds `0.0.0.0:80` |

### 1. Clone the repository

```bash
git clone https://github.com/BkHassan/intelligent-car-rental-assistant.git
cd intelligent-car-rental-assistant
```

### 2. Create the environment file

`.env` is gitignored and **required** — Compose fails to start without it, because both
the `rasa` and `action-server` services declare `env_file: .env`.

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

#### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `SQLALCHEMY_SILENCE_UBER_WARNING` | `1` | Suppresses the SQLAlchemy 2.0 deprecation warning in Rasa logs |
| `LOG_LEVEL` | `INFO` | Log verbosity for the Rasa and action servers |
| `RASA_TELEMETRY_ENABLED` | `false` | Disables Rasa telemetry. Already set in `docker-compose.yml`, no action needed |

The defaults in `.env.example` work as-is — no secrets or API keys are required.

### 3. Build and start

```bash
docker compose up --build -d
```

The first build trains the Rasa model inside the image (`rasa train` runs in
`rasa/Dockerfile`), so expect **10–20 minutes** depending on your machine. Later
starts reuse the cached image and take seconds.

### 4. Wait for the services to become healthy

The frontend only starts once Rasa reports healthy, and Rasa allows a 180-second
startup grace period. Watch progress with:

```bash
docker compose ps
docker compose logs -f rasa
```

All three containers (`automaroc-rasa`, `automaroc-actions`, `automaroc-frontend`)
should eventually show `running` and the two backend services `healthy`.

### 5. Open the app

| URL | What it serves |
|---|---|
| <http://localhost> | Web UI with the chat widget |
| <http://localhost/status> | Rasa server status (proxied through nginx) |
| <http://localhost/webhooks/rest/webhook> | Rasa REST channel |

> **Note:** ports `5005` (Rasa) and `5055` (actions) use `expose`, not `ports`, so they
> are reachable only from inside the Compose network — always go through
> `http://localhost` on port 80.

Smoke-test the bot from the command line:

```bash
curl http://localhost/status

curl -X POST http://localhost/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{"sender":"test","message":"Bonjour"}'
```

### 6. Point the chat widget at your local server

`frontend/index.html` hardcodes the production address, so a freshly cloned copy
talks to the deployed server instead of your container. Change `socketUrl` to your
own host:

```js
window.WebChat.default({
    socketUrl: "http://localhost",
    socketPath: "/socket.io/",
    // ...
}, null);
```

The frontend is mounted as a read-only volume, so a browser refresh picks up the
change — no rebuild needed.

### Stopping and cleaning up

```bash
docker compose down            # stop and remove containers
docker compose down --rmi all  # also remove the built images
```

### Troubleshooting

| Symptom | Fix |
|---|---|
| `env file .env not found` | You skipped step 2 — run `cp .env.example .env` |
| `port is already allocated` | Something else uses port 80. Change the mapping to e.g. `"8080:80"` in `docker-compose.yml` |
| Widget shows "connecting" forever | `socketUrl` still points at the remote host (step 6) |
| `rasa` stuck as `starting` | Normal for up to 3 minutes on first boot; check `docker compose logs rasa` |
