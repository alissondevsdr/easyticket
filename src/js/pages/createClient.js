import { showLoading, hideLoading } from "../services/loading.js";
import { loadingClients, getClients } from "./listClient.js";
import { maskPhone, maskCPF } from "../utils/format.js";

const clientForm = document.getElementById('clientForm');
const createButton = document.getElementById('createButton');

// ─── Tipo de cliente ──────────────────────────────────────────────────────────
let selectedType = 'geral';

const typeGrid = document.getElementById('clientTypeGrid');
typeGrid?.addEventListener('click', (e) => {
  const item = e.target.closest('.reg-type-item');
  if (!item) return;
  typeGrid.querySelectorAll('.reg-type-item').forEach(el => el.classList.remove('active'));
  item.classList.add('active');
  selectedType = item.dataset.type;
});

// ─── Preview do nome em tempo real ───────────────────────────────────────────
const clientInput = document.getElementById('client');
const previewName = document.getElementById('regPreviewName');

clientInput?.addEventListener('input', () => {
  const val = clientInput.value.trim();
  if (val) {
    previewName.textContent = val;
    previewName.classList.add('filled');
  } else {
    previewName.textContent = 'Aguardando nome...';
    previewName.classList.remove('filled');
  }
  validateField(clientInput, 'hintClient', val.length >= 3, 'Nome muito curto', 'Nome válido');
});

// ─── Máscara de telefone ──────────────────────────────────────────────────────
const phoneInput = document.getElementById('phone');
phoneInput?.addEventListener('input', (e) => {
  e.target.value = maskPhone(e.target.value);
  const clean = e.target.value.replace(/\D/g, '');
  validateField(phoneInput, 'hintPhone', clean.length >= 10, 'Telefone incompleto', 'Telefone válido');
});

// ─── Máscara de CPF ───────────────────────────────────────────────────────────
const cpfInput = document.getElementById('cpf');
cpfInput?.addEventListener('input', (e) => {
  e.target.value = maskCPF(e.target.value);
  const clean = e.target.value.replace(/\D/g, '');
  validateField(cpfInput, 'hintCpf', clean.length === 11, 'CPF incompleto', 'CPF válido');
});

// ─── Validação inline ─────────────────────────────────────────────────────────
function validateField(input, hintId, isValid, errorMsg, okMsg) {
  const hint = document.getElementById(hintId);
  if (!hint) return;
  const val = input.value.trim();
  if (!val) {
    hint.textContent = '';
    hint.className = 'reg-hint';
    return;
  }
  hint.textContent = isValid ? `✓ ${okMsg}` : errorMsg;
  hint.className = isValid ? 'reg-hint valid' : 'reg-hint invalid';
}

// ─── Submit ───────────────────────────────────────────────────────────────────
clientForm?.addEventListener('submit', function (event) {
  event.preventDefault();
  showLoading(createButton);

  const client = clientInput.value.trim();
  const cpf = cpfInput.value.trim();
  const phone = phoneInput.value.trim();

  handleClient(client, cpf, phone, selectedType);
});

async function handleClient(client, cpf, phone, type) {
  const URL_CLIENTS = 'http://localhost:3001/clients';
  const token = localStorage.getItem('authToken');

  try {
    const response = await axios.post(
      URL_CLIENTS,
      { client, cpf, phone, type },
      { headers: { Authorization: token } }
    );

    console.log('Cliente cadastrado com sucesso!', response.data);

    await loadingClients();
    updateRegisterMetrics();
    reset();
    hideLoading(createButton);

    createButton.innerHTML = '<i class="fa-solid fa-check"></i> Sucesso!';
    setTimeout(() => {
      createButton.innerHTML = '<i class="fa-solid fa-user-plus"></i> Cadastrar';
    }, 2000);

  } catch (error) {
    hideLoading(createButton);
    createButton.innerHTML = 'Erro!';
    createButton.classList.add('is-danger');

    setTimeout(() => {
      createButton.innerHTML = '<i class="fa-solid fa-user-plus"></i> Cadastrar';
      createButton.classList.remove('is-danger');
    }, 3000);

    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('Falha na autenticação. Por favor, faça login novamente.');
    }
    console.error('Erro ao cadastrar cliente:', error.response?.data || error.message);
  }
}

// ─── Reset do formulário ──────────────────────────────────────────────────────
function reset() {
  clientInput.value = '';
  cpfInput.value = '';
  phoneInput.value = '';
  previewName.textContent = 'Aguardando nome...';
  previewName.classList.remove('filled');
  document.querySelectorAll('.reg-hint').forEach(h => {
    h.textContent = '';
    h.className = 'reg-hint';
  });
}

// ─── Métricas do cadastro ─────────────────────────────────────────────────────
export function updateRegisterMetrics() {
  const clients = getClients(); // síncrono — retorna o array local diretamente

  const metricTotal = document.getElementById('metricTotal');
  const metricToday = document.getElementById('metricToday');
  const metricLast = document.getElementById('metricLast');

  if (metricTotal) metricTotal.textContent = clients.length;

  // Último cadastrado (assume que o último da lista é o mais recente)
  if (metricLast) {
    metricLast.textContent = clients.length > 0
      ? (clients[clients.length - 1].client?.split(' ')[0] || '—')
      : '—';
  }

  // Clientes cadastrados hoje — filtra por createdAt == data local de hoje
  if (metricToday) {
    const today = new Date().toLocaleDateString('pt-BR'); // formato: dd/mm/aaaa
    const todayCount = clients.filter(c => {
      if (!c.createdAt) return false;
      return new Date(c.createdAt).toLocaleDateString('pt-BR') === today;
    }).length;
    metricToday.textContent = todayCount;
  }
}

// Atualiza métricas ao abrir o painel de Cadastro
document.addEventListener('createModalOpened', async () => {
  await loadingClients();
  updateRegisterMetrics();
});
