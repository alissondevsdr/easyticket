const onlyDigits = str => str.replace(/\D/g, '')

export function maskCPF(value) {
  const digits = onlyDigits(value).slice(0, 11)

  let output = digits

  if (digits.length > 9) {
    output = digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2}).*/, '$1.$2.$3-$4')
  } else if (digits.length > 6) {
    output = digits.replace(/^(\d{3})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
  } else if (digits.length > 3) {
    output = digits.replace(/^(\d{3})(\d{1,3}).*/, '$1.$2');
  }

  return output
}

export function maskPhone(value) {
  let digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) {
    return digits ? `(${digits}` : '';
  }
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (rest.length <= 4) {
    return `(${ddd}) ${rest}`;
  }
  if (rest.length <= 8) {
    return `(${ddd}) ${rest.slice(0, 4)}${rest.length > 4 ? '-' + rest.slice(4) : ''}`;
  }
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}

// CORRIGIDO: exportar a função para que alterClient.js possa importá-la
export function setSelectionEndToInputEl(el) {
  el.selectionStart = el.selectionEnd = el.value.length;
}

document.addEventListener('DOMContentLoaded', () => {
  const cpfInput = document.getElementById('cpf');
  const phoneInput = document.getElementById('phone');

  cpfInput.addEventListener('input', (e) => {
    const old = e.target.value;
    e.target.value = maskCPF(old);
    setSelectionEndToInputEl(e.target);
  });

  phoneInput.addEventListener('input', (e) => {
    const old = e.target.value;
    e.target.value = maskPhone(old);
    setSelectionEndToInputEl(e.target);
  });

  cpfInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    e.target.value = maskCPF(text);
    setSelectionEndToInputEl(e.target);
  });

  phoneInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    e.target.value = maskPhone(text);
    setSelectionEndToInputEl(e.target);
  });
});
