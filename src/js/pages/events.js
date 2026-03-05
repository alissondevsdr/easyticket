// src/js/pages/events.js — Gerenciador de Eventos (módulo completo)

// ─── Estado local ─────────────────────────────────────────────────────────────
let activeTab = "criar"
let eventsAtivos = []
let eventsConcluidos = []

// ─── Helpers ──────────────────────────────────────────────────────────────────
const token = () => localStorage.getItem("authToken")

function fmt(v) {
  return Number(v).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function fmtDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  })
}

function payLabel(m) {
  const map = { cash: "Dinheiro", pix: "PIX", credit: "Crédito", debit: "Débito" }
  return map[m] || m
}

function showToast(msg, type = "success") {
  let t = document.querySelector(".et-toast")
  if (!t) { t = document.createElement("div"); t.className = "et-toast"; document.body.appendChild(t) }
  t.textContent = msg
  t.className = `et-toast ${type}`
  requestAnimationFrame(() => t.classList.add("show"))
  setTimeout(() => t.classList.remove("show"), 3000)
}

// ─── Carregar eventos ─────────────────────────────────────────────────────────
async function loadEvents() {
  try {
    const [resAtivos, resConcluidos] = await Promise.all([
      axios.get("http://localhost:3001/events?status=ATIVO",     { headers: { Authorization: token() } }),
      axios.get("http://localhost:3001/events?status=CONCLUIDO", { headers: { Authorization: token() } }),
    ])
    eventsAtivos    = resAtivos.data
    eventsConcluidos = resConcluidos.data
    updateTabBadges()
  } catch (e) {
    console.error("Erro ao carregar eventos:", e)
  }
}

// ─── Atualizar badges de contagem nas abas ────────────────────────────────────
function updateTabBadges() {
  const badgeAtivos    = document.getElementById("evBadgeAtivos")
  const badgeConcluidos = document.getElementById("evBadgeConcluidos")
  if (badgeAtivos)    badgeAtivos.textContent    = eventsAtivos.length
  if (badgeConcluidos) badgeConcluidos.textContent = eventsConcluidos.length
}

// ─── Renderizar lista de eventos ativos ───────────────────────────────────────
function renderAtivos() {
  const container = document.getElementById("evListAtivos")
  if (!container) return

  if (!eventsAtivos.length) {
    container.innerHTML = `
      <div class="ev-empty">
        <i class="fa-solid fa-calendar-xmark"></i>
        <p>Nenhum evento ativo no momento.</p>
        <p style="font-size:.72rem;color:#252836">Crie um evento na aba "Criar Evento".</p>
      </div>`
    return
  }

  container.innerHTML = eventsAtivos.map(ev => buildEventCard(ev, true)).join("")
  bindCardActions(container, true)
}

// ─── Renderizar lista de eventos concluídos ───────────────────────────────────
function renderConcluidos() {
  const container = document.getElementById("evListConcluidos")
  if (!container) return

  if (!eventsConcluidos.length) {
    container.innerHTML = `
      <div class="ev-empty">
        <i class="fa-solid fa-box-archive"></i>
        <p>Nenhum evento concluído ainda.</p>
      </div>`
    return
  }

  container.innerHTML = eventsConcluidos.map(ev => buildEventCard(ev, false)).join("")
  bindCardActions(container, false)
}

