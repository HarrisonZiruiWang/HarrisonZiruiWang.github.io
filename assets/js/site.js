(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const menuButton = document.querySelector('.menu-button');
  const siteNavigation = document.querySelector('.site-nav');
  const closeMenu = () => {
    if (!menuButton || !siteNavigation) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
    siteNavigation.dataset.open = 'false';
  };

  if (menuButton && siteNavigation) {
    menuButton.addEventListener('click', () => {
      const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(willOpen));
      menuButton.setAttribute('aria-label', willOpen ? 'Close menu' : 'Open menu');
      siteNavigation.dataset.open = String(willOpen);
    });

    siteNavigation.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', (event) => {
      if (siteNavigation.dataset.open !== 'true') return;
      if (menuButton.contains(event.target) || siteNavigation.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || siteNavigation.dataset.open !== 'true') return;
      closeMenu();
      menuButton.focus();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  const siteHeader = document.querySelector('.site-header');

  if (siteHeader) {
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
      const currentY = window.scrollY;
      const menuOpen = siteNavigation && siteNavigation.dataset.open === 'true';

      if (currentY <= siteHeader.offsetHeight || menuOpen) {
        siteHeader.classList.remove('is-hidden');
      } else if (currentY > lastScrollY + 2) {
        siteHeader.classList.add('is-hidden');
      } else if (currentY < lastScrollY - 2) {
        siteHeader.classList.remove('is-hidden');
      }

      lastScrollY = currentY;
    }, { passive: true });
  }

  document.querySelectorAll('a[href="#top"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });
  });

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

    let resumeTimer = null;

    const moveManually = (index, resumeDelay) => {
      stopRotation();
      window.clearTimeout(resumeTimer);
      showSlide(index);
      if (resumeDelay) {
        resumeTimer = window.setTimeout(startRotation, resumeDelay);
      } else {
        startRotation();
      }
    };

    previousButton.addEventListener('click', () => moveManually(currentIndex - 1));
    nextButton.addEventListener('click', () => moveManually(currentIndex + 1));

    gallery.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') moveManually(currentIndex - 1);
      if (event.key === 'ArrowRight') moveManually(currentIndex + 1);
    });

    const stage = gallery.querySelector('.gallery-stage');
    let swipeStartX = null;
    let swipeStartY = null;

    stage.addEventListener('dragstart', (event) => {
      event.preventDefault();
    });

    stage.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') {
        if (event.button !== 0) return;
        // Keep a mouse drag from selecting text or dragging the figure image.
        event.preventDefault();
        try {
          stage.setPointerCapture(event.pointerId);
        } catch (error) {
          /* capture is a nice-to-have */
        }
      }
      swipeStartX = event.clientX;
      swipeStartY = event.clientY;
    });

    stage.addEventListener('pointerup', (event) => {
      if (swipeStartX === null) return;
      const deltaX = event.clientX - swipeStartX;
      const deltaY = event.clientY - swipeStartY;
      swipeStartX = null;
      if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      moveManually(currentIndex + (deltaX < 0 ? 1 : -1), 10000);
    });

    stage.addEventListener('pointercancel', () => {
      swipeStartX = null;
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
      card.dataset.commentSize = commentLength <= 115 ? 'short' : commentLength >= 280 ? 'long' : 'medium';
    });

    // Three identical copies of the cards on each side of the originals: a
    // single native swipe plus its fling can never cover that distance, and
    // the position is recentered on every touchstart and settle.
    const cloneSets = 3;
    for (let set = 0; set < cloneSets; set += 1) {
      cards.forEach((card) => {
        const beforeClone = card.cloneNode(true);
        const afterClone = card.cloneNode(true);
        beforeClone.dataset.commentClone = 'before';
        afterClone.dataset.commentClone = 'after';
        beforeClone.setAttribute('aria-hidden', 'true');
        afterClone.setAttribute('aria-hidden', 'true');
        beforeFragment.appendChild(beforeClone);
        afterFragment.appendChild(afterClone);
      });
    }

    track.insertBefore(beforeFragment, cards[0]);
    track.appendChild(afterFragment);

    // The originals sit in the middle copy, spanning roughly
    // [cloneSets * loopPoint, (cloneSets + 1) * loopPoint) in scroll terms.
    const bandLow = () => loopPoint * cloneSets;
    const bandHigh = () => loopPoint * (cloneSets + 1);

    const measureLoop = () => {
      const previousLoopPoint = loopPoint;
      const firstAfterClone = track.querySelector('[data-comment-clone="after"]');
      loopPoint = firstAfterClone ? firstAfterClone.offsetLeft - cards[0].offsetLeft : 0;

      if (!loopInitialized && loopPoint > 0) {
        scrollPosition = bandLow() + (cards[0].offsetWidth * 0.42);
        loopInitialized = true;
      } else if (previousLoopPoint > 0 && loopPoint > 0) {
        const progress = (scrollPosition - previousLoopPoint * cloneSets) / previousLoopPoint;
        scrollPosition = bandLow() + ((((progress % 1) + 1) % 1) * loopPoint);
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

      if (!isPaused() && !isInteracting() && !document.hidden && loopPoint > 0 && dragPointerId === null && momentumFrame === null && !touchInvolved) {
        scrollPosition += elapsed * 0.022;
        if (scrollPosition >= bandHigh()) scrollPosition -= loopPoint;
        if (scrollPosition < bandLow()) scrollPosition += loopPoint;
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

    let dragPointerId = null;
    let dragStartX = 0;
    let dragStartScroll = 0;
    let momentumFrame = null;
    let momentumVelocity = 0;
    let momentumLastTime = null;
    const dragSamples = [];

    // Bring the scroll offset back into the middle copy of the identical card
    // runs. Jumps land on visually identical content, so a wrap is invisible.
    const wrapScrollPosition = () => {
      if (loopPoint <= 0) return;
      // Re-sync first: scroll events can be coalesced or missed entirely.
      if (dragPointerId === null && Math.abs(track.scrollLeft - scrollPosition) > 1) {
        scrollPosition = track.scrollLeft;
      }
      let shift = 0;
      while (scrollPosition + shift < bandLow()) shift += loopPoint;
      while (scrollPosition + shift >= bandHigh()) shift -= loopPoint;
      if (shift !== 0) {
        scrollPosition += shift;
        dragStartScroll += shift;
        track.scrollLeft = scrollPosition;
      }
    };

    // Touch scrolling stays fully native. Repositioning mid-gesture or
    // mid-fling fights the browser, so the loop is maintained at the only
    // safe moments: on touchstart (touching kills any fling and the new
    // gesture has not moved yet) and once scrolling settles. Wheel and
    // keyboard input is delta-based, so it can be wrapped immediately.
    let touchInvolved = false;
    let settleTimer = null;

    const settleWrap = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        touchInvolved = false;
        wrapScrollPosition();
      }, 140);
    };

    track.addEventListener('touchstart', () => {
      touchInvolved = true;
      window.clearTimeout(settleTimer);
      stopMomentum();
      wrapScrollPosition();
    }, { passive: true });

    track.addEventListener('touchend', settleWrap, { passive: true });
    track.addEventListener('touchcancel', settleWrap, { passive: true });

    track.addEventListener('scroll', () => {
      if (dragPointerId !== null || momentumFrame !== null) return;
      if (Math.abs(track.scrollLeft - scrollPosition) > 1) scrollPosition = track.scrollLeft;
      if (touchInvolved) {
        settleWrap();
        return;
      }
      wrapScrollPosition();
    }, { passive: true });

    const stopMomentum = () => {
      if (momentumFrame !== null) window.cancelAnimationFrame(momentumFrame);
      momentumFrame = null;
      momentumVelocity = 0;
      momentumLastTime = null;
    };

    const momentumStep = (time) => {
      momentumFrame = null;
      if (momentumLastTime === null) momentumLastTime = time;
      const elapsed = Math.min(time - momentumLastTime, 100);
      momentumLastTime = time;
      scrollPosition += momentumVelocity * elapsed;
      momentumVelocity *= Math.exp(-elapsed / 325);
      track.scrollLeft = scrollPosition;
      wrapScrollPosition();
      if (Math.abs(momentumVelocity) > 0.02) {
        momentumFrame = window.requestAnimationFrame(momentumStep);
      } else {
        stopMomentum();
      }
    };

    track.addEventListener('wheel', stopMomentum, { passive: true });

    track.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      stopMomentum();
      dragPointerId = event.pointerId;
      dragStartX = event.clientX;
      dragStartScroll = track.scrollLeft;
      scrollPosition = track.scrollLeft;
      dragSamples.length = 0;
      dragSamples.push({ x: event.clientX, time: performance.now() });
    });

    track.addEventListener('pointermove', (event) => {
      if (dragPointerId !== event.pointerId) return;
      if ((event.buttons & 1) === 0) {
        // The button was released outside the window; end the stale drag.
        dragPointerId = null;
        track.classList.remove('is-dragging');
        return;
      }
      const delta = event.clientX - dragStartX;
      if (!track.classList.contains('is-dragging')) {
        if (Math.abs(delta) < 4) return;
        track.classList.add('is-dragging');
        try {
          track.setPointerCapture(dragPointerId);
        } catch (error) {
          /* pointer capture is a nice-to-have; dragging still works without it */
        }
      }
      track.scrollLeft = dragStartScroll - delta;
      scrollPosition = track.scrollLeft;
      wrapScrollPosition();
      dragSamples.push({ x: event.clientX, time: performance.now() });
      while (dragSamples.length > 6) dragSamples.shift();
    });

    const endDrag = (event) => {
      if (dragPointerId !== event.pointerId) return;
      const wasDragging = track.classList.contains('is-dragging');
      dragPointerId = null;
      track.classList.remove('is-dragging');
      if (!wasDragging || event.type === 'pointercancel') return;

      // Launch momentum from the velocity of the last few pointer samples.
      const now = performance.now();
      const recent = dragSamples.filter((sample) => now - sample.time < 120);
      if (recent.length < 2) return;
      const first = recent[0];
      const last = recent[recent.length - 1];
      if (last.time <= first.time) return;
      const velocity = -(last.x - first.x) / (last.time - first.time);
      momentumVelocity = Math.max(-4, Math.min(4, velocity));
      if (Math.abs(momentumVelocity) > 0.05) {
        momentumLastTime = null;
        momentumFrame = window.requestAnimationFrame(momentumStep);
      }
    };

    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

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
