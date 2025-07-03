import { Vector3, Mesh, TransformNode, Scene } from "@babylonjs/core";
import { GameObject } from "../../../engine/core/GameObject";
import { Logger, LogCategory } from "../../../engine/utils/Logger";
import { PositionComponent } from "../../../engine/components/PositionComponent";
import { InventoryComponent } from "../../components/InventoryComponent";
import { NodeComponent} from "../../../engine/components/NodeComponent";
import { createCollisionRadius, createInteractionRadius } from "../../../engine/components/RadiusComponent";
import { AttachmentSlotComponent } from "../../components/AttachmentSlotComponent";
import { RailPositionComponent } from "../../components/RailPositionComponent";
import { TrainCarPositionComponent } from "../../components/TrainCarPositionComponent";
import { TrainCarVoxelComponent, CargoCapacityType, VoxelMaterial, VoxelFace } from "../../components/TrainCarVoxelComponent";
import { AttachmentSlotFactory } from "../../entities/Attachment/AttachmentSlotFactory";
import { TrainCarVoxel } from "../TrainCarVoxel/TrainCarVoxel";

export interface TrainCarConfig {
    id: string;
    type: string; // 'engine' | 'cargo' | 'passenger' | 'weapons'
    length: number;
    width?: number; // Voxel grid width (default 3)
    height?: number; // Voxel grid height (default 2)
    cargoCapacity?: number;
    attachmentSlots?: number;
    maxHealth?: number;
    voxelSpacing?: number; // Distance between voxel centers (default 1.0)
}

export interface TrainCarState {
    health: number;
    isDamaged: boolean;
    isOperational: boolean;
}

/**
 * TrainCar represents a single car in a train, using the ECS architecture.
 * Cars are composed of discrete voxel GameObjects arranged in a 3D grid.
 * Each voxel has its own position, health, and cargo properties.
 */
export class TrainCar extends GameObject {
    private _config: TrainCarConfig;
    private _state: TrainCarState;
    private _mesh?: Mesh;
    private _group?: TransformNode;
    
    // Voxel management
    private _voxels: Map<string, TrainCarVoxel> = new Map();
    private _voxelGrid: (TrainCarVoxel | null)[][][] = [];
    private _voxelSpacing: number;
    private _voxelDimensions: { width: number; height: number; length: number };

