import next from 'eslint-config-next';

const config = [
  ...next,
  { ignores: ['.next/**', '.open-next/**', '.wrangler/**', 'e2e/.results/**', 'public/sw.js', 'next-env.d.ts'] },
];

export default config;
