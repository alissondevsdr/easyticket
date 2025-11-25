import { auth } from "../services/auth.js"
import { alterClient } from "./alterClient.js"
import { deletClient } from "./deleteClient.js"

let clients = []

export function getClients() {
  return clients
}

export async function loadingClients() {
  const token = localStorage.getItem("authToken")

  auth(token)
  console.log(token)

  try {
    const response = await axios.get("http://localhost:3001/clients", {
      headers: {
        Authorization: token
      }
    })

    clients = response.data

    listClients(clients)
  } catch (erro) {
    console.error("Erro ao buscar clientes:", erro.response?.data || erro);
  }

}

export function listClients(clients) {
  const list = document.getElementById('list')

  list.innerHTML = ''

  clients.forEach((c) => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
        <th>${c.id}</th>
        <td><a>${c.client}</a></td>
        <td>${c.phone}</td>
        <td>${c.cpf}</td>
        <td class="icons">
          <i class="fa-solid fa-trash"></i>
          <i class="fa-solid fa-pencil"></i>
        </td>
      `;

    list.appendChild(tr);

    tr.querySelector('.fa-trash').addEventListener('click', () => deletClient(c.id));

    tr.querySelector('.fa-pencil').addEventListener('click', () => alterClient(c.id));
  });
}

document.addEventListener("DOMContentLoaded", loadingClients);