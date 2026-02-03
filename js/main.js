/**
 * ============================================
 * STUDIO DUO — Portfolio Website
 * Main JavaScript Module
 * ============================================
 */

// Configuration
const CONFIG = {
    email: '[INSERT_EMAIL_HERE]',
    useFormspree: false,
    formspreeEndpoint: 'https://formspree.io/f/YOUR_FORM_ID',
    canvasLineColor: '#0000FF',
    canvasLineWidth: 1,
    canvasLineWidthMin: 0.6,
    canvasLineWidthMax: 6,
    canvasSpeedMin: 0.02,
    canvasSpeedMax: 1.1,
    clickThreshold: 5
};

/**
 * ============================================
 * CREATIVE TRACE - Canvas Drawing Feature
 * Draws a continuous line following the cursor
 * ============================================
 */
class CreativeTrace {
    constructor() {
        this.canvas = document.getElementById('creative-trace');
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.prevX = null;
        this.prevY = null;
        this.isFirstMove = true;
        this.lastClientX = null;
        this.lastClientY = null;
        this.lastMidX = null;
        this.lastMidY = null;
        this.lastDrawTime = null;
        this.isScreenLocked = this.isScreenLockedMode();
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        this.setupEventListeners();
        
        // Multiple resize attempts for dynamic content
        setTimeout(() => this.resizeCanvas(), 100);
        setTimeout(() => this.resizeCanvas(), 500);
        setTimeout(() => this.resizeCanvas(), 1500);
        
        console.log('Creative Trace: Line follows cursor');
    }
    
    setStyles() {
        this.ctx.strokeStyle = CONFIG.canvasLineColor;
        this.ctx.lineWidth = CONFIG.canvasLineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }
    
    isScreenLockedMode() {
        return window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window;
    }

    resetTraceState() {
        this.isFirstMove = true;
        this.lastClientX = null;
        this.lastClientY = null;
        this.lastMidX = null;
        this.lastMidY = null;
        this.lastDrawTime = null;
        this.prevX = null;
        this.prevY = null;
    }

    resizeCanvas() {
        const mode = this.isScreenLockedMode();
        if (mode !== this.isScreenLocked) {
            this.isScreenLocked = mode;
            this.resetTraceState();
        }

        const docHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
        
        const docWidth = Math.max(
            document.body.scrollWidth,
            document.body.offsetWidth,
            document.documentElement.scrollWidth,
            document.documentElement.offsetWidth,
            window.innerWidth
        );

        const targetWidth = this.isScreenLocked ? window.innerWidth : docWidth;
        const targetHeight = this.isScreenLocked ? window.innerHeight : docHeight;
        const dpr = window.devicePixelRatio || 1;
        const pixelWidth = Math.floor(targetWidth * dpr);
        const pixelHeight = Math.floor(targetHeight * dpr);

        // Skip if no change
        if (this.canvas.width === pixelWidth && this.canvas.height === pixelHeight) {
            return;
        }
        
        // Save current drawing
        let imageData = null;
        try {
            if (this.canvas.width > 0 && this.canvas.height > 0) {
                imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            }
        } catch (e) { /* ignore */ }
        
        // Resize
        this.canvas.width = pixelWidth;
        this.canvas.height = pixelHeight;
        this.canvas.style.width = `${targetWidth}px`;
        this.canvas.style.height = `${targetHeight}px`;
        
        // Restore drawing
        if (imageData) {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.putImageData(imageData, 0, 0);
        }
        
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.setStyles();
    }
    
    setupEventListeners() {
        // Mouse move - always draw, no click needed
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        
        // Mouse leaves window - reset so line doesn't jump when re-entering
        document.addEventListener('mouseleave', () => {
            this.resetTraceState();
        });
        
        // Touch events for mobile
        document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
        document.addEventListener('touchend', () => {
            this.resetTraceState();
        });
        document.addEventListener('touchcancel', () => {
            this.resetTraceState();
        });
        
        // Resize
        window.addEventListener('resize', () => {
            setTimeout(() => this.resizeCanvas(), 100);
        });
        
        // Scroll - draw with scroll movement + resize canvas if needed
        let scrollTicking = false;
        window.addEventListener('scroll', () => {
            if (scrollTicking) return;
            scrollTicking = true;
            requestAnimationFrame(() => {
                this.onScroll();
                scrollTicking = false;
            });
        }, { passive: true });
    }
    
