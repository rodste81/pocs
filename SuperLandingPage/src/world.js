import * as THREE from 'three';

export function createWorld(scene) {
    const buildings = [];

    // 1. Ground (Grass)
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x4caf50,
        roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // 2. Buildings (Menu Items)

    // Helper to create a building
    function createBuilding(x, z, color, label, title, content) {
        const geometry = new THREE.BoxGeometry(3, 4, 3);
        const material = new THREE.MeshStandardMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        // Simple "Sign" (Text Texture could be added here, using color for now)

        buildings.push({
            mesh: mesh,
            title: title,
            content: content,
            triggered: false
        });
    }

    createBuilding(0, -10, 0xff5722, "Start", "Welcome to Robotizze", "We automate your future. Explore our world to learn more about our AI solutions.");
    createBuilding(-10, -5, 0x2196f3, "Services", "Our Services", "1. Custom AI Development\n2. Process Automation\n3. 3D Web Experiences\n4. Cloud Architecture");
    createBuilding(10, -5, 0x9c27b0, "Contact", "Contact Us", "Email: hello@robotizze.com\nPhone: +1 (555) 123-4567\nLocation: The Metaverse");

    return {
        ground,
        buildings
    };
}

export function updateWorld(world) {
    // Animate buildings slightly?
    world.buildings.forEach(b => {
        b.mesh.rotation.y += 0.005;
    });
}
