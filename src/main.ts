import './style.css';
import { Simulator } from './engine/Simulator';
import { createControlPanel } from './ui/ControlPanel';
import { Hud } from './ui/Hud';
import { applyStaticTexts, onLangChange } from './ui/i18n';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const sim = new Simulator(canvas);
const hud = new Hud();
let gui = createControlPanel(sim);

applyStaticTexts();
onLangChange(() => {
  applyStaticTexts();
  hud.refreshLang();
  // reconstrói o painel fora do handler do próprio seletor de idioma
  setTimeout(() => {
    gui.destroy();
    gui = createControlPanel(sim);
  }, 0);
});

sim.onFrame = (readout, state) => hud.update(readout, state);
sim.start();
