# Mastra Weather Agent with Oracle Database

A [Mastra](https://mastra.ai) weather agent and workflow that store all data in Oracle Database through `@mastra/oracledb`. Threads, messages, workflow snapshots, and traces persist in Oracle with `OracleStore`. Vector search is available through `OracleVector`. The agent answers weather questions with live data from Open-Meteo, and the workflow plans activities from a forecast.

## Deploy on Railway

1. Deploy this repo as a service. Railway builds it with `pnpm build` and starts it with `pnpm start` (see `railway.json`). The server listens on port `4111`.
2. Add a second service for Oracle Database:
   - Image: `gvenzl/oracle-free:23-slim-faststart`
   - Volume: mount at `/opt/oracle/oradata`
   - Variables: `ORACLE_RANDOM_PASSWORD=true`, `APP_USER=mastra`, `APP_USER_PASSWORD=<choose a password>`
   - The image listens on port `1521`.
3. Set the environment variables on the app service (see table below). Point `ORACLE_DATABASE_CONNECT_STRING` at the Oracle service over the private network, for example `oracle.railway.internal:1521/FREEPDB1`.

Note: the Oracle container needs one to two minutes on first boot to create the database. The app retries are covered by the `ON_FAILURE` restart policy.

## Services

- **App** — this repo. Long-running Mastra server on port `4111`.
- **Oracle Database** — image `gvenzl/oracle-free:23-slim-faststart`, port `1521`, volume at `/opt/oracle/oradata`.

## Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | OpenAI API key for the agent's model. |
| `ORACLE_DATABASE_USER` | Yes | Oracle application user. Matches `APP_USER` on the Oracle service. |
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
