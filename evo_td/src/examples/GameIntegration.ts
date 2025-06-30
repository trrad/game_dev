/**
 * Example integration of the ECS system with the current game architecture
 * This serves as a bridge between the old prototype and our new ECS architecture
 */

import { Engine, Scene, MeshBuilder, Vector3, StandardMaterial, Color3, PointLight } from "@babylonjs/core";
import { Game } from "../game/Game";
import { SceneManager } from "../core/SceneManager";
import { Station } from "../game/Station";
import { Rail } from "../game/Rail";
import { Train } from "../entities/Train";
import { TrainSystem } from "../systems/TrainSystem";
import { PositionComponent } from "../components/PositionComponent";
import { MovementComponent } from "../components/MovementComponent";
import { InventoryComponent } from "../components/InventoryComponent";
import { AttachmentComponent } from "../components/AttachmentComponent";
import { TrainCar } from "../game/TrainCar";
import { GameObject } from "../core/GameObject";
import { EventStack } from "../game/EventStack";
import { Logger, LogCategory } from "../utils/Logger";

export class GameIntegration {
    private game: Game;
    private sceneManager: SceneManager;
    private trainSystem: TrainSystem;
    private entities: Map<string, GameObject> = new Map();
    private playerIds: string[] = [];
    private eventStack: EventStack;
    
    constructor(engine: Engine) {
        // Initialize core game systems
        this.game = new Game();
        this.sceneManager = this.game.initSceneManager(engine, {
            fieldOfViewDistance: 100,
            enableCulling: true,
            maxVisibleObjects: 500,
            debugMode: true
        });
        
        this.trainSystem = new TrainSystem();
        this.eventStack = new EventStack();
        
        Logger.log(LogCategory.SYSTEM, "Game integration initialized");
    }
    
    /**
     * Initialize the game world and entities
     */
    public initialize(): void {
        this.createPlayers();
        this.createStations();
        this.createRails();
        this.createTrains();
        
        // Connect game events with the event stack
        this.connectEvents();
        
        Logger.log(LogCategory.SYSTEM, "Game world initialized");
    }
    
    /**
     * Create player IDs
     */
    private createPlayers(): void {
        this.playerIds = ['player1', 'player2'];
    }
    
    /**
     * Create stations in the game world
     */
    private createStations(): void {
        // Create some stations with meshes
        const stationPositions = [
            { id: 'station1', name: 'Alpha Station', x: 0, y: 0, z: -50 },
            { id: 'station2', name: 'Beta Station', x: 50, y: 0, z: 20 },
            { id: 'station3', name: 'Gamma Station', x: -40, y: 0, z: 30 },
        ];
        
        for (const pos of stationPositions) {
            // Create the station game object
            const station = new Station(pos.id, pos.name);
            
            // Create a visual representation
            const stationMesh = MeshBuilder.CreateBox(
                `station_${pos.id}`,
                { width: 5, height: 3, depth: 5 },
                this.sceneManager.scene
            );
            stationMesh.position = new Vector3(pos.x, pos.y, pos.z);
            
            const material = new StandardMaterial(`station_${pos.id}_material`, this.sceneManager.scene);
            material.diffuseColor = new Color3(0.2, 0.4, 0.8);
            stationMesh.material = material;
            
            // Register with SceneManager
            this.sceneManager.registerGameObject(station, stationMesh);
            this.entities.set(pos.id, station);
            
            Logger.log(LogCategory.SYSTEM, `Created station: ${pos.name} at (${pos.x}, ${pos.y}, ${pos.z})`);
        }
    }
    
