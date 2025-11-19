import * as THREE from 'three';
import { createWorld, updateWorld } from './world.js';
import { createRobot, updateRobot } from './robot.js';
import { checkInteractions } from './interaction.js';

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky Blue
scene.fog = new THREE.Fog(0x87CEEB, 20, 100); // Light fog for depth

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// Lighting (Daytime Sun)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(50, 100, 50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 500;
dirLight.shadow.camera.left = -100;
dirLight.shadow.camera.right = 100;
dirLight.shadow.camera.top = 100;
dirLight.shadow.camera.bottom = -100;
scene.add(dirLight);

// No Rain in Day Mode
function animateRain() { } // Empty function to keep loop working without errors

// Initialize Game Objects
const world = createWorld(scene);
const robot = createRobot(scene);

// Camera Control State
let cameraDistance = 10;
let theta = 0; // Horizontal angle
let phi = Math.PI / 3; // Vertical angle (start slightly looking down)
let isLocked = false;

// Pointer Lock
document.body.addEventListener('click', () => {
    if (!isLocked && !document.getElementById('modal-overlay').classList.contains('hidden') === false) {
        document.body.requestPointerLock();
    }
});

document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === document.body;
});

document.addEventListener('mousemove', (e) => {
    if (isLocked) {
        const sensitivity = 0.002;
        theta -= e.movementX * sensitivity;
        phi -= e.movementY * sensitivity;

        // Clamp vertical angle to avoid flipping
        phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, phi));
    }
});

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    updateRobot(robot);
    updateWorld(world);
    checkInteractions(robot, world);
    animateRain();

    // Camera Orbit Logic
    // Convert spherical to Cartesian, relative to robot
    const x = cameraDistance * Math.sin(phi) * Math.sin(theta);
    const y = cameraDistance * Math.cos(phi);
    const z = cameraDistance * Math.sin(phi) * Math.cos(theta);

    const targetPos = robot.mesh.position.clone().add(new THREE.Vector3(x, y, z));

    // Smooth camera follow
    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(robot.mesh.position);

    renderer.render(scene, camera);
}

animate();

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
