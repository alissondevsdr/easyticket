import { auth } from "../services/auth.js"
import { alterClient } from "./alterClient.js"
import { deletClient } from "./deleteClient.js"
import { showClientHistory } from "./clientHistory.js"

let clients = []

export function getClients() {
  return clients
}

export async function loadingClients() {
  const token = localStorage.getItem("authToken")
  auth(token)

  try {
    const response = await axios.get("http://localhost:3001/clients", {
      headers: { Authorization: token }
    })
    clients = response.data
    listClients(clients)
  } catch (erro) {
    console.error("Erro ao buscar clientes:", erro.response?.data || erro)
  }
}

export function listClients(clients) {
  const list = document.getElementById('list')
  list.innerHTML = ''

  if (!clients || clients.length === 0) {
    list.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fa-solid fa-users-slash"></i>
            <p>Nenhum cliente cadastrado</p>
          </div>
        </td>
      </tr>`
    return
  }

  clients.forEach((c) => {
    const tr = document.createElement("tr")

    // Map tipo to display label e icon
    const typeMap = {
      geral: { label: 'Geral', icon: 'fa-users' },
      vip: { label: 'VIP', icon: 'fa-star' },
      cortesia: { label: 'Cortesia', icon: 'fa-ticket' }
    }
    const typeInfo = typeMap[c.type] || typeMap.geral

    // Bloqueia editar/excluir para o Cliente Padrão (ID 1)
    const isPadrão = c.id === 1;

    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.client}</td>
      <td>${c.phone}</td>
      <td>${c.cpf}</td>
      <td><span class="type-badge type-${c.type || 'geral'}"><i class="fa-solid ${typeInfo.icon}"></i> ${typeInfo.label}</span></td>
      <td class="icons">
        <button class="icon-btn icon-history" title="Histórico">
          <i class="fa-solid fa-clock-rotate-left"></i>
        </button>
        <button class="icon-btn icon-edit ${isPadrão ? 'disabled' : ''}" title="Editar" ${isPadrão ? 'disabled' : ''}>
          <i class="fa-solid fa-pencil"></i>
        </button>
        <button class="icon-btn icon-delete ${isPadrão ? 'disabled' : ''}" title="Excluir" ${isPadrão ? 'disabled' : ''}>
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `

    list.appendChild(tr)

    tr.querySelector('.icon-history').addEventListener('click', () => showClientHistory(c.id, c.client))
    if (!isPadrão) {
      tr.querySelector('.icon-edit').addEventListener('click', () => alterClient(c.id))
      tr.querySelector('.icon-delete').addEventListener('click', () => deletClient(c.id))
    }
  })
}

document.addEventListener("DOMContentLoaded", loadingClients)
