import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './style.css';

// Game state
let gameState = {
    isPlaying: false,
    score: 0,
    speed: 0.3,
    buhioX: 0,
    buhioY: 0,
    velocityY: 0,
    isJumping: false,
    obstacles: [],
    obstacleModels: [] // 3D models for obstacles
};

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 100);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 15);
camera.lookAt(0, 2, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('game-container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Ground
const groundGeometry = new THREE.PlaneGeometry(100, 1000);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x7CFC00,
    roughness: 0.8
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.z = -450;
ground.receiveShadow = true;
scene.add(ground);

// Road lanes (3 lanes)
const laneWidth = 3;
const lanes = [-laneWidth, 0, laneWidth];

// Road
const roadGeometry = new THREE.PlaneGeometry(12, 1000);
const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.01;
road.position.z = -450;
scene.add(road);

// Lane markers
for (let i = -1.5; i <= 1.5; i += 1.5) {
    if (i !== 0) {
        for (let z = 0; z > -1000; z -= 5) {
            const marker = new THREE.Mesh(
                new THREE.PlaneGeometry(0.2, 2),
                new THREE.MeshStandardMaterial({ color: 0xffffff })
            );
            marker.rotation.x = -Math.PI / 2;
            marker.position.set(i, 0.02, z);
            scene.add(marker);
        }
    }
}

// BGM
const bgm = new Audio('/bgm.mp3');
bgm.loop = true;
bgm.volume = 0.3;

// Buhio (3D model)
let buhio;
const loader = new GLTFLoader();
loader.load('/buhio-3d.glb', (gltf) => {
    buhio = gltf.scene;
    buhio.scale.set(3.0, 3.0, 3.0);
    buhio.position.set(0, 0, 0);
    buhio.rotation.y = Math.PI;
    buhio.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
        }
    });
    scene.add(buhio);
}, undefined, (error) => {
    console.error('Error loading model:', error);
    // Fallback to placeholder
    const buhioGeometry = new THREE.BoxGeometry(1.5, 2.5, 1);
    const buhioMaterial = new THREE.MeshStandardMaterial({ color: 0xFFB6C1 });
    buhio = new THREE.Mesh(buhioGeometry, buhioMaterial);
    buhio.position.set(0, 1.25, 0);
    buhio.castShadow = true;
    scene.add(buhio);
});

// Load obstacle models
const obstacleUrls = ['/obstacle1.glb', '/obstacle2.glb', '/obstacle3.glb'];
const loader2 = new GLTFLoader();
obstacleUrls.forEach((url, index) => {
    loader2.load(url, (gltf) => {
        const model = gltf.scene;
        model.scale.set(3.0, 3.0, 3.0);
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
            }
        });
        gameState.obstacleModels[index] = model;
    }, undefined, (error) => {
        console.error(`Error loading obstacle ${index}:`, error);
    });
});

// Obstacle creation
function createObstacle() {
    const lane = lanes[Math.floor(Math.random() * 3)];
    const modelIndex = Math.floor(Math.random() * 3);
    
    let obstacle;
    
    // Use loaded 3D model or fallback
    if (gameState.obstacleModels[modelIndex]) {
        obstacle = gameState.obstacleModels[modelIndex].clone();
        obstacle.position.y = 1.5;
    } else {
        // Fallback to simple geometry
        obstacle = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 1.5, 1.5),
            new THREE.MeshStandardMaterial({ color: 0xff4444 })
        );
        obstacle.position.y = 0.75;
    }
    
    obstacle.position.x = lane;
    obstacle.position.z = -80;
    
    // Randomly decide if obstacle moves left-right
    obstacle.userData.moving = Math.random() > 0.5;
    obstacle.userData.moveSpeed = 0.05;
    obstacle.userData.moveDirection = Math.random() > 0.5 ? 1 : -1;
    
    scene.add(obstacle);
    gameState.obstacles.push(obstacle);
}

// Input handling
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' && !gameState.isJumping && gameState.isPlaying) {
        gameState.velocityY = 0.4;
        gameState.isJumping = true;
    }
});
window.addEventListener('keyup', (e) => keys[e.code] = false);

// Start button
document.getElementById('start-btn').addEventListener('click', startGame);

function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    gameState.isPlaying = true;
    gameState.score = 0;
    gameState.speed = 0.3;
    gameState.buhioX = 0;
    gameState.buhioY = 0;
    gameState.velocityY = 0;
    
    gameState.obstacles.forEach(o => scene.remove(o));
    gameState.obstacles = [];
    
    document.getElementById('game-over').style.display = 'none';
    
    // Start BGM
    bgm.currentTime = 0;
    bgm.play().catch(e => console.log('BGM play failed:', e));
}

function gameOver() {
    gameState.isPlaying = false;
    bgm.pause();
    document.getElementById('game-over').style.display = 'block';
    document.getElementById('start-screen').style.display = 'block';
    document.getElementById('start-screen').querySelector('p').textContent = 
        '最終スコア: ' + gameState.score;
}

// Collision detection
function checkCollision() {
    const buhioBox = new THREE.Box3().setFromObject(buhio);
    
    for (const obstacle of gameState.obstacles) {
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);
        if (buhioBox.intersectsBox(obstacleBox)) {
            return true;
        }
    }
    return false;
}

// Animation loop
let lastObstacleTime = 0;

function animate(time) {
    requestAnimationFrame(animate);
    
    if (gameState.isPlaying) {
        // Horizontal movement
        if (keys['ArrowLeft'] || keys['KeyA']) {
            gameState.buhioX = Math.max(gameState.buhioX - 0.15, -laneWidth);
        }
        if (keys['ArrowRight'] || keys['KeyD']) {
            gameState.buhioX = Math.min(gameState.buhioX + 0.15, laneWidth);
        }
        
        // Jump physics
        if (gameState.isJumping) {
            gameState.velocityY -= 0.02;
            gameState.buhioY += gameState.velocityY;
            
            if (gameState.buhioY <= 0) {
                gameState.buhioY = 0;
                gameState.isJumping = false;
                gameState.velocityY = 0;
            }
        }
        
        // Update Buhio position
        buhio.position.x = gameState.buhioX;
        buhio.position.y = gameState.buhioY + 1;
        
        // Running animation
        buhio.rotation.z = Math.sin(time * 0.01) * 0.1;
        
        // Move obstacles
        for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
            const obstacle = gameState.obstacles[i];
            obstacle.position.z += gameState.speed;
            
            // Move left-right if obstacle is moving type
            if (obstacle.userData.moving) {
                obstacle.position.x += obstacle.userData.moveSpeed * obstacle.userData.moveDirection;
                
                // Reverse direction at lane boundaries
                if (Math.abs(obstacle.position.x) > laneWidth) {
                    obstacle.userData.moveDirection *= -1;
                }
            }
            
            if (obstacle.position.z > 5) {
                scene.remove(obstacle);
                gameState.obstacles.splice(i, 1);
                gameState.score += 10;
            }
        }
        
        // Spawn new obstacles
        if (time - lastObstacleTime > 1500) {
            createObstacle();
            lastObstacleTime = time;
        }
        
        // Increase difficulty
        gameState.speed = Math.min(0.3 + gameState.score * 0.0001, 0.8);
        
        // Update score display
        document.getElementById('score').textContent = 'スコア: ' + gameState.score;
        
        // Check collision
        if (checkCollision()) {
            gameOver();
        }
    }
    
    renderer.render(scene, camera);
}

animate(0);

// Handle resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