    constructor(config: TrainCarConfig, eventStack?: any, scene?: Scene, parentSceneNode?: NodeComponent) {
        super('trainCar', eventStack, scene);
        this._config = config;
        // Use consistent voxel spacing that matches the renderer's voxel size
        this._voxelSpacing = config.voxelSpacing || 0.5;

        // Initialize state
        this._state = {
            health: config.maxHealth || 100,
            isDamaged: false,
            isOperational: true
        };

        // Initialize voxel grid dimensions with validation
        // CRITICAL: Ensure the length dimension (X-axis) is the longest to align with track direction
        const logicalLength = config.length;
        const voxelLength = Math.max(4, Math.floor(logicalLength * 8)); // More voxels along track direction
        const width = Math.max(2, Math.min(4, Math.floor(config.width || 2))); // Keep narrow for train look
        const height = Math.max(2, Math.min(3, Math.floor(config.height || 2))); // Standard height
        
        // Validate reasonable bounds to prevent memory issues
        if (voxelLength > 50 || width > 50 || height > 50) {
            Logger.warn(LogCategory.TRAIN, `Train car dimensions too large: ${voxelLength}x${width}x${height}, clamping to reasonable values`);
        }
        
        const safeLength = Math.min(50, voxelLength);
        const safeWidth = Math.min(50, width);
        const safeHeight = Math.min(50, height);
        
        // Store safe dimensions for use in other methods
        // IMPORTANT: length is the X dimension and should be the longest
        this._voxelDimensions = { width: safeWidth, height: safeHeight, length: safeLength };
        
        // Initialize 3D voxel grid [length][height][width] = [X][Y][Z]
        this._voxelGrid = Array(safeLength).fill(null).map(() =>
            Array(safeHeight).fill(null).map(() =>
                Array(safeWidth).fill(null)
            )
        );

        // Add required components
        const position = new PositionComponent();
        this.addComponent(position);

        // Add scene graph component for hierarchical positioning
        if (scene) {
            const sceneNode = new NodeComponent(scene, parentSceneNode);
            this.addComponent(sceneNode);
            
            // Add collision radius for train car interactions
            const collisionRadius = createCollisionRadius(Math.max(safeLength, safeWidth) * 0.6); // Car-sized collision
            this.addComponent(collisionRadius);
            
            // Add interaction radius for attachment and UI systems
            const interactionRadius = createInteractionRadius(Math.max(safeLength, safeWidth) * 1.2);
            this.addComponent(interactionRadius);
            
            // Set up car-level event listeners
            sceneNode.addEventListener('voxel:damaged', (event) => {
                Logger.log(LogCategory.TRAIN, `TrainCar ${this.id} received voxel damage report: ${event.payload.voxelId}`);
                
                // Update car health based on voxel damage
                this.updateHealthFromVoxels();
                
                // Report significant damage to parent train
                if (this._state.health < 50) {
                    sceneNode.emitToParent('car:critical_damage', {
                        carId: this.id,
                        carType: this._config.type,
                        remainingHealth: this._state.health,
                        damagedVoxel: event.payload.voxelId
                    });
                }
            });
            
            // Listen for train-level commands
            sceneNode.addEventListener('train:power_change', (event) => {
                Logger.log(LogCategory.TRAIN, `TrainCar ${this.id} received power change: ${event.payload.newPower}`);
                this.onPowerChanged(event.payload.newPower, event.payload.efficiency || 1.0);
            });
            
            sceneNode.addEventListener('repair:request', (event) => {
                Logger.log(LogCategory.TRAIN, `TrainCar ${this.id} received repair request`);
                this.performRepairOperations(event.payload.priority || 'normal');
            });
        }

        // Add rail-specific components for train cars
        const railPosition = new RailPositionComponent(this);
        this.addComponent(railPosition);

        const trainCarPosition = new TrainCarPositionComponent(this, config.length);
        this.addComponent(trainCarPosition);

        // Add voxel grid management component
        const voxelComponent = new TrainCarVoxelComponent(this._voxelDimensions, this._voxelSpacing);
        this.addComponent(voxelComponent);

        // Add optional components based on car type
        if (config.cargoCapacity) {
            const inventory = new InventoryComponent(this, config.cargoCapacity);
            this.addComponent(inventory);
        }

        // All train cars support attachments via slot system
        const slotConfig = AttachmentSlotFactory.createSlotConfig(config.type);
        for (const slot of slotConfig.slots) {
            const slotComponent = new AttachmentSlotComponent(this, {
                slotType: slot.type,
                allowedTypes: [], // TODO: Fill with allowed types if available
                occupied: slot.isOccupied,
                attachmentId: undefined // or slot.attachmentId if present
            });
            this.addComponent(slotComponent);
        }

        // Initialize default voxel layout based on car type
        this.initializeDefaultVoxelLayout();

        // Initialize metrics
        this.metrics.set('health', this._state.health);
        this.metrics.set('cargo_used', 0);
        this.metrics.set('attachments_count', 0);
        this.metrics.set('damage_taken', 0);
        this.metrics.set('voxel_count', this._voxels.size);

        Logger.log(LogCategory.TRAIN, `TrainCar created with voxel system`, {
            id: config.id,
            type: config.type,
            dimensions: `${safeLength}x${safeWidth}x${safeHeight}`,
            voxelCount: this._voxels.size
        });
    }

    /**
     * Initialize default voxel layout based on car type
     */
    private initializeDefaultVoxelLayout(): void {
        const { width, height, length } = this._voxelDimensions;

        // Get car position for world positioning of voxels
        const positionComponent = this.getComponent<PositionComponent>('position');
        const carPosition = positionComponent?.getPosition() || { x: 0, y: 0, z: 0 };

        // Create voxels based on car type
        // Grid coordinates: X = length (forward), Y = height (up), Z = width (across track)
        for (let x = 0; x < length; x++) {
            for (let y = 0; y < height; y++) {
                for (let z = 0; z < width; z++) {
                    const shouldCreateVoxel = this.shouldCreateVoxelAt(x, y, z);
                    if (shouldCreateVoxel) {
                        this.createVoxelAt(x, y, z, carPosition);
                    }
                }
            }
        }

        // Update external faces and connections
        this.updateVoxelConnections();
    }

