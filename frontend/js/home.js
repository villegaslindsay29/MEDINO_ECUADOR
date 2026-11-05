const homeGrid = document.querySelector("#home-disease-grid");
const homeReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const homeRevealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("home-entered");
    homeRevealObserver.unobserve(entry.target);
  });
}, { threshold: .08 });

function revealHomeElements(elements) {
  if (homeReducedMotion.matches) return;
  elements.forEach((element, index) => {
    element.classList.add("home-enter");
    element.style.setProperty("--home-delay", `${(index % 3) * 80}ms`);
    homeRevealObserver.observe(element);
  });
}
revealHomeElements(document.querySelectorAll(".home-page .trust-item, .home-page .faq-section details"));

// Small pointer-driven depth effect, only while the hero is visible on desktop.
const homeHero = document.querySelector(".home-page .hero");
const homeDepthMedia = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 901px)");
let homeHeroVisible = true;
let homeDepthFrame = 0;
const resetHomeDepth = () => {
  cancelAnimationFrame(homeDepthFrame);
  homeDepthFrame = 0;
  homeHero?.style.removeProperty("--home-image-x");
  homeHero?.style.removeProperty("--home-image-y");
};
if (homeHero) {
  new IntersectionObserver(([entry]) => {
    homeHeroVisible = entry.isIntersecting;
    if (!homeHeroVisible) resetHomeDepth();
  }).observe(homeHero);
  homeHero.addEventListener("pointermove", (event) => {
    if (homeReducedMotion.matches || !homeDepthMedia.matches || !homeHeroVisible) return;
    const rect = homeHero.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - .5) * 8;
    const y = ((event.clientY - rect.top) / rect.height - .5) * 6;
    cancelAnimationFrame(homeDepthFrame);
    homeDepthFrame = requestAnimationFrame(() => {
      homeHero.style.setProperty("--home-image-x", `${x.toFixed(2)}px`);
      homeHero.style.setProperty("--home-image-y", `${y.toFixed(2)}px`);
    });
  }, { passive: true });
  homeHero.addEventListener("pointerleave", resetHomeDepth);
}
homeReducedMotion.addEventListener("change", () => {
  resetHomeDepth();
  if (homeReducedMotion.matches) {
    document.querySelectorAll(".home-enter").forEach((element) => element.classList.add("home-entered"));
    homeRevealObserver.disconnect();
  }
});
homeDepthMedia.addEventListener("change", resetHomeDepth);

if (homeGrid) {
  window.loadDiseases()
    .then((diseases) => {
      homeGrid.innerHTML = diseases.slice(0, 3).map(window.createDiseaseCard).join("");
      revealHomeElements(homeGrid.querySelectorAll(".disease-card"));
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