    /**
     * Create rails connecting stations
     */
    private createRails(): void {
        const railConnections = [
            { id: 'rail1', name: 'Alpha-Beta Line', from: 'station1', to: 'station2', distance: 100 },
            { id: 'rail2', name: 'Beta-Gamma Line', from: 'station2', to: 'station3', distance: 80 },
            { id: 'rail3', name: 'Gamma-Alpha Line', from: 'station3', to: 'station1', distance: 100 },
        ];
        
        for (const conn of railConnections) {
            // Create the rail game object
            const rail = new Rail(conn.id, conn.name, conn.distance);
            
            // Get the station positions to calculate rail path
            const stationFrom = this.entities.get(conn.from) as Station;
            const stationTo = this.entities.get(conn.to) as Station;
            
            if (stationFrom && stationTo) {
                // Connect the stations with the rail
                stationFrom.connectRail(rail.id, conn.to);
                stationTo.connectRail(rail.id, conn.from);
                
                // Create a visual representation (a line)
                const fromPos = (this.sceneManager.getVisualForGameObject(stationFrom.id)?.position || new Vector3(0, 0, 0)).clone();
                const toPos = (this.sceneManager.getVisualForGameObject(stationTo.id)?.position || new Vector3(0, 0, 0)).clone();
                
                // Create a mesh and adjust it to connect the stations
                const railMesh = MeshBuilder.CreateLines(
                    `rail_${conn.id}`,
                    { 
                        points: [
                            fromPos,
                            toPos
                        ],
                        updatable: true
                    },
                    this.sceneManager.scene
                );
                
                // Register with SceneManager
                this.sceneManager.registerGameObject(rail, railMesh);
                this.entities.set(conn.id, rail);
                
                Logger.log(LogCategory.SYSTEM, `Created rail: ${conn.name} connecting ${stationFrom.name} to ${stationTo.name}`);
            }
        }
    }
    
    /**
     * Create trains for each player
     */
    private createTrains(): void {
        for (let i = 0; i < this.playerIds.length; i++) {
            const playerId = this.playerIds[i];
            const trainId = `train_${playerId}`;
            const stationId = `station${i + 1}`;
            
            // Create train through train system
            const train = this.trainSystem.createTrain(playerId, {
                baseSpeed: 0.5,
                cargoCapacity: 200,
                carSpacing: 0.8,
                powerEfficiency: 1.0
            });
            
            // Create a visual representation
            const trainMesh = MeshBuilder.CreateBox(
                `train_${train.id}`,
                { width: 2, height: 1.5, depth: 4 },
                this.sceneManager.scene
            );
            
            // Position the train at its starting station
            const station = this.entities.get(stationId) as Station;
            const stationPos = this.sceneManager.getVisualForGameObject(stationId)?.position || new Vector3(0, 0, 0);
            trainMesh.position = stationPos.clone();
            trainMesh.position.y += 2; // Lift it a bit above the ground
            
            // Set material color based on player
            const material = new StandardMaterial(`train_${train.id}_material`, this.sceneManager.scene);
            material.diffuseColor = (i === 0) ? 
                new Color3(0.8, 0.2, 0.2) :  // Player 1: red
                new Color3(0.2, 0.8, 0.2);   // Player 2: green
            trainMesh.material = material;
            
            // Register with SceneManager
            this.sceneManager.registerGameObject(train, trainMesh);
            this.entities.set(train.id, train);
            
            Logger.log(LogCategory.SYSTEM, `Created train for ${playerId} at ${station?.name}`);
            
            // Add train cars to the train
            this.createTrainCars(train, 3, ['engine', 'cargo', 'cargo']);
            
            // For player 1, add some weapons and lights
            if (i === 0) {
                const trainCars = train.getComponent<AttachmentComponent>('attachment')?.getAttachedItems() || [];
                if (trainCars.length > 0) {
                    // Add a turret to the first car (engine)
                    this.addWeaponToTrainCar(trainCars[0].id, 'turret', 'top', { x: 0, y: 0 });
                    
                    // Add lights to the front of the engine
                    this.addLightToTrainCar(trainCars[0].id, 'front', { x: 0.3, y: 0.5 });
                    this.addLightToTrainCar(trainCars[0].id, 'front', { x: 0.7, y: 0.5 });
                    
                    // Add cannons to the sides of the second car (cargo)
                    if (trainCars.length > 1) {
                        this.addWeaponToTrainCar(trainCars[1].id, 'cannon', 'left', { x: 0.5, y: 0.5 });
                        this.addWeaponToTrainCar(trainCars[1].id, 'cannon', 'right', { x: 0.5, y: 0.5 });
                    }
                    
                    // Add a turret to the last car
                    if (trainCars.length > 2) {
                        this.addWeaponToTrainCar(trainCars[2].id, 'turret', 'top', { x: 0.5, y: 0.5 });
                    }
                }
            }
        }
    }
    
