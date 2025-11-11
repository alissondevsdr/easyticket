import { showLoading, hideLoading } from "../services/loading.js";
import { loadingClients } from "./listClient.js";

const clientForm = document.getElementById('clientForm')
const notificationClient = document.getElementById('notificationClient')
const notificationIcon = document.getElementById('notificationIcon')
const notificationMessage = document.getElementById('notificationMessage')
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

    notificationClient.classList.remove('invisible')
    notificationClient.classList.remove('is-danger')
    notificationClient.classList.add('is-primary')
    notificationIcon.innerHTML = '<i class="fa-solid fa-check"></i>'
    notificationMessage.innerText = 'Cadastrado com sucesso.'

    loadingClients()

    setTimeout(() => {
      notificationClient.classList.add('invisible')
    }, 3000)

    reset();
    hideLoading(createButton)

  } catch (error) {

    hideLoading(createButton)
    notificationClient.classList.remove('invisible')
    notificationClient.classList.remove('is-primary')
    notificationClient.classList.add('is-danger')
    notificationIcon.innerHTML = '<i class="fa-solid fa-xmark"></i>'
    notificationMessage.innerText = 'Erro ao cadastrar o cliente.'

    setTimeout(() => {
      notificationClient.classList.add('invisible')
    }, 3000)

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

function reset() {
  client.value = ''
  cpf.value = ''
  phone.value = ''
}