// ─── reports.js ──────────────────────────────────────────────────────────────
// Dashboard de métricas e gráficos — EasyTicket


// ─── Instâncias Chart.js ──────────────────────────────────────────────────────
let chartLine = null;
let chartDonut = null;

// ─── Paleta de cores (alinhada ao design system) ──────────────────────────────
const COLORS = {
  accent: "#a5ff01",
  accentD: "#7acc00",
  pix: "#00c8ff",
  credit: "#bf5aff",
  debit: "#f59f00",
  cash: "#a5ff01",
  grid: "#1e2230",
  text: "#5a6380",
};

// ─── Utilitários ──────────────────────────────────────────────────────────────
function fmtCurrency(val) {
  return "R$ " + Number(val || 0)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function fmtShort(val) {
  const n = Number(val || 0);
  if (n >= 1000) return "R$ " + (n / 1000).toFixed(1).replace(".", ",") + "k";
  return fmtCurrency(n);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ─── Configuração global Chart.js ─────────────────────────────────────────────
function applyChartDefaults() {
  if (!window.Chart) return;
  Chart.defaults.color = COLORS.text;
  Chart.defaults.font.family = "Poppins, sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = "#0d0f14";
  Chart.defaults.plugins.tooltip.borderColor = "#252836";
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = "#fff";
  Chart.defaults.plugins.tooltip.bodyColor = "#8892a4";
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
}

// ─── Gráfico de linha — vendas por dia ────────────────────────────────────────
function renderLineChart(labels, data) {
  const ctx = document.getElementById("chartLine")?.getContext("2d");
  if (!ctx) return;

  if (chartLine) chartLine.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, "rgba(165,255,1,0.18)");
  gradient.addColorStop(1, "rgba(165,255,1,0)");

  chartLine = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data,
        borderColor: COLORS.accent,
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointBackgroundColor: COLORS.accent,
        pointBorderColor: "#0d0f14",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          grid: { color: COLORS.grid, drawBorder: false },
          ticks: { color: COLORS.text, maxTicksLimit: 7 },
        },
        y: {
          grid: { color: COLORS.grid, drawBorder: false },
          ticks: {
            color: COLORS.text,
            callback: (v) => fmtShort(v),
          },
          beginAtZero: true,
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => "  " + fmtCurrency(ctx.raw),
          },
        },
      },
    },
  });
}

// ─── Gráfico de donut — métodos de pagamento ──────────────────────────────────
function renderDonutChart(payments) {
  const ctx = document.getElementById("chartDonut")?.getContext("2d");
  if (!ctx) return;

  if (chartDonut) chartDonut.destroy();

  const labels = ["Dinheiro", "PIX", "Crédito", "Débito"];
  const data = [
    payments.cash || 0,
    payments.pix || 0,
    payments.credit || 0,
    payments.debit || 0,
  ];
  const colors = [COLORS.cash, COLORS.pix, COLORS.credit, COLORS.debit];
  const total = data.reduce((a, b) => a + b, 0);

  chartDonut = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + "cc"),
        borderColor: colors,
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
              return `  ${ctx.label}: ${pct}%`;
            },
          },
        },
      },
    },
  });

  // Legenda customizada
  const legend = document.getElementById("donutLegend");
  if (!legend) return;
  legend.innerHTML = labels.map((label, i) => {
    const pct = total > 0 ? ((data[i] / total) * 100).toFixed(0) : 0;
    const ids = ["cash", "pix", "credit", "debit"];
    return `
      <div class="donut-legend-item">
        <div class="donut-legend-left">
          <span class="donut-legend-dot" style="background:${colors[i]}"></span>
          <span class="donut-legend-label">${label}</span>
        </div>
        <span class="donut-legend-pct">${pct}%</span>
      </div>`;
  }).join("");
}

