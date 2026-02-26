import { showLoading, hideLoading } from "../services/loading.js"
import { loadingClients } from "./listClient.js"
import { maskPhone, maskCPF, setSelectionEndToInputEl } from "../utils/format.js"

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
    return;
  }

  dynamicModal.classList.add("is-active")

  modalContentContainer.innerHTML = `
    <div class="modal-header">
      <div class="message">Editar cliente</div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>

    <form class="card-content" id="alterForm">
      <div class="field">
        <p class="control has-icons-left">
          <input class="input" type="text" placeholder="Nome" id="clientInput" required value="${clientData.client}">
          <span class="icon is-small is-left"><i class="fas fa-user"></i></span>
        </p>
      </div>
      <div class="field">
        <p class="control has-icons-left">
          <input class="input" type="text" placeholder="Telefone" id="phoneInput" required value="${clientData.phone}">
          <span class="icon is-small is-left"><i class="fas fa-phone"></i></span>
        </p>
      </div>
      <div class="field">
        <p class="control has-icons-left">
          <input class="input" type="text" placeholder="CPF" id="cpfInput" required value="${clientData.cpf}">
          <span class="icon is-small is-left"><i class="fas fa-address-card"></i></span>
        </p>
      </div>
    </form>

    <div class="buttons-modal">
      <button class="button is-primary" id="save">
        <i class="fas fa-floppy-disk" style="margin-right:6px"></i>
        Salvar
      </button>
      <button class="button cancel">Cancelar</button>
    </div>`

  const clientInput = document.getElementById('clientInput')
  const phoneInput  = document.getElementById('phoneInput')
  const cpfInput    = document.getElementById('cpfInput')
  const buttonAlter = document.getElementById('save')

  // Máscaras
  phoneInput.addEventListener('input', (e) => {
    e.target.value = maskPhone(e.target.value)
    setSelectionEndToInputEl(e.target)
  })

  cpfInput.addEventListener('input', (e) => {
    e.target.value = maskCPF(e.target.value)
    setSelectionEndToInputEl(e.target)
  })

  // Fechar modal
  const closeModal = () => dynamicModal.classList.remove("is-active")

  modalContentContainer.querySelector('.modal-close').addEventListener('click', closeModal)
  modalContentContainer.querySelector('.cancel').addEventListener('click', closeModal)
  document.querySelector('.modal-background').addEventListener('click', closeModal)

  // Salvar alterações
  const handleAlter = async () => {
    const form = document.getElementById('alterForm')
    if (!form.reportValidity()) return

    try {
      showLoading(buttonAlter)
      await axios.put(`http://localhost:3001/clients/${id}`, {
        client: clientInput.value,
        cpf: cpfInput.value,
        phone: phoneInput.value
      }, {
        headers: { Authorization: token }
      })
      closeModal()
    } catch (error) {
      console.error("Erro ao alterar cliente:", error.response?.data || error)
      alert("Erro ao alterar cliente. Veja o console.")
    } finally {
      hideLoading(buttonAlter)
      buttonAlter.removeEventListener("click", handleAlter)
      loadingClients()
    }
  }

  buttonAlter.addEventListener("click", handleAlter)
}
