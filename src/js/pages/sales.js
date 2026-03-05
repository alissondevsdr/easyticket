import { showLoading, hideLoading } from "../services/loading.js";
import { getClients, loadingClients } from "./listClient.js";
import { fmtCurrency, showToast } from "../utils/ui.js";

// ─── Estado local ─────────────────────────────────────────────────────────────
let selectedPayment = null;
let selectedEventId = null;   // ← NOVO: evento persistido na sessão do PDV

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

// ─── Badge de tipo do cliente ─────────────────────────────────────────────────
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

// ─── Select2 clientes ─────────────────────────────────────────────────────────
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

// ─── NOVO: Carregar eventos ativos no seletor do PDV ──────────────────────────
async function loadEventSelector() {
  const select = document.getElementById("pdvEventSelect");
  const capLabel = document.getElementById("pdvEventCapacity");
  if (!select) return;

  try {
    const token = localStorage.getItem("authToken");
    const { data: events } = await axios.get(
      "http://localhost:3001/events?status=ATIVO",
      { headers: { Authorization: token } }
    );

    select.innerHTML = `<option value="">— Nenhum evento —</option>` +
      events.map(ev => `<option value="${ev.id}">${ev.name}${ev.date ? " • " + new Date(ev.date).toLocaleDateString("pt-BR") : ""}</option>`).join("");

    // Restaura evento selecionado na sessão (se ainda ativo)
    if (selectedEventId) {
      const stillExists = events.find(ev => ev.id === selectedEventId);
      if (stillExists) {
        select.value = selectedEventId;
        updateCapacityBadge(stillExists, capLabel);
      } else {
        selectedEventId = null;
        if (capLabel) capLabel.innerHTML = "";
      }
    }

    // Listener de troca de evento
    select.addEventListener("change", () => {
      const evId = select.value ? Number(select.value) : null;
      selectedEventId = evId;
      const ev = events.find(e => e.id === evId);
      updateCapacityBadge(ev || null, capLabel);
    });

  } catch (e) {
    console.error("Erro ao carregar eventos para PDV:", e);
    select.innerHTML = `<option value="">Erro ao carregar eventos</option>`;
  }
}

function updateCapacityBadge(ev, el) {
  if (!el) return;
  if (!ev) { el.innerHTML = ""; return; }

  if (!ev.capacity) {
    el.innerHTML = `
      <span class="pdv-event-cap-label">Ingressos</span>
      <span class="pdv-event-cap-value no-cap">${ev.soldCount} vendidos</span>`;
    return;
  }

  const pct = Math.min(100, Math.round((ev.soldCount / ev.capacity) * 100));
  const cls = pct >= 90 ? "is-danger" : pct >= 70 ? "is-warning" : "";
  el.innerHTML = `
    <div class="ev-capacity-bar" style="width: 140px;">
      <div class="ev-capacity-labels" style="margin-bottom: 2px;">
        <span class="pdv-event-cap-label">Capacidade</span>
        <strong class="${cls}" style="font-size: 0.75rem;">${ev.soldCount}/${ev.capacity}</strong>
      </div>
      <div class="ev-progress-track" style="height: 4px; background: #0d0f14;">
        <div class="ev-progress-fill ${cls}" style="width:${pct}%"></div>
      </div>
    </div>`;
}

// ─── Recarregar eventos quando evento for concluído/criado ────────────────────
document.addEventListener("eventsUpdated", () => loadEventSelector());

// ─── Init quando o modal de vendas abre ───────────────────────────────────────
document.addEventListener("saleModalOpened", async () => {
  await initSelect2();
  await loadEventSelector();
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
  let formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  e.target.value = "R$ " + formatted;
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
      {
        value: parseFloat(value),
        paymentMethod: selectedPayment,
        clientId: Number(clientId),
        eventId: selectedEventId || null,   // ← NOVO: envia eventId
      },
      { headers: { Authorization: token } }
    );
    showToast("Venda registrada com sucesso!", "success");
    resetPDV();
    loadMetrics();
    // Atualiza badge de capacidade após nova venda
    loadEventSelector();
  } catch (error) {
    showToast(error.response?.data?.mensagem || "Erro ao registrar venda.", "error");
    console.error("Erro ao finalizar venda:", error);
  } finally {
    hideLoading(finalizeBtn);
  }
});

// ─── Reset PDV (mantém evento selecionado!) ───────────────────────────────────
function resetPDV() {
  $("#clientSelect").val(null).trigger("change");
  valueInput.value = "";
  selectedPayment = null;
  // selectedEventId NÃO é limpo — persiste até troca manual ou conclusão do evento
  paymentIds.forEach(id => document.getElementById(id)?.classList.remove("active"));
  updateSummary("");
  showClientTypeBadge(null);
}

