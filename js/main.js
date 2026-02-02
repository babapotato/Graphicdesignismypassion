/**
 * ============================================
 * STUDIO DUO — Portfolio Website
 * Main JavaScript Module
 * ============================================
 */

// Configuration
const CONFIG = {
    email: '[INSERT_EMAIL_HERE]', // Replace with actual email
    useFormspree: false, // Set to true and add formspree endpoint if using Formspree
    formspreeEndpoint: 'https://formspree.io/f/YOUR_FORM_ID',
    canvasLineColor: '#0000FF',
    canvasLineWidth: 1
};

/**
 * ============================================
 * CREATIVE TRACE - Canvas Drawing Feature
 * Draws persistent blue lines that scroll with content
 * ============================================
 */
class CreativeTrace {
    constructor() {
        this.canvas = document.getElementById('creative-trace');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        
        this.init();
    }
    
    /**
     * Initialize canvas and event listeners
     */
    init() {
        this.resizeCanvas();
        this.setupEventListeners();
        
        // Set canvas drawing styles
        this.ctx.strokeStyle = CONFIG.canvasLineColor;
        this.ctx.lineWidth = CONFIG.canvasLineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }
    
    /**
     * Resize canvas to match document height (not viewport)
     * This ensures drawings persist and scroll with content
     */
    resizeCanvas() {
        const docHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
        
        // Store existing drawing before resize
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Set canvas dimensions
        this.canvas.width = window.innerWidth;
        this.canvas.height = docHeight;
        
        // Restore drawing after resize
        this.ctx.putImageData(imageData, 0, 0);
        
        // Reset styles after resize (canvas reset clears these)
        this.ctx.strokeStyle = CONFIG.canvasLineColor;
        this.ctx.lineWidth = CONFIG.canvasLineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }
    
    /**
     * Setup mouse and touch event listeners
     */
    setupEventListeners() {
        // Mouse events - attached to document for full page tracking
        document.addEventListener('mousedown', (e) => this.startDrawing(e));
        document.addEventListener('mousemove', (e) => this.draw(e));
        document.addEventListener('mouseup', () => this.stopDrawing());
        document.addEventListener('mouseleave', () => this.stopDrawing());
        
        // Touch events for mobile
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', () => this.stopDrawing());
        
        // Resize handler with debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resizeCanvas(), 250);
        });
        
        // Update canvas height when content changes
        const observer = new MutationObserver(() => {
            this.resizeCanvas();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    /**
     * Get coordinates relative to the document (not viewport)
     */
    getCoordinates(e) {
        if (e.touches) {
            // Touch event
            return {
                x: e.touches[0].pageX,
                y: e.touches[0].pageY
            };
        }
        // Mouse event
        return {
            x: e.pageX,
            y: e.pageY
        };
    }
    
    /**
     * Start drawing on mouse down
     */
    startDrawing(e) {
        // Don't start drawing if clicking on interactive elements
        if (this.isInteractiveElement(e.target)) {
            return;
        }
        
        this.isDrawing = true;
        const coords = this.getCoordinates(e);
        this.lastX = coords.x;
        this.lastY = coords.y;
    }
    
    /**
     * Draw line as mouse/touch moves
     */
    draw(e) {
        if (!this.isDrawing) return;
        
        const coords = this.getCoordinates(e);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(coords.x, coords.y);
        this.ctx.stroke();
        
        this.lastX = coords.x;
        this.lastY = coords.y;
    }
    
    /**
     * Stop drawing
     */
    stopDrawing() {
        this.isDrawing = false;
    }
    
    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        if (this.isInteractiveElement(e.target)) {
            return;
        }
        
        // Prevent default to stop scrolling while drawing
        // But only if not on interactive elements
        if (!this.isInteractiveElement(e.target)) {
            // Allow single touch to draw, but don't prevent default
            // to maintain scrolling capability
        }
        
        this.isDrawing = true;
        const coords = this.getCoordinates(e);
        this.lastX = coords.x;
        this.lastY = coords.y;
    }
    
    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        if (!this.isDrawing) return;
        
        const coords = this.getCoordinates(e);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(coords.x, coords.y);
        this.ctx.stroke();
        
        this.lastX = coords.x;
        this.lastY = coords.y;
    }
    
    /**
     * Check if element is interactive (buttons, links, inputs)
     */
    isInteractiveElement(element) {
        const interactiveTags = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'];
        const interactiveClasses = ['nav__link', 'comment-modal', 'comment-marker'];
        
        // Check tag name
        if (interactiveTags.includes(element.tagName)) {
            return true;
        }
        
        // Check classes
        for (const className of interactiveClasses) {
            if (element.classList.contains(className) || element.closest(`.${className}`)) {
                return true;
            }
        }
        
        // Check if inside nav or modal
        if (element.closest('.nav') || element.closest('.comment-modal')) {
            return true;
        }
        
        return false;
    }
}

