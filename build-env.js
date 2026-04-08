// build-env.js — Roda só no Vercel durante o deploy
// Gera o env.js com as credenciais a partir das variáveis de ambiente
const fs = require('fs');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('ERRO: SUPABASE_URL e SUPABASE_KEY precisam estar definidas nas env vars do Vercel.');
  process.exit(1);
}

const content = `// Gerado automaticamente pelo build — NÃO EDITAR
window.__NEXO_ENV__ = {
  SUPABASE_URL: '${url}',
  SUPABASE_KEY: '${key}'
};
`;

fs.writeFileSync('env.js', content);
console.log('env.js gerado com sucesso.');