    /**
     * Connect the ECS entities' events to the game event system
     */
    private connectEvents(): void {
        // Connect train events to the event stack
        this.trainSystem.onTrainEvent((event) => {
            this.eventStack.push({
                type: event.type,
                timestamp: Date.now(),
                data: event
            });
            
            // Update visuals if the train is moving
            if (event.type === 'journey_started' || event.type === 'journey_progress') {
                const train = this.trainSystem.getTrain(event.trainId);
                if (train) {
                    this.updateTrainVisualPosition(train);
                }
            }
        });
        
        // Connect event stack to game logic
        this.eventStack.onEvent((event) => {
            this.handleGameEvent(event);
        });
    }
    
    /**
     * Update a train's visual position based on its journey progress
     */
    private updateTrainVisualPosition(train: Train): void {
        if (!train.isMoving) return;
        
        // Get the current rail the train is on
        const railId = train.getCurrentRailId();
        const destinationId = train.getCurrentDestinationId();
        
        if (!railId || !destinationId) return;
        
        const rail = this.entities.get(railId) as Rail;
        const destination = this.entities.get(destinationId) as Station;
        
        if (!rail || !destination) return;
        
        // Get position of destination station
        const startPos = (this.sceneManager.getVisualForGameObject(rail.getOtherEnd(destinationId))?.position || new Vector3(0, 0, 0)).clone();
        const endPos = (this.sceneManager.getVisualForGameObject(destinationId)?.position || new Vector3(0, 0, 0)).clone();
        
        // Interpolate position based on progress
        const progress = train.progress;
        const trainVisual = this.sceneManager.getVisualForGameObject(train.id);
        
        if (trainVisual) {
            trainVisual.position = Vector3.Lerp(startPos, endPos, progress);
            trainVisual.position.y += 2; // Keep it above the ground
            
            // Also set the position component for ECS
            const posComp = train.getComponent<PositionComponent>('position');
            if (posComp) {
                posComp.setPosition({
                    x: trainVisual.position.x,
                    y: trainVisual.position.y,
                    z: trainVisual.position.z
                });
            }
        }
    }
    
    /**
     * Handle game events from the event stack
     */
    private handleGameEvent(event: { type: string, timestamp: number, data: any }): void {
        switch (event.type) {
            case 'journey_completed':
                Logger.log(LogCategory.GAMEPLAY, `Train ${event.data.trainId} completed journey to ${event.data.destinationId}`);
                break;
                
            case 'journey_started':
                Logger.log(LogCategory.GAMEPLAY, `Train ${event.data.trainId} started journey to ${event.data.destinationId}`);
                break;
                
            // Handle other event types
        }
    }
    
    /**
     * Start the game loop
     */
    public start(): void {
        this.game.start();
        this.sceneManager.start();
        
        // Example of starting a journey for the first train
        const firstTrain = this.trainSystem.getPlayerTrains(this.playerIds[0])[0];
        if (firstTrain) {
            setTimeout(() => {
                firstTrain.startJourney('rail1', 'station2', 100);
                Logger.log(LogCategory.GAMEPLAY, "Initial journey started");
            }, 2000);
        }
    }
    
    /**
     * Update the game state (called each frame)
     * @param deltaTime Time since last update in seconds
     */
    public update(deltaTime: number): void {
        // Update all trains
        this.trainSystem.update(deltaTime);
        
        // Update the scene manager (which handles visual updates)
        this.sceneManager.update(deltaTime);
        
        // Update train visual positions
        this.trainSystem.getTrains().forEach(train => {
            if (train.isMoving) {
                this.updateTrainVisualPosition(train);
            }
        });
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        this.sceneManager.dispose();
    }
    
    /**
     * Start a journey for a specific train
     */
    public startTrainJourney(trainId: string, railId: string, destinationId: string, distance: number): boolean {
        const train = this.trainSystem.getTrain(trainId);
        if (train) {
            return train.startJourney(railId, destinationId, distance);
        }
        return false;
    }
    
    /**
     * Get the SceneManager instance
     */
    public getSceneManager(): SceneManager {
        return this.sceneManager;
    }
    
    /**
     * Get the Train System instance
     */
    public getTrainSystem(): TrainSystem {
        return this.trainSystem;
    }
    
    /**
     * Get the Game instance
     */
    public getGame(): Game {
        return this.game;
    }
    
