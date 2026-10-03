import next from 'eslint-config-next';

export default [
  ...next,
  { ignores: ['.next/**', '.open-next/**', 'public/sw.js', 'next-env.d.ts'] },
];
