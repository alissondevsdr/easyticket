import { getClients, listClients } from "../pages/listClient.js";

document.addEventListener('DOMContentLoaded', function () {
  const inputSearch = document.getElementById('searchClient');
  if (!inputSearch) return;

  inputSearch.addEventListener('input', async function (e) {
    const value = e.target.value;

    // getClients() é async — precisa de await
    const clients = await getClients();

    // Campo vazio: exibe todos
    if (!value.trim()) {
      listClients(clients);
      return;
    }

    // Lista ainda não carregou: ignora
    if (!clients || clients.length === 0) return;

    const filtered = clients.filter(c => {
      return (
        normalizeString(c.client).includes(normalizeString(value)) ||
        normalizeString(c.cpf).includes(normalizeString(value)) ||
        normalizeString(String(c.phone ?? "")).includes(normalizeString(value))
      );
    });

    listClients(filtered);
  });
});

function normalizeString(str) {
  return str.toLowerCase().trim().replace(/[^a-zA-Z0-9 ]/g, "");
}