    /**
     * Determine if a voxel should be created at the given grid position
     * COORDINATE SYSTEM: X = length (along track), Y = height (up), Z = width (across)
     * Creates train-like shapes with the long axis aligned with movement direction
     */
    private shouldCreateVoxelAt(x: number, y: number, z: number): boolean {
        const carType = this._config.type;
        const { width, height, length } = this._voxelDimensions;
        
        // Basic layout: create solid blocks for most car types
        // The goal is to create recognizable train car shapes with length > width
        switch (carType) {
            case 'engine':
                // Engine has more structural voxels and a solid form
                // Create a mostly solid rectangular form that's longer than it is wide
                return true;
            case 'cargo':
                // Cargo cars have hollow centers for storage but solid frames
                // Create walls along the length (X) and ends, hollow in middle
                const isLengthWall = (x === 0 || x === length - 1); // Front/back walls
                const isWidthWall = (z === 0 || z === width - 1);   // Side walls
                const isFloor = (y === 0);                          // Floor
                const isRoof = (y === height - 1);                  // Roof
                
                return isFloor || isRoof || isLengthWall || isWidthWall;
            case 'passenger':
                // Passenger cars have floors, walls, and roofs
                const passengerIsWall = (x === 0 || x === length - 1 || z === 0 || z === width - 1);
                const passengerIsFloorRoof = (y === 0 || y === height - 1);
                
                return passengerIsFloorRoof || passengerIsWall;
            case 'weapons':
                // Weapons platforms need structural support - mostly solid
                return true;
            default:
                return true;
        }
    }

    /**
     * Create a voxel at the specified grid position
     */
    private createVoxelAt(gridX: number, gridY: number, gridZ: number, carPosition: { x: number, y: number, z: number }): void {
        const voxelId = `${this.carId}_voxel_${gridX}_${gridY}_${gridZ}`;
        
        // Get car's rotation for proper voxel grid alignment
        const positionComponent = this.getComponent<PositionComponent>('position');
        const carRotation = positionComponent?.getRotation();
        const carRotationY = carRotation?.y || 0;
        const cos = Math.cos(carRotationY);
        const sin = Math.sin(carRotationY);
        
        // Calculate local position relative to car center
        // COORDINATE SYSTEM (matching TrainCarVoxelComponent):
        // X-axis (gridX): along the length of the train car (forward/backward along track)
        // Y-axis (gridY): vertical (up/down)
        // Z-axis (gridZ): across the width of the train car (left/right across track)
        const localX = (gridX - (this._voxelDimensions.length - 1) / 2) * this._voxelSpacing;
        const localY = (gridY - (this._voxelDimensions.height - 1) / 2) * this._voxelSpacing;
        const localZ = (gridZ - (this._voxelDimensions.width - 1) / 2) * this._voxelSpacing;

        // Apply car rotation to align voxel grid with track direction
        // The rotation is applied so that the voxel grid's length (gridX) follows the track direction
        const rotatedX = localX * cos - localZ * sin;
        const rotatedZ = localX * sin + localZ * cos;

        // Calculate final world position
        const worldPosition = {
            x: carPosition.x + rotatedX,
            y: carPosition.y + localY,
            z: carPosition.z + rotatedZ
        };

        // Determine voxel properties based on position and car type
        const cargoType = this.getCargoTypeForPosition(gridX, gridY, gridZ);
        const material = this.getMaterialForPosition(gridX, gridY, gridZ);
        const capacity = this.getCapacityForPosition(gridX, gridY, gridZ);
        const maxHealth = 100; // Base health per voxel

        // Create the voxel GameObject with scene graph hierarchy
        const voxel = new TrainCarVoxel(
            voxelId,
            { x: gridX, y: gridY, z: gridZ },
            worldPosition,
            cargoType,
            material,
            capacity,
            maxHealth,
            this.eventStack,  // Pass eventStack to voxel
            this.scene,       // Pass scene to voxel
            this.getSceneNode()  // Pass this car's scene node as parent
        );

        // Set voxel rotation to match car rotation
        const voxelPositionComponent = voxel.getComponent<PositionComponent>('position');
        if (voxelPositionComponent) {
            voxelPositionComponent.setRotation({
                x: 0,
                y: carRotationY,
                z: 0
            });
        }

        // Add to our collections
        this._voxels.set(voxelId, voxel);
        this._voxelGrid[gridX][gridY][gridZ] = voxel;

        Logger.log(LogCategory.TRAIN, `Created voxel at grid position (${gridX}, ${gridY}, ${gridZ})`, {
            voxelId,
            worldPosition,
            cargoType,
            material
        });
    }

