/**
 * Reconstrução espectral da cor sob desvio Doppler.
 *
 * A cor de repouso de um objeto é RGB, mas o Doppler age sobre o ESPECTRO. O
 * caminho físico é: RGB → espectro de emissão → deslocamento → resposta do olho
 * (curvas CIE) → XYZ → RGB.
 *
 * Modelo de emissão: cada primária sRGB é representada por uma gaussiana de
 * área unitária, centrada no comprimento de onda dominante daquela primária e
 * com FWHM de 40 nm, ordem de grandeza da largura espectral de um emissor de
 * display real. Sob um desvio s = λ_obs/λ_emit, a conservação do número de
 * fótons leva N(λ; μ, σ) → N(λ; sμ, sσ): a gaussiana continua gaussiana, com
 * centro e largura escalados por s. A intensidade não entra aqui; ela é o
 * beaming D³, aplicado à parte no shader.
 *
 * Resposta do olho: ajuste multi-lóbulo de gaussianas ENVIESADAS de Wyman
 * et al. (2013) para o observador padrão CIE 1931 2°. É um ajuste sem primitiva
 * elementar quando integrado contra outra gaussiana, então a integral é feita
 * numericamente AQUI, na CPU, uma única vez na inicialização.
 *
 * O resultado é tabelado: para cada s, a transformação inteira RGB→RGB é uma
 * matriz 3×3, porque tudo no caminho é linear em RGB. A tabela vai para uma
 * textura e o shader faz apenas uma multiplicação matriz-vetor por vértice.
 *
 * Consequência útil da construção: C(1) é exatamente a identidade, logo em
 * repouso a cor exibida é exatamente a cor de repouso, sem nenhuma interpolação
 * corretiva.
 */

// ── Curvas CIE 1931 2°: ajuste de Wyman, Sloan e Shirley (2013), Tabela 1 ────
// Cada lóbulo é uma gaussiana enviesada: a largura inversa muda ao cruzar μ.

function lobe(l: number, a: number, mu: number, kLo: number, kHi: number): number {
  const t = (l - mu) * (l < mu ? kLo : kHi);
  return a * Math.exp(-0.5 * t * t);
}

/** x̄(λ), três lóbulos (um deles negativo). */
export function cieX(l: number): number {
  return (
    lobe(l, 0.362, 442.0, 0.0624, 0.0374) +
    lobe(l, 1.056, 599.8, 0.0264, 0.0323) +
    lobe(l, -0.065, 501.1, 0.049, 0.0382)
  );
}

/** ȳ(λ), dois lóbulos. */
export function cieY(l: number): number {
  return lobe(l, 0.821, 568.8, 0.0213, 0.0247) + lobe(l, 0.286, 530.9, 0.0613, 0.0322);
}

/** z̄(λ), dois lóbulos. */
export function cieZ(l: number): number {
  return lobe(l, 1.217, 437.0, 0.0845, 0.0278) + lobe(l, 0.681, 459.0, 0.0385, 0.0725);
}

// ── Espectro de emissão das primárias ───────────────────────────────────────

/** FWHM de 40 nm → σ = FWHM / (2√(2 ln 2)). */
const SIGMA = 40 / (2 * Math.sqrt(2 * Math.LN2));

/** Comprimentos de onda dominantes das primárias sRGB (R, G, B), em nm. */
const PRIMARY_LAMBDA = [611.4, 549.1, 464.2] as const;

/** Faixa visível considerada; fora dela o olho não responde. */
const LAMBDA_MIN = 360;
const LAMBDA_MAX = 830;

/** Amostras por lóbulo na integração; o intervalo acompanha σ, não o passo. */
const SAMPLES = 512;

/**
 * ∫ N(λ; μ, σ) · [x̄, ȳ, z̄](λ) dλ para um lóbulo gaussiano de área unitária.
 *
 * A integração cobre ±6σ em torno de μ, recortada à faixa visível, com passo
 * proporcional a σ. Isso mantém a precisão quando o desvio comprime a gaussiana
 * a uma fração de nanômetro, caso em que um passo fixo de 1 nm a perderia.
 */
