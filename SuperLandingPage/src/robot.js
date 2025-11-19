import * as THREE from 'three';

const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key.toLowerCase()] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key.toLowerCase()] = false;
    }
});

export function createRobot(scene) {
    const group = new THREE.Group();

    const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.7,
        roughness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
    });

    const jointMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

    // Torso (Capsule-like)
    const torsoGeo = new THREE.CylinderGeometry(0.4, 0.3, 1.2, 16);
    const torso = new THREE.Mesh(torsoGeo, material);
    torso.position.y = 1.6;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const head = new THREE.Mesh(headGeo, material);
    head.position.y = 2.4;
    head.castShadow = true;
    group.add(head);

    // Visor (Glowing)
    const visorGeo = new THREE.BoxGeometry(0.4, 0.1, 0.2);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, emissive: 0x00ffff });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 2.4, 0.25);
    group.add(visor);

    // Arms
    function createLimb(x, y, z) {
        const limbGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 16);
        const limb = new THREE.Mesh(limbGeo, material);
        limb.position.set(x, y, z);
        limb.castShadow = true;
        return limb;
    }

    const leftArm = createLimb(-0.55, 1.8, 0);
    group.add(leftArm);
    const rightArm = createLimb(0.55, 1.8, 0);
    group.add(rightArm);

    // Shoulders
    const shoulderGeo = new THREE.SphereGeometry(0.15);
    const leftShoulder = new THREE.Mesh(shoulderGeo, jointMat);
    leftShoulder.position.set(-0.55, 2.1, 0);
    group.add(leftShoulder);
    const rightShoulder = new THREE.Mesh(shoulderGeo, jointMat);
    rightShoulder.position.set(0.55, 2.1, 0);
    group.add(rightShoulder);

    // Hover Unit (instead of legs for futuristic feel)
    const hoverGeo = new THREE.CylinderGeometry(0.2, 0.1, 0.4, 16);
    const hover = new THREE.Mesh(hoverGeo, jointMat);
    hover.position.y = 0.8;
    group.add(hover);

    // Glow Ring at bottom
    const ringGeo = new THREE.TorusGeometry(0.3, 0.05, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, emissive: 0x00ffff });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.6;
    group.add(ring);

    scene.add(group);

    return {
        mesh: group,
        speed: 0.15,
        rotationSpeed: 0.05,
        bobOffset: 0
    };
}

export function updateRobot(robot) {
    // Movement
    if (keys.w) robot.mesh.translateZ(robot.speed);
    if (keys.s) robot.mesh.translateZ(-robot.speed);
    if (keys.a) robot.mesh.rotation.y += robot.rotationSpeed;
    if (keys.d) robot.mesh.rotation.y -= robot.rotationSpeed;

    // Hover Animation (Bobbing)
    robot.bobOffset += 0.1;
    robot.mesh.position.y = Math.sin(robot.bobOffset) * 0.05;
}