    /**
     * Determine cargo type for a voxel based on its position and car type
     * Grid coordinates: X = length (forward), Y = height (up), Z = width (across)
     */
    private getCargoTypeForPosition(x: number, y: number, z: number): CargoCapacityType {
        const carType = this._config.type;
        const { width, height, length } = this._voxelDimensions;
        
        switch (carType) {
            case 'engine':
                return CargoCapacityType.STRUCTURAL;
            case 'cargo':
                // Outer voxels are structural, inner ones provide cargo space
                const isOuter = x === 0 || x === length - 1 || 
                               y === 0 || y === height - 1 || 
                               z === 0 || z === width - 1;
                return isOuter ? CargoCapacityType.STRUCTURAL : CargoCapacityType.STANDARD;
            case 'passenger':
                return y === 0 ? CargoCapacityType.STRUCTURAL : CargoCapacityType.STANDARD;
            case 'weapons':
                return CargoCapacityType.STRUCTURAL;
            default:
                return CargoCapacityType.STANDARD;
        }
    }

    /**
     * Determine material for a voxel based on its position and car type
     */
    private getMaterialForPosition(_x: number, _y: number, _z: number): VoxelMaterial {
        const carType = this._config.type;
        
        switch (carType) {
            case 'engine':
                return VoxelMaterial.REINFORCED;
            case 'weapons':
                return VoxelMaterial.REINFORCED;
            default:
                return VoxelMaterial.STEEL;
        }
    }

    /**
     * Determine capacity for a voxel based on its position and cargo type
     */
    private getCapacityForPosition(x: number, y: number, z: number): number {
        const cargoType = this.getCargoTypeForPosition(x, y, z);
        
        switch (cargoType) {
            case CargoCapacityType.STRUCTURAL:
                return 10; // Minimal cargo capacity
            case CargoCapacityType.STANDARD:
                return 100;
            case CargoCapacityType.HAZARDOUS:
                return 50; // Reduced capacity for safety
            case CargoCapacityType.LIQUID:
                return 150; // Higher capacity for liquids
            default:
                return 100;
        }
    }

    /**
     * Update voxel connections and determine external faces
     */
    private updateVoxelConnections(): void {
        this._voxels.forEach((voxel) => {
            const { x, y, z } = voxel.gridPosition;
            
            // Check all 6 adjacent positions for connections
            const connections: string[] = [];
            const adjacentPositions = [
                { x: x - 1, y, z }, { x: x + 1, y, z }, // front/back
                { x, y: y - 1, z }, { x, y: y + 1, z }, // left/right
                { x, y, z: z - 1 }, { x, y, z: z + 1 }  // bottom/top
            ];

            adjacentPositions.forEach((pos) => {
                if (this.isValidGridPosition(pos.x, pos.y, pos.z)) {
                    const adjacentVoxel = this._voxelGrid[pos.x][pos.y][pos.z];
                    if (adjacentVoxel) {
                        connections.push(adjacentVoxel.id);
                    }
                }
            });

            voxel.connectedVoxels = connections;
            
            // Determine external faces (faces not connected to other voxels)
            voxel.availableFaces = this.getExternalFaces(x, y, z);
            voxel.isExternal = voxel.availableFaces.length > 0;
        });
    }

    /**
     * Check if a grid position is valid within the car's dimensions
     */
    private isValidGridPosition(x: number, y: number, z: number): boolean {
        const { width, height, length } = this._voxelDimensions;
        return x >= 0 && x < length &&
               y >= 0 && y < width &&
               z >= 0 && z < height;
    }

    /**
     * Get external faces for a voxel (faces that can have attachments)
     */
    private getExternalFaces(x: number, y: number, z: number): VoxelFace[] {
        const faces: VoxelFace[] = [];
        const { width, height, length } = this._voxelDimensions;

        // Check each face to see if it's external
        if (x === 0) faces.push(VoxelFace.FRONT);
        if (x === length - 1) faces.push(VoxelFace.REAR);
        if (y === 0) faces.push(VoxelFace.LEFT);
        if (y === width - 1) faces.push(VoxelFace.RIGHT);
        if (z === 0) faces.push(VoxelFace.BOTTOM);
        if (z === height - 1) faces.push(VoxelFace.TOP);

        return faces;
    }

