import { showLoading, hideLoading } from "../services/loading.js";
import { getClients, loadingClients } from "./listClient.js";

// ─── Estado local ─────────────────────────────────────────────────────────────
let selectedPayment = null;

// ─── Elementos do DOM ─────────────────────────────────────────────────────────
const payments = document.getElementById("payments");
const valueInput = document.getElementById("valueInput");
const finalizeBtn = document.querySelector(".btn-finalize");
const metricRevenue = document.getElementById("metricRevenue");
const metricSales = document.getElementById("metricSales");
const metricAvg = document.getElementById("metricAvg");
const summaryValue = document.getElementById("pdv-summary-value");
const paymentIds = ["cash", "credit", "debit", "pix"];

// ─── Mapas ────────────────────────────────────────────────────────────────────
const typeMap = {
  geral: { label: "Geral", icon: "fa-users", cls: "geral" },
  vip: { label: "VIP", icon: "fa-star", cls: "vip" },
  cortesia: { label: "Cortesia", icon: "fa-ticket", cls: "cortesia" },
};

const payMap = {
  cash: { label: "Dinheiro", icon: "fa-money-bill-1", cls: "cash" },
  pix: { label: "PIX", icon: "fa-qrcode", cls: "pix" },
  credit: { label: "Crédito", icon: "fa-credit-card", cls: "credit" },
  debit: { label: "Débito", icon: "fa-credit-card", cls: "debit" },
};

// ─── Badge de tipo do cliente no header ───────────────────────────────────────
function showClientTypeBadge(clientId) {
  const badge = document.getElementById("clientTypeBadge");
  if (!badge) return;
  if (!clientId) { badge.innerHTML = ""; badge.style.display = "none"; return; }

  const client = getClients().find(c => String(c.id) === String(clientId));
  if (!client) { badge.innerHTML = ""; badge.style.display = "none"; return; }

  const t = typeMap[client.type] || typeMap.geral;
  badge.style.display = "flex";
  badge.innerHTML = `<span class="type-badge type-${t.cls}"><i class="fa-solid ${t.icon}"></i> ${t.label}</span>`;
}

// ─── Select2 ──────────────────────────────────────────────────────────────────
async function initSelect2() {
  if ($("#clientSelect").data("select2")) $("#clientSelect").select2("destroy");

  let clients = await getClients();
  if (!clients || clients.length === 0) { await loadingClients(); clients = await getClients(); }

  $("#clientSelect").select2({
    placeholder: "Buscar cliente pelo nome ou CPF...",
    allowClear: true,
    width: "100%",
    dropdownParent: $("#saleModal"),
    language: { noResults: () => "Nenhum cliente encontrado", searching: () => "Buscando..." },
    data: clients.map(c => ({ id: c.id, text: `${c.client} — ${c.cpf}` })),
  });

  $("#clientSelect").on("select2:select", e => showClientTypeBadge(e.params.data.id));
  $("#clientSelect").on("select2:clear select2:unselect", () => showClientTypeBadge(null));
}

document.addEventListener("saleModalOpened", async () => {
  await initSelect2();
  loadMetrics();
  showClientTypeBadge(null);
});

// ─── Seleção de pagamento ─────────────────────────────────────────────────────
payments.addEventListener("click", function (event) {
  const clickedId = paymentIds.find(id => event.target.closest(`#${id}`) !== null);
  if (!clickedId) return;
  const el = document.getElementById(clickedId);
  const wasActive = el.classList.contains("active");
  paymentIds.forEach(id => document.getElementById(id).classList.remove("active"));
  if (!wasActive) { el.classList.add("active"); selectedPayment = clickedId; }
  else selectedPayment = null;
});

document.addEventListener("click", function (event) {
  if (!payments.contains(event.target)) {
    paymentIds.forEach(id => document.getElementById(id)?.classList.remove("active"));
    selectedPayment = null;
  }
});

// ─── Máscara de valor ─────────────────────────────────────────────────────────
valueInput.addEventListener("input", function (e) {
  let raw = e.target.value.replace(/\D/g, "");
  if (!raw) { e.target.value = ""; updateSummary(""); return; }

  // Formata como milhar (Ex: 1.000)
  let formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  e.target.value = "R$ " + formatted;

  // No resumo visual, mostramos sempre com ,00 para indicar que é valor inteiro
  updateSummary(e.target.value + ",00");
});

function updateSummary(val) {
  if (summaryValue) summaryValue.textContent = val || "R$ 0,00";
}