    getPos(e) {
        if (e.touches && e.touches.length > 0) {
            return this.isScreenLocked
                ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
                : { x: e.touches[0].pageX, y: e.touches[0].pageY };
        }
        return this.isScreenLocked
            ? { x: e.clientX, y: e.clientY }
            : { x: e.pageX, y: e.pageY };
    }
    
    onMouseMove(e) {
        this.lastClientX = e.clientX;
        this.lastClientY = e.clientY;
        const pos = this.getPos(e);
        this.drawTo(pos.x, pos.y, e.timeStamp);
    }
    
    onTouchMove(e) {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        this.lastClientX = touch.clientX;
        this.lastClientY = touch.clientY;
        
        const pos = this.getPos(e);
        this.drawTo(pos.x, pos.y, e.timeStamp);
    }

    onScroll() {
        if (this.isScreenLocked) return;
        this.resizeCanvas();
        
        if (this.lastClientX === null || this.lastClientY === null) {
            return;
        }
        
        const newX = this.lastClientX + window.scrollX;
        const newY = this.lastClientY + window.scrollY;
        this.drawTo(newX, newY, performance.now());
    }

    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    getLineWidth(distance, deltaTime) {
        const safeDt = Math.max(16, deltaTime || 16);
        const speed = distance / safeDt;
        const t = this.clamp(
            (speed - CONFIG.canvasSpeedMin) / (CONFIG.canvasSpeedMax - CONFIG.canvasSpeedMin),
            0,
            1
        );
        return CONFIG.canvasLineWidthMax - t * (CONFIG.canvasLineWidthMax - CONFIG.canvasLineWidthMin);
    }

    drawTo(x, y, timeStamp) {
        if (this.isFirstMove || this.prevX === null || this.prevY === null) {
            this.prevX = x;
            this.prevY = y;
            this.lastMidX = null;
            this.lastMidY = null;
            this.lastDrawTime = timeStamp;
            this.isFirstMove = false;
            return;
        }

        const dx = x - this.prevX;
        const dy = y - this.prevY;
        const distance = Math.hypot(dx, dy);
        const deltaTime = (timeStamp || performance.now()) - (this.lastDrawTime || timeStamp || 0);

        this.ctx.lineWidth = this.getLineWidth(distance, deltaTime);

        const midX = (this.prevX + x) / 2;
        const midY = (this.prevY + y) / 2;

        this.ctx.beginPath();
        if (this.lastMidX === null || this.lastMidY === null) {
            this.ctx.moveTo(this.prevX, this.prevY);
        } else {
            this.ctx.moveTo(this.lastMidX, this.lastMidY);
        }
        this.ctx.quadraticCurveTo(this.prevX, this.prevY, midX, midY);
        this.ctx.stroke();

        this.lastMidX = midX;
        this.lastMidY = midY;
        this.prevX = x;
        this.prevY = y;
        this.lastDrawTime = timeStamp || performance.now();
    }
}

/**
 * ============================================
 * COLLABORATIVE COMMENTING SYSTEM
 * ============================================
 */
class CommentSystem {
    constructor() {
        this.modalTemplate = document.getElementById('comment-modal-template');
        this.markerTemplate = document.getElementById('comment-marker-template');
        this.activeModal = null;
        this.markers = [];
        
        if (!this.modalTemplate || !this.markerTemplate) {
            console.error('Comment templates not found');
            return;
        }
        
        this.init();
        console.log('Comment System: Ready');
    }
    
