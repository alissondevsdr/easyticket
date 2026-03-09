// src/js/pages/menus.js — ARQUIVO COMPLETO (com controle de modo PDV/ADM)
import { auth } from "../services/auth.js"
import { logout } from "../services/logout.js"
import { loadHomeKpis } from "./home.js"

// ── Modo de acesso (pdv | adm) ────────────────────────────
const dashMode = sessionStorage.getItem('dashMode') || 'pdv'

const items = document.querySelectorAll(".sidebar-nav .sidebar-item")
const homeModal        = document.getElementById("homeModal")
const createModal      = document.getElementById("createModal")
const listModal        = document.getElementById("listModal")
const saleModal        = document.getElementById("saleModal")
const salesListModal   = document.getElementById("salesListModal")
const reportModal      = document.getElementById("reportModal")
const campaignsModal   = document.getElementById("campaignsModal")
const eventsModal      = document.getElementById("eventsModal")
const configModal      = document.getElementById("configModal")      // ← NOVO
const create = document.getElementById('create')

const allModals = [
  homeModal, createModal, listModal,
  saleModal, salesListModal, reportModal,
  campaignsModal, eventsModal, configModal                          // ← NOVO
]

let campaignsInitialized = false
let eventsInitialized    = false
let configInitialized    = false                                    // ← NOVO

// ════════════════════════════════════════════════════════════
//  CONTROLE DE MODO — oculta itens do sidebar conforme o modo
// ════════════════════════════════════════════════════════════

// Itens visíveis apenas no modo ADM
const ADM_ONLY_ITEMS = ['Início', 'Relatórios', 'Campanhas', 'Configurações']

function applyModeRestrictions() {
  const sidebar = document.getElementById('sidebar')

  if (dashMode === 'pdv') {
    // Esconde itens exclusivos do ADM
    items.forEach(item => {
      if (ADM_ONLY_ITEMS.includes(item.dataset.label)) {
        item.style.display = 'none'
      }
    })

    // Mostra badge de modo PDV na sidebar
    const modeChip = document.createElement('div')
    modeChip.className = 'sidebar-mode-chip pdv'
    modeChip.title = 'Modo PDV'
    modeChip.innerHTML = '<i class="fa-solid fa-cash-register"></i>'
    sidebar?.querySelector('.sidebar-logo')?.after(modeChip)

    // No modo PDV inicia direto no PDV (Ingressos)
    activateModal('Ingressos')

  } else {
    // ADM: todos os itens visíveis
    items.forEach(item => {
      item.style.display = ''
    })

    // Badge ADM
    const modeChip = document.createElement('div')
    modeChip.className = 'sidebar-mode-chip adm'
    modeChip.title = 'Modo ADM'
    modeChip.innerHTML = '<i class="fa-solid fa-shield-halved"></i>'
    sidebar?.querySelector('.sidebar-logo')?.after(modeChip)

    // ADM inicia na home
    activateModal('Início')
  }
}

// ════════════════════════════════════════════════════════════
//  FUNÇÕES BASE
// ════════════════════════════════════════════════════════════
function hideAll() {
  allModals.forEach(m => m?.classList.add("none"))
  // Limpa intervalos de campanhas ao sair da tela
  if (campaignsInitialized) {
    import("./campaigns.js").then(m => m.stopCampaigns()).catch(() => { })
  }
}

function setActive(label) {
  items.forEach(i => i.classList.remove("is-active"))
  const target = Array.from(items).find(i => i.dataset.label === label)
  target?.classList.add("is-active")
}

export function activateModal(label) {
  const token = localStorage.getItem("authToken")
  auth(token)
  hideAll()
  setActive(label)

  if (label === 'Início')     { homeModal?.classList.remove("none"); loadHomeKpis(); }
  if (label === 'Cadastro')   { createModal?.classList.remove("none"); document.dispatchEvent(new CustomEvent("createModalOpened")); }
  if (label === 'Clientes')   { listModal?.classList.remove("none"); }
  if (label === 'Ingressos')  { saleModal?.classList.remove("none"); document.dispatchEvent(new CustomEvent("saleModalOpened")); }
  if (label === 'Relatórios') { reportModal?.classList.remove("none"); document.dispatchEvent(new CustomEvent("reportModalOpened")); }

  if (label === 'Campanhas') {
    campaignsModal?.classList.remove("none")
    if (!campaignsInitialized) {
      campaignsInitialized = true
      import("./campaigns.js")
        .then(mod => mod.initCampaigns())
        .catch(err => console.error("Erro ao carregar módulo de campanhas:", err))
    }
  }

  if (label === 'Eventos') {
    eventsModal?.classList.remove("none")
    if (!eventsInitialized) {
      eventsInitialized = true
      import("./events.js")
        .then(mod => mod.initEvents())
        .catch(err => console.error("Erro ao carregar módulo de eventos:", err))
    } else {
      import("./events.js")
        .then(mod => mod.initEvents())
        .catch(err => console.error("Erro ao recarregar módulo de eventos:", err))
    }

    // No modo PDV, seleciona automaticamente a aba "Ativos"
    if (dashMode === 'pdv') {
      setTimeout(() => {
        const tabAtivos = document.querySelector('.events-tab[data-tab="ativos"]')
        tabAtivos?.click()
      }, 100)
    }
  }

  // ─── NOVO: Configurações ──────────────────────────────────
  if (label === 'Configurações') {
    configModal?.classList.remove("none")
    if (!configInitialized) {
      configInitialized = true
      import("./config.js")
        .then(mod => mod.initConfig())
        .catch(err => console.error("Erro ao carregar configurações:", err))
    } else {
      import("./config.js")
        .then(mod => mod.initConfig())
        .catch(err => console.error("Erro ao recarregar configurações:", err))
    }
  }
}

// ════════════════════════════════════════════════════════════
//  EVENTOS
// ════════════════════════════════════════════════════════════

// ── Clique nos itens da sidebar ───────────────────────────
items.forEach(item => {
  item.addEventListener("click", () => activateModal(item.dataset.label))
})

// ── Botão "+ Cadastrar" dentro da lista de clientes ───────
create?.addEventListener('click', () => activateModal('Cadastro'))

// ── Logout ────────────────────────────────────────────────
document.getElementById("sidebarLogout")?.addEventListener("click", () => logout())

// ── Atalhos da tela Início ────────────────────────────────
document.getElementById("homeModal")?.addEventListener("click", function (e) {
  const shortcut = e.target.closest(".home-shortcut")
  if (!shortcut) return
  activateModal(shortcut.dataset.target)
})

// ── Botão "Ver Vendas" no PDV ─────────────────────────────
document.getElementById("viewSales")?.addEventListener("click", () => {
  hideAll()
  salesListModal?.classList.remove("none")
  document.dispatchEvent(new CustomEvent("salesListModalOpened"))
})

// ── Botão "Trocar Modo" / voltar para role-select ─────────
document.getElementById("btnTrocarModo")?.addEventListener("click", () => {
  sessionStorage.removeItem('dashMode')
  window.location.href = 'role-select.html'
})

// ════════════════════════════════════════════════════════════
//  INICIALIZAÇÃO — aplica restrições de modo ao carregar
// ════════════════════════════════════════════════════════════
window.addEventListener("load", () => { setTimeout(applyModeRestrictions, 80) })