// ─── Finalizar venda ──────────────────────────────────────────────────────────
finalizeBtn?.addEventListener("click", async function () {
  const clientId = $("#clientSelect").val();
  const rawValue = valueInput.value.replace(/\D/g, "");
  const value = rawValue ? parseInt(rawValue).toFixed(2) : null;

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
    showToast(error.response?.data?.mensagem || "Erro ao registrar venda.", "error");
    console.error("Erro ao finalizar venda:", error);
  } finally {
    hideLoading(finalizeBtn);
  }
});

// ─── Botão "Ver Vendas" ───────────────────────────────────────────────────────
document.getElementById("findSalesBtn")?.addEventListener("click", () => openSalesListModal());

// ─── Modal lista de vendas ────────────────────────────────────────────────────
async function openSalesListModal() {
  const token = localStorage.getItem("authToken");
  const dynamicModal = document.getElementById("modal");
  const modalContentContainer = document.getElementById("modalContentContainer");

  // Aplica largura maior via inline style no modal-content
  dynamicModal.classList.add("is-active");
  modalContentContainer.style.maxWidth = "1200px";

  modalContentContainer.innerHTML = `
    <div class="modal-header">
      <div class="message">
        <i class="fa-solid fa-receipt" style="font-size:.9rem;color:#a5ff01"></i>
        Lista de Vendas
      </div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>
    <div class="history-loading">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>Carregando vendas...</span>
    </div>`;

  const closeModal = () => {
    dynamicModal.classList.remove("is-active");
    modalContentContainer.style.maxWidth = "";
  };

  modalContentContainer.querySelector(".modal-close").addEventListener("click", closeModal);
  document.querySelector(".modal-background").addEventListener("click", closeModal);

  try {
    const { data: sales } = await axios.get("http://localhost:3001/sales", {
      headers: { Authorization: token },
    });
    renderSalesModal(sales, closeModal);
  } catch (e) {
    console.error("Erro ao carregar vendas:", e);
    modalContentContainer.innerHTML = `
      <div class="modal-header">
        <div class="message">Lista de Vendas</div>
        <button class="modal-close is-large" aria-label="close"></button>
      </div>
      <div class="history-loading">
        <i class="fa-solid fa-triangle-exclamation" style="color:#e03131"></i>
        <span>Erro ao carregar vendas</span>
      </div>
      <div class="history-footer"><button class="button cancel">Fechar</button></div>`;
    modalContentContainer.querySelector(".modal-close").addEventListener("click", closeModal);
    modalContentContainer.querySelector(".cancel").addEventListener("click", closeModal);
    document.querySelector(".modal-background").addEventListener("click", closeModal);
  }
}

