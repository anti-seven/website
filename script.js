(function () {
  'use strict';

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Simple debounce to avoid thrashing on resize */
  function debounce(fn, ms) {
    let timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }

  /** Detect low-power / mobile devices for lighter particle settings */
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  // ─── Scroll & Nav ──────────────────────────────────────────────────────────

  const container = document.getElementById('slides-container');
  const slides    = document.querySelectorAll('.slide-section');
  const navLinks  = document.querySelectorAll('.header-nav .nav-link');

  if (container && slides.length > 0) {
    const observerOptions = {
      root: container,
      threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id             = entry.target.getAttribute('id');
          const isProjectGroup = entry.target.getAttribute('data-slide-group') === 'projects';

          entry.target.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));

          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            const targetId = href.substring(1);

            if (targetId === id || (isProjectGroup && link.getAttribute('data-nav-target') === 'projects')) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, observerOptions);

    slides.forEach(slide => observer.observe(slide));
  }

  let isNavigating = false;

  function scrollToSlide(index) {
    if (index < 0 || index >= slides.length) return;
    isNavigating = true;
    slides[index].scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => { isNavigating = false; }, 850);
  }

  window.addEventListener('keydown', (e) => {
    if (isNavigating) return;
    const currentIndex = Array.from(slides).findIndex(s => {
      const rect = s.getBoundingClientRect();
      return Math.abs(rect.top) < window.innerHeight / 2;
    });

    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      scrollToSlide(currentIndex + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      scrollToSlide(currentIndex - 1);
    }
  });

  // ─── Mobile Menu ───────────────────────────────────────────────────────────

  const toggle     = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('is-active');
      mobileMenu.classList.toggle('is-open');
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        toggle.classList.remove('is-active');
        mobileMenu.classList.remove('is-open');
        const targetId = link.getAttribute('href');
        if (targetId) {
          const targetElem = document.querySelector(targetId);
          if (targetElem) targetElem.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  document.querySelectorAll('.header-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const targetElem = document.querySelector(href);
        if (targetElem) targetElem.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ─── Particle Canvas ───────────────────────────────────────────────────────

  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Fewer particles on mobile for better CPU perf
  const PARTICLE_COUNT = isMobile ? 20 : 32;
  // Slightly shorter link distance on mobile
  const LINK_DIST = isMobile ? 110 : 135;

  let width  = (canvas.width  = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const particles = [];
  let globalAngle  = 0;
  let rafId        = null;
  let isVisible    = !document.hidden;

  class Particle {
    constructor() { this.reset(); }

    reset() {
      this.x        = Math.random() * width;
      this.y        = Math.random() * height;
      this.radius   = Math.random() * 2 + 0.6;
      this.vx       = (Math.random() - 0.5) * 0.35;
      this.vy       = (Math.random() - 0.5) * 0.35;
      this.baseAlpha = Math.random() * 0.4 + 0.15;
      this.alpha    = this.baseAlpha;
      this.pulse    = Math.random() * Math.PI;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > width)  this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;

      this.pulse += 0.015;
      this.alpha = this.baseAlpha + Math.sin(this.pulse) * 0.15;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(193,242,41,${Math.max(0, this.alpha)})`;
      ctx.fill();
    }
  }

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }
  }

  /** Resize handler — debounced so it doesn't fire on every px during drag */
  const onResize = debounce(() => {
    width  = canvas.width  = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initParticles();
  }, 150);

  window.addEventListener('resize', onResize);

  // ─── Page Visibility API — pause animation when tab is hidden ──────────────
  function stopAnimation() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function startAnimation() {
    if (rafId === null) {
      animate();
    }
  }

  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
    if (isVisible) {
      startAnimation();
    } else {
      stopAnimation();
    }
  });

  // ─── Render loop ───────────────────────────────────────────────────────────

  function animate() {
    rafId = requestAnimationFrame(animate);

    ctx.clearRect(0, 0, width, height);

    globalAngle += 0.0008;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(globalAngle * 0.1);
    ctx.translate(-width / 2, -height / 2);

    // O(n²) lines — removed the O(n³) triangle-fill inner loop
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < LINK_DIST) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(193,242,41,${(1 - dist / LINK_DIST) * 0.1})`;
          ctx.lineWidth   = 0.7;
          ctx.stroke();
        }
      }
    }

    particles.forEach(p => { p.update(); p.draw(); });

    ctx.restore();
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────

  initParticles();
  if (isVisible) startAnimation();

})();
