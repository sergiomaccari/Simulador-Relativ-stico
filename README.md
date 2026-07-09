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

A física relativística está em GLSL, no *vertex shader*: contração de Lorentz, posição
aparente (cone de luz passado), fator Doppler e beaming são calculados por vértice;
o *fragment shader* apenas aplica a opacidade. O núcleo de Minkowski (γ, adição de
velocidades) está em `src/core/minkowski.ts`.

A cor é reconstruída a partir do espectro: as curvas CIE 1931 vêm do ajuste
multi-lóbulo de Wyman et al. (2013) e a integral, que não tem forma fechada, é
resolvida na CPU uma única vez na inicialização (`src/core/spectrum.ts`) e tabelada
como uma matriz 3×3 por desvio Doppler. O shader faz só uma busca e um produto
matriz-vetor, sem nenhuma exponencial por vértice.

## Modos

| Modo | O que faz |
|------|-----------|
| **Laboratório (orbital)** | orbita por fora e inspeciona a cena deformada |
| **Olho do observador** | parado no centro, arraste para girar o olhar (β no painel) |
| **Primeira pessoa (WASD)** | anda pela cena a velocidade constante (`ESC` pausa) |

A interface está disponível em português e inglês (seletor no painel de controles).

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
[`docs/`](docs/) (LaTeX + PDF), em português ([`artigo.pdf`](docs/artigo.pdf)) e em
inglês ([`artigo-en.pdf`](docs/artigo-en.pdf)).
