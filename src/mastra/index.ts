import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { Observability, MastraStorageExporter, SensitiveDataFilter } from '@mastra/observability';
import { OraclePoolManager, OracleStore, OracleVector } from '@mastra/oracledb';
import { weatherAgent } from './agents/weather-agent';
import { weatherWorkflow } from './workflows/weather-workflow';

// One Oracle connection pool shared by storage and vectors.
const poolManager = new OraclePoolManager({
  user: process.env.ORACLE_DATABASE_USER,
  password: process.env.ORACLE_DATABASE_PASSWORD,
  // standalone: fall back to the local docker-compose Oracle instance
  connectString: process.env.ORACLE_DATABASE_CONNECT_STRING ?? 'localhost:1521/FREEPDB1',
});

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