    init() {
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.closeModal();
            }
        });
    }
    
    handleClick(e) {
        const target = e.target;
        
        // Handle marker click
        if (target.classList.contains('comment-marker')) {
            e.preventDefault();
            e.stopPropagation();
            this.toggleMarkerModal(target);
            return;
        }
        
        // Handle modal close
        if (target.classList.contains('comment-modal__close')) {
            e.preventDefault();
            e.stopPropagation();
            this.closeModal();
            return;
        }
        
        // Handle submit
        if (target.classList.contains('comment-modal__submit')) {
            e.preventDefault();
            e.stopPropagation();
            this.handleSubmit(target.closest('.comment-modal__form'));
            return;
        }
        
        // Skip nav clicks
        if (target.closest('.nav')) return;

        // Skip image clicks (handled by lightbox)
        if (target.closest('.project__image') || target.closest('.project__image-wrapper')) return;
        if (target.closest('.lightbox')) return;
        
        // Skip clicks inside modal
        if (target.closest('.comment-modal')) return;
        
        // Close modal if clicking outside
        if (this.activeModal) {
            this.closeModal();
            return;
        }
        
        // Open modal on commentable element
        const commentable = target.closest('[data-commentable]');
        if (commentable) {
            if (commentable.classList.contains('section')) return;
            this.openModal(e.pageX, e.pageY);
        }
    }
    
    openModal(x, y) {
        this.closeModal();
        
        const clone = this.modalTemplate.content.cloneNode(true);
        const modal = clone.querySelector('.comment-modal');
        if (!modal) return;
        
        // Position
        const w = 320, h = 320, pad = 15;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const sx = window.scrollX;
        const sy = window.scrollY;
        
        let px = x + pad;
        let py = y + pad;
        
        if (px + w > sx + vw - pad) px = x - w - pad;
        if (px < sx + pad) px = sx + pad;
        if (py + h > sy + vh - pad) py = y - h - pad;
        if (py < sy + pad) py = sy + pad;
        
        modal.style.left = px + 'px';
        modal.style.top = py + 'px';
        modal.dataset.clickX = x;
        modal.dataset.clickY = y;
        
        document.body.appendChild(modal);
        this.activeModal = modal;
        
        setTimeout(() => {
            const ta = modal.querySelector('.comment-modal__textarea');
            if (ta) ta.focus();
        }, 50);
    }
    
    closeModal() {
        if (!this.activeModal) return;
        const modal = this.activeModal;
        if (modal.classList.contains('comment-modal--closing')) return;

        modal.classList.add('comment-modal--closing');
        modal.addEventListener('animationend', () => {
            if (modal.parentNode) modal.parentNode.removeChild(modal);
            if (this.activeModal === modal) this.activeModal = null;
        }, { once: true });
    }
    
    handleSubmit(form) {
        if (!form) return;
        
        const modal = form.closest('.comment-modal');
        const ta = form.querySelector('.comment-modal__textarea');
        const em = form.querySelector('.comment-modal__email');
        
        if (!ta || !em) return;
        
        const comment = ta.value.trim();
        const email = em.value.trim();
        
        if (!comment || !email) {
            alert('Please fill in both fields.');
            return;
        }
        
        if (!email.includes('@') || !email.includes('.')) {
            alert('Please enter a valid email.');
            return;
        }
        
        const cx = parseInt(modal.dataset.clickX, 10);
        const cy = parseInt(modal.dataset.clickY, 10);
        
        // Send
        if (CONFIG.useFormspree) {
            this.sendFormspree(comment, email, cx, cy);
        } else {
            this.sendMailto(comment, email);
        }
        
        this.createMarker(cx, cy, comment, email);
        this.closeModal();
    }
    
    sendMailto(comment, email) {
        const subj = encodeURIComponent('Portfolio Comment - Studio Duo');
        const body = encodeURIComponent(
            `Comment: ${comment}\n\nFrom: ${email}\n\nPage: ${window.location.href}`
        );
        window.open(`mailto:${CONFIG.email}?subject=${subj}&body=${body}`, '_blank');
    }
    
    async sendFormspree(comment, email, x, y) {
        try {
            await fetch(CONFIG.formspreeEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ comment, email, page: window.location.href, coords: `${x},${y}` })
            });
        } catch (err) {
            console.error('Formspree error:', err);
        }
    }
    
    createMarker(x, y, comment, email) {
        const clone = this.markerTemplate.content.cloneNode(true);
        const marker = clone.querySelector('.comment-marker');
        if (!marker) return;
        
        marker.style.left = (x - 12) + 'px';
        marker.style.top = (y - 12) + 'px';
        marker.dataset.comment = comment;
        marker.dataset.email = email;
        
        document.body.appendChild(marker);
        this.markers.push(marker);
    }
    
    toggleMarkerModal(marker) {
        if (this.activeModal) {
            this.closeModal();
            return;
        }
        
        const clone = this.modalTemplate.content.cloneNode(true);
        const modal = clone.querySelector('.comment-modal');
        if (!modal) return;
        
        const rect = marker.getBoundingClientRect();
        modal.style.left = (rect.left + window.scrollX + 30) + 'px';
        modal.style.top = (rect.top + window.scrollY - 10) + 'px';
        
        const ta = modal.querySelector('.comment-modal__textarea');
        const em = modal.querySelector('.comment-modal__email');
        if (ta) ta.value = marker.dataset.comment || '';
        if (em) em.value = marker.dataset.email || '';
        
        document.body.appendChild(modal);
        this.activeModal = modal;
    }
}

