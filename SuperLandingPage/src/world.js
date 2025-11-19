import * as THREE from 'three';

export function createWorld(scene) {
    const buildings = [];

    // 1. Ground (Streets with Markings)
    const groundGeometry = new THREE.PlaneGeometry(400, 400);

    // Create Road Texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#333333'; // Asphalt
    ctx.fillRect(0, 0, 512, 512);

    // White Lines
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(250, 0, 12, 512); // Center line
    ctx.fillRect(0, 250, 512, 12); // Cross line

    const roadTex = new THREE.CanvasTexture(canvas);
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(20, 20);

    const groundMaterial = new THREE.MeshStandardMaterial({
        map: roadTex,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Helper: Create Text Texture for Billboards
    function createTextTexture(text, colorStr) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 512, 256);

        ctx.lineWidth = 10;
        ctx.strokeStyle = colorStr;
        ctx.strokeRect(0, 0, 512, 256);

        ctx.font = 'bold 80px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 128);

        return new THREE.CanvasTexture(canvas);
    }

    function createBuilding(x, z, color, label, title, content, isInteractive = true) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Main Tower (Concrete/Glass)
        const height = 20 + Math.random() * 30;
        const width = 8 + Math.random() * 4;
        const depth = 8 + Math.random() * 4;

        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa, // Concrete gray
            roughness: 0.2,
            metalness: 0.1
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = height / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);

        // Windows (Texture or simple grid)
        // ...

        // Billboard
        if (isInteractive) {
            const billboardGeo = new THREE.PlaneGeometry(width - 1, 4);
            const billboardTex = createTextTexture(label, '#' + color.toString(16).padStart(6, '0'));
            const billboardMat = new THREE.MeshBasicMaterial({ map: billboardTex });
            const billboard = new THREE.Mesh(billboardGeo, billboardMat);
            billboard.position.set(0, 8, depth / 2 + 0.1);
            group.add(billboard);
        }

        scene.add(group);

        if (isInteractive) {
            buildings.push({
                mesh: group,
                title: title,
                content: content,
                triggered: false
            });
        }
    }

    // Interactive Buildings
    createBuilding(0, -30, 0x00ffff, "START", "Welcome", "Explore our world.");
    createBuilding(-30, -10, 0x0088ff, "SERVICES", "Services", "AI & Automation.");
    createBuilding(30, -10, 0xff00ff, "CONTACT", "Contact", "hello@robotizze.com");

    // Background Buildings
    for (let i = 0; i < 60; i++) {
        const x = (Math.random() - 0.5) * 350;
        const z = (Math.random() - 0.5) * 350;
        if (Math.abs(x) < 40 && Math.abs(z) < 40) continue;
        createBuilding(x, z, 0x555555, "", "", "", false);
    }

    // Yellow Taxis
    function createTaxi(x, z) {
        const taxiGroup = new THREE.Group();
        taxiGroup.position.set(x, 0.5, z);
        taxiGroup.rotation.y = Math.random() * Math.PI * 2;

        // Body
        const bodyGeo = new THREE.BoxGeometry(2, 1, 4);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 }); // Yellow
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        taxiGroup.add(body);

        // Top
        const topGeo = new THREE.BoxGeometry(1.8, 0.6, 2);
        const top = new THREE.Mesh(topGeo, bodyMat);
        top.position.y = 0.8;
        taxiGroup.add(top);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const w1 = new THREE.Mesh(wheelGeo, wheelMat); w1.rotation.z = Math.PI / 2; w1.position.set(1, 0, 1); taxiGroup.add(w1);
        const w2 = new THREE.Mesh(wheelGeo, wheelMat); w2.rotation.z = Math.PI / 2; w2.position.set(-1, 0, 1); taxiGroup.add(w2);
        const w3 = new THREE.Mesh(wheelGeo, wheelMat); w3.rotation.z = Math.PI / 2; w3.position.set(1, 0, -1); taxiGroup.add(w3);
        const w4 = new THREE.Mesh(wheelGeo, wheelMat); w4.rotation.z = Math.PI / 2; w4.position.set(-1, 0, -1); taxiGroup.add(w4);

        scene.add(taxiGroup);
    }

    for (let i = 0; i < 20; i++) {
        const x = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        if (Math.abs(x) < 10 && Math.abs(z) < 10) continue; // Don't spawn on robot
        createTaxi(x, z);
    }

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