    /**
     * Create train cars for a train
     * @param train The train to add cars to
     * @param numberOfCars Number of cars to add
     * @param carTypes Types of cars to create
     */
    public createTrainCars(train: Train, numberOfCars: number = 3, carTypes: string[] = ['engine', 'cargo', 'cargo']): void {
        const trainMesh = this.sceneManager.getVisualForGameObject(train.id);
        if (!trainMesh) return;
        
        const trainPos = trainMesh.position.clone();
        const movementComp = train.getComponent<MovementComponent>('movement');
        const direction = movementComp?.getDirection() || { x: 0, y: 0, z: -1 };
        
        let lastPosition = trainPos.clone();
        
        // Create train cars
        for (let i = 0; i < numberOfCars; i++) {
            const carType = carTypes[i] || 'cargo';
            const carId = `car_${train.id}_${i}`;
            
            // Create the car with appropriate configuration
            const car = new TrainCar({
                id: carId,
                type: carType,
                length: carType === 'engine' ? 8 : 10,
                cargoCapacity: carType === 'cargo' ? 100 : 20,
                attachmentSlots: carType === 'engine' ? 2 : 3,
                maxHealth: 100
            });
            
            // Position the car behind the train or previous car
            // Adjust position based on car length and spacing
            const carLength = carType === 'engine' ? 8 : 10;
            const carSpacing = 0.8; // Spacing between cars in world units
            
            // Move back along the train's direction
            const carPosition = lastPosition.clone();
            carPosition.subtractInPlace(new Vector3(
                direction.x * (carLength + carSpacing),
                0,
                direction.z * (carLength + carSpacing)
            ));
            
            // Create visual representation
            const carMesh = MeshBuilder.CreateBox(
                `traincar_${carId}`,
                { 
                    width: 2, 
                    height: 1.5, 
                    depth: carType === 'engine' ? 4 : 5 
                },
                this.sceneManager.scene
            );
            carMesh.position = carPosition.clone();
            
            // Assign material based on car type
            const material = new StandardMaterial(`traincar_${carId}_material`, this.sceneManager.scene);
            if (carType === 'engine') {
                material.diffuseColor = new Color3(0.6, 0.3, 0.2); // Brown for engine
            } else {
                material.diffuseColor = new Color3(0.4, 0.4, 0.5); // Grey for cargo cars
            }
            carMesh.material = material;
            
            // Register car with scene manager
            this.sceneManager.registerGameObject(car, carMesh);
            this.entities.set(carId, car);
            
            // Update the last position for the next car
            lastPosition = carPosition.clone();
            
            // Connect car to train (in the future, through an attachment component)
            if (train.getComponent<AttachmentComponent>('attachment')) {
                train.getComponent<AttachmentComponent>('attachment')?.attachItem({
                    id: carId,
                    type: 'train-car',
                    item: car
                });
            }
            
            Logger.log(LogCategory.SYSTEM, `Created ${carType} car for train ${train.id}`);
        }
    }
    
    /**
     * Add a weapon attachment to a train car
     * @param carId The ID of the car to attach the weapon to
     * @param weaponType The type of weapon to attach
     * @param face The face of the car to attach to
     * @param position The grid position on the face
     */
    public addWeaponToTrainCar(
        carId: string, 
        weaponType: 'turret' | 'cannon' = 'turret', 
        face: 'top' | 'left' | 'right' = 'top',
        position: { x: number, y: number } = { x: 0, y: 0 }
    ): void {
        const car = this.entities.get(carId) as TrainCar;
        if (!car) return;
        
        const carMesh = this.sceneManager.getVisualForGameObject(carId);
        if (!carMesh) return;
        
        // Create the weapon GameObject (simplified)
        const weaponId = `weapon_${carId}_${face}_${position.x}_${position.y}`;
        const weaponMesh = MeshBuilder.CreateBox(
            weaponId,
            { width: 0.8, height: 0.8, depth: 0.8 },
            this.sceneManager.scene
        );
        
        // Position the weapon relative to the car
        const carPosition = carMesh.position.clone();
        let weaponPosition = carPosition.clone();
        
        // Adjust position based on face and grid position
        switch (face) {
            case 'top':
                weaponPosition.y += 1;
                weaponPosition.x += (position.x - 0.5) * 1;
                weaponPosition.z += (position.y - 0.5) * 1;
                break;
            case 'left':
                weaponPosition.x -= 1.2;
                weaponPosition.y += (position.y - 0.5) * 0.8;
                weaponPosition.z += (position.x - 0.5) * 1;
                break;
            case 'right':
                weaponPosition.x += 1.2;
                weaponPosition.y += (position.y - 0.5) * 0.8;
                weaponPosition.z += (position.x - 0.5) * 1;
                break;
        }
        
        weaponMesh.position = weaponPosition;
        
        // Color based on weapon type
        const material = new StandardMaterial(`${weaponId}_material`, this.sceneManager.scene);
        material.diffuseColor = weaponType === 'turret' 
            ? new Color3(0.7, 0.2, 0.2) // Red for turret
            : new Color3(0.3, 0.3, 0.7); // Blue for cannon
        weaponMesh.material = material;
        
        // Create a simple game object to represent the weapon
        const weaponObject = new GameObject(weaponId);
        this.sceneManager.registerGameObject(weaponObject, weaponMesh);
        this.entities.set(weaponId, weaponObject);
        
        // Connect weapon to car using attachment component (if available)
        if (car.getComponent<AttachmentComponent>('attachment')) {
            car.getComponent<AttachmentComponent>('attachment')?.attachItem({
                id: weaponId,
                type: 'weapon',
                item: weaponObject
            });
        }
        
        Logger.log(LogCategory.SYSTEM, `Added ${weaponType} to car ${carId} on ${face} face`);
    }
    
