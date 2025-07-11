// src/test-state-history-reactive.ts - Testing through reactive properties

import { Engine, Scene, NullEngine, Vector3 } from '@babylonjs/core';
import { NetworkReactiveEntity } from './engine/networking/NetworkReactiveEntity';
import { EntityFactory } from './engine/core/EntityFactory';
import { GameWorld } from './game/systems/GameWorld';
import { ServerBall } from './game/entities/Ball/Ball.server';
import { ClientBall } from './game/entities/Ball/Ball.client';  // Good to have both
import './game/entities/Ball'; // Register entity

async function diagnoseMovementIssue() {
    console.log('\n🔬 DIAGNOSING MOVEMENT AND STATE HISTORY\n');
    
    const engine = new NullEngine();
    const scene = new Scene(engine);
    
    // Enable state history
    NetworkReactiveEntity.enableStateHistory(2000);
    
    // Create a server ball directly
    const ball = new ServerBall(
        'diagnostic_ball',
        scene,
        { isClient: false, isServer: true },
        Vector3.Zero()
    );
    
    console.log('1️⃣ Initial state:');
    console.log(`  Position: ${formatVector(ball.getPosition())}`);
    console.log(`  Has updateGameLogic: ${typeof ball.updateGameLogic}`);
    console.log(`  Speed: ${ball.getNumericProperty('moveSpeed')?.getValue()}`);
    
    // Move and immediately check
    console.log('\n2️⃣ After moveTo:');
    ball.moveTo(new Vector3(5, 0, 0), 'test');
    console.log(`  Target: ${formatVector(ball.getVectorProperty('targetPosition')?.getValue())}`);
    console.log(`  Is moving: ${ball.isMoving()}`);
    console.log(`  Position: ${formatVector(ball.getPosition())}`);
    
    // Manual update test
    console.log('\n3️⃣ Manual updateGameLogic calls:');
    for (let i = 0; i < 5; i++) {
        ball.updateGameLogic(0.1); // 100ms steps
        const pos = ball.getPosition();
        console.log(`  Step ${i+1}: position = ${formatVector(pos)}`);
        if (pos.x > 0) break; // Stop if we see movement
    }
    
    // Check what's in state history
    console.log('\n4️⃣ State history contents:');
    const state = ball.getCurrentState();
    console.log(`  Current state has ${state.size} properties:`);
    state.forEach((value, key) => {
        if (value instanceof Vector3) {
            console.log(`    ${key}: ${formatVector(value)}`);
        } else {
            console.log(`    ${key}: ${value}`);
        }
    });
    
    // Test GameWorld integration
    console.log('\n5️⃣ Testing with GameWorld:');
    const world = new GameWorld(scene);
    world.addEntity(ball);
    
    // Reset and test
    ball.getVectorProperty('position')?.set(Vector3.Zero(), 'reset');
    ball.moveTo(new Vector3(3, 0, 0), 'world_test');
    
    console.log('  Before world.update: ' + formatVector(ball.getPosition()));
    
    // Multiple updates to accumulate time
    for (let i = 0; i < 10; i++) {
        world.update(0.05); // 50ms updates
    }
    
    console.log('  After 10 world updates: ' + formatVector(ball.getPosition()));
    
    // Cleanup
    ball.dispose();
    world.dispose();
    scene.dispose();
    engine.dispose();
}

/**
 * Test state history through actual reactive property changes
 */
async function testReactiveStateHistory() {
    console.log('🧪 Testing State History through Reactive Properties\n');
    
    // Setup
    const engine = new NullEngine();
    const scene = new Scene(engine);
    
    // Enable state history BEFORE creating entities
    NetworkReactiveEntity.enableStateHistory(2000); // 2 second buffer
    
    // Create a server ball
    const serverBall = EntityFactory.create(
        'ball',
        'test_ball',
        scene,
        { isClient: false, isServer: true },
        Vector3.Zero()
    );
    
    console.log('✅ Created server ball with state history enabled\n');
    
    // Test 1: Make small movements that won't be rejected
    console.log('Test 1: Recording valid movements');
    const movements = [
        { pos: new Vector3(2, 0, 0), delay: 100 },
        { pos: new Vector3(4, 0, 2), delay: 200 },
        { pos: new Vector3(6, 0, 4), delay: 300 },
        { pos: new Vector3(8, 0, 6), delay: 400 }
    ];
    
    // Record movements with timestamps
    const moveTimestamps: number[] = [];
    
    for (const move of movements) {
        await sleep(move.delay);
        const timestamp = Date.now();
        moveTimestamps.push(timestamp);
        
        serverBall.moveTo(move.pos, 'test_movement');
        console.log(`  Moved to ${formatVector(move.pos)} at T+${move.delay}ms`);
        
        // Give reactive system time to process
        await sleep(50);
    }
    
    // Test 2: Query historical positions
    console.log('\nTest 2: Querying historical positions');
    const now = Date.now();
    
    // Query at different points in the past
    const queryTimes = [100, 300, 500, 700];
    for (const msAgo of queryTimes) {
        const historicalState = serverBall.getStateAt(now - msAgo);
        const pos = historicalState.get('position');
        console.log(`  ${msAgo}ms ago: position = ${formatVector(pos)}`);
    }
    
    // Test 3: Verify reactive properties triggered recording
    const stats = serverBall.getStateHistoryStats();
    console.log('\n📊 State History Stats:', {
        ...stats,
        recordingsPerProperty: Math.floor(stats.totalRecorded / 5) // We have 5 synced properties
    });
    
    // Test 4: Test actual lag compensation scenario
    await testLagCompensationWithGameWorld(scene);
    
    // Cleanup
    serverBall.dispose();
    scene.dispose();
    engine.dispose();
}

