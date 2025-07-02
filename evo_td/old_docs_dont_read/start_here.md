# Train Trading Game - Complete Architecture Documentation

## Project Vision

A multiplayer cozy trading and exploration game inspired by Dredge, where players form shipping guilds and control customizable trains traveling between procedurally generated stations. Players work together (or compete) to build profitable trade routes, customize their trains with a 3D attachment system, and explore dynamic worlds with day/night cycles and environmental challenges.

**Core Pillars:**
- **Cooperative Multiplayer**: Form shipping guilds, share goals and resources
- **Train Customization**: 3D grid-based attachment system for weapons, cargo, equipment
- **Cozy Trading**: Simple but engaging economic gameplay with profitable route discovery
- **Accessible Design**: Web-first with mobile support, intuitive touch controls
- **Procedural Worlds**: Dynamically generated trade networks for replayability

## High-Level Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    Game Architecture                        │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Client Side   │  Network Layer  │      Server Side        │
│                 │                 │                         │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────────┐ │
│ │SceneManager │ │ │   Colyseus  │ │ │   Game Systems      │ │
│ │(Babylon.js) │ │ │Client/Room  │ │ │ - TrainSystem       │ │
│ └─────────────┘ │ └─────────────┘ │ │ - EconomySystem     │ │
│ ┌─────────────┐ │                 │ │ - StationSystem     │ │
│ │ UIManager   │◄┼─────────────────┼►│ - WorldGenSystem    │ │
│ │(Responsive) │ │                 │ │ - AttachmentSystem  │ │
│ └─────────────┘ │                 │ └─────────────────────┘ │
│ ┌─────────────┐ │                 │ ┌─────────────────────┐ │
│ │InputManager │ │                 │ │   Game State        │ │
│ │(Touch+Mouse)│ │                 │ │ - Players/Guilds    │ │
│ └─────────────┘ │                 │ │ - Trains/Cars       │ │
└─────────────────┴─────────────────┴─│ - Stations/Economy  │─┘
                                      │ - World/Events      │
                                      └─────────────────────┘
```

## Core Entity Architecture

### GameObject Foundation
```typescript
// Core/GameObject.ts
export abstract class GameObject {
    public readonly id: string;
    public readonly type: string;
    public active: boolean = true;
    public createdAt: number;
    
    // Component system
    private components: Map<ComponentType, Component> = new Map();
    
    // Observability
    private metrics: Map<string, number> = new Map();
    private eventHistory: GameEvent[] = [];
    
