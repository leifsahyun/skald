// Poetry Interface - PIXI.js interface for composing poetry with drag and drop
// Creates a full-canvas overlay with word slots and draggable words

class PoetryInterface {
    constructor(app, onClose) {
        this.app = app;
        this.onClose = onClose; // Callback for when interface is closed
        this.container = null;
        this.isVisible = false;
        
        // Poetry composition state
        this.lines = 3; // Number of lines for poetry
        this.slotsPerLine = 4; // Number of word slots per line
        this.slots = []; // Array of slot objects
        this.words = []; // Array of draggable word objects
        
        // Available words for composition (Viking/Norse themed)
        this.wordList = [
            { text: 'wind', syllables: ['–'] }, // trochaic: one stressed syllable
            { text: 'waves', syllables: ['–'] },
            { text: 'sailing', syllables: ['–', '◡'] }, // trochaic: stressed-unstressed
            { text: 'ocean', syllables: ['–', '◡'] },
            { text: 'thunder', syllables: ['–', '◡'] },
            { text: 'mighty', syllables: ['–', '◡'] },
            { text: 'northern', syllables: ['–', '◡'] },
            { text: 'golden', syllables: ['–', '◡'] },
            { text: 'Viking', syllables: ['–', '◡'] },
            { text: 'dragon', syllables: ['–', '◡'] },
            { text: 'glory', syllables: ['–', '◡'] },
            { text: 'ravens', syllables: ['–', '◡'] }
        ];
        
        // Drag state
        this.draggedWord = null;
        this.dragOffset = { x: 0, y: 0 };
        
        // Word dimensions (used for drag and drop bounds)
        this.wordWidth = 100;
        this.wordHeight = 40;
        
        this.createInterface();
    }
    
    createInterface() {
        // Create main container that covers the entire canvas
        this.container = new PIXI.Container();
        this.container.visible = false;
        
        // Background overlay (semi-transparent dark background)
        const background = new PIXI.Graphics();
        background.rect(0, 0, this.app.screen.width, this.app.screen.height);
        background.fill({ color: 0x1a1a2e, alpha: 0.95 });
        this.container.addChild(background);
        
        // Title
        const title = new PIXI.Text({
            text: 'Compose Your Poetry',
            style: {
                fontFamily: 'Arial',
                fontSize: 36,
                fill: 0xf0e6d2,
                fontWeight: 'bold'
            }
        });
        title.anchor.set(0.5, 0);
        title.x = this.app.screen.width / 2;
        title.y = 30;
        this.container.addChild(title);
        
        // Create slots in the center
        this.createSlots();
        
        // Create word collection on the left
        this.createWordCollection();
        
        // Create close button
        this.createCloseButton();
        
        // Add container to stage but keep it hidden initially
        this.app.stage.addChild(this.container);
    }
    
    createSlots() {
        const centerX = this.app.screen.width / 2;
        const startY = 120;
        const lineSpacing = 120;
        const slotWidth = 120;
        const slotHeight = 50;
        const slotSpacing = 20;
        
        for (let line = 0; line < this.lines; line++) {
            const lineY = startY + line * lineSpacing;
            const totalLineWidth = this.slotsPerLine * slotWidth + (this.slotsPerLine - 1) * slotSpacing;
            const lineStartX = centerX - totalLineWidth / 2;
            
            for (let slot = 0; slot < this.slotsPerLine; slot++) {
                const slotX = lineStartX + slot * (slotWidth + slotSpacing);
                
                // Create slot container
                const slotContainer = new PIXI.Container();
                slotContainer.x = slotX;
                slotContainer.y = lineY;
                
                // Slot background
                const slotBg = new PIXI.Graphics();
                slotBg.rect(0, 0, slotWidth, slotHeight);
                slotBg.stroke({ color: 0x8b7355, width: 2 });
                slotBg.fill({ color: 0x2a2a3e, alpha: 0.5 });
                slotContainer.addChild(slotBg);
                
                // Syllable markers below slot (trochaic pattern: – ◡)
                const syllableText = new PIXI.Text({
                    text: '– ◡',
                    style: {
                        fontFamily: 'Arial',
                        fontSize: 20,
                        fill: 0x8b7355,
                        align: 'center'
                    }
                });
                syllableText.anchor.set(0.5, 0);
                syllableText.x = slotWidth / 2;
                syllableText.y = slotHeight + 5;
                slotContainer.addChild(syllableText);
                
                // Store slot data
                const slotData = {
                    container: slotContainer,
                    background: slotBg,
                    x: slotX,
                    y: lineY,
                    width: slotWidth,
                    height: slotHeight,
                    occupiedBy: null, // Reference to word currently in this slot
                    line: line,
                    position: slot
                };
                
                this.slots.push(slotData);
                this.container.addChild(slotContainer);
            }
        }
    }
    
