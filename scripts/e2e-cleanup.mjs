#!/usr/bin/env node
// E2E'nin yarım bıraktığı kayıtları siler (K-116: MariaDB). Kapsam ve sıra scripts/purge-e2e-data.mjs'te (tek liste).
//   node --env-file=.env.local scripts/e2e-cleanup.mjs
import { purge } from './purge-e2e-data.mjs';

await purge(true);
