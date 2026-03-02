// Math Space Blaster - Educational Math Game
// Hit asteroids with numbers to sum them up to reach the target!

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  pulsePhase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 800;
  private height: number = 600;
  
  // Ship state
  private ship: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    targetAngle: number;
    thrusting: boolean;
    cooldown: number;
  };
  
  // Game state
  private asteroids: Asteroid[] = [];
  private particles: Particle[] = [];
  private stars: Star[] = [];
  private lasers: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  
  private targetNumber: number = 0;
  private currentSum: number = 0;
  private score: number = 0;
  private level: number = 1;
  private lives: number = 3;
  private gameOver: boolean = false;
  private gameWon: boolean = false;
  private lastAsteroidSpawn: number = 0;
  private levelCompleteTime: number = 0;
  
  // Input
  private keys: Set<string> = new Set();
  
  // Touch controls
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchId: number | null = null;
  private joystickActive: boolean = false;
  private shootTouchId: number | null = null;
  
  // Visual constants
  private readonly COLORS = {
    background: '#0a0a1a',
    ship: '#00ffff',
    shipThruster: '#ff6600',
    laser: '#00ff00',
    asteroid: '#8866aa',
    asteroidGlow: '#aa88ff',
    text: '#ffffff',
    textGlow: '#00ffff',
    target: '#ffcc00',
    correct: '#00ff66',
    wrong: '#ff3366',
    star: '#ffffff'
  };

  constructor() {
    this.canvas = document.getElementById('game') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    
    this.ship = {
      x: this.width / 2,
      y: this.height - 100,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      targetAngle: -Math.PI / 2,
      thrusting: false,
      cooldown: 0
    };
    
    this.generateStars();
    this.setNewTarget();
    
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    
    // Touch controls
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    
    this.gameLoop();
  }
  
  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }
  
  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random(),
        twinkleSpeed: Math.random() * 0.05 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }
  
  private setNewTarget(): void {
    const base = 5 + this.level * 3;
    this.targetNumber = Math.floor(Math.random() * base) + base;
    this.currentSum = 0;
    this.asteroids = [];
  }
  
  private spawnAsteroid(): void {
    const value = Math.floor(Math.random() * 9) + 1;
    const side = Math.floor(Math.random() * 3); // 0: top, 1: left, 2: right
    
    let x: number, y: number, vx: number, vy: number;
    const speed = 0.5 + this.level * 0.2;
    
    switch (side) {
      case 0: // top
        x = Math.random() * this.width;
        y = -50;
        vx = (Math.random() - 0.5) * speed;
        vy = Math.random() * speed + 0.3;
        break;
      case 1: // left
        x = -50;
        y = Math.random() * this.height * 0.6;
        vx = Math.random() * speed + 0.3;
        vy = Math.random() * speed * 0.5;
        break;
      default: // right
        x = this.width + 50;
        y = Math.random() * this.height * 0.6;
        vx = -Math.random() * speed - 0.3;
        vy = Math.random() * speed * 0.5;
    }
    
    this.asteroids.push({
      x, y, vx, vy,
      value,
      radius: 25 + value * 3,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.03,
      pulsePhase: Math.random() * Math.PI * 2
    });
  }
  
  private spawnParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color,
        size: Math.random() * 4 + 2
      });
    }
  }
  
  private shoot(): void {
    if (this.ship.cooldown > 0) return;
    
    const laserSpeed = 10;
    this.lasers.push({
      x: this.ship.x + Math.cos(this.ship.angle) * 20,
      y: this.ship.y + Math.sin(this.ship.angle) * 20,
      vx: Math.cos(this.ship.angle) * laserSpeed,
      vy: Math.sin(this.ship.angle) * laserSpeed,
      life: 1
    });
    
    this.ship.cooldown = 15;
    
    // Laser particles
    this.spawnParticles(
      this.ship.x + Math.cos(this.ship.angle) * 25,
      this.ship.y + Math.sin(this.ship.angle) * 25,
      this.COLORS.laser,
      5
    );
  }
  
  private update(): void {
    if (this.gameOver || this.gameWon) {
      if (this.keys.has('Space')) {
        this.restart();
      }
      return;
    }
    
    // Ship controls
    const thrust = 0.15;
    const friction = 0.98;
    const turnSpeed = 0.08;
    
    this.ship.thrusting = this.keys.has('ArrowUp') || this.keys.has('KeyW');
    
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      this.ship.targetAngle -= turnSpeed;
    }
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      this.ship.targetAngle += turnSpeed;
    }
    
    // Smooth rotation
    let angleDiff = this.ship.targetAngle - this.ship.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.ship.angle += angleDiff * 0.15;
    
    if (this.ship.thrusting) {
      this.ship.vx += Math.cos(this.ship.angle) * thrust;
      this.ship.vy += Math.sin(this.ship.angle) * thrust;
      
      // Thruster particles
      if (Math.random() > 0.3) {
        const backAngle = this.ship.angle + Math.PI;
        this.particles.push({
          x: this.ship.x + Math.cos(backAngle) * 15 + (Math.random() - 0.5) * 8,
          y: this.ship.y + Math.sin(backAngle) * 15 + (Math.random() - 0.5) * 8,
          vx: Math.cos(backAngle) * 3 + (Math.random() - 0.5),
          vy: Math.sin(backAngle) * 3 + (Math.random() - 0.5),
          life: 1,
          maxLife: 1,
          color: Math.random() > 0.5 ? this.COLORS.shipThruster : '#ffff00',
          size: Math.random() * 6 + 3
        });
      }
    }
    
    this.ship.vx *= friction;
    this.ship.vy *= friction;
    this.ship.x += this.ship.vx;
    this.ship.y += this.ship.vy;
    
    // Screen wrap
    if (this.ship.x < 0) this.ship.x = this.width;
    if (this.ship.x > this.width) this.ship.x = 0;
    if (this.ship.y < 0) this.ship.y = this.height;
    if (this.ship.y > this.height) this.ship.y = 0;
    
    // Shooting
    if (this.ship.cooldown > 0) this.ship.cooldown--;
    if (this.keys.has('Space')) {
      this.shoot();
    }
    
    // Update lasers
    this.lasers = this.lasers.filter(laser => {
      laser.x += laser.vx;
      laser.y += laser.vy;
      laser.life -= 0.02;
      return laser.life > 0 && laser.x > 0 && laser.x < this.width && laser.y > 0 && laser.y < this.height;
    });
    
    // Spawn asteroids
    const now = Date.now();
    const spawnInterval = Math.max(400, 1500 - this.level * 100);
    if (now - this.lastAsteroidSpawn > spawnInterval && this.asteroids.length < 15 + this.level * 3) {
      // Spawn 2-3 asteroids at a time for more action
      const asteroidsToSpawn = Math.min(3, 1 + Math.floor(this.level / 3));
      for (let i = 0; i < asteroidsToSpawn; i++) {
        this.spawnAsteroid();
      }
      this.lastAsteroidSpawn = now;
    }
    
    // Update asteroids
    this.asteroids = this.asteroids.filter(asteroid => {
      asteroid.x += asteroid.vx;
      asteroid.y += asteroid.vy;
      asteroid.rotation += asteroid.rotationSpeed;
      asteroid.pulsePhase += 0.05;
      
      // Check if asteroid escaped
      if (asteroid.y > this.height + 100) {
        return false;
      }
      
      // Check laser collision
      for (const laser of this.lasers) {
        const dx = laser.x - asteroid.x;
        const dy = laser.y - asteroid.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < asteroid.radius) {
          // Hit!
          this.lasers = this.lasers.filter(l => l !== laser);
          
          const newSum = this.currentSum + asteroid.value;
          
          if (newSum <= this.targetNumber) {
            // Correct hit
            this.currentSum = newSum;
            this.score += asteroid.value * 10;
            this.spawnParticles(asteroid.x, asteroid.y, this.COLORS.correct, 20);
            
            if (this.currentSum === this.targetNumber) {
              // Level complete!
              this.level++;
              this.score += 100 * this.level;
              this.spawnParticles(asteroid.x, asteroid.y, this.COLORS.target, 50);
              this.setNewTarget();
              this.levelCompleteTime = now;
            }
          } else {
            // Wrong! Penalty
            this.score = Math.max(0, this.score - asteroid.value * 5);
            this.lives--;
            this.spawnParticles(asteroid.x, asteroid.y, this.COLORS.wrong, 15);
            
            if (this.lives <= 0) {
              this.gameOver = true;
            }
          }
          
          return false;
        }
      }
      
      // Check ship collision
      const dx = this.ship.x - asteroid.x;
      const dy = this.ship.y - asteroid.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < asteroid.radius + 15) {
        this.lives--;
        this.score = Math.max(0, this.score - 50);
        this.spawnParticles(asteroid.x, asteroid.y, this.COLORS.wrong, 30);
        this.spawnParticles(this.ship.x, this.ship.y, this.COLORS.ship, 20);
        
        if (this.lives <= 0) {
          this.gameOver = true;
        }
        
        return false;
      }
      
      return true;
    });
    
    // Update particles
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= 0.02;
      return p.life > 0;
    });
    
    // Update stars
    this.stars.forEach(star => {
      star.twinklePhase += star.twinkleSpeed;
    });
  }
  
  private draw(): void {
    // Clear with background
    this.ctx.fillStyle = this.COLORS.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw stars
    this.stars.forEach(star => {
      const brightness = 0.3 + star.brightness * 0.5 + Math.sin(star.twinklePhase) * 0.2;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    
    // Draw asteroids
    this.asteroids.forEach(asteroid => {
      this.ctx.save();
      this.ctx.translate(asteroid.x, asteroid.y);
      this.ctx.rotate(asteroid.rotation);
      
      // Glow
      const pulse = 1 + Math.sin(asteroid.pulsePhase) * 0.1;
      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, asteroid.radius * 1.5);
      gradient.addColorStop(0, 'rgba(170, 136, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(170, 136, 255, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, asteroid.radius * 1.5 * pulse, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Main body
      this.ctx.fillStyle = this.COLORS.asteroid;
      this.ctx.strokeStyle = this.COLORS.asteroidGlow;
      this.ctx.lineWidth = 3;
      
      // Draw rocky shape
      this.ctx.beginPath();
      const points = 7;
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const variance = 0.7 + Math.sin(i * 3.7) * 0.3;
        const r = asteroid.radius * variance * pulse;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      // Number
      this.ctx.rotate(-asteroid.rotation);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `bold ${asteroid.radius * 0.8}px "Orbitron", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.shadowColor = this.COLORS.textGlow;
      this.ctx.shadowBlur = 10;
      this.ctx.fillText(asteroid.value.toString(), 0, 0);
      this.ctx.shadowBlur = 0;
      
      this.ctx.restore();
    });
    
    // Draw lasers
    this.lasers.forEach(laser => {
      const gradient = this.ctx.createLinearGradient(
        laser.x, laser.y,
        laser.x - laser.vx * 3, laser.y - laser.vy * 3
      );
      gradient.addColorStop(0, this.COLORS.laser);
      gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
      
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(laser.x, laser.y);
      this.ctx.lineTo(laser.x - laser.vx * 3, laser.y - laser.vy * 3);
      this.ctx.stroke();
      
      // Glow
      this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
      this.ctx.lineWidth = 8;
      this.ctx.beginPath();
      this.ctx.moveTo(laser.x, laser.y);
      this.ctx.lineTo(laser.x - laser.vx * 3, laser.y - laser.vy * 3);
      this.ctx.stroke();
    });
    
    // Draw particles
    this.particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = alpha;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
    
    // Draw ship
    if (!this.gameOver) {
      this.ctx.save();
      this.ctx.translate(this.ship.x, this.ship.y);
      this.ctx.rotate(this.ship.angle);
      
      // Ship glow
      const glowGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
      glowGradient.addColorStop(0, 'rgba(0, 255, 255, 0.2)');
      glowGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
      this.ctx.fillStyle = glowGradient;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 40, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Ship body
      this.ctx.fillStyle = this.COLORS.ship;
      this.ctx.beginPath();
      this.ctx.moveTo(20, 0);
      this.ctx.lineTo(-15, -12);
      this.ctx.lineTo(-10, 0);
      this.ctx.lineTo(-15, 12);
      this.ctx.closePath();
      this.ctx.fill();
      
      // Cockpit
      this.ctx.fillStyle = '#003333';
      this.ctx.beginPath();
      this.ctx.ellipse(5, 0, 6, 4, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    }
    
    // Draw UI
    this.drawUI();
    
    // Draw touch controls
    this.drawTouchControls();
  }
  
  private drawUI(): void {
    // HUD background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(10, 10, 250, 120);
    this.ctx.strokeStyle = this.COLORS.ship;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(10, 10, 250, 120);
    
    // Target number
    this.ctx.font = 'bold 16px "Orbitron", sans-serif';
    this.ctx.fillStyle = this.COLORS.target;
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`TARGET: ${this.targetNumber}`, 25, 35);
    
    // Current sum
    const sumColor = this.currentSum === this.targetNumber ? this.COLORS.correct : 
                     this.currentSum > this.targetNumber ? this.COLORS.wrong : this.COLORS.ship;
    this.ctx.fillStyle = sumColor;
    this.ctx.font = 'bold 28px "Orbitron", sans-serif';
    this.ctx.fillText(`${this.currentSum}`, 25, 70);
    
    // Score
    this.ctx.fillStyle = this.COLORS.text;
    this.ctx.font = '16px "Orbitron", sans-serif';
    this.ctx.fillText(`SCORE: ${this.score}`, 25, 95);
    
    // Level
    this.ctx.fillStyle = this.COLORS.asteroidGlow;
    this.ctx.fillText(`LEVEL: ${this.level}`, 150, 35);
    
    // Lives
    this.ctx.fillStyle = this.COLORS.wrong;
    this.ctx.fillText(`LIVES: ${'♥'.repeat(this.lives)}`, 150, 60);
    
    // Instructions
    if (this.level === 1 && this.score === 0) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.font = '14px "Orbitron", sans-serif';
      this.ctx.textAlign = 'center';
      const isTouch = 'ontouchstart' in window;
      if (isTouch) {
        this.ctx.fillText('Left: joystick to move | Right: tap to shoot', this.width / 2, this.height - 30);
      } else {
        this.ctx.fillText('Arrow Keys/WASD to move | SPACE to shoot', this.width / 2, this.height - 30);
      }
    }
    
    // Game Over
    if (this.gameOver) {
      this.drawOverlay('GAME OVER', `Final Score: ${this.score}`, 'Press SPACE to restart');
    }
    
    // Level complete flash
    if (this.levelCompleteTime && Date.now() - this.levelCompleteTime < 1500) {
      const flash = Math.sin((Date.now() - this.levelCompleteTime) / 100) * 0.5 + 0.5;
      this.ctx.fillStyle = `rgba(255, 204, 0, ${flash * 0.3})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      
      this.ctx.fillStyle = this.COLORS.target;
      this.ctx.font = 'bold 48px "Orbitron", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = this.COLORS.target;
      this.ctx.shadowBlur = 20;
      this.ctx.fillText(`LEVEL ${this.level - 1} COMPLETE!`, this.width / 2, this.height / 2);
      this.ctx.shadowBlur = 0;
    }
  }
  
  private drawOverlay(title: string, subtitle: string, hint: string): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.textAlign = 'center';
    
    this.ctx.fillStyle = this.COLORS.wrong;
    this.ctx.font = 'bold 64px "Orbitron", sans-serif';
    this.ctx.shadowColor = this.COLORS.wrong;
    this.ctx.shadowBlur = 20;
    this.ctx.fillText(title, this.width / 2, this.height / 2 - 40);
    this.ctx.shadowBlur = 0;
    
    this.ctx.fillStyle = this.COLORS.text;
    this.ctx.font = '24px "Orbitron", sans-serif';
    this.ctx.fillText(subtitle, this.width / 2, this.height / 2 + 20);
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.font = '16px "Orbitron", sans-serif';
    this.ctx.fillText(hint, this.width / 2, this.height / 2 + 80);
  }
  
  private restart(): void {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.gameOver = false;
    this.gameWon = false;
    this.ship.x = this.width / 2;
    this.ship.y = this.height - 100;
    this.ship.vx = 0;
    this.ship.vy = 0;
    this.ship.angle = -Math.PI / 2;
    this.ship.targetAngle = -Math.PI / 2;
    this.asteroids = [];
    this.lasers = [];
    this.particles = [];
    this.setNewTarget();
  }
  
  // Touch control methods
  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Left half = joystick for movement
      if (x < this.width / 2 && this.touchId === null) {
        this.touchId = touch.identifier;
        this.touchStartX = x;
        this.touchStartY = y;
        this.joystickActive = true;
      } else if (x >= this.width / 2 && this.shootTouchId === null) {
        // Right half = shoot
        this.shootTouchId = touch.identifier;
        this.keys.add('Space');
      }
    }
  }
  
  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.touchId) {
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // Calculate joystick delta
        const dx = x - this.touchStartX;
        const dy = y - this.touchStartY;
        
        // Update ship angle based on joystick position
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) {
          this.ship.targetAngle = Math.atan2(dy, dx);
        }
        
        // Set thrusting if joystick is pushed far enough
        this.ship.thrusting = dist > 20;
      }
    }
  }
  
  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.touchId) {
        this.touchId = null;
        this.joystickActive = false;
        this.ship.thrusting = false;
      }
      if (touch.identifier === this.shootTouchId) {
        this.shootTouchId = null;
        this.keys.delete('Space');
      }
    }
  }
  
  private drawTouchControls(): void {
    if (!('ontouchstart' in window)) return;
    
    // Draw joystick on left side
    const joystickX = 80;
    const joystickY = this.height - 120;
    const maxRadius = 50;
    
    // Base circle
    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(joystickX, joystickY, maxRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Stick position
    let stickX = joystickX;
    let stickY = joystickY;
    
    if (this.joystickActive) {
      const angle = this.ship.targetAngle;
      const thrust = this.ship.thrusting ? 0.7 : 0.3;
      stickX = joystickX + Math.cos(angle) * maxRadius * thrust;
      stickY = joystickY + Math.sin(angle) * maxRadius * thrust;
    }
    
    // Stick
    this.ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
    this.ctx.beginPath();
    this.ctx.arc(stickX, stickY, 20, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Shoot zone indicator on right
    this.ctx.strokeStyle = 'rgba(255, 0, 100, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 10]);
    this.ctx.beginPath();
    this.ctx.arc(this.width - 80, this.height - 120, 40, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    
    // Shoot label
    this.ctx.fillStyle = 'rgba(255, 0, 100, 0.5)';
    this.ctx.font = '14px "Orbitron", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('TAP', this.width - 80, this.height - 115);
  }
  
  private gameLoop = (): void => {
    this.update();
    this.draw();
    requestAnimationFrame(this.gameLoop);
  };
}

// Start game when loaded
window.addEventListener('load', () => {
  new Game();
});
