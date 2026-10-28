(() => {
  "use strict";

  const BOOK_TITLE = "KK AND THE\nQUEST FOR THE\nPERFECT GIFT";
  const STORY_PAGES = 12;   // numbered story pages (the bonus page is not counted)

  document.title = "KK and the Quest for the Perfect Gift \u2014 A Cyberpunk Birthday Tale";

  // ---- Full reading order, used universally ----
  const ALL_PAGES = [
    "front_cover", "page1", "page2", "page3", "page4", "page5", "page6",
    "page7", "page8", "page9", "page10", "page11", "page12", "bonus_page", "back_cover",
  ];

  const src = (name) => `assets/images/${name}.png`;

  // ---- Viewport mode detection strictly by width ----
  const isDesktop = window.innerWidth > 768;
  document.body.classList.toggle("spread-mode", isDesktop);

  // ---- DOM refs ----
  const rightContainer = document.getElementById("pages-right");
  const prevBtn        = document.getElementById("prev-btn");
  const nextBtn        = document.getElementById("next-btn");
  const counterEl      = document.getElementById("page-counter");
  const bookWrap       = document.getElementById("book-wrap");
  const bookEl         = document.getElementById("book");
  const muteBtn        = document.getElementById("mute-btn");
  const audio          = document.getElementById("bg-audio");
  const restartBtn     = document.getElementById("restart-btn");

  // ---------- Build helpers ----------

  function makeBackCard() {
    const card = document.createElement("div");
    card.className = "back-card";
    const span = document.createElement("span");
    span.textContent = BOOK_TITLE;
    card.appendChild(span);
    return card;
  }

  function buildStack(container, names) {
    const n = names.length;
    return names.map((name, i) => {
      const el = document.createElement("div");
      el.className = "page";
      
      const z = n - i;
      el.style.zIndex = String(z);
      
      // Inject both 3D and 2D variables; CSS media queries will decide which to use
      el.style.setProperty("--tz", `${z * 2}px`);
      el.style.setProperty("--rot", "0deg");
      el.style.setProperty("--tx", "0px");
      el.style.setProperty("--op", "1");

      const front = document.createElement("div");
      front.className = "page-face front";
      if (name) {
        const img = document.createElement("img");
        img.src = src(name);
        img.alt = name.replace(/_/g, " ");
        img.draggable = false;
        img.decoding = "async";
        // safety net: if a .png is missing, quietly try the .jpg of the same name
        img.addEventListener("error", () => {
          if (!img.dataset.triedJpg) {
            img.dataset.triedJpg = "1";
            img.src = `assets/images/${name}.jpg`;
          }
        });
        front.appendChild(img);
      } else {
        front.appendChild(makeBackCard());
      }

      const back = document.createElement("div");
      back.className = "page-face back";
      back.appendChild(makeBackCard());

      el.appendChild(front);
      el.appendChild(back);
      container.appendChild(el);
      return el;
    });
  }

  const rightStack = buildStack(rightContainer, ALL_PAGES);

  const N    = rightStack.length;   
  const LAST = N - 1;
  let current   = 0;                
  let animating = false;            

  // ---------- Flip mechanics ----------

  function flipForward(idx) {
    const el = rightStack[idx];
    el.classList.add("turning");
    el.style.zIndex = String(100 + idx);
    
    // Desktop 3D variables
    el.style.setProperty("--tz", `${100 + idx}px`);
    el.style.setProperty("--rot", "-180deg");
    // Mobile 2D slide variables
    el.style.setProperty("--tx", "-100%");
    el.style.setProperty("--op", "0");
  }

  function flipBackward(idx) {
    const el = rightStack[idx];
    el.classList.add("turning");
    const originalZ = N - idx;
    el.style.zIndex = String(originalZ);
    
    // Desktop 3D variables
    el.style.setProperty("--tz", `${originalZ * 2}px`);
    el.style.setProperty("--rot", "0deg");
    // Mobile 2D slide variables
    el.style.setProperty("--tx", "0px");
    el.style.setProperty("--op", "1");
  }

  function onFlipDone(idx, cb) {
    const el = rightStack[idx];
    let settled = false;

    function finish() {
      if (settled) return;
      settled = true;
      el.removeEventListener("transitionend", handler);
      cb();
    }

    function handler(e) {
      if (e.propertyName === "transform" || e.propertyName === "opacity") finish();
    }

    el.addEventListener("transitionend", handler);
    setTimeout(finish, 1000);
  }

  function resetStackInstant() {
    rightStack.forEach((el, i) => {
      el.classList.remove("turning");
      el.style.transition = "none";
      const z = N - i;
      el.style.zIndex = String(z);
      el.style.setProperty("--tz", `${z * 2}px`);
      el.style.setProperty("--rot", "0deg");
      el.style.setProperty("--tx", "0px");
      el.style.setProperty("--op", "1");
      void el.offsetWidth;   
      el.style.transition = "";
    });
  }

  // ---------- UI state helpers ----------

  function labelFor(idx) {
    const name = ALL_PAGES[idx];
    if (name === "front_cover") return "Front Cover";
    if (name === "back_cover")  return "Back Cover";
    if (name === "bonus_page")  return "Bonus Page";
    return `Page ${idx} of ${STORY_PAGES}`;
  }

  function updateCounter() {
    counterEl.textContent = labelFor(current);
    counterEl.classList.toggle("visible", current > 0);
  }

  function updateArrows() {
    prevBtn.classList.toggle("hidden", current === 0);
    nextBtn.classList.toggle("hidden", current === LAST);
    restartBtn.classList.toggle("hidden", current !== LAST);
  }

  function triggerCloseFlourish() {
    bookEl.classList.add("book-closing");
    setTimeout(() => bookEl.classList.remove("book-closing"), 620);
  }

  function triggerOpenFlourish() {
    bookEl.classList.add("book-opening");
    setTimeout(() => bookEl.classList.remove("book-opening"), 620);
  }

  // ---------- Navigation ----------

  function goNext() {
    if (animating || current >= LAST) return;
    animating = true;

    const fromIdx = current;
    flipForward(fromIdx);
    current += 1;

    updateCounter();

    prevBtn.classList.toggle("hidden", current === 0);
    nextBtn.classList.toggle("hidden", current === LAST);

    const reachedLast = current === LAST;

    onFlipDone(fromIdx, () => {
      rightStack[fromIdx].classList.remove("turning");

      if (reachedLast) {
        triggerCloseFlourish();
        spawnFireworks();
        setTimeout(() => {
          animating = false;
          updateArrows();
        }, 620);
      } else {
        animating = false;
      }
    });
  }

  function goPrev() {
    if (animating || current <= 0) return;
    animating = true;

    const wasLast = current === LAST;

    function doFlip() {
      current -= 1;
      const idx = current;
      flipBackward(idx);

      updateArrows();
      updateCounter();

      onFlipDone(idx, () => {
        rightStack[idx].classList.remove("turning");
        animating = false;
      });
    }

    if (wasLast) {
      triggerOpenFlourish();
      setTimeout(doFlip, 200);
    } else {
      doFlip();
    }
  }

  function startFromBeginning() {
    if (animating || current !== LAST) return;
    animating = true;
    restartBtn.classList.add("hidden");

    const DUR = 420;
    bookEl.style.transition =
      `transform ${DUR}ms cubic-bezier(.5,0,.5,1), opacity ${DUR}ms ease`;
    bookEl.style.transform = isDesktop ? "rotateY(90deg) scaleX(0.05)" : "scale(0.8)";
    bookEl.style.opacity   = "0.15";

    setTimeout(() => {
      bookEl.style.transition = "none";
      bookEl.style.transform  = isDesktop ? "rotateY(-90deg) scaleX(0.05)" : "scale(0.8)";

      resetStackInstant();
      current = 0;
      void bookEl.offsetWidth;

      bookEl.style.transition =
        `transform ${DUR}ms cubic-bezier(.5,0,.5,1), opacity ${DUR}ms ease`;
      bookEl.style.transform = isDesktop ? "rotateY(0deg) scaleX(1)" : "scale(1)";
      bookEl.style.opacity   = "1";

      setTimeout(() => {
        bookEl.style.transition = "";
        bookEl.style.transform  = "";
        bookEl.style.opacity    = "";
        animating = false;
        updateArrows();
        updateCounter();
      }, DUR + 30);
    }, DUR);
  }

  // ---------- Event listeners ----------

  nextBtn.addEventListener("click", goNext);
  prevBtn.addEventListener("click", goPrev);
  restartBtn.addEventListener("click", startFromBeginning);

  let swipeFired  = false;
  let touchStartX = null;
  let touchStartY = null;

  rightContainer.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
    swipeFired  = false;
  }, { passive: true });

  rightContainer.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      swipeFired = true;
      dx < 0 ? goNext() : goPrev();
    }
    touchStartX = null;
    touchStartY = null;
  }, { passive: true });

  rightContainer.addEventListener("click", (e) => {
    if (swipeFired) { swipeFired = false; return; }
    
    const rect = rightContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (rect.width > window.innerWidth * 0.8) {
      x > rect.width / 2 ? goNext() : goPrev();
    } else {
      goNext();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
  });

  updateArrows();
  updateCounter();

  // ---------- Audio / mute ----------

  const iconPlay  = document.getElementById("icon-play");
  const iconPause = document.getElementById("icon-pause");

  let isPlaying = false;
  let hasUserInteracted = false;

  function updateAudioUI() {
    if (isPlaying) {
      iconPlay.style.display  = "none";
      iconPause.style.display = "block";
      muteBtn.classList.remove("is-muted");
    } else {
      iconPlay.style.display  = "block";
      iconPause.style.display = "none";
      muteBtn.classList.add("is-muted");
    }
  }

  function toggleAudio() {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  }

  audio.addEventListener("play", () => {
    isPlaying = true;
    updateAudioUI();
  });

  audio.addEventListener("pause", () => {
    isPlaying = false;
    updateAudioUI();
  });

  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();     
    hasUserInteracted = true;
    removeGestureListeners();
    toggleAudio();
  });

  audio.play().catch(() => {});

  function onFirstGesture() {
    if (hasUserInteracted) return;
    if (!audio.paused) {
      removeGestureListeners(); 
      return;
    }
    const p = audio.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        hasUserInteracted = true;
        removeGestureListeners();
      }).catch(() => {});
    }
  }

  function removeGestureListeners() {
    window.removeEventListener("pointerdown", onFirstGesture, true);
    window.removeEventListener("keydown",     onFirstGesture, true);
    window.removeEventListener("touchstart",  onFirstGesture, true);
    window.removeEventListener("click",       onFirstGesture, true);
  }

  window.addEventListener("pointerdown", onFirstGesture, true);
  window.addEventListener("keydown",     onFirstGesture, true);
  window.addEventListener("touchstart",  onFirstGesture, true);
  window.addEventListener("click",       onFirstGesture, true);

  // ---------- Entrance ----------

  requestAnimationFrame(() => {
    bookWrap.classList.add("enter-run");

    let entranceDone = false;

    function finishEntrance() {
      if (entranceDone) return;
      entranceDone = true;
      bookWrap.style.opacity = "1";
      bookEl.style.transform = "none";
      bookWrap.classList.remove("enter-run");
      bookWrap.removeEventListener("animationend", onAnimEnd);
    }

    function onAnimEnd(ev) {
      if (ev.target === bookEl) finishEntrance();
    }

    bookWrap.addEventListener("animationend", onAnimEnd);
    setTimeout(finishEntrance, 2000);
  });

  // ---------- Cyberpunk digital rain background (numbers + symbols) ----------
  // Draws on the existing #stars canvas.

  (function digitalRain() {
    const canvas = document.getElementById("stars");
    const ctx = canvas.getContext("2d");
    const GLYPHS = ("0123456789ABCDEF<>/\\{}[]()#$%&*+=?!;:" +
      "\uFF71\uFF72\uFF73\uFF74\uFF75\uFF76\uFF77\uFF78\uFF79\uFF7A\uFF7B\uFF7C\uFF7D\uFF7E\uFF7F\uFF80\uFF81\uFF82\uFF83\uFF84").split("");
    const PALETTE = ["#00f0ff", "#00f0ff", "#00f0ff", "#ff2bd6", "#7b5cff"];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const FRAME_MS = 60;          // calm, low-CPU rain
    let w, h, fontSize, cols;
    let lastTime = 0;

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function resize() {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
      fontSize = w < 640 ? 14 : 18;
      const count = Math.ceil(w / fontSize);
      cols = Array.from({ length: count }, () => ({
        row: Math.random() * (h / fontSize),
        speed: 0.35 + Math.random() * 0.9,
        color: pick(PALETTE),
      }));
      ctx.clearRect(0, 0, w, h);
      if (reduced) drawStatic();
    }

    function drawStatic() {
      ctx.font = `${fontSize}px monospace`;
      ctx.textBaseline = "top";
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        const len = 4 + Math.floor(Math.random() * 14);
        for (let k = 0; k < len; k++) {
          ctx.globalAlpha = (1 - k / len) * 0.7;
          ctx.fillStyle = c.color;
          ctx.fillText(pick(GLYPHS), i * fontSize, (c.row - k) * fontSize);
        }
      }
      ctx.globalAlpha = 1;
    }

    function step(t) {
      requestAnimationFrame(step);
      if (t - lastTime < FRAME_MS) return;
      lastTime = t;

      // fade the previous frame so glyphs leave glowing trails (canvas stays transparent)
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.14)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      ctx.font = `${fontSize}px monospace`;
      ctx.textBaseline = "top";

      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        const x = i * fontSize;
        const y = c.row * fontSize;
        const bright = Math.random() < 0.06;
        ctx.globalAlpha = bright ? 0.95 : 0.65;
        ctx.fillStyle = bright ? "#eaffff" : c.color;
        ctx.fillText(pick(GLYPHS), x, y);

        c.row += c.speed;
        if (y > h && Math.random() > 0.96) {
          c.row = -Math.random() * 12;
          c.speed = 0.35 + Math.random() * 0.9;
          c.color = pick(PALETTE);
        }
      }
      ctx.globalAlpha = 1;
    }

    // keep the rain dim so the comic stays the star of the show
    canvas.style.opacity = "0.55";
    window.addEventListener("resize", resize);
    resize();
    if (!reduced) requestAnimationFrame(step);
  })();

  // ---------- Fireworks burst ----------

  const spawnFireworks = (function fireworksModule() {
    const canvas = document.getElementById("fireworks");
    const ctx = canvas.getContext("2d");
    const COLORS = ["#ff2bd6", "#00f0ff", "#7b5cff", "#ffe14d", "#f4f1e8"];
    let w, h;
    let particles = [];
    let running   = false;
    let stopAt    = 0;
    let lastBurst = 0;

    function resize() {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    function burst(x, y) {
      const count = 46 + Math.floor(Math.random() * 20);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = 2.2 + Math.random() * 3.4;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.008 + Math.random() * 0.01,
          color,
          size: 1.6 + Math.random() * 1.8,
        });
      }
    }

    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);

      if (t - lastBurst > 650 && t < stopAt - 900) {
        lastBurst = t;
        burst(w * (0.25 + Math.random() * 0.5), h * (0.2 + Math.random() * 0.28));
      }

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.045;     
        p.life -= p.decay;
      });
      particles = particles.filter((p) => p.life > 0);

      particles.forEach((p) => {
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      if (t < stopAt || particles.length) {
        requestAnimationFrame(frame);
      } else {
        running = false;
        ctx.clearRect(0, 0, w, h);
      }
    }

    return function spawn() {
      particles = [];
      running   = true;
      lastBurst = 0;
      const start = performance.now();
      stopAt = start + 4200;
      burst(w * 0.5, h * 0.32);
      requestAnimationFrame(frame);
    };
  })();
})();