// ─── Métricas ─────────────────────────────────────────────────────────────────
export async function loadMetrics() {
  const token = localStorage.getItem("authToken");
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

// ─── Botão "Ver Vendas" ───────────────────────────────────────────────────────
document.getElementById("findSalesBtn")?.addEventListener("click", () => openSalesListModal());

// ─── Modal lista de vendas ────────────────────────────────────────────────────
async function openSalesListModal() {
  const token = localStorage.getItem("authToken");
  const dynamicModal = document.getElementById("modal");
  const modalContentContainer = document.getElementById("modalContentContainer");

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
          <td><span style="color:#5a6380;font-size:.82rem">${s.event?.name || "—"}</span></td>
          <td>
            <span class="pay-badge ${pm.cls}">
              <i class="fa-solid ${pm.icon}"></i>${pm.label}
            </span>
          </td>
          <td>
            <span class="status-badge ${isCanceled ? "cancelada" : "ativa"}">
               ${isCanceled ? "CANCELADA" : "ATIVA"}
            </span>
          </td>
          <td class="history-td-value">${fmtCurrency(s.value)}</td>
          <td style="color:#5a6380;font-size:.82rem;white-space:nowrap">${date}</td>
          <td>
            <button class="icon-btn icon-delete btn-cancel-sale ${isCanceled ? "disabled" : ""}"
              data-id="${s.id}"
              data-name="${s.client?.client || "—"}"
              data-value="${s.value}"
              title="${isCanceled ? "Venda já cancelada" : "Cancelar venda"}"
              ${isCanceled ? "disabled" : ""}>
              <i class="fa-solid fa-ban"></i>
            </button>
          </td>
        </tr>`;
    }).join("");
  };

  const calculateTotals = (list) => {
    const qty = list.length;
    const val = list.reduce((acc, s) => acc + (s.status !== "CANCELADA" ? s.value : 0), 0);
    const canceled = list.filter(s => s.status === "CANCELADA").length;
    return { qty, val, canceled };
  };

  const updateTotalsDisplay = (list) => {
    const { qty, val, canceled } = calculateTotals(list);
    const totalQtyEl = document.getElementById("totalSalesQty");
    const totalValEl = document.getElementById("totalSalesVal");
    const totalCanceledEl = document.getElementById("totalSalesCanceledQty");
    if (totalQtyEl) totalQtyEl.textContent = qty;
    if (totalValEl) totalValEl.textContent = fmtCurrency(val);
    if (totalCanceledEl) totalCanceledEl.textContent = canceled;
  };

  const today = new Date().toISOString().split("T")[0];

  modalContentContainer.innerHTML = `
    <div class="modal-header">
      <div class="message">
        <i class="fa-solid fa-receipt" style="font-size:.9rem;color:#a5ff01"></i>
        Lista de Vendas
      </div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>
    <div class="history-kpis">
      <div class="history-kpi">
        <div class="history-kpi-icon"><i class="fa-solid fa-list-ul"></i></div>
        <div class="history-kpi-info">
          <span class="history-kpi-label">Vendas exibidas</span>
          <div class="history-kpi-value" id="totalSalesQty">0</div>
        </div>
      </div>
      <div class="history-kpi">
        <div class="history-kpi-icon"><i class="fa-solid fa-dollar-sign"></i></div>
        <div class="history-kpi-info">
          <span class="history-kpi-label">Total (Ativas)</span>
          <div class="history-kpi-value accent" id="totalSalesVal">R$ 0,00</div>
        </div>
      </div>
      <div class="history-kpi">
        <div class="history-kpi-icon"><i class="fa-solid fa-ban"></i></div>
        <div class="history-kpi-info">
          <span class="history-kpi-label">Canceladas</span>
          <div class="history-kpi-value" id="totalSalesCanceledQty">0</div>
        </div>
      </div>
    </div>

    <div class="history-filter-bar">
      <div class="history-filter-item">
        <label>Pesquisar Cliente</label>
        <div class="control has-icons-left">
          <input type="text" id="searchSaleModal" placeholder="Buscar..." class="input">
          <span class="icon is-left"><i class="fa-solid fa-magnifying-glass"></i></span>
        </div>
      </div>
      
      <div class="history-filter-item">
        <label>Status</label>
        <select id="statusFilter" class="select-status-filter">
          <option value="TODOS">Todos os status</option>
          <option value="ATIVA">Ativas</option>
          <option value="CANCELADA">Canceladas</option>
        </select>
      </div>

      <div class="history-filter-item is-date">
        <label>Período das Vendas</label>
        <div class="history-filter-group">
          <input type="date" id="dateStartFilter" value="${today}" class="date-input-filter">
          <span class="history-date-separator">até</span>
          <input type="date" id="dateEndFilter" value="${today}" class="date-input-filter">
        </div>
      </div>
    </div>

    <div class="history-table-wrap" style="margin-top:0; border-radius:0; border-left:0; border-right:0; border-bottom:0">
      <table class="history-table">
        <thead>
          <tr>
            <th style="width:50px">#</th>
            <th>Cliente</th>
            <th>Evento</th>
            <th>Pagamento</th>
            <th>Status</th>
            <th>Valor</th>
            <th>Data/Hora</th>
            <th style="width:40px"></th>
          </tr>
        </thead>
        <tbody id="salesModalBody">${buildRows(sales)}</tbody>
      </table>
    </div>`;

  modalContentContainer.querySelector(".modal-close").addEventListener("click", closeModal);
  document.querySelector(".modal-background").addEventListener("click", closeModal);

  const handleFilter = () => {
    const search = document.getElementById("searchSaleModal").value.toLowerCase();
    const status = document.getElementById("statusFilter").value;
    const start = document.getElementById("dateStartFilter").value;
    const end = document.getElementById("dateEndFilter").value;

    const filtered = sales.filter(s => {
      const name = (s.client?.client || "").toLowerCase();
      const matchesSearch = name.includes(search);
      const sStatus = s.status === "CANCELADA" ? "CANCELADA" : "ATIVA";
      const matchesStatus = status === "TODOS" || sStatus === status;
      let matchesDate = true;
      if (s.createdAt) {
        const saleDate = new Date(s.createdAt).toISOString().split("T")[0];
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
  handleFilter();

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
          <i class="fa-solid fa-ban" style="margin-right:6px"></i>Sim, cancelar
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
        renderSalesModal(sales, closeModal);
      }
    });
  }
}