    createWordCollection() {
        const leftMargin = 50;
        const startY = 120;
        const wordSpacing = 50;
        
        // Collection title
        const collectionTitle = new PIXI.Text({
            text: 'Words:',
            style: {
                fontFamily: 'Arial',
                fontSize: 24,
                fill: 0xf0e6d2,
                fontWeight: 'bold'
            }
        });
        collectionTitle.x = leftMargin;
        collectionTitle.y = startY - 40;
        this.container.addChild(collectionTitle);
        
        // Create word items
        this.wordList.forEach((wordData, index) => {
            const wordY = startY + index * wordSpacing;
            
            // Word container
            const wordContainer = new PIXI.Container();
            wordContainer.x = leftMargin;
            wordContainer.y = wordY;
            wordContainer.eventMode = 'static';
            wordContainer.cursor = 'pointer';
            
            // Word background
            const wordBg = new PIXI.Graphics();
            wordBg.rect(0, 0, this.wordWidth, this.wordHeight);
            wordBg.fill({ color: 0x4a7c59, alpha: 0.8 });
            wordBg.stroke({ color: 0x6b9570, width: 2 });
            wordContainer.addChild(wordBg);
            
            // Word text
            const wordText = new PIXI.Text({
                text: wordData.text,
                style: {
                    fontFamily: 'Arial',
                    fontSize: 18,
                    fill: 0xffffff,
                    align: 'center'
                }
            });
            wordText.anchor.set(0.5, 0.5);
            wordText.x = this.wordWidth / 2;
            wordText.y = this.wordHeight / 2;
            wordContainer.addChild(wordText);
            
            // Store word data
            const wordObject = {
                container: wordContainer,
                background: wordBg,
                text: wordText,
                data: wordData,
                originalX: leftMargin,
                originalY: wordY,
                currentSlot: null, // Reference to slot if word is placed
                isDragging: false
            };
            
            // Setup drag and drop
            this.setupDragAndDrop(wordObject);
            
            this.words.push(wordObject);
            this.container.addChild(wordContainer);
        });
    }
    
    setupDragAndDrop(wordObject) {
        const container = wordObject.container;
        
        // Mouse down - start dragging
        container.on('pointerdown', (event) => {
            this.draggedWord = wordObject;
            wordObject.isDragging = true;
            
            // Calculate offset from word position to cursor
            const position = event.global;
            this.dragOffset.x = position.x - container.x;
            this.dragOffset.y = position.y - container.y;
            
            // Bring to front
            this.container.removeChild(container);
            this.container.addChild(container);
            
            // Visual feedback
            wordObject.background.clear();
            wordObject.background.rect(0, 0, this.wordWidth, this.wordHeight);
            wordObject.background.fill({ color: 0x6b9570, alpha: 1 });
            wordObject.background.stroke({ color: 0x8bb896, width: 2 });
        });
        
        // Mouse move - drag
        container.on('pointermove', (event) => {
            if (wordObject.isDragging && this.draggedWord === wordObject) {
                const position = event.global;
                container.x = position.x - this.dragOffset.x;
                container.y = position.y - this.dragOffset.y;
            }
        });
        
        // Mouse up - drop
        container.on('pointerup', () => {
            if (wordObject.isDragging) {
                this.handleDrop(wordObject);
                wordObject.isDragging = false;
                this.draggedWord = null;
            }
        });
        
        // Also handle pointer leave
        container.on('pointerupoutside', () => {
            if (wordObject.isDragging) {
                this.handleDrop(wordObject);
                wordObject.isDragging = false;
                this.draggedWord = null;
            }
        });
    }
    
