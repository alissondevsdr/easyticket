import { showLoading, hideLoading } from "../services/loading.js";
import { getClients } from "./listClient.js";

// ─── Estado local ─────────────────────────────────────────────────────────────
let selectedPayment = null;

// ─── Elementos do DOM ─────────────────────────────────────────────────────────
const payments      = document.getElementById("payments");
const cash          = document.getElementById("cash");
const credit        = document.getElementById("credit");
const debit         = document.getElementById("debit");
const pix           = document.getElementById("pix");
const valueInput    = document.getElementById("valueInput");
const finalizeBtn   = document.querySelector(".pdv .button.is-primary");
const metricRevenue = document.getElementById("metricRevenue");
const metricSales   = document.getElementById("metricSales");
const metricAvg     = document.getElementById("metricAvg");

// ─── Select2: usa clientes já carregados em memória ───────────────────────────
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
    placeholder: "Buscar cliente...",
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
const paymentMap = { cash, credit, debit, pix };

payments.addEventListener("click", function (event) {
  const clicked = Object.keys(paymentMap).find((key) =>
    event.target.classList.contains(key)
  );
  if (!clicked) return;

  const wasActive = paymentMap[clicked].classList.contains("active");
  Object.values(paymentMap).forEach((el) => el.classList.remove("active"));

  if (!wasActive) {
    paymentMap[clicked].classList.add("active");
    selectedPayment = clicked;
  } else {
    selectedPayment = null;
  }
});

document.addEventListener("click", function (event) {
  if (!payments.contains(event.target)) {
    Object.values(paymentMap).forEach((el) => el.classList.remove("active"));
  }
});

// ─── Máscara de valor monetário ───────────────────────────────────────────────
valueInput.addEventListener("input", function (e) {
  let value = e.target.value.replace(/\D/g, "");
  value = value.replace(/(\d)(\d{2})$/, "$1,$2");
  value = value.replace(/(?=(\d{3})+(?!\d))/g, ".");
  e.target.value = value ? "R$ " + value : "";
});

// ─── Finalizar venda ──────────────────────────────────────────────────────────
finalizeBtn.addEventListener("click", async function () {
  const clientId = $("#clientSelect").val();
  const rawValue = valueInput.value.replace(/\D/g, "");
  const value    = rawValue ? (parseInt(rawValue) / 100).toFixed(2) : null;

  if (!clientId) { showToast("Selecione um cliente.", "warning"); return; }
  if (!value || parseFloat(value) <= 0) { showToast("Informe um valor válido.", "warning"); return; }
  if (!selectedPayment) { showToast("Selecione um método de pagamento.", "warning"); return; }

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
  Object.values(paymentMap).forEach((el) => el.classList.remove("active"));
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
  return Number(value).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = "success") {
  const existing = document.getElementById("pdv-toast");
  if (existing) existing.remove();

  const colors = { success: "#a5ff01", warning: "#f5a623", error: "#ff4d4d" };
  const toast = document.createElement("div");
  toast.id = "pdv-toast";
  toast.textContent = message;

  Object.assign(toast.style, {
    position: "fixed", bottom: "30px", left: "50%", transform: "translateX(-50%)",
    background: colors[type] || colors.success,
    color: type === "success" ? "#000" : "#fff",
    padding: "12px 28px", borderRadius: "8px", fontWeight: "600",
    fontSize: "0.95rem", zIndex: "9999", boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    transition: "opacity 0.4s ease", opacity: "1",
  });

  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 400); }, 3000);
}
