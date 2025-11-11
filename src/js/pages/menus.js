import { auth } from "../services/auth.js"
import { logout } from "../services/logout.js"

const links = document.querySelectorAll("#menu li")
const createModal = document.getElementById("createModal")
const listModal = document.getElementById("listModal")
const saleModal = document.getElementById("saleModal")
const welcome = document.getElementById("welcome")

links.forEach(link => {
  link.addEventListener("click", function (event) {
    const token = localStorage.getItem("authToken")

    auth(token)

    event.preventDefault()

    welcome.classList.add('none')

    links.forEach(l => l.classList.remove("is-active"));

    this.classList.add("is-active")

    const modal = this.innerText
    if (modal === 'Cadastro') {
      createModal.classList.remove("none")
      listModal.classList.add("none")
      saleModal.classList.add("none")
    } else if (modal === 'Clientes') {
      createModal.classList.add("none")
      listModal.classList.remove("none")
      saleModal.classList.add("none")
    } else if (modal === 'Ingressos') {
      createModal.classList.add("none")
      listModal.classList.add("none")
      saleModal.classList.remove("none")
    } else if (modal === '') {
      logout()
    }
  })
})

