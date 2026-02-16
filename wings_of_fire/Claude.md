The Prompt
Role: Senior Game Developer (HTML5/Canvas/Vanilla JavaScript) Project: Build a side-scrolling action game titled "Wings of Fire."

1. Technical Architecture
Container: A single index.html file containing HTML, CSS, and JS.

Engine: Use a requestAnimationFrame game loop with a Camera class for side-scrolling.

Assets: Generate pixel-art sprites using an off-screen canvas generator. Use distinct colors/shapes for different Dragon tribes and biomes.

2. Core Gameplay & Physics
Movement: Physics-based flight with 8-directional movement (WASD/Arrows), gravity, and horizontal friction.

Animation: Dragons must have wings that flap (using a Sine wave) with speed tied to velocity. Dragons should tilt up/down based on their vertical movement.

Lead Switch Mechanic: The player starts with a team of 3 dragons (Lead + 2 AI allies). When the Lead dragon dies, the player automatically assumes control of the next ally. Game Over only occurs when all 3 dragons are defeated.

Recharge Mechanic: Landing on a platform stops gravity and gradually refills the current dragon's HP.

3. Dragon Tribes & Abilities
Sky (Starting): Fast flight, fast fireball cooldown, low health.

Mud (Starting): High HP (200), slow speed, immune to Scavenger melee damage.

Sea (Starting): Balanced stats, breathes "Steam" (extra-large fireballs).

Ice (Unlock at Swamp): Blue fireballs that "freeze" enemies, slowing their movement for 3 seconds.

Night (Unlock at Snow): High speed, fireballs "pierce" and pass through multiple enemies.

4. Level Design & Biomes
Progression: 5 Levels (Forest, Swamp, Mountains, Snowy Mountains, Volcano).

Parallax Background: Implement at least two background layers (hills/clouds) moving at 10% and 40% of the player's speed to create depth.

Platforms: Procedurally generate platforms with biome-specific colors.

Boss Fight (Level 3): At the end of the Mountains, spawn a Scavenger Mountain Fortress. It is a stationary boss with 1000 HP, a visible top-screen Health Bar, and multiple turrets firing red projectiles.

5. Combat & AI
Player Attack: Fire projectiles with Spacebar based on the dragon's tribe ability.

Collectibles: Randomly spawn Health Hearts (restore HP) and Fire Orbs (temporary Triple-Shot power-up) on platforms.

Enemies:

Scavengers: Ground-based humans on platforms. They swing swords (melee damage) if the player is close.

Enemy Dragons: Red-colored dragons that fly idly until the player enters a detection radius, then "hunt" the player and fire projectiles.

6. UI & State Management
Start Screen: A character select menu where the player picks their initial Lead Dragon.

Unlock System: Use localStorage to save unlocked tribes when a player clears a biome.

HUD: Display Current HP, remaining Dragon Squad count, and Biome name.

Transitions: A 1.5-second "Entering [Biome]..." overlay when moving between levels.