    /**
     * Add a voxel to this train car
     */
    addVoxel(voxel: TrainCarVoxel): boolean {
        const { x, y, z } = voxel.gridPosition;
        
        if (!this.isValidGridPosition(x, y, z)) {
            Logger.warn(LogCategory.TRAIN, `Invalid grid position for voxel: (${x}, ${y}, ${z})`);
            return false;
        }

        if (this._voxelGrid[x][y][z] !== null) {
            Logger.warn(LogCategory.TRAIN, `Voxel already exists at position (${x}, ${y}, ${z})`);
            return false;
        }

        this._voxels.set(voxel.id, voxel);
        this._voxelGrid[x][y][z] = voxel;
        this.updateVoxelConnections();
        this.metrics.set('voxel_count', this._voxels.size);

        Logger.log(LogCategory.TRAIN, `Added voxel to car ${this.carId}`, {
            voxelId: voxel.id,
            position: `(${x}, ${y}, ${z})`
        });

        return true;
    }

    /**
     * Remove a voxel from this train car
     */
    removeVoxel(voxelId: string): boolean {
        const voxel = this._voxels.get(voxelId);
        if (!voxel) {
            Logger.warn(LogCategory.TRAIN, `Voxel ${voxelId} not found on car ${this.carId}`);
            return false;
        }

        const { x, y, z } = voxel.gridPosition;
        this._voxels.delete(voxelId);
        this._voxelGrid[x][y][z] = null;
        this.updateVoxelConnections();
        this.metrics.set('voxel_count', this._voxels.size);

        // Dispose the voxel GameObject
        voxel.dispose();

        Logger.log(LogCategory.TRAIN, `Removed voxel from car ${this.carId}`, {
            voxelId,
            position: `(${x}, ${y}, ${z})`
        });

        return true;
    }

    /**
     * Get all voxels in this train car
     */
    getVoxels(): TrainCarVoxel[] {
        return Array.from(this._voxels.values());
    }

    /**
     * Get voxel at specific grid position
     */
    getVoxelAt(x: number, y: number, z: number): TrainCarVoxel | null {
        if (!this.isValidGridPosition(x, y, z)) {
            return null;
        }
        return this._voxelGrid[x][y][z];
    }

    /**
     * Get voxels with external faces (for attachment placement)
     */
    getExternalVoxels(): TrainCarVoxel[] {
        return this.getVoxels().filter(voxel => voxel.isExternal);
    }

    get carId(): string {
        return this._config.id;
    }

    get carType(): string {
        return this._config.type;
    }

    get length(): number {
        return this._config.length;
    }

    /**
     * Get the actual physical length of the car based on its voxel grid
     */
    get actualLength(): number {
        return this._voxelDimensions.length * this._voxelSpacing;
    }

    get health(): number {
        return this._state.health;
    }

    get isDamaged(): boolean {
        return this._state.isDamaged;
    }

    get isOperational(): boolean {
        return this._state.isOperational;
    }

    get mesh(): Mesh | undefined {
        return this._mesh;
    }

    set mesh(value: Mesh | undefined) {
        this._mesh = value;
    }

    get group(): TransformNode | undefined {
        return this._group;
    }

    set group(value: TransformNode | undefined) {
        this._group = value;
    }

    /**
     * Get the voxel grid dimensions
     * @returns Object with length, width, and height of the voxel grid
     */
    getVoxelGridDimensions(): { length: number; width: number; height: number } {
        return { ...this._voxelDimensions };
    }

