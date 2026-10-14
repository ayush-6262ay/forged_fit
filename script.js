/* ============================
       HERO REEL — cycling frames
       ============================ */
const frames = document.querySelectorAll('.reel-frame');
const chapterNum = document.getElementById('chapterNum');
const reelProgress = document.getElementById('reelProgress');
let currentFrame = 0;
const frameDuration = 5000;
let frameTimer = 0;

function showFrame(idx) {
    frames.forEach((f, i) => f.classList.toggle('active', i === idx));
    chapterNum.textContent = String(idx + 1).padStart(2, '0');
}

function tickReel() {
    frameTimer += 50;
    const pct = (frameTimer / frameDuration) * 100;
    reelProgress.style.width = pct + '%';

    if (frameTimer >= frameDuration) {
        frameTimer = 0;
        currentFrame = (currentFrame + 1) % frames.length;
        showFrame(currentFrame);
    }
    requestAnimationFrame(tickReel);
}
requestAnimationFrame(tickReel);

/* ============================
   MUTE TOGGLE
   ============================ */
const muteToggle = document.getElementById('muteToggle');
const muteLabel = document.getElementById('muteLabel');
const muteIcon = document.getElementById('muteIcon');
let muted = true;

muteToggle.addEventListener('click', () => {
    muted = !muted;
    muteToggle.classList.toggle('unmuted', !muted);
    muteLabel.textContent = muted ? 'Muted' : 'Sound On';
    muteIcon.className = muted
        ? 'fas fa-volume-xmark text-xs text-[var(--muted)] group-hover:text-[var(--accent)]'
        : 'fas fa-volume-high text-xs text-[var(--accent)]';
});

/* ============================
   REVEAL ON SCROLL
   ============================ */
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => revealObserver.observe(el));

/* ============================
   NUMBER COUNTERS
   ============================ */
const counters = document.querySelectorAll('.number-display');
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.dataset.count, 10);
            const duration = 1800;
            const start = performance.now();

            function step(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const value = Math.floor(eased * target);
                el.textContent = value.toLocaleString() + (target >= 1000 ? '+' : '');
                if (progress < 1) requestAnimationFrame(step);
                else el.textContent = target.toLocaleString() + (target >= 1000 ? '+' : '');
            }
            requestAnimationFrame(step);
            counterObserver.unobserve(el);
        }
    });
}, { threshold: 0.5 });

counters.forEach(c => counterObserver.observe(c));

/* ============================
   COACH FLIP — touch support
   ============================ */
document.querySelectorAll('.flip-card').forEach(card => {
    card.addEventListener('click', (e) => {
        if (window.matchMedia('(hover: none)').matches) {
            card.classList.toggle('flipped');
        }
    });
});

/* ============================
   STICKY CTA
   ============================ */
const stickyCta = document.getElementById('stickyCta');
const heroSection = document.getElementById('hero');
const bookingSection = document.getElementById('booking');

const stickyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        // Show when hero is out of view
        if (entry.target === heroSection) {
            const showSticky = !entry.isIntersecting;
            // Check if we're at booking section
            const bookingRect = bookingSection.getBoundingClientRect();
            const atBooking = bookingRect.top < window.innerHeight && bookingRect.bottom > 0;
            stickyCta.classList.toggle('visible', showSticky && !atBooking);
        }
    });
}, { threshold: 0 });

stickyObserver.observe(heroSection);
stickyObserver.observe(bookingSection);

/* ============================
   GOAL SELECTOR
   ============================ */
document.querySelectorAll('#goalSelector .goal-pill').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('#goalSelector .goal-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
    });
});

document.querySelectorAll('#curriculum .goal-pill').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('#curriculum .goal-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
    });
});

/* ============================
   BOOKING FORM
   ============================ */
const bookingForm = document.getElementById('bookingForm');
const toast = document.getElementById('toast');
const toastTitle = document.getElementById('toastTitle');
const toastMsg = document.getElementById('toastMsg');

bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    toastTitle.textContent = 'Trial request received';
    toastMsg.textContent = 'A coach will reach out within 24 hours to confirm your session.';
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 4500);
    bookingForm.reset();
    // Reset active states
    document.querySelectorAll('#goalSelector .goal-pill').forEach((p, i) => p.classList.toggle('active', i === 0));
});

/* ============================
   STORIES CAROUSEL
   With drag, swipe, rubber-band
   ============================ */
class StoriesCarousel {
    constructor(track, opts = {}) {
        this.track = track;
        this.cards = Array.from(track.children);
        this.currentIndex = 0;
        this.isDown = false;
        this.startX = 0;
        this.startOffset = 0;
        this.currentX = 0;
        this.velocity = 0;
        this.lastX = 0;
        this.lastTime = 0;
        this.cardWidth = 0;
        this.maxScroll = 0;
        this.autoAdvance = opts.autoAdvance !== false;
        this.autoAdvanceInterval = opts.interval || 5000;
        this.autoTimer = null;
        this.pauseAuto = false;

        this.init();
    }

    init() {
        this.calculateDimensions();
        this.bindEvents();
        this.buildDots();
        this.startAuto();

        window.addEventListener('resize', () => {
            this.calculateDimensions();
            this.clamp();
            this.applyTransform(0);
        });
    }

    calculateDimensions() {
        if (this.cards.length === 0) return;
        const trackStyle = window.getComputedStyle(this.track);
        const gap = parseFloat(trackStyle.gap) || 24;
        const paddingLeft = parseFloat(trackStyle.paddingLeft) || 32;
        this.cardWidth = this.cards[0].offsetWidth + gap;
        const containerWidth = this.track.parentElement.offsetWidth;
        const totalWidth = (this.cards.length * this.cardWidth) - gap + paddingLeft * 2;
        this.maxScroll = Math.max(0, totalWidth - containerWidth);
    }

    bindEvents() {
        const down = (e) => this.handleDown(e);
        const move = (e) => this.handleMove(e);
        const up = () => this.handleUp();

        this.track.addEventListener('mousedown', down);
        this.track.addEventListener('touchstart', down, { passive: true });
        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('mouseup', up);
        window.addEventListener('touchend', up);
        window.addEventListener('touchcancel', up);

        // Pause auto on hover
        this.track.addEventListener('mouseenter', () => this.pauseAuto = true);
        this.track.addEventListener('mouseleave', () => this.pauseAuto = false);

        // Prev/Next buttons
        const prev = document.getElementById('storyPrev');
        const next = document.getElementById('storyNext');
        if (prev) prev.addEventListener('click', () => this.goTo(this.currentIndex - 1));
        if (next) next.addEventListener('click', () => this.goTo(this.currentIndex + 1));
    }

    handleDown(e) {
        this.isDown = true;
        this.track.classList.add('dragging');
        const x = e.type.includes('touch') ? e.touches[0].pageX : e.pageX;
        this.startX = x;
        this.startOffset = this.currentX;
        this.lastX = x;
        this.lastTime = Date.now();
        this.velocity = 0;
        this.stopAuto();
    }

    handleMove(e) {
        if (!this.isDown) return;
        if (e.cancelable) e.preventDefault();
        const x = e.type.includes('touch') ? e.touches[0].pageX : e.pageX;
        const delta = x - this.startX;
        let newX = this.startOffset + delta;

        // Rubber band at edges
        if (newX > 0) {
            newX = newX * 0.35;
        } else if (newX < -this.maxScroll) {
            const over = newX + this.maxScroll;
            newX = -this.maxScroll + over * 0.35;
        }

        // Track velocity
        const now = Date.now();
        const dt = now - this.lastTime;
        if (dt > 0) {
            this.velocity = (x - this.lastX) / dt;
        }
        this.lastX = x;
        this.lastTime = now;

        this.currentX = newX;
        this.applyTransform(0);
    }