function renderSalesModal(sales, closeModal) {
  const modalContentContainer = document.getElementById("modalContentContainer");

  const buildRows = list => {
    if (!list.length) return `
      <tr><td colspan="6">
        <div class="history-empty">
          <i class="fa-solid fa-receipt"></i>
          <p>Nenhuma venda encontrada</p>
        </div>
      </td></tr>`;

    return list.map((s, i) => {
      const pm = payMap[s.paymentMethod] || { label: s.paymentMethod, icon: "fa-circle", cls: "" };
      const date = s.createdAt
        ? new Date(s.createdAt).toLocaleDateString("pt-BR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit"
        })
        : "—";
      const isCanceled = s.status === "CANCELADA";

      return `
        <tr style="${isCanceled ? "opacity:.6" : ""}">
          <td class="history-td-num">#${String(i + 1).padStart(2, "0")}</td>
          <td>${s.client?.client || "—"}</td>
          <td>
            <span class="pay-badge ${pm.cls}">
              <i class="fa-solid ${pm.icon}"></i>${pm.label}
            </span>
          </td>
          <td>
            <span class="status-badge ${isCanceled ? 'cancelada' : 'ativa'}">
               ${isCanceled ? 'CANCELADA' : 'ATIVA'}
            </span>
          </td>
          <td class="history-td-value">${fmtCurrency(s.value)}</td>
          <td style="color:#5a6380;font-size:.82rem;white-space:nowrap">${date}</td>
          <td>
            <button class="icon-btn icon-delete btn-cancel-sale ${isCanceled ? 'disabled' : ''}" 
              data-id="${s.id}" 
              data-name="${s.client?.client || '—'}" 
              data-value="${s.value}" 
              title="${isCanceled ? 'Venda já cancelada' : 'Cancelar venda'}"
              ${isCanceled ? 'disabled' : ''}>
              <i class="fa-solid fa-ban"></i>
            </button>
          </td>
        </tr>`;
    }).join("");
  };

  const calculateTotals = (list) => {
    // Quantidade total de registros filtrados
    const qty = list.length;
    // Soma apenas das vendas ATIVAS
    const val = list.reduce((acc, s) => {
      return acc + (s.status !== "CANCELADA" ? Number(s.value || 0) : 0);
    }, 0);
    return { qty, val };
  };

  const updateTotalsDisplay = (list) => {
    const totals = calculateTotals(list);
    const qtyEl = document.getElementById("salesTotalQty");
    const valEl = document.getElementById("salesTotalVal");
    if (qtyEl) qtyEl.textContent = totals.qty;
    if (valEl) valEl.textContent = fmtCurrency(totals.val);
  };

  modalContentContainer.innerHTML = `
    <div class="modal-header">
      <div class="message">
        <i class="fa-solid fa-receipt" style="font-size:.9rem;color:#a5ff01"></i>
        Lista de Vendas
      </div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>

    <!-- Barra de busca e Filtro -->
    <div style="padding:20px 28px 0; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
      <div class="search-wrap" style="flex: 1; min-width: 250px;">
        <input type="text" id="searchSaleModal" class="search-input"
          placeholder="Buscar por cliente ou forma de pagamento...">
        <i class="search-icon fas fa-magnifying-glass"></i>
      </div>

      <div class="date-range-wrap" style="display: flex; gap: 8px; align-items: center;">
        <input type="date" id="dateStartFilter" class="date-input-filter">
        <span style="color: #5a6380; font-size: 0.75rem;">até</span>
        <input type="date" id="dateEndFilter" class="date-input-filter">
      </div>

      <div class="select-wrapper">
        <select id="statusFilter" class="select-status-filter">
          <option value="TODOS">Todas Situações</option>
          <option value="ATIVA">Ativas</option>
          <option value="CANCELADA">Canceladas</option>
        </select>
      </div>
    </div>

    <!-- Tabela -->
    <div class="history-table-wrap" style="margin:16px 28px 0; max-height:420px">
      <table class="history-table">
        <thead>
          <tr>
            <th style="width:50px">#</th>
            <th>Cliente</th>
            <th style="width:140px">Pagamento</th>
            <th style="width:120px">Situação</th>
            <th style="width:120px">Valor</th>
            <th style="width:160px">Data</th>
            <th style="width:60px;text-align:center">Ação</th>
          </tr>
        </thead>
        <tbody id="salesModalBody"></tbody>
      </table>
    </div>

    <!-- Barra de Totais Integrada -->
    <div class="sales-totals-bar">
      <div class="total-item">
        <span class="label">QTD. VENDAS</span>
        <span class="value" id="salesTotalQty">0</span>
      </div>
      <div class="total-item highlight">
        <span class="label">VALOR TOTAL (ATIVAS)</span>
        <span class="value" id="salesTotalVal">R$ 0,00</span>
      </div>
    </div>

    <div class="history-footer">
      <button class="button cancel">Fechar</button>
    </div>`;

  // Define data de hoje nos inputs
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById("dateStartFilter").value = hoje;
  document.getElementById("dateEndFilter").value = hoje;

  // Fechar
  modalContentContainer.querySelector(".modal-close").addEventListener("click", closeModal);
  modalContentContainer.querySelector(".cancel").addEventListener("click", closeModal);
  document.querySelector(".modal-background").addEventListener("click", closeModal);

  // Busca e Filtro em tempo real
  const handleFilter = () => {
    const q = document.getElementById("searchSaleModal").value.trim().toLowerCase();
    const status = document.getElementById("statusFilter").value;
    const start = document.getElementById("dateStartFilter").value;
    const end = document.getElementById("dateEndFilter").value;

    const filtered = sales.filter(s => {
      // Filtro de texto
      const name = (s.client?.client || "").toLowerCase();
      const pm = (payMap[s.paymentMethod]?.label || "").toLowerCase();
      const matchesSearch = name.includes(q) || pm.includes(q);

      // Filtro de status
      const sStatus = s.status === "CANCELADA" ? "CANCELADA" : "ATIVA";
      const matchesStatus = status === "TODOS" || sStatus === status;

      // Filtro de datas
      let matchesDate = true;
      if (s.createdAt) {
        const saleDate = new Date(s.createdAt).toISOString().split('T')[0];
        if (start && saleDate < start) matchesDate = false;
        if (end && saleDate > end) matchesDate = false;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    document.getElementById("salesModalBody").innerHTML = buildRows(filtered);
    updateTotalsDisplay(filtered);
    bindCancelButtons(filtered);
  };

  document.getElementById("searchSaleModal").addEventListener("input", handleFilter);
  document.getElementById("statusFilter").addEventListener("change", handleFilter);
  document.getElementById("dateStartFilter").addEventListener("change", handleFilter);
  document.getElementById("dateEndFilter").addEventListener("change", handleFilter);

  // Aplica filtro inicial (hoje)
  handleFilter();

  // ─── Bind botões cancelar ───────────────────────────────────────────────────
  function bindCancelButtons(list) {
    document.querySelectorAll(".btn-cancel-sale").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const name = btn.dataset.name;
        const valor = fmtCurrency(btn.dataset.value);
        confirmCancel(id, name, valor, list);
      });
    });
  }

  // ─── Confirmação de cancelamento ────────────────────────────────────────────
  function confirmCancel(saleId, name, valor, list) {
    const token = localStorage.getItem("authToken");

    modalContentContainer.innerHTML = `
      <div class="modal-header">
        <div class="message">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:.9rem;color:#e03131"></i>
          Cancelar venda
        </div>
        <button class="modal-close is-large" aria-label="close"></button>
      </div>
      <div class="card-content">
        <p style="color:#c8cdd8;font-size:.9rem;font-family:'Poppins',sans-serif;margin:0 0 8px">
          Deseja cancelar a venda de <strong style="color:#fff">${valor}</strong>
          para <strong style="color:#fff">${name}</strong>?
        </p>
        <p style="color:#5a6380;font-size:.78rem;font-family:'Poppins',sans-serif;margin:0">
          Esta ação não pode ser desfeita.
        </p>
      </div>
      <div class="buttons-modal">
        <button class="button is-danger-confirm" id="confirmCancelBtn">
          <i class="fa-solid fa-ban" style="margin-right:6px"></i>
          Sim, cancelar
        </button>
        <button class="button cancel" id="backToListBtn">Voltar</button>
      </div>`;

    modalContentContainer.querySelector(".modal-close").addEventListener("click", closeModal);
    document.querySelector(".modal-background").addEventListener("click", closeModal);
    document.getElementById("backToListBtn").addEventListener("click", () => renderSalesModal(sales, closeModal));

    const confirmBtn = document.getElementById("confirmCancelBtn");
    confirmBtn.addEventListener("click", async () => {
      try {
        showLoading(confirmBtn);
        await axios.put(
          `http://localhost:3001/sales/${saleId}/cancel`,
          {},
          { headers: { Authorization: token } }
        );
        // Atualiza o status localmente e re-renderiza sem fechar o modal
        const updated = sales.map(s => s.id === saleId ? { ...s, status: "CANCELADA" } : s);
        sales.length = 0;
        updated.forEach(s => sales.push(s));
        renderSalesModal(sales, closeModal);
        loadMetrics();
        showToast("Venda cancelada com sucesso!", "success");
      } catch (err) {
        console.error("Erro ao cancelar venda:", err);
        showToast(err.response?.data?.mensagem || "Erro ao cancelar venda.", "error");
        hideLoading(confirmBtn);
        // Volta para a lista mesmo em caso de erro
        renderSalesModal(sales, closeModal);
      }
    });
  }
}

