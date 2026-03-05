import { fmtCurrency } from "../utils/ui.js";

function setText(id, value) {
  const el = document.getElementById(id)
  if (el) el.textContent = value
}

function currentMonthLabel() {
  return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

export async function loadHomeKpis() {
  const token = localStorage.getItem("authToken")
  const headers = { Authorization: token }

  // Preenche o badge do mês em todos os KPIs
  const monthLabel = currentMonthLabel()
  document.querySelectorAll(".home-kpi-month").forEach(el => {
    el.innerHTML = `<i class="fa-regular fa-calendar"></i> ${monthLabel}`
  })

  try {
    // Busca métricas do faturamento (backend já filtra o mês atual por padrão)
    const { data: metrics } = await axios.get("http://localhost:3001/sales/metrics", { headers })

    setText("homeKpiSales", metrics.totalSales)
    setText("homeKpiRevenue", fmtCurrency(metrics.totalRevenue))
    setText("homeKpiAvg", fmtCurrency(metrics.avgTicket))
  } catch (e) {
    console.error("Erro ao carregar métricas home:", e)
  }

  try {
    // Para clientes, buscamos a lista e filtramos pelo mês atual localmente 
    // ou poderíamos criar um endpoint de métricas de clientes se necessário.
    const { data: clients } = await axios.get("http://localhost:3001/clients", { headers })

    const now = new Date()
    const clientesDoMes = clients.filter(c => {
      if (!c.createdAt) return false
      const d = new Date(c.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })

    setText("homeKpiClients", clientesDoMes.length)
  } catch (e) {
    console.error("Erro ao carregar clientes home:", e)
  }
}

document.addEventListener("DOMContentLoaded", loadHomeKpis)