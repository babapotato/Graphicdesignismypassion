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
    canvasLineWidth: 1,
    clickThreshold: 5 // pixels - movement less than this is considered a click, not a drag
};

// Global state to coordinate between drawing and clicking
const AppState = {
    isDragging: false,
    mouseDownPos: { x: 0, y: 0 },
    hasMoved: false
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
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }
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
        // Wait for page to fully render before sizing canvas
        this.resizeCanvas();
        this.setupEventListeners();
        this.setCanvasStyles();
        
        // Re-check canvas size after a short delay (images/fonts loading)
        setTimeout(() => this.resizeCanvas(), 500);
        setTimeout(() => this.resizeCanvas(), 1500);
        
        console.log('Creative Trace initialized');
    }
    
    /**
     * Set canvas drawing styles
     */
    setCanvasStyles() {
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
        // Calculate the full document height
        const docHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
        
        const docWidth = Math.max(
            document.body.scrollWidth,
            document.body.offsetWidth,
            document.documentElement.clientWidth,
            document.documentElement.scrollWidth,
            document.documentElement.offsetWidth
        );
        
        // Only resize if dimensions actually changed
        if (this.canvas.width === docWidth && this.canvas.height === docHeight) {
            return;
        }
        
        // Store existing drawing before resize
        let imageData = null;
        if (this.canvas.width > 0 && this.canvas.height > 0) {
            try {
                imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            } catch (e) {
                // Canvas was empty or cross-origin issue
            }
        }
        
        // Set canvas dimensions
        this.canvas.width = docWidth;
        this.canvas.height = docHeight;
        
        // Restore drawing after resize
        if (imageData) {
            this.ctx.putImageData(imageData, 0, 0);
        }
        
        // Reset styles after resize (canvas resize clears context state)
        this.setCanvasStyles();
        
        console.log(`Canvas resized to ${docWidth}x${docHeight}`);
    }
    
    /**
     * Setup mouse and touch event listeners
     */
    setupEventListeners() {
        // Mouse events - attached to document for full page tracking
        document.addEventListener('mousedown', (e) => this.startDrawing(e), true);
        document.addEventListener('mousemove', (e) => this.draw(e), true);
        document.addEventListener('mouseup', (e) => this.stopDrawing(e), true);
        document.addEventListener('mouseleave', () => this.stopDrawing(), true);
        
        // Touch events for mobile - use capturing phase
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { capture: true, passive: true });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { capture: true, passive: true });
        document.addEventListener('touchend', () => this.stopDrawing(), { capture: true });
        document.addEventListener('touchcancel', () => this.stopDrawing(), { capture: true });
        
        // Resize handler with debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resizeCanvas(), 250);
        });
        
        // Also resize on scroll (in case content loads dynamically)
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => this.resizeCanvas(), 500);
        }, { passive: true });
        
        // Resize when DOM changes
        const observer = new MutationObserver(() => {
            setTimeout(() => this.resizeCanvas(), 100);
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    }
    
    /**
     * Get coordinates relative to the document (not viewport)
     */
    getCoordinates(e) {
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].pageX,
                y: e.touches[0].pageY
            };
        }
        return {
            x: e.pageX,
            y: e.pageY
        };
    }
    
    /**
     * Start drawing on mouse down
     */
    startDrawing(e) {
        // Skip if clicking on truly interactive elements (nav, modals, buttons)
        if (this.isInteractiveElement(e.target)) {
            return;
        }
        
        const coords = this.getCoordinates(e);
        
        // Store initial position for click vs drag detection
        AppState.mouseDownPos = { x: coords.x, y: coords.y };
        AppState.hasMoved = false;
        AppState.isDragging = true;
        
        this.isDrawing = true;
        this.lastX = coords.x;
        this.lastY = coords.y;
    }
    
    /**
     * Draw line as mouse/touch moves
     */
    draw(e) {
        if (!this.isDrawing) return;
        
        const coords = this.getCoordinates(e);
        
        // Calculate distance moved
        const dx = coords.x - AppState.mouseDownPos.x;
        const dy = coords.y - AppState.mouseDownPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only start drawing if moved past threshold
        if (distance > CONFIG.clickThreshold) {
            AppState.hasMoved = true;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.lastX, this.lastY);
            this.ctx.lineTo(coords.x, coords.y);
            this.ctx.stroke();
        }
        
        this.lastX = coords.x;
        this.lastY = coords.y;
    }
    
    /**
     * Stop drawing
     */
    stopDrawing() {
        this.isDrawing = false;
        AppState.isDragging = false;
    }
    
    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        if (this.isInteractiveElement(e.target)) {
            return;
        }
        
        const coords = this.getCoordinates(e);
        
        AppState.mouseDownPos = { x: coords.x, y: coords.y };
        AppState.hasMoved = false;
        AppState.isDragging = true;
        
        this.isDrawing = true;
        this.lastX = coords.x;
        this.lastY = coords.y;
    }
    
    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        if (!this.isDrawing) return;
        
        const coords = this.getCoordinates(e);
        
        // Calculate distance moved
        const dx = coords.x - AppState.mouseDownPos.x;
        const dy = coords.y - AppState.mouseDownPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > CONFIG.clickThreshold) {
            AppState.hasMoved = true;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.lastX, this.lastY);
            this.ctx.lineTo(coords.x, coords.y);
            this.ctx.stroke();
        }
        
        this.lastX = coords.x;
        this.lastY = coords.y;
    }
    
    /**
     * Check if element is truly interactive (not just commentable)
     */
    isInteractiveElement(element) {
        const interactiveTags = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'];
        
        // Check tag name
        if (interactiveTags.includes(element.tagName)) {
            return true;
        }
        
        // Check if inside nav or modal
        if (element.closest('.nav') || element.closest('.comment-modal') || element.closest('.comment-marker')) {
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
        
        if (!this.modalTemplate || !this.markerTemplate) {
            console.error('Comment templates not found');
            return;
        }
        
        this.init();
        console.log('Comment System initialized');
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
        // Use event delegation - listen for click (not mousedown)
        document.addEventListener('click', (e) => this.handleClick(e));
        
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
        
        // If user was dragging (drawing), don't open comment modal
        if (AppState.hasMoved) {
            return;
        }
        
        // Handle marker clicks
        if (target.classList.contains('comment-marker')) {
            e.preventDefault();
            e.stopPropagation();
            this.toggleMarkerModal(target);
            return;
        }
        
        // Handle modal close button
        if (target.classList.contains('comment-modal__close')) {
            e.preventDefault();
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
        
        // If clicking outside modal, close it
        if (this.activeModal && !this.activeModal.contains(target)) {
            this.closeActiveModal();
            // Don't open a new modal immediately after closing
            return;
        }
        
        // Check if clicking on a commentable element
        const commentableElement = target.closest('[data-commentable]');
        if (commentableElement) {
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
        const templateContent = this.modalTemplate.content.cloneNode(true);
        const modal = templateContent.querySelector('.comment-modal');
        
        if (!modal) {
            console.error('Modal template structure invalid');
            return;
        }
        
        // Calculate position - keep modal within viewport
        const modalWidth = 280;
        const modalHeight = 220;
        const padding = 15;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        
        // Start with click position + padding
        let posX = x + padding;
        let posY = y + padding;
        
        // Adjust horizontal position to stay in viewport
        if (posX + modalWidth > scrollX + viewportWidth - padding) {
            posX = x - modalWidth - padding;
        }
        if (posX < scrollX + padding) {
            posX = scrollX + padding;
        }
        
        // Adjust vertical position to stay in viewport
        if (posY + modalHeight > scrollY + viewportHeight - padding) {
            posY = y - modalHeight - padding;
        }
        if (posY < scrollY + padding) {
            posY = scrollY + padding;
        }
        
        modal.style.left = `${posX}px`;
        modal.style.top = `${posY}px`;
        
        // Store click coordinates for marker placement
        modal.dataset.clickX = x;
        modal.dataset.clickY = y;
        
        // Add to DOM
        document.body.appendChild(modal);
        this.activeModal = modal;
        
        // Focus textarea after a brief delay (allows animation)
        setTimeout(() => {
            const textarea = modal.querySelector('.comment-modal__textarea');
            if (textarea) textarea.focus();
        }, 50);
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
        if (!form) return;
        
        const modal = form.closest('.comment-modal');
        const textarea = form.querySelector('.comment-modal__textarea');
        const emailInput = form.querySelector('.comment-modal__email');
        
        if (!textarea || !emailInput) return;
        
        const comment = textarea.value.trim();
        const userEmail = emailInput.value.trim();
        
        // Validate
        if (!comment || !userEmail) {
            alert('Please fill in both fields.');
            return;
        }
        
        // Basic email validation
        if (!userEmail.includes('@') || !userEmail.includes('.')) {
            alert('Please enter a valid email address.');
            return;
        }
        
        // Get coordinates for marker placement
        const clickX = parseInt(modal.dataset.clickX, 10);
        const clickY = parseInt(modal.dataset.clickY, 10);
        
        // Send comment via mailto or Formspree
        if (CONFIG.useFormspree) {
            this.sendViaFormspree(comment, userEmail, clickX, clickY);
        } else {
            this.sendViaMailto(comment, userEmail);
        }
        
        // Create marker and close modal
        this.createMarker(clickX, clickY, comment, userEmail);
        this.closeActiveModal();
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
        
        // Open in new window to avoid navigating away
        window.open(`mailto:${CONFIG.email}?subject=${subject}&body=${body}`, '_blank');
    }
    
    /**
     * Send comment via Formspree
     */
    async sendViaFormspree(comment, userEmail, x, y) {
        try {
            const response = await fetch(CONFIG.formspreeEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    comment: comment,
                    email: userEmail,
                    page: window.location.href,
                    coordinates: `${x}, ${y}`
                })
            });
            
            if (response.ok) {
                console.log('Comment sent successfully');
            } else {
                console.error('Failed to send comment:', response.status);
            }
        } catch (error) {
            console.error('Error sending comment:', error);
        }
    }
    
    /**
     * Create marker at comment location
     */
    createMarker(x, y, comment, email) {
        const templateContent = this.markerTemplate.content.cloneNode(true);
        const marker = templateContent.querySelector('.comment-marker');
        
        if (!marker) return;
        
        // Position marker (center the 24px marker on click point)
        marker.style.left = `${x - 12}px`;
        marker.style.top = `${y - 12}px`;
        
        // Store comment data
        marker.dataset.comment = comment;
        marker.dataset.email = email;
        
        // Add to DOM
        document.body.appendChild(marker);
        this.markers.push(marker);
    }
    
    /**
     * Toggle modal from marker click
     */
    toggleMarkerModal(marker) {
        // If there's an active modal, close it
        if (this.activeModal) {
            this.closeActiveModal();
            return;
        }
        
        // Create a modal showing the saved comment
        const templateContent = this.modalTemplate.content.cloneNode(true);
        const modal = templateContent.querySelector('.comment-modal');
        
        if (!modal) return;
        
        // Position near marker
        const rect = marker.getBoundingClientRect();
        const x = rect.left + window.scrollX + 30;
        const y = rect.top + window.scrollY - 10;
        
        modal.style.left = `${x}px`;
        modal.style.top = `${y}px`;
        
        // Pre-fill with saved comment data
        const textarea = modal.querySelector('.comment-modal__textarea');
        const emailInput = modal.querySelector('.comment-modal__email');
        
        if (textarea) textarea.value = marker.dataset.comment || '';
        if (emailInput) emailInput.value = marker.dataset.email || '';
        
        // Store marker reference
        modal.dataset.markerRef = 'true';
        
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
        console.log('Smooth Navigation initialized');
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
        
        // Scroll handler for active state (throttled)
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.updateActiveLink();
                    ticking = false;
                });
                ticking = true;
            }
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
            const offset = window.innerWidth > 768 ? 80 : 20;
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
        
        let currentSection = 'home';
        
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
        this.dataPath = './content/site_data.json';
    }
    
    /**
     * Load site data (optional - content is already in HTML)
     */
    async load() {
        try {
            const response = await fetch(this.dataPath);
            if (!response.ok) {
                console.log('Site data file not found - using static HTML content');
                return null;
            }
            const data = await response.json();
            
            // Update config email if provided
            if (data.site && data.site.email && data.site.email !== '[INSERT_EMAIL_HERE]') {
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
function initializeApp() {
    console.log('Initializing Studio Duo Portfolio...');
    
    // Initialize all modules
    const creativeTrace = new CreativeTrace();
    const commentSystem = new CommentSystem();
    const smoothNavigation = new SmoothNavigation();
    const siteDataLoader = new SiteDataLoader();
    
    // Load site data
    siteDataLoader.load();
    
    console.log('✓ Studio Duo Portfolio ready');
    console.log('  - Draw: Click and drag anywhere');
    console.log('  - Comment: Click on any content');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded
    initializeApp();
}

// Also try initializing on window load (backup for slow-loading pages)
window.addEventListener('load', () => {
    // Resize canvas again after all resources loaded
    const canvas = document.getElementById('creative-trace');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const docHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
        );
        const docWidth = document.documentElement.clientWidth;
        
        if (canvas.width !== docWidth || canvas.height !== docHeight) {
            canvas.width = docWidth;
            canvas.height = docHeight;
            ctx.strokeStyle = CONFIG.canvasLineColor;
            ctx.lineWidth = CONFIG.canvasLineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            console.log('Canvas final resize on load:', docWidth, 'x', docHeight);
        }
    }
});