/**
 * ============================================
 * IMAGE LIGHTBOX (Projects)
 * ============================================
 */
class ImageLightbox {
    constructor() {
        this.lightbox = null;
        this.handleKeydown = this.handleKeydown.bind(this);
        this.init();
    }

    init() {
        document.addEventListener('click', (e) => {
            const imageEl = e.target.closest('.project__image');
            if (!imageEl) return;

            const src = imageEl.dataset.full || imageEl.dataset.src;
            if (!src) return;

            e.preventDefault();
            e.stopPropagation();
            this.open(src, imageEl.getAttribute('aria-label') || 'Project image');
        });
    }

    open(src, alt) {
        if (this.lightbox) this.close();

        const overlay = document.createElement('div');
        overlay.className = 'lightbox';
        overlay.innerHTML = `
            <button class="lightbox__close" aria-label="Close image">&times;</button>
            <img class="lightbox__img" src="${src}" alt="${alt}">
        `;

        overlay.addEventListener('click', (e) => {
            if (e.target.classList.contains('lightbox__close') || e.target === overlay) {
                this.close();
            }
        });

        document.addEventListener('keydown', this.handleKeydown);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        this.lightbox = overlay;
    }

    close() {
        if (!this.lightbox) return;
        this.lightbox.remove();
        this.lightbox = null;
        document.body.style.overflow = '';
        document.removeEventListener('keydown', this.handleKeydown);
    }

    handleKeydown(e) {
        if (e.key === 'Escape') this.close();
    }
}

/**
 * ============================================
 * SMOOTH SCROLL NAVIGATION
 * ============================================
 */
class SmoothNavigation {
    constructor() {
        this.navLinks = document.querySelectorAll('.nav__link');
        this.sections = document.querySelectorAll('.section');
        this.init();
        console.log('Navigation: Ready');
    }
    
    init() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', this.handleClick.bind(this));
        });
        
        const cta = document.querySelector('.home__cta');
        if (cta) cta.addEventListener('click', this.handleClick.bind(this));
        
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.updateActive();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
        
        this.updateActive();
    }
    
    handleClick(e) {
        e.preventDefault();
        const href = e.currentTarget.getAttribute('href');
        const target = document.querySelector(href);
        if (target) {
            const offset = window.innerWidth > 768 ? 80 : 20;
            window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
        }
    }
    
    updateActive() {
        const scrollPos = window.scrollY + window.innerHeight / 3;
        let current = 'home';
        
        this.sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            if (scrollPos >= top && scrollPos < top + height) {
                current = section.id;
            }
        });
        
        this.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === current);
        });
    }
}

/**
 * ============================================
 * INITIALIZATION
 * ============================================
 */
function init() {
    console.log('Studio Duo Portfolio initializing...');
    
    new CreativeTrace();
    new CommentSystem();
    new SmoothNavigation();
    new ImageLightbox();
    
    // Load site data for email config (avoid stale cache)
    const siteDataUrl = `./content/site_data.json?ts=${Date.now()}`;
    fetch(siteDataUrl, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
            if (data?.site?.email && data.site.email !== '[INSERT_EMAIL_HERE]') {
                CONFIG.email = data.site.email;
            }
            applySiteData(data);
            applyProjectImages(data);
        })
        .catch(() => {});
    
    console.log('✓ Portfolio ready');
    console.log('  Draw: Click + drag');
    console.log('  Comment: Click on content');
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

