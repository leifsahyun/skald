// Ocean Graphics - Renders ocean background with gradient and animated waves

class OceanGraphics {
    constructor(graphics, width, height) {
        this.graphics = graphics;
        this.width = width;
        this.height = height;
    }
    
    draw(waveOffset) {
        const g = this.graphics;
        g.clear();
        
        // Draw gradient background (using multiple rectangles)
        const steps = 50;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            let r, gr, b;
            if (t < 0.5) {
                const localT = t * 2;
                r = Math.floor(26 + (45 - 26) * localT);
                gr = Math.floor(95 + (125 - 95) * localT);
                b = Math.floor(122 + (165 - 122) * localT);
            } else {
                const localT = (t - 0.5) * 2;
                r = Math.floor(45 + (26 - 45) * localT);
                gr = Math.floor(125 + (79 - 125) * localT);
                b = Math.floor(165 + (106 - 165) * localT);
            }
            const color = (r << 16) | (gr << 8) | b;
            g.rect(0, i * this.height / steps, this.width, this.height / steps);
            g.fill(color);
        }
        
        // Draw animated waves
        for (let layer = 0; layer < 3; layer++) {
            const waveY = layer * 150;
            const waveSpeed = 0.5 + layer * 0.3;
            const waveHeight = 8 - layer * 2;
            const waveFreq = 0.015 + layer * 0.005;
            const alpha = 0.15 - layer * 0.04;
            
            for (let y = waveY; y < this.height; y += 40) {
                const points = [];
                for (let x = 0; x <= this.width; x += 5) {
                    const wave = Math.sin((x * waveFreq) + (-waveOffset * waveSpeed) + (y * 0.01)) * waveHeight;
                    points.push(x, y + wave);
                }
                g.moveTo(points[0], points[1]);
                for (let i = 2; i < points.length; i += 2) {
                    g.lineTo(points[i], points[i + 1]);
                }
                g.stroke({ width: 2, color: 0xffffff, alpha: alpha });
            }
        }
    }
}
