import { showLoading, hideLoading } from "../services/loading.js";
import { getClients, loadingClients } from "./listClient.js";

// ─── Estado local ─────────────────────────────────────────────────────────────
let selectedPayment = null;

// ─── Elementos do DOM ─────────────────────────────────────────────────────────
const payments      = document.getElementById("payments");
const valueInput    = document.getElementById("valueInput");
const finalizeBtn   = document.querySelector(".btn-finalize");
const metricRevenue = document.getElementById("metricRevenue");
const metricSales   = document.getElementById("metricSales");
const metricAvg     = document.getElementById("metricAvg");
const summaryValue  = document.getElementById("pdv-summary-value");

const paymentIds = ["cash", "credit", "debit", "pix"];

// ─── Select2 ──────────────────────────────────────────────────────────────────
async function initSelect2() {
  if ($("#clientSelect").data("select2")) {
    $("#clientSelect").select2("destroy");
  }

  // getClients() é async — precisa de await para receber o array real
  let clients = await getClients();

  // Fallback: se ainda não carregou, busca da API direto
  if (!clients || clients.length === 0) {
    await loadingClients();
    clients = await getClients();
  }

  const data = clients.map((c) => ({
    id:   c.id,
    text: `${c.client} — ${c.cpf}`,
  }));

  $("#clientSelect").select2({
    placeholder:    "Buscar cliente pelo nome ou CPF...",
    allowClear:     true,
    width:          "100%",
    dropdownParent: $("#saleModal"),   // ← fora do .pdv para não ser cortado pelo overflow:hidden
    language: {
      noResults:    () => "Nenhum cliente encontrado",
      searching:    () => "Buscando...",
    },
    data,
  });

  $("#clientSelect").on("select2:clear", () => {
    $("#clientSelect").val(null).trigger("change");
  });
}

document.addEventListener("saleModalOpened", async () => {
  await initSelect2();
  loadMetrics();
});

// ─── Seleção de método de pagamento ──────────────────────────────────────────
payments.addEventListener("click", function (event) {
  const clickedId = paymentIds.find(
    (id) => event.target.closest(`#${id}`) !== null
  );
  if (!clickedId) return;

  const clickedEl  = document.getElementById(clickedId);
  const wasActive  = clickedEl.classList.contains("active");

  paymentIds.forEach((id) => document.getElementById(id).classList.remove("active"));

  if (!wasActive) {
    clickedEl.classList.add("active");
    selectedPayment = clickedId;
  } else {
    selectedPayment = null;
  }
});

// Remove seleção ao clicar fora dos cards de pagamento
document.addEventListener("click", function (event) {
  if (!payments.contains(event.target)) {
    paymentIds.forEach((id) => document.getElementById(id)?.classList.remove("active"));
    selectedPayment = null;
  }
});

// ─── Máscara de valor monetário ───────────────────────────────────────────────
valueInput.addEventListener("input", function (e) {
  let raw = e.target.value.replace(/\D/g, "");
  if (!raw) { e.target.value = ""; updateSummary(""); return; }
  raw = raw.replace(/(\d)(\d{2})$/, "$1,$2");
  raw = raw.replace(/(?=(\d{3})+(?!\d))/g, ".");
  e.target.value = "R$ " + raw;
  updateSummary(e.target.value);
});

function updateSummary(val) {
  if (!summaryValue) return;
  summaryValue.textContent = val || "R$ 0,00";
}