    /**
     * Add a light attachment to a train car
     * @param carId The ID of the car to attach the light to
     * @param face The face of the car to attach to
     * @param position The position on the face
     * @param color The color of the light
     */
    public addLightToTrainCar(
        carId: string, 
        face: 'front' | 'back' | 'top' = 'front',
        position: { x: number, y: number } = { x: 0, y: 0 },
        color: Color3 = new Color3(1, 0.9, 0.5)
    ): void {
        const car = this.entities.get(carId) as TrainCar;
        if (!car) return;
        
        const carMesh = this.sceneManager.getVisualForGameObject(carId);
        if (!carMesh) return;
        
        // Create the light ID
        const lightId = `light_${carId}_${face}_${position.x}_${position.y}`;
        
        // Create a small sphere to represent the light source
        const lightMesh = MeshBuilder.CreateSphere(
            lightId,
            { diameter: 0.4 },
            this.sceneManager.scene
        );
        
        // Position the light relative to the car
        const carPosition = carMesh.position.clone();
        let lightPosition = carPosition.clone();
        
        // Adjust position based on face and grid position
        switch (face) {
            case 'front':
                lightPosition.z += 2.6;
                lightPosition.x += (position.x - 0.5) * 1;
                lightPosition.y += (position.y - 0.5) * 1 + 0.8;
                break;
            case 'back':
                lightPosition.z -= 2.6;
                lightPosition.x += (position.x - 0.5) * 1;
                lightPosition.y += (position.y - 0.5) * 1 + 0.8;
                break;
            case 'top':
                lightPosition.y += 1;
                lightPosition.x += (position.x - 0.5) * 1;
                lightPosition.z += (position.y - 0.5) * 1;
                break;
        }
        
        lightMesh.position = lightPosition;
        
        // Add material to the light mesh
        const material = new StandardMaterial(`${lightId}_material`, this.sceneManager.scene);
        material.diffuseColor = color;
        material.emissiveColor = color;
        material.specularColor = Color3.White();
        lightMesh.material = material;
        
        // Create the actual point light
        const pointLight = new PointLight(
            `${lightId}_pointlight`,
            lightPosition,
            this.sceneManager.scene
        );
        pointLight.diffuse = color;
        pointLight.specular = color;
        pointLight.intensity = 0.8;
        pointLight.range = 20;
        
        // Create a simple game object to represent the light
        const lightObject = new GameObject(lightId);
        this.sceneManager.registerGameObject(lightObject, lightMesh);
        this.entities.set(lightId, lightObject);
        
        // Connect light to car using attachment component (if available)
        if (car.getComponent<AttachmentComponent>('attachment')) {
            car.getComponent<AttachmentComponent>('attachment')?.attachItem({
                id: lightId,
                type: 'light',
                item: lightObject
            });
        }
        
        Logger.log(LogCategory.SYSTEM, `Added light to car ${carId} on ${face} face`);
    }
}