/**
 * ============================================
 * COLLABORATIVE COMMENTING SYSTEM
 * Click anywhere to leave comments
 * ============================================
 */
class CommentSystem {
    constructor() {
        this.modalTemplate = document.getElementById('comment-modal-template');
        this.markerTemplate = document.getElementById('comment-marker-template');
        this.activeModal = null;
        this.markers = [];
        
        this.init();
    }
    
    /**
     * Initialize commenting system
     */
    init() {
        this.setupEventListeners();
    }
    
    /**
     * Setup click event listeners on commentable elements
     */
    setupEventListeners() {
        // Use event delegation for efficiency
        document.addEventListener('click', (e) => this.handleClick(e));
        
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            if (this.activeModal && !this.activeModal.contains(e.target)) {
                // Check if clicking on a marker
                if (!e.target.classList.contains('comment-marker')) {
                    this.closeActiveModal();
                }
            }
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.closeActiveModal();
            }
        });
    }
    
    /**
     * Handle click events
     */
    handleClick(e) {
        const target = e.target;
        
        // Handle marker clicks
        if (target.classList.contains('comment-marker')) {
            e.stopPropagation();
            this.toggleMarkerModal(target);
            return;
        }
        
        // Handle modal close button
        if (target.classList.contains('comment-modal__close')) {
            e.stopPropagation();
            this.closeActiveModal();
            return;
        }
        
        // Handle comment submit
        if (target.classList.contains('comment-modal__submit')) {
            e.preventDefault();
            e.stopPropagation();
            this.handleSubmit(target.closest('.comment-modal__form'));
            return;
        }
        
        // Don't open modal for navigation clicks
        if (target.closest('.nav')) {
            return;
        }
        
        // Don't open modal if clicking inside existing modal
        if (target.closest('.comment-modal')) {
            return;
        }
        
        // Check if clicking on a commentable element
        const commentableElement = target.closest('[data-commentable]');
        if (commentableElement) {
            e.stopPropagation();
            this.openModal(e.pageX, e.pageY, commentableElement);
        }
    }
    
    /**
     * Open comment modal at specified coordinates
     */
    openModal(x, y, targetElement) {
        // Close any existing modal first
        this.closeActiveModal();
        
        // Clone modal template
        const modal = this.modalTemplate.content.cloneNode(true).querySelector('.comment-modal');
        
        // Position modal near click coordinates
        // Adjust to keep within viewport
        const modalWidth = 280;
        const modalHeight = 200; // Approximate
        const padding = 20;
        
        let posX = x + padding;
        let posY = y + padding;
        
        // Adjust horizontal position
        if (posX + modalWidth > window.innerWidth + window.scrollX) {
            posX = x - modalWidth - padding;
        }
        
        // Adjust vertical position
        if (posY + modalHeight > document.body.scrollHeight) {
            posY = y - modalHeight - padding;
        }
        
        modal.style.left = `${posX}px`;
        modal.style.top = `${posY}px`;
        
        // Store reference to target element
        modal.dataset.targetElement = targetElement.tagName;
        modal.dataset.clickX = x;
        modal.dataset.clickY = y;
        
        // Add to DOM
        document.body.appendChild(modal);
        this.activeModal = modal;
        
        // Focus textarea
        modal.querySelector('.comment-modal__textarea').focus();
    }
    
    /**
     * Close active modal
     */
    closeActiveModal() {
        if (this.activeModal) {
            this.activeModal.remove();
            this.activeModal = null;
        }
    }
    
    /**
     * Handle form submission
     */
    handleSubmit(form) {
        const modal = form.closest('.comment-modal');
        const textarea = form.querySelector('.comment-modal__textarea');
        const email = form.querySelector('.comment-modal__email');
        
        const comment = textarea.value.trim();
        const userEmail = email.value.trim();
        
        // Validate
        if (!comment || !userEmail) {
            alert('Please fill in both fields.');
            return;
        }
        
        // Get coordinates for marker placement
        const clickX = parseInt(modal.dataset.clickX);
        const clickY = parseInt(modal.dataset.clickY);
        
        // Send comment via mailto or Formspree
        if (CONFIG.useFormspree) {
            this.sendViaFormspree(comment, userEmail, clickX, clickY);
        } else {
            this.sendViaMailto(comment, userEmail);
        }
        
        // Close modal and create marker
        this.closeActiveModal();
        this.createMarker(clickX, clickY, comment, userEmail);
    }
    
    /**
     * Send comment via mailto link
     */
    sendViaMailto(comment, userEmail) {
        const subject = encodeURIComponent('Portfolio Comment - Studio Duo');
        const body = encodeURIComponent(
            `Comment: ${comment}\n\n` +
            `From: ${userEmail}\n\n` +
            `Page: ${window.location.href}`
        );
        
        window.location.href = `mailto:${CONFIG.email}?subject=${subject}&body=${body}`;
    }
    
    /**
     * Send comment via Formspree
     */
    async sendViaFormspree(comment, userEmail, x, y) {
        try {
            const response = await fetch(CONFIG.formspreeEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    comment: comment,
                    email: userEmail,
                    page: window.location.href,
                    coordinates: `${x}, ${y}`
                })
            });
            
            if (!response.ok) {
                console.error('Failed to send comment');
            }
        } catch (error) {
            console.error('Error sending comment:', error);
        }
    }
    
    /**
     * Create marker at comment location
     */
    createMarker(x, y, comment, email) {
        const marker = this.markerTemplate.content.cloneNode(true).querySelector('.comment-marker');
        
        // Position marker
        marker.style.left = `${x - 12}px`; // Center the 24px marker
        marker.style.top = `${y - 12}px`;
        
        // Store comment data
        marker.dataset.comment = comment;
        marker.dataset.email = email;
        
        // Add to DOM
        document.body.appendChild(marker);
        this.markers.push(marker);
    }
    
    /**
     * Toggle modal from marker
     */
    toggleMarkerModal(marker) {
        // If there's an active modal, close it
        if (this.activeModal) {
            this.closeActiveModal();
            return;
        }
        
        // Create a modal showing the saved comment
        const modal = this.modalTemplate.content.cloneNode(true).querySelector('.comment-modal');
        
        // Position near marker
        const rect = marker.getBoundingClientRect();
        const x = rect.left + window.scrollX + 30;
        const y = rect.top + window.scrollY;
        
        modal.style.left = `${x}px`;
        modal.style.top = `${y}px`;
        
        // Pre-fill with saved comment data
        modal.querySelector('.comment-modal__textarea').value = marker.dataset.comment || '';
        modal.querySelector('.comment-modal__email').value = marker.dataset.email || '';
        
        // Add to DOM
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
    }
    
    /**
     * Initialize navigation
     */
    init() {
        this.setupEventListeners();
        this.updateActiveLink();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Click handlers for nav links
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => this.handleNavClick(e));
        });
        
        // CTA button
        const ctaButton = document.querySelector('.home__cta');
        if (ctaButton) {
            ctaButton.addEventListener('click', (e) => this.handleNavClick(e));
        }
        
        // Scroll handler for active state
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => this.updateActiveLink(), 100);
        }, { passive: true });
    }
    
    /**
     * Handle navigation click
     */
    handleNavClick(e) {
        e.preventDefault();
        
        const href = e.currentTarget.getAttribute('href');
        const targetSection = document.querySelector(href);
        
        if (targetSection) {
            const offset = window.innerWidth > 768 ? 80 : 20; // Account for fixed nav
            const targetPosition = targetSection.offsetTop - offset;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    }
    
    /**
     * Update active navigation link based on scroll position
     */
    updateActiveLink() {
        const scrollPosition = window.scrollY + window.innerHeight / 3;
        
        let currentSection = '';
        
        this.sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSection = section.getAttribute('id');
            }
        });
        
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === currentSection) {
                link.classList.add('active');
            }
        });
    }
}

