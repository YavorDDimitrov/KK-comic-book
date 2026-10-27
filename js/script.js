(() => {
  "use strict";

  const BOOK_TITLE = "KK AND THE\nQUEST FOR THE\nPERFECT GIFT";
  const PAGE_TITLE = "KK and the Quest for the Perfect Gift \u2014 A Cyberpunk Birthday Tale";
  const AUDIO_SRC = "assets/audio/KK_all_the_way.mp3";
  const IMG_EXT = "png";          // page images: assets/images/<name>.png
  const STORY_PAGES = 12;         // numbered story pages (the bonus page is not counted)

  document.title = PAGE_TITLE;

  // ---- Full reading order, used in single-page (mobile) mode ----
  // The bonus (Easter egg) page sits after "The End" and before the back cover.
  const ALL_PAGES = [
    "front_cover", "page1", "page2", "page3", "page4", "page5", "page6",
    "page7", "page8", "page9", "page10", "page11", "page12", "bonus_page", "back_cover",
  ];

  // ---- Desktop two-page spread: right-hand (recto) and left-hand (verso)
  // stacks, advanced together. Odd story pages sit on the left, even on the
  // right, with the front cover alone on the right (blank inside-cover panel
  // on the left). The last spread pairs the bonus page (left) with the back
  // cover (right). ----
  const RIGHT_PAGES = ["front_cover", "page2", "page4", "page6", "page8", "page10", "page12", "back_cover"];
  const LEFT_PAGES  = [null, "page1", "page3", "page5", "page7", "page9", "page11", "bonus_page"];

  const src = (name) => `assets/images/${name}.${IMG_EXT}`;

  const isDesktop = window.matchMedia("(min-width: 900px) and (pointer: fine)").matches;
  document.body.classList.toggle("spread-mode", isDesktop);

  const leftContainer = document.getElementById("pages-left");
  const rightContainer = document.getElementById("pages-right");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const counterEl = document.getElementById("page-counter");
  const bookWrap = document.getElementById("book-wrap");
  const bookEl = document.getElementById("book");
  const muteBtn = document.getElementById("mute-btn");
  const iconOn = document.getElementById("icon-on");
  const iconOff = document.getElementById("icon-off");
  const audio = document.getElementById("bg-audio");
  const restartBtn = document.getElementById("restart-btn");

  // ---------- Build a stack of flip leaves inside a container ----------
  // `names` entries are image basenames (without extension) or null for a
  // blank/title inside-cover panel.
  function buildStack(container, names) {
    const n = names.length;
    return names.map((name, i) => {
      const el = document.createElement("div");
      el.className = "page";
      el.style.zIndex = String(n - i);

      const front = document.createElement("div");
      front.className = "page-face front";
      if (name) {
        const img = document.createElement("img");
        img.src = src(name);
        img.alt = name.replace(/_/g, " ");
        img.decoding = "async";
        img.draggable = false;
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

  function makeBackCard() {
    const card = document.createElement("div");
    card.className = "back-card";
    const span = document.createElement("span");
    span.textContent = BOOK_TITLE;
    card.appendChild(span);
    return card;
  }

  function flipForward(stack, idx) {
    const el = stack[idx];
    el.classList.add("turning");
    el.style.zIndex = String(100 + idx); // rises above the stack while/after turning
    el.classList.add("flipped");
  }

  function flipBackward(stack, idx) {
    const n = stack.length;
    const el = stack[idx];
    el.style.zIndex = String(n - idx);
    el.classList.remove("flipped");
  }

  function resetStackInstant(stack) {
    const n = stack.length;
    stack.forEach((el, i) => {
      el.classList.remove("turning");
      el.style.transition = "none";
      el.classList.remove("flipped");
      el.style.zIndex = String(n - i);
      void el.offsetWidth;
      el.style.transition = "";
    });
  }

  // ---------- Assemble the active stack(s) for this viewport ----------
  const rightStack = buildStack(rightContainer, isDesktop ? RIGHT_PAGES : ALL_PAGES);
  const leftStack = isDesktop ? buildStack(leftContainer, LEFT_PAGES) : [];

  const N = rightStack.length;      // number of turnable states in this mode
  const LAST = N - 1;
  let current = 0;
  let animating = false;
  let userMuted = false;

  function labelFor(idx) {
    if (isDesktop) {
      if (idx === 0) return "Front Cover";
      if (idx === LAST) return "Bonus Page & Back Cover";
      const evenPage = idx * 2;
      return `Pages ${evenPage - 1}\u2013${evenPage}`;
    }
    const name = ALL_PAGES[idx];
    if (name === "front_cover") return "Front Cover";
    if (name === "back_cover") return "Back Cover";
    if (name === "bonus_page") return "Bonus Page";
    return `Page ${idx} of ${STORY_PAGES}`;
  }

  function updateCounter() {
    counterEl.textContent = labelFor(current);
    counterEl.classList.toggle("visible", current > 0);
  }

  function updateArrows() {
    const atLast = current === LAST;
    prevBtn.classList.toggle("hidden", current === 0 || animating);
    nextBtn.classList.toggle("hidden", atLast || animating);
    restartBtn.classList.toggle("hidden", !atLast || animating);
  }

  function triggerCloseFlourish() {
    bookEl.classList.add("book-closing");
    window.setTimeout(() => bookEl.classList.remove("book-closing"), 620);
  }
  function triggerOpenFlourish() {
    bookEl.classList.add("book-opening");
    window.setTimeout(() => bookEl.classList.remove("book-opening"), 620);
  }

  function goNext() {
    if (animating || current >= LAST) return;
    animating = true;
    flipForward(rightStack, current);
    if (isDesktop) flipForward(leftStack, current);
    current += 1;
    updateArrows();
    updateCounter();
    const reachedLast = current === LAST;
    window.setTimeout(() => {
      if (reachedLast) {
        triggerCloseFlourish();
        spawnFireworks();
        window.setTimeout(() => { animating = false; updateArrows(); }, 620);
      } else {
        animating = false;
        updateArrows();
      }
    }, 900);
  }

  function goPrev() {
    if (animating || current <= 0) return;
    animating = true;
    const wasLast = current === LAST;

    const doFlip = () => {
      current -= 1;
      flipBackward(rightStack, current);
      if (isDesktop) flipBackward(leftStack, current);
      updateArrows();
      updateCounter();
      window.setTimeout(() => { animating = false; updateArrows(); }, 900);
    };

    if (wasLast) {
      triggerOpenFlourish();
      window.setTimeout(doFlip, 200);
    } else {
      doFlip();
    }
  }

  function startFromBeginning() {
    if (animating || current !== LAST) return;
    animating = true;
    restartBtn.classList.add("hidden");

    const DUR = 420;
    bookEl.style.transition = `transform ${DUR}ms cubic-bezier(.5,0,.5,1), opacity ${DUR}ms ease`;
    bookEl.style.transform = "rotateY(90deg) scaleX(0.05)";
    bookEl.style.opacity = "0.15";

    window.setTimeout(() => {
      bookEl.style.transition = "none";
      bookEl.style.transform = "rotateY(-90deg) scaleX(0.05)";
      resetStackInstant(rightStack);
      if (isDesktop) resetStackInstant(leftStack);
      current = 0;
      void bookEl.offsetWidth;

      bookEl.style.transition = `transform ${DUR}ms cubic-bezier(.5,0,.5,1), opacity ${DUR}ms ease`;
      bookEl.style.transform = "rotateY(0deg) scaleX(1)";
      bookEl.style.opacity = "1";

      window.setTimeout(() => {
        bookEl.style.transition = "";
        bookEl.style.transform = "";
        bookEl.style.opacity = "";
        animating = false;
        updateArrows();
        updateCounter();
      }, DUR + 30);
    }, DUR);
  }

  nextBtn.addEventListener("click", goNext);
  prevBtn.addEventListener("click", goPrev);
  restartBtn.addEventListener("click", startFromBeginning);

  // click zones: right slot (or right half in single-page mode) -> next,
  // left slot (or left half) -> prev
  rightContainer.addEventListener("click", (e) => {
    if (isDesktop) { goNext(); return; }
    const rect = rightContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > rect.width / 2) goNext(); else goPrev();
  });
  if (isDesktop) {
    leftContainer.addEventListener("click", goPrev);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === " ") goNext();
    if (e.key === "ArrowLeft") goPrev();
  });

  // basic swipe support (mobile)
  let touchStartX = null;
  rightContainer.addEventListener("touchstart", (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  rightContainer.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { dx < 0 ? goNext() : goPrev(); }
    touchStartX = null;
  }, { passive: true });

  updateArrows();
  updateCounter();

  // ---------- Audio / mute ----------
  // point the page's <audio> at the KK track and make sure it loops forever
  if (audio) {
    if (audio.getAttribute("src") !== AUDIO_SRC) {
      audio.src = AUDIO_SRC;
      audio.load();
    }
    audio.loop = true;
  }

  function setMuted(muted) {
    userMuted = muted;
    audio.muted = muted;
    muteBtn.classList.toggle("is-muted", muted);
    muteBtn.setAttribute("aria-pressed", String(muted));
    iconOn.style.display = muted ? "none" : "block";
    iconOff.style.display = muted ? "block" : "none";
  }

  function tryPlay() {
    const p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => { /* autoplay blocked until a user gesture; handled below */ });
    }
  }

  muteBtn.addEventListener("click", () => setMuted(!userMuted));

  // no title screen: start the music immediately. If the browser blocks
  // autoplay-with-sound, start on the visitor's first interaction instead.
  setMuted(false);
  tryPlay();
  function onFirstGesture() {
    if (!userMuted && audio.paused) tryPlay();
    window.removeEventListener("pointerdown", onFirstGesture);
    window.removeEventListener("keydown", onFirstGesture);
  }
  window.addEventListener("pointerdown", onFirstGesture);
  window.addEventListener("keydown", onFirstGesture);

  // ---------- Entrance: spin the book into view automatically ----------
  window.requestAnimationFrame(() => {
    bookWrap.classList.add("enter-run");
    bookWrap.addEventListener("animationend", function onEnd(ev) {
      if (ev.target === bookEl) {
        bookWrap.style.opacity = "1";
        bookEl.style.transform = "none";
        bookWrap.classList.remove("enter-run");
        bookWrap.removeEventListener("animationend", onEnd);
      }
    });
  });

  // ---------- Cyberpunk digital rain background (numbers + symbols) ----------
  // Draws on the existing #stars canvas, so no HTML change is needed.
  (function digitalRain() {
    const canvas = document.getElementById("stars");
    const ctx = canvas.getContext("2d");
    const GLYPHS = ("0123456789ABCDEF<>/\\{}[]()#$%&*+=?!;:" +
      "\uFF71\uFF72\uFF73\uFF74\uFF75\uFF76\uFF77\uFF78\uFF79\uFF7A\uFF7B\uFF7C\uFF7D\uFF7E\uFF7F\uFF80\uFF81\uFF82\uFF83\uFF84").split("");
    const PALETTE = ["#00f0ff", "#00f0ff", "#00f0ff", "#ff2bd6", "#7b5cff"];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const FRAME_MS = 60;          // ~16 fps: calm, low-CPU rain
    let w, h, fontSize, cols;
    let lastTime = 0;

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      fontSize = w < 640 ? 14 : 18;
      const count = Math.ceil(w / fontSize);
      cols = Array.from({ length: count }, () => ({
        row: Math.random() * (h / fontSize),      // current head position (in rows)
        speed: 0.35 + Math.random() * 0.9,        // rows per frame
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

  // ---------- Fireworks burst, played once the back cover is reached ----------
  const spawnFireworks = (function fireworksModule() {
    const canvas = document.getElementById("fireworks");
    const ctx = canvas.getContext("2d");
    const COLORS = ["#ff2bd6", "#00f0ff", "#7b5cff", "#ffe14d", "#f4f1e8"];
    let w, h;
    let particles = [];
    let running = false;
    let stopAt = 0;
    let lastBurst = 0;

    function resize() {
      w = canvas.width = window.innerWidth;
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
        p.vy += 0.045; // gravity
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
      running = true;
      lastBurst = 0;
      const start = performance.now();
      stopAt = start + 4200;
      burst(w * 0.5, h * 0.32);
      requestAnimationFrame(frame);
    };
  })();
})();
