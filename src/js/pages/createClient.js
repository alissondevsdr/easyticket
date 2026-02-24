import { showLoading, hideLoading } from "../services/loading.js";
import { loadingClients } from "./listClient.js";

const clientForm = document.getElementById('clientForm')
const createButton = document.getElementById('createButton')

clientForm.addEventListener('submit', function (event) {
  event.preventDefault()

  showLoading(createButton)

  const client = document.getElementById('client').value
  const cpf = document.getElementById('cpf').value
  const phone = document.getElementById('phone').value

  handleClient(client, cpf, phone)
})

async function handleClient(client, cpf, phone) {
  const URL_CLIENTS = 'http://localhost:3001/clients'
  const token = localStorage.getItem('authToken');

  const infosClient = { client, cpf, phone }

  try {
    const config = {
      headers: {
        'Authorization': token
      }
    };

    const response = await axios.post(URL_CLIENTS, infosClient, config);

    console.log(response)
    console.log('Cliente cadastrado com sucesso!', response.data);

    loadingClients()
    reset()
    hideLoading(createButton)

    createButton.innerHTML = 'Sucesso!'

    setTimeout(() => {
      createButton.innerHTML = 'Cadastrar'
    }, 2000);

  } catch (error) {

    hideLoading(createButton)

    createButton.innerHTML = 'Erro!'
    createButton.classList.add('is-danger')

    setTimeout(() => {
      createButton.innerHTML = 'Cadastrar'
      createButton.classList.remove('is-danger')
    }, 3000);

    if (error.response) {
      if (error.response.status === 401 || error.response.status === 403) {
        console.error('Falha na autenticação. Por favor, faça login novamente.');
      }
      console.error('Erro ao cadastrar cliente (Backend):', error.response.data);
    } else if (error.request) {
      console.error('Erro de Rede: O servidor não respondeu.', error.request);
    } else {
      console.error('Erro geral:', error.message);
    }
  }
}

// CORRIGIDO: referenciar os inputs via getElementById em vez de variáveis globais implícitas
function reset() {
  document.getElementById('client').value = ''
  document.getElementById('cpf').value = ''
  document.getElementById('phone').value = ''
}
