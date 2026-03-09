// electron/main.js
const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')
const { execSync } = require('child_process')
const fs = require('fs')

let mainWindow

const isDev = !app.isPackaged

const backendDir = isDev
  ? path.join(__dirname, '..', 'backend')
  : path.join(process.resourcesPath, 'backend')

const dbDir = isDev
  ? backendDir
  : path.join(app.getPath('userData'), 'database')

const dbPath = path.join(dbDir, 'easyticket.db')

// ─── Log helper (grava arquivo em userData para debug em produção) ─────────────
const logFile = path.join(app.getPath('userData'), 'easyticket.log')
function log(...args) {
  const msg = `[${new Date().toISOString()}] ${args.join(' ')}\n`
  console.log(...args)
  try { fs.appendFileSync(logFile, msg) } catch (_) {}
}

function ensureDbDir() {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
}

function setEnv() {
  process.env.DATABASE_URL = `file:${dbPath}`
  process.env.SECRET_KEY   = 'easyticket-secret-key-local'
  process.env.PORT         = '3001'
}

// ─── Migrate usando o binário do Prisma dentro do node_modules ────────────────
function runMigrate() {
  try {
    log('Rodando migrate...')

    // Caminho do CLI do Prisma embutido no backend
    const prismaBin = path.join(backendDir, 'node_modules', 'prisma', 'build', 'index.js')

    execSync(`node "${prismaBin}" migrate deploy`, {
      cwd: backendDir,
      env: { ...process.env },
      stdio: 'pipe',
      shell: true
    })
    log('Migrate concluido.')
  } catch (e) {
    log('Migrate erro:', e.stderr?.toString() || e.stdout?.toString() || e.message)
  }
}

// ─── Seed usando o Node embutido no Electron ──────────────────────────────────
async function runSeed() {
  try {
    log('Rodando seed...')
    const { PrismaClient } = require(path.join(backendDir, 'node_modules', '@prisma', 'client'))
    const bcrypt = require(path.join(backendDir, 'node_modules', 'bcryptjs'))

    const prisma = new PrismaClient({
      datasources: { db: { url: `file:${dbPath}` } }
    })

    const existing = await prisma.user.findUnique({ where: { email: 'admin@easyticket.com' } })
    if (!existing) {
      const hash = await bcrypt.hash('admin123', 10)
      await prisma.user.create({ data: { email: 'admin@easyticket.com', password: hash } })
      log('Usuario padrao criado.')
    } else {
      log('Usuario ja existe.')
    }
    await prisma.$disconnect()
  } catch (e) {
    log('Seed erro:', e.message)
  }
}

// ─── Backend rodando no mesmo processo do Electron ────────────────────────────
function startBackend() {
  try {
    log('Iniciando backend em', backendDir)
    require(path.join(backendDir, isDev ? "server.js" : "server.bundle.js"))
    log('Backend iniciado.')
  } catch (e) {
    log('Erro ao iniciar backend:', e.message, e.stack)
  }
}

// ─── Aguarda o backend responder ──────────────────────────────────────────────
function waitForBackend(maxMs = 15000) {
  const http = require('http')
  return new Promise((resolve) => {
    const start = Date.now()
    const check = () => {
      const req = http.get('http://localhost:3001/health', res => {
        if (res.statusCode < 500) return resolve(true)
        retry()
      })
      req.on('error', retry)
      req.setTimeout(500, () => { req.destroy(); retry() })
    }
    const retry = () => {
      if (Date.now() - start > maxMs) { log('Backend timeout, abrindo mesmo assim.'); return resolve(false) }
      setTimeout(check, 300)
    }
    check()
  })
}

// ─── Janela principal ─────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    frame: false, backgroundColor: '#0d0f14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    show: false,
  })

  const indexPath = isDev
    ? path.join(__dirname, '..', 'index.html')
    : path.join(__dirname, '..', 'index.html')

  mainWindow.loadURL(`file://${indexPath}`)
  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window-close', () => mainWindow?.close())

// ─── Boot ─────────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  log('=== EasyTicket iniciando ===')
  log('isDev:', isDev)
  log('backendDir:', backendDir)
  log('dbPath:', dbPath)

  ensureDbDir()
  setEnv()
  runMigrate()
  await runSeed()
  startBackend()
  await waitForBackend()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
