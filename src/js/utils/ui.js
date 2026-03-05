// ui.js — Utilitários de interface common
export function showToast(message, type = "success") {
    let toast = document.querySelector(".et-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "et-toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `et-toast ${type}`;

    // Força reflow para animação
    toast.offsetHeight;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

export function fmtCurrency(val) {
    return "R$ " + Number(val || 0)
        .toFixed(2)
        .replace(".", ",")
        .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function escHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