    /**
     * Update all voxel positions to match the current car position
     */
    private updateVoxelPositions(): void {
        const positionComponent = this.getComponent<PositionComponent>('position');
        const carPosition = positionComponent?.getPosition();
        const carRotation = positionComponent?.getRotation();
        
        if (!carPosition) {
            return; // No position component or position data
        }

        // Get car's Y rotation for aligning voxel grid with track direction
        const carRotationY = carRotation?.y || 0;
        const cos = Math.cos(carRotationY);
        const sin = Math.sin(carRotationY);

        // Update each voxel's world position relative to the car's current position and rotation
        this._voxels.forEach((voxel) => {
            const { x: gridX, y: gridY, z: gridZ } = voxel.gridPosition;
            
            // Calculate local position relative to car center
            // X-axis: along the length of the train car (forward/backward)
            // Y-axis: vertical (up/down)
            // Z-axis: across the width of the train car (left/right)
            const localX = (gridX - (this._voxelDimensions.length - 1) / 2) * this._voxelSpacing;
            const localY = (gridY - (this._voxelDimensions.height - 1) / 2) * this._voxelSpacing;
            const localZ = (gridZ - (this._voxelDimensions.width - 1) / 2) * this._voxelSpacing;

            // Apply car rotation to align voxel grid with track direction
            const rotatedX = localX * cos - localZ * sin;
            const rotatedZ = localX * sin + localZ * cos;

            // Calculate final world position
            const worldPosition = {
                x: carPosition.x + rotatedX,
                y: carPosition.y + localY,
                z: carPosition.z + rotatedZ
            };

            // Update the voxel's PositionComponent
            const voxelPositionComponent = voxel.getComponent<PositionComponent>('position');
            if (voxelPositionComponent) {
                voxelPositionComponent.setPosition(worldPosition);
                
                // Calculate the car's orientation vector (the "forward" direction)
                // This is the direction that the car is pointing along the track, which is the "long" dimension
                
                // Calculate the forward unit vector in world space based on car rotation
                const forwardX = Math.sin(carRotationY); // Unit vector components for the car's forward direction
                const forwardZ = Math.cos(carRotationY);
                
                // For debugging only - this is the forward vector of the car
                if (gridX === Math.floor(this._voxelDimensions.length / 2) && 
                    gridY === Math.floor(this._voxelDimensions.height / 2) && 
                    gridZ === Math.floor(this._voxelDimensions.width / 2)) {
                    Logger.log(LogCategory.TRAIN, 
                        `Car ${this.id} forward vector: (${forwardX.toFixed(2)}, 0, ${forwardZ.toFixed(2)}) at rotation: ${carRotationY.toFixed(2)}`
                    );
                }
                
                // Set the rotation so voxels are correctly oriented with the car's forward direction
                // We want the blue faces (+Z in Babylon) to point along the car's long axis
                voxelPositionComponent.setRotation({
                    x: 0,
                    y: carRotationY, // Voxels inherit the car's rotation around Y-axis
                    z: 0
                });
                
                // Log for debugging
                if (gridX === Math.floor(this._voxelDimensions.length / 2) && 
                    gridY === Math.floor(this._voxelDimensions.height / 2) && 
                    gridZ === Math.floor(this._voxelDimensions.width / 2)) {
                    // Only log the center voxel to avoid log spam
                    Logger.log(LogCategory.TRAIN, `Car ${this.id} rotation: ${carRotationY}, voxel rotation applied: ${carRotationY}`);
                }
            }
        });
    }

    /**
     * Update car state and all voxel components
     * @param deltaTime Time elapsed since last update in seconds
     */
    override update(deltaTime: number): void {
        // Update base components first
        super.update(deltaTime);

        // NOTE: No longer calling updateVoxelPositions() here
        // Voxel positions are now updated by TrainSystem.updateCarVoxelPositions()
        // This avoids conflicting updates to voxel positions and rotations

        // Update all voxels (they are GameObjects with their own update cycle)
        this._voxels.forEach(voxel => {
            voxel.update(deltaTime);
        });

        // Aggregate health from all voxels
        this.updateHealthFromVoxels();

        // Update health state
        if (this._state.health <= 50 && !this._state.isDamaged) {
            this._state.isDamaged = true;
            this.emitEvent({
                type: 'car_damaged',
                carId: this.carId,
                health: this._state.health,
                timestamp: performance.now()
            });
        }

        // Update all attachments for combat and other behaviors
        const positionComponent = this.getComponent<PositionComponent>('position');
        const currentPosition = positionComponent?.getPosition();
        
        this.getAttachments().forEach(attachment => {
            if (attachment.isFunctional()) {
                // Update attachment's world position if car has moved
                if (currentPosition) {
                    attachment.updateWorldPosition(currentPosition);
                }
                attachment.update(deltaTime);
            }
        });

        if (this._state.health <= 0 && this._state.isOperational) {
            this._state.isOperational = false;
            this.emitEvent({
                type: 'car_disabled',
                carId: this.carId,
                timestamp: performance.now()
            });
        }
    }

