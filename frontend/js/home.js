const homeGrid = document.querySelector("#home-disease-grid");

if (homeGrid) {
  window.loadDiseases()
    .then((diseases) => {
      homeGrid.innerHTML = diseases.slice(0, 3).map(window.createDiseaseCard).join("");
      homeGrid.querySelectorAll("[data-disease-id]").forEach((button) => {
        button.addEventListener("click", () => {
          window.location.href = `enfermedades.html?id=${encodeURIComponent(button.dataset.diseaseId)}`;
        });
      });
    })
    .catch(() => {
      homeGrid.innerHTML = "<p>No fue posible cargar el catálogo en este momento.</p>";
    });
}
