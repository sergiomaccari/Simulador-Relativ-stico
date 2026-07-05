# Simulador Relativístico (Física 4)

Simulador interativo dos efeitos visuais de viajar perto da velocidade da luz,
feito em **TypeScript + Three.js (WebGL)**.

> **Demo ao vivo:** https://sergiomaccari.github.io/Simulador-Relativ-stico/

## O que ele demonstra

- **Contração de Lorentz**: comprimentos encolhem na direção do movimento (L = L₀/γ)
- **Dilatação do tempo**: o relógio que se move atrasa (dois relógios no HUD)
- **Efeito Doppler relativístico**: cores deslocam para o azul à frente e para o vermelho atrás
- **Beaming (efeito holofote)**: o brilho se concentra na direção do movimento
- **Aberração relativística**: as posições aparentes se curvam para a frente (opcional)

Toda a física está em GLSL, no *vertex shader*: contração de Lorentz, posição
aparente (cone de luz passado) e a cor com Doppler/beaming são calculadas por
vértice; o *fragment shader* apenas aplica a opacidade. O núcleo de Minkowski
(γ, adição de velocidades) está em `src/core/minkowski.ts`.

## Modos

| Modo | O que faz |
|------|-----------|
| **Laboratório (orbital)** | orbita por fora e inspeciona a cena deformada |
| **Olho do observador** | parado no centro, arraste para girar o olhar (β no painel) |
| **Primeira pessoa (WASD)** | anda pela cena a velocidade constante (`ESC` pausa) |

## Rodar localmente

```bash
npm install
npm run dev      # abre em http://localhost:5173
```

Build de produção (gera `dist/`):

```bash
npm run build
npm run preview
```

## Stack

TypeScript, Three.js, Vite, lil-gui e GLSL (WebGL).

## Documentação

O artigo com a física, os algoritmos e a arquitetura do simulador está em
[`docs/`](docs/) (LaTeX + PDF).
