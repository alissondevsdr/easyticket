// backend/build.js
const esbuild = require('esbuild')
const path = require('path')

esbuild.build({
  entryPoints: ['server.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/server.bundle.js',
  format: 'cjs',

  // Deixa fora do bundle tudo que tem binários nativos
  external: [
    '@prisma/client',
    'prisma',
    'whatsapp-web.js',
    'puppeteer',
    'puppeteer-core',
    'qrcode-terminal',
    'qrcode',
    'bufferutil',
    'utf-8-validate',
    'bcryptjs',
    'fsevents',
  ],

  // Ignora o .env — em produção as variáveis vêm do Electron
  define: {
    'process.env.NODE_ENV': '"production"'
  },

}).then(() => {
  console.log('✅ Backend bundlado em dist/server.bundle.js')
}).catch(e => {
  console.error('❌ Erro no bundle:', e)
  process.exit(1)
})