    // ============================================================
    // Scene Graph Integration & Event Handlers
    // ============================================================
    
    /**
     * Get the scene node component
     */
    getSceneNode(): NodeComponent | undefined {
        return this.getComponent<NodeComponent>('sceneNode');
    }
    
    /**
     * Update car health based on voxel health states
     */
    private updateHealthFromVoxels(): void {
        const voxels = Array.from(this._voxels.values());
        if (voxels.length === 0) return;
        
        const totalVoxelHealth = voxels.reduce((sum, voxel) => sum + voxel.getCurrentHealth(), 0);
        const maxVoxelHealth = voxels.reduce((sum, voxel) => sum + voxel.getMaxHealth(), 0);
        
        if (maxVoxelHealth > 0) {
            const healthPercentage = totalVoxelHealth / maxVoxelHealth;
            this._state.health = Math.round(healthPercentage * (this._config.maxHealth || 100));
            this._state.isDamaged = this._state.health < (this._config.maxHealth || 100) * 0.8;
            this._state.isOperational = this._state.health > (this._config.maxHealth || 100) * 0.2;
            
            Logger.log(LogCategory.TRAIN, `TrainCar ${this.id} health updated: ${this._state.health}% (${totalVoxelHealth}/${maxVoxelHealth} voxel health)`);
        }
    }
    
    /**
     * Handle power changes from the train
     */
    private onPowerChanged(newPower: number, efficiency: number): void {
        // Different car types respond differently to power changes
        switch (this._config.type) {
            case 'engine':
                // Engine cars manage power distribution
                Logger.log(LogCategory.TRAIN, `Engine car ${this.id} adjusting power output to ${newPower * efficiency}`);
                break;
            case 'cargo':
                // Cargo cars may have powered loading systems
                if (newPower < 80) {
                    Logger.log(LogCategory.TRAIN, `Cargo car ${this.id} reducing loading speed due to low power`);
                }
                break;
            case 'passenger':
                // Passenger cars have climate control and lighting
                if (newPower < 60) {
                    Logger.log(LogCategory.TRAIN, `Passenger car ${this.id} reducing amenities due to low power`);
                }
                break;
            case 'weapons':
                // Weapons require power for targeting and firing
                if (newPower < 100) {
                    Logger.log(LogCategory.TRAIN, `Weapons car ${this.id} entering power conservation mode`);
                }
                break;
        }
    }
    
    /**
     * Perform repair operations on damaged voxels
     */
    private performRepairOperations(priority: string): void {
        const damagedVoxels = Array.from(this._voxels.values())
            .filter(voxel => voxel.getCurrentHealth() < voxel.getMaxHealth())
            .sort((a, b) => a.getCurrentHealth() - b.getCurrentHealth()); // Most damaged first
        
        if (damagedVoxels.length === 0) {
            Logger.log(LogCategory.TRAIN, `TrainCar ${this.id} has no damaged voxels to repair`);
            return;
        }
        
        const repairAmount = priority === 'high' ? 50 : 25;
        const voxelsToRepair = priority === 'high' ? damagedVoxels.slice(0, 3) : [damagedVoxels[0]];
        
        voxelsToRepair.forEach(voxel => {
            voxel.heal(repairAmount);
            Logger.log(LogCategory.TRAIN, `Repaired voxel ${voxel.id} by ${repairAmount} points`);
        });
        
        // Update car health after repairs
        this.updateHealthFromVoxels();
        
        // Notify train of repair completion
        const sceneNode = this.getSceneNode();
        if (sceneNode) {
            sceneNode.emitToParent('car:repair_complete', {
                carId: this.id,
                repairedVoxels: voxelsToRepair.length,
                newHealth: this._state.health
            });
        }
    }
    
    /**
     * Emit power change to all voxels in this car
     */
    emitPowerChangeToVoxels(newPower: number, efficiency: number): void {
        const sceneNode = this.getSceneNode();
        if (!sceneNode) return;
        
        sceneNode.emitToChildren('train:power_change', {
            newPower,
            efficiency,
            carType: this._config.type
        }, true); // recursive to all descendants
    }
    
