import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const endpoint = (process.env.ROYAL_LEAD_ENDPOINT || '').trim();
const outputPath = resolve('public/runtime-config.js');
const contents = `// Gerado automaticamente. Não inclua segredos: este arquivo é público.
// TODO: definir ROYAL_LEAD_ENDPOINT no ambiente quando o backend estiver disponível.
window.__ROYAL_CONFIG__ = Object.freeze({
    leadEndpoint: ${JSON.stringify(endpoint)}
});
`;

await writeFile(outputPath, contents, 'utf8');
console.log(`Runtime config gerado (${endpoint ? 'endpoint configurado' : 'endpoint pendente'}).`);
