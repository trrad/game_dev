import { Game } from "./entities/Game";

// The App class (in app.ts) is now responsible for world state and rendering.
// The Game class handles ticks and event stack.
// No test events or simulated votes here; use App for integration.

// Expose for debugging
// (App will instantiate and use Game)
globalThis.Game = Game;
