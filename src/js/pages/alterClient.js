import { showLoading, hideLoading } from "../services/loading.js"
import { loadingClients, getClients } from "./listClient.js"
import { maskPhone, maskCPF, validateCPF, setSelectionEndToInputEl } from "../utils/format.js"

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
        <label class="label">Nome completo</label>
        <p class="control has-icons-left">
          <input class="input" type="text" placeholder="Ex: João da Silva" id="clientInput" required value="${clientData.client}">
          <span class="icon is-small is-left"><i class="fas fa-user"></i></span>
        </p>
        <p class="help" id="helpClient"></p>
      </div>
      <div class="field">
        <label class="label">Telefone</label>
        <p class="control has-icons-left">
          <input class="input" type="text" placeholder="(00) 00000-0000" id="phoneInput" required value="${clientData.phone}">
          <span class="icon is-small is-left"><i class="fas fa-phone"></i></span>
        </p>
        <p class="help" id="helpPhone"></p>
      </div>
      <div class="field">
        <label class="label">CPF</label>
        <p class="control has-icons-left">
          <input class="input" type="text" placeholder="000.000.000-00" id="cpfInput" required value="${clientData.cpf}">
          <span class="icon is-small is-left"><i class="fas fa-address-card"></i></span>
        </p>
        <p class="help" id="helpCpf"></p>
      </div>
      <div class="field">
        <label class="label">Tipo de cliente</label>
        <p class="control">
          <div class="select is-fullwidth">
            <select id="typeInput" required>
              <option value="geral" ${clientData.type === 'geral' ? 'selected' : ''}>Geral</option>
              <option value="vip" ${clientData.type === 'vip' ? 'selected' : ''}>VIP</option>
              <option value="cortesia" ${clientData.type === 'cortesia' ? 'selected' : ''}>Cortesia</option>
            </select>
          </div>
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
  const phoneInput = document.getElementById('phoneInput')
  const cpfInput = document.getElementById('cpfInput')
  const typeInput = document.getElementById('typeInput')
  const buttonAlter = document.getElementById('save')

  // Helper para validação visual simples no modal de edição
  const setHelp = (input, helpId, isValid, msg) => {
    const help = document.getElementById(helpId);
    if (!help) return;
    if (!input.value.trim()) {
      help.textContent = '';
      input.classList.remove('is-danger', 'is-success');
      return;
    }
    help.textContent = msg;
    help.className = 'help ' + (isValid ? 'is-success' : 'is-danger');
    input.classList.toggle('is-success', isValid);
    input.classList.toggle('is-danger', !isValid);
  }

  // Máscaras e Validações Inline
  clientInput.addEventListener('input', () => {
    const parts = clientInput.value.trim().split(/\s+/).filter(p => p.length >= 2);
    const isValid = parts.length >= 2;
    setHelp(clientInput, 'helpClient', isValid, isValid ? 'Nome válido' : 'Informe o nome completo');
  })

  phoneInput.addEventListener('input', (e) => {
    e.target.value = maskPhone(e.target.value)
    setSelectionEndToInputEl(e.target)
    const clean = e.target.value.replace(/\D/g, '');
    const isValid = clean.length === 10 || clean.length === 11;
    setHelp(phoneInput, 'helpPhone', isValid, isValid ? 'Telefone válido' : 'Telefone fora do padrão');
  })

  cpfInput.addEventListener('input', (e) => {
    e.target.value = maskCPF(e.target.value)
    setSelectionEndToInputEl(e.target)
    const clean = e.target.value.replace(/\D/g, '');

    if (clean.length < 11) {
      setHelp(cpfInput, 'helpCpf', false, 'CPF incompleto');
      return;
    }
    const isValid = validateCPF(clean);
    if (!isValid) {
      setHelp(cpfInput, 'helpCpf', false, 'CPF inválido');
      return;
    }

    // Verifica duplicação (excluindo este cliente)
    const clients = getClients();
    const exists = clients.some(c => c.id !== id && c.cpf?.replace(/\D/g, '') === clean);
    if (exists) {
      setHelp(cpfInput, 'helpCpf', false, 'CPF já cadastrado em outro cliente');
    } else {
      setHelp(cpfInput, 'helpCpf', true, 'CPF válido');
    }
  })

  // Fechar modal
  const closeModal = () => dynamicModal.classList.remove("is-active")

  modalContentContainer.querySelector('.modal-close').addEventListener('click', closeModal)
  modalContentContainer.querySelector('.cancel').addEventListener('click', closeModal)
  document.querySelector('.modal-background').addEventListener('click', closeModal)

  // Salvar alterações
  const handleAlter = async () => {
    const client = clientInput.value.trim();
    const cpf = cpfInput.value.trim();
    const phone = phoneInput.value.trim();
    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanPhone = phone.replace(/\D/g, '');

    // Re-validações finais
    const parts = client.split(/\s+/).filter(p => p.length >= 2);
    const isNameValid = parts.length >= 2;
    const isPhoneValid = cleanPhone.length === 10 || cleanPhone.length === 11;
    const isCpfValid = validateCPF(cleanCpf);

    const clients = getClients();
    const cpfExists = clients.some(c => c.id !== id && c.cpf?.replace(/\D/g, '') === cleanCpf);

    if (!isNameValid) {
      alert("Informe o nome completo.");
      clientInput.focus();
      return;
    }
    if (!isPhoneValid) {
      alert("Telefone fora do padrão.");
      phoneInput.focus();
      return;
    }
    if (!isCpfValid) {
      alert("CPF inválido.");
      cpfInput.focus();
      return;
    }
    if (cpfExists) {
      alert("Este CPF já está em uso por outro cliente.");
      cpfInput.focus();
      return;
    }

    try {
      showLoading(buttonAlter)
      await axios.put(`http://localhost:3001/clients/${id}`, {
        client,
        cpf,
        phone,
        type: typeInput.value
      }, {
        headers: { Authorization: token }
      })
      closeModal()
      await loadingClients()
    } catch (error) {
      console.error("Erro ao alterar cliente:", error.response?.data || error)
      if (error.response?.status === 409) {
        alert("Erro: Este CPF já está cadastrado.");
      } else {
        alert("Erro ao alterar cliente. Veja o console.")
      }
    } finally {
      hideLoading(buttonAlter)
    }
  }

  buttonAlter.addEventListener("click", handleAlter)
}
