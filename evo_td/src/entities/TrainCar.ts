import { Vector3, Mesh, TransformNode, Scene } from "@babylonjs/core";
import { GameObject } from "../core/GameObject";
import { Logger, LogCategory } from "../utils/Logger";
import { PositionComponent } from "../components/PositionComponent";
import { HealthComponent } from "../components/HealthComponent";
import { InventoryComponent } from "../components/InventoryComponent";
import { Attachment } from "./Attachment";
import { AttachmentSlotComponent } from "../components/AttachmentSlotComponent";
import { RailPositionComponent } from "../components/RailPositionComponent";
import { TrainCarPositionComponent } from "../components/TrainCarPositionComponent";
import { AttachmentSlotFactory } from "./AttachmentSlotFactory";
import { TrainCarVoxel } from "./TrainCarVoxel";
import { TrainCarVoxelComponent, CargoCapacityType, VoxelMaterial, VoxelFace } from "../components/TrainCarVoxelComponent";
import { VoxelRenderComponent } from "../renderers/VoxelRenderComponent";

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

    constructor(config: TrainCarConfig, eventStack?: any, scene?: Scene) {
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
        // Create a reasonable voxel grid for train cars
        const logicalLength = config.length;
        const voxelLength = Math.max(4, Math.floor(logicalLength * 8)); // More voxels for train-like proportions
        const width = Math.max(2, Math.floor(config.width || 2)); // Keep narrow for train look
        const height = Math.max(2, Math.floor(config.height || 2)); // Standard height
        
        // Validate reasonable bounds to prevent memory issues
        if (voxelLength > 50 || width > 50 || height > 50) {
            Logger.warn(LogCategory.TRAIN, `Train car dimensions too large: ${voxelLength}x${width}x${height}, clamping to reasonable values`);
        }
        
        const safeLength = Math.min(50, voxelLength);
        const safeWidth = Math.min(50, width);
        const safeHeight = Math.min(50, height);
        
        // Store safe dimensions for use in other methods
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
        const slotComponent = new AttachmentSlotComponent(slotConfig);
        this.addComponent(slotComponent);

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
        // Grid coordinates: X = length (forward), Y = height (up), Z = width (across)
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
     * Grid coordinates: X = length (forward), Y = height (up), Z = width (across)
     */
    private shouldCreateVoxelAt(x: number, y: number, z: number): boolean {
        const carType = this._config.type;
        const { width, height, length } = this._voxelDimensions;
        
        // Basic layout: create solid blocks for most car types
        switch (carType) {
            case 'engine':
                // Engine has more structural voxels
                return true;
            case 'cargo':
                // Cargo cars may have hollow centers for storage
                return y === 0 || x === 0 || x === length - 1 || z === 0 || z === width - 1;
            case 'passenger':
                // Passenger cars have floors and walls
                return y === 0 || x === 0 || x === length - 1 || z === 0 || z === width - 1;
            case 'weapons':
                // Weapons platforms need structural support
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

        // Determine voxel properties based on position and car type
        const cargoType = this.getCargoTypeForPosition(gridX, gridY, gridZ);
        const material = this.getMaterialForPosition(gridX, gridY, gridZ);
        const capacity = this.getCapacityForPosition(gridX, gridY, gridZ);
        const maxHealth = 100; // Base health per voxel

        // Create the voxel GameObject
        const voxel = new TrainCarVoxel(
            voxelId,
            { x: gridX, y: gridY, z: gridZ },
            worldPosition,
            cargoType,
            material,
            capacity,
            maxHealth,
            this.eventStack,  // Pass eventStack to voxel
            this.scene        // Pass scene to voxel
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
                voxelPositionComponent.setRotation({
                    x: 0,
                    y: carRotationY,
                    z: 0
                });
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

        // Synchronize voxel positions with car position
        this.updateVoxelPositions();

        // Update all voxels (they are GameObjects with their own update cycle)
        this._voxels.forEach(voxel => {
            voxel.update(deltaTime);
        });

        // Aggregate health from all voxels
        this.updateAggregateHealth();

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

    /**
     * Update aggregate health from all voxels
     */
    private updateAggregateHealth(): void {
        if (this._voxels.size === 0) {
            this._state.health = 0;
            return;
        }

        let totalHealth = 0;
        let maxPossibleHealth = 0;

        this._voxels.forEach(voxel => {
            const healthComponent = voxel.getComponent<HealthComponent>('health');
            if (healthComponent) {
                totalHealth += healthComponent.getHealth();
                maxPossibleHealth += healthComponent.getMaxHealth();
            }
        });

        // Calculate percentage health
        this._state.health = maxPossibleHealth > 0 ? (totalHealth / maxPossibleHealth) * 100 : 0;
        this.metrics.set('health', this._state.health);
    }

    /**
     * Take damage and distribute it across voxels
     */
    takeDamage(amount: number): void {
        const prevHealth = this._state.health;
        
        // Distribute damage across all voxels
        // For now, apply equal damage to all voxels (can be made more sophisticated later)
        const voxels = this.getVoxels();
        if (voxels.length === 0) return;

        const damagePerVoxel = amount / voxels.length;
        
        voxels.forEach(voxel => {
            const healthComponent = voxel.getComponent<HealthComponent>('health');
            if (healthComponent) {
                healthComponent.takeDamage(damagePerVoxel);
            }
        });

        // Update aggregate health
        this.updateAggregateHealth();
        
        // Update metrics
        this.metrics.set('damage_taken', this.metrics.get('damage_taken')! + amount);

        this.emitEvent({
            type: 'car_damage_taken',
            carId: this.carId,
            damage: amount,
            previousHealth: prevHealth,
            currentHealth: this._state.health,
            timestamp: performance.now()
        });
    }

    /**
     * Repair the car by healing voxels
     */
    repair(amount: number): void {
        const prevHealth = this._state.health;
        
        // Distribute healing across all damaged voxels
        const voxels = this.getVoxels();
        if (voxels.length === 0) return;

        const healingPerVoxel = amount / voxels.length;
        
        voxels.forEach(voxel => {
            const healthComponent = voxel.getComponent<HealthComponent>('health');
            if (healthComponent) {
                healthComponent.heal(healingPerVoxel);
            }
        });

        // Update aggregate health
        this.updateAggregateHealth();

        // Update state flags
        if (this._state.health > 50) {
            this._state.isDamaged = false;
        }
        if (this._state.health > 0) {
            this._state.isOperational = true;
        }

        this.emitEvent({
            type: 'car_repaired',
            carId: this.carId,
            amount: amount,
            previousHealth: prevHealth,
            currentHealth: this._state.health,
            timestamp: performance.now()
        });
    }

    /**
     * Get the attachment slot component for this car
     */
    getSlotComponent(): AttachmentSlotComponent | null {
        return this.getComponent('attachmentSlot') as AttachmentSlotComponent | null;
    }

    // Direct attachment management (bypassing old slot system for now)
    private attachments: Map<string, Attachment> = new Map();

    /**
     * Add an attachment to this car at a specific grid position
     */
    addAttachment(
        attachment: Attachment,
        slotType: string,
        gridX: number,
        gridY: number,
        gridZ: number
    ): boolean {
        const attachmentId = attachment.id;
        
        // Check if attachment is already on this car
        if (this.attachments.has(attachmentId)) {
            Logger.warn(LogCategory.TRAIN, `Attachment ${attachmentId} already on car ${this.carId}`);
            return false;
        }

        // Mount the attachment
        const mountSuccess = attachment.mount({
            x: gridX,
            y: gridY, 
            z: gridZ,
            slotType: slotType as any,
            parentCarId: this.carId
        });

        if (!mountSuccess) {
            Logger.warn(LogCategory.TRAIN, `Failed to mount attachment ${attachmentId} on car ${this.carId}`);
            return false;
        }

        // Update the attachment's world position based on this car's current position
        const positionComponent = this.getComponent<PositionComponent>('position');
        if (positionComponent) {
            const carPosition = positionComponent.getPosition();
            attachment.updateWorldPosition(carPosition);
        }

        // Add to our attachment map
        this.attachments.set(attachmentId, attachment);
        this.metrics.set('attachments_count', this.attachments.size);
        
        this.emitEvent({
            type: 'attachment_added',
            carId: this.carId,
            attachmentName: attachment.getConfig().name,
            attachmentType: attachment.getAttachmentType(),
            gridPosition: { x: gridX, y: gridY, z: gridZ },
            slotType: slotType,
            timestamp: performance.now()
        });

        Logger.log(LogCategory.TRAIN, `Added attachment to car ${this.carId}`, {
            attachment: attachment.getConfig().name,
            position: `(${gridX}, ${gridY}, ${gridZ})`,
            slotType: slotType
        });
        
        return true;
    }

    /**
     * Remove an attachment from this car
     */
    removeAttachment(attachmentId: string): boolean {
        const attachment = this.attachments.get(attachmentId);
        if (!attachment) {
            Logger.warn(LogCategory.TRAIN, `Attachment ${attachmentId} not found on car ${this.carId}`);
            return false;
        }

        // Unmount the attachment
        attachment.unmount();
        
        // Remove from our attachment map
        this.attachments.delete(attachmentId);
        this.metrics.set('attachments_count', this.attachments.size);
        
        this.emitEvent({
            type: 'attachment_removed',
            carId: this.carId,
            attachmentId: attachmentId,
            timestamp: performance.now()
        });

        Logger.log(LogCategory.TRAIN, `Removed attachment from car ${this.carId}`, {
            attachmentId: attachmentId
        });

        return true;
    }

    /**
     * Get all attachments on this car
     */
    getAttachments(): Attachment[] {
        return Array.from(this.attachments.values());
    }

    /**
     * Get attachment capacity statistics
     */
    getAttachmentStats(): any {
        const slotComponent = this.getSlotComponent();
        if (!slotComponent) {
            return { totalSlots: 0, occupied: 0, available: 0 };
        }

        return slotComponent.getOccupancyStats();
    }

    serialize(): TrainCarConfig & TrainCarState {
        return {
            ...this._config,
            ...this._state
        };
    }

    deserialize(data: TrainCarConfig & Partial<TrainCarState>): void {
        this._config = { ...data };
        this._state = {
            health: data.health ?? this._state.health,
            isDamaged: data.isDamaged ?? this._state.isDamaged,
            isOperational: data.isOperational ?? this._state.isOperational
        };

        // Update metrics
        this.metrics.set('health', this._state.health);
    }

    dispose(): void {
        // Dispose all voxels first
        this._voxels.forEach(voxel => {
            voxel.dispose();
        });
        this._voxels.clear();
        
        // Clear voxel grid
        this._voxelGrid = [];

        // Dispose Babylon.js objects
        if (this._mesh) {
            this._mesh.dispose();
            this._mesh = undefined;
        }
        if (this._group) {
            this._group.dispose();
            this._group = undefined;
        }
        
        super.dispose();
    }

    /**
     * Set up rendering for this car and all its voxels
     * Should be called after the car is created and registered with SceneManager
     */
    setupRendering(scene: Scene): void {
        // Add VoxelRenderComponent to all existing voxels
        this._voxels.forEach(voxel => {
            // Check if voxel already has a render component
            if (!voxel.getComponent('render')) {
                const voxelRenderComponent = new VoxelRenderComponent(scene, { 
                    size: this._voxelSpacing * 0.8 // Slightly smaller than spacing for visual gaps
                });
                voxel.addComponent(voxelRenderComponent);
                
                Logger.log(LogCategory.RENDERING, `Added VoxelRenderComponent to voxel ${voxel.id}`);
            }
        });

        Logger.log(LogCategory.RENDERING, `Rendering setup complete for car ${this.carId}`, {
            voxelCount: this._voxels.size
        });
    }
}
