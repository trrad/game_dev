// src/test-state-history-simple.ts - Fixed with minimal scene

import { StateHistory } from './engine/core/StateHistory';
import { NetworkReactiveEntity } from './engine/networking/NetworkReactiveEntity';
import { EntityFactory } from './engine/core/EntityFactory';
import { Vector3, Engine, Scene, NullEngine } from '@babylonjs/core';
import { GameWorld } from './game/systems/GameWorld'; // ADD THIS

// Import from the proper location
import { ClientBall } from './game/entities/Ball/Ball.client';
import { ServerBall } from './game/entities/Ball/Ball.server';
import './game/entities/Ball'; // This registers the entity with the factory

/**
 * Create a minimal scene for testing (no rendering)
 */
function createTestScene(): Scene {
    // NullEngine is perfect for headless/testing scenarios
    const engine = new NullEngine();
    const scene = new Scene(engine);
    console.log('📋 Created test scene with NullEngine');
    return scene;
}

/**
 * Simple test to verify state history works with your existing code
 */
function testWithExistingEntities() {
    console.log('🧪 Testing State History with your existing entities...\n');
    
    // Create a test scene
    const testScene = createTestScene();
    
    // Enable state history
    NetworkReactiveEntity.enableStateHistory(1000);
    
    // Create entities using your existing code
    const serverRole = { isClient: false, isServer: true };
    const clientRole = { isClient: true, isServer: false };
    
    // Now we can create entities with a valid scene
    const serverBall = new ServerBall(
        'test_ball_server',
        testScene, // Valid scene
        serverRole,
        new Vector3(0, 0, 0)
    );
    
    const clientBall = EntityFactory.create(
        'ball',
        'test_ball_client',
        testScene, // Valid scene
        clientRole,
        new Vector3(5, 0, 0)
    ) as ClientBall;
    
    console.log('✅ Created test entities\n');
    
    // Test 1: Move entities and verify history
    console.log('Test 1: Recording position changes');
    
    const positions = [
        new Vector3(5, 0, 0),
        new Vector3(10, 0, 5),
        new Vector3(15, 0, 10)
    ];
    
    const timestamps: number[] = [];
    
    // Move server ball at different times
    positions.forEach((pos, i) => {
        setTimeout(() => {
            const timestamp = Date.now();
            timestamps.push(timestamp);
            
            console.log(`T+${i * 100}ms: Moving server ball to ${formatVector(pos)}`);
            serverBall.moveTo(pos, 'test_move');
            
            // After all moves, test history
            if (i === positions.length - 1) {
                setTimeout(() => testHistoryQueries(), 50);
            }
        }, i * 100);
    });
    
    function testHistoryQueries() {
        console.log('\nTest 2: Querying historical positions');
        
        // Get current position
        const currentPos = serverBall.getVectorProperty('position')?.getValue();
        console.log(`Current position: ${formatVector(currentPos)}`);
        
        // Query position 150ms ago
        const historicalState = serverBall.getStateAt(Date.now() - 150);
        const historicalPos = historicalState.get('position');
        console.log(`Position 150ms ago: ${formatVector(historicalPos)}`);
        
        // Test rewind
        console.log('\nTest 3: Testing rewind');
        const beforeRewind = serverBall.getVectorProperty('position')?.getValue();
        console.log(`Before rewind: ${formatVector(beforeRewind)}`);
        
        serverBall.rewindToTime(Date.now() - 200);
        
        const afterRewind = serverBall.getVectorProperty('position')?.getValue();
        console.log(`After rewind: ${formatVector(afterRewind)}`);
        
        // Test other properties
        console.log('\nTest 4: Testing other reactive properties');
        
        // Change color state over time
        setTimeout(() => serverBall.cycleColor('test1'), 0);
        setTimeout(() => serverBall.cycleColor('test2'), 50);
        setTimeout(() => {
            const colorNow = serverBall.getNumericProperty('colorState')?.getValue();
            const oldColorState = serverBall.getPropertyAt('colorState', Date.now() - 100);
            console.log(`Color now: ${colorNow}, Color 100ms ago: ${oldColorState}`);
            
            // Show stats
            const stats = serverBall.getStateHistoryStats();
            console.log('\n📊 State History Stats:', stats);
            
            // Test lag compensation scenario
            testLagCompensationScenario();
        }, 100);
    }
    
    function testLagCompensationScenario() {
        console.log('\nTest 5: Simulating lag compensation scenario');
        
        // Simulate: Client clicks at T=0, server receives at T=100ms
        const clientClickTime = Date.now() - 100;
        const currentServerTime = Date.now();
        
        console.log(`Client clicked at: ${clientClickTime}`);
        console.log(`Server processing at: ${currentServerTime}`);
        console.log(`Lag: ${currentServerTime - clientClickTime}ms`);
        
        // Get server ball state at click time
        const stateAtClick = serverBall.getStateAt(clientClickTime);
        const posAtClick = stateAtClick.get('position');
        console.log(`Server position when client clicked: ${formatVector(posAtClick)}`);
        
        // Simulate what GameWorld would do
        console.log('\nSimulating GameWorld lag compensation:');
        
        // 1. Save current state
        const currentState = serverBall.getCurrentState();
        console.log(`1. Current server state saved`);
        
        // 2. Rewind to click time
        serverBall.rewindToTime(clientClickTime);
        console.log(`2. Rewound to click time: position = ${formatVector(serverBall.getPosition())}`);
        
        // 3. Apply the click (move to new position)
        const clickTarget = new Vector3(20, 0, 20);
        serverBall.moveTo(clickTarget, 'lag_compensated_click');
        console.log(`3. Applied click: moveTo ${formatVector(clickTarget)}`);
        
        // 4. Fast-forward would happen here (simplified - just show final position)
        console.log(`4. Fast-forward simulation would run here`);
        
        console.log('\n✅ All tests complete!');
        
        // Cleanup
        serverBall.dispose();
        clientBall.dispose();
        testScene.dispose();
    }
}

