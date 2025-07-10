// src/test-state-history-simple.ts - Minimal test that works with your current code

import { StateHistory } from './engine/core/StateHistory';
import { NetworkReactiveEntity } from './engine/networking/NetworkReactiveEntity';
import { Vector3 } from '@babylonjs/core';

// Import your existing Ball from ecs-app
import { ServerBall, ClientBall } from './ecs-app';

/**
 * Simple test to verify state history works with your existing code
 */
function testWithExistingEntities() {
    console.log('🧪 Testing State History with your existing entities...\n');
    
    // Enable state history
    NetworkReactiveEntity.enableStateHistory(1000);
    
    // Create entities using your existing code
    const serverRole = { isClient: false, isServer: true };
    const clientRole = { isClient: true, isServer: false };
    
    const serverBall = new ServerBall(
        'test_ball_server',
        null, // No scene for test
        serverRole,
        new Vector3(0, 0, 0)
    );
    
    const clientBall = new ClientBall(
        'test_ball_client',
        null,
        clientRole,
        new Vector3(0, 0, 0)
    );
    
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
        
        // Change color state
        serverBall.cycleColor('test');
        const colorNow = serverBall.getNumericProperty('colorState')?.getValue();
        
        // Query old color
        const oldColorState = serverBall.getPropertyAt('colorState', Date.now() - 100);
        console.log(`Color now: ${colorNow}, Color 100ms ago: ${oldColorState}`);
        
        // Show stats
        const stats = serverBall.getStateHistoryStats();
        console.log('\n📊 State History Stats:', stats);
        
        console.log('\n✅ All tests complete!');
        
        // Cleanup
        serverBall.dispose();
        clientBall.dispose();
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
    
    // Test cleanup (old entries should be gone)
    const veryOldHealth = history.getPropertyAt('health', now - 600);
    console.log(`600ms ago (outside buffer): ${veryOldHealth}`);
    
    console.log('\n✅ Raw StateHistory test complete!');
}

// Run tests
console.log(`
🧪 STATE HISTORY TESTS - Using Your Existing Code
================================================
Testing state history with your ServerBall and ClientBall...
`);

testRawStateHistory();
setTimeout(testWithExistingEntities, 100);