const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModal = document.getElementById('close-modal');

let isModalOpen = false;

closeModal.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
    isModalOpen = false;
    // Reset triggers slightly so it doesn't immediately reopen
    setTimeout(() => {
        // Logic to allow re-triggering if needed
    }, 1000);
});

export function checkInteractions(robot, world) {
    if (isModalOpen) return;

    const robotPos = robot.mesh.position;
    const threshold = 4; // Distance to trigger

    world.buildings.forEach(building => {
        const dist = robotPos.distanceTo(building.mesh.position);

        if (dist < threshold) {
            if (!building.triggered) {
                openModal(building.title, building.content);
                building.triggered = true;
            }
        } else {
            // Reset trigger when walking away
            if (dist > threshold + 2) {
                building.triggered = false;
            }
        }
    });
}

function openModal(title, content) {
    modalTitle.innerText = title;
    modalBody.innerText = content; // Use innerText to preserve newlines
    modalOverlay.classList.remove('hidden');
    isModalOpen = true;
}
