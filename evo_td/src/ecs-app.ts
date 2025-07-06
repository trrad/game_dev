// src/ecs-app.ts - Updated Test Scene with New ReactiveProperty System

import { SceneManager } from "./engine/scene/SceneManager";
import { GameNodeObject } from "./engine/core/GameNodeObject";
import { RenderComponent } from "./engine/components/RenderComponent";
import { NodeComponent } from "./engine/components/NodeComponent";
import { RadiusComponent } from "./engine/components/RadiusComponent";
import { 
    ReactivePropertiesComponent,
    BooleanProperty,
    NumericProperty,
    EnumProperty,
    VectorProperty,
    CollectionProperty
} from "./engine/components/ReactivePropertyComponent";
import { ObservableFactory } from "./engine/scene/ObservableFactory";
import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";

function setupGameCanvasAndScene(id = "gameCanvas") {
    let canvas = document.getElementById(id) as HTMLCanvasElement | null;
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = id;
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        canvas.style.display = "block";
        document.body.appendChild(canvas);
    }
    const sceneManager = new SceneManager(canvas);
    sceneManager.handleResize();
    sceneManager.start();
    const rootNode = sceneManager.getRootNode();
    return { canvas, sceneManager, rootNode };
}

// Enhanced RenderComponent with reactive visual feedback
class ReactiveTestSphereRenderComponent extends RenderComponent {
    private color: string;
    private material?: StandardMaterial;
    private baseColor: Color3;
    
    constructor(scene: Scene, color: string = "#44aaff") {
        super(scene, {});
        this.color = color;
        this.baseColor = Color3.FromHexString(color);
    }
    
    protected createVisual(): void {
        this.mesh = MeshBuilder.CreateSphere("test_sphere", { diameter: 1 }, this.scene);
        
        // Parent mesh to NodeComponent's transform
        const nodeComponent = this._gameObject?.getComponent<NodeComponent>('Node');
        if (nodeComponent) {
            this.mesh.parent = nodeComponent.getTransformNode();
        }
        
        this.material = new StandardMaterial("test_sphere_mat", this.scene);
        this.material.diffuseColor = this.baseColor;
        this.mesh.material = this.material;
    }
    
    // React to health changes with color
    updateHealthColor(healthPercent: number): void {
        if (!this.material) return;
        
        if (healthPercent <= 0) {
            this.material.diffuseColor = Color3.Black(); // Dead
        } else if (healthPercent < 0.25) {
            this.material.diffuseColor = Color3.Red(); // Critical
        } else if (healthPercent < 0.5) {
            this.material.diffuseColor = Color3.Yellow(); // Low
        } else {
            this.material.diffuseColor = this.baseColor; // Normal
        }
    }
    
    // React to state changes with emissive effects
    updateStateGlow(state: string): void {
        if (!this.material) return;
        
        switch (state) {
            case 'moving':
                this.material.emissiveColor = Color3.Blue().scale(0.3);
                break;
            case 'attacking':
                this.material.emissiveColor = Color3.Red().scale(0.5);
                break;
            case 'defending':
                this.material.emissiveColor = Color3.Green().scale(0.3);
                break;
            default:
                this.material.emissiveColor = Color3.Black();
        }
    }
    
    // Flash effect for events
    flashColor(color: Color3, duration: number = 500): void {
        if (!this.material) return;
        
        const originalColor = this.material.diffuseColor.clone();
        this.material.diffuseColor = color;
        
        setTimeout(() => {
            if (this.material) {
                this.material.diffuseColor = originalColor;
            }
        }, duration);
    }
    
    protected updateVisual(): void {
        // Visual updates handled by reactive property observers
    }
    
    protected updatePosition(): void {
        // Position handled by reactive NodeComponent
    }
}

// Comprehensive test entity demonstrating all reactive property types
class ReactiveTestEntity extends GameNodeObject {
    private properties: ReactivePropertiesComponent;
    private cleanupFunctions: (() => void)[] = [];
    
    // Strongly typed property references
    public readonly health: NumericProperty;
    public readonly armor: NumericProperty;
    public readonly speed: NumericProperty;
    public readonly isAlive: BooleanProperty;
    public readonly canMove: BooleanProperty;
    public readonly unitState: EnumProperty<'idle' | 'moving' | 'attacking' | 'defending' | 'dead'>;
    public readonly combatState: EnumProperty<'peaceful' | 'alert' | 'combat'>;
    public readonly inventory: CollectionProperty<InventoryItem>;
    
