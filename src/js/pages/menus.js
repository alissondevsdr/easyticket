import { auth }   from "../services/auth.js"
import { logout } from "../services/logout.js"

const links       = document.querySelectorAll("#menu li")
const createModal = document.getElementById("createModal")
const listModal   = document.getElementById("listModal")
const saleModal   = document.getElementById("saleModal")
const reportModal = document.getElementById("reportModal")
const welcome     = document.getElementById("welcome")
const create      = document.getElementById('create')

create?.addEventListener('click', function () {
  links.forEach(l => l.classList.remove("is-active"))
  links[0].classList.add("is-active")
  createModal.classList.remove("none")
  listModal.classList.add("none")
  saleModal.classList.add("none")
  reportModal.classList.add("none")
  document.dispatchEvent(new CustomEvent("createModalOpened"))
})

links.forEach(link => {
  link.addEventListener("click", function (event) {
    const token = localStorage.getItem("authToken")
    auth(token)
    event.preventDefault()

    welcome.classList.add('none')
    links.forEach(l => l.classList.remove("is-active"))
    this.classList.add("is-active")

    const modal = this.innerText.trim()

    createModal.classList[modal === 'Cadastro'   ? 'remove' : 'add']("none")
    listModal.classList[modal   === 'Clientes'   ? 'remove' : 'add']("none")
    saleModal.classList[modal   === 'Ingressos'  ? 'remove' : 'add']("none")
    reportModal.classList[modal === 'Relatórios' ? 'remove' : 'add']("none")

    if (modal === 'Ingressos')  document.dispatchEvent(new CustomEvent("saleModalOpened"))
    if (modal === 'Cadastro')   document.dispatchEvent(new CustomEvent("createModalOpened"))
    if (modal === 'Relatórios') document.dispatchEvent(new CustomEvent("reportModalOpened"))
    if (modal === '')           logout()
  })
})
