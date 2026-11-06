// ============ 1. MOBILE MENU ============
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

menuBtn.addEventListener("click", () => {
  navLinks.classList.toggle("open");
  menuBtn.classList.toggle("open");
});

// Close the menu after clicking a link
navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuBtn.classList.remove("open");
  });
});

// ============ 2. BLUE WAVE LINES IN THE HERO ============
// We draw several sine waves on a <canvas> and move them a little every frame.
const canvas = document.getElementById("waveCanvas");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * ratio;
  canvas.height = canvas.offsetHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); // draw in normal CSS pixels
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function drawWaves(time) {
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  ctx.clearRect(0, 0, w, h);

  // 6 lines, each a bit different in height, speed and color
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    const baseY = h * 0.55 + i * 18;
    const amplitude = 40 + i * 8;
    const speed = time * 0.0004 * (1 + i * 0.15);

    for (let x = 0; x <= w; x += 8) {
      const y = baseY + Math.sin(x * 0.004 + speed + i) * amplitude
                      + Math.sin(x * 0.009 - speed * 1.3) * (amplitude * 0.3);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    const alpha = 0.5 - i * 0.07;
    ctx.strokeStyle = i % 2 ? `rgba(34, 211, 238, ${alpha})` : `rgba(59, 130, 246, ${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (!reduceMotion) requestAnimationFrame(drawWaves);
}
requestAnimationFrame(drawWaves);

// ============ 3. SCROLL ANIMATION + COUNTING STATS ============
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target); // animate only once
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// Count each number up from 0 to its data-target
function countUp(el) {
  const target = Number(el.dataset.target);
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / 1500, 1); // 1.5 seconds
    el.textContent = Math.round(target * progress);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
document.querySelectorAll(".count").forEach(countUp);

// ============ 4. SKILL TABS ============
// Each tab button shows the slider whose id matches data-panel
const tabs = document.querySelectorAll(".skill-tabs button");
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".slider").forEach((s) => s.classList.remove("active"));
    document.getElementById(tab.dataset.panel).classList.add("active");
  });
});

// ============ 5. SLIDERS ============
// Turns every .slider into a slideshow with arrows, counter, thumbnails and swipe.
const sliders = {};

document.querySelectorAll(".slider").forEach((slider) => {
  const stage = slider.querySelector(".slider-stage");
  const slides = [...stage.querySelectorAll("figure")];
  let index = 0;

  // Wrap the stage in a "viewport" that hides the slides that are off-screen
  const viewport = document.createElement("div");
  viewport.className = "slider-viewport";
  stage.before(viewport);
  viewport.append(stage);

  // Arrow buttons and the "1 / 6" counter
  viewport.insertAdjacentHTML("beforeend", `
    <button class="slide-btn prev" aria-label="Previous">‹</button>
    <button class="slide-btn next" aria-label="Next">›</button>
    <span class="slide-count"></span>`);
  const counter = viewport.querySelector(".slide-count");

  // A small thumbnail for every slide
  const thumbs = document.createElement("div");
  thumbs.className = "slide-thumbs";
  slides.forEach((fig, i) => {
    const btn = document.createElement("button");
    btn.setAttribute("aria-label", `Show image ${i + 1}`);
    btn.innerHTML = `<img src="${fig.querySelector("img").src}" alt="" loading="lazy">`;
    btn.addEventListener("click", () => goTo(i));
    thumbs.append(btn);
  });
  slider.append(thumbs);

  function goTo(i) {
    index = (i + slides.length) % slides.length; // wraps around at both ends
    viewport.scrollLeft = 0; // safety: keep the frame from drifting sideways
    stage.style.transform = `translateX(-${index * 100}%)`;
    counter.textContent = `${index + 1} / ${slides.length}`;
    thumbs.querySelectorAll("button").forEach((b, n) => b.classList.toggle("active", n === index));
    // Scroll only the thumbnail strip (not the whole page) to show the active thumbnail
    const thumb = thumbs.children[index];
    thumbs.scrollTo({ left: thumb.offsetLeft - thumbs.clientWidth / 2 + thumb.offsetWidth / 2, behavior: "smooth" });
  }

  viewport.querySelector(".prev").addEventListener("click", () => goTo(index - 1));
  viewport.querySelector(".next").addEventListener("click", () => goTo(index + 1));

  // Swipe on phones (and drag with a mouse)
  let startX = null;
  stage.addEventListener("pointerdown", (e) => (startX = e.clientX));
  stage.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const moved = e.clientX - startX;
    if (Math.abs(moved) > 50) goTo(index + (moved < 0 ? 1 : -1));
    else if (e.target.tagName === "IMG") openLightbox(slider.id, index); // a tap opens full size
    startX = null;
  });

  goTo(0);
  sliders[slider.id] = { slides, goTo: (i) => goTo(i), get index() { return index; } };
});

// ============ 6. LIGHTBOX (full-size view) ============
const lightbox = document.getElementById("lightbox");
const lbImg = document.getElementById("lbImg");
const lbCaption = document.getElementById("lbCaption");
let lbSlider = null;
let lbIndex = 0;

function showLightboxImage() {
  const fig = sliders[lbSlider].slides[lbIndex];
  lbImg.src = fig.querySelector("img").src;
  lbImg.alt = fig.querySelector("img").alt;
  lbCaption.textContent = `${fig.querySelector("figcaption").textContent}  ·  ${lbIndex + 1} / ${sliders[lbSlider].slides.length}`;
}

function openLightbox(sliderId, i) {
  lbSlider = sliderId;
  lbIndex = i;
  showLightboxImage();
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  sliders[lbSlider].goTo(lbIndex); // keep the slider on the same image
}

function moveLightbox(step) {
  const total = sliders[lbSlider].slides.length;
  lbIndex = (lbIndex + step + total) % total;
  showLightboxImage();
}

lightbox.querySelector(".lb-close").addEventListener("click", closeLightbox);
lightbox.querySelector(".lb-prev").addEventListener("click", () => moveLightbox(-1));
lightbox.querySelector(".lb-next").addEventListener("click", () => moveLightbox(1));
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox(); // click the dark background to close
});

// Keyboard: arrows move, Escape closes
document.addEventListener("keydown", (e) => {
  if (lightbox.classList.contains("open")) {
    if (e.key === "ArrowRight") moveLightbox(1);
    if (e.key === "ArrowLeft") moveLightbox(-1);
    if (e.key === "Escape") closeLightbox();
    return;
  }
  const active = document.querySelector(".slider.active");
  const workTop = document.getElementById("work").getBoundingClientRect();
  const workOnScreen = workTop.top < window.innerHeight && workTop.bottom > 0;
  if (active && workOnScreen) {
    const s = sliders[active.id];
    if (e.key === "ArrowRight") s.goTo(s.index + 1);
    if (e.key === "ArrowLeft") s.goTo(s.index - 1);
  }
});

// ============ 7. 3D MODEL SWITCHER ============
const viewer = document.getElementById("modelViewer");
document.querySelectorAll(".model-list button").forEach((btn) => {
  btn.addEventListener("click", () => {
    viewer.src = btn.dataset.model;
    document.querySelector(".model-list button.active").classList.remove("active");
    btn.classList.add("active");
  });
});

// ============ 8. DECAL MAP SWITCHER ============
// Clicking Color / Normal / Opacity swaps the image to that texture map.
document.querySelectorAll(".decal").forEach((card) => {
  const img = card.querySelector("img");
  const name = card.dataset.decal; // e.g. "fp-single"

  card.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      img.src = `images/decals/${name}-${btn.dataset.map}.jpg`;
      card.querySelector("button.active").classList.remove("active");
      btn.classList.add("active");
    });
  });
});

// ============ 9. FOOTER YEAR ============
document.getElementById("year").textContent = new Date().getFullYear();