function lobeToXYZ(mu: number, sigma: number): [number, number, number] {
  const lo = Math.max(LAMBDA_MIN, mu - 6 * sigma);
  const hi = Math.min(LAMBDA_MAX, mu + 6 * sigma);
  if (hi <= lo) return [0, 0, 0]; // lóbulo inteiramente fora do visível

  const h = (hi - lo) / SAMPLES;
  const norm = 1 / (sigma * Math.sqrt(2 * Math.PI));
  let X = 0;
  let Y = 0;
  let Z = 0;

  for (let i = 0; i <= SAMPLES; i++) {
    const l = lo + i * h;
    const d = (l - mu) / sigma;
    const g = norm * Math.exp(-0.5 * d * d);
    const w = i === 0 || i === SAMPLES ? 0.5 : 1; // trapézios
    X += w * g * cieX(l);
    Y += w * g * cieY(l);
    Z += w * g * cieZ(l);
  }
  return [X * h, Y * h, Z * h];
}

// ── Álgebra de matrizes 3×3 (row-major, 9 números) ──────────────────────────

type Mat3 = number[];

/** XYZ → sRGB linear, D65 (matriz padrão da recomendação sRGB). */
const XYZ_TO_RGB: Mat3 = [
  3.2404542, -1.5371385, -0.4985314, -0.969266, 1.8760108, 0.041556, 0.0556434, -0.2040259,
  1.0572252,
];

function matMul(a: Mat3, b: Mat3): Mat3 {
  const out = new Array<number>(9).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) sum += a[r * 3 + k] * b[k * 3 + c];
      out[r * 3 + c] = sum;
    }
  }
  return out;
}

function matInverse(m: Mat3): Mat3 {
  const [a, b, c, d, e, f, g, h, i] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) throw new Error('matriz singular na reconstrução espectral');
  const inv = 1 / det;
  return [
    (e * i - f * h) * inv,
    (c * h - b * i) * inv,
    (b * f - c * e) * inv,
    (f * g - d * i) * inv,
    (a * i - c * g) * inv,
    (c * d - a * f) * inv,
    (d * h - e * g) * inv,
    (b * g - a * h) * inv,
    (a * e - b * d) * inv,
  ];
}

/**
 * Matriz cujas COLUNAS são o XYZ de cada primária deslocada por `shift`.
 * Multiplicá-la por um vetor de pesos das primárias devolve o XYZ observado.
 */
function primariesToXYZ(shift: number): Mat3 {
  const cols = PRIMARY_LAMBDA.map((mu) => lobeToXYZ(mu * shift, SIGMA * shift));
  return [
    cols[0][0],
    cols[1][0],
    cols[2][0],
    cols[0][1],
    cols[1][1],
    cols[2][1],
    cols[0][2],
    cols[1][2],
    cols[2][2],
  ];
}

/** RGB de repouso → pesos das primárias, fixado exigindo C(1) = identidade. */
const RGB_TO_WEIGHTS: Mat3 = matInverse(matMul(XYZ_TO_RGB, primariesToXYZ(1)));

/**
 * Transformação RGB→RGB completa para um desvio `shift` = λ_obs/λ_emit.
 * C(shift) = [XYZ→RGB] · [primárias deslocadas → XYZ] · [RGB → pesos].
 */
export function dopplerMatrix(shift: number): Mat3 {
  return matMul(matMul(XYZ_TO_RGB, primariesToXYZ(shift)), RGB_TO_WEIGHTS);
}

// ── Tabela pré-computada, consumida pelo shader como textura ────────────────

/** Colunas da textura: um desvio por coluna. */
export const LUT_SIZE = 512;

/** Faixa de desvios tabelada; fora dela a luz visível já saiu do visível. */
export const SHIFT_MIN = 1 / 200;
export const SHIFT_MAX = 200;
export const LOG_SHIFT_MIN = Math.log(SHIFT_MIN);
export const LOG_SHIFT_MAX = Math.log(SHIFT_MAX);

/**
 * Textura RGBA float de `LUT_SIZE` × 3: a linha `r` guarda a linha `r` da
 * matriz C(shift), e a coluna indexa log(shift) linearmente.
 */
export function buildDopplerLutData(): Float32Array {
  const data = new Float32Array(LUT_SIZE * 3 * 4);
  for (let i = 0; i < LUT_SIZE; i++) {
    const t = i / (LUT_SIZE - 1);
    const shift = Math.exp(LOG_SHIFT_MIN + t * (LOG_SHIFT_MAX - LOG_SHIFT_MIN));
    const c = dopplerMatrix(shift);
    for (let row = 0; row < 3; row++) {
      const o = (row * LUT_SIZE + i) * 4;
      data[o] = c[row * 3];
      data[o + 1] = c[row * 3 + 1];
      data[o + 2] = c[row * 3 + 2];
      data[o + 3] = 1;
    }
  }
  return data;
}