function formatVector(v: Vector3 | undefined): string {
    if (!v) return 'undefined';
    return `(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)})`;
}

// Also test the raw StateHistory class
function testRawStateHistory() {
    console.log('\n🧪 Testing raw StateHistory class...\n');
    
    const history = new StateHistory(500); // 500ms buffer
    
    // Record some changes
    const now = Date.now();
    history.record('health', 100, now - 400);
    history.record('health', 80, now - 300);
    history.record('health', 60, now - 200);
    history.record('health', 90, now - 100);
    history.record('health', 100, now);
    
    // Test queries
    console.log('Health timeline:');
    console.log(`400ms ago: ${history.getPropertyAt('health', now - 400)}`);
    console.log(`250ms ago: ${history.getPropertyAt('health', now - 250)}`);
    console.log(`50ms ago: ${history.getPropertyAt('health', now - 50)}`);
    console.log(`Now: ${history.getPropertyAt('health', now)}`);
    
    // Test state at different times
    const state250msAgo = history.getStateAt(now - 250);
    console.log(`\nComplete state 250ms ago:`, Object.fromEntries(state250msAgo));
    
    // Test cleanup (old entries should be gone)
    const veryOldHealth = history.getPropertyAt('health', now - 600);
    console.log(`\n600ms ago (outside buffer): ${veryOldHealth}`);
    
    // Test performance with many properties
    console.log('\nTest: Multiple properties');
    history.record('position', { x: 0, y: 0, z: 0 }, now - 100);
    history.record('velocity', { x: 1, y: 0, z: 0 }, now - 100);
    history.record('rotation', { x: 0, y: 45, z: 0 }, now - 100);
    
    const multiState = history.getStateAt(now - 100);
    console.log('State with multiple properties:', Object.fromEntries(multiState));
    
    // Show stats
    const stats = history.getStats();
    console.log('\n📊 Raw StateHistory Stats:', stats);
    
    console.log('\n✅ Raw StateHistory test complete!');
}

// Also test Vector3 cloning
function testVector3Cloning() {
    console.log('\n🧪 Testing Vector3 cloning in StateHistory...\n');
    
    const history = new StateHistory(1000);
    const originalVector = new Vector3(1, 2, 3);
    
    // Record the vector
    history.record('position', originalVector, Date.now());
    
    // Modify the original
    originalVector.x = 999;
    
    // Retrieve from history
    const retrievedVector = history.getPropertyAt('position', Date.now());
    
    console.log(`Original (modified): ${formatVector(originalVector)}`);
    console.log(`Retrieved from history: ${formatVector(retrievedVector)}`);
    console.log(`Cloning works: ${retrievedVector.x === 1 ? '✅' : '❌'}`);
}

// Add this diagnostic test to see what's happening

