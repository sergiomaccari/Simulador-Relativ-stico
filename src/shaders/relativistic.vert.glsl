// ───────────────────────────────────────────────────────────────────────────
//  Simulador Relativístico · Vertex shader
//
//  Recebe a posição de REPOUSO de cada vértice (relativa ao observador) e
//  devolve onde ele APARECE para um observador que se move com β = uBeta.
//    (1) boost de Lorentz   → contração do comprimento          [uContraction]
//    (2) cone de luz passado → aberração + atraso da luz         [uAberration]
//    (3) Doppler + beaming   → COR final calculada AQUI (vColor)
//
//  Otimização de desempenho: a integral da reconstrução espectral é resolvida
//  na CPU (core/spectrum.ts) e chega aqui como uma tabela de matrizes 3×3. A
//  cor é então avaliada por VÉRTICE e interpolada, em vez de por pixel. Para
//  malhas bem subdivididas o resultado é praticamente idêntico (sólidos de
//  poucas faces são subdivididos na cena p/ evitar facetação) e roda leve.
// ───────────────────────────────────────────────────────────────────────────

uniform vec3  uBeta;        // velocidade do OBSERVADOR / c
uniform vec3  uObjectBeta;  // velocidade DESTE objeto / c
uniform vec3  uPlayerPos;   // posição do observador (modo 1ª pessoa)
uniform float uContraction; // 0 = repouso · 1 = contração total
uniform float uAberration;  // 0 = posição instantânea · 1 = posição vista
uniform vec3  uBaseColor;   // cor de repouso do objeto
uniform float uDoppler;     // 0/1 — desvio de cor
uniform float uBeaming;     // 0/1 — efeito holofote

// Tabela de reconstrução espectral (ver core/spectrum.ts): cada coluna guarda
// as 3 linhas da matriz RGB→RGB de um desvio, indexadas por log(shift).
uniform sampler2D uDopplerLut;
uniform float uLutSize;
uniform float uLogShiftMin;
uniform float uLogShiftMax;

varying vec3 vColor;        // cor final percebida (já com Doppler + beaming)

// Adição relativística de velocidades — espelha velocityAdd() em minkowski.ts
vec3 velocityAdd(vec3 u, vec3 v) {
  float v2 = dot(v, v);
  if (v2 < 1e-10) return u;
  float gv = 1.0 / sqrt(max(1.0 - v2, 1e-10));
  float uv = dot(u, v);
  vec3 uPar  = (uv / v2) * v;
  vec3 uPerp = u - uPar;
  return (uPar + v + uPerp / gv) / (1.0 + uv);
}

// ── Cor: matriz de reconstrução espectral, lida da tabela pré-computada ──
//
// Todo o caminho RGB → espectro → Doppler → curvas CIE → XYZ → RGB é linear em
// RGB, então para cada desvio ele colapsa numa única matriz 3×3. A CPU integra
// as curvas de Wyman et al. (2013) uma vez e tabela essas matrizes; aqui só
// interpolamos entre duas colunas vizinhas. Nenhum exp() por vértice.

/** Linha `row` da matriz do desvio, interpolada linearmente em log(shift). */
vec3 lutRow(float u0, float u1, float f, float row) {
  float v = (row + 0.5) / 3.0;
  return mix(texture2D(uDopplerLut, vec2(u0, v)).rgb,
             texture2D(uDopplerLut, vec2(u1, v)).rgb, f);
}

