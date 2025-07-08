export interface TickFrequencyConfig {
    // Visual/Client frequencies
    rendering: number;        // 60 Hz - smooth visuals
    clientEffects: number;    // 30 Hz - visual effects, particles
    clientInput: number;      // 60 Hz - responsive input
    
    // Logic/Server frequencies  
    gameLogic: number;        // 20 Hz - main game state updates
    networkSync: number;      // 20 Hz - property synchronization
    spatial: number;          // 10 Hz - proximity checks, collision
    
    // Occasional frequencies
    healthRegen: number;      // 0.5 Hz - health regeneration
    cleanup: number;          // 0.1 Hz - memory cleanup, garbage collection
}

export const DEFAULT_TICK_FREQUENCIES: TickFrequencyConfig = {
    // High frequency (smooth experience)
    rendering: 60,           // 16.67ms - buttery smooth
    clientEffects: 30,       // 33.33ms - smooth effects
    clientInput: 60,         // 16.67ms - responsive input
    
    // Medium frequency (game logic)
    gameLogic: 20,           // 50ms - responsive gameplay
    networkSync: 20,         // 50ms - timely multiplayer updates
    spatial: 10,             // 100ms - adequate spatial awareness
    
    // Low frequency (background tasks)
    healthRegen: 0.5,        // 2000ms - slow regeneration
    cleanup: 0.1             // 10000ms - occasional cleanup
};