    constructor(type: string, id?: string) {
        this.id = id || `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.type = type;
        this.createdAt = performance.now();
        ObjectTracker.register(this);
    }
    
    // Component Management
    addComponent<T extends Component>(component: T): T {
        this.components.set(component.type, component);
        component.entity = this;
        this.logMetric('components_added', 1);
        return component;
    }
    
    getComponent<T extends Component>(type: ComponentType): T | null {
        return this.components.get(type) as T || null;
    }
    
    hasComponent(type: ComponentType): boolean {
        return this.components.has(type);
    }
    
    removeComponent(type: ComponentType): void {
        const component = this.components.get(type);
        if (component) {
            component.dispose();
            this.components.delete(type);
            this.logMetric('components_removed', 1);
        }
    }
    
    // Observability
    logMetric(name: string, value: number): void {
        this.metrics.set(name, (this.metrics.get(name) || 0) + value);
    }
    
    getMetrics(): ReadonlyMap<string, number> {
        return this.metrics;
    }
    
    emitEvent(event: GameEvent): void {
        this.eventHistory.push(event);
        if (this.eventHistory.length > 100) {
            this.eventHistory.shift(); // Keep last 100 events
        }
        EventStack.emit(event);
    }
    
    // Lifecycle
    abstract update(deltaTime: number, gameState: GameState): void;
    abstract serialize(): EntityData;
    abstract deserialize(data: EntityData): void;
    
    dispose(): void {
        this.components.forEach(component => component.dispose());
        this.components.clear();
        ObjectTracker.unregister(this);
    }
}
```

### Component System
```typescript
// Core/Component.ts
export interface Component {
    readonly type: ComponentType;
    entity: GameObject;
    
    update(deltaTime: number, gameState: GameState): void;
    serialize(): ComponentData;
    deserialize(data: ComponentData): void;
    dispose(): void;
}

export enum ComponentType {
    // Transform & Physics
    POSITION = 'position',
    MOVEMENT = 'movement',
    ATTACHMENT_MANAGER = 'attachment_manager',
    
    // Gameplay
    HEALTH = 'health',
    INVENTORY = 'inventory',
    TRADE = 'trade',
    QUEST_GIVER = 'quest_giver',
    
    // AI & Behavior
    AI_BEHAVIOR = 'ai_behavior',
    SCHEDULE = 'schedule',
    DIALOGUE = 'dialogue',
    
    // Rendering (Client-Side Only)
    MESH = 'mesh',
    ANIMATION = 'animation',
    LIGHTING = 'lighting',
}

// Core/Components/PositionComponent.ts
export class PositionComponent implements Component {
    readonly type = ComponentType.POSITION;
    entity: GameObject;
    
    public position: Vector3 = Vector3.Zero();
    public rotation: Vector3 = Vector3.Zero();
    public scale: Vector3 = Vector3.One();
    
    update(deltaTime: number, gameState: GameState): void {
        // Handle position interpolation, world bounds, etc.
    }
    
    serialize(): ComponentData {
        return {
            position: this.position.asArray(),
            rotation: this.rotation.asArray(),
            scale: this.scale.asArray()
        };
    }
    
    deserialize(data: ComponentData): void {
        this.position = Vector3.FromArray(data.position);
        this.rotation = Vector3.FromArray(data.rotation);
        this.scale = Vector3.FromArray(data.scale);
    }
    
    dispose(): void {
        // Cleanup any references
    }
}
```

## Player & Multiplayer Architecture

### Player Entity
```typescript
// Entities/Player.ts
export class Player extends GameObject {
    public sessionId: string; // Network session
    public name: string;
    public guildId: string;
    
    // Ownership & Control
    public trains: Set<string> = new Set(); // Train IDs owned by player
    public currentTrain: string | null = null; // Active train
    public currentLocation: string; // Station or rail ID
    
    // Progression & Persistence
    public level: number = 1;
    public experience: number = 0;
    public currency: number = 1000;
    public reputation: Map<string, number> = new Map(); // Per station
    public unlockedBlueprints: Set<string> = new Set();
    
    // Game State
    public timeSpeedVote: number = 1;
    public isOnline: boolean = true;
    public lastActiveTime: number = Date.now();
    
    // Current Interaction
    public interactingWith: string | null = null; // NPC/Building ID
    public currentDialogue: string | null = null;
    public currentTrade: string | null = null;
    
    constructor(sessionId: string, name: string, guildId: string, id?: string) {
        super('player', id);
        this.sessionId = sessionId;
        this.name = name;
        this.guildId = guildId;
        
        this.addComponent(new PositionComponent(this));
        this.addComponent(new InventoryComponent(this, 50)); // Personal inventory
    }
    
    update(deltaTime: number, gameState: GameState): void {
        // Update player state, handle timeouts, etc.
        this.lastActiveTime = Date.now();
    }
    
    serialize(): EntityData {
        return {
            sessionId: this.sessionId,
            name: this.name,
            guildId: this.guildId,
            trains: Array.from(this.trains),
            currentTrain: this.currentTrain,
            level: this.level,
            currency: this.currency,
            // ... other serializable data
        };
    }
}

// Controllers/PlayerController.ts
export class PlayerController {
    private player: Player;
    private inputBuffer: PlayerInput[] = [];
    private networkDelay: number = 0;
    
    constructor(player: Player) {
        this.player = player;
    }
    
    // Player Actions
    voteTimeSpeed(speed: 1 | 4 | 8 | 16 | 32): void {
        this.player.timeSpeedVote = speed;
        this.sendAction({
            type: 'vote_time_speed',
            speed: speed,
            playerId: this.player.id
        });
    }
    
    startTrainJourney(railId: string, destinationId: string): void {
        if (!this.player.currentTrain) return;
        
        this.sendAction({
            type: 'start_journey',
            trainId: this.player.currentTrain,
            railId: railId,
            destinationId: destinationId,
            playerId: this.player.id
        });
    }
    
    attachItemToTrain(itemId: string, carId: string, position: AttachmentPosition3D): void {
        this.sendAction({
            type: 'attach_item',
            itemId: itemId,
            carId: carId,
            position: position,
            playerId: this.player.id
        });
    }
    
    private sendAction(action: PlayerAction): void {
        // Buffer inputs for network reconciliation
        this.inputBuffer.push({
            action: action,
            timestamp: performance.now(),
            sequence: this.getNextSequenceNumber()
        });
        
        // Send to server
        NetworkManager.send(action);
    }
}
```

### Shipping Guild System
```typescript
// Entities/ShippingGuild.ts
export class ShippingGuild extends GameObject {
    public name: string;
    public members: Set<string> = new Set(); // Player IDs
    public mode: GameMode;
    public maxMembers: number = 6;
    
    // Cooperation Settings
    public sharedResources: boolean = true;
    public sharedCurrency: number = 5000; // Starting guild funds
    public sharedReputation: Map<string, number> = new Map(); // Per station
    
    // Goals & Progress
    public goals: GuildGoal[] = [];
    public completedContracts: number = 0;
    public totalRevenue: number = 0;
    public guildLevel: number = 1;
    
    // World State
    public worldSeed: string;
    public generatedAt: number = Date.now();
    
    constructor(name: string, mode: GameMode, worldSeed: string, id?: string) {
        super('shipping_guild', id);
        this.name = name;
        this.mode = mode;
        this.worldSeed = worldSeed;
        
        this.generateInitialGoals();
    }
    
    addMember(playerId: string): boolean {
        if (this.members.size >= this.maxMembers) return false;
        this.members.add(playerId);
        this.emitEvent({
            type: 'player_joined_guild',
            guildId: this.id,
            playerId: playerId,
            timestamp: Date.now()
        });
        return true;
    }
    
    removeMember(playerId: string): void {
        this.members.delete(playerId);
        this.emitEvent({
            type: 'player_left_guild',
            guildId: this.id,
            playerId: playerId,
            timestamp: Date.now()
        });
    }
    
    calculateAverageTimeSpeed(): number {
        // Average all member time speed votes
        return this.mode === GameMode.COOPERATIVE ? 
            this.getAverageVote() : this.getFastestVote();
    }
    
    private generateInitialGoals(): void {
        // Generate cooperative goals based on world and member count
        this.goals = [
            {
                type: 'revenue',
                target: 50000,
                current: 0,
                description: 'Earn 50,000 credits together'
            },
            {
                type: 'contracts',
                target: 25,
                current: 0,
                description: 'Complete 25 trade contracts'
            }
        ];
    }
}

export enum GameMode {
    COOPERATIVE = 'cooperative',     // Work together, shared goals
    COMPETITIVE = 'competitive',     // Economic competition
    SANDBOX = 'sandbox'              // Free play, no objectives
}

export interface GuildGoal {
    type: 'revenue' | 'contracts' | 'reputation' | 'exploration';
    target: number;
    current: number;
    description: string;
    completed?: boolean;
    reward?: string;
}
```

## Train & Attachment System

### Enhanced Train System
```typescript
// Entities/Train.ts
export class Train extends GameObject {
    public playerId: string;
    public cars: TrainCar[] = [];
    
    // Journey State
    public currentLocation: string; // Station or Rail ID
    public currentRail: string | null = null;
    public progress: number = 0; // 0-1 along current rail
    public destination: string | null = null;
    public direction: 'forward' | 'reverse' = 'forward';
    public isMoving: boolean = false;
    
    // Performance Characteristics
    public power: number = 0.6; // 0-1 power setting
    public speed: number = 0.1667; // Base speed (60km/h at 100% power)
    public maxSpeed: number = 0.25; // Absolute max speed
    public weight: number = 0; // Calculated from cars + cargo
    public efficiency: number = 1.0; // Affected by attachments
    
    constructor(playerId: string, startingStation: string, id?: string) {
        super('train', id);
        this.playerId = playerId;
        this.currentLocation = startingStation;
        
        this.addComponent(new PositionComponent(this));
        this.addComponent(new MovementComponent(this));
        this.addComponent(new InventoryComponent(this, 0)); // Calculated from cars
        
        // Create initial engine car
        this.addCar(new TrainCar(this.id, CarType.ENGINE));
    }
    
    addCar(car: TrainCar): boolean {
        if (this.cars.length >= GameConfig.train.maxCars) return false;
        
        this.cars.push(car);
        this.recalculateStats();
        this.emitEvent({
            type: 'car_added',
            trainId: this.id,
            carId: car.id,
            carType: car.carType
        });
        return true;
    }
    
    removeCar(carId: string): TrainCar | null {
        const index = this.cars.findIndex(car => car.id === carId);
        if (index === -1 || index === 0) return null; // Can't remove engine
        
        const removedCar = this.cars.splice(index, 1)[0];
        this.recalculateStats();
        return removedCar;
    }
    
    startJourney(railId: string, destinationId: string): boolean {
        if (this.isMoving) return false;
        
        this.currentRail = railId;
        this.destination = destinationId;
        this.isMoving = true;
        this.progress = 0;
        
        this.emitEvent({
            type: 'journey_started',
            trainId: this.id,
            railId: railId,
            destinationId: destinationId
        });
        
        return true;
    }
    
    private recalculateStats(): void {
        // Calculate total weight, capacity, power from all cars
        this.weight = this.cars.reduce((total, car) => total + car.getWeight(), 0);
        
        const inventory = this.getComponent(ComponentType.INVENTORY) as InventoryComponent;
        if (inventory) {
            inventory.capacity = this.calculateTotalCapacity();
        }
        
        this.efficiency = this.calculateEfficiency();
    }
    
    private calculateTotalCapacity(): number {
        return this.cars.reduce((total, car) => {
            const carInventory = car.getComponent(ComponentType.INVENTORY) as InventoryComponent;
            return total + (carInventory ? carInventory.capacity : 0);
        }, 0);
    }
    
    private calculateEfficiency(): number {
        // Base efficiency modified by attachments
        let efficiency = 1.0;
        this.cars.forEach(car => {
            efficiency *= car.getEfficiencyModifier();
        });
        return Math.max(0.1, Math.min(2.0, efficiency)); // Clamp between 10% and 200%
    }
}
```

### 3D Attachment System
```typescript
// Entities/TrainCar.ts
export class TrainCar extends GameObject {
    public trainId: string;
    public carType: CarType;
    public baseWeight: number;
    public baseCapacity: number;
    
    // 3D Attachment System
    private attachmentManager: AttachmentManager3D;
    private attachments: Map<string, Attachment> = new Map();
    
    constructor(trainId: string, carType: CarType, id?: string) {
        super('train_car', id);
        this.trainId = trainId;
        this.carType = carType;
        this.baseWeight = CarTypeConfig[carType].weight;
        this.baseCapacity = CarTypeConfig[carType].capacity;
        
        this.addComponent(new PositionComponent(this));
        this.addComponent(new MeshComponent(this));
        this.attachmentManager = new AttachmentManager3D(this);
        
        if (carType === CarType.CARGO || carType === CarType.TANKER) {
            this.addComponent(new InventoryComponent(this, this.baseCapacity));
        }
    }
    
    canAttach(attachment: Attachment, position: AttachmentPosition3D): boolean {
        return this.attachmentManager.canAttach(attachment, position);
    }
    
    attach(attachment: Attachment, position: AttachmentPosition3D): boolean {
        if (!this.canAttach(attachment, position)) return false;
        
        const success = this.attachmentManager.attach(attachment, position);
        if (success) {
            this.attachments.set(attachment.id, attachment);
            this.emitEvent({
                type: 'attachment_added',
                carId: this.id,
                attachmentId: attachment.id,
                position: position
            });
        }
        return success;
    }
    
    detach(attachmentId: string): Attachment | null {
        const attachment = this.attachments.get(attachmentId);
        if (!attachment) return null;
        
        this.attachmentManager.detach(attachmentId);
        this.attachments.delete(attachmentId);
        
        this.emitEvent({
            type: 'attachment_removed',
            carId: this.id,
            attachmentId: attachmentId
        });
        
        return attachment;
    }
    
    getWeight(): number {
        let totalWeight = this.baseWeight;
        this.attachments.forEach(attachment => {
            totalWeight += attachment.weight;
        });
        
        // Add cargo weight
        const inventory = this.getComponent(ComponentType.INVENTORY) as InventoryComponent;
        if (inventory) {
            totalWeight += inventory.getCurrentWeight();
        }
        
        return totalWeight;
    }
    
    getEfficiencyModifier(): number {
        let modifier = 1.0;
        this.attachments.forEach(attachment => {
            modifier *= attachment.efficiencyModifier || 1.0;
        });
        return modifier;
    }
}

export enum CarType {
    ENGINE = 'engine',           // Required, provides power
    CARGO = 'cargo',            // Standard storage
    PASSENGER = 'passenger',     // For NPCs/crew (future)
    TANKER = 'tanker',          // Liquid cargo
    FLATBED = 'flatbed',        // Large/oddly shaped cargo
    REFRIGERATED = 'refrigerated', // Perishable goods
    HAZMAT = 'hazmat'           // Dangerous materials
}

// Attachment/AttachmentManager3D.ts
export class AttachmentManager3D {
    private car: TrainCar;
    private attachmentGrid: AttachmentGrid3D;
    private transformNodes: Map<string, TransformNode> = new Map();
    private scene: Scene;
    
    constructor(car: TrainCar) {
        this.car = car;
        this.scene = car.getComponent(ComponentType.MESH)?.scene;
        this.attachmentGrid = new AttachmentGrid3D(car.carType);
        this.setupAttachmentPoints();
    }
    
    private setupAttachmentPoints(): void {
        if (!this.scene) return;
        
        const carMesh = this.car.getComponent(ComponentType.MESH)?.mesh;
        if (!carMesh) return;
        
        // Create transform nodes for each valid attachment point
        Object.values(AttachmentFace).forEach(face => {
            this.createFaceAttachmentPoints(face, carMesh);
        });
    }
    
    private createFaceAttachmentPoints(face: AttachmentFace, carMesh: Mesh): void {
        const gridDimensions = this.attachmentGrid.getFaceDimensions(face);
        const faceOffset = this.calculateFaceOffset(face, carMesh);
        
        for (let x = 0; x < gridDimensions.width; x++) {
            for (let y = 0; y < gridDimensions.height; y++) {
                for (let z = 0; z < gridDimensions.depth; z++) {
                    const pointId = `${face}_${x}_${y}_${z}`;
                    const transformNode = new TransformNode(pointId, this.scene);
                    transformNode.parent = carMesh;
                    
                    // Calculate local position for this grid point
                    transformNode.position = this.calculateGridPosition(
                        { x, y, z }, face, carMesh, gridDimensions
                    );
                    
                    this.transformNodes.set(pointId, transformNode);
                }
            }
        }
    }
    
    canAttach(attachment: Attachment, position: AttachmentPosition3D): boolean {
        // Check if attachment fits in grid
        if (!this.attachmentGrid.canPlace(attachment, position)) return false;
        
        // Check if attachment type is allowed on this face
        const allowedTypes = AttachmentRules[this.car.carType][position.face];
        if (!allowedTypes.includes(attachment.type)) return false;
        
        return true;
    }
    
    attach(attachment: Attachment, position: AttachmentPosition3D): boolean {
        if (!this.canAttach(attachment, position)) return false;
        
        // Mark grid spaces as occupied
        this.attachmentGrid.place(attachment, position);
        
        // Find appropriate transform node
        const pointId = this.getPointId(position);
        const transformNode = this.transformNodes.get(pointId);
        
        if (transformNode && attachment.mesh) {
            // Parent attachment to transform node
            attachment.mesh.parent = transformNode;
            attachment.mesh.position = Vector3.Zero();
            attachment.mesh.rotation = Vector3.Zero();
            
            // Update attachment's transform method
            attachment.updateTransform(this.car, position);
        }
        
        return true;
    }
    
    detach(attachmentId: string): void {
        const position = this.attachmentGrid.getAttachmentPosition(attachmentId);
        if (position) {
            this.attachmentGrid.remove(attachmentId);
            
            // Remove from transform node
            const pointId = this.getPointId(position);
            const transformNode = this.transformNodes.get(pointId);
            // Detach mesh from transform node
        }
    }
    
    private calculateGridPosition(
        gridPos: { x: number, y: number, z: number },
        face: AttachmentFace,
        carMesh: Mesh,
        gridDimensions: { width: number, height: number, depth: number }
    ): Vector3 {
        const boundingBox = carMesh.getBoundingInfo().boundingBox;
        const carSize = boundingBox.maximum.subtract(boundingBox.minimum);
        
        // Calculate cell size for this face
        const cellSize = this.calculateCellSize(face, carSize, gridDimensions);
        
        // Convert grid coordinates to local position
        const localPos = new Vector3(
            (gridPos.x - gridDimensions.width / 2 + 0.5) * cellSize.x,
            (gridPos.y - gridDimensions.height / 2 + 0.5) * cellSize.y,
            (gridPos.z - gridDimensions.depth / 2 + 0.5) * cellSize.z
        );
        
        // Apply face offset
        return localPos.add(this.calculateFaceOffset(face, carMesh));
    }
}

export enum AttachmentFace {
    TOP = 'top',
    BOTTOM = 'bottom',
    LEFT = 'left',
    RIGHT = 'right',
    FRONT = 'front',
    BACK = 'back'
}

export interface AttachmentPosition3D {
    x: number;
    y: number;
    z: number;
    face: AttachmentFace;
}

export interface Attachment {
    id: string;
    type: AttachmentType;
    name: string;
    mesh?: Mesh; // Rendering component
    
    // Physical properties
    size: { width: number, height: number, depth: number }; // Grid units
    weight: number;
    
    // Game effects
    efficiencyModifier?: number; // Affects train performance
    capacity?: number; // Additional storage
    
    // Methods
    updateTransform(car: TrainCar, position: AttachmentPosition3D): void;
    onAttached(car: TrainCar): void;
    onDetached(car: TrainCar): void;
}

export enum AttachmentType {
    WEAPON = 'weapon',
    LIGHT = 'light',
    ARMOR = 'armor',
    ENGINE = 'engine',
    FUEL_TANK = 'fuel_tank',
    STORAGE = 'storage',
    CARGO_CRANE = 'cargo_crane',
    COMMUNICATION = 'communication'
}
```

## Economic System (Simplified)

### Trade Routes & Cargo
```typescript
// Economy/SimpleEconomySystem.ts
export class SimpleEconomySystem extends SystemManager {
    private routes: Map<string, RouteData> = new Map();
    private cargoTypes: Map<string, CargoType> = new Map();
    private globalMarketState: MarketState = new Map();
    
    constructor() {
        super('SimpleEconomySystem');
        this.initializeCargoTypes();
    }
    
    update(deltaTime: number, gameState: GameState): void {
        this.trackUpdate(() => {
            this.updateRoutePrices(deltaTime);
            this.updatePerishablesCargo(deltaTime);
            this.processTradeOrders(gameState);
        });
    }
    
    private initializeCargoTypes(): void {
        this.cargoTypes.set('standard', {
            id: 'standard',
            name: 'General Goods',
            requiredCarType: CarType.CARGO,
            baseValue: 100,
            volatility: 0.2,
            weight: 1.0
        });
        
        this.cargoTypes.set('perishable', {
            id: 'perishable',
            name: 'Fresh Produce',
            requiredCarType: CarType.REFRIGERATED,
            baseValue: 200,
            volatility: 0.4,
            weight: 0.8,
            perishable: true,
            decayRate: 0.05 // 5% value loss per game hour
        });
        
        this.cargoTypes.set('hazmat', {
            id: 'hazmat',
            name: 'Chemical Supplies',
            requiredCarType: CarType.HAZMAT,
            baseValue: 500,
            volatility: 0.1,
            weight: 1.5,
            hazardous: true,
            riskFactor: 0.1 // 10% chance of incidents
        });
        
        this.cargoTypes.set('liquid', {
            id: 'liquid',
            name: 'Fuel/Oil',
            requiredCarType: CarType.TANKER,
            baseValue: 150,
            volatility: 0.3,
            weight: 2.0
        });
    }
    
    calculateRouteProfit(
        fromStation: string, 
        toStation: string, 
        cargoType: string, 
        quantity: number
    ): number {
        const routeKey = `${fromStation}->${toStation}`;
        const route = this.routes.get(routeKey) || this.generateRoute(fromStation, toStation);
        const cargo = this.cargoTypes.get(cargoType);
        
        if (!cargo) return 0;
        
        // Simple profit calculation
        const baseProfit = cargo.baseValue * quantity;
        const routeMultiplier = route.profitabilityMultiplier;
        const priceFluctuation = this.getPriceFluctuation(cargo.volatility);
        const distanceBonus = route.distance * 10; // Bonus for longer routes
        
        return Math.floor(baseProfit * routeMultiplier * priceFluctuation + distanceBonus);
    }
    
    private generateRoute(fromStation: string, toStation: string): RouteData {
        // Generate route data between two stations
        const routeKey = `${fromStation}->${toStation}`;
        const distance = this.calculateDistance(fromStation, toStation);
        
        const route: RouteData = {
            id: routeKey,
            fromStation,
            toStation,
            distance,
            profitabilityMultiplier: 0.8 + Math.random() * 0.4, // 0.8 to 1.2
            demandFactors: new Map([
                ['standard', 0.8 + Math.random() * 0.4],
                ['perishable', 0.5 + Math.random() * 1.0],
                ['hazmat', 0.3 + Math.random() * 0.7],
                ['liquid', 0.6 + Math.random() * 0.8]
            ]),
            lastUpdated: Date.now()
        };
        
        this.routes.set(routeKey, route);
        return route;
    }
    
    private updatePerishablesCargo(deltaTime: number): void {
        // Handle cargo that loses value over time
        // This would integrate with train inventories
    }
    
    private getPriceFluctuation(volatility: number): number {
        // Random price fluctuation based on volatility
        const fluctuation = (Math.random() - 0.5) * 2 * volatility;
        return 1.0 + fluctuation;
    }
}

export interface CargoType {
    id: string;
    name: string;
    requiredCarType: CarType;
    baseValue: number;
    volatility: number; // Price fluctuation factor
    weight: number; // Weight per unit
    perishable?: boolean;
    hazardous?: boolean;
    decayRate?: number; // Value loss over time
    riskFactor?: number; // Chance of incidents
}

export interface RouteData {
    id: string;
    fromStation: string;
    toStation: string;
    distance: number;
    profitabilityMultiplier: number;
    demandFactors: Map<string, number>; // Per cargo type
    lastUpdated: number;
}
```

## Procedural World Generation

### World Generator
```typescript
// WorldGen/WorldGenerator.ts
export class WorldGenerator {
    private rng: SeededRNG;
    
    generateWorld(seed: string, guildSize: number, mode: GameMode): GeneratedWorld {
        this.rng = new SeededRNG(seed);
        
        const config = this.calculateWorldConfig(guildSize, mode);
        const stations = this.generateStations(config);
        const rails = this.generateRails(stations, config);
        const tradeRoutes = this.generateTradeRoutes(stations, rails);
        
        return {
            seed,
            config,
            stations,
            rails,
            tradeRoutes,
            worldEvents: this.generateWorldEvents(config),
            generatedAt: Date.now()
        };
    }
    
    private calculateWorldConfig(guildSize: number, mode: GameMode): WorldConfig {
        // Scale world complexity to guild size and game mode
        const baseStations = 8;
        const stationsPerPlayer = mode === GameMode.COOPERATIVE ? 2 : 3;
        const totalStations = baseStations + (guildSize * stationsPerPlayer);
        
        return {
            stationCount: totalStations,
            railDensity: mode === GameMode.COOPERATIVE ? 1.3 : 1.5, // More connections in competitive
            tradeRouteCount: Math.floor(totalStations * 2.5),
            worldSize: Math.sqrt(totalStations) * 10, // Larger world for more stations
            difficulty: mode === GameMode.SANDBOX ? 0.5 : 1.0
        };
    }
    
    private generateStations(config: WorldConfig): Station[] {
        const stations: Station[] = [];
        const positions = this.generateStationPositions(config);
        
        for (let i = 0; i < config.stationCount; i++) {
            const size = this.determineStationSize(i, config.stationCount);
            const station = new Station(
                this.generateStationName(),
                size,
                `station_${i}`
            );
            
            station.getComponent(ComponentType.POSITION)!.position = positions[i];
            this.populateStation(station, size);
            stations.push(station);
        }
        
        return stations;
    }
    
    private generateStationPositions(config: WorldConfig): Vector3[] {
        // Use Poisson disk sampling for good station distribution
        const positions: Vector3[] = [];
        const minDistance = config.worldSize / Math.sqrt(config.stationCount);
        
        // Implementation of Poisson disk sampling...
        // Ensures stations are well-distributed, not clustered
        
        return positions;
    }
    
    private generateRails(stations: Station[], config: WorldConfig): Rail[] {
        const rails: Rail[] = [];
        const graph = new StationGraph(stations);
        
        // Ensure minimum connectivity (MST + extra edges)
        const mstEdges = graph.generateMinimumSpanningTree();
        const extraEdges = graph.generateAdditionalEdges(config.railDensity);
        
        [...mstEdges, ...extraEdges].forEach((edge, index) => {
            const rail = new Rail(
                `rail_${index}`,
                `${edge.stationA.name}-${edge.stationB.name} Line`,
                edge.stationA.id,
                edge.stationB.id
            );
            
            rail.trackPoints = this.generateTrackPath(
                edge.stationA.getComponent(ComponentType.POSITION)!.position,
                edge.stationB.getComponent(ComponentType.POSITION)!.position
            );
            
            rails.push(rail);
        });
        
        return rails;
    }
    
    private generateTradeRoutes(stations: Station[], rails: Rail[]): TradeRoute[] {
        // Generate profitable trade circuits
        // Ensure no single dominant strategy
        // Create routes that encourage cooperation
        
        const routes: TradeRoute[] = [];
        
        // Simple triangle routes (A->B->C->A)
        for (let i = 0; i < stations.length - 2; i++) {
            const route = this.createTriangleRoute(
                stations[i], 
                stations[i + 1], 
                stations[i + 2]
            );
            if (route) routes.push(route);
        }
        
        // Longer routes for advanced players
        const longRoutes = this.createLongHaulRoutes(stations, 4, 6);
        routes.push(...longRoutes);
        
        return routes;
    }
    
    private populateStation(station: Station, size: StationSize): void {
        const config = StationSizeConfig[size];
        const buildingCount = config.minBuildings + 
            this.rng.randInt(config.maxBuildings - config.minBuildings);
        
        for (let i = 0; i < buildingCount; i++) {
            const buildingType = this.selectRandomBuildingType(config.availableBuildings);
            const building = new Building(
                station.id,
                buildingType,
                this.generateBuildingName(buildingType),
                `${station.id}_building_${i}`
            );
            
            this.populateBuilding(building, buildingType);
            station.addBuilding(building);
        }
        
        // Add NPCs to buildings
        const npcCount = Math.floor(buildingCount * 1.5);
        for (let i = 0; i < npcCount; i++) {
            const npc = this.generateNPC(station);
            station.addNPC(npc);
        }
    }
}

export interface WorldConfig {
    stationCount: number;
    railDensity: number; // Multiplier for extra rail connections
    tradeRouteCount: number;
    worldSize: number; // Spatial scale
    difficulty: number; // Global difficulty modifier
}

export interface GeneratedWorld {
    seed: string;
    config: WorldConfig;
    stations: Station[];
    rails: Rail[];
    tradeRoutes: TradeRoute[];
    worldEvents: WorldEvent[];
    generatedAt: number;
}
```

## UI System (Mobile-Friendly)

### Responsive UI Manager
```typescript
// UI/UIManager.ts
export class UIManager {
    private currentMode: UIMode = UIMode.WORLD_MAP;
    private platform: Platform;
    private panels: Map<string, UIPanel> = new Map();
    private bindings: Map<string, UIBinding[]> = new Map();
    private touchHandler: TouchHandler;
    
    constructor() {
        this.platform = this.detectPlatform();
        this.touchHandler = new TouchHandler();
        this.initializePanels();
        this.setupResponsiveListeners();
    }
    
    private detectPlatform(): Platform {
        if ('ontouchstart' in window) {
            return screen.width <= 768 ? Platform.MOBILE : Platform.TABLET;
        }
        return Platform.DESKTOP;
    }
    
    setMode(mode: UIMode, context?: any): void {
        this.currentMode = mode;
        this.updatePanelVisibility(context);
        this.emitEvent({
            type: 'ui_mode_changed',
            mode: mode,
            context: context
        });
    }
    
    update(gameState: GameState): void {
        // Update all visible panels
        this.panels.forEach(panel => {
            if (panel.isVisible && panel.needsUpdate(gameState)) {
                panel.update(gameState);
            }
        });
        
        // Update bindings
        this.updateBindings(gameState);
    }
    
    private initializePanels(): void {
        // Create platform-appropriate panels
        const panelFactory = new PanelFactory(this.platform);
        
        this.panels.set('hud', panelFactory.createHUDPanel());
        this.panels.set('station_interface', panelFactory.createStationPanel());
        this.panels.set('train_config', panelFactory.createTrainConfigPanel());
        this.panels.set('attachment_grid', panelFactory.createAttachmentGridPanel());
        this.panels.set('trade', panelFactory.createTradePanel());
        this.panels.set('map', panelFactory.createMapPanel());
        this.panels.set('dialogue', panelFactory.createDialoguePanel());
    }
    
    // Data binding system (enhanced from existing UIBinder)
    bind(key: string, element: HTMLElement, updateFn: (value: any) => void): void {
        if (!this.bindings.has(key)) {
            this.bindings.set(key, []);
        }
        this.bindings.get(key)!.push({ element, updateFn });
    }
    
    set(key: string, value: any): void {
        const bindings = this.bindings.get(key);
        if (bindings) {
            bindings.forEach(binding => {
                if (document.body.contains(binding.element)) {
                    binding.updateFn(value);
                }
            });
        }
    }
    
    private updateBindings(gameState: GameState): void {
        // Auto-update common bindings
        this.set('player_currency', gameState.currentPlayer?.currency || 0);
        this.set('train_power', gameState.currentTrain?.power || 0);
        this.set('time_speed', gameState.timeManager.getSpeed());
        this.set('enemy_count', gameState.enemies.size);
    }
}

export enum UIMode {
    WORLD_MAP = 'world_map',           // Traveling, world overview
    STATION_OVERVIEW = 'station_overview', // Station selection view
    STATION_DETAIL = 'station_detail',     // Inside station, building view
    TRAIN_CONFIG = 'train_config',         // Attachment/car configuration
    DIALOGUE = 'dialogue',                 // NPC conversation
    TRADE = 'trade',                      // Trading interface
    MAP = 'map'                           // Full world map
}

export enum Platform {
    MOBILE = 'mobile',
    TABLET = 'tablet',
    DESKTOP = 'desktop'
}

// UI/Mobile/TouchAttachmentInterface.ts
export class TouchAttachmentInterface {
    private dragState: AttachmentDragState | null = null;
    private ghostMesh: Mesh | null = null;
    private hapticFeedback: HapticFeedback;
    
    constructor() {
        this.hapticFeedback = new HapticFeedback();
        this.setupTouchListeners();
    }
    
    private setupTouchListeners(): void {
        window.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        window.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        window.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    }
    
    private handleTouchStart(event: TouchEvent): void {
        const touch = event.touches[0];
        const pickedInfo = this.raycastFromTouch(touch);
        
        if (pickedInfo && this.isAttachment(pickedInfo.pickedMesh)) {
            event.preventDefault();
            this.startDrag(pickedInfo.pickedMesh as Attachment, touch);
        }
    }
    
    private handleTouchMove(event: TouchEvent): void {
        if (!this.dragState) return;
        
        event.preventDefault();
        const touch = event.touches[0];
        const worldPos = this.screenToWorld(touch.clientX, touch.clientY);
        const snapPos = this.findNearestAttachmentPoint(worldPos);
        
        if (snapPos && this.ghostMesh) {
            this.ghostMesh.position = snapPos.position;
            this.updateGhostMaterial(snapPos.isValid);
            
            if (snapPos.isValid) {
                this.hapticFeedback.lightTap(); // Snap feedback
            }
        }
    }
    
    private handleTouchEnd(event: TouchEvent): void {
        if (this.dragState && this.isValidPlacement()) {
            this.commitAttachment();
            this.hapticFeedback.success();
        } else {
            this.hapticFeedback.error();
        }
        this.cleanup();
    }
    
    private createLargerHitTargets(): void {
        // Create larger, invisible collision meshes for touch targets
        // Color-code attachment points for different types
        // Show grid overlay with appropriate sizing for fingers
    }
}

// UI/Panels/AttachmentGridPanel.ts
export class AttachmentGridPanel extends UIPanel {
    private gridOverlay: GridOverlay3D;
    private selectedCar: TrainCar | null = null;
    private availableAttachments: Attachment[] = [];
    
    show(car: TrainCar): void {
        this.selectedCar = car;
        this.loadAvailableAttachments();
        this.gridOverlay.showForCar(car);
        super.show();
    }
    
    private loadAvailableAttachments(): void {
        // Load attachments from player inventory
        // Filter by what can attach to selected car
        // Sort by type/usefulness
    }
    
    createAttachmentInventory(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'attachment-inventory';
        
        this.availableAttachments.forEach(attachment => {
            const item = this.createAttachmentItem(attachment);
            container.appendChild(item);
        });
        
        return container;
    }
    
    private createAttachmentItem(attachment: Attachment): HTMLElement {
        const item = document.createElement('div');
        item.className = `attachment-item attachment-${attachment.type}`;
        item.draggable = this.platform !== Platform.MOBILE;
        
        // Show attachment preview, stats, requirements
        item.innerHTML = `
            <div class="attachment-preview">
                <img src="${attachment.iconUrl}" alt="${attachment.name}">
            </div>
            <div class="attachment-info">
                <h4>${attachment.name}</h4>
                <p class="size">Size: ${attachment.size.width}×${attachment.size.height}×${attachment.size.depth}</p>
                <p class="weight">Weight: ${attachment.weight}kg</p>
            </div>
        `;
        
        if (this.platform === Platform.MOBILE) {
            item.addEventListener('touchstart', () => this.startAttachmentDrag(attachment));
        } else {
            this.setupDesktopDrag(item, attachment);
        }
        
        return item;
    }
}
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goals**: Establish core architecture, component system, and basic train functionality

**Week 1 Tasks**:
1. Create `GameObject` base class with component system
2. Implement core components (`PositionComponent`, `HealthComponent`, `MeshComponent`)
3. Set up `ObjectTracker` and performance monitoring
4. Create `SystemManager` base class
5. Extract `Train` class from existing App.ts
6. Create basic `TrainSystem` for movement logic

**Week 2 Tasks**:
1. Implement `Player` entity and `PlayerController`
2. Create `ShippingGuild` system
3. Set up configuration system with JSON loading
4. Enhance existing `Enemy` class with component system
5. Create `EnemySystem` for AI management
6. Test component lifecycle and serialization

**Deliverable**: Working train movement with new architecture, no broken functionality

### Phase 2: 3D Attachment System (Weeks 3-4)
**Goals**: Implement the 3D grid attachment system for train customization

**Week 3 Tasks**:
1. Create `AttachmentManager3D` with transform node system
2. Implement `AttachmentGrid3D` for spatial management
3. Set up attachment rules per car type and face
4. Create basic attachment types (weapons, lights, storage)
5. Build visual grid overlay system

**Week 4 Tasks**:
1. Implement touch-friendly attachment interface for mobile
2. Create `AttachmentGridPanel` UI
3. Add drag-and-drop functionality (desktop) and touch controls (mobile)
4. Implement attachment effects on train performance
5. Add visual feedback and haptic responses

**Deliverable**: Full 3D attachment system working on both desktop and mobile

### Phase 3: Economy & Stations (Weeks 5-6)
**Goals**: Implement simplified economy and enhanced station system

**Week 5 Tasks**:
1. Create `SimpleEconomySystem` with cargo types and routes
2. Implement trade profit calculations
3. Set up cargo requirements (car types, perishables, hazmat)
4. Create basic market price fluctuations
5. Enhance `Station` entity with buildings and NPCs

**Week 6 Tasks**:
1. Implement `StationSystem` for building management
2. Create `Building` and `NPC` entities
3. Set up basic trading interfaces
4. Add station reputation system
5. Create simple quests and contracts

**Deliverable**: Working economy with profitable trade routes and station interactions

### Phase 4: World Generation (Week 7)
**Goals**: Implement procedural world generation for replayability

**Week 7 Tasks**:
1. Create `WorldGenerator` with seeded RNG
2. Implement station placement with Poisson disk sampling
3. Generate rail networks ensuring good connectivity
4. Create balanced trade route circuits
5. Scale world complexity to guild size
6. Add world events and dynamic challenges

**Deliverable**: Procedurally generated worlds with balanced trade opportunities

### Phase 5: Multiplayer Integration (Weeks 8-9)
**Goals**: Implement Colyseus multiplayer with state synchronization

**Week 8 Tasks**:
1. Set up Colyseus server with `GameRoom`
2. Implement server-side game systems
3. Create client-server state synchronization
4. Add player input buffering and reconciliation
5. Test basic multiplayer functionality

**Week 9 Tasks**:
1. Implement guild creation and management
2. Add time speed voting system
3. Create shared goals and cooperative mechanics
4. Handle player disconnection and reconnection
5. Optimize network performance

**Deliverable**: Stable multiplayer experience with 2-6 players

### Phase 6: Mobile Optimization & Polish (Weeks 10-11)
**Goals**: Optimize for mobile and add final polish features

**Week 10 Tasks**:
1. Optimize rendering for mobile performance
2. Implement responsive UI layouts
3. Add touch gesture controls
4. Create tutorial system
5. Add save/load functionality

**Week 11 Tasks**:
1. Performance profiling and optimization
2. Add audio and visual polish
3. Implement proper error handling
4. Create comprehensive testing suite
5. Documentation and deployment preparation

**Deliverable**: Production-ready game with mobile support

### Phase 7: Launch Preparation (Week 12)
**Goals**: Final testing, balancing, and deployment

1. Stress testing with multiple concurrent games
2. Balance testing and economic tuning
3. User experience testing on multiple devices
4. Performance optimization and bug fixes
5. Deployment to production environment

**Deliverable**: Live, playable game ready for users

## Success Metrics

### Technical Metrics
- **Performance**: 60 FPS on desktop, 30 FPS on mobile
- **Memory**: No memory leaks, stable object counts
- **Network**: <100ms latency, stable synchronization
- **Scalability**: Support 6 concurrent players per room

### Gameplay Metrics
- **Engagement**: Players complete tutorial (>80%)
- **Retention**: Players return for multiple sessions (>50%)
- **Cooperation**: Guilds successfully complete shared goals (>60%)
- **Customization**: Players use attachment system extensively (>90%)

This roadmap provides a clear path from the current prototype to a full multiplayer trading game while maintaining architectural integrity and ensuring mobile compatibility throughout the development process.