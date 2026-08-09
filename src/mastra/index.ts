import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { Observability, MastraStorageExporter, SensitiveDataFilter } from '@mastra/observability';
import { OraclePoolManager, OracleStore, OracleVector } from '@mastra/oracledb';
import { weatherAgent } from './agents/weather-agent';
import { weatherWorkflow } from './workflows/weather-workflow';

// One Oracle connection pool shared by storage and vectors.
const poolManager = new OraclePoolManager({
  // standalone: `mastra` is the application user the Oracle image creates
  user: process.env.ORACLE_DATABASE_USER ?? 'mastra',
  password: process.env.ORACLE_DATABASE_PASSWORD,
  // standalone: fall back to the local docker-compose Oracle instance
  connectString: process.env.ORACLE_DATABASE_CONNECT_STRING ?? 'localhost:1521/FREEPDB1',
});

// standalone: Oracle takes about a minute to initialize on its first boot. The
// storage migration runs as soon as `new Mastra(...)` is constructed, and an
// unreachable database rejects it with an uncaught error that kills the
// process. Wait for Oracle to answer first, so the server survives a cold start
// instead of burning its restart budget.
async function waitForOracle(timeoutMs = 5 * 60_000, intervalMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  while (true) {
    attempt++;
    try {
      await poolManager.withConnection(async connection => {
        await connection.execute('select 1 from dual');
      });
      if (attempt > 1) {
        console.log(`Oracle is reachable after ${attempt} attempts.`);
      }
      return;
    } catch (error) {
      if (Date.now() >= deadline) {
        throw error;
      }
      console.log(`Oracle is not reachable yet (attempt ${attempt}), retrying in ${intervalMs / 1000}s.`);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
}

await waitForOracle();

export const mastra = new Mastra({
  agents: { weatherAgent },
  workflows: { weatherWorkflow },
  // Threads, messages, workflow snapshots, and traces persist in Oracle.
  storage: new OracleStore({ id: 'oracle-storage', poolManager }),
  // Registered so vector search is available to any agent/tool that needs it
  // (e.g. `mastra.getVector('oracleVector')`).
  vectors: {
    oracleVector: new OracleVector({ id: 'oracle-vector', poolManager }),
  },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  // standalone: export traces to the Oracle-backed store, so the Studio
  // Observability page reads real spans instead of nothing.
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [new MastraStorageExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});