// ─── Construir HTML do card de evento ─────────────────────────────────────────
function buildEventCard(ev, isAtivo) {
  const pct    = ev.capacity ? Math.min(100, Math.round((ev.soldCount / ev.capacity) * 100)) : null
  const fillCls = pct === null ? "" : pct >= 90 ? "is-danger" : pct >= 70 ? "is-warning" : ""

  const metaDate     = ev.date ? `<span class="ev-card-meta-item"><i class="fa-regular fa-calendar"></i>${fmtDate(ev.date)}</span>` : ""
  const metaLocation = ev.location ? `<span class="ev-card-meta-item"><i class="fa-solid fa-location-dot"></i>${ev.location}</span>` : ""
  const metaSales    = `<span class="ev-card-meta-item"><i class="fa-solid fa-ticket"></i>${ev.soldCount} ingresso${ev.soldCount !== 1 ? "s" : ""} vendido${ev.soldCount !== 1 ? "s" : ""}</span>`

  const capacityBar = ev.capacity ? `
    <div class="ev-capacity-bar">
      <div class="ev-capacity-labels">
        <span>${ev.soldCount} vendidos</span>
        <strong>${pct}% • ${ev.capacity} cap.</strong>
      </div>
      <div class="ev-progress-track">
        <div class="ev-progress-fill ${fillCls}" style="width:${pct}%"></div>
      </div>
    </div>` : ""

  const actionsAtivo = `
    <button class="btn-ev-action btn-ev-history" data-id="${ev.id}" title="Ver histórico">
      <i class="fa-solid fa-chart-bar"></i> Histórico
    </button>
    <button class="btn-ev-action btn-ev-conclude" data-id="${ev.id}" data-name="${ev.name}" title="Concluir evento">
      <i class="fa-solid fa-flag-checkered"></i> Concluir
    </button>`

  const actionsConcluido = `
    <button class="btn-ev-action btn-ev-history" data-id="${ev.id}" title="Ver histórico">
      <i class="fa-solid fa-chart-bar"></i> Histórico
    </button>
    <button class="btn-ev-action btn-ev-reopen" data-id="${ev.id}" data-name="${ev.name}" title="Reabrir evento">
      <i class="fa-solid fa-rotate-left"></i> Reabrir
    </button>
    <button class="btn-ev-action danger btn-ev-delete" data-id="${ev.id}" data-name="${ev.name}" title="Excluir evento">
      <i class="fa-solid fa-trash"></i>
    </button>`

  return `
    <div class="ev-card ${isAtivo ? "" : "concluido"}" data-id="${ev.id}">
      <div class="ev-card-icon">
        <i class="fa-solid fa-${isAtivo ? "calendar-check" : "box-archive"}"></i>
      </div>
      <div class="ev-card-body">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <p class="ev-card-name">${ev.name}</p>
          <span class="ev-status-badge ${isAtivo ? "ativo" : "concluido"}">${isAtivo ? "ATIVO" : "CONCLUÍDO"}</span>
        </div>
        <div class="ev-card-meta">
          ${metaDate}${metaLocation}${metaSales}
        </div>
        ${capacityBar}
      </div>
      <div class="ev-card-actions">
        ${isAtivo ? actionsAtivo : actionsConcluido}
      </div>
    </div>`
}

// ─── Bind de ações nos cards ──────────────────────────────────────────────────
function bindCardActions(container, isAtivo) {
  // Histórico
  container.querySelectorAll(".btn-ev-history").forEach(btn => {
    btn.addEventListener("click", () => openHistoryModal(Number(btn.dataset.id)))
  })

  if (isAtivo) {
    // Concluir
    container.querySelectorAll(".btn-ev-conclude").forEach(btn => {
      btn.addEventListener("click", () => confirmConcluir(Number(btn.dataset.id), btn.dataset.name))
    })
  } else {
    // Reabrir
    container.querySelectorAll(".btn-ev-reopen").forEach(btn => {
      btn.addEventListener("click", () => reopenEvent(Number(btn.dataset.id), btn.dataset.name))
    })
    // Deletar
    container.querySelectorAll(".btn-ev-delete").forEach(btn => {
      btn.addEventListener("click", () => confirmDelete(Number(btn.dataset.id), btn.dataset.name))
    })
  }
}