    constructor(name: string, scene: Scene, parentNode?: any, color?: string) {
        super("reactive-test-entity", scene, parentNode);
        
        if (this.node && typeof this.node.getTransformNode === "function") {
            this.node.getTransformNode().name = name;
        }
        
        // Create unified properties component
        this.properties = new ReactivePropertiesComponent();
        this.addComponent(this.properties);
        
        // Add render component
        const render = new ReactiveTestSphereRenderComponent(scene, color);
        this.addComponent(render);
        
        // Add collision radius for spatial tracking
        const radius = new RadiusComponent(1.5, 'collision');
        this.addComponent(radius);
        
        // ✅ DEMONSTRATION: Create all specialized property types using direct constructors
        
        // Numeric properties with bounds and thresholds
        this.health = new NumericProperty('health', 100, 0, 100);
        this.armor = new NumericProperty('armor', 50, 0, 100);
        this.speed = new NumericProperty('speed', 0, 0, 10);
        
        // Boolean properties
        this.isAlive = new BooleanProperty('is_alive', true);
        this.canMove = new BooleanProperty('can_move', true);
        
        // Enum properties with validation
        this.unitState = new EnumProperty('unit_state', 'idle', ['idle', 'moving', 'attacking', 'defending', 'dead']);
        this.combatState = new EnumProperty('combat_state', 'peaceful', ['peaceful', 'alert', 'combat']);
        
        // Collection property for inventory
        this.inventory = new CollectionProperty<InventoryItem>('inventory');
        
        // Add all properties to unified component
        this.properties.addProperty(this.health);
        this.properties.addProperty(this.armor);
        this.properties.addProperty(this.speed);
        this.properties.addProperty(this.isAlive);
        this.properties.addProperty(this.canMove);
        this.properties.addProperty(this.unitState);
        this.properties.addProperty(this.combatState);
        this.properties.addProperty(this.inventory);
        
        // ✅ DEMONSTRATION: Add automatic thresholds
        this.health.addThreshold(0, 'entity:death', 'equal');
        this.health.addThreshold(25, 'health:critical', 'below');
        this.health.addThreshold(50, 'health:low', 'below');
        
        this.armor.addThreshold(0, 'armor:broken', 'equal');
        this.armor.addThreshold(10, 'armor:damaged', 'below');
        
        this.speed.addThreshold(0, 'movement:stopped', 'equal');
        this.speed.addThreshold(this.speed.getMax()!, 'movement:max_speed', 'equal');
        
        this.setupReactiveBehavior();
        this.setupTestBehaviors();
        
        console.log(`✅ Created ${name} with complete reactive property system:`, {
            health: this.health.getValue(),
            armor: this.armor.getValue(),
            unitState: this.unitState.getValue(),
            isAlive: this.isAlive.getValue(),
            propertiesCount: this.properties.getAllProperties().length
        });
    }
    