/**
 * ============================================
 * SITE DATA LOADER
 * Load content from JSON file
 * ============================================ 
 */
class SiteDataLoader {
    constructor() {
        this.dataPath = 'content/site_data.json';
    }
    
    /**
     * Load site data (optional - content is already in HTML)
     * This method can be used to dynamically update content
     */
    async load() {
        try {
            const response = await fetch(this.dataPath);
            if (!response.ok) {
                console.log('Site data not loaded - using static HTML content');
                return null;
            }
            const data = await response.json();
            
            // Update config email
            if (data.site && data.site.email) {
                CONFIG.email = data.site.email;
            }
            
            return data;
        } catch (error) {
            console.log('Using static HTML content');
            return null;
        }
    }
}

/**
 * ============================================
 * INITIALIZATION
 * ============================================
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    const creativeTrace = new CreativeTrace();
    const commentSystem = new CommentSystem();
    const smoothNavigation = new SmoothNavigation();
    const siteDataLoader = new SiteDataLoader();
    
    // Load site data (optional)
    siteDataLoader.load();
    
    // Log initialization
    console.log('Studio Duo Portfolio initialized');
    console.log('- Creative Trace: Drawing enabled');
    console.log('- Comment System: Click anywhere to comment');
    console.log('- Smooth Navigation: Active');
});

/**
 * ============================================
 * UTILITY FUNCTIONS
 * ============================================
 */

/**
 * Debounce function for performance optimization
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function for performance optimization
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
