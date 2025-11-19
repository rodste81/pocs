import * as THREE from 'three';
import { createWorld, updateWorld } from './world.js';
import { createRobot, updateRobot } from './robot.js';
import { checkInteractions } from './interaction.js';

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue
scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
scene.add(dirLight);

// Initialize Game Objects
const world = createWorld(scene);
const robot = createRobot(scene);

// Camera Follow Logic
const cameraOffset = new THREE.Vector3(0, 5, 8);

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    updateRobot(robot);
    updateWorld(world);
    checkInteractions(robot, world);

    // Camera follows robot smoothly
    const targetPos = robot.mesh.position.clone().add(cameraOffset);
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