    private setupReactiveBehavior(): void {
        // ✅ DEMONSTRATION: Rich reactive behaviors using specialized APIs
        
        // Health affects visual appearance
        const healthObserver = this.health.onChange((event) => {
            const render = this.getComponent<ReactiveTestSphereRenderComponent>('render');
            const healthPercent = this.health.getPercentage();
            render?.updateHealthColor(healthPercent);
            
            console.log(`${this.node.getTransformNode().name} health: ${event.to}/${this.health.getMax()} (${(healthPercent * 100).toFixed(1)}%) - ${event.source}`);
        });
        
        // Health thresholds trigger state changes
        const healthThresholdObserver = this.health.onThreshold((event) => {
            const render = this.getComponent<ReactiveTestSphereRenderComponent>('render');
            
            switch (event.eventType) {
                case 'entity:death':
                    console.log(`💀 ${this.node.getTransformNode().name} died!`);
                    this.isAlive.setFalse('death');
                    this.unitState.setTo('dead', 'death');
                    this.canMove.setFalse('death');
                    render?.flashColor(Color3.Red(), 1000);
                    break;
                case 'health:critical':
                    console.log(`⚠️ ${this.node.getTransformNode().name} health critical!`);
                    this.combatState.setTo('alert', 'low_health');
                    render?.flashColor(Color3.Yellow(), 300);
                    break;
                case 'health:low':
                    console.log(`🔶 ${this.node.getTransformNode().name} health low`);
                    break;
            }
        });
        
        // Armor threshold reactions
        const armorThresholdObserver = this.armor.onThreshold((event) => {
            switch (event.eventType) {
                case 'armor:broken':
                    console.log(`🛡️💥 ${this.node.getTransformNode().name} armor broken!`);
                    break;
                case 'armor:damaged':
                    console.log(`🛡️⚠️ ${this.node.getTransformNode().name} armor damaged`);
                    break;
            }
        });
        
        // Unit state affects visual appearance
        const unitStateObserver = this.unitState.onChange((event) => {
            const render = this.getComponent<ReactiveTestSphereRenderComponent>('render');
            render?.updateStateGlow(event.to);
            
            console.log(`🎯 ${this.node.getTransformNode().name} state: ${event.from} → ${event.to} (${event.source})`);
        });
        
        // Speed affects movement state
        const speedObserver = this.speed.onChange((event) => {
            if (event.to > 0 && this.unitState.isValue('idle')) {
                this.unitState.setTo('moving', 'speed_change');
            } else if (event.to === 0 && this.unitState.isValue('moving')) {
                this.unitState.setTo('idle', 'speed_change');
            }
        });
        
        // ✅ DEMONSTRATION: VectorProperty reactions
        const positionObserver = this.position.onChange((event) => {
            // React to position changes (could trigger spatial events)
            if (event.changed) {
                const distance = event.to.subtract(event.from).length();
                if (distance > 0.1) { // Significant movement
                    console.log(`📍 ${this.node.getTransformNode().name} moved ${distance.toFixed(2)} units`);
                }
            }
        });
        
        // ✅ DEMONSTRATION: Collection reactions
        const inventoryAddObserver = this.inventory.itemAddedObservable.add((event) => {
            console.log(`📦 ${this.node.getTransformNode().name} acquired: ${event.value.name}`);
            const render = this.getComponent<ReactiveTestSphereRenderComponent>('render');
            render?.flashColor(Color3.Green(), 200);
        });
        
        const inventoryRemoveObserver = this.inventory.itemRemovedObservable.add((event) => {
            console.log(`📤 ${this.node.getTransformNode().name} lost: ${event.value.name}`);
        });
        
        // Store cleanup functions
        this.cleanupFunctions.push(
            () => healthObserver.remove(),
            () => healthThresholdObserver.remove(),
            () => armorThresholdObserver.remove(),
            () => unitStateObserver.remove(),
            () => speedObserver.remove(),
            () => positionObserver.remove(),
            () => inventoryAddObserver.remove(),
            () => inventoryRemoveObserver.remove()
        );
    }
    
    private setupTestBehaviors(): void {
        // ✅ DEMONSTRATION: Automatic test behaviors to show property APIs
        
        // Periodic health regeneration
        setInterval(() => {
            if (this.isAlive.isTrue() && this.health.getValue() < this.health.getMax()!) {
                this.health.add(2, 'regeneration');
            }
        }, 2000);
        
        // Random damage simulation
        setInterval(() => {
            if (this.isAlive.isTrue() && Math.random() < 0.3) {
                const damage = Math.floor(Math.random() * 15) + 5;
                this.takeDamage(damage);
            }
        }, 3000);
        
        // Random state changes
        setInterval(() => {
            if (this.isAlive.isTrue() && Math.random() < 0.4) {
                this.unitState.next('random_change'); // Cycle through states
            }
        }, 4000);
        
        // Random inventory changes
        setInterval(() => {
            if (Math.random() < 0.5) {
                this.addRandomItem();
            } else if (this.inventory.getSize() > 0) {
                this.removeRandomItem();
            }
        }, 5000);
    }
    
    // ✅ DEMONSTRATION: Rich API usage methods
    
    takeDamage(amount: number): void {
        // Armor absorbs some damage
        const armorValue = this.armor.getValue();
        const damageReduction = Math.min(armorValue * 0.1, amount * 0.5);
        const actualDamage = amount - damageReduction;
        
        // Apply damage to health
        this.health.subtract(actualDamage, 'damage_taken');
        
        // Damage armor slightly
        this.armor.subtract(Math.ceil(amount * 0.1), 'wear');
        
        // Enter combat if not already
        if (this.combatState.isValue('peaceful')) {
            this.combatState.setTo('combat', 'took_damage');
        }
    }
    
    heal(amount: number): void {
        this.health.add(amount, 'healing');
        
        // Flash green when healed
        const render = this.getComponent<ReactiveTestSphereRenderComponent>('render');
        render?.flashColor(Color3.Green(), 300);
    }
    
    repairArmor(amount: number): void {
        this.armor.add(amount, 'repair');
    }
    
    addRandomItem(): void {
        const items = ['Sword', 'Shield', 'Potion', 'Key', 'Gem', 'Scroll'];
        const randomItem = items[Math.floor(Math.random() * items.length)];
        const item: InventoryItem = {
            id: `${randomItem.toLowerCase()}_${Date.now()}`,
            name: randomItem,
            type: randomItem.toLowerCase() as any,
            value: Math.floor(Math.random() * 100) + 10
        };
        
        this.inventory.addItem(item.id, item, 'loot');
    }
    
