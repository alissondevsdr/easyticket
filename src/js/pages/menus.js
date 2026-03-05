import { auth }          from "../services/auth.js"
import { logout }        from "../services/logout.js"
import { loadHomeKpis }  from "./home.js"

const items          = document.querySelectorAll(".sidebar-nav .sidebar-item")
const homeModal      = document.getElementById("homeModal")
const createModal    = document.getElementById("createModal")
const listModal      = document.getElementById("listModal")
const saleModal      = document.getElementById("saleModal")
const salesListModal = document.getElementById("salesListModal")
const reportModal    = document.getElementById("reportModal")
const campaignsModal = document.getElementById("campaignsModal")
const create         = document.getElementById('create')

const allModals = [
  homeModal, createModal, listModal,
  saleModal, salesListModal, reportModal,
  campaignsModal
]

let campaignsInitialized = false

function hideAll() {
  allModals.forEach(m => m?.classList.add("none"))
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

  if (label === 'Início')     { homeModal?.classList.remove("none");     loadHomeKpis(); }
  if (label === 'Cadastro')   { createModal?.classList.remove("none");   document.dispatchEvent(new CustomEvent("createModalOpened")); }
  if (label === 'Clientes')   { listModal?.classList.remove("none"); }
  if (label === 'Ingressos')  { saleModal?.classList.remove("none");     document.dispatchEvent(new CustomEvent("saleModalOpened")); }
  if (label === 'Relatórios') { reportModal?.classList.remove("none");   document.dispatchEvent(new CustomEvent("reportModalOpened")); }
  if (label === 'Campanhas')  {
    campaignsModal?.classList.remove("none")
    if (!campaignsInitialized) {
      campaignsInitialized = true
      // Import dinâmico: isola erro de módulo para não travar o menu
      import("./campaigns.js")
        .then(mod => mod.initCampaigns())
        .catch(err => console.error("Erro ao carregar módulo de campanhas:", err))
    }
  }
}

// Clique nos itens da sidebar
items.forEach(item => {
  item.addEventListener("click", () => activateModal(item.dataset.label))
})

// Botão "+ Cadastrar" dentro da lista de clientes
create?.addEventListener('click', () => activateModal('Cadastro'))

// Logout
document.getElementById("sidebarLogout")?.addEventListener("click", () => logout())

// Atalhos da tela Início
document.getElementById("homeModal")?.addEventListener("click", function(e) {
  const shortcut = e.target.closest(".home-shortcut")
  if (!shortcut) return
  activateModal(shortcut.dataset.target)
})

// Botão "Ver Vendas" no PDV — abre salesListModal sem alterar item ativo da sidebar
document.getElementById("viewSales")?.addEventListener("click", () => {
  hideAll()
  salesListModal?.classList.remove("none")
  document.dispatchEvent(new CustomEvent("salesListModalOpened"))
})
