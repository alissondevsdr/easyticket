// home.js — KPIs da tela Início filtrados pelo mês vigente

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

function currentMonthLabel() {
  return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

function isCurrentMonth(dateStr) {
  if (!dateStr) return false
  const d   = new Date(dateStr)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export async function loadHomeKpis() {
  const token   = localStorage.getItem("authToken")
  const headers = { Authorization: token }

  // Preenche o badge do mês em todos os KPIs
  const monthLabel = currentMonthLabel()
  document.querySelectorAll(".home-kpi-month").forEach(el => {
    el.innerHTML = `<i class="fa-regular fa-calendar"></i> ${monthLabel}`
  })

  try {
    const { data: allSales } = await axios.get("http://localhost:3001/sales", { headers })
    const sales       = allSales.filter(s => isCurrentMonth(s.createdAt))
    const totalVendas = sales.length
    const totalValor  = sales.reduce((acc, s) => acc + Number(s.value || 0), 0)
    const ticketMedio = totalVendas > 0 ? totalValor / totalVendas : 0

    setText("homeKpiSales",   totalVendas)
    setText("homeKpiRevenue", fmtCurrency(totalValor))
    setText("homeKpiAvg",     fmtCurrency(ticketMedio))
  } catch (e) {
    console.error("Erro ao carregar vendas home:", e)
  }

  try {
    const { data: clients } = await axios.get("http://localhost:3001/clients", { headers })
    const clientesDoMes     = clients.filter(c => isCurrentMonth(c.createdAt))
    setText("homeKpiClients", clientesDoMes.length)
  } catch (e) {
    console.error("Erro ao carregar clientes home:", e)
  }
}

document.addEventListener("DOMContentLoaded", loadHomeKpis)