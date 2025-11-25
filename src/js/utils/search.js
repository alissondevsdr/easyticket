import { getClients, listClients } from "../pages/listClient.js";

const inputSearch = document.getElementById('searchClient');

export function search() {
  inputSearch.addEventListener('input', function (e) {
    const value = e.target.value.toLowerCase();
    const clients = getClients().filter(c => {
      return normalizeString(c.client).includes(normalizeString(value)) || normalizeString(c.cpf).includes(normalizeString(value)) || normalizeString(String(c.phone)).includes(normalizeString(value));
    });
    listClients(clients);
  })
}

function normalizeString(string) {
  return string.toLowerCase().trim().replace(/[^a-zA-Z0-9 ]/g, "")
}

search()
