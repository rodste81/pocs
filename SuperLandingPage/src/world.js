import * as THREE from 'three';

export function createWorld(scene) {
    const buildings = [];

    // 1. Ground (Sleek Dark Grid)
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.1,
        metalness: 0.5
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(200, 50, 0x00ffff, 0x222222);
    scene.add(gridHelper);

    // 2. Buildings (Futuristic Skyscrapers)

    function createBuilding(x, z, color, label, title, content) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Main Tower
        const geometry = new THREE.BoxGeometry(4, 12, 4);
        const material = new THREE.MeshPhysicalMaterial({
            color: color,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.8,
            transmission: 0.5
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 6; // Half height
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);

        // Glowing Edges / Neon Strips
        const glowGeo = new THREE.BoxGeometry(4.1, 12, 0.2);
        const glowMat = new THREE.MeshBasicMaterial({ color: color, emissive: color, emissiveIntensity: 2 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.y = 6;
        group.add(glow);

        scene.add(group);

        buildings.push({
            mesh: group, // Use group for position checks
            title: title,
            content: content,
            triggered: false
        });
    }

    createBuilding(0, -15, 0x00ffff, "Start", "Welcome to Robotizze", "We automate your future. Explore our world to learn more about our AI solutions.");
    createBuilding(-15, -5, 0x0088ff, "Services", "Our Services", "1. Custom AI Development\n2. Process Automation\n3. 3D Web Experiences\n4. Cloud Architecture");
    createBuilding(15, -5, 0xff00ff, "Contact", "Contact Us", "Email: hello@robotizze.com\nPhone: +1 (555) 123-4567\nLocation: The Metaverse");

    return {
        ground,
        buildings
    };
}

export function updateWorld(world) {
    // Animate buildings (pulse effect?)
    const time = Date.now() * 0.001;
    world.buildings.forEach((b, i) => {
        b.mesh.position.y = Math.sin(time + i) * 0.2; // Gentle floating
    });
}
