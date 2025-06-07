class AtkinsonDither {
    constructor() {
        this.imageInput = document.getElementById('imageInput');
        this.processBtn = document.getElementById('processBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.originalCanvas = document.getElementById('originalCanvas');
        this.ditheredCanvas = document.getElementById('ditheredCanvas');
        this.originalCtx = this.originalCanvas.getContext('2d');
        this.ditheredCtx = this.ditheredCanvas.getContext('2d');
        
        this.setupEventListeners();
        this.setupWindowDragging();
    }
    
    setupEventListeners() {
        this.imageInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadImage(e.target.files[0]);
            }
        });
        
        this.processBtn.addEventListener('click', () => {
            this.applyAtkinsonDither();
        });
        
        this.downloadBtn.addEventListener('click', () => {
            this.downloadImage();
        });
        
        // Add menu item click effect
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('mousedown', () => {
                if (item.classList.contains('apple-menu')) {
                    item.classList.add('clicked');
                } else {
                    item.classList.add('active');
                }
            });
            
            item.addEventListener('mouseup', () => {
                if (item.classList.contains('apple-menu')) {
                    item.classList.remove('clicked');
                } else {
                    item.classList.remove('active');
                }
            });
        });
        
        // Add close button functionality
        const closeBox = document.querySelector('.close-box');
        if (closeBox) {
            closeBox.addEventListener('click', () => {
                const window = document.querySelector('.window');
                
                // Apply closing animation
                window.style.transition = 'transform 0.3s, opacity 0.3s';
                window.style.transformOrigin = 'center center';
                window.style.transform = 'scale(0.9)';
                window.style.opacity = '0';
                
                // Reset after animation
                setTimeout(() => {
                    window.style.display = 'none';
                    setTimeout(() => {
                        window.style.transition = '';
                        window.style.transform = 'scale(1)';
                        window.style.opacity = '1';
                        window.style.display = 'block';
                    }, 500);
                }, 300);
            });
        }
    }
    
    setupWindowDragging() {
        const window = document.querySelector('.window');
        const titleBarContainer = document.querySelector('.title-bar-container');
        let isDragging = false;
        let offsetX, offsetY;
        
        titleBarContainer.addEventListener('mousedown', (e) => {
            // Don't start drag if clicking the close button
            if (e.target.classList.contains('close-box')) return;
            
            isDragging = true;
            offsetX = e.clientX - window.getBoundingClientRect().left;
            offsetY = e.clientY - window.getBoundingClientRect().top;
            
            // Add dragging class for styling
            window.classList.add('dragging');
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            
            // Keep window within viewport bounds
            const maxX = window.parentElement.clientWidth - window.clientWidth;
            const maxY = window.parentElement.clientHeight - window.clientHeight;
            
            window.style.left = `${Math.max(0, Math.min(maxX, x))}px`;
            window.style.top = `${Math.max(20, Math.min(maxY, y))}px`;
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            window.classList.remove('dragging');
        });
    }
    
    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.displayOriginalImage(img);
                this.processBtn.disabled = false;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    displayOriginalImage(img) {
        // Calculate dimensions to fit within canvas while maintaining aspect ratio
        const maxSize = 350;
        let { width, height } = this.calculateDimensions(img.width, img.height, maxSize);
        
        this.originalCanvas.width = width;
        this.originalCanvas.height = height;
        this.originalCtx.drawImage(img, 0, 0, width, height);
        
        // Store original image data for processing
        this.originalImageData = this.originalCtx.getImageData(0, 0, width, height);
    }
    
    calculateDimensions(originalWidth, originalHeight, maxSize) {
        const aspectRatio = originalWidth / originalHeight;
        
        if (originalWidth > originalHeight) {
            return {
                width: Math.min(originalWidth, maxSize),
                height: Math.min(originalWidth, maxSize) / aspectRatio
            };
        } else {
            return {
                width: Math.min(originalHeight, maxSize) * aspectRatio,
                height: Math.min(originalHeight, maxSize)
            };
        }
    }
    
    applyAtkinsonDither() {
        if (!this.originalImageData) return;
        
        const { width, height } = this.originalImageData;
        const data = new Uint8ClampedArray(this.originalImageData.data);
        
        // Convert to grayscale and apply Atkinson dithering
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                // Convert to grayscale
                const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
                
                // Determine new pixel value (black or white)
                const newPixel = gray < 128 ? 0 : 255;
                const error = gray - newPixel;
                
                // Set the current pixel
                data[idx] = data[idx + 1] = data[idx + 2] = newPixel;
                
                // Distribute error using Atkinson dithering pattern
                this.distributeError(data, width, height, x, y, error);
            }
        }
        
        // Display dithered image
        this.ditheredCanvas.width = width;
        this.ditheredCanvas.height = height;
        const ditheredImageData = new ImageData(data, width, height);
        this.ditheredCtx.putImageData(ditheredImageData, 0, 0);
        
        this.downloadBtn.disabled = false;
    }
    
    distributeError(data, width, height, x, y, error) {
        // Atkinson dithering kernel (distributes 6/8 of the error)
        const errorDistribution = [
            { dx: 1, dy: 0, factor: 1/8 },  // right
            { dx: 2, dy: 0, factor: 1/8 },  // right + 1
            { dx: -1, dy: 1, factor: 1/8 }, // below left
            { dx: 0, dy: 1, factor: 1/8 },  // below
            { dx: 1, dy: 1, factor: 1/8 },  // below right
            { dx: 0, dy: 2, factor: 1/8 }   // below + 1
        ];
        
        errorDistribution.forEach(({ dx, dy, factor }) => {
            const newX = x + dx;
            const newY = y + dy;
            
            if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                const idx = (newY * width + newX) * 4;
                const adjustment = error * factor;
                
                data[idx] = Math.max(0, Math.min(255, data[idx] + adjustment));
                data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + adjustment));
                data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + adjustment));
            }
        });
    }
    
    downloadImage() {
        const link = document.createElement('a');
        link.download = 'atkinson-dithered.png';
        link.href = this.ditheredCanvas.toDataURL();
        link.click();
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AtkinsonDither();
});