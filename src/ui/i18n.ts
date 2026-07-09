/**
 * Internacionalização da interface (pt/en). O idioma fica em localStorage e a
 * troca reconstrói painel, HUD e textos estáticos via listeners registrados.
 */
export type Lang = 'pt' | 'en';

const STORAGE_KEY = 'sim-lang';

const pt = {
  pageTitle: 'Simulador Relativístico (Física 4)',
  appTitle: '⚡ Simulador Relativístico',
  subtitle: 'Física 4 · Relatividade Especial',
  hint:
    '<strong>Orbital:</strong> arraste p/ orbitar · scroll p/ zoom &nbsp;|&nbsp; ' +
    '<strong>Olho:</strong> arraste p/ girar o olhar (β no painel) &nbsp;|&nbsp; ' +
    '<strong>1ª pessoa:</strong> clique e ande com WASD · <em>ESC</em> pausa',
  fpTitle: '▶ Clique para jogar',
  fpKeys:
    'WASD mover · mouse olhar · Espaço / Shift subir-descer · ' +
    '<strong>ESC pausa</strong> (2× para sair)',

  panelTitle: 'Controles',
  language: 'idioma / language',
  mode: 'modo',
  modeLab: 'Laboratório (orbital)',
  modeEye: 'Olho do observador',
  modeFp: 'Primeira pessoa (WASD)',
  folderSpeed: 'Velocidade',
  beta: 'β = v/c',
  presetB0: 'atalho: β = 0',
  presetG2: 'atalho: γ = 2',
  presetG5: 'atalho: γ = 5',
  presetG10: 'atalho: γ = 10',
  axis: 'direção',
  walk: 'velocidade (β)',
  folderFx: 'Efeitos relativísticos',
  fxContraction: 'contração de Lorentz',
  fxAberration: 'aberração (o que se vê)',
  fxDoppler: 'Doppler (cor)',
  fxBeaming: 'beaming (holofote)',
  folderMore: 'Mais',
  quality: 'qualidade (↑FPS)',
  qualityHigh: 'Alta',
  qualityLow: 'Baixa',
  lookSpeed: 'sensib. mouse',
  cLabel: 'c · vel. da luz (unid./s)',
  clocksRunning: 'relógios correndo',
  resetClocks: '⟲ zerar relógios',
  resetCamera: '⌖ recentralizar câmera',

  hudLength: 'comprimento L/L₀',
  hudDilation: 'dilatação do tempo',
  hudSpeed: 'velocidade v',
  hudYou: 'você',
  hudLab: 'laboratório',
  unitsPerSecond: 'u/s',
};

const en: typeof pt = {
  pageTitle: 'Relativistic Simulator (Physics 4)',
  appTitle: '⚡ Relativistic Simulator',
  subtitle: 'Physics 4 · Special Relativity',
  hint:
    '<strong>Orbital:</strong> drag to orbit · scroll to zoom &nbsp;|&nbsp; ' +
    "<strong>Eye:</strong> drag to look around (β in the panel) &nbsp;|&nbsp; " +
    '<strong>First person:</strong> click and walk with WASD · <em>ESC</em> pauses',
  fpTitle: '▶ Click to play',
  fpKeys:
    'WASD move · mouse look · Space / Shift up-down · ' +
    '<strong>ESC pauses</strong> (2× to exit)',

  panelTitle: 'Controls',
  language: 'idioma / language',
  mode: 'mode',
  modeLab: 'Laboratory (orbital)',
  modeEye: "Observer's eye",
  modeFp: 'First person (WASD)',
  folderSpeed: 'Speed',
  beta: 'β = v/c',
  presetB0: 'preset: β = 0',
  presetG2: 'preset: γ = 2',
  presetG5: 'preset: γ = 5',
  presetG10: 'preset: γ = 10',
  axis: 'direction',
  walk: 'walk speed (β)',
  folderFx: 'Relativistic effects',
  fxContraction: 'Lorentz contraction',
  fxAberration: 'aberration (what you see)',
  fxDoppler: 'Doppler (color)',
  fxBeaming: 'beaming (headlight)',
  folderMore: 'More',
  quality: 'quality (↑FPS)',
  qualityHigh: 'High',
  qualityLow: 'Low',
  lookSpeed: 'mouse sensitivity',
  cLabel: 'c · speed of light (units/s)',
  clocksRunning: 'clocks running',
  resetClocks: '⟲ reset clocks',
  resetCamera: '⌖ recenter camera',

  hudLength: 'length L/L₀',
  hudDilation: 'time dilation',
  hudSpeed: 'speed v',
  hudYou: 'you',
  hudLab: 'laboratory',
  unitsPerSecond: 'u/s',
};

const STRINGS: Record<Lang, typeof pt> = { pt, en };

let current: Lang = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'en' || saved === 'pt' ? saved : 'pt';
  } catch {
    return 'pt';
  }
})();

const listeners: Array<() => void> = [];

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* armazenamento indisponível (ex.: cookies bloqueados) — segue sem persistir */
  }
  listeners.forEach((fn) => fn());
}

/** Registra um callback disparado a cada troca de idioma. */
export function onLangChange(fn: () => void): void {
  listeners.push(fn);
}

/** String traduzida da chave `k` no idioma atual. */
export function t(k: keyof typeof pt): string {
  return STRINGS[current][k];
}

/** Aplica o idioma aos textos estáticos da página (título, cabeçalho, dicas). */
export function applyStaticTexts(): void {
  document.documentElement.lang = current === 'pt' ? 'pt-BR' : 'en';
  document.title = t('pageTitle');
  const appTitle = document.getElementById('app-title');
  if (appTitle) appTitle.textContent = t('appTitle');
  const subtitle = document.getElementById('subtitle');
  if (subtitle) subtitle.textContent = t('subtitle');
  const hint = document.getElementById('hint');
  if (hint) hint.innerHTML = t('hint');
  const fpTitle = document.getElementById('fp-title');
  if (fpTitle) fpTitle.textContent = t('fpTitle');
  const fpKeys = document.getElementById('fp-keys');
  if (fpKeys) fpKeys.innerHTML = t('fpKeys');
}
