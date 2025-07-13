// src/game/entities/Ball/index.ts

import { EntityFactory } from '../../../engine/core/EntityFactory';

// Export schema
export { BALL_SCHEMA } from './Ball.schema';

// Export base class (for type references)
export { Ball } from './Ball.base';

// Export extensions based on build target
// These will be tree-shaken by webpack based on build configuration
export { ClientBall } from './Ball.client';
export { ServerBall } from './Ball.server';

// Import for registration
import { ClientBall } from './Ball.client';
import { ServerBall } from './Ball.server';

// Register Ball entity with factory
// In production builds, this registration will be conditional based on BUILD_TARGET
EntityFactory.registerEntity('ball', ClientBall, ServerBall);

// For debugging and testing
console.log('📦 Ball entity registered with EntityFactory');