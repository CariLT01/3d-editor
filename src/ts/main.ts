function hideLoadingScreen() {
    const loadingScreen: HTMLDivElement = document.querySelector("#loading-screen") as HTMLDivElement;
    if (!loadingScreen) {
        console.warn("No loading screen found!");
        return;
    }

    // Animate

    loadingScreen.animate([
        {opacity: 1},
        {opacity: 0}
    ], {
        duration: 1000,
        fill: 'forwards'
    });

    setTimeout(() => {
        loadingScreen.style.display = "none";
    }, 1000);
}

import { Editor3d } from './editor/editorOld';
const editor = new Editor3d();
editor.initialize();
hideLoadingScreen()

function renderLoop() {
    editor.renderScene();
    requestAnimationFrame(renderLoop);
}

renderLoop();