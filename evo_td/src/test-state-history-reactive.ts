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
async function testReactiveStateHistoryFixed() {
    console.log('🧪 Testing State History through Reactive Properties (FIXED)\n');
    
    // Setup
    const engine = new NullEngine();
    const scene = new Scene(engine);
    NetworkReactiveEntity.enableStateHistory(2000); // 2 second buffer
    
    // Create a server ball
    const serverBall = EntityFactory.create(
        'ball',
        'test_ball_fixed',
        scene,
        { isClient: false, isServer: true },
        Vector3.Zero()
    );
    
    console.log('✅ Created server ball with state history enabled\n');
    
    // Test 1: Record actual position changes (not just target changes)
    console.log('Test 1: Recording actual position movements');
    
    const movements = [
        { target: new Vector3(2, 0, 0), steps: 3 },
        { target: new Vector3(4, 0, 2), steps: 3 },
        { target: new Vector3(6, 0, 4), steps: 3 },
        { target: new Vector3(8, 0, 6), steps: 3 }
    ];
    
    const recordedTimestamps: number[] = [];
    const recordedPositions: Vector3[] = [];
    
    // Track actual position changes
    serverBall.getVectorProperty('position')?.onChange((event) => {
        recordedTimestamps.push(event.timestamp || Date.now());
        recordedPositions.push(event.to.clone());
        console.log(`📍 Position recorded: ${formatVector(event.to)} at ${event.timestamp || Date.now()}`);
    });
    
    // Execute movements with actual position updates
    for (let i = 0; i < movements.length; i++) {
        const movement = movements[i];
        
        console.log(`\n--- Movement ${i + 1}: Target ${formatVector(movement.target)} ---`);
        
        // Set target
        serverBall.moveTo(movement.target, `movement_${i + 1}`);
        
        // Actually move the entity by calling updateGameLogic multiple times
        for (let step = 0; step < movement.steps; step++) {
            await sleep(50); // Small delay between steps
            serverBall.updateGameLogic(0.1);
            console.log(`  Step ${step + 1}: ${formatVector(serverBall.getPosition())}`);
        }
        
        console.log(`  Final position: ${formatVector(serverBall.getPosition())}`);
        await sleep(100); // Pause between movements
    }
    
    // Test 2: Query historical positions using recorded timestamps
    console.log('\n📊 Test 2: Querying historical positions (FIXED)');
    console.log(`Recorded ${recordedTimestamps.length} position changes`);
    
    // Query using actual recorded timestamps
    recordedTimestamps.forEach((timestamp, i) => {
        const state = serverBall.getStateAt(timestamp);
        const position = state.get('position');
        console.log(`  T${i + 1} (${timestamp}): ${formatVector(position)} (recorded: ${formatVector(recordedPositions[i])})`);
    });
    
    // Test 3: Query between recorded timestamps
    console.log('\n🔍 Test 3: Querying between recorded timestamps');
    if (recordedTimestamps.length >= 2) {
        const midTime = Math.floor((recordedTimestamps[0] + recordedTimestamps[1]) / 2);
        const midState = serverBall.getStateAt(midTime);
        const midPosition = midState.get('position');
        console.log(`  Between T1 and T2 (${midTime}): ${formatVector(midPosition)}`);
        console.log(`  Expected: Should be T1 position (${formatVector(recordedPositions[0])})`);
    }
    
    // Test 4: Test time-relative queries  
    console.log('\n⏰ Test 4: Time-relative queries');
    const now = Date.now();
    
    // Only query within reasonable time ranges
    const queryOffsets = [100, 200, 500, 1000];
    queryOffsets.forEach(msAgo => {
        const queryTime = now - msAgo;
        
        // Check if this query time is within our recorded range
        const inRange = recordedTimestamps.some(t => Math.abs(t - queryTime) < 100);
        
        const state = serverBall.getStateAt(queryTime);
        const position = state.get('position');
        
        console.log(`  ${msAgo}ms ago (${queryTime}): ${formatVector(position)} ${inRange ? '✅' : '(out of range)'}`);
    });
    
    // Show statistics
    const stats = serverBall.getStateHistoryStats();
    console.log('\n📊 Final State History Stats:', {
        ...stats,
        recordingsPerProperty: Math.floor(stats.totalRecorded / 5), // We have 5 synced properties
        timeSpan: `${stats.newestEntry - stats.oldestEntry}ms`
    });
    
    // Cleanup
    serverBall.dispose();
    scene.dispose();
    engine.dispose();
    
    console.log('\n✅ State History test completed with actual movement!');
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

export function testMovementAfterFix() {
    console.log('\n🧪 Testing movement after inheritance fix...\n');
    
    const engine = new NullEngine();
    const scene = new Scene(engine);
    NetworkReactiveEntity.enableStateHistory(2000);
    
    const ball = new ServerBall(
        'test_fixed_ball',
        scene,
        { isClient: false, isServer: true },
        Vector3.Zero()
    );
    
    console.log('✅ Ball created, testing movement...\n');
    
    // Set target
    ball.moveTo(new Vector3(5, 0, 0), 'fix_test');
    console.log(`Target set: ${formatVector(ball.getVectorProperty('targetPosition')?.getValue())}`);
    console.log(`Is moving: ${ball.isMoving()}\n`);
    
    // Test updateGameLogic calls - should now see internal logs
    console.log('🔄 Calling updateGameLogic - should see internal logs now:');
    for (let i = 0; i < 3; i++) {
        console.log(`\n--- Update ${i + 1} ---`);
        ball.updateGameLogic(0.1);
        const pos = ball.getPosition();
        console.log(`Position after update: ${formatVector(pos)}`);
        
        // Stop if we see movement
        if (pos.x > 0) {
            console.log('🎉 SUCCESS: Movement detected!');
            break;
        }
    }
    
    // Cleanup
    ball.dispose();
    scene.dispose();
    engine.dispose();
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
    await testReactiveStateHistoryFixed();
    await testStateHistoryPerformance();
    
    console.log('\n✅ All tests complete!\n');
}
runAllTests().catch(console.error);