async function diagnoseStateHistoryIssue() {
    console.log('\n🔬 DIAGNOSING STATE HISTORY AND REPLAY\n');
    
    const engine = new NullEngine();
    const scene = new Scene(engine);
    
    // Enable state history with debug
    NetworkReactiveEntity.enableStateHistory(2000);
    
    // Create a simple ball
    const ball = EntityFactory.create(
        'ball',
        'debug_ball',
        scene,
        { isClient: false, isServer: true },
        Vector3.Zero()
    ) as any; // as any to access internals
    
    console.log('1️⃣ Initial state check:');
    console.log(`  Position: ${formatVector(ball.getPosition())}`);
    console.log(`  Has updateGameLogic: ${typeof ball.updateGameLogic}`);
    console.log(`  Is moving: ${ball.isMoving()}`);
    
    // Make a move
    const target = new Vector3(5, 0, 0);
    ball.moveTo(target, 'debug_move');
    
    console.log('\n2️⃣ After moveTo:');
    console.log(`  Target position: ${formatVector(ball.getVectorProperty('targetPosition')?.getValue())}`);
    console.log(`  Is moving: ${ball.isMoving()}`);
    console.log(`  Current position: ${formatVector(ball.getPosition())}`);
    
    // Manually call updateGameLogic to see if movement works
    console.log('\n3️⃣ Manually updating game logic:');
    for (let i = 0; i < 5; i++) {
        ball.updateGameLogic(0.1); // 100ms steps
        console.log(`  Step ${i + 1}: position = ${formatVector(ball.getPosition())}`);
    }
    
    // Check state history
    console.log('\n4️⃣ State history check:');
    const now = Date.now();
    const historicalState = ball.getStateAt(now - 100);
    console.log(`  State 100ms ago has ${historicalState.size} entries`);
    historicalState.forEach((value, key) => {
        console.log(`    ${key}: ${JSON.stringify(value)}`);
    });
    
    // Test with GameWorld
    console.log('\n5️⃣ Testing with GameWorld:');
    const world = new GameWorld(scene);
    world.addEntity(ball);
    
    // Reset position
    ball.getVectorProperty('position')?.set(Vector3.Zero(), 'reset');
    ball.moveTo(new Vector3(3, 0, 0), 'world_test');
    
    console.log('  Before update: ' + formatVector(ball.getPosition()));
    
    // Manually trigger world update
    world.update(0.1);
    console.log('  After world.update(0.1): ' + formatVector(ball.getPosition()));
    
    // Test the actual tick system
    console.log('\n6️⃣ Testing tick system:');
    world.registerSystem('gameLogic', () => {
        console.log('    gameLogic tick fired!');
    });
    
    // Run a few updates to see if ticks fire
    for (let i = 0; i < 10; i++) {
        world.update(0.016); // 16ms updates
    }
    
    // Clean up
    ball.dispose();
    world.dispose();
    scene.dispose();
    engine.dispose();
}

// Also, let's check if the movement calculation is working at all
function testMovementMath() {
    console.log('\n🧮 Testing movement math:');
    
    const current = new Vector3(0, 0, 0);
    const target = new Vector3(5, 0, 0);
    const speed = 3.0;
    const deltaTime = 0.1;
    
    const direction = target.subtract(current);
    const distance = direction.length();
    const movement = direction.normalize().scale(speed * deltaTime);
    
    console.log(`  Current: ${formatVector(current)}`);
    console.log(`  Target: ${formatVector(target)}`);
    console.log(`  Distance: ${distance}`);
    console.log(`  Movement per step: ${formatVector(movement)}`);
    console.log(`  Steps to reach target: ${Math.ceil(distance / (speed * deltaTime))}`);
}

// Run diagnostic
async function runDiagnostics() {
    testMovementMath();
    await diagnoseStateHistoryIssue();
}

runDiagnostics().catch(console.error);

// Run tests
console.log(`
🧪 STATE HISTORY TESTS
======================
Testing state history and lag compensation readiness...
`);

// Main test runner
async function runAllTests() {
    // First run basic tests
    testRawStateHistory();
    console.log('\n---\n');
    
    testVector3Cloning();
    console.log('\n---\n');
    
    // Run diagnostics before the complex tests
    await runDiagnostics();
    console.log('\n---\n');
    
    // Then run the existing entity tests if diagnostics pass
    // Comment this out for now to focus on diagnostics
    // setTimeout(testWithExistingEntities, 100);
}

// Execute
runAllTests().catch(console.error);