// ════════════════════════════════════════════════════════════
//  CONFIGURAÇÕES — config.js
//  Gerencia senha ADM e outras configurações do sistema
// ════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════
//  INICIALIZAÇÃO
// ════════════════════════════════════════════════════════════
export function initConfig() {
  renderPasswordStatus()
  bindConfigEvents()
}

// ════════════════════════════════════════════════════════════
//  STATUS DA SENHA ADM
// ════════════════════════════════════════════════════════════
function renderPasswordStatus() {
  const badge = document.getElementById('configPassStatus')
  const currentPass = localStorage.getItem('adminPassword')

  if (!badge) return

  if (currentPass) {
    badge.className = 'config-status-badge set'
    badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Senha configurada'
  } else {
    badge.className = 'config-status-badge not-set'
    badge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Sem senha definida'
  }
}

// ════════════════════════════════════════════════════════════
//  BIND EVENTS
// ════════════════════════════════════════════════════════════
function bindConfigEvents() {

  // ── Toggle visibilidade dos campos de senha ───────────────
  document.querySelectorAll('[data-toggle-pass]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.togglePass
      const input = document.getElementById(targetId)
      const icon = btn.querySelector('i')
      if (!input) return
      if (input.type === 'password') {
        input.type = 'text'
        icon?.classList.replace('fa-eye', 'fa-eye-slash')
      } else {
        input.type = 'password'
        icon?.classList.replace('fa-eye-slash', 'fa-eye')
      }
    })
  })

  // ── Salvar nova senha ADM ─────────────────────────────────
  document.getElementById('btnSaveAdmPass')?.addEventListener('click', saveAdmPassword)

  // ── Remover senha ADM ─────────────────────────────────────
  document.getElementById('btnRemoveAdmPass')?.addEventListener('click', removeAdmPassword)
}

// ════════════════════════════════════════════════════════════
//  SALVAR SENHA ADM
// ════════════════════════════════════════════════════════════
function saveAdmPassword() {
  const newPass    = document.getElementById('configNewPass')?.value?.trim()
  const confirmPass = document.getElementById('configConfirmPass')?.value?.trim()

  // Validações
  if (!newPass) {
    showConfigToast('Informe a nova senha.', 'error')
    document.getElementById('configNewPass')?.focus()
    return
  }

  if (newPass.length < 4) {
    showConfigToast('A senha deve ter pelo menos 4 caracteres.', 'error')
    document.getElementById('configNewPass')?.focus()
    return
  }

  if (newPass !== confirmPass) {
    showConfigToast('As senhas não coincidem.', 'error')
    document.getElementById('configConfirmPass')?.focus()
    return
  }

  // Salva
  localStorage.setItem('adminPassword', newPass)

  // Limpa campos
  if (document.getElementById('configNewPass'))
    document.getElementById('configNewPass').value = ''
  if (document.getElementById('configConfirmPass'))
    document.getElementById('configConfirmPass').value = ''

  renderPasswordStatus()
  showConfigToast('Senha ADM salva com sucesso!', 'success')
}

// ════════════════════════════════════════════════════════════
//  REMOVER SENHA ADM
// ════════════════════════════════════════════════════════════
function removeAdmPassword() {
  const currentPass = localStorage.getItem('adminPassword')
  if (!currentPass) {
    showConfigToast('Nenhuma senha configurada para remover.', 'error')
    return
  }

  // Confirmação via modal global do dashboard
  const dynamicModal = document.getElementById('modal')
  const container = document.getElementById('modalContentContainer')
  if (!dynamicModal || !container) return

  container.innerHTML = `
    <div class="modal-header">
      <div class="message">
        <i class="fa-solid fa-triangle-exclamation" style="color:#ffa500;font-size:.9rem"></i>
        Remover Senha ADM
      </div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>
    <div style="padding:24px 28px;display:flex;flex-direction:column;gap:14px">
      <p style="font-size:0.85rem;color:#8892a4;margin:0;line-height:1.6">
        Ao remover a senha, o acesso ao <strong style="color:#fff">Painel ADM</strong> ficará desprotegido.
        Qualquer pessoa poderá acessar sem precisar de senha.
      </p>
    </div>
    <div class="buttons-modal">
      <button class="button is-danger-confirm" id="btnConfirmRemovePass">
        <i class="fa-solid fa-trash" style="margin-right:6px"></i>Remover Senha
      </button>
      <button class="button cancel">Cancelar</button>
    </div>`

  dynamicModal.classList.add('is-active')

  const close = () => dynamicModal.classList.remove('is-active')
  container.querySelector('.modal-close').addEventListener('click', close)
  container.querySelector('.cancel').addEventListener('click', close)
  document.querySelector('.modal-background').addEventListener('click', close)

  document.getElementById('btnConfirmRemovePass').addEventListener('click', () => {
    localStorage.removeItem('adminPassword')
    close()
    renderPasswordStatus()
    showConfigToast('Senha ADM removida.', 'success')
  })
}

// ════════════════════════════════════════════════════════════
//  TOAST DE FEEDBACK
// ════════════════════════════════════════════════════════════
function showConfigToast(msg, type = 'success') {
  // Reutiliza o showToast global se disponível
  if (typeof window.showToastGlobal === 'function') {
    window.showToastGlobal(msg, type)
    return
  }

  // Fallback: toast próprio
  let toast = document.getElementById('configToast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'configToast'
    toast.className = 'config-toast'
    document.body.appendChild(toast)
  }

  const icon = type === 'success'
    ? '<i class="fa-solid fa-circle-check"></i>'
    : '<i class="fa-solid fa-circle-exclamation"></i>'

  toast.className = `config-toast ${type}`
  toast.innerHTML = `${icon} ${msg}`

  requestAnimationFrame(() => {
    toast.classList.add('is-visible')
  })

  clearTimeout(toast._timer)
  toast._timer = setTimeout(() => {
    toast.classList.remove('is-visible')
  }, 3200)
}
