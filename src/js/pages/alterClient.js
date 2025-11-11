import { showLoading, hideLoading } from "../services/loading.js"
import { loadingClients } from "./listClient.js"
import { maskPhone, maskCPF } from "../utils/format.js"

export async function alterClient(id) {
  const token = localStorage.getItem("authToken")

  const dynamicModal = document.getElementById('modal')
  const modalContentContainer = document.getElementById('modalContentContainer')

  let clientData

  try {
    const response = await axios.get(`http://localhost:3001/clients/${id}`, {
      headers: { Authorization: token }
    })
    clientData = response.data
  } catch (error) {
    console.error("Erro ao buscar cliente para alteração:", error.response?.data || error);
    alert("Erro ao carregar dados do cliente. Veja o console.");
    hideLoading();
    return; // Sair se não conseguir buscar os dados
  } finally {
    console.log(clientData)
  }

  dynamicModal.classList.add("is-active")


  modalContentContainer.innerHTML = `
      <button class="modal-close is-large" aria-label="close"></button>
      <div class="message">
        <div>Alterar o cliente: ${clientData.client}</div>
      </div>
           <form class="card-content" id="alterForm">
        <div class="field">
          <p class="control has-icons-left has-icons-right">
            <input class="input" type="text" placeholder="Nome" id="clientInput" required value="${clientData.client}">
            <span class="icon is-small is-left">
              <i class="fas fa-solid fa-user"></i>
            </span>
          </p>
        </div>
        <div class="field">
          <p class="control has-icons-left has-icons-right">
            <input class="input" type="text" placeholder="Telefone" id="phoneInput" required value="${clientData.phone}">
            <span class="icon is-small is-left">
              <i class="fas fa-solid fa-phone"></i>
            </span>
          </p>
        </div>
        <div class="field">
          <p class="control has-icons-left has-icons-right">
            <input class="input" type="text" placeholder="CPF" id="cpfInput" required value="${clientData.cpf}">
            <span class="icon is-small is-left">
              <i class="fas fa-solid fa-address-card"></i>
            </span>
          </p>
        </div>
      </form>
      <div class="buttons-modal">
        <button class="button is-primary" id="save">Salvar</button>
        <button class="button is-danger cancel">Cancelar</button>
      </div>`

  const clientInput = document.getElementById('clientInput')
  const phoneInput = document.getElementById('phoneInput')
  const cpfInput = document.getElementById('cpfInput')
  const buttonAlter = document.getElementById('save')


  phoneInput.addEventListener('input', (e) => {
    const old = e.target.value;
    e.target.value = maskPhone(old);
    setSelectionEndToInputEl(e.target);
  });

  cpfInput.addEventListener('input', (e) => {
    const old = e.target.value;
    e.target.value = maskCPF(old);
    setSelectionEndToInputEl(e.target);
  });


  const handleAlter = async () => {

    const form = document.getElementById('alterForm');

    if (!form.reportValidity()) {
      return;
    }

    try {
      showLoading(buttonAlter)
      await axios.put(`http://localhost:3001/clients/${id}`, {
        client: clientInput.value,
        cpf: cpfInput.value,
        phone: phoneInput.value
      }, {
        headers: { Authorization: token }
      });
      dynamicModal.classList.remove("is-active");

    } catch (error) {
      console.error("Erro ao alterar cliente:", error.response?.data || error);
      alert("Erro ao alterar cliente. Veja o console.");
    } finally {
      hideLoading(buttonAlter)
      buttonAlter.removeEventListener("click", handleAlter);
      loadingClients()
    }
  }

  buttonAlter.addEventListener("click", handleAlter);
}