/**
 * ============================================
 * PROJECT IMAGES
 * ============================================
 */
const DEFAULT_PROJECTS = [
    { title: 'Brand Identity — Nordic Studio' },
    { title: 'Website — Forma Gallery' },
    { title: 'Editorial — Process Magazine' },
    { title: 'App Design — Mindful' },
    { title: 'Packaging — Hollow Studio' },
    { title: 'Installation — Lume' },
    { title: 'Campaign — Tideworks' },
    { title: 'Digital — Solstice Lab' }
];

const STOCK_IMAGES = [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1500534314210-86f2b85aa08d?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1500534314201-f6fa0a4b1f3a?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42f?auto=format&fit=crop&w=900&q=80'
];

function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), t | 1);
        r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function renderProjectCircles(items) {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    const list = Array.isArray(items) && items.length ? items : DEFAULT_PROJECTS;
    grid.innerHTML = '';

    const sizes = [140, 170, 200, 230, 260, 300, 330];
    const gap = 12;
    const count = list.length;
    const gridWidth = Math.max(grid.clientWidth, 320);

    const sortedSizes = [...sizes].sort((a, b) => a - b);
    const sizePattern = [];
    while (sortedSizes.length) {
        sizePattern.push(sortedSizes.pop());
        if (sortedSizes.length) sizePattern.push(sortedSizes.shift());
    }

    const orderedSizes = list.map((_, index) => sizePattern[index % sizePattern.length]);
    const order = Array.from({ length: count }, (_, index) => index);
    for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(mulberry32(i + 13)() * (i + 1));
        const temp = order[i];
        order[i] = order[j];
        order[j] = temp;
    }

    const circles = order.map((itemIndex, index) => {
        const size = orderedSizes[index % orderedSizes.length];
        return {
            itemIndex,
            size,
            radius: size / 2
        };
    });

    const totalArea = circles.reduce((sum, c) => sum + Math.PI * c.radius * c.radius, 0);
    const density = 0.62;
    let layoutHeight = Math.max(520, totalArea / (density * gridWidth));

    const placed = [];
    const rng = mulberry32(count * 97 + 17);

    circles.forEach((circle) => {
        let attempts = 0;
        let placedCircle = null;

        while (!placedCircle && attempts < 260) {
            const x = (circle.radius + gap / 2)
                + rng() * (gridWidth - (circle.radius * 2) - gap);
            const y = (circle.radius + gap / 2)
                + rng() * (layoutHeight - (circle.radius * 2) - gap);

            const ok = placed.every((other) => {
                const dx = x - other.x;
                const dy = y - other.y;
                const minDist = circle.radius + other.radius + gap;
                return (dx * dx + dy * dy) >= (minDist * minDist);
            });

            if (ok) {
                placedCircle = { ...circle, x, y };
            }
            attempts += 1;
        }

        if (!placedCircle) {
            layoutHeight += circle.size + gap;
            placedCircle = {
                ...circle,
                x: clamp(circle.radius + gap / 2, circle.radius + gap / 2, gridWidth - circle.radius - gap / 2),
                y: layoutHeight - circle.radius - gap / 2
            };
        }

        placed.push(placedCircle);
    });

    placed.forEach((circle) => {
        const article = document.createElement('article');
        article.className = 'project';
        article.style.setProperty('--size', `${circle.size}px`);
        article.style.setProperty('--x', `${circle.x}px`);
        article.style.setProperty('--y', `${circle.y}px`);

        const image = document.createElement('div');
        image.className = 'project__image project__image--placeholder';
        image.setAttribute('role', 'img');

        const labelText = list[circle.itemIndex]?.title || list[circle.itemIndex]?.description || 'Project';
        image.setAttribute('aria-label', labelText);

        const label = document.createElement('span');
        label.className = 'project__label';
        label.setAttribute('data-commentable', '');
        label.textContent = labelText;

        image.appendChild(label);
        article.appendChild(image);
        grid.appendChild(article);

        const src = list[circle.itemIndex]?.image || STOCK_IMAGES[circle.itemIndex % STOCK_IMAGES.length];
        if (src) {
            image.classList.remove('project__image--placeholder');
            image.style.backgroundImage = `url("${src}")`;
            image.dataset.src = src;
            image.dataset.full = src;
        }
    });

    const minHeight = Math.max(520, layoutHeight);
    if (window.matchMedia('(max-width: 900px)').matches) {
        grid.style.minHeight = '';
    } else {
        grid.style.minHeight = `${minHeight}px`;
    }
}

