

import { Editor3d } from './editor/editor';
const editor = new Editor3d();
editor.initialize();

function renderLoop() {
    editor.renderScene();
    requestAnimationFrame(renderLoop);
}

renderLoop();