# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A collection of standalone HTML5 canvas games. Each game lives in its own directory as a single self-contained `index.html` file with inline CSS and JavaScript (no build tools, no dependencies, no bundler).

## Architecture

- **One file per game**: Each game is a single `index.html` containing all HTML, CSS, and JS inline. No external assets or libraries.
- **Canvas rendering**: All games use `<canvas>` with `requestAnimationFrame` game loops and 2D context drawing.
- **Pixel-art sprites**: Generated programmatically via off-screen canvas (no image files). Each entity creates its sprite in code.
- **No build/test/lint commands**: Open `index.html` directly in a browser (`open <game>/index.html`).

## Current Games

- **dino_city_destruction/**: Top-down city destruction game. Player controls a dinosaur; AI dinos, soldiers, and jets interact. Fixed-camera, physics with gravity/jumping.
- **wings_of_fire/**: Side-scrolling dragon action game with camera system, parallax backgrounds, 5 biomes, boss fights, tribe unlock system (localStorage), and AI allies. See `wings_of_fire/Claude.md` for detailed game design spec.

## Conventions

- Vanilla JavaScript only — no frameworks, no npm, no TypeScript.
- Game state managed through module-level variables and class instances.
- Entity pattern: classes with `update()` and `draw()` methods (e.g., `Dragon`, `Projectile`, `Scavenger`, `Fortress`).
- Collision detection is AABB (axis-aligned bounding box) rectangle checks.
- Screen shake via random translation on the canvas context.
- Particle systems for visual effects (explosions, fire, smoke) using simple object arrays.
