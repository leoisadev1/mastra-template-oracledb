# Mastra Weather Agent with Oracle Database

A [Mastra](https://mastra.ai) weather agent and workflow that store all data in Oracle Database through `@mastra/oracledb`. Threads, messages, workflow snapshots, and traces persist in Oracle with `OracleStore`. Vector search is available through `OracleVector`. The agent answers weather questions with live data from Open-Meteo, and the workflow plans activities from a forecast.

## Deploy on Railway

1. Deploy this repo as a service. Railway builds it with `pnpm build` and starts it with `pnpm start` (see `railway.json`). The server listens on port `4111`.
2. Add a second service for Oracle Database from this same repo:
   - Root directory: `docker/oracle`. Railway builds the Dockerfile it finds there.
   - Volume: mount at `/opt/oracle/oradata`. Give it at least 5 GB; the extracted database uses about 3.2 GB.
   - Variable: `APP_USER_PASSWORD=<choose a password>`. Use 12 to 30 letters and digits only.
     The Oracle image puts this value into a SQL statement, so quotes, `@`, `/`, and spaces can
     break the user it creates and leave the app with `ORA-01017`.
   - The image listens on port `1521`.

   The Dockerfile wraps the Oracle entrypoint. The wrapper is required: Railway creates the
   volume owned by root, but the database runs as the `oracle` user and cannot write its data
   files. The wrapper also clears a partial first boot, because the extractor otherwise stops on
   an interactive overwrite prompt and the service restarts forever.
3. Set the environment variables on the app service (see table below). Point `ORACLE_DATABASE_CONNECT_STRING` at the Oracle service over the private network, for example `oracle.railway.internal:1521/FREEPDB1`.

Note: the Oracle container needs about a minute on first boot to extract and open the database. A later restart reuses the volume and is ready in about ten seconds. The app service restarts until Oracle answers (`ON_FAILURE`, 10 retries).

## Services

- **App** — this repo. Long-running Mastra server on port `4111`.
- **Oracle Database** — `docker/oracle/Dockerfile`, based on `gvenzl/oracle-free:23-slim-faststart`, port `1521`, volume at `/opt/oracle/oradata`.

## Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | OpenAI API key for the agent's model. |
| `ORACLE_DATABASE_USER` | No | Oracle application user. Defaults to `mastra`, the user the Oracle image creates. |
| `ORACLE_DATABASE_PASSWORD` | Yes | Password for the Oracle user. Matches `APP_USER_PASSWORD`. |
| `ORACLE_DATABASE_CONNECT_STRING` | Yes | Oracle connect string, `<host>:1521/FREEPDB1`. Defaults to `localhost:1521/FREEPDB1` for local development. |

## Local development

```bash
pnpm install
cp .env.example .env   # fill in OPENAI_API_KEY and the Oracle values
docker compose up -d --wait   # starts Oracle locally (first boot takes a minute)
pnpm dev
```

Mastra Studio opens at `http://localhost:4111`. Chat with the weather agent, then check the Threads sidebar and the Observability page — both read from Oracle.

## Endpoints to try

List agents:

```bash
curl -s http://localhost:4111/api/agents
```

Ask the weather agent:

```bash
curl -s -X POST http://localhost:4111/api/agents/weatherAgent/generate \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is the weather in Paris?"}]}'
```

Run the weather workflow:

```bash
curl -s -X POST "http://localhost:4111/api/workflows/weatherWorkflow/start-async" \
  -H "Content-Type: application/json" \
  -d '{"inputData": {"city": "Berlin"}}'
```
