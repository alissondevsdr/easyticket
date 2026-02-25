import { showLoading, hideLoading } from "../services/loading.js";
import { getClients } from "./listClient.js";

// ─── Estado local ─────────────────────────────────────────────────────────────
let selectedPayment = null;

// ─── Elementos do DOM ─────────────────────────────────────────────────────────
const payments       = document.getElementById("payments");
const valueInput     = document.getElementById("valueInput");
const finalizeBtn    = document.querySelector(".btn-finalize");
const metricRevenue  = document.getElementById("metricRevenue");
const metricSales    = document.getElementById("metricSales");
const metricAvg      = document.getElementById("metricAvg");
const summaryValue   = document.getElementById("pdv-summary-value");

const paymentIds = ["cash", "credit", "debit", "pix"];

// ─── Select2 ──────────────────────────────────────────────────────────────────
function initSelect2() {
  if ($("#clientSelect").data("select2")) {
    $("#clientSelect").select2("destroy");
  }

  const clients = getClients();

  const data = clients.map((c) => ({
    id: c.id,
    text: `${c.client} — ${c.cpf}`,
  }));

  $("#clientSelect").select2({
    placeholder: "Buscar cliente pelo nome ou CPF...",
    allowClear: true,
    width: "100%",
    dropdownParent: $(".pdv"),
    language: {
      noResults: () => "Nenhum cliente encontrado",
    },
    data,
  });

  $("#clientSelect").on("select2:clear", () => {
    $("#clientSelect").val(null).trigger("change");
  });
}

document.addEventListener("saleModalOpened", () => {
  initSelect2();
  loadMetrics();
});

// ─── Seleção de método de pagamento ──────────────────────────────────────────
payments.addEventListener("click", function (event) {
  const clickedId = paymentIds.find(
    (id) => event.target.closest(`#${id}`) !== null
  );
  if (!clickedId) return;

  const clickedEl = document.getElementById(clickedId);
  const wasActive = clickedEl.classList.contains("active");

  // Remove active de todos
  paymentIds.forEach((id) => document.getElementById(id).classList.remove("active"));

  if (!wasActive) {
    clickedEl.classList.add("active");
    selectedPayment = clickedId;
  } else {
    selectedPayment = null;
  }
});

// Remove seleção ao clicar fora
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

  if (!clientId)                   { showToast("Selecione um cliente.", "warning"); return; }
  if (!value || parseFloat(value) <= 0) { showToast("Informe um valor válido.", "warning"); return; }
  if (!selectedPayment)            { showToast("Selecione um método de pagamento.", "warning"); return; }

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
  selectedPayment = null;
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
  let toast = document.getElementById("et-toast-el");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "et-toast-el";
    toast.className = "et-toast";
    document.body.appendChild(toast);
  }

  const icons = { success: "✓", warning: "⚠", error: "✕" };
  toast.innerHTML = `<span>${icons[type] || "✓"}</span> ${message}`;
  toast.className = `et-toast ${type}`;

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
