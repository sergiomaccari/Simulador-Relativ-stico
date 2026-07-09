import GUI from 'lil-gui';
import type { Simulator } from '../engine/Simulator';
import { getLang, setLang, t, type Lang } from './i18n';

/** β correspondente a um dado γ:  β = sqrt(1 − 1/γ²). */
function betaForGamma(g: number): number {
  return Math.sqrt(1 - 1 / (g * g));
}

/**
 * Painel de controle (lil-gui) ligado ao simulador. Os controles são
 * SENSÍVEIS AO MODO: só aparecem os parâmetros relevantes ao modo atual.
 * Na troca de idioma o painel inteiro é reconstruído (ver main.ts).
 */
export function createControlPanel(sim: Simulator): GUI {
  const gui = new GUI({ title: t('panelTitle') });
  const s = sim.state;

  // ── Idioma (no topo) ──
  gui
    .add({ lang: getLang() }, 'lang', { Português: 'pt', English: 'en' })
    .name(t('language'))
    .onChange((l: Lang) => setLang(l));

  // ── Modo ──
  gui
    .add(s, 'mode', {
      [t('modeLab')]: 'lab',
      [t('modeEye')]: 'eye',
      [t('modeFp')]: 'firstPerson',
    })
    .name(t('mode'))
    .onChange(() => applyVisibility());

  // ── Velocidade ──
  const fVel = gui.addFolder(t('folderSpeed'));
  const cBeta = fVel.add(s, 'betaMag', 0, 0.9999, 0.0001).name(t('beta'));
  const setBeta = (b: number) => {
    s.betaMag = b;
    cBeta.updateDisplay();
  };
  const cP0 = fVel.add({ fn: () => setBeta(0) }, 'fn').name(t('presetB0'));
  const cP2 = fVel.add({ fn: () => setBeta(betaForGamma(2)) }, 'fn').name(t('presetG2'));
  const cP5 = fVel.add({ fn: () => setBeta(betaForGamma(5)) }, 'fn').name(t('presetG5'));
  const cP10 = fVel.add({ fn: () => setBeta(betaForGamma(10)) }, 'fn').name(t('presetG10'));
  const cAxis = fVel.add(s, 'betaAxis', ['x', 'y', 'z']).name(t('axis'));
  const cWalk = fVel.add(sim.fp, 'walkBeta', 0, 0.99, 0.001).name(t('walk'));

  // ── Efeitos relativísticos (todos os modos) ──
  const fFx = gui.addFolder(t('folderFx'));
  fFx.add(s, 'contraction').name(t('fxContraction'));
  fFx.add(s, 'aberration').name(t('fxAberration'));
  fFx.add(s, 'doppler').name(t('fxDoppler'));
  fFx.add(s, 'beaming').name(t('fxBeaming'));

  // ── Mais (avançado, recolhido) ──
  const fMore = gui.addFolder(t('folderMore'));
  fMore
    .add(s, 'quality', { [t('qualityHigh')]: 'alta', [t('qualityLow')]: 'baixa' })
    .name(t('quality'))
    .onChange((v: 'alta' | 'baixa') => sim.setQuality(v));
  const cLook = fMore.add(sim.fp, 'lookSpeed', 0.0005, 0.006, 0.0001).name(t('lookSpeed'));
  fMore.add(s, 'c', 4, 60, 1).name(t('cLabel'));
  fMore.add(s, 'animate').name(t('clocksRunning'));
  fMore.add({ fn: () => sim.resetClocks() }, 'fn').name(t('resetClocks'));
  fMore.add({ fn: () => sim.resetCamera() }, 'fn').name(t('resetCamera'));
  fMore.close();

  // ── Visibilidade por modo ──
  const betaGroup = [cBeta, cP0, cP2, cP5, cP10]; // β controlado por slider: lab + olho
  function applyVisibility(): void {
    const showBeta = s.mode === 'lab' || s.mode === 'eye';
    betaGroup.forEach((c) => c.show(showBeta));
    cAxis.show(s.mode === 'lab'); // direção só no laboratório
    cWalk.show(s.mode === 'firstPerson'); // velocidade da 1ª pessoa
    cLook.show(s.mode === 'firstPerson'); // sensib. mouse só na 1ª pessoa
  }

  // refresca os valores exibidos E a visibilidade quando o modo muda por fora
  sim.onStateRefresh = () => {
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
    applyVisibility();
  };
  applyVisibility();

  return gui;
}