/**
 * Test lag compensation with GameWorld
 */
async function testLagCompensationWithGameWorld(scene: Scene) {
    console.log('\n🎮 Test 3: Lag Compensation with GameWorld\n');
    
    // Create game world
    const world = new GameWorld(scene);
    
    // Create entities
    const serverBall = EntityFactory.create(
        'ball',
        'server_ball_lagcomp',
        scene,
        { isClient: false, isServer: true },
        new Vector3(0, 0, 0)
    );
    
    const clientBall = EntityFactory.create(
        'ball',
        'client_ball_lagcomp',
        scene,
        { isClient: true, isServer: false },
        new Vector3(0, 0, 0)
    );
    
    world.addEntity(serverBall);
    console.log('✅ Created entities in GameWorld\n');
    
    // Simulate gameplay
    console.log('Simulating player movement with 100ms lag:');
    
    // Move server ball to establish history
    serverBall.moveTo(new Vector3(3, 0, 0), 'setup');
    await sleep(200);
    
    // Client clicks at "T=0" (100ms ago from server's perspective)
    const clientClickTime = Date.now() - 100;
    const clickTarget = new Vector3(6, 0, 3); // Within 10 unit limit
    
    console.log(`  Client clicked at ${formatVector(clickTarget)} (100ms ago)`);
    console.log(`  Server position when client clicked: ${formatVector(serverBall.getPosition())}`);
    
    // Process with lag compensation
    world.processClientInput({
        timestamp: clientClickTime,
        sequenceId: 1,
        entityId: serverBall.getNetworkId(),
        action: 'moveTo',
        parameters: { target: clickTarget, source: 'client_click' },
        clientId: 'test_client'
    });
    
    console.log(`  Server position after lag compensation: ${formatVector(serverBall.getPosition())}`);
    
    // Show world stats
    console.log('\n📊 GameWorld Stats:', world.getStats());
    
    // Cleanup
    world.dispose();
}

/**
 * Test state history cleanup and performance
 */
async function testStateHistoryPerformance() {
    console.log('\n⚡ Test 4: State History Performance\n');
    
    const engine = new NullEngine();
    const scene = new Scene(engine);
    
    // Enable shorter history for cleanup test
    NetworkReactiveEntity.enableStateHistory(500); // 500ms buffer
    
    const ball = EntityFactory.create(
        'ball',
        'perf_test_ball',
        scene,
        { isClient: false, isServer: true },
        Vector3.Zero()
    );
    
    console.log('Making rapid movements to test recording performance...');
    
    // Rapid movements
    const startTime = Date.now();
    for (let i = 0; i < 20; i++) {
        ball.moveTo(new Vector3(Math.random() * 5, 0, Math.random() * 5), 'perf_test');
        ball.cycleColor('perf_test');
        await sleep(50);
    }
    const duration = Date.now() - startTime;
    
    const stats = ball.getStateHistoryStats();
    console.log(`  Made 40 property changes in ${duration}ms`);
    console.log(`  History stats:`, {
        totalRecorded: stats.totalRecorded,
        currentEntries: stats.currentEntries,
        cleanups: stats.totalCleanups,
        oldestAge: Date.now() - stats.oldestEntry,
        memoryUsage: `${(stats.memoryUsage / 1024).toFixed(1)}KB`
    });
    
    // Wait for cleanup
    console.log('\nWaiting for old entries to expire...');
    await sleep(600);
    
    const cleanedStats = ball.getStateHistoryStats();
    console.log(`  After cleanup:`, {
        currentEntries: cleanedStats.currentEntries,
        cleanups: cleanedStats.totalCleanups,
        entriesRemoved: stats.currentEntries - cleanedStats.currentEntries
    });
    
    // Cleanup
    ball.dispose();
    scene.dispose();
    engine.dispose();
}

// Utilities
function formatVector(v: Vector3 | undefined): string {
    if (!v) return 'undefined';
    return `(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)})`;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Then update your runAllTests function to include this:
async function runAllTests() {
    console.log(`
🧪 REACTIVE STATE HISTORY TESTS
================================
Testing state history through the reactive property system...
`);
    
    // Run diagnostic first
    await diagnoseMovementIssue();
    
    // Then run other tests
    await testReactiveStateHistory();
    await testStateHistoryPerformance();
    
    console.log('\n✅ All tests complete!\n');
}
runAllTests().catch(console.error);