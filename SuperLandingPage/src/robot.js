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

    // Body
    const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.5;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.4;
    head.castShadow = true;
    group.add(head);

    // Eyes (Emissive)
    const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00 });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.15, 2.4, 0.3);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.15, 2.4, 0.3);
    group.add(rightEye);

    // Wheels/Legs
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    const leftWheel = new THREE.Mesh(wheelGeo, wheelMat);
    leftWheel.rotation.z = Math.PI / 2;
    leftWheel.position.set(-0.6, 1, 0);
    leftWheel.castShadow = true;
    group.add(leftWheel);

    const rightWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rightWheel.rotation.z = Math.PI / 2;
    rightWheel.position.set(0.6, 1, 0);
    rightWheel.castShadow = true;
    group.add(rightWheel);

    scene.add(group);

    return {
        mesh: group,
        speed: 0.1,
        rotationSpeed: 0.05
    };
}

export function updateRobot(robot) {
    if (keys.w) {
        robot.mesh.translateZ(robot.speed);
    }
    if (keys.s) {
        robot.mesh.translateZ(-robot.speed);
    }
    if (keys.a) {
        robot.mesh.rotation.y += robot.rotationSpeed;
    }
    if (keys.d) {
        robot.mesh.rotation.y -= robot.rotationSpeed;
    }
}
