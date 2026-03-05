// ════════════════════════════════════════════════════════════
//  CAMPANHAS WHATSAPP — campaigns.js
//  Segue o padrão modular do projeto (ES modules)
// ════════════════════════════════════════════════════════════
const API_URL = "http://localhost:3001"

// ── Estado interno ────────────────────────────────────────
let campaigns = []         // lista completa de campanhas
let allClients = []         // clientes carregados da API
let filteredClients = []       // clientes filtrados pela busca
let selectedClients = new Set()// ids dos clientes selecionados
let editingId = null       // null = nova campanha | id = edição
let imageBase64 = null       // imagem selecionada em base64
let currentLogsId = null       // campanha cujos logs estão abertos
let logFilter = 'TODOS'    // filtro ativo na tela de logs
let wppPollInterval = null // polling de status do WhatsApp
let campaignPollInterval = null // polling de campanhas em envio

// ── Elementos DOM ─────────────────────────────────────────
const campaignsModal = document.getElementById("campaignsModal")
const campaignsTableBody = document.getElementById("campaignsTableBody")
const campaignOverlay = document.getElementById("campaignOverlay")
const logsOverlay = document.getElementById("logsOverlay")

// ════════════════════════════════════════════════════════════
//  INICIALIZAÇÃO — chamada pelo menus.js ao ativar a tela
// ════════════════════════════════════════════════════════════
export async function initCampaigns() {
  await loadCampaigns()
  await loadClientsForSelect()
  bindCampaignEvents()
}

// ════════════════════════════════════════════════════════════
//  LOAD — busca campanhas do backend
// ════════════════════════════════════════════════════════════
async function loadCampaigns() {
  try {
    const token = localStorage.getItem("authToken")
    const res = await axios.get(`${API_URL}/campaigns`, {
      headers: { Authorization: token }
    })
    campaigns = res.data || []
  } catch (err) {
    campaigns = []
    console.error("Erro ao carregar campanhas:", err)
  }
  renderCampaignsTable()
}

// ════════════════════════════════════════════════════════════
//  LOAD CLIENTES — para o seletor de destinatários
// ════════════════════════════════════════════════════════════
async function loadClientsForSelect() {
  try {
    const token = localStorage.getItem("authToken")
    const res = await axios.get(`${API_URL}/clients`, {
      headers: { Authorization: token }
    })
    allClients = res.data || []
    filteredClients = [...allClients]
  } catch (err) {
    allClients = []
    console.error("Erro ao carregar clientes:", err)
  }
}

