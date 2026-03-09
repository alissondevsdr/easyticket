// ════════════════════════════════════════════════════════════
//  ROLE SELECT — role-select.js
//  Controla a seleção de modo PDV / ADM após o login
// ════════════════════════════════════════════════════════════

const isElectron = typeof window.electronAPI !== 'undefined'

// ── Helpers de navegação ──────────────────────────────────
function goToDashboard() {
  window.location.href = 'dashboard.html'
}

function goToLogin() {
  localStorage.removeItem('authToken')
  sessionStorage.removeItem('dashMode')
  if (isElectron) {
    window.location.href = '../../index.html'
  } else {
    window.location.href = '../../index.html'
  }
}

// ── Verificação de autenticação ───────────────────────────
const token = localStorage.getItem('authToken')
if (!token) {
  goToLogin()
}

// ── Referências DOM ───────────────────────────────────────
const cardPDV       = document.getElementById('cardPDV')
const cardADM       = document.getElementById('cardADM')
const logoutBtn     = document.getElementById('logoutBtn')
const admOverlay    = document.getElementById('admOverlay')
const admModalClose = document.getElementById('admModalClose')
const admCancelBtn  = document.getElementById('admCancelBtn')
const admConfirmBtn = document.getElementById('admConfirmBtn')
const admPasswordInput = document.getElementById('admPasswordInput')
const admTogglePass = document.getElementById('admTogglePass')
const admEyeIcon    = document.getElementById('admEyeIcon')
const admModalHint  = document.getElementById('admModalHint')
const admPasswordWrap = document.getElementById('admPasswordWrap')
const admError      = document.getElementById('admError')

// ── PDV: acesso direto ────────────────────────────────────
cardPDV?.addEventListener('click', () => {
  sessionStorage.setItem('dashMode', 'pdv')
  goToDashboard()
})

cardPDV?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') cardPDV.click()
})

// ── ADM: exige senha ──────────────────────────────────────
cardADM?.addEventListener('click', () => openAdmModal())

cardADM?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') cardADM.click()
})

function openAdmModal() {
  const adminPass = localStorage.getItem('adminPassword')

  if (!adminPass) {
    // Sem senha configurada → acesso livre com aviso
    admModalHint.textContent = 'Nenhuma senha ADM foi configurada. Clique em "Entrar" para acessar o painel completo.'
    admPasswordWrap.style.display = 'none'
  } else {
    admModalHint.textContent = 'Digite a senha de administrador para acessar o painel completo.'
    admPasswordWrap.style.display = ''
    admPasswordInput.value = ''
    admError.classList.remove('is-visible')
  }

  admOverlay.classList.add('is-open')

  // Foca no input se visível
  if (admPasswordWrap.style.display !== 'none') {
    setTimeout(() => admPasswordInput.focus(), 150)
  }
}

function closeAdmModal() {
  admOverlay.classList.remove('is-open')
  admPasswordInput.value = ''
  admError.classList.remove('is-visible')
}

// ── Confirmar senha ───────────────────────────────────────
admConfirmBtn?.addEventListener('click', confirmAdm)

admPasswordInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmAdm()
})

function confirmAdm() {
  const adminPass = localStorage.getItem('adminPassword')

  if (!adminPass) {
    // Sem senha → libera direto
    sessionStorage.setItem('dashMode', 'adm')
    goToDashboard()
    return
  }

  const input = admPasswordInput.value

  if (input === adminPass) {
    // Senha correta
    closeAdmModal()
    sessionStorage.setItem('dashMode', 'adm')
    goToDashboard()
  } else {
    // Senha errada
    admError.classList.add('is-visible')
    admPasswordInput.classList.add('is-error')
    admPasswordInput.focus()
    admPasswordInput.select()

    setTimeout(() => {
      admError.classList.remove('is-visible')
      admPasswordInput.classList.remove('is-error')
    }, 3500)
  }
}

// ── Fechar modal ──────────────────────────────────────────
admModalClose?.addEventListener('click', closeAdmModal)
admCancelBtn?.addEventListener('click', closeAdmModal)

admOverlay?.addEventListener('click', (e) => {
  if (e.target === admOverlay) closeAdmModal()
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && admOverlay.classList.contains('is-open')) {
    closeAdmModal()
  }
})

// ── Toggle visibilidade senha ─────────────────────────────
admTogglePass?.addEventListener('click', () => {
  if (admPasswordInput.type === 'password') {
    admPasswordInput.type = 'text'
    admEyeIcon.classList.replace('fa-eye', 'fa-eye-slash')
  } else {
    admPasswordInput.type = 'password'
    admEyeIcon.classList.replace('fa-eye-slash', 'fa-eye')
  }
})

// ── Logout ────────────────────────────────────────────────
logoutBtn?.addEventListener('click', goToLogin)
