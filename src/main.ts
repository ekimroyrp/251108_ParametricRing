import './style.css';
import { SceneManager } from './scene/scene-manager';
import { ProfileEditor } from './ui/profile-editor';
import { ControlPanel } from './ui/control-panel';

const canvas = document.getElementById('ring-canvas') as HTMLCanvasElement | null;
const uiRoot = document.getElementById('ui-root');
const profileRoot = document.getElementById('profile-editor-root');

if (!canvas || !uiRoot || !profileRoot) {
  throw new Error('Missing root elements for the parametric ring app.');
}

const scene = new SceneManager(canvas);
const editor = new ProfileEditor(profileRoot);
const controls = new ControlPanel(uiRoot);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    scene.dispose();
    editor.dispose();
    controls.dispose();
  });
}
