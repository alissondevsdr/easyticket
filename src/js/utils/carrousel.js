document.addEventListener("DOMContentLoaded", () => {
  const backgrounds = [
    document.getElementById("back1"),
    document.getElementById("back2"),
    document.getElementById("back3"),
  ];

  let index = 0;

  function trocarImagem() {
    backgrounds.forEach(bg => bg.classList.add("none"));

    backgrounds[index].classList.remove("none");

    index = (index + 1) % backgrounds.length;
  }

  trocarImagem();

  setInterval(trocarImagem, 5000);
});