    removeRandomItem(): void {
        const keys = this.inventory.getKeys();
        if (keys.length > 0) {
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            this.inventory.removeItem(randomKey, 'use');
        }
    }
    
    // ✅ DEMONSTRATION: Property discovery
    getPropertySummary(): any {
        const props = this.getComponent<ReactivePropertiesComponent>('reactiveProperties');
        if (!props) return {};
        
        return {
            health: `${this.health.getValue()}/${this.health.getMax()} (${(this.health.getPercentage() * 100).toFixed(1)}%)`,
            armor: `${this.armor.getValue()}/${this.armor.getMax()}`,
            speed: this.speed.getValue(),
            isAlive: this.isAlive.getValue(),
            unitState: this.unitState.getValue(),
            combatState: this.combatState.getValue(),
            inventorySize: this.inventory.getSize(),
            allPropertyNames: props.getPropertyNames()
        };
    }
    
    dispose(): void {
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions = [];
        super.dispose();
    }
}

function populateTestEntities(sceneManager: SceneManager, rootNode: any) {
    console.log("🚀 Starting ReactiveProperty System Test...");
    
    // Create entity hierarchy with different colors
    const parent = new ReactiveTestEntity("Hero", sceneManager.scene, rootNode, "#4a90e2");     // Blue
    const child = new ReactiveTestEntity("Companion", sceneManager.scene, parent.node, "#50c878"); // Green  
    const grandchild = new ReactiveTestEntity("Pet", sceneManager.scene, child.node, "#ff6b6b");    // Red
    
    // Set initial positions using VectorProperty API
    parent.position.update(new Vector3(0, 0, 0), 'initial_setup');
    child.position.update(new Vector3(2, 0, 0), 'initial_setup');  
    grandchild.position.update(new Vector3(0, 1, 0), 'initial_setup');
    
    // ✅ DEMONSTRATION: Enhanced spatial tracking with new ObservableFactory
    
    // 1. Distance tracking between entities
    const distanceTracker = ObservableFactory.createDistanceTracker(
        child, 
        grandchild, 
        3.0, 
        sceneManager.scene, 
        'near_pet',
        { debugMode: true, updateFrequency: 20 }
    );
    
    // React to proximity changes
    distanceTracker.observable.add((data) => {
        if (data.changed) {
            console.log(`🔗 Companion proximity to Pet: ${data.withinThreshold} (distance: ${data.distance.toFixed(2)})`);
            if (data.withinThreshold) {
                // Heal pet when companion is near
                grandchild.heal(3);
            }
        }
    });
    
    // 2. Collision tracking for parent
    const collisionTracker = ObservableFactory.createCollisionTracker(
        parent,
        sceneManager.scene,
        'has_collision',
        { debugMode: true, updateFrequency: 30 }
    );
    
    // React to collisions
    collisionTracker.observable.add((data) => {
        if (data.changed && data.hasCollision) {
            console.log(`💥 Hero collision detected with ${data.collisionCount} objects`);
            parent.takeDamage(5);
        }
    });
    
    // 3. Movement progress tracking for parent
    const pathPoints = [new Vector3(-5, 0, 0), new Vector3(5, 0, 0)];
    const movementTracker = ObservableFactory.createMovementProgressTracker(
        parent,
        pathPoints,
        sceneManager.scene,
        { debugMode: true }
    );
    
    // ✅ DEMONSTRATION: Complex movement animation with reactive properties
    let movingToEnd = true;
    let lerpTime = 0;
    const moveSpeed = 0.25; // 25% per second
    
    sceneManager.scene.registerBeforeRender(() => {
        // Update lerp time
        const deltaTime = sceneManager.scene.getEngine().getDeltaTime() / 1000;
        lerpTime += moveSpeed * deltaTime;
        
        // Check if reached destination
        if (lerpTime >= 1.0) {
            lerpTime = 1.0;
            // Update movement progress (triggers destination reached)
            movementTracker.updateProgress(1.0);
            
            // Reverse direction after brief pause
            setTimeout(() => {
                lerpTime = 0;
                movingToEnd = !movingToEnd;
                parent.speed.setToMax('direction_change'); // Set to max speed when changing direction
            }, 1500);
        } else {
            // Update progress during movement
            movementTracker.updateProgress(lerpTime);
        }
        
        // Calculate and apply parent position using VectorProperty
        const startPos = new Vector3(-5, 0, 0);
        const endPos = new Vector3(5, 0, 0);
        const currentPos = movingToEnd ? 
            Vector3.Lerp(startPos, endPos, lerpTime) : 
            Vector3.Lerp(endPos, startPos, lerpTime);
        
        parent.position.update(currentPos, 'movement_animation');
        
        // Add rotation using VectorProperty API
        parent.rotation.setY(lerpTime * Math.PI * 2, 'movement_animation');
        
        // Make grandchild orbit around child using VectorProperty translate
        const orbitAngle = Date.now() * 0.002;
        const orbitPos = new Vector3(
            Math.cos(orbitAngle) * 1.5,
            1,
            Math.sin(orbitAngle) * 1.5
        );
        grandchild.position.update(orbitPos, 'orbit_animation');
        
        // Update parent speed based on movement
        const currentSpeed = lerpTime < 0.1 || lerpTime > 0.9 ? 2 : 8; // Slow at ends, fast in middle
        parent.speed.update(currentSpeed, 'movement_speed');
    });
    
    // ✅ DEMONSTRATION: Console helpers for testing
    
    // Add global helpers for testing
    (window as any).testEntities = { parent, child, grandchild };
    (window as any).testReactiveSystem = {
        // Test damage/healing
        damageHero: (amount: number) => parent.takeDamage(amount),
        healHero: (amount: number) => parent.heal(amount),
        
        // Test state changes  
        setHeroState: (state: string) => parent.unitState.setTo(state as any, 'manual_test'),
        cycleHeroState: () => parent.unitState.next('manual_test'),
        
        // Test property discovery
        getHeroProperties: () => parent.getPropertySummary(),
        getAllProperties: () => {
            const props = parent.getComponent<ReactivePropertiesComponent>('reactiveProperties');
            return props?.getPropertyNames() || [];
        },
        
        // Test vector operations
        moveHero: (x: number, y: number, z: number) => parent.position.translate(x, y, z, 'manual_test'),
        scaleHero: (factor: number) => parent.scale.scale(factor, 'manual_test'),
        
        // Test inventory
        giveHeroItem: () => parent.addRandomItem(),
        clearHeroInventory: () => parent.inventory.clear('manual_test'),
        
        // Get performance stats
        getObservableStats: () => ObservableFactory.getPerformanceStats()
    };
    
    // Store cleanup functions globally for testing
    (window as any).cleanup = () => {
        distanceTracker.cleanup();
        collisionTracker.cleanup();
        movementTracker.cleanup();
        ObservableFactory.cleanupAllTrackers();
        console.log("🧹 Cleaned up all trackers");
    };
    
    // Log performance stats periodically
    setInterval(() => {
        const stats = ObservableFactory.getPerformanceStats();
        console.log('📊 ObservableFactory Performance:', stats);
        
        // Show entity status
        console.log('🎮 Entity Status:', {
            hero: parent.getPropertySummary(),
            companion: child.getPropertySummary(), 
            pet: grandchild.getPropertySummary()
        });
    }, 10000);
    
    console.log(`
🎯 ReactiveProperty Test Scene Initialized!

✅ Features Demonstrated:
- VectorProperty-based transforms with rich APIs
- ReactivePropertiesComponent unified container  
- Specialized property types (Numeric, Boolean, Enum, Collection)
- Automatic threshold events and reactions
- Performance-optimized spatial tracking
- Rich reactive behaviors without old event system

🎮 Console Commands Available:
- testReactiveSystem.damageHero(25)     // Test damage system
- testReactiveSystem.healHero(20)       // Test healing
- testReactiveSystem.setHeroState('attacking') // Test enum validation
- testReactiveSystem.cycleHeroState()   // Test enum cycling
- testReactiveSystem.getHeroProperties() // Test property discovery
- testReactiveSystem.moveHero(1, 0, 0)  // Test VectorProperty translate
- testReactiveSystem.scaleHero(1.5)     // Test VectorProperty scaling
- testReactiveSystem.giveHeroItem()     // Test collection add
- cleanup()                             // Clean up all observers

🔍 Watch the console for automatic reactive behaviors!
    `);
}

// Entry point
(async () => {
    const { canvas, sceneManager, rootNode } = setupGameCanvasAndScene();
    
    // Make key objects accessible for debugging
    (window as any).sceneManager = sceneManager;
    (window as any).ObservableFactory = ObservableFactory;
    
    // Initialize comprehensive test scene
    populateTestEntities(sceneManager, rootNode);
})();

// Types for demonstration
interface InventoryItem {
    id: string;
    name: string;
    type: 'weapon' | 'armor' | 'consumable' | 'misc';
    value: number;
}