import { auth }   from "../services/auth.js"
import { logout } from "../services/logout.js"
import { loadHomeKpis } from "./home.js"

const links       = document.querySelectorAll("#menu li")
const homeModal   = document.getElementById("homeModal")
const createModal = document.getElementById("createModal")
const listModal   = document.getElementById("listModal")
const saleModal   = document.getElementById("saleModal")
const reportModal = document.getElementById("reportModal")
const create      = document.getElementById('create')

const allModals = [homeModal, createModal, listModal, saleModal, reportModal]

function hideAll() {
  allModals.forEach(m => m?.classList.add("none"))
}

// Botão "+ Cadastrar" dentro da lista de clientes
create?.addEventListener('click', function () {
  links.forEach(l => l.classList.remove("is-active"))
  links[1].classList.add("is-active")  // índice 1 = Cadastro
  hideAll()
  createModal.classList.remove("none")
  document.dispatchEvent(new CustomEvent("createModalOpened"))
})

links.forEach(link => {
  link.addEventListener("click", function (event) {
    const token = localStorage.getItem("authToken")
    auth(token)
    event.preventDefault()

    links.forEach(l => l.classList.remove("is-active"))
    this.classList.add("is-active")

    const modal = this.innerText.trim()

    hideAll()

    if (modal === 'Início')     { homeModal.classList.remove("none");   loadHomeKpis(); }
    if (modal === 'Cadastro')   { createModal.classList.remove("none"); document.dispatchEvent(new CustomEvent("createModalOpened")); }
    if (modal === 'Clientes')   { listModal.classList.remove("none"); }
    if (modal === 'Ingressos')  { saleModal.classList.remove("none");   document.dispatchEvent(new CustomEvent("saleModalOpened")); }
    if (modal === 'Relatórios') { reportModal.classList.remove("none"); document.dispatchEvent(new CustomEvent("reportModalOpened")); }
    if (modal === '')           logout()
  })
})

// Atalhos da tela Início clicáveis
document.getElementById("homeModal")?.addEventListener("click", function(e) {
  const shortcut = e.target.closest(".home-shortcut")
  if (!shortcut) return

  const target = shortcut.dataset.target
  const matchLink = Array.from(links).find(l => l.innerText.trim() === target)
  if (matchLink) matchLink.click()
})