let currentProjectItems = null;
let projectResizeTimer = null;
function applyProjectImages(data) {
    currentProjectItems = data?.sections?.projects?.items || null;
    renderProjectCircles(currentProjectItems);

    if (!applyProjectImages.hasResizeListener) {
        window.addEventListener('resize', () => {
            window.clearTimeout(projectResizeTimer);
            projectResizeTimer = window.setTimeout(() => {
                renderProjectCircles(currentProjectItems);
            }, 150);
        });
        applyProjectImages.hasResizeListener = true;
    }
}

/**
 * ============================================
 * SITE DATA TEXT
 * ============================================
 */
function applySiteData(data) {
    if (!data) return;

    const { site, navigation, sections, footer } = data;

    if (site?.title) {
        document.title = site.title;
    }
    if (site?.description) {
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', site.description);
    }

    if (Array.isArray(navigation?.items)) {
        navigation.items.forEach(item => {
            const link = document.querySelector(`.nav__link[data-section="${item.id}"]`);
            if (link && item.label) link.textContent = item.label;
        });
    }

    if (sections?.home) {
        setText('.home__headline', sections.home.headline);
        setText('.home__subheadline', sections.home.subheadline);
        setText('.home__cta', sections.home.cta);
    }

    if (sections?.projects) {
        setText('#projects .section__title', sections.projects.title);
        setText('#projects .section__intro', sections.projects.intro);
    }

    if (sections?.us) {
        setText('#us .section__title', sections.us.title);
        setText('#us .section__intro', sections.us.intro);
        setText('#us .us__description p', sections.us.description);
        if (Array.isArray(sections.us.members)) {
            const members = document.querySelectorAll('.member');
            sections.us.members.forEach((member, index) => {
                const card = members[index];
                if (!card) return;
                setTextIn(card, '.member__name', member.name);
                setTextIn(card, '.member__role', member.role);
                setTextIn(card, '.member__bio', member.bio);
                const image = card.querySelector('.member__image');
                if (image && member.image) {
                    image.classList.remove('member__image--placeholder');
                    image.style.backgroundImage = `url("${member.image}")`;
                    image.style.backgroundSize = 'cover';
                    image.style.backgroundPosition = 'center';
                }
            });
        }
        if (sections.us.philosophy) {
            setText('#us .philosophy__title', sections.us.philosophy.title);
            const list = document.querySelector('#us .philosophy__list');
            if (list && Array.isArray(sections.us.philosophy.points)) {
                list.innerHTML = '';
                sections.us.philosophy.points.forEach(point => {
                    const li = document.createElement('li');
                    li.setAttribute('data-commentable', '');
                    li.textContent = point;
                    list.appendChild(li);
                });
            }
        }
    }

    if (sections?.contact) {
        setText('#contact .section__title', sections.contact.title);
        setText('#contact .section__intro', sections.contact.intro);
        const email = sections.contact.email || site?.email;
        const emailLink = document.querySelector('.contact__email');
        if (emailLink && email) {
            emailLink.textContent = email;
            emailLink.setAttribute('href', `mailto:${email}`);
        }
        setText('#contact .contact__location', sections.contact.location);
        if (Array.isArray(sections.contact.social)) {
            const links = document.querySelectorAll('.contact__social .social__link');
            sections.contact.social.forEach((item, index) => {
                const link = links[index];
                if (!link) return;
                link.textContent = item.platform || item.handle || '';
                if (item.url) link.setAttribute('href', item.url);
            });
        }
    }

    if (footer) {
        setText('.footer__copyright', footer.copyright);
        setText('.footer__note', footer.note);
    }
}

function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el && typeof value === 'string') el.textContent = value;
}

function setTextIn(root, selector, value) {
    if (!root || typeof value !== 'string') return;
    const el = root.querySelector(selector);
    if (el) el.textContent = value;
}