// ─── Reset PDV ────────────────────────────────────────────────────────────────
function resetPDV() {
  $("#clientSelect").val(null).trigger("change");
  valueInput.value = "";
  selectedPayment = null;
  paymentIds.forEach(id => document.getElementById(id)?.classList.remove("active"));
  updateSummary("");
  showClientTypeBadge(null);
}

// ─── Métricas ─────────────────────────────────────────────────────────────────
export async function loadMetrics() {
  const token = localStorage.getItem("authToken");

  // Preenche o rótulo do mês (ex: Março de 2026)
  const monthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  document.querySelectorAll(".sales-kpi-month").forEach(el => {
    el.innerHTML = `<i class="fa-regular fa-calendar"></i> ${monthLabel}`;
  });

  try {
    const { data } = await axios.get("http://localhost:3001/sales/metrics", {
      headers: { Authorization: token },
    });
    if (metricRevenue) metricRevenue.textContent = `R$ ${fmt(data.totalRevenue)}`;
    if (metricSales) metricSales.textContent = data.totalSales;
    if (metricAvg) metricAvg.textContent = `R$ ${fmt(data.avgTicket)}`;
  } catch (error) {
    console.error("Erro ao carregar métricas:", error);
  }
}

function fmt(v) {
  return Number(v).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function fmtCurrency(val) {
  return "R$ " + Number(val || 0).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function showToast(message, type = "success") {
  let toast = document.querySelector(".et-toast");
  if (!toast) { toast = document.createElement("div"); toast.className = "et-toast"; document.body.appendChild(toast); }
  toast.textContent = message;
  toast.className = `et-toast ${type}`;
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => toast.classList.remove("show"), 3000);
}
