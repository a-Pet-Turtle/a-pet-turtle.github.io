const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

let width = 0;
let height = 0;
let particles = [];
let mouse = { x: -9999, y: -9999 };
let attracting = false;
const trail = [];

const CONFIG = {
    count: 80,
    maxDist: 140,
    mouseRadius: 120,
    mouseForce: 3.5,
    fallSpeed: 0.18,
    particleColor: '#00ff99',
    lineColor: '#00e5cc',
    minSize: 1.5,
    maxSize: 3,
    trailLength: 28,
    trailColor: '#00e5cc',
};

const wind = {
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    timer: 0,
    interval: 600,
    maxStrength: 0.25,
    update() {
        this.timer += 1;
        if (this.timer >= this.interval) {
            this.timer = 0;
            this.interval = 400 + Math.random() * 600;
            this.tx = (Math.random() - 0.5) * 2 * this.maxStrength;
            this.ty = CONFIG.fallSpeed * (0.6 + Math.random() * 0.8);
        }
        this.x += (this.tx - this.x) * 0.001;
        this.y += (this.ty - this.y) * 0.001;
    },
};

function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

class Particle {
    constructor() {
        this.reset(true);
    }

    reset(initial = false) {
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : -10;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = CONFIG.fallSpeed * (0.5 + Math.random() * 0.8);
        this.size = CONFIG.minSize + Math.random() * (CONFIG.maxSize - CONFIG.minSize);
        this.alpha = 0.4 + Math.random() * 0.6;
        this.baseVx = this.vx;
        this.baseVy = this.vy;
    }

    update() {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.hypot(dx, dy);

        if (dist < CONFIG.mouseRadius && dist > 0) {
            const force = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius;
            const angle = Math.atan2(dy, dx);
            const direction = attracting ? -1 : 1;
            this.vx += Math.cos(angle) * force * CONFIG.mouseForce * 0.08 * direction;
            this.vy += Math.sin(angle) * force * CONFIG.mouseForce * 0.08 * direction;
        }

        this.vx += (this.baseVx + wind.x - this.vx) * 0.03;
        this.vy += (this.baseVy + wind.y - this.vy) * 0.03;

        particles.forEach(other => {
            if (other === this) return;
            const ox = this.x - other.x;
            const oy = this.y - other.y;
            const distance = Math.hypot(ox, oy);
            if (distance < 28 && distance > 0) {
                const repulse = (1 - distance / 28) * 0.04;
                this.vx += (ox / distance) * repulse;
                this.vy += (oy / distance) * repulse;
            }
        });

        const speed = Math.hypot(this.vx, this.vy);
        if (speed > 4) {
            this.vx = (this.vx / speed) * 4;
            this.vy = (this.vy / speed) * 4;
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < -20) this.x = width + 20;
        if (this.x > width + 20) this.x = -20;
        if (this.y > height + 20) this.reset();
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.particleColor;
        ctx.globalAlpha = this.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

const shockwaves = [];

function burst(x, y) {
    if (attracting) return;
    particles.forEach(p => {
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist < 160 && dist > 0) {
            const force = (1 - dist / 160) * 10;
            const angle = Math.atan2(dy, dx);
            p.vx += Math.cos(angle) * force;
            p.vy += Math.sin(angle) * force;
        }
    });
    shockwaves.push({ x, y, r: 0, alpha: 0.7 });
}

function drawShockwaves() {
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const wave = shockwaves[i];
        wave.r += 4;
        wave.alpha -= 0.018;
        if (wave.alpha <= 0) {
            shockwaves.splice(i, 1);
            continue;
        }
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.r, 0, Math.PI * 2);
        ctx.strokeStyle = '#00ff99';
        ctx.globalAlpha = wave.alpha;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

function drawLines() {
    for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.hypot(dx, dy);
            if (dist < CONFIG.maxDist) {
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = CONFIG.lineColor;
                ctx.globalAlpha = (1 - dist / CONFIG.maxDist) * 0.35;
                ctx.lineWidth = 0.8;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }
}

function drawTrail() {
    if (trail.length < 2) return;
    for (let i = 1; i < trail.length; i += 1) {
        const t = i / trail.length;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.strokeStyle = CONFIG.trailColor;
        ctx.globalAlpha = t * 0.55;
        ctx.lineWidth = t * 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

function init() {
    resizeCanvas();
    particles = Array.from({ length: CONFIG.count }, () => new Particle());
    requestAnimationFrame(loop);
}

function loop() {
    ctx.clearRect(0, 0, width, height);
    wind.update();

    if (mouse.x > 0) {
        trail.push({ x: mouse.x, y: mouse.y });
    }
    if (trail.length > CONFIG.trailLength) {
        trail.shift();
    }

    drawShockwaves();
    drawLines();
    drawTrail();
    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(loop);
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
    trail.length = 0;
});
window.addEventListener('click', e => burst(e.clientX, e.clientY));
window.addEventListener('mousedown', e => {
    attracting = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mouseup', () => {
    attracting = false;
});
window.addEventListener('touchmove', e => {
    e.preventDefault();
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
}, { passive: false });
window.addEventListener('touchstart', e => {
    attracting = true;
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
}, { passive: true });
window.addEventListener('touchend', () => {
    mouse.x = -9999;
    mouse.y = -9999;
    attracting = false;
    trail.length = 0;
});

init();