// ─── Finalizar venda ──────────────────────────────────────────────────────────
finalizeBtn?.addEventListener("click", async function () {
  const clientId = $("#clientSelect").val();
  const rawValue = valueInput.value.replace(/\D/g, "");
  const value    = rawValue ? (parseInt(rawValue) / 100).toFixed(2) : null;

  if (!clientId)                        { showToast("Selecione um cliente.", "warning");       return; }
  if (!value || parseFloat(value) <= 0) { showToast("Informe um valor válido.", "warning");    return; }
  if (!selectedPayment)                 { showToast("Selecione um método de pagamento.", "warning"); return; }

  const token = localStorage.getItem("authToken");

  try {
    showLoading(finalizeBtn);
    await axios.post(
      "http://localhost:3001/sales",
      { value: parseFloat(value), paymentMethod: selectedPayment, clientId: Number(clientId) },
      { headers: { Authorization: token } }
    );
    showToast("Venda registrada com sucesso!", "success");
    resetPDV();
    loadMetrics();
  } catch (error) {
    const msg = error.response?.data?.mensagem || "Erro ao registrar venda.";
    showToast(msg, "error");
    console.error("Erro ao finalizar venda:", error);
  } finally {
    hideLoading(finalizeBtn);
  }
});

// ─── Resetar PDV ──────────────────────────────────────────────────────────────
function resetPDV() {
  $("#clientSelect").val(null).trigger("change");
  valueInput.value = "";
  selectedPayment  = null;
  paymentIds.forEach((id) => document.getElementById(id)?.classList.remove("active"));
  updateSummary("");
}

// ─── Métricas ─────────────────────────────────────────────────────────────────
export async function loadMetrics() {
  const token = localStorage.getItem("authToken");
  try {
    const { data } = await axios.get("http://localhost:3001/sales/metrics", {
      headers: { Authorization: token },
    });
    if (metricRevenue) metricRevenue.textContent = `R$ ${formatCurrency(data.totalRevenue)}`;
    if (metricSales)   metricSales.textContent   = data.totalSales;
    if (metricAvg)     metricAvg.textContent     = `R$ ${formatCurrency(data.avgTicket)}`;
  } catch (error) {
    console.error("Erro ao carregar métricas:", error);
  }
}