/** Matriz C(shift): em repouso (shift = 1) é exatamente a identidade. */
mat3 dopplerMatrix(float shift) {
  float t = clamp((log(shift) - uLogShiftMin) / (uLogShiftMax - uLogShiftMin), 0.0, 1.0);
  float x  = t * (uLutSize - 1.0);
  float i0 = floor(x);
  float f  = x - i0;
  float u0 = (i0 + 0.5) / uLutSize;
  float u1 = (min(i0 + 1.0, uLutSize - 1.0) + 0.5) / uLutSize;

  vec3 r0 = lutRow(u0, u1, f, 0.0);
  vec3 r1 = lutRow(u0, u1, f, 1.0);
  vec3 r2 = lutRow(u0, u1, f, 2.0);
  return mat3(r0.x, r1.x, r2.x,   // GLSL monta mat3 por COLUNAS
              r0.y, r1.y, r2.y,
              r0.z, r1.z, r2.z);
}

/** Traz a cor de volta ao gamut: dessatura o negativo, normaliza o excesso. */
vec3 fitToGamut(vec3 c) {
  c -= min(0.0, min(c.r, min(c.g, c.b)));
  float m = max(c.r, max(c.g, c.b));
  return (m > 1.0) ? c / m : c;
}

/** Cor deslocada pelo Doppler (shift = λ_obs/λ_emit). */
vec3 dopplerColor(vec3 base, float shift) {
  return fitToGamut(dopplerMatrix(shift) * base);
}

void main() {
  // posição de repouso do vértice, relativa ao observador
  vec3 xLab = (modelMatrix * vec4(position, 1.0)).xyz - uPlayerPos;

  float b2 = dot(uBeta, uBeta);
  float g  = (b2 > 1e-10) ? 1.0 / sqrt(max(1.0 - b2, 1e-10)) : 1.0;
  vec3 uObs = velocityAdd(uObjectBeta, -uBeta);

  // (1) posição no instante t=0 do observador → contração de Lorentz
  vec3 r0 = xLab;
  if (b2 > 1e-10) {
    vec3 bhat = uBeta / sqrt(b2);
    float denom = 1.0 - dot(uBeta, uObjectBeta);
    denom = (abs(denom) < 1e-4) ? 1e-4 : denom;
    float Tp = dot(uBeta, xLab) / denom;
    vec3  X  = xLab + uObjectBeta * Tp;
    r0 = X + (g - 1.0) * dot(bhat, X) * bhat - g * uBeta * Tp;
  }
  vec3 rC = mix(xLab, r0, uContraction);

  // (2) cone de luz passado → posição aparente (aberração)
  vec3 pApp = rC;
  if (uAberration > 0.5) {
    float A = dot(uObs, uObs) - 1.0;
    float B = 2.0 * dot(rC, uObs);
    float C = dot(rC, rC);
    float tau = 0.0;
    if (abs(A) < 1e-6) {
      tau = (abs(B) > 1e-6) ? (-C / B) : 0.0;
    } else {
      float disc = max(B * B - 4.0 * A * C, 0.0);
      float sq = sqrt(disc);
      float t1 = (-B + sq) / (2.0 * A);
      float t2 = (-B - sq) / (2.0 * A);
      if (t1 <= 0.0 && t2 <= 0.0)      tau = max(t1, t2);
      else if (t1 <= 0.0)              tau = t1;
      else if (t2 <= 0.0)              tau = t2;
    }
    pApp = rC + uObs * tau;
  }

  // (3) Doppler + beaming → cor final (por vértice)
  float los = length(pApp);
  vec3  n   = (los > 1e-6) ? pApp / los : vec3(0.0, 0.0, 1.0);
  float ub2 = dot(uObs, uObs);
  float gObs = (ub2 < 1.0) ? 1.0 / sqrt(max(1.0 - ub2, 1e-10)) : 1.0;
  float D  = 1.0 / max(gObs * (1.0 + dot(uObs, n)), 1e-4); // f_obs/f_emit
  float shift = 1.0 / D;

  vec3 col = (uDoppler > 0.5) ? dopplerColor(uBaseColor, shift) : uBaseColor;
  if (uBeaming > 0.5) col *= D * D * D; // beaming (searchlight)
  vColor = col;

  gl_Position = projectionMatrix * viewMatrix * vec4(pApp + uPlayerPos, 1.0);
}
