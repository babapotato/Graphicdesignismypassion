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
    clickThreshold: 5
};

// Global state (kept minimal now that drawing is always-on)
const AppState = {};

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
    
    resizeCanvas() {
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
        
        // Skip if no change
        if (this.canvas.width === docWidth && this.canvas.height === docHeight) {
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
        this.canvas.width = docWidth;
        this.canvas.height = docHeight;
        
        // Restore drawing
        if (imageData) {
            this.ctx.putImageData(imageData, 0, 0);
        }
        
        this.setStyles();
        console.log(`Canvas: ${docWidth}x${docHeight}`);
    }
    
    setupEventListeners() {
        // Mouse move - always draw, no click needed
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        
        // Mouse leaves window - reset so line doesn't jump when re-entering
        document.addEventListener('mouseleave', () => {
            this.isFirstMove = true;
        });
        
        // Touch events for mobile
        document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
        document.addEventListener('touchend', () => {
            this.isFirstMove = true;
        });
        document.addEventListener('touchcancel', () => {
            this.isFirstMove = true;
        });
        
        // Resize
        window.addEventListener('resize', () => {
            setTimeout(() => this.resizeCanvas(), 100);
        });
        
        // Scroll - reset to prevent jumps and resize canvas
        window.addEventListener('scroll', () => {
            this.isFirstMove = true;
            setTimeout(() => this.resizeCanvas(), 200);
        }, { passive: true });
    }
    
    getPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].pageX, y: e.touches[0].pageY };
        }
        return { x: e.pageX, y: e.pageY };
    }
    
    onMouseMove(e) {
        const pos = this.getPos(e);
        
        // First move after entering - just record position, don't draw
        if (this.isFirstMove) {
            this.prevX = pos.x;
            this.prevY = pos.y;
            this.isFirstMove = false;
            return;
        }
        
        // Draw line from previous position to current
        this.ctx.beginPath();
        this.ctx.moveTo(this.prevX, this.prevY);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
        
        // Update previous position
        this.prevX = pos.x;
        this.prevY = pos.y;
    }
    
    onTouchMove(e) {
        if (e.touches.length !== 1) return;
        
        const pos = this.getPos(e);
        
        if (this.isFirstMove) {
            this.prevX = pos.x;
            this.prevY = pos.y;
            this.isFirstMove = false;
            return;
        }
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.prevX, this.prevY);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
        
        this.prevX = pos.x;
        this.prevY = pos.y;
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
            this.openModal(e.pageX, e.pageY);
        }
    }
    
    openModal(x, y) {
        this.closeModal();
        
        const clone = this.modalTemplate.content.cloneNode(true);
        const modal = clone.querySelector('.comment-modal');
        if (!modal) return;
        
        // Position
        const w = 280, h = 220, pad = 15;
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
        if (this.activeModal) {
            this.activeModal.remove();
            this.activeModal = null;
        }
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
    
    // Load site data for email config
    fetch('./content/site_data.json')
        .then(r => r.json())
        .then(data => {
            if (data?.site?.email && data.site.email !== '[INSERT_EMAIL_HERE]') {
                CONFIG.email = data.site.email;
            }
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

// Final canvas resize after full load
window.addEventListener('load', () => {
    setTimeout(() => {
        const canvas = document.getElementById('creative-trace');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
            const w = Math.max(document.body.scrollWidth, window.innerWidth);
            if (canvas.width !== w || canvas.height !== h) {
                const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                canvas.width = w;
                canvas.height = h;
                ctx.putImageData(img, 0, 0);
                ctx.strokeStyle = CONFIG.canvasLineColor;
                ctx.lineWidth = CONFIG.canvasLineWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
        }
    }, 100);
});
