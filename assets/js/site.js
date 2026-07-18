(function () {
  'use strict';

  const menuButton = document.querySelector('.menu-button');
  const siteNavigation = document.querySelector('.site-nav');

  if (menuButton && siteNavigation) {
    const closeMenu = () => {
      menuButton.setAttribute('aria-expanded', 'false');
      siteNavigation.dataset.open = 'false';
    };

    menuButton.addEventListener('click', () => {
      const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(willOpen));
      siteNavigation.dataset.open = String(willOpen);
    });

    siteNavigation.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  document.querySelectorAll('[data-abstract-toggle]').forEach((button) => {
    const panel = document.querySelector(`#${button.getAttribute('aria-controls')}`);
    if (!panel) return;

    button.addEventListener('click', () => {
      const willOpen = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(willOpen));
      panel.setAttribute('aria-hidden', String(!willOpen));
      panel.classList.toggle('is-open', willOpen);
    });
  });

  document.querySelectorAll('[data-gallery]').forEach((gallery) => {
    const slides = Array.from(gallery.querySelectorAll('.gallery-slide'));
    const previousButton = gallery.querySelector('[data-previous]');
    const nextButton = gallery.querySelector('[data-next]');
    const count = gallery.querySelector('.gallery-count');
    let currentIndex = 0;
    let rotationTimer = null;
    const canAutoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const showSlide = (index) => {
      currentIndex = (index + slides.length) % slides.length;

      slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === currentIndex;
        slide.classList.toggle('is-active', isActive);
        slide.setAttribute('aria-hidden', String(!isActive));
      });

      count.textContent = `${currentIndex + 1} / ${slides.length}`;
    };

    const stopRotation = () => {
      window.clearInterval(rotationTimer);
      rotationTimer = null;
    };

    const isInteracting = () => gallery.matches(':hover') || Boolean(gallery.querySelector(':focus-visible'));

    const startRotation = () => {
      if (!canAutoRotate || slides.length < 2 || rotationTimer) return;
      rotationTimer = window.setInterval(() => {
        if (!document.hidden && !isInteracting()) showSlide(currentIndex + 1);
      }, 1800);
    };

    const moveManually = (index) => {
      stopRotation();
      showSlide(index);
      startRotation();
    };

    previousButton.addEventListener('click', () => moveManually(currentIndex - 1));
    nextButton.addEventListener('click', () => moveManually(currentIndex + 1));

    gallery.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') moveManually(currentIndex - 1);
      if (event.key === 'ArrowRight') moveManually(currentIndex + 1);
    });

    showSlide(0);
    startRotation();
  });

  document.querySelectorAll('[data-comments-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('.comments-track');
    const cards = Array.from(track.querySelectorAll('blockquote'));
    const toggleButton = carousel.querySelector('[data-comments-toggle]');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let loopPoint = 0;
    let lastFrameTime = null;
    let commentsHidden = false;
    let loopInitialized = false;
    let animationFrame = null;
    let scrollPosition = track.scrollLeft;
    const beforeFragment = document.createDocumentFragment();
    const afterFragment = document.createDocumentFragment();

    cards.forEach((card) => {
      const commentLength = card.textContent.trim().length;
      card.dataset.commentSize = commentLength <= 115 ? 'short' : commentLength >= 220 ? 'long' : 'medium';
      const beforeClone = card.cloneNode(true);
      const afterClone = card.cloneNode(true);
      beforeClone.dataset.commentClone = 'before';
      afterClone.dataset.commentClone = 'after';
      beforeClone.setAttribute('aria-hidden', 'true');
      afterClone.setAttribute('aria-hidden', 'true');
      beforeFragment.appendChild(beforeClone);
      afterFragment.appendChild(afterClone);
    });

    track.insertBefore(beforeFragment, cards[0]);
    track.appendChild(afterFragment);

    const measureLoop = () => {
      const previousLoopPoint = loopPoint;
      const firstAfterClone = track.querySelector('[data-comment-clone="after"]');
      loopPoint = firstAfterClone ? firstAfterClone.offsetLeft - cards[0].offsetLeft : 0;

      if (!loopInitialized && loopPoint > 0) {
        scrollPosition = loopPoint + (cards[0].offsetWidth * 0.42);
        loopInitialized = true;
      } else if (previousLoopPoint > 0 && loopPoint > 0) {
        const progress = (scrollPosition - previousLoopPoint) / previousLoopPoint;
        scrollPosition = loopPoint + ((((progress % 1) + 1) % 1) * loopPoint);
      }

      track.scrollLeft = scrollPosition;
    };

    const isPaused = () => reduceMotion || commentsHidden;
    const isInteracting = () => track.matches(':hover') || track.contains(document.activeElement);

    const updateControls = () => {
      toggleButton.textContent = commentsHidden ? 'Show' : 'Hide';
      toggleButton.setAttribute('aria-expanded', String(!commentsHidden));
      carousel.dataset.commentsHidden = String(commentsHidden);
      track.setAttribute('aria-hidden', String(commentsHidden));
      track.tabIndex = commentsHidden ? -1 : 0;
    };

    const animateComments = (time) => {
      animationFrame = null;
      if (lastFrameTime === null) lastFrameTime = time;
      const elapsed = Math.min(time - lastFrameTime, 1000);
      lastFrameTime = time;

      if (!isPaused() && !isInteracting() && !document.hidden && loopPoint > 0) {
        scrollPosition += elapsed * 0.022;
        if (scrollPosition >= loopPoint * 2) scrollPosition -= loopPoint;
        if (scrollPosition < loopPoint) scrollPosition += loopPoint;
        track.scrollLeft = scrollPosition;
      }

      if (!isPaused()) animationFrame = window.requestAnimationFrame(animateComments);
    };

    const refreshAnimation = () => {
      if (isPaused()) {
        if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
        lastFrameTime = null;
      } else if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(animateComments);
      }
    };

    toggleButton.addEventListener('click', () => {
      commentsHidden = !commentsHidden;
      updateControls();
      refreshAnimation();
    });

    document.addEventListener('visibilitychange', () => {
      lastFrameTime = null;
      refreshAnimation();
    });

    track.addEventListener('keydown', (event) => {
      const step = cards[0].offsetWidth + 18;
      if (event.key === 'ArrowLeft') track.scrollBy({ left: -step, behavior: reduceMotion ? 'auto' : 'smooth' });
      if (event.key === 'ArrowRight') track.scrollBy({ left: step, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    track.addEventListener('scroll', () => {
      if (Math.abs(track.scrollLeft - scrollPosition) > 1) scrollPosition = track.scrollLeft;
    }, { passive: true });

    window.addEventListener('resize', measureLoop);
    measureLoop();
    updateControls();
    refreshAnimation();
  });

  const pronunciationButton = document.querySelector('#pronunciation-button');
  const pronunciationAudio = document.querySelector('#pronunciation-audio');

  if (pronunciationButton && pronunciationAudio) {
    const setPlaying = (isPlaying) => {
      pronunciationButton.setAttribute('aria-pressed', String(isPlaying));
      pronunciationButton.setAttribute('aria-label', isPlaying ? 'Pause pronunciation of Zirui' : 'Play pronunciation of Zirui');
    };

    pronunciationButton.addEventListener('click', async () => {
      if (pronunciationAudio.paused) {
        try {
          await pronunciationAudio.play();
          setPlaying(true);
        } catch (error) {
          setPlaying(false);
        }
      } else {
        pronunciationAudio.pause();
        setPlaying(false);
      }
    });

    pronunciationAudio.addEventListener('ended', () => setPlaying(false));
    pronunciationAudio.addEventListener('pause', () => setPlaying(false));
  }

  const revealElements = document.querySelectorAll('.reveal');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach((element) => element.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -6% 0px',
      threshold: 0.08
    });

    revealElements.forEach((element) => observer.observe(element));
  }

  const year = document.querySelector('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