    handleDrop(wordObject) {
        const container = wordObject.container;
        
        // Find if word was dropped on a slot
        let targetSlot = null;
        for (const slot of this.slots) {
            const dx = container.x - slot.x;
            const dy = container.y - slot.y;
            
            // Check if word center is within slot bounds
            if (dx > -50 && dx < slot.width + 50 && 
                dy > -20 && dy < slot.height + 20) {
                targetSlot = slot;
                break;
            }
        }
        
        if (targetSlot) {
            // Remove word from previous slot if any
            if (wordObject.currentSlot) {
                wordObject.currentSlot.occupiedBy = null;
            }
            
            // If target slot is occupied, return that word to collection
            if (targetSlot.occupiedBy) {
                this.returnToCollection(targetSlot.occupiedBy);
            }
            
            // Place word in slot
            container.x = targetSlot.x + 10;
            container.y = targetSlot.y + 5;
            targetSlot.occupiedBy = wordObject;
            wordObject.currentSlot = targetSlot;
        } else {
            // Return to original position
            this.returnToCollection(wordObject);
        }
        
        // Reset visual
        wordObject.background.clear();
        wordObject.background.rect(0, 0, this.wordWidth, this.wordHeight);
        wordObject.background.fill({ color: 0x4a7c59, alpha: 0.8 });
        wordObject.background.stroke({ color: 0x6b9570, width: 2 });
    }
    
    returnToCollection(wordObject) {
        if (wordObject.currentSlot) {
            wordObject.currentSlot.occupiedBy = null;
            wordObject.currentSlot = null;
        }
        
        wordObject.container.x = wordObject.originalX;
        wordObject.container.y = wordObject.originalY;
    }
    
    createCloseButton() {
        const buttonWidth = 100;
        const buttonHeight = 40;
        const buttonX = this.app.screen.width - buttonWidth - 30;
        const buttonY = this.app.screen.height - buttonHeight - 30;
        
        const button = new PIXI.Container();
        button.x = buttonX;
        button.y = buttonY;
        button.eventMode = 'static';
        button.cursor = 'pointer';
        
        // Button background
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, buttonWidth, buttonHeight);
        bg.fill({ color: 0x8b4513, alpha: 0.9 });
        bg.stroke({ color: 0xd2691e, width: 2 });
        button.addChild(bg);
        
        // Button text
        const text = new PIXI.Text({
            text: 'Close',
            style: {
                fontFamily: 'Arial',
                fontSize: 20,
                fill: 0xffffff,
                fontWeight: 'bold'
            }
        });
        text.anchor.set(0.5, 0.5);
        text.x = buttonWidth / 2;
        text.y = buttonHeight / 2;
        button.addChild(text);
        
        // Hover effect
        button.on('pointerover', () => {
            bg.clear();
            bg.rect(0, 0, buttonWidth, buttonHeight);
            bg.fill({ color: 0xa0522d, alpha: 1 });
            bg.stroke({ color: 0xd2691e, width: 2 });
        });
        
        button.on('pointerout', () => {
            bg.clear();
            bg.rect(0, 0, buttonWidth, buttonHeight);
            bg.fill({ color: 0x8b4513, alpha: 0.9 });
            bg.stroke({ color: 0xd2691e, width: 2 });
        });
        
        // Click to close
        button.on('pointerdown', () => {
            this.hide();
        });
        
        this.container.addChild(button);
    }
    
    show() {
        this.isVisible = true;
        this.container.visible = true;
        
        // Reset all words to collection when showing
        this.words.forEach(word => {
            this.returnToCollection(word);
        });
    }
    
    hide() {
        this.isVisible = false;
        this.container.visible = false;
        
        // Call the onClose callback if provided
        if (this.onClose) {
            this.onClose();
        }
    }
    
    destroy() {
        if (this.container) {
            this.container.destroy({ children: true });
        }
    }
}