// ════════════════════════════════════════════════════════════
//  RENDER — tabela de campanhas
// ════════════════════════════════════════════════════════════
function renderCampaignsTable() {
  if (!campaignsTableBody) return

  if (campaigns.length === 0) {
    campaignsTableBody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="campaigns-empty">
            <i class="fa-brands fa-whatsapp"></i>
            <p>Nenhuma campanha criada ainda</p>
            <button class="btn-new-campaign" onclick="document.getElementById('btnNewCampaign').click()">
              <i class="fa-solid fa-plus"></i> Criar primeira campanha
            </button>
          </div>
        </td>
      </tr>`
    return
  }

  campaignsTableBody.innerHTML = campaigns.map(c => {
    const statusLabel = {
      RASCUNHO: { text: "Rascunho", cls: "status-rascunho", icon: "fa-pencil" },
      ENVIANDO: { text: "Enviando", cls: "status-enviando", icon: "fa-paper-plane" },
      CONCLUIDA: { text: "Concluída", cls: "status-concluida", icon: "fa-check" },
      ERRO: { text: "Erro", cls: "status-erro", icon: "fa-triangle-exclamation" },
    }[c.status] || { text: c.status, cls: "status-rascunho", icon: "fa-circle" }

    const progressHTML = c.status === "ENVIANDO" && c.totalClients > 0
      ? `<div class="campaign-progress-inline">
           <span class="progress-text">${c.sent || 0} / ${c.totalClients} enviados</span>
           <div class="progress-bar-mini">
             <div class="progress-bar-mini-fill" style="width:${Math.round(((c.sent || 0) / c.totalClients) * 100)}%"></div>
           </div>
         </div>`
      : ""

    const date = c.createdAt
      ? new Date(c.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "—"

    return `
      <tr data-id="${c.id}">
        <td>${escHtml(c.name)}</td>
        <td>
          <span class="campaign-status ${statusLabel.cls}">
            <span class="status-dot"></span>
            ${statusLabel.text}
          </span>
          ${progressHTML}
        </td>
        <td>${date}</td>
        <td>
          <div class="campaign-actions">
            <button class="camp-btn camp-btn-edit"
              onclick="editCampaign('${c.id}')">
              <i class="fa-solid fa-pen"></i> Editar
            </button>
            <button class="camp-btn camp-btn-send"
              onclick="confirmSend('${c.id}')"
              ${c.status === "ENVIANDO" ? "disabled" : ""}>
              <i class="fa-solid fa-paper-plane"></i> Enviar
            </button>
            <button class="camp-btn camp-btn-log"
              onclick="openLogs('${c.id}')">
              <i class="fa-solid fa-list"></i> Logs
            </button>
            <button class="camp-btn camp-btn-delete"
              onclick="confirmDeleteCampaign('${c.id}')">
              <i class="fa-solid fa-trash-can"></i> Excluir
            </button>
          </div>
        </td>
      </tr>`
  }).join("")
}

// ════════════════════════════════════════════════════════════
//  DRAWER — Criar / Editar campanha
// ════════════════════════════════════════════════════════════
function openDrawer(campaign = null) {
  editingId = campaign?.id ?? null
  imageBase64 = campaign?.image ?? null
  selectedClients = new Set(campaign?.clientIds?.map(String) ?? [])

  // Título
  document.getElementById("drawerTitle").textContent =
    campaign ? "Editar Campanha" : "Nova Campanha"

  // Preenche campos
  document.getElementById("campName").value = campaign?.name ?? ""
  document.getElementById("campMessage").value = campaign?.message ?? ""

  // Delay / limite
  document.getElementById("campDelayMin").value = campaign?.delayMin ?? 5
  document.getElementById("campDelayMax").value = campaign?.delayMax ?? 15
  document.getElementById("campLimit").value = campaign?.limit ?? 0
  document.getElementById("campRandom").checked = campaign?.randomOrder ?? false

  // Imagem
  updateImagePreview()

  // Clientes
  filteredClients = [...allClients]
  renderClientList()
  updateSelectAllState()
  updateClientCounter()
  updateSaveBtn()

  // Reset do toggle de configurações
  document.getElementById("campSettingsToggle")?.classList.remove("is-open")
  document.getElementById("campSettingsContent")?.classList.remove("is-open")

  campaignOverlay.classList.add("is-open")
  document.body.style.overflow = "hidden"

  // foco no nome
  setTimeout(() => document.getElementById("campName")?.focus(), 300)
}

function closeDrawer() {
  campaignOverlay.classList.remove("is-open")
  document.body.style.overflow = ""
}

// ── Render lista de clientes no drawer ───────────────────
function renderClientList() {
  const list = document.getElementById("campClientsList")
  if (!list) return

  if (filteredClients.length === 0) {
    list.innerHTML = `
      <div style="text-align:center;padding:24px;color:#5a6380;font-size:0.82rem;">
        Nenhum cliente encontrado
      </div>`
    return
  }

  list.innerHTML = filteredClients.map(c => `
    <label class="camp-client-item" for="chk-${c.id}">
      <input type="checkbox" id="chk-${c.id}"
        data-client-id="${c.id}"
        ${selectedClients.has(String(c.id)) ? "checked" : ""}
        onchange="toggleClient('${c.id}', this.checked)">
      <div class="camp-client-info">
        <span class="camp-client-name">${escHtml(c.client || c.name || c.nome)}</span>
        <span class="camp-client-phone">${c.phone || c.telefone || "—"}</span>
      </div>
    </label>`
  ).join("")
}

function updateSelectAllState() {
  const chkAll = document.getElementById("campSelectAll")
  if (!chkAll) return
  const ids = filteredClients.map(c => String(c.id))
  chkAll.checked = ids.length > 0 && ids.every(id => selectedClients.has(id))
  chkAll.indeterminate = !chkAll.checked && ids.some(id => selectedClients.has(id))
}

function updateClientCounter() {
  const el = document.getElementById("campClientCounter")
  if (el) el.textContent = `${selectedClients.size} selecionado${selectedClients.size !== 1 ? "s" : ""}`
}

function updateSaveBtn() {
  const btn = document.getElementById("btnSaveCampaign")
  if (!btn) return
  const name = document.getElementById("campName")?.value.trim()
  const ready = name?.length > 0 && selectedClients.size > 0
  btn.classList.toggle("is-ready", ready)
}

function updateImagePreview() {
  const preview = document.getElementById("campImagePreview")
  const imgEl = document.getElementById("campImageEl")
  const dropzone = document.getElementById("campDropzone")
  if (!preview || !imgEl || !dropzone) return

  if (imageBase64) {
    imgEl.src = imageBase64
    preview.classList.add("has-image")
    dropzone.style.display = "none"
  } else {
    preview.classList.remove("has-image")
    dropzone.style.display = ""
  }
}

// ════════════════════════════════════════════════════════════
//  SALVAR CAMPANHA
// ════════════════════════════════════════════════════════════
async function saveCampaign() {
  const name = document.getElementById("campName")?.value.trim()
  const message = document.getElementById("campMessage")?.value.trim()
  const delayMin = parseInt(document.getElementById("campDelayMin")?.value) || 5
  const delayMax = parseInt(document.getElementById("campDelayMax")?.value) || 15
  const limit = parseInt(document.getElementById("campLimit")?.value) || 0
  const random = document.getElementById("campRandom")?.checked ?? false

  // Validações
  if (!name) {
    showValidation("campNameValidation", "Informe o nome da campanha")
    return
  }
  if (!message) {
    showValidation("campMessageValidation", "Informe a mensagem")
    return
  }
  if (delayMin >= delayMax) {
    showValidation("campDelayValidation", "Delay mínimo deve ser menor que o máximo")
    return
  }
  if (selectedClients.size === 0) {
    showValidation("campClientsValidation", "Selecione ao menos 1 cliente")
    return
  }

  setFooterState("saving")

  const payload = {
    name, message, image: imageBase64,
    clientIds: [...selectedClients],
    delayMin, delayMax, limit, randomOrder: random,
    status: "RASCUNHO"
  }

  try {
    const token = localStorage.getItem("authToken")
    if (editingId) {
      await axios.put(`${API_URL}/campaigns/${editingId}`, payload, {
        headers: { Authorization: token }
      })
    } else {
      await axios.post(`${API_URL}/campaigns`, payload, {
        headers: { Authorization: token }
      })
    }
    setFooterState("saved")
    await loadCampaigns()
    setTimeout(closeDrawer, 800)
  } catch (err) {
    console.error("Erro ao salvar campanha:", err)
    setFooterState("error")
  }
}

function setFooterState(state) {
  const el = document.getElementById("campFooterStatus")
  if (!el) return
  el.className = "camp-footer-left"
  if (state === "saving") {
    el.classList.add("is-saving")
    el.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...`
  } else if (state === "saved") {
    el.classList.add("is-saving")
    el.innerHTML = `<i class="fa-solid fa-check"></i> Salvo`
  } else if (state === "error") {
    el.classList.add("is-error")
    el.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Erro ao salvar`
  } else {
    el.innerHTML = ""
  }
}

function showValidation(id, msg) {
  const el = document.getElementById(id)
  if (!el) return
  el.textContent = `⚠ ${msg}`
  el.classList.add("visible")
  setTimeout(() => el.classList.remove("visible"), 4000)
}

// ════════════════════════════════════════════════════════════
//  CONFIRMAÇÃO DE ENVIO
// ════════════════════════════════════════════════════════════
function confirmSend(id) {
  const camp = campaigns.find(c => c.id == id)
  if (!camp) return

  const modalEl = document.getElementById("modal")
  const container = document.getElementById("modalContentContainer")
  if (!modalEl || !container) return

  container.innerHTML = `
    <div class="modal-header">
      <div class="message"><i class="fa-brands fa-whatsapp" style="color:#25d366"></i> Confirmar Envio</div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>
    <div class="send-confirm-body">
      <div class="send-confirm-info">
        <div class="send-confirm-row">
          <span>Campanha</span>
          <span>${escHtml(camp.name)}</span>
        </div>
        <div class="send-confirm-row">
          <span>Destinatários</span>
          <span>${camp.clientIds?.length ?? 0} clientes</span>
        </div>
        <div class="send-confirm-row">
          <span>Delay entre envios</span>
          <span>${camp.delayMin}s – ${camp.delayMax}s</span>
        </div>
      </div>
      <div class="send-confirm-warn">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>O disparo iniciará imediatamente. Certifique-se de que o WhatsApp está conectado antes de continuar.</span>
      </div>
    </div>
    <div class="buttons-modal">
      <button class="button cancel">Cancelar</button>
      <button class="button is-danger-confirm" id="btnConfirmSend">
        <i class="fa-solid fa-paper-plane"></i>&nbsp; Iniciar Envio
      </button>
    </div>`

  modalEl.classList.add("is-active")

  // Fechar
  container.querySelector(".modal-close")?.addEventListener("click", () => modalEl.classList.remove("is-active"))
  container.querySelector(".cancel")?.addEventListener("click", () => modalEl.classList.remove("is-active"))
  modalEl.querySelector(".modal-background")?.addEventListener("click", () => modalEl.classList.remove("is-active"))

  document.getElementById("btnConfirmSend")?.addEventListener("click", async () => {
    modalEl.classList.remove("is-active")
    await sendCampaign(id)
  })
}

async function sendCampaign(id) {
  try {
    const token = localStorage.getItem("authToken")
    await axios.post(`${API_URL}/campaigns/${id}/send`, {}, {
      headers: { Authorization: token }
    })
    await loadCampaigns()
    startCampaignPolling()
  } catch (err) {
    console.error("Erro ao iniciar envio:", err)
  }
}

// ════════════════════════════════════════════════════════════
//  LOGS DA CAMPANHA
// ════════════════════════════════════════════════════════════
async function openLogs(id) {
  currentLogsId = id
  logFilter = "TODOS"
  const camp = campaigns.find(c => c.id == id)

  document.getElementById("logsModalTitle").textContent =
    `Logs — ${camp?.name ?? "Campanha"}`

  logsOverlay.classList.add("is-open")
  document.body.style.overflow = "hidden"

  // Reset filtros
  document.querySelectorAll(".logs-filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === "TODOS")
  })

  await loadLogs()
}

function closeLogs() {
  logsOverlay.classList.remove("is-open")
  document.body.style.overflow = ""
}

async function loadLogs() {
  const tbody = document.getElementById("logsTableBody")
  if (!tbody) return

  tbody.innerHTML = `
    <tr><td colspan="4" style="text-align:center;padding:32px;color:#5a6380;">
      <i class="fa-solid fa-circle-notch fa-spin"></i> Carregando...
    </td></tr>`

  try {
    const token = localStorage.getItem("authToken")
    const res = await axios.get(`${API_URL}/campaigns/${currentLogsId}/logs`, {
      headers: { Authorization: token }
    })

    let logs = res.data || []

    // Aplica filtro
    if (logFilter !== "TODOS") {
      logs = logs.filter(l => l.status === logFilter)
    }

    if (logs.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="4" style="text-align:center;padding:40px;color:#5a6380;font-size:0.85rem;">
          Nenhum registro encontrado
        </td></tr>`
      return
    }

    tbody.innerHTML = logs.map(l => {
      const statusCls = {
        ENVIADO: "log-status-enviado",
        FALHOU: "log-status-falhou",
        PENDENTE: "log-status-pendente",
      }[l.status] ?? "log-status-pendente"

      const date = l.sentAt
        ? new Date(l.sentAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "—"

      return `
        <tr>
          <td>${escHtml(l.clientName ?? "—")}</td>
          <td>${date}</td>
          <td><span class="log-status ${statusCls}">${l.status}</span></td>
          <td>
            ${l.errorMessage
          ? `<span class="log-error-msg">${escHtml(l.errorMessage)}</span>`
          : '<span style="color:#5a6380;font-size:0.78rem">—</span>'}
          </td>
        </tr>`
    }).join("")

  } catch (err) {
    console.error("Erro ao carregar logs:", err)
    tbody.innerHTML = `
      <tr><td colspan="4" style="text-align:center;padding:32px;color:#e03131;font-size:0.82rem;">
        <i class="fa-solid fa-circle-exclamation"></i> Erro ao carregar logs
      </td></tr>`
  }
}

// ════════════════════════════════════════════════════════════
//  AÇÕES GLOBAIS (chamadas via onclick no HTML)
// ════════════════════════════════════════════════════════════
window.editCampaign = function (id) {
  const camp = campaigns.find(c => c.id == id)
  if (camp) openDrawer(camp)
}

window.confirmSend = confirmSend

window.openLogs = function (id) { openLogs(id) }

window.toggleClient = function (id, checked) {
  if (checked) selectedClients.add(id)
  else selectedClients.delete(id)
  updateSelectAllState()
  updateClientCounter()
  updateSaveBtn()
}

// ════════════════════════════════════════════════════════════
//  BIND EVENTS
// ════════════════════════════════════════════════════════════
function bindCampaignEvents() {
  // Botão conectar WhatsApp
  document.getElementById("btnWhatsappConnect")?.addEventListener("click", openWppModal)
  document.getElementById("btnCloseWppModal")?.addEventListener("click", closeWppModal)
  document.getElementById("wppModalOverlay")?.addEventListener("click", e => {
    if (e.target.id === "wppModalOverlay") closeWppModal()
  })

  // Checar status inicial do WhatsApp (atualiza botão)
  fetchWppStatus()

  // Botão criar campanha
  document.getElementById("btnNewCampaign")?.addEventListener("click", () => openDrawer())

  // Fechar drawer
  document.getElementById("btnCloseDrawer")?.addEventListener("click", closeDrawer)
  document.getElementById("btnCancelCampaign")?.addEventListener("click", closeDrawer)
  campaignOverlay?.addEventListener("click", e => {
    if (e.target === campaignOverlay) closeDrawer()
  })

  // Salvar
  document.getElementById("btnSaveCampaign")?.addEventListener("click", saveCampaign)

  // Inserir variável na mensagem ao clicar na tag
  document.querySelectorAll(".camp-var-tag").forEach(tag => {
    tag.addEventListener("click", () => {
      const ta = document.getElementById("campMessage")
      if (!ta) return
      const v = tag.dataset.var
      const pos = ta.selectionStart
      ta.value = ta.value.slice(0, pos) + v + ta.value.slice(ta.selectionEnd)
      ta.focus()
      ta.selectionStart = ta.selectionEnd = pos + v.length
    })
  })

  // Nome → habilita botão
  document.getElementById("campName")?.addEventListener("input", updateSaveBtn)

  // Busca de clientes
  document.getElementById("campSearchClients")?.addEventListener("input", e => {
    const q = e.target.value.toLowerCase().trim()
    filteredClients = q
      ? allClients.filter(c =>
        (c.client ?? c.name ?? c.nome ?? "").toLowerCase().includes(q) ||
        (c.phone ?? c.telefone ?? "").toLowerCase().includes(q))
      : [...allClients]
    renderClientList()
    updateSelectAllState()
  })

  // Selecionar todos
  document.getElementById("campSelectAll")?.addEventListener("change", e => {
    filteredClients.forEach(c => {
      const cid = String(c.id)
      if (e.target.checked) selectedClients.add(cid)
      else selectedClients.delete(cid)
    })
    renderClientList()
    updateClientCounter()
    updateSaveBtn()
  })

  // Upload de imagem
  const fileInput = document.getElementById("campImageInput")
  fileInput?.addEventListener("change", e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      imageBase64 = ev.target.result
      updateImagePreview()
    }
    reader.readAsDataURL(file)
  })

  // Drag & drop
  const dropzone = document.getElementById("campDropzone")
  dropzone?.addEventListener("dragover", e => { e.preventDefault(); dropzone.classList.add("drag-over") })
  dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"))
  dropzone?.addEventListener("drop", e => {
    e.preventDefault()
    dropzone.classList.remove("drag-over")
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = ev => { imageBase64 = ev.target.result; updateImagePreview() }
    reader.readAsDataURL(file)
  })

  // Remover imagem
  document.getElementById("campImageRemove")?.addEventListener("click", () => {
    imageBase64 = null
    if (document.getElementById("campImageInput"))
      document.getElementById("campImageInput").value = ""
    updateImagePreview()
  })

  // Botões numéricos de delay
  bindNumberBtn("campDelayMinMinus", "campDelayMin", -1, 1)
  bindNumberBtn("campDelayMinPlus", "campDelayMin", 1, 1)
  bindNumberBtn("campDelayMaxMinus", "campDelayMax", -1, 1)
  bindNumberBtn("campDelayMaxPlus", "campDelayMax", 1, 1)
  bindNumberBtn("campLimitMinus", "campLimit", -1, 0)
  bindNumberBtn("campLimitPlus", "campLimit", 1, 0)

  // Delay cross-validation
  document.getElementById("campDelayMin")?.addEventListener("input", validateDelays)
  document.getElementById("campDelayMax")?.addEventListener("input", validateDelays)

  // Fechar logs
  document.getElementById("btnCloseLogs")?.addEventListener("click", closeLogs)
  document.getElementById("btnLogsFooterClose")?.addEventListener("click", closeLogs)
  logsOverlay?.addEventListener("click", e => {
    if (e.target === logsOverlay) closeLogs()
  })

  // Toggle configurações de envio
  document.getElementById("campSettingsToggle")?.addEventListener("click", () => {
    const toggle = document.getElementById("campSettingsToggle")
    const content = document.getElementById("campSettingsContent")
    if (toggle && content) {
      const isOpen = toggle.classList.toggle("is-open")
      content.classList.toggle("is-open")

      // Rola para o final se acabou de abrir
      if (isOpen) {
        setTimeout(() => {
          const drawerBody = document.querySelector(".campaign-drawer-body")
          if (drawerBody) {
            drawerBody.scrollTop = drawerBody.scrollHeight
          }
        }, 100)
      }
    }
  })

  // Filtros de log
  document.querySelectorAll(".logs-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".logs-filter-btn").forEach(b => b.classList.remove("active"))
      btn.classList.add("active")
      logFilter = btn.dataset.filter
      loadLogs()
    })
  })
}

function bindNumberBtn(btnId, inputId, delta, min) {
  document.getElementById(btnId)?.addEventListener("click", () => {
    const inp = document.getElementById(inputId)
    if (!inp) return
    inp.value = Math.max(min, (parseInt(inp.value) || 0) + delta)
    validateDelays()
  })
}

function validateDelays() {
  const min = parseInt(document.getElementById("campDelayMin")?.value) || 0
  const max = parseInt(document.getElementById("campDelayMax")?.value) || 0
  const el = document.getElementById("campDelayValidation")
  if (!el) return
  if (min >= max) {
    el.textContent = "⚠ Delay mínimo deve ser menor que o máximo"
    el.classList.add("visible")
  } else {
    el.classList.remove("visible")
  }
}

// ── Utilitário ────────────────────────────────────────────
function escHtml(str) {
  if (!str) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// ════════════════════════════════════════════════════════════
//  WHATSAPP STATUS — Modal + Polling
// ════════════════════════════════════════════════════════════
function openWppModal() {
  const overlay = document.getElementById("wppModalOverlay")
  if (!overlay) return
  overlay.classList.add("is-open")
  startWppPolling()
}

function closeWppModal() {
  const overlay = document.getElementById("wppModalOverlay")
  if (!overlay) return
  overlay.classList.remove("is-open")
  stopWppPolling()
}

function startWppPolling() {
  fetchWppStatus()
  if (wppPollInterval) clearInterval(wppPollInterval)
  wppPollInterval = setInterval(fetchWppStatus, 3000)
}

function stopWppPolling() {
  if (wppPollInterval) {
    clearInterval(wppPollInterval)
    wppPollInterval = null
  }
}

async function fetchWppStatus() {
  try {
    const res = await axios.get(`${API_URL}/whatsapp/status`)
    const data = res.data
    updateWppButton(data)
    updateWppModalBody(data)

    // Se conectou, pode parar o polling rápido
    if (data.status === 'CONNECTED' && wppPollInterval) {
      stopWppPolling()
    }
  } catch (err) {
    console.error("Erro ao buscar status WhatsApp:", err)
  }
}

function updateWppButton(data) {
  const btn = document.getElementById("btnWhatsappConnect")
  const dot = document.getElementById("wppStatusDot")
  const label = document.getElementById("wppStatusLabel")
  if (!btn || !dot || !label) return

  dot.className = "wpp-status-dot"
  btn.classList.remove("is-connected")

  if (data.status === 'CONNECTED') {
    dot.classList.add("connected")
    btn.classList.add("is-connected")
    label.textContent = data.user?.name || "Conectado"
  } else if (data.status === 'AWAITING_SCAN') {
    dot.classList.add("connecting")
    label.textContent = "Aguardando..."
  } else if (data.status === 'AUTHENTICATING') {
    dot.classList.add("connecting")
    label.textContent = "Conectando..."
  } else {
    dot.classList.add("disconnected")
    label.textContent = "Conectar WhatsApp"
  }
}

function updateWppModalBody(data) {
  const body = document.getElementById("wppModalBody")
  if (!body) return

  if (data.status === 'CONNECTED') {
    const user = data.user || {}
    const avatarHtml = user.profilePicUrl
      ? `<img class="wpp-profile-avatar" src="${user.profilePicUrl}" alt="Foto">`
      : `<div class="wpp-profile-avatar-placeholder"><i class="fa-brands fa-whatsapp"></i></div>`

    body.innerHTML = `
      <div class="wpp-connected-profile">
        ${avatarHtml}
        <div class="wpp-profile-name">${escHtml(user.name || 'Usuário')}</div>
        <div class="wpp-profile-phone">+${user.phone || ''}</div>
        <div class="wpp-connected-badge">
          <i class="fa-solid fa-circle-check"></i>
          Conectado e pronto para envios
        </div>
        <button class="btn-wpp-disconnect" id="btnWppDisconnect">
          <i class="fa-solid fa-right-from-bracket"></i>
          Desconectar
        </button>
      </div>`

    document.getElementById("btnWppDisconnect")?.addEventListener("click", disconnectWpp)
  } else if (data.status === 'AUTHENTICATING') {
    body.innerHTML = `
      <div class="wpp-loading">
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        <p>Autenticando... Por favor, aguarde.</p>
        <span style="font-size: 0.75rem; color: #5a6380; margin-top: 8px; display: block;">Identificando usuário e baixando dados...</span>
      </div>`
  } else if (data.status === 'AWAITING_SCAN' && data.qr) {
    body.innerHTML = `
      <div class="wpp-qr-wrap">
        <img src="${data.qr}" alt="QR Code WhatsApp">
        <div class="wpp-qr-hint">
          Abra o <strong>WhatsApp</strong> no celular → <strong>Dispositivos Conectados</strong> → <strong>Conectar dispositivo</strong> → Escaneie o código acima
        </div>
      </div>`
  } else {
    body.innerHTML = `
      <div class="wpp-loading">
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        <p>Iniciando sessão do WhatsApp...</p>
      </div>`
  }
}

async function disconnectWpp() {
  const btn = document.getElementById("btnWppDisconnect")
  if (btn) {
    btn.disabled = true
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Desconectando...'
  }
  try {
    await axios.post(`${API_URL}/whatsapp/logout`)
    // Limpa o botão e o corpo do modal imediatamente pra feedback visual
    updateWppButton({ status: 'INITIALIZING' })
    updateWppModalBody({ status: 'INITIALIZING' })
    // Reinicia o polling para observar o novo QR ou status
    startWppPolling()
  } catch (err) {
    console.error("Erro ao desconectar WhatsApp:", err)
    if (btn) {
      btn.disabled = false
      btn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Desconectar'
    }
  }
}

// ════════════════════════════════════════════════════════════
//  CAMPAIGN POLLING — atualiza tabela enquanto houver envios
// ════════════════════════════════════════════════════════════
function startCampaignPolling() {
  if (campaignPollInterval) return // já está rodando
  campaignPollInterval = setInterval(async () => {
    await loadCampaigns()
    // Se não houver mais campanhas enviando, para o polling
    const sending = campaigns.some(c => c.status === 'ENVIANDO')
    if (!sending) {
      stopCampaignPolling()
    }
  }, 3000)
}

function stopCampaignPolling() {
  if (campaignPollInterval) {
    clearInterval(campaignPollInterval)
    campaignPollInterval = null
  }
}
// ════════════════════════════════════════════════════════════
//  EXCLUIR CAMPANHA
// ════════════════════════════════════════════════════════════
function confirmDeleteCampaign(id) {
  const camp = campaigns.find(c => c.id == id)
  if (!camp) return

  const modalEl = document.getElementById("modal")
  const container = document.getElementById("modalContentContainer")
  if (!modalEl || !container) return

  container.innerHTML = `
    <div class="modal-header">
      <div class="message"><i class="fa-solid fa-triangle-exclamation" style="color:#e03131"></i> Confirmar Exclusão</div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>
    <div class="card-content">
      <p style="color:#c8cdd8;font-size:.9rem;font-family:'Poppins',sans-serif;margin:0 0 8px">
        Deseja excluir permanentemente a campanha <strong style="color:#fff">${escHtml(camp.name)}</strong>?
      </p>
      <p style="color:#5a6380;font-size:.78rem;font-family:'Poppins',sans-serif;margin:0">
        Esta ação removerá todos os logs de envio e não poderá ser desfeita.
      </p>
    </div>
    <div class="buttons-modal">
      <button class="button cancel">Cancelar</button>
      <button class="button is-danger-confirm" id="btnConfirmDelete">
        <i class="fa-solid fa-trash-can"></i>&nbsp; Sim, excluir
      </button>
    </div>`

  modalEl.classList.add("is-active")

  const closeModalDirect = () => modalEl.classList.remove("is-active")
  container.querySelector(".modal-close")?.addEventListener("click", closeModalDirect)
  container.querySelector(".cancel")?.addEventListener("click", closeModalDirect)
  modalEl.querySelector(".modal-background")?.addEventListener("click", closeModalDirect)

  document.getElementById("btnConfirmDelete")?.addEventListener("click", async () => {
    closeModalDirect()
    await deleteCampaign(id)
  })
}

async function deleteCampaign(id) {
  try {
    const token = localStorage.getItem("authToken")
    await axios.delete(`${API_URL}/campaigns/${id}`, {
      headers: { Authorization: token }
    })
    showToast("Campanha excluída com sucesso!", "success")
    await loadCampaigns()
  } catch (err) {
    console.error("Erro ao excluir campanha:", err)
    showToast("Erro ao excluir campanha.", "error")
  }
}

// ── Utilitários extras ─────────────────────────────────────
function showToast(message, type = "success") {
  let toast = document.querySelector(".et-toast")
  if (!toast) {
    toast = document.createElement("div")
    toast.className = "et-toast"
    document.body.appendChild(toast)
  }
  toast.textContent = message
  toast.className = `et-toast ${type}`
  requestAnimationFrame(() => toast.classList.add("show"))
  setTimeout(() => toast.classList.remove("show"), 3000)
}

// Vincula ao escopo global
window.confirmDeleteCampaign = confirmDeleteCampaign