    handleUp() {
        if (!this.isDown) return;
        this.isDown = false;
        this.track.classList.remove('dragging');

        // Apply momentum
        let target = this.currentX + this.velocity * 300;

        // Snap to nearest card
        const snapIndex = Math.round(Math.abs(target) / this.cardWidth);
        const clampedIndex = Math.max(0, Math.min(this.cards.length - 1, snapIndex));
        let snappedX = -clampedIndex * this.cardWidth;

        // Clamp
        if (snappedX > 0) snappedX = 0;
        if (snappedX < -this.maxScroll) snappedX = -this.maxScroll;

        this.currentX = snappedX;
        this.currentIndex = clampedIndex;
        this.applyTransform(700);
        this.updateDots();

        // Resume auto after delay
        setTimeout(() => this.startAuto(), 1500);
    }

    goTo(idx) {
        this.currentIndex = Math.max(0, Math.min(this.cards.length - 1, idx));
        let target = -this.currentIndex * this.cardWidth;
        if (target > 0) target = 0;
        if (target < -this.maxScroll) target = -this.maxScroll;
        this.currentX = target;
        this.applyTransform(700);
        this.updateDots();
        this.stopAuto();
        setTimeout(() => this.startAuto(), 2000);
    }

    clamp() {
        if (this.currentX > 0) this.currentX = 0;
        if (this.currentX < -this.maxScroll) this.currentX = -this.maxScroll;
    }

    applyTransform(duration = 0) {
        if (duration > 0) {
            this.track.style.transition = `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
        } else {
            this.track.style.transition = 'none';
        }
        this.track.style.transform = `translateX(${this.currentX}px)`;
    }

    buildDots() {
        const dotsContainer = document.getElementById('storyDots');
        if (!dotsContainer) return;
        dotsContainer.innerHTML = '';
        this.cards.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'story-dot transition-all';
            dot.style.cssText = i === 0
                ? 'width:32px;height:2px;background:var(--accent);'
                : 'width:8px;height:2px;background:var(--border-light);';
            dot.addEventListener('click', () => this.goTo(i));
            dotsContainer.appendChild(dot);
        });
    }

    updateDots() {
        const dots = document.querySelectorAll('#storyDots button');
        dots.forEach((dot, i) => {
            dot.style.cssText = i === this.currentIndex
                ? 'width:32px;height:2px;background:var(--accent);transition:all 0.4s;'
                : 'width:8px;height:2px;background:var(--border-light);transition:all 0.4s;';
        });
    }

    startAuto() {
        if (!this.autoAdvance) return;
        this.stopAuto();
        this.autoTimer = setInterval(() => {
            if (this.pauseAuto || this.isDown) return;
            let next = this.currentIndex + 1;
            if (next >= this.cards.length) next = 0;
            this.goTo(next);
        }, this.autoAdvanceInterval);
    }

    stopAuto() {
        if (this.autoTimer) {
            clearInterval(this.autoTimer);
            this.autoTimer = null;
        }
    }
}

new StoriesCarousel(document.getElementById('storyTrack'), { interval: 4500 });

/* ============================
   GRAIN PARALLAX
   ============================ */
const grain = document.getElementById('grain');
let targetGrainY = 0;
let currentGrainY = 0;

window.addEventListener('scroll', () => {
    targetGrainY = window.scrollY * 0.15;
}, { passive: true });

function animateGrain() {
    currentGrainY += (targetGrainY - currentGrainY) * 0.08;
    grain.style.transform = `translateY(${currentGrainY}px)`;
    requestAnimationFrame(animateGrain);
}
animateGrain();

/* ============================
   SUBTLE PARALLAX ON HERO IMAGES
   ============================ */
const heroSectionEl = document.getElementById('hero');
window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    if (scrolled < window.innerHeight) {
        const reelContainer = document.getElementById('reelContainer');
        if (reelContainer) {
            reelContainer.style.transform = `translateY(${scrolled * 0.3}px)`;
        }
    }
}, { passive: true });

/* Fallback if remote photos fail to load (offline / blocked) */
document.querySelectorAll('img').forEach(function (img) {
    img.addEventListener('error', function () {
        img.style.visibility = 'hidden';
        if (img.parentElement) {
            img.parentElement.style.background = 'linear-gradient(135deg,#1a1a1a,#0a0a0a)';
        }
    }, { once: true });
});