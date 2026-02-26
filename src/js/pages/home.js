// home.js — carrega os KPIs da tela Início

function fmtCurrency(val) {
  return "R$ " + Number(val || 0)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function setText(id, value) {
  const el = document.getElementById(id)
  if (el) el.textContent = value
}

export async function loadHomeKpis() {
  const token = localStorage.getItem("authToken")
  const headers = { Authorization: token }

  try {
    const { data: metrics } = await axios.get("http://localhost:3001/sales/metrics", { headers })
    setText("homeKpiSales",   metrics.totalSales ?? "0")
    setText("homeKpiRevenue", fmtCurrency(metrics.totalRevenue))
    setText("homeKpiAvg",     fmtCurrency(metrics.avgTicket))
  } catch (e) {
    console.error("Erro ao carregar métricas home:", e)
  }

  try {
    const { data: clients } = await axios.get("http://localhost:3001/clients", { headers })
    setText("homeKpiClients", clients.length ?? "0")
  } catch (e) {
    console.error("Erro ao carregar clientes home:", e)
  }
}

// Carrega ao abrir a tela
document.addEventListener("DOMContentLoaded", loadHomeKpis)
