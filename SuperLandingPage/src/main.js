import * as THREE from 'three';
import { createWorld, updateWorld } from './world.js';
import { createRobot, updateRobot } from './robot.js';
import { checkInteractions } from './interaction.js';

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510); // Dark Blue/Black
scene.fog = new THREE.FogExp2(0x050510, 0.02); // Atmospheric fog

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft white light
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
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