function formatCurrency(value) {
  return Number(value)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = "success") {
  let toast = document.querySelector(".et-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "et-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className   = `et-toast ${type}`;
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ─── LOCALIZAR VENDAS ──────────────────────────────────────────────────────────
const findSalesBtn = document.getElementById("findSalesBtn");
const findSalesModal = document.getElementById("findSalesModal");
const closeFindSalesBtn = document.getElementById("closeFindSalesBtn");
const salesSearchInput = document.getElementById("salesSearchInput");
const salesDateStart = document.getElementById("salesDateStart");
const salesDateEnd = document.getElementById("salesDateEnd");
const salesPaymentFilter = document.getElementById("salesPaymentFilter");
const salesStatusFilter = document.getElementById("salesStatusFilter");
const filterClearBtn = document.getElementById("filterClearBtn");
const salesTableBody = document.getElementById("salesTableBody");

let allSales = [];

// Abrir modal de localizar vendas
findSalesBtn?.addEventListener("click", async () => {
  findSalesModal?.classList.remove("none");
  await loadAllSales();
  renderSalesTable();
});

// Fechar modal
closeFindSalesBtn?.addEventListener("click", () => {
  findSalesModal?.classList.add("none");
});

// Carregar todas as vendas
async function loadAllSales() {
  const token = localStorage.getItem("authToken");
  try {
    const { data } = await axios.get("http://localhost:3001/sales", {
      headers: { Authorization: token }
    });
    allSales = data || [];
  } catch (error) {
    console.error("Erro ao carregar vendas:", error);
    showToast("Erro ao carregar vendas.", "error");
    allSales = [];
  }
}

// Filtrar vendas
function getFilteredSales() {
  let filtered = [...allSales];
  
  // Filtro de pesquisa
  const searchTerm = salesSearchInput?.value?.toLowerCase() || "";
  if (searchTerm) {
    filtered = filtered.filter(s => {
      const clientName = s.client?.client?.toLowerCase() || "";
      const clientCpf = s.client?.cpf?.toLowerCase() || "";
      return clientName.includes(searchTerm) || clientCpf.includes(searchTerm);
    });
  }
  
  // Filtro de período
  const dateStart = salesDateStart?.value;
  const dateEnd = salesDateEnd?.value;
  if (dateStart) {
    const start = new Date(dateStart);
    filtered = filtered.filter(s => new Date(s.createdAt) >= start);
  }
  if (dateEnd) {
    const end = new Date(dateEnd);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter(s => new Date(s.createdAt) <= end);
  }
  
  // Filtro de pagamento
  const paymentMethod = salesPaymentFilter?.value;
  if (paymentMethod) {
    filtered = filtered.filter(s => s.paymentMethod === paymentMethod);
  }
  
  // Filtro de situação
  const status = salesStatusFilter?.value;
  if (status) {
    filtered = filtered.filter(s => s.status === status);
  }
  
  return filtered;
}

// Renderizar tabela de vendas
function renderSalesTable() {
  const filtered = getFilteredSales();
  
  if (filtered.length === 0) {
    salesTableBody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <i class="fa-solid fa-search"></i>
            <p>Nenhuma venda encontrada</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  const paymentMap = {
    cash: "Dinheiro",
    pix: "PIX",
    credit: "Crédito",
    debit: "Débito"
  };

  const statusMap = {
    "FINALIZADA": { label: "Finalizada", class: "status-finalized" },
    "CANCELADA": { label: "Cancelada", class: "status-canceled" }
  };

  salesTableBody.innerHTML = filtered.map((sale, index) => {
    const paymentLabel = paymentMap[sale.paymentMethod] || sale.paymentMethod;
    const statusInfo = statusMap[sale.status] || { label: sale.status, class: "" };
    const date = new Date(sale.createdAt).toLocaleDateString("pt-BR");
    const time = new Date(sale.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    return `
      <tr>
        <td>#${String(index + 1).padStart(3, "0")}</td>
        <td>${sale.client?.client || "—"}</td>
        <td>${sale.client?.cpf || "—"}</td>
        <td>R$ ${Number(sale.value).toFixed(2).replace(".", ",")}</td>
        <td>${paymentLabel}</td>
        <td>${date} ${time}</td>
        <td><span class="status-badge ${statusInfo.class}">${statusInfo.label}</span></td>
        <td>
          ${sale.status === "FINALIZADA" ? `
            <button class="btn-cancel-sale" data-sale-id="${sale.id}">
              <i class="fa-solid fa-ban"></i>
              Cancelar
            </button>
          ` : "—"}
        </td>
      </tr>`;
  }).join("");

  // Adicionar event listeners aos botões de cancelar
  document.querySelectorAll(".btn-cancel-sale").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const saleId = btn.dataset.saleId;
      if (confirm("Tem certeza que deseja cancelar esta venda?")) {
        await cancelSale(saleId, btn);
      }
    });
  });
}

// Cancelar venda
async function cancelSale(saleId, buttonElement) {
  const token = localStorage.getItem("authToken");
  try {
    showLoading(buttonElement);
    await axios.put(
      `http://localhost:3001/sales/${saleId}/cancel`,
      {},
      { headers: { Authorization: token } }
    );
    hideLoading(buttonElement);
    showToast("Venda cancelada com sucesso!", "success");
    await loadAllSales();
    renderSalesTable();
    loadMetrics(); // Atualizar métricas do PDV
  } catch (error) {
    hideLoading(buttonElement);
    const msg = error.response?.data?.mensagem || "Erro ao cancelar venda.";
    showToast(msg, "error");
    console.error("Erro ao cancelar venda:", error);
  }
}

// Event listeners para filtros
salesSearchInput?.addEventListener("input", renderSalesTable);
salesDateStart?.addEventListener("change", renderSalesTable);
salesDateEnd?.addEventListener("change", renderSalesTable);
salesPaymentFilter?.addEventListener("change", renderSalesTable);
salesStatusFilter?.addEventListener("change", renderSalesTable);

filterClearBtn?.addEventListener("click", () => {
  if (salesSearchInput) salesSearchInput.value = "";
  if (salesDateStart) salesDateStart.value = "";
  if (salesDateEnd) salesDateEnd.value = "";
  if (salesPaymentFilter) salesPaymentFilter.value = "";
  if (salesStatusFilter) salesStatusFilter.value = "";
  renderSalesTable();
});