// ─── Barras horizontais — tipo de cliente ─────────────────────────────────────
function renderBars(types) {
  const wrap = document.getElementById("barList");
  if (!wrap) return;

  const items = [
    { key: "geral", label: "Geral", icon: "fa-users" },
    { key: "vip", label: "VIP", icon: "fa-star" },
    { key: "cortesia", label: "Cortesia", icon: "fa-ticket" },
  ];

  const max = Math.max(...items.map(i => types[i.key] || 0), 1);

  wrap.innerHTML = items.map(({ key, label, icon }) => {
    const val = types[key] || 0;
    const pct = Math.round((val / max) * 100);
    return `
      <div class="bar-item">
        <div class="bar-item-top">
          <span class="bar-item-label">
            <i class="fa-solid ${icon}"></i>${label}
          </span>
          <span class="bar-item-value">${val} cliente${val !== 1 ? "s" : ""}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join("");
}

// ─── Tabela de vendas recentes ────────────────────────────────────────────────
function renderRecentSales(sales) {
  const tbody = document.getElementById("recentSalesBody");
  if (!tbody) return;

  const payMap = {
    cash: { label: "Dinheiro", icon: "fa-money-bill-1" },
    pix: { label: "PIX", icon: "fa-qrcode" },
    credit: { label: "Crédito", icon: "fa-credit-card" },
    debit: { label: "Débito", icon: "fa-credit-card" },
  };

  if (!sales || sales.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="report-empty">
            <i class="fa-solid fa-chart-bar"></i>
            <p>Nenhuma venda registrada ainda</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = sales.slice(0, 8).map((s, i) => {
    const pm = payMap[s.paymentMethod] || { label: s.paymentMethod, icon: "fa-circle" };
    const name = s.client?.client || s.clientName || "—";
    return `
      <tr>
        <td>#${String(i + 1).padStart(2, "0")}</td>
        <td>${name}</td>
        <td>
          <span class="pay-badge ${s.paymentMethod}">
            <i class="fa-solid ${pm.icon}"></i>${pm.label}
          </span>
        </td>
        <td style="color:#a5ff01;font-weight:700">${fmtCurrency(s.value)}</td>
      </tr>`;
  }).join("");
}

// ─── Carregar dados da API ────────────────────────────────────────────────────
async function loadReportData() {
  const token = localStorage.getItem("authToken");
  const headers = { Authorization: token };

  const startDate = document.getElementById("rptDateStart")?.value;
  const endDate = document.getElementById("rptDateEnd")?.value;
  const params = { startDate, endDate };

  try {
    // ── KPIs principais ──────────────────────
    const { data: metrics } = await axios.get(
      "http://localhost:3001/sales/metrics", { headers, params }
    );

    setText("rptRevenue", fmtCurrency(metrics.totalRevenue));
    setText("rptSales", metrics.totalSales ?? "0");
    setText("rptAvg", fmtCurrency(metrics.avgTicket));

  } catch (e) {
    console.error("Erro ao carregar métricas:", e);
  }

  try {
    // ── Vendas + breakdown por método ────────
    const { data: sales } = await axios.get(
      "http://localhost:3001/sales", { headers, params }
    );

    renderRecentSales(sales);

    // Agrega pagamentos
    const payments = { cash: 0, pix: 0, credit: 0, debit: 0 };
    sales.forEach(s => {
      if (s.status !== "CANCELADA" && s.paymentMethod in payments) {
        payments[s.paymentMethod]++;
      }
    });
    renderDonutChart(payments);

    // Vendas por dia (baseado no range selecionado)
    let labels = [];
    let data = [];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const dayMap = {};
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        dayMap[key] = 0;
      }

      sales.forEach(s => {
        if (s.status !== "CANCELADA") {
          const d = new Date(s.createdAt);
          const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
          if (key in dayMap) dayMap[key] += Number(s.value || 0);
        }
      });

      labels = Object.keys(dayMap);
      data = Object.values(dayMap);
    }

    renderLineChart(labels, data);

  } catch (e) {
    console.error("Erro ao carregar vendas:", e);
    renderRecentSales([]);
    renderDonutChart({ cash: 0, pix: 0, credit: 0, debit: 0 });
  }

  try {
    // ── Clientes cadastrados no período ──────
    const { data: clients } = await axios.get(
      "http://localhost:3001/clients", { headers, params }
    );

    setText("rptClients", clients.length);

    const types = { geral: 0, vip: 0, cortesia: 0 };
    clients.forEach(c => { if (c.type in types) types[c.type]++; else types.geral++; });
    renderBars(types);

  } catch (e) {
    console.error("Erro ao carregar clientes:", e);
    renderBars({ geral: 0, vip: 0, cortesia: 0 });
  }
}

// ─── Inicialização de datas ───────────────────────────────────────────────────
function initReportFilters() {
  const startInput = document.getElementById("rptDateStart");
  const endInput = document.getElementById("rptDateEnd");

  if (!startInput || !endInput) return;

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  if (!startInput.value) startInput.value = firstDay;
  if (!endInput.value) endInput.value = lastDay;

  startInput.addEventListener("change", loadReportData);
  endInput.addEventListener("change", loadReportData);
}

// ─── Init ao abrir a aba ──────────────────────────────────────────────────────
document.addEventListener("reportModalOpened", () => {
  applyChartDefaults();
  initReportFilters();
  loadReportData();
});
