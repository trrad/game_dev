/**
 * Scene Graph Event System Example
 * Demonstrates hierarchical event propagation and spatial events
 */

import { Scene, Engine, Vector3 } from '@babylonjs/core';
import { SceneNodeComponent } from '../engine/scene/SceneNodeComponent';
import { SceneEvents } from '../engine/scene/SceneGraphEventSystem';
import { RadiusComponent } from '../components/RadiusComponent';
import { GameObject } from '../engine/core/GameObject';

/**
 * Example: Train Car Communication
 * Shows how train cars can communicate hierarchically
 */
export function demonstrateTrainCarCommunication(scene: Scene) {
    // Create train hierarchy
    const train = new GameObject('Train', undefined, scene);
    const trainNode = new SceneNodeComponent(scene);
    train.addComponent(trainNode);
    
    // Create engine car
    const engineCar = new GameObject('TrainCar', undefined, scene);
    const engineNode = new SceneNodeComponent(scene, trainNode);
    engineCar.addComponent(engineNode);
    
    // Create passenger car
    const passengerCar = new GameObject('TrainCar', undefined, scene);
    const passengerNode = new SceneNodeComponent(scene, trainNode);
    passengerCar.addComponent(passengerNode);
    
    // Set up positions
    trainNode.setLocalPosition(0, 0, 0);
    engineNode.setLocalPosition(-5, 0, 0);  // Engine in front
    passengerNode.setLocalPosition(5, 0, 0); // Passenger behind
    
    // Set up event listeners
    
    // Engine car emits power changes
    engineNode.addEventListener('power:changed', (event) => {
        console.log(`Engine car received power change: ${event.payload.newPower}`);
    });
    
    // Passenger car listens for power changes from siblings
    passengerNode.addEventListener('power:changed', (event) => {
        console.log(`Passenger car received power change: ${event.payload.newPower}`);
        
        // React to power change
        if (event.payload.newPower < 100) {
            console.log('Passenger car: Insufficient power, reducing services');
        }
    });
    
    // Train listens for damage reports from cars
    trainNode.addEventListener('car:damaged', (event) => {
        console.log(`Train received damage report from car ${event.payload.carId}: ${event.payload.damage} damage`);
        
        // Train can coordinate response
        if (event.payload.healthRemaining < 50) {
            console.log('Train: Car critically damaged, requesting repair');
            trainNode.emitToChildren('repair:request', { priority: 'high' });
        }
    });
    
    // Simulate events
    console.log('\\n=== Train Car Communication Demo ===');
    
    // Engine broadcasts power change to all siblings
    engineNode.emitToSiblings('power:changed', { newPower: 150, efficiency: 0.8 });
    
    // Passenger car reports damage to parent train
    passengerNode.emitToParent('car:damaged', {
        carId: 'passenger',
        damage: 75,
        healthRemaining: 25
    });
}

/**
 * Example: Spatial Event Detection
 * Shows how enemies can detect nearby trains using radius events
 */
export function demonstrateSpatialDetection(scene: Scene) {
    console.log('\\n=== Spatial Detection Demo ===');
    
    // Create train
    const train = new GameObject('Train', undefined, scene);
    const trainNode = new SceneNodeComponent(scene);
    const trainRadius = new RadiusComponent(10, 'interaction'); // 10 unit interaction radius
    train.addComponent(trainNode);
    train.addComponent(trainRadius);
    trainNode.setLocalPosition(0, 0, 0);
    
    // Create enemy
    const enemy = new GameObject('Enemy', undefined, scene);
    const enemyNode = new SceneNodeComponent(scene);
    const enemyDetection = new RadiusComponent(15, 'detection'); // 15 unit detection radius
    enemy.addComponent(enemyNode);
    enemy.addComponent(enemyDetection);
    enemyNode.setLocalPosition(12, 0, 0); // 12 units away from train
    
    // Set up detection system
    enemyNode.addEventListener('proximity:entered', (event) => {
        console.log(`Enemy detected target: ${event.payload.target?.gameObject?.type}`);
        console.log(`Distance: ${event.distance?.toFixed(2)} units`);
        
        if (event.payload.target?.gameObject?.type === 'Train') {
            console.log('Enemy: Targeting train for attack');
        }
    });
    
    // Enemy periodically scans for targets
    enemyDetection.emitToRadius('proximity:check', {
        source: enemy,
        timestamp: Date.now()
    }, {
        radiusType: 'interaction',
        excludeSelf: true
    });
    
    // Simulate train moving closer
    console.log('\\nTrain moves closer...');
    trainNode.setLocalPosition(5, 0, 0); // Now 7 units away - within detection range
    
    enemyDetection.emitToRadius('proximity:check', {
        source: enemy,
        timestamp: Date.now()
    }, {
        radiusType: 'interaction',
        excludeSelf: true
    });
}

/**
 * Example: Explosion with Radius Damage
 * Shows spatial event targeting for area-of-effect damage
 */
export function demonstrateExplosionDamage(scene: Scene) {
    console.log('\\n=== Explosion Damage Demo ===');
    
    // Create several entities
    const entities = [];
    for (let i = 0; i < 5; i++) {
        const entity = new GameObject('Vehicle', undefined, scene);
        const node = new SceneNodeComponent(scene);
        const radius = new RadiusComponent(2, 'collision');
        
        entity.addComponent(node);
        entity.addComponent(radius);
        
        // Random positions in a 20x20 area
        node.setLocalPosition(
            (Math.random() - 0.5) * 20,
            0,
            (Math.random() - 0.5) * 20
        );
        
        // Set up damage listener
        node.addEventListener('explosion', (event) => {
            const damage = event.payload.damage;
            const distance = event.distance || 0;
            const actualDamage = Math.max(0, damage - distance * 2); // Damage falloff
            
            console.log(`${entity.id} took ${actualDamage.toFixed(1)} damage (distance: ${distance.toFixed(1)})`);
        });
        
        entities.push(entity);
    }
    
    // Create explosion at center
    const explosionCenter = new Vector3(0, 0, 0);
    console.log('\\nExplosion at center!');
    
    SceneEvents.emitToRadius('explosion', {
        damage: 100,
        center: explosionCenter
    }, explosionCenter, 15, (node) => {
        // Only affect entities with collision radius
        return node.gameObject?.getComponent('radius') !== undefined;
    });
}

/**
 * Run all demonstrations
 */
export function runSceneGraphEventDemo(scene: Scene) {
    console.log('🎮 Scene Graph Event System Demonstration\\n');
    
    demonstrateTrainCarCommunication(scene);
    demonstrateSpatialDetection(scene);
    demonstrateExplosionDamage(scene);
    
    console.log('\\n✅ Scene Graph Event System Demo Complete!');
}