// ─── Confirmar conclusão ──────────────────────────────────────────────────────
function confirmConcluir(id, name) {
  const dynamicModal = document.getElementById("modal")
  const container    = document.getElementById("modalContentContainer")

  dynamicModal.classList.add("is-active")
  container.innerHTML = `
    <div class="modal-header">
      <div class="message">
        <i class="fa-solid fa-flag-checkered" style="color:#a5ff01;font-size:.9rem"></i>
        Concluir Evento
      </div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>
    <div class="card-content">
      <p style="color:#c8cdd8;font-family:'Poppins',sans-serif;font-size:.9rem;margin:0 0 8px">
        Deseja concluir o evento <strong style="color:#fff">${name}</strong>?
      </p>
      <p style="color:#5a6380;font-family:'Poppins',sans-serif;font-size:.78rem;margin:0">
        O evento será movido para o histórico e não aparecerá mais no PDV.
      </p>
    </div>
    <div class="buttons-modal">
      <button class="button is-primary" id="btnConfirmConcluir">
        <i class="fa-solid fa-flag-checkered" style="margin-right:6px"></i>Sim, concluir
      </button>
      <button class="button cancel">Cancelar</button>
    </div>`

  const close = () => dynamicModal.classList.remove("is-active")
  container.querySelector(".modal-close").addEventListener("click", close)
  container.querySelector(".cancel").addEventListener("click", close)
  document.querySelector(".modal-background").addEventListener("click", close)

  document.getElementById("btnConfirmConcluir").addEventListener("click", async () => {
    try {
      await axios.patch(`http://localhost:3001/events/${id}/concluir`, {}, { headers: { Authorization: token() } })
      close()
      showToast("Evento concluído com sucesso!", "success")
      await loadEvents()
      renderAtivos()
      renderConcluidos()
      // Notifica o PDV para recarregar os eventos
      document.dispatchEvent(new CustomEvent("eventsUpdated"))
    } catch (e) {
      showToast(e.response?.data?.erro || "Erro ao concluir evento.", "error")
    }
  })
}

// ─── Reabrir evento ───────────────────────────────────────────────────────────
async function reopenEvent(id, name) {
  try {
    await axios.patch(`http://localhost:3001/events/${id}/reabrir`, {}, { headers: { Authorization: token() } })
    showToast(`Evento "${name}" reaberto!`, "success")
    await loadEvents()
    renderAtivos()
    renderConcluidos()
    document.dispatchEvent(new CustomEvent("eventsUpdated"))
  } catch (e) {
    showToast(e.response?.data?.erro || "Erro ao reabrir evento.", "error")
  }
}

// ─── Confirmar exclusão ───────────────────────────────────────────────────────
function confirmDelete(id, name) {
  const dynamicModal = document.getElementById("modal")
  const container    = document.getElementById("modalContentContainer")

  dynamicModal.classList.add("is-active")
  container.innerHTML = `
    <div class="modal-header">
      <div class="message">
        <i class="fa-solid fa-triangle-exclamation" style="color:#e03131;font-size:.9rem"></i>
        Excluir Evento
      </div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>
    <div class="card-content">
      <p style="color:#c8cdd8;font-family:'Poppins',sans-serif;font-size:.9rem;margin:0 0 8px">
        Deseja excluir permanentemente o evento <strong style="color:#fff">${name}</strong>?
      </p>
      <p style="color:#5a6380;font-family:'Poppins',sans-serif;font-size:.78rem;margin:0">
        Eventos com vendas vinculadas não podem ser excluídos.
      </p>
    </div>
    <div class="buttons-modal">
      <button class="button is-danger-confirm" id="btnConfirmDelete">
        <i class="fa-solid fa-trash" style="margin-right:6px"></i>Excluir
      </button>
      <button class="button cancel">Cancelar</button>
    </div>`

  const close = () => dynamicModal.classList.remove("is-active")
  container.querySelector(".modal-close").addEventListener("click", close)
  container.querySelector(".cancel").addEventListener("click", close)
  document.querySelector(".modal-background").addEventListener("click", close)

  document.getElementById("btnConfirmDelete").addEventListener("click", async () => {
    try {
      await axios.delete(`http://localhost:3001/events/${id}`, { headers: { Authorization: token() } })
      close()
      showToast("Evento excluído.", "success")
      await loadEvents()
      renderConcluidos()
    } catch (e) {
      close()
      showToast(e.response?.data?.erro || "Erro ao excluir evento.", "error")
    }
  })
}

// ─── Modal de histórico do evento ─────────────────────────────────────────────
async function openHistoryModal(id) {
  const dynamicModal = document.getElementById("modal")
  const container    = document.getElementById("modalContentContainer")

  dynamicModal.classList.add("is-active")
  container.style.maxWidth = "900px"
  container.innerHTML = `
    <div class="modal-header">
      <div class="message">
        <i class="fa-solid fa-chart-bar" style="color:#a5ff01;font-size:.9rem"></i>
        Histórico do Evento
      </div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>
    <div class="history-loading">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>Carregando dados...</span>
    </div>`

  const close = () => {
    dynamicModal.classList.remove("is-active")
    container.style.maxWidth = ""
  }
  container.querySelector(".modal-close").addEventListener("click", close)
  document.querySelector(".modal-background").addEventListener("click", close)

  try {
    const { data } = await axios.get(`http://localhost:3001/events/${id}/sales`, {
      headers: { Authorization: token() }
    })
    renderHistoryModal(data, close, container)
  } catch (e) {
    container.innerHTML = `
      <div class="modal-header">
        <div class="message">Histórico do Evento</div>
        <button class="modal-close is-large" aria-label="close"></button>
      </div>
      <div class="history-loading">
        <i class="fa-solid fa-triangle-exclamation" style="color:#e03131"></i>
        <span>Erro ao carregar dados</span>
      </div>`
    container.querySelector(".modal-close").addEventListener("click", close)
  }
}

function renderHistoryModal({ event, sales, kpis }, close, container) {
  const payMap = { cash: "Dinheiro", pix: "PIX", credit: "Crédito", debit: "Débito" }

  const occupancyLine = kpis.capacity
    ? `<div class="ev-kpi-card">
        <span class="ev-kpi-label">Ocupação</span>
        <div class="ev-kpi-value">${kpis.occupancyPct}%</div>
        <span class="ev-kpi-sub">${kpis.soldCount} / ${kpis.capacity}</span>
      </div>`
    : ""

  const rows = sales.length ? sales.map((s, i) => {
    const pm   = payMap[s.paymentMethod] || s.paymentMethod
    const date = s.createdAt ? new Date(s.createdAt).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit"
    }) : "—"
    const isCanceled = s.status === "CANCELADA"
    return `
      <tr style="${isCanceled ? "opacity:.5" : ""}">
        <td class="history-td-num">#${String(i + 1).padStart(2, "0")}</td>
        <td>${s.client?.client || "—"}</td>
        <td><span class="pay-badge ${s.paymentMethod}">${pm}</span></td>
        <td><span class="status-badge ${isCanceled ? "cancelada" : "ativa"}">${isCanceled ? "CANCELADA" : "ATIVA"}</span></td>
        <td class="history-td-value">R$ ${fmt(s.value)}</td>
        <td style="color:#5a6380;font-size:.8rem;white-space:nowrap">${date}</td>
      </tr>`
  }).join("") : `
    <tr><td colspan="6">
      <div class="history-empty">
        <i class="fa-solid fa-receipt"></i>
        <p>Nenhuma venda registrada neste evento.</p>
      </div>
    </td></tr>`

  container.innerHTML = `
    <div class="modal-header">
      <div class="message">
        <i class="fa-solid fa-chart-bar" style="color:#a5ff01;font-size:.9rem"></i>
        ${event.name}
      </div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>
    <div style="padding:20px 28px 0">
      <div class="ev-history-kpis">
        <div class="ev-kpi-card">
          <span class="ev-kpi-label">Faturamento</span>
          <div class="ev-kpi-value" style="font-size:1.1rem">R$ ${fmt(kpis.totalRevenue)}</div>
          <span class="ev-kpi-sub">vendas ativas</span>
        </div>
        <div class="ev-kpi-card">
          <span class="ev-kpi-label">Total de Vendas</span>
          <div class="ev-kpi-value">${kpis.totalSales}</div>
          <span class="ev-kpi-sub">ingressos emitidos</span>
        </div>
        <div class="ev-kpi-card">
          <span class="ev-kpi-label">Ticket Médio</span>
          <div class="ev-kpi-value" style="font-size:1.1rem">R$ ${fmt(kpis.avgTicket)}</div>
          <span class="ev-kpi-sub">por ingresso</span>
        </div>
        <div class="ev-kpi-card">
          <span class="ev-kpi-label">Clientes Únicos</span>
          <div class="ev-kpi-value">${kpis.uniqueClients}</div>
          <span class="ev-kpi-sub">participantes</span>
        </div>
        <div class="ev-kpi-card">
          <span class="ev-kpi-label">Pgto. Principal</span>
          <div class="ev-kpi-value" style="font-size:1rem">${payMap[kpis.topPayment] || "—"}</div>
          <span class="ev-kpi-sub">mais utilizado</span>
        </div>
        ${occupancyLine}
      </div>
    </div>
    <div class="history-table-wrap" style="padding:0 28px 28px;overflow-x:auto">
      <table class="history-table" style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th>#</th><th>Cliente</th><th>Pagamento</th>
            <th>Status</th><th>Valor</th><th>Data</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`

  container.querySelector(".modal-close").addEventListener("click", close)
  document.querySelector(".modal-background").addEventListener("click", close)
}

// ─── Formulário — Criar Evento ────────────────────────────────────────────────
function bindCreateForm() {
  const form = document.getElementById("evCreateForm")
  if (!form) return

  form.addEventListener("submit", async (e) => {
    e.preventDefault()
    const btn = document.getElementById("btnEvCreate")
    const name     = document.getElementById("evName").value.trim()
    const date     = document.getElementById("evDate").value
    const location = document.getElementById("evLocation").value.trim()
    const capacity = document.getElementById("evCapacity").value
    const desc     = document.getElementById("evDesc").value.trim()

    if (!name) {
      showToast("Informe o nome do evento.", "warning")
      document.getElementById("evName").focus()
      return
    }

    btn.disabled = true
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando...'

    try {
      await axios.post("http://localhost:3001/events",
        { name, date: date || null, location: location || null, capacity: capacity || null, description: desc || null },
        { headers: { Authorization: token() } }
      )
      showToast(`Evento "${name}" criado com sucesso!`, "success")
      form.reset()
      await loadEvents()
      renderAtivos()
      renderConcluidos()
      document.dispatchEvent(new CustomEvent("eventsUpdated"))
      // Vai para a aba de ativos
      switchTab("ativos")
    } catch (er) {
      showToast(er.response?.data?.erro || "Erro ao criar evento.", "error")
    } finally {
      btn.disabled = false
      btn.innerHTML = '<i class="fa-solid fa-plus"></i> Criar Evento'
    }
  })

  document.getElementById("btnEvReset")?.addEventListener("click", () => form.reset())
}

// ─── Troca de abas ────────────────────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab
  document.querySelectorAll(".events-tab").forEach(t => t.classList.remove("is-active"))
  document.querySelectorAll(".events-panel").forEach(p => p.classList.remove("is-active"))

  document.querySelector(`.events-tab[data-tab="${tab}"]`)?.classList.add("is-active")
  document.getElementById(`evPanel-${tab}`)?.classList.add("is-active")
}

// ─── Init principal ───────────────────────────────────────────────────────────
export async function initEvents() {
  await loadEvents()
  switchTab("criar")
  renderAtivos()
  renderConcluidos()
  bindCreateForm()

  // Bind das abas
  document.querySelectorAll(".events-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      switchTab(tab.dataset.tab)
      if (tab.dataset.tab === "ativos")    renderAtivos()
      if (tab.dataset.tab === "historico") renderConcluidos()
    })
  })
}