    /**
     * Get all voxels within radius for area effects
     */
    getVoxelsInRadius(center: { x: number; y: number; z: number }, radius: number): TrainCarVoxel[] {
        const sceneNode = this.getSceneNode();
        if (!sceneNode) return [];
        
        const centerVector = new Vector3(center.x, center.y, center.z);
        const nodesInRadius = sceneNode.getNodesInRadius(radius, (node) => {
            return node.gameObject?.type === 'trainCarVoxel';
        });
        
        return nodesInRadius
            .map(node => node.gameObject as TrainCarVoxel)
            .filter(voxel => voxel instanceof TrainCarVoxel);
    }

    /**
     * Get all attachments (public for renderer access)
     */
    getAttachments(): any[] {
        // TODO: Implement attachment system integration with scene graph
        return [];
    }
    
    /**
     * Get attachment statistics for UI display
     */
    getAttachmentStats(): {
        occupied: number;
        total: number;
        available: number;
        byType: Map<string, { count: number; slots: any[] }>;
    } {
        // TODO: Integrate with scene graph attachment system
        // For now, return placeholder data
        const byType = new Map<string, { count: number; slots: any[] }>();
        return {
            occupied: 0,
            total: 10, // Default total slots
            available: 10,
            byType
        };
    }
    
    /**
     * Get car state for train-level management
     */
    getState(): TrainCarState {
        return { ...this._state };
    }
    
    /**
     * Get total weight of car including voxels and cargo
     */
    getTotalWeight(): number {
        const voxelWeight = Array.from(this._voxels.values())
            .reduce((sum, voxel) => sum + voxel.weight, 0);
        
        const inventoryComp = this.getComponent('inventory');
        const cargoWeight = inventoryComp ? (inventoryComp as any).getCurrentWeight() : 0;
        
        return voxelWeight + cargoWeight;
    }
    
    /**
     * Get cargo capacity of this car
     */
    getCargoCapacity(): number {
        return this._config.cargoCapacity || 0;
    }
    
    /**
     * Take damage (placeholder - uses scene graph events instead)
     */
    takeDamage(amount: number): void {
        this._state.health = Math.max(0, this._state.health - amount);
        this._state.isDamaged = this._state.health < (this._config.maxHealth || 100) * 0.8;
        this._state.isOperational = this._state.health > (this._config.maxHealth || 100) * 0.2;
        
        Logger.log(LogCategory.TRAIN, `TrainCar ${this.id} took ${amount} damage, health: ${this._state.health}`);
    }
    
    /**
     * Repair car (placeholder - uses scene graph events instead)
     */
    repair(amount: number): void {
        const maxHealth = this._config.maxHealth || 100;
        this._state.health = Math.min(maxHealth, this._state.health + amount);
        this._state.isDamaged = this._state.health < maxHealth * 0.8;
        
        Logger.log(LogCategory.TRAIN, `TrainCar ${this.id} repaired ${amount} points, health: ${this._state.health}`);
    }
    
    /**
     * Serialize car state (simplified)
     */
    serialize(): any {
        return {
            id: this.id,
            type: this._config.type,
            health: this._state.health,
            maxHealth: this._config.maxHealth || 100,
            cargoCapacity: this._config.cargoCapacity || 0,
            voxelCount: this._voxels.size,
            isOperational: this._state.isOperational
        };
    }
    
    /**
     * Add attachment to car (placeholder for attachment system)
     */
    addAttachment(attachment: any, position: string, x: number, y: number, z: number): boolean {
        // TODO: Implement attachment system integration with scene graph
        // Suppress unused parameter warnings for now
        void attachment;
        void position;
        void x;
        void y;
        void z;
        Logger.log(LogCategory.TRAIN, `TrainCar ${this.id} attachment system not yet implemented`);
        return false;
    }
    
    /**
     * Get slot component (placeholder for attachment system)
     */
    getSlotComponent(): any {
        return this.getComponent('attachmentSlot');
    }
    
    /**
     * Deserialize car state (placeholder)
     */
    deserialize(data: any): void {
        // TODO: Implement deserialization
        void data; // Suppress unused parameter warning
    }
}
