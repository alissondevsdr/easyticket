const payments = document.getElementById("payments");
const cash = document.getElementById("cash");
const credit = document.getElementById("credit");
const debit = document.getElementById("debit");
const pix = document.getElementById("pix");
const valueInput = document.getElementById("valueInput");

payments.addEventListener("click", function (event) {
  if (event.target.classList.contains("cash")) {
    cash.classList.toggle("active");
    credit.classList.remove("active");
    debit.classList.remove("active");
    pix.classList.remove("active");
  } else if (event.target.classList.contains("credit")) {
    credit.classList.toggle("active");
    cash.classList.remove("active");
    debit.classList.remove("active");
    pix.classList.remove("active");
  } else if (event.target.classList.contains("debit")) {
    debit.classList.toggle("active");
    cash.classList.remove("active");
    credit.classList.remove("active");
    pix.classList.remove("active");
  } else if (event.target.classList.contains("pix")) {
    pix.classList.toggle("active");
    cash.classList.remove("active");
    credit.classList.remove("active");
    debit.classList.remove("active");
  } else {
    return;
  }
})

valueInput.addEventListener("input", function (e) {
  var value = e.target.value.replace(/\D/g, '');
  value = value.replace(/(\d)(\d{2})$/, '$1,$2');
  value = value.replace(/(?=(\d{3})+(?!\d))/g, '.');
  value = 'R$ ' + value;
  e.target.value = value;
});

document.addEventListener("click", function (event) {
  if (!payments.contains(event.target)) {
    cash.classList.remove("active");
    credit.classList.remove("active");
    debit.classList.remove("active");
    pix.classList.remove("active");
  }
});