// Game variables
let score = 0;
let gameActive = true;
let gamePaused = false;
let asteroids = [];
let bullets = [];
let lastAsteroidTime = 0;
let lastBulletTime = 0;
let bulletInterval = 300;
let asteroidInterval = 1500;
let explosionParticles = [];
let engineParticles = [];
let touchStartX = null;
let touchStartY = null;

// Initialize Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    60, 
    window.innerWidth / window.innerHeight, 
    0.1, 
    1000
);
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('game-container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Add point light to simulate engine glow
const engineLight = new THREE.PointLight(0x00aaff, 1, 10);
engineLight.position.set(0, 0, 1);
scene.add(engineLight);

// Create realistic spaceship (same as before)
function createSpaceship() {
    const shipGroup = new THREE.Group();
    
    // Main body (fuselage)
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.5, 1.5, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x3a5fcd,
        metalness: 0.7,
        roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    shipGroup.add(body);
    
    // Cockpit
    const cockpitGeometry = new THREE.SphereGeometry(0.4, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMaterial = new THREE.MeshPhongMaterial({
        color: 0x7ec0ee,
        transparent: true,
        opacity: 0.7,
        metalness: 0.9,
        roughness: 0.1
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.z = 0.5;
    cockpit.rotation.x = Math.PI / 2;
    shipGroup.add(cockpit);
    
    // Wings
    const wingGeometry = new THREE.BoxGeometry(1.2, 0.1, 0.5);
    const wingMaterial = new THREE.MeshPhongMaterial({ color: 0x2a4e9a });
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-0.7, 0, 0);
    rightWing.position.set(0.7, 0, 0);
    leftWing.castShadow = true;
    rightWing.castShadow = true;
    shipGroup.add(leftWing);
    shipGroup.add(rightWing);
    
    // Engine nozzles
    const nozzleGeometry = new THREE.CylinderGeometry(0.1, 0.2, 0.3, 32);
    const nozzleMaterial = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const leftNozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    const rightNozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    leftNozzle.position.set(-0.3, 0, -0.8);
    rightNozzle.position.set(0.3, 0, -0.8);
    leftNozzle.rotation.x = Math.PI / 2;
    rightNozzle.rotation.x = Math.PI / 2;
    shipGroup.add(leftNozzle);
    shipGroup.add(rightNozzle);
    
    // Position the ship
    shipGroup.position.z = -5;
    shipGroup.rotation.x = Math.PI / 2;
    
    return shipGroup;
}

const ship = createSpaceship();
scene.add(ship);

// Create engine particles (same as before)
function createEngineParticles() {
    const particles = new THREE.Group();
    const particleCount = 30;
    const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    
    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        particle.position.x = (Math.random() - 0.5) * 0.4;
        particle.position.y = 0;
        particle.position.z = -1 - Math.random() * 0.5;
        
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02,
            -Math.random() * 0.1 - 0.1
        );
        
        particle.lifespan = Math.random() * 30 + 20;
        
        particles.add(particle);
        engineParticles.push(particle);
    }
    
    ship.add(particles);
    return particles;
}

// Create explosion effect (same as before)
function createExplosion(position) {
    const explosion = new THREE.Group();
    const particleCount = 100;
    const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    
    for (let i = 0; i < particleCount; i++) {
        const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: new THREE.Color(
                Math.random() * 0.5 + 0.5,
                Math.random() * 0.3,
                0
            )
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        particle.position.copy(position);
        
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
        );
        
        particle.lifespan = Math.random() * 50 + 30;
        
        explosion.add(particle);
        explosionParticles.push(particle);
    }
    
    scene.add(explosion);
    return explosion;
}

// Create stars background (same as before)
function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.8
    });

    const starsVertices = [];
    for (let i = 0; i < 2000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
    return stars;
}

const stars = createStarfield();

// Set camera position and follow ship
camera.position.set(0, 3, 5);
camera.lookAt(0, 0, -5);

// Handle window resize
function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Adjust mobile controls for landscape/portrait
    const mobileControls = document.getElementById('mobile-controls');
    const fireBtn = document.getElementById('fire-btn');
    
    if (window.innerHeight > window.innerWidth) {
        // Portrait
        mobileControls.style.bottom = '20px';
        mobileControls.style.flexDirection = 'row';
        mobileControls.style.justifyContent = 'space-between';
        fireBtn.style.right = '20px';
        fireBtn.style.top = '50%';
        fireBtn.style.transform = 'translateY(-50%)';
    } else {
        // Landscape
        mobileControls.style.bottom = '10px';
        mobileControls.style.flexDirection = 'column';
        mobileControls.style.justifyContent = 'center';
        mobileControls.style.left = '10px';
        fireBtn.style.right = '10px';
        fireBtn.style.top = '10px';
        fireBtn.style.transform = 'none';
    }
}

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);

// Keyboard controls
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false
};

// Touch controls
let touchControls = {
    left: false,
    right: false,
    up: false,
    down: false,
    fire: false
};

// Setup mobile controls
function setupMobileControls() {
    // Movement buttons
    document.getElementById('left-btn').addEventListener('touchstart', (e) => {
        touchControls.left = true;
        e.preventDefault();
    });
    document.getElementById('left-btn').addEventListener('touchend', (e) => {
        touchControls.left = false;
        e.preventDefault();
    });
    
    document.getElementById('right-btn').addEventListener('touchstart', (e) => {
        touchControls.right = true;
        e.preventDefault();
    });
    document.getElementById('right-btn').addEventListener('touchend', (e) => {
        touchControls.right = false;
        e.preventDefault();
    });
    
    document.getElementById('up-btn').addEventListener('touchstart', (e) => {
        touchControls.up = true;
        e.preventDefault();
    });
    document.getElementById('up-btn').addEventListener('touchend', (e) => {
        touchControls.up = false;
        e.preventDefault();
    });
    
    document.getElementById('down-btn').addEventListener('touchstart', (e) => {
        touchControls.down = true;
        e.preventDefault();
    });
    document.getElementById('down-btn').addEventListener('touchend', (e) => {
        touchControls.down = false;
        e.preventDefault();
    });
    
    // Fire button
    document.getElementById('fire-btn').addEventListener('touchstart', (e) => {
        touchControls.fire = true;
        e.preventDefault();
    });
    document.getElementById('fire-btn').addEventListener('touchend', (e) => {
        touchControls.fire = false;
        e.preventDefault();
    });
    
    // Touch movement (for swipe controls)
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!touchStartX || !touchStartY) return;
        
        const touchEndX = e.touches[0].clientX;
        const touchEndY = e.touches[0].clientY;
        
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;
        
        // Left/Right movement
        if (Math.abs(diffX) > Math.abs(diffY)) {
            touchControls.left = diffX > 0;
            touchControls.right = diffX < 0;
            touchControls.up = false;
            touchControls.down = false;
        } 
        // Up/Down movement
        else {
            touchControls.up = diffY > 0;
            touchControls.down = diffY < 0;
            touchControls.left = false;
            touchControls.right = false;
        }
    });
    
    document.addEventListener('touchend', () => {
        touchControls.left = false;
        touchControls.right = false;
        touchControls.up = false;
        touchControls.down = false;
        touchStartX = null;
        touchStartY = null;
    });
}

setupMobileControls();

// Keyboard controls (same as before)
window.addEventListener('keydown', (e) => {
    if (e.code in keys) {
        keys[e.code] = true;
        e.preventDefault();
    }
    
    if (e.code === 'Escape') {
        gamePaused = !gamePaused;
        document.getElementById('game-over').style.display = gamePaused ? 'block' : 'none';
        document.getElementById('game-over').innerHTML = gamePaused ? 
            '<h2>Game Paused</h2><button id="restart-btn">Resume</button>' : 
            '<h2>Mission Failed!</h2>Your Score: <span id="final-score">0</span><br><button id="restart-btn">Launch Again</button>';
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code in keys) {
        keys[e.code] = false;
        e.preventDefault();
    }
});

// Restart button
document.getElementById('restart-btn').addEventListener('click', resetGame);

// Create asteroid (same as before)
function createAsteroid() {
    const size = Math.random() * 0.5 + 0.5;
    const geometry = new THREE.IcosahedronGeometry(size, 1);
    
    const positionAttribute = geometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);
        vertex.x += (Math.random() - 0.5) * size * 0.3;
        vertex.y += (Math.random() - 0.5) * size * 0.3;
        vertex.z += (Math.random() - 0.5) * size * 0.3;
        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geometry.computeBoundingSphere();
    
    const material = new THREE.MeshPhongMaterial({ 
        color: 0x8b4513,
        flatShading: true,
        bumpScale: 0.05,
        specular: 0x111111,
        shininess: 30
    });
    
    const asteroid = new THREE.Mesh(geometry, material);
    
    asteroid.position.x = (Math.random() - 0.5) * 15;
    asteroid.position.y = (Math.random() - 0.5) * 10;
    asteroid.position.z = -30;
    
    asteroid.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        Math.random() * 0.05 + 0.05
    );
    
    asteroid.rotationSpeed = new THREE.Vector3(
        Math.random() * 0.02,
        Math.random() * 0.02,
        Math.random() * 0.02
    );
    
    asteroid.castShadow = true;
    scene.add(asteroid);
    asteroids.push(asteroid);
    return asteroid;
}

// Create laser bullet (same as before)
function createBullet() {
    const geometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xff0000,
        emissive: 0xff3333,
        emissiveIntensity: 0.8
    });
    const bullet = new THREE.Mesh(geometry, material);
    bullet.rotation.x = Math.PI / 2;
    
    bullet.position.copy(ship.position);
    bullet.position.z -= 0.5;
    
    bullet.velocity = new THREE.Vector3(0, 0, -0.3);
    
    scene.add(bullet);
    bullets.push(bullet);
    
    const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        transparent: true,
        opacity: 0.8
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(bullet.position);
    scene.add(flash);
    
    setTimeout(() => {
        if (flash.parent) {
            scene.remove(flash);
        }
    }, 50);
    
    return bullet;
}

// Check collisions (same as before)
function checkCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet) continue;
        
        for (let j = asteroids.length - 1; j >= 0; j--) {
            const asteroid = asteroids[j];
            if (!asteroid || !asteroid.geometry || !asteroid.geometry.boundingSphere) continue;
            
            if (bullet.position.distanceTo(asteroid.position) < 
                asteroid.geometry.boundingSphere.radius + 0.3) {
                createExplosion(asteroid.position);
                
                scene.remove(bullet);
                scene.remove(asteroid);
                bullets.splice(i, 1);
                asteroids.splice(j, 1);
                
                score += 10;
                document.getElementById('score-display').textContent = `Score: ${score}`;
                
                break;
            }
        }
    }
    
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        if (!asteroid || !asteroid.geometry || !asteroid.geometry.boundingSphere) continue;
        
        if (ship.position.distanceTo(asteroid.position) < 
            asteroid.geometry.boundingSphere.radius + 0.8) {
            createExplosion(ship.position);
            gameOver();
            break;
        }
    }
}

// Game over function (same as before)
function gameOver() {
    gameActive = false;
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over').style.display = 'block';
}

// Reset game function (same as before)
function resetGame() {
    asteroids.forEach(asteroid => {
        if (asteroid && asteroid.parent) {
            scene.remove(asteroid);
        }
    });
    bullets.forEach(bullet => {
        if (bullet && bullet.parent) {
            scene.remove(bullet);
        }
    });
    asteroids = [];
    bullets = [];
    
    explosionParticles.forEach(particle => {
        if (particle && particle.parent) {
            scene.remove(particle);
        }
    });
    explosionParticles = [];
    
    engineParticles.forEach(particle => {
        if (particle && particle.parent) {
            particle.parent.remove(particle);
        }
    });
    engineParticles = [];
    
    score = 0;
    document.getElementById('score-display').textContent = `Score: ${score}`;
    document.getElementById('game-over').style.display = 'none';
    
    ship.position.x = 0;
    ship.position.y = 0;
    
    gameActive = true;
    gamePaused = false;
    lastAsteroidTime = Date.now();
    lastBulletTime = Date.now();
    asteroidInterval = 1500;
}

// Animation loop with mobile controls
function animate() {
    requestAnimationFrame(animate);
    
    if (gamePaused) return;
    
    stars.rotation.x += 0.0001;
    stars.rotation.y += 0.0001;
    
    camera.position.x += (ship.position.x - camera.position.x) * 0.05;
    camera.position.y += (ship.position.y + 3 - camera.position.y) * 0.05;
    camera.lookAt(ship.position.x, ship.position.y, ship.position.z);
    
    if (gameActive) {
        // Ship movement - combine keyboard and touch controls
        const moveLeft = keys.ArrowLeft || touchControls.left;
        const moveRight = keys.ArrowRight || touchControls.right;
        const moveUp = keys.ArrowUp || touchControls.up;
        const moveDown = keys.ArrowDown || touchControls.down;
        
        if (moveLeft && ship.position.x > -8) {
            ship.position.x -= 0.15;
            ship.rotation.z = Math.PI / 16;
        } else if (moveRight && ship.position.x < 8) {
            ship.position.x += 0.15;
            ship.rotation.z = -Math.PI / 16;
        } else {
            ship.rotation.z *= 0.9;
        }
        
        if (moveUp && ship.position.y < 5) {
            ship.position.y += 0.1;
        }
        if (moveDown && ship.position.y > -5) {
            ship.position.y -= 0.1;
        }
        
        // Shooting - combine keyboard and touch controls
        const currentTime = Date.now();
        if ((keys.Space || touchControls.fire) && currentTime - lastBulletTime > bulletInterval) {
            createBullet();
            lastBulletTime = currentTime;
            touchControls.fire = false; // Prevent continuous firing on mobile
        }
        
        if (Math.random() < 0.3) {
            createEngineParticles();
        }
        
        // Update particles, asteroids, bullets (same as before)
        for (let i = engineParticles.length - 1; i >= 0; i--) {
            const particle = engineParticles[i];
            if (!particle) continue;
            
            particle.position.x += particle.velocity.x;
            particle.position.y += particle.velocity.y;
            particle.position.z += particle.velocity.z;
            particle.lifespan--;
            
            if (particle.material instanceof THREE.MeshBasicMaterial) {
                particle.material.opacity = particle.lifespan / 50;
            }
            
            if (particle.lifespan <= 0 && particle.parent) {
                particle.parent.remove(particle);
                engineParticles.splice(i, 1);
            }
        }
        
        const currentAsteroidTime = Date.now();
        if (currentAsteroidTime - lastAsteroidTime > asteroidInterval) {
            createAsteroid();
            lastAsteroidTime = currentAsteroidTime;
            asteroidInterval = Math.max(500, asteroidInterval - 10);
        }
        
        for (let i = asteroids.length - 1; i >= 0; i--) {
            const asteroid = asteroids[i];
            if (!asteroid) continue;
            
            asteroid.position.x += asteroid.velocity.x;
            asteroid.position.y += asteroid.velocity.y;
            asteroid.position.z += asteroid.velocity.z;
            asteroid.rotation.x += asteroid.rotationSpeed.x;
            asteroid.rotation.y += asteroid.rotationSpeed.y;
            asteroid.rotation.z += asteroid.rotationSpeed.z;
            
            if (asteroid.position.z > 5 && asteroid.parent) {
                scene.remove(asteroid);
                asteroids.splice(i, 1);
            }
        }
        
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (!bullet) continue;
            
            bullet.position.x += bullet.velocity.x;
            bullet.position.y += bullet.velocity.y;
            bullet.position.z += bullet.velocity.z;
            
            if (bullet.position.z < -30 && bullet.parent) {
                scene.remove(bullet);
                bullets.splice(i, 1);
            }
        }
        
        for (let i = explosionParticles.length - 1; i >= 0; i--) {
            const particle = explosionParticles[i];
            if (!particle) continue;
            
            particle.position.x += particle.velocity.x;
            particle.position.y += particle.velocity.y;
            particle.position.z += particle.velocity.z;
            particle.lifespan--;
            
            if (particle.material instanceof THREE.MeshBasicMaterial) {
                particle.material.opacity = particle.lifespan / 80;
            }
            
            if (particle.lifespan <= 0 && particle.parent) {
                particle.parent.remove(particle);
                explosionParticles.splice(i, 1);
            }
        }
        
        checkCollisions();
    }
    
    renderer.render(scene, camera);
}

// Start the game
handleResize(); // Initialize responsive layout
resetGame();
animate();