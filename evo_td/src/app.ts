import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { 
    Engine, 
    Scene, 
    ArcRotateCamera, 
    Vector3, 
    HemisphericLight, 
    DirectionalLight, 
    SpotLight,
    Mesh, 
    MeshBuilder,
    StandardMaterial,
    Color3,
    Color4,
    PointLight
} from "@babylonjs/core";
import { Game } from "./entities/Game";

// --- Attachment System Types ---

type AttachmentFace = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

interface Attachment {
    id: string;
    type: 'weapon' | 'light' | 'other';
    mesh: Mesh;
    size: { w: number; h: number }; // width x height in grid units
    face: AttachmentFace;
    gridPos: { x: number; y: number }; // grid position on the face
    updateTransform(car: TrainCar, carIndex: number): void;
}

interface TrainCar {
    group: Mesh;
    mesh: Mesh;
    attachments: Attachment[];
    canAttach(face: AttachmentFace, gridPos: { x: number; y: number }, size: { w: number; h: number }): boolean;
    attach(attachment: Attachment): boolean;
    detach(attachmentId: string): void;
}

class TrainCarImpl implements TrainCar {
    group: Mesh;
    mesh: Mesh;
    attachments: Attachment[] = [];
    // 2x2x6 grid: 2 wide (x), 2 tall (y), 6 long (z)
    private faceGrids: Record<AttachmentFace, (Attachment | null)[][]>;
    static readonly size = { x: 2, y: 2, z: 6 };

    constructor(name: string, scene: Scene, color: Color3) {
        this.group = new Mesh(`${name}_group`, scene);
        this.mesh = MeshBuilder.CreateBox(name, {
            width: TrainCarImpl.size.x * 0.1, // 0.2 (wide)
            height: TrainCarImpl.size.y * 0.15, // 0.3 (tall)
            depth: TrainCarImpl.size.z * 0.1 // 0.6 (long)
        }, scene);
        this.mesh.parent = this.group;
        this.mesh.position = Vector3.Zero();
        const mat = new StandardMaterial(`${name}_mat`, scene);
        mat.diffuseColor = color;
        this.mesh.material = mat;
        // Initialize face grids
        this.faceGrids = {
            top: this.makeGrid(TrainCarImpl.size.x, TrainCarImpl.size.z),
            bottom: this.makeGrid(TrainCarImpl.size.x, TrainCarImpl.size.z),
            left: this.makeGrid(TrainCarImpl.size.z, TrainCarImpl.size.y),
            right: this.makeGrid(TrainCarImpl.size.z, TrainCarImpl.size.y),
            front: this.makeGrid(TrainCarImpl.size.x, TrainCarImpl.size.y),
            back: this.makeGrid(TrainCarImpl.size.x, TrainCarImpl.size.y),
        };
    }

    private makeGrid(w: number, h: number) {
        return Array.from({ length: w }, () => Array(h).fill(null));
    }

    canAttach(face: AttachmentFace, gridPos: { x: number; y: number }, size: { w: number; h: number }): boolean {
        const grid = this.faceGrids[face];
        for (let dx = 0; dx < size.w; dx++) {
            for (let dy = 0; dy < size.h; dy++) {
                const x = gridPos.x + dx;
                const y = gridPos.y + dy;
                if (x < 0 || y < 0 || x >= grid.length || y >= grid[0].length) return false;
                if (grid[x][y]) return false;
            }
        }
        return true;
    }

    attach(attachment: Attachment): boolean {
        const { face, gridPos, size } = attachment;
        if (!this.canAttach(face, gridPos, size)) return false;
        const grid = this.faceGrids[face];
        for (let dx = 0; dx < size.w; dx++) {
            for (let dy = 0; dy < size.h; dy++) {
                grid[gridPos.x + dx][gridPos.y + dy] = attachment;
            }
        }
        this.attachments.push(attachment);
        attachment.mesh.parent = this.group;
        attachment.updateTransform(this, 0);
        return true;
    }

    detach(attachmentId: string): void {
        const att = this.attachments.find(a => a.id === attachmentId);
        if (!att) return;
        const { face, gridPos, size } = att;
        const grid = this.faceGrids[face];
        for (let dx = 0; dx < size.w; dx++) {
            for (let dy = 0; dy < size.h; dy++) {
                if (grid[gridPos.x + dx][gridPos.y + dy] === att) {
                    grid[gridPos.x + dx][gridPos.y + dy] = null;
                }
            }
        }
        att.mesh.parent = null;
        this.attachments = this.attachments.filter(a => a.id !== attachmentId);
    }
}

interface Station {
    id: string;
    name: string;
    position: Vector3;
    connectedRails: string[]; // Rail IDs that connect to this station
    mesh?: Mesh;
}

interface Rail {
    id: string;
    name: string;
    stationA: string; // Station ID
    stationB: string; // Station ID
    trackPoints: Vector3[];
    isOperational: boolean;
    mesh?: Mesh;
}

interface Enemy {
    id: string;
    mesh: Mesh;
    health: number;
    maxHealth: number;
    speed: number;
    targetPosition: Vector3;
    damage: number;
    state: 'wandering' | 'attacking' | 'paused';
    wanderTarget: Vector3;
    sightRange: number;
    isPaused: boolean;
    spawnTime: number; // When this enemy was spawned (game timer)
    lastGrowthTime: number; // Last time this enemy grew
}

interface Weapon {
    id: string;
    mesh: Mesh;
    carIndex: number; // Which car it's attached to
    damage: number;
    range: number;
    fireRate: number; // shots per second
    lastFired: number;
}

// --- Attachment System ---
interface Attachment {
    id: string;
    type: string;
    size: { x: number, y: number };
    face: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
    mesh: Mesh;
    attachTo(car: TrainCar, gridX: number, gridY: number): void;
    detach(): void;
    update?(): void;
}

class TrainCar {
    mesh: Mesh;
    group: Mesh;
    attachments: Attachment[] = [];
    // For now, 1x1x1 voxel, so top face is 1x1 grid
    topGrid: (Attachment | null)[][];
    constructor(name: string, scene: Scene, color: Color3) {
        this.group = new Mesh(`${name}_group`, scene);
        this.mesh = MeshBuilder.CreateBox(name, {
            width: 0.2,
            height: 0.3,
            depth: 0.6
        }, scene);
        this.mesh.parent = this.group;
        this.mesh.position = Vector3.Zero();
        const mat = new StandardMaterial(`${name}_mat`, scene);
        mat.diffuseColor = color;
        this.mesh.material = mat;
        // 1x1 grid for top face
        this.topGrid = [[null]];
    }
    addAttachment(att: Attachment, gridX: number, gridY: number) {
        if (att.face === 'top') {
            // For now, only 1x1 grid
            if (this.topGrid[gridX][gridY]) return false;
            this.topGrid[gridX][gridY] = att;
        }
        this.attachments.push(att);
        att.attachTo(this, gridX, gridY);
        return true;
    }
    removeAttachment(att: Attachment) {
        this.attachments = this.attachments.filter(a => a !== att);
        att.detach();
    }
}

class App {
    // --- Memory Leak Debug: Object Tracking ---
    private static __objectCounts: { [type: string]: number } = {};
    private static __lastLogTime: number = 0;
    private static __trackObject(type: string) {
        if (!this.__objectCounts[type]) this.__objectCounts[type] = 0;
        this.__objectCounts[type]++;
    }
    private static __untrackObject(type: string) {
        if (!this.__objectCounts[type]) this.__objectCounts[type] = 0;
        this.__objectCounts[type] = Math.max(0, this.__objectCounts[type] - 1);
    }
    private static __logObjectCounts(appInstance?: App) {
        const now = performance.now();
        if (now - this.__lastLogTime > 2000) {
            const summary = Object.entries(this.__objectCounts)
                .map(([type, count]) => `${type}: ${count}`)
                .join(", ");
            // Babylon.js core object counts
            let meshCount = 0, materialCount = 0, stdMaterialCount = 0, pointLightCount = 0, dirLightCount = 0;
            if (appInstance && appInstance.scene) {
                meshCount = appInstance.scene.meshes.length;
                materialCount = appInstance.scene.materials.length;
                stdMaterialCount = appInstance.scene.materials.filter(m => m instanceof StandardMaterial).length;
                pointLightCount = appInstance.scene.lights.filter(l => l instanceof PointLight).length;
                dirLightCount = appInstance.scene.lights.filter(l => l instanceof DirectionalLight).length;
            }
            console.log(`[ObjectCounts] ${summary} | Mesh: ${meshCount}, Material: ${materialCount}, StandardMaterial: ${stdMaterialCount}, PointLight: ${pointLightCount}, DirectionalLight: ${dirLightCount}`);
            this.__lastLogTime = now;
        }
    }

    private engine: Engine;
    private scene: Scene;
    private camera: ArcRotateCamera;
    private sunLight: DirectionalLight;
    private ambientLight: HemisphericLight;
    private trainLights: SpotLight[] = [];
    private trainCars: TrainCar[] = [];
    private isTrainMoving: boolean = false;
    private trainProgress: number = 0; // 0 to 1 along current rail
    private carSpacing: number = 0.8; // Closer spacing (units, 1 unit = 10km)
    private trainSpeed: number = 0.1667; // 0.1667 units/sec = 60km/h (1 unit = 10km, 60/3600 = 0.01667 units/sec, but we want 60km/h at 60% power)
    private trainPower: number = 0.6; // Start at 60% power (60km/h)
    private timeSpeed: number = 1.0; // 1x to 16x time speed multiplier
    private gamePhase: 'in-station' | 'on-rails' = 'in-station';
    private currentLocation: string = 'station_a'; // Current station or rail ID
    private stations: Map<string, Station> = new Map();
    private rails: Map<string, Rail> = new Map();
    private currentRail: string | null = null;
    private destinationStation: string | null = null;
    private gameTimer: number = 0; // Real-time timer in seconds
    private travelDirection: 'forward' | 'reverse' = 'forward'; // Which direction on the rail
    private enemies: Enemy[] = [];
    private weapons: Weapon[] = [];
    private nextEnemyId: number = 0;
    private nextWeaponId: number = 0;
    private enemySpawnTimer: number = 0;
    private nextEnemySpawn: number = 6 + Math.random() * 4;
    private game: Game;
    private previousTimeSpeed: number = 1;

    // Interpolation state
    private lastTickTime: number = 0;
    // Make ticks 5x faster for movement and time progression
    private tickInterval: number = 16; // ms (60Hz for smoother updates)
    private tickSpeedMultiplier: number = 5; // 5x faster ticks
    private prevTrainProgress: number = 0;
    private prevGameTimer: number = 0;
    private prevEnemyPositions: Map<string, Vector3> = new Map();

    // --- Light interpolation state ---
    private prevSunDirection: Vector3 | null = null;
    private currSunDirection: Vector3 | null = null;
    private prevSunIntensity: number = 0;
    private currSunIntensity: number = 0;
    private prevSunColor: Color3 | null = null;
    private currSunColor: Color3 | null = null;

    // Debug counters
    private tickCount: number = 0;
    private renderCount: number = 0;
    private lastDebugTime: number = performance.now();

    // --- Grid Overlay State ---
    private showGridOverlay: boolean = false;
    private gridOverlays: Mesh[][] = [];

    private uiBinder: UIBinder;

    constructor() {
        this.uiBinder = new UIBinder();
        // create the canvas html element and attach it to the webpage
        const canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);

        // initialize babylon scene and engine
        this.engine = new Engine(canvas, true);
        this.scene = new Scene(this.engine);
        
        this.createScene();
        this.setupControls();
        this.startRenderLoop();

        this.game = new Game();
        this.setupGameTicks();
        // Initialize interpolation state
        this.prevTrainProgress = this.trainProgress;
        this.prevGameTimer = this.gameTimer;
        this.lastTickTime = performance.now();
        this.showGridOverlay = true; // Show grid overlay by default

        // --- Memory Leak Debug: Log object counts every 2 seconds ---
        setInterval(() => {
            App.__logObjectCounts();
            // Log grid overlay mesh count
            if (this.gridOverlays && this.gridOverlays.length > 0) {
                let gridMeshCount = 0;
                this.gridOverlays.forEach(arr => gridMeshCount += arr.length);
                console.log(`[GridOverlay] overlays arrays: ${this.gridOverlays.length}, total meshes: ${gridMeshCount}`);
            }
            // Log attachment count (sum of all car attachments)
            if (this.trainCars && this.trainCars.length > 0) {
                let totalAttachments = 0;
                this.trainCars.forEach(car => {
                    if (car.attachments) totalAttachments += car.attachments.length;
                });
                console.log(`[Attachment] total attachments on all cars: ${totalAttachments}`);
            }
        }, 2000);
    }

    private setupGameTicks() {
        // Set tick interval to 16ms for 60Hz
        this.game.start();
        this.game.registerTickHandler((delta: number = 1) => {
            this.tickCount++;
            // Store previous state for interpolation
            this.prevTrainProgress = this.trainProgress;
            this.prevGameTimer = this.gameTimer;
            this.prevEnemyPositions = new Map();
            this.enemies.forEach(e => this.prevEnemyPositions.set(e.id, e.mesh.position.clone()));

            // Restore secondsPerTick for movement and spawn calculations
            const secondsPerTick = 1 / 60; // 60Hz
            // 1 real minute = 10 in-game hours = 600 in-game minutes
            // 60Hz, so 3600 ticks per minute
            // 600 / 3600 = 0.1667 in-game minutes per tick, or 10 in-game seconds per tick
            const inGameSecondsPerTick = 0.042; // 0.042 in-game seconds per tick, fo r no particular reason.
            this.gameTimer += delta * this.timeSpeed * inGameSecondsPerTick * 60; // convert min to seconds

            // 2. Advance train progress if moving
            // Train speed is in units/sec, so scale by delta and timeSpeed
            if (this.isTrainMoving && this.currentRail) {
                const progressDelta = this.trainSpeed * this.trainPower * delta * this.timeSpeed * secondsPerTick / this.getTotalRailLength(this.rails.get(this.currentRail)!);
                if (this.travelDirection === 'forward') {
                    this.trainProgress = Math.min(1, this.trainProgress + progressDelta);
                } else {
                    this.trainProgress = Math.max(0, this.trainProgress - progressDelta);
                }
            }

            // 3. Enemy spawn timer (only spawn when train is moving)
            if (this.isTrainMoving && this.gamePhase === 'on-rails') {
                this.enemySpawnTimer += delta * this.timeSpeed * secondsPerTick;
                // Spawn every 60-90 seconds (randomized, 10x slower)
                if (!this.nextEnemySpawn || this.enemySpawnTimer >= this.nextEnemySpawn) {
                    this.spawnEnemy();
                    this.enemySpawnTimer = 0;
                    this.nextEnemySpawn = 15 + Math.random() * 7.5; // 15-22.5 seconds
                }
            } else {
                this.enemySpawnTimer = 0;
                this.nextEnemySpawn = 15 + Math.random() * 7.5;
            }

            // 4. Queue world update events
            this.game.queueEvent({
                type: "updateTrainPosition",
                execute: () => this.updateTrainPosition()
            });
            this.game.queueEvent({
                type: "updateEnemies",
                execute: () => this.updateEnemies(delta * this.timeSpeed * secondsPerTick)
            });
            this.game.queueEvent({
                type: "updateWeapons",
                execute: () => this.updateWeapons()
            });
            // 5. UI updates (timer, HUD)
            this.updateTimer();
            this.updateHUD();
            // Remove this.updateUI() from tick handler
            // Update only the progress indicator if on-rails
            if (this.gamePhase === 'on-rails') {
                const progressDiv = document.querySelector('#uiContainer div[data-progress]') as HTMLDivElement;
                if (progressDiv) {
                    const displayProgress = this.travelDirection === 'reverse' ? 
                        (1 - this.trainProgress) * 100 : this.trainProgress * 100;
                    progressDiv.textContent = `Progress: ${Math.round(displayProgress)}%`;
                }
            }
            this.updateGridOverlays(); // Ensure grid overlay tracks train every tick
            this.lastTickTime = performance.now();
        });
    }

    private createScene(): void {
        // Set background color
        this.scene.clearColor = new Color4(0.2, 0.4, 0.6, 1); // Light blue background

        // Create camera - isometric-style view, pulled back for larger network
        this.camera = new ArcRotateCamera(
            "camera1", 
            -Math.PI / 2,  // alpha (rotation around Y axis)
            Math.PI / 3,   // beta (elevation angle) 
            45,            // radius (distance from target) - increased for 3-station network
            Vector3.Zero(), // target position
            this.scene
        );
        
        // Attach camera controls
        this.camera.attachControl(this.engine.getRenderingCanvas(), true);
        
        // Add lighting - ambient light for general illumination
        this.ambientLight = new HemisphericLight("ambientLight", new Vector3(0, 1, 0), this.scene);
        this.ambientLight.intensity = 0.3; // Reduced for more dramatic day/night cycle
        
        // Add sun light - directional light that will move based on time
        this.sunLight = new DirectionalLight("sunLight", new Vector3(-1, -1, 0), this.scene);
        this.sunLight.intensity = 1.0;
        this.sunLight.diffuse = new Color3(1, 0.95, 0.8); // Warm sunlight

        // Create the network of stations and rails
        this.createStationNetwork();
        this.createGround();
        this.createTrainCar();
        this.createWeapons();
        this.createTrainLights();
        this.createUI();
        
        // Initialize train position at starting station
        this.updateTrainPosition();
        
        console.log("Railway network created successfully!");
    }

    private createStationNetwork(): void {
        // Create stations
        const stationA: Station = {
            id: 'station_a',
            name: 'Central Station',
            position: new Vector3(-20, 0, 0),
            connectedRails: ['rail_ab', 'rail_ac']
        };
        
        const stationB: Station = {
            id: 'station_b',
            name: 'Eastern Depot',
            position: new Vector3(20, 0, 0),
            connectedRails: ['rail_ab']
        };
        
        const stationC: Station = {
            id: 'station_c',
            name: 'Northern Outpost',
            position: new Vector3(-10, 0, 15),
            connectedRails: ['rail_ac']
        };
        
        // Store stations
        this.stations.set(stationA.id, stationA);
        this.stations.set(stationB.id, stationB);
        this.stations.set(stationC.id, stationC);
        
        // Create rails
        const railAB: Rail = {
            id: 'rail_ab',
            name: 'Central-Eastern Line',
            stationA: 'station_a',
            stationB: 'station_b',
            trackPoints: [
                new Vector3(-20, 0, 0),   // Station A
                new Vector3(-15, 0, 3),   
                new Vector3(-10, 0, 5),   
                new Vector3(-5, 0, 6),    
                new Vector3(0, 0, 5),     
                new Vector3(5, 0, 3),     
                new Vector3(10, 0, 1),    
                new Vector3(15, 0, -2),   
                new Vector3(20, 0, 0)     // Station B
            ],
            isOperational: true
        };
        
        const railAC: Rail = {
            id: 'rail_ac',
            name: 'Central-Northern Line',
            stationA: 'station_a',
            stationB: 'station_c',
            trackPoints: [
                new Vector3(-20, 0, 0),
                new Vector3(-18, 0, 3),
                new Vector3(-16, 0, 6),
                new Vector3(-14, 0, 9),
                new Vector3(-12, 0, 12),
                new Vector3(-10, 0, 15)
            ],
            isOperational: true
        };
        
        this.rails.set(railAB.id, railAB);
        this.rails.set(railAC.id, railAC);
        
        // Create visual meshes for stations
        this.createStationMeshes();
        this.createRailMeshes();
        
        console.log("Created 3 stations and 2 rail lines");
    }
    
    private createStationMeshes(): void {
        const colors = [
            new Color3(0.8, 0.8, 0.2), // Yellow for Station A
            new Color3(0.2, 0.8, 0.2), // Green for Station B  
            new Color3(0.2, 0.2, 0.8)  // Blue for Station C
        ];
        let colorIndex = 0;
        this.stations.forEach(station => {
            const stationMesh = MeshBuilder.CreateBox(station.id, {
                width: 2, height: 0.8, depth: 2
            }, this.scene);
            stationMesh.position = station.position.clone();
            stationMesh.position.y = 0.4;
            const material = new StandardMaterial(`${station.id}_mat`, this.scene);
            material.diffuseColor = colors[colorIndex % colors.length];
            stationMesh.material = material;
            station.mesh = stationMesh;
            // Add a glow (PointLight) at each station
            const glow = new PointLight(`${station.id}_glow`, station.position.clone().add(new Vector3(0, 2, 0)), this.scene);
            glow.diffuse = colors[colorIndex % colors.length];
            glow.intensity = 0.7;
            glow.range = 10;
            colorIndex++;
        });
    }
    
    private createRailMeshes(): void {
        this.rails.forEach(rail => {
            const track = MeshBuilder.CreateLines(`${rail.id}_track`, {
                points: rail.trackPoints
            }, this.scene);
            track.color = rail.isOperational ? 
                new Color3(0.4, 0.2, 0.1) : // Brown for operational
                new Color3(0.6, 0.1, 0.1);  // Red for damaged
            
            rail.mesh = track;
        });
    }

    private createGround(): void {
        // Add ground plane for reference - larger for 3-station network
        const ground = MeshBuilder.CreateGround("ground", {
            width: 60, height: 40
        }, this.scene);
        
        const groundMaterial = new StandardMaterial("groundMat", this.scene);
        groundMaterial.diffuseColor = new Color3(0.3, 0.5, 0.3); // Dark green
        ground.material = groundMaterial;
    }

    private createTrainCar(): void {
        const numCars = 3;
        const carColors = [
            new Color3(0.8, 0.2, 0.2), // Red engine
            new Color3(0.2, 0.2, 0.8), // Blue car
            new Color3(0.6, 0.4, 0.2)  // Brown car
        ];
        this.trainCars = [];
        for (let i = 0; i < numCars; i++) {
            const car = new TrainCarImpl(`trainCar_${i}`, this.scene, carColors[i]);
            this.trainCars.push(car);
        }
        console.log(`Created ${numCars} train cars at ${this.currentLocation}`);
    }

    private createWeapons(): void {
        // Two 1x1 guns on the top of the rear two cars
        for (let carIndex = 1; carIndex < this.trainCars.length; carIndex++) {
            const car = this.trainCars[carIndex];
            const weaponMesh = MeshBuilder.CreateBox(`weapon_${carIndex}`, {
                width: 0.08, height: 0.12, depth: 0.18
            }, this.scene);
            const weaponMat = new StandardMaterial(`weaponMat_${carIndex}`, this.scene);
            weaponMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
            weaponMesh.material = weaponMat;
            const att: Attachment = {
                id: `weapon_attach_${carIndex}`,
                type: 'weapon',
                mesh: weaponMesh,
                size: { w: 1, h: 1 },
                face: 'top',
                gridPos: { x: 0, y: 4 }, // Place near rear (x=0, y=4) on new grid
                updateTransform: (car, carIndex) => {
                    // Place on top face, centered on grid cell
                    const cellW = (car.mesh.getBoundingInfo().boundingBox.maximum.x - car.mesh.getBoundingInfo().boundingBox.minimum.x) / TrainCarImpl.size.x;
                    const cellD = (car.mesh.getBoundingInfo().boundingBox.maximum.z - car.mesh.getBoundingInfo().boundingBox.minimum.z) / TrainCarImpl.size.z;
                    weaponMesh.position = new Vector3(
                        (att.gridPos.x + 0.5 - TrainCarImpl.size.x / 2) * cellW,
                        (car.mesh.getBoundingInfo().boundingBox.maximum.y - car.mesh.getBoundingInfo().boundingBox.minimum.y) / 2 + 0.06,
                        (att.gridPos.y + 0.5 - TrainCarImpl.size.z / 2) * cellD
                    );
                    weaponMesh.rotation = new Vector3(0, 0, 0);
                }
            };
            car.attach(att);
            this.weapons.push({
                id: `weapon_${this.nextWeaponId++}`,
                mesh: weaponMesh,
                carIndex,
                damage: 25,
                range: 8,
                fireRate: 2,
                lastFired: 0
            });
            App.__trackObject('Weapon');
        }
        console.log(`Created ${this.weapons.length} weapons for train cars`);
        App.__logObjectCounts();
    }

    private createTrainLights(): void {
        // One 1x2 light on the top of the first car
        const car = this.trainCars[0];
        const headlightMesh = MeshBuilder.CreateSphere("headlightEmitter", { diameter: 0.14 }, this.scene);
        const mat = new StandardMaterial("headlightMat", this.scene);
        mat.emissiveColor = new Color3(1, 0.95, 0.7);
        mat.diffuseColor = new Color3(1, 0.95, 0.7);
        mat.specularColor = new Color3(0.2, 0.2, 0.2);
        headlightMesh.material = mat;
        headlightMesh.isPickable = false;
        // Optionally, add a PointLight for actual lighting
        const pointLight = new PointLight("headlightLight", headlightMesh.position, this.scene);
        pointLight.diffuse = new Color3(1, 0.95, 0.7);
        pointLight.intensity = 2.2;
        pointLight.range = 16;
        pointLight.parent = headlightMesh;
        const att: Attachment = {
            id: "headlight",
            type: "light",
            mesh: headlightMesh,
            size: { w: 1, h: 2 },
            face: 'top',
            gridPos: { x: 1, y: 0 }, // Place at front (x=1, y=0, covers 2 z)
            updateTransform: (car, carIdx) => {
                const cellW = (car.mesh.getBoundingInfo().boundingBox.maximum.x - car.mesh.getBoundingInfo().boundingBox.minimum.x) / TrainCarImpl.size.x;
                const cellD = (car.mesh.getBoundingInfo().boundingBox.maximum.z - car.mesh.getBoundingInfo().boundingBox.minimum.z) / TrainCarImpl.size.z;
                headlightMesh.position = new Vector3(
                    (att.gridPos.x + 0.5 - TrainCarImpl.size.x / 2) * cellW,
                    (car.mesh.getBoundingInfo().boundingBox.maximum.y - car.mesh.getBoundingInfo().boundingBox.minimum.y) / 2 + 0.07,
                    (att.gridPos.y + 1 - TrainCarImpl.size.z / 2) * cellD // Centered over 2 cells
                );
                headlightMesh.rotation = new Vector3(0, 0, 0);
            }
        };
        car.attach(att);
        // No need to push to this.trainLights, handled by mesh/pointLight
        console.log(`Created train headlight`);
    }

    private createUI(): void {
        // Create simple HTML UI for train controls
        const uiContainer = document.createElement("div");
        uiContainer.id = "uiContainer";
        uiContainer.style.position = "absolute";
        uiContainer.style.top = "10px";
        uiContainer.style.left = "10px";
        uiContainer.style.zIndex = "100";
        uiContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        uiContainer.style.padding = "10px";
        uiContainer.style.borderRadius = "5px";
        uiContainer.style.color = "white";
        uiContainer.style.fontFamily = "Arial, sans-serif";
        
        // Create timer display in top right
        const timerContainer = document.createElement("div");
        timerContainer.id = "timerContainer";
        timerContainer.style.position = "absolute";
        timerContainer.style.top = "10px";
        timerContainer.style.right = "10px";
        timerContainer.style.zIndex = "100";
        timerContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        timerContainer.style.padding = "10px";
        timerContainer.style.borderRadius = "5px";
        timerContainer.style.color = "white";
        timerContainer.style.fontFamily = "Arial, sans-serif";
        timerContainer.style.fontSize = "18px";
        timerContainer.style.font
        timerContainer.textContent = "Jan 1, 2024 12:00 AM";
        
        // Create HUD panel for train controls (bottom of screen)
        const hudContainer = document.createElement("div");
        hudContainer.id = "hudContainer";
        hudContainer.style.position = "absolute";
        hudContainer.style.bottom = "10px";
        hudContainer.style.left = "50%";
        hudContainer.style.transform = "translateX(-50%)";
        hudContainer.style.zIndex = "100";
        hudContainer.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        hudContainer.style.padding = "15px 20px";
        hudContainer.style.borderRadius = "10px";
        hudContainer.style.color = "white";
        hudContainer.style.fontFamily = "Arial, sans-serif";
        hudContainer.style.display = "flex";
        hudContainer.style.gap = "20px";
        hudContainer.style.alignItems = "center";
        
        document.body.appendChild(uiContainer);
        document.body.appendChild(timerContainer);
        document.body.appendChild(hudContainer);
        this.updateUI();
        this.updateHUD();
    }

    private updateGridOverlays(): void {
        // Log mesh/material count before
        console.log(`[GridOverlay] Before: Meshes=${this.scene.meshes.length}, Materials=${this.scene.materials.length}`);
        // Remove old overlays
        this.gridOverlays.forEach(overlays => overlays.forEach(mesh => mesh.dispose()));
        this.gridOverlays = [];
        if (!this.showGridOverlay) {
            // Log mesh/material count after
            console.log(`[GridOverlay] After: Meshes=${this.scene.meshes.length}, Materials=${this.scene.materials.length}`);
            return;
        }
        // For each car, create grid overlays for the top face
        for (let carIdx = 0; carIdx < this.trainCars.length; carIdx++) {
            const car = this.trainCars[carIdx];
            const overlays: Mesh[] = [];
            const cellW = (car.mesh.getBoundingInfo().boundingBox.maximum.x - car.mesh.getBoundingInfo().boundingBox.minimum.x) / 2;
            const cellD = (car.mesh.getBoundingInfo().boundingBox.maximum.z - car.mesh.getBoundingInfo().boundingBox.minimum.z) / 6;
            for (let x = 0; x < 2; x++) {
                for (let z = 0; z < 6; z++) {
                    // Check if this cell is occupied by an attachment
                    let occupied = false;
                    for (const att of car.attachments) {
                        if (att.face === 'top') {
                            const ax = att.gridPos.x, az = att.gridPos.y;
                            for (let dx = 0; dx < att.size.w; dx++) {
                                for (let dz = 0; dz < att.size.h; dz++) {
                                    if (x === ax + dx && z === az + dz) occupied = true;
                                }
                            }
                        }
                    }
                    // Draw a thin box for the cell
                    const gridCell = MeshBuilder.CreateBox(`gridOverlay_${carIdx}_${x}_${z}`, {
                        width: cellW * 0.95,
                        height: 0.01,
                        depth: cellD * 0.95
                    }, this.scene);
                    gridCell.position = new Vector3(
                        (x + 0.5 - 2 / 2) * cellW,
                        (car.mesh.getBoundingInfo().boundingBox.maximum.y - car.mesh.getBoundingInfo().boundingBox.minimum.y) / 2 + 0.02,
                        (z + 0.5 - 6 / 2) * cellD
                    );
                    gridCell.parent = car.group;
                    // The following code would create and assign a new StandardMaterial to each grid overlay cell every tick.
                    // This caused a severe memory leak and eventual crash (likely due to Babylon.js not cleaning up materials assigned to disposed meshes each frame).
                    // Leaving it commented out until a proper fix (e.g., material reuse or pooling) is implemented.
                    // const mat = new StandardMaterial(`gridOverlayMat_${carIdx}_${x}_${z}`, this.scene);
                    // mat.diffuseColor = occupied ? new Color3(0.8, 0.2, 0.2) : new Color3(0.2, 0.8, 0.2);
                    // mat.alpha = 0.5;
                    // gridCell.material = mat;
                    gridCell.isPickable = false;
                    overlays.push(gridCell);
                }
            }
            this.gridOverlays.push(overlays);
        }
        // Log mesh/material count after
        console.log(`[GridOverlay] After: Meshes=${this.scene.meshes.length}, Materials=${this.scene.materials.length}`);
    }

    private updateTimer(): void {
        const timerContainer = document.getElementById("timerContainer");
        if (!timerContainer) return;
        
        // Correct: 1 in-game day = 86400 in-game seconds
        const totalDays = Math.floor(this.gameTimer / 86400);
        const hours24 = Math.floor((this.gameTimer % 86400) / 3600);
        const minutes = Math.floor((this.gameTimer % 3600) / 60);
        
        // Convert to 12-hour format with AM/PM
        const hours12 = hours24 === 0 ? 12 : (hours24 > 12 ? hours24 - 12 : hours24);
        const ampm = hours24 < 12 ? 'AM' : 'PM';
        
        // Start date: January 1st, 2024
        const startDate = new Date(2024, 0, 1); // January 1, 2024
        startDate.setDate(startDate.getDate() + totalDays);
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        const dateStr = `${monthNames[startDate.getMonth()]} ${startDate.getDate()}, ${startDate.getFullYear()}`;
        // Fix padStart for hours/minutes
        const pad2 = (n: number) => (n < 10 ? "0" + n : "" + n);
        const timeStr = `${pad2(hours12)}:${pad2(minutes)} ${ampm}`;
        timerContainer.textContent = `${dateStr} ${timeStr}`;
        
        // Update sun lighting based on time of day
        this.updateSunLighting(hours24, minutes);
    }

    private updateHUD(): void {
        const hudContainer = document.getElementById("hudContainer");
        if (!hudContainer) return;
        hudContainer.innerHTML = ""; // Clear existing content
        // Ensure HUD is always clickable and on top
        hudContainer.style.pointerEvents = "auto";
        hudContainer.style.zIndex = "9999";
        // Train power control (only show when moving)
        if (this.gamePhase === 'on-rails') {
            const powerControlDiv = document.createElement("div");
            powerControlDiv.style.display = "flex";
            powerControlDiv.style.flexDirection = "column";
            powerControlDiv.style.alignItems = "center";
            powerControlDiv.style.gap = "5px";
            
            const powerLabel = document.createElement("div");
            powerLabel.textContent = `Power: ${Math.round(this.trainPower * 100)}%`;
            powerLabel.style.fontSize = "12px";
            powerLabel.style.color = "#ffcc99";
            powerLabel.style.fontWeight = "bold";
            
            const powerSlider = document.createElement("input");
            powerSlider.type = "range";
            powerSlider.min = "0";
            powerSlider.max = "1";
            powerSlider.step = "0.1";
            powerSlider.value = this.trainPower.toString();
            powerSlider.style.width = "120px";
            powerSlider.onchange = (e) => {
                const target = e.target as HTMLInputElement;
                this.trainPower = parseFloat(target.value);
                this.updateHUD();
                console.log(`Train power set to ${Math.round(this.trainPower * 100)}%`);
            };
            
            powerControlDiv.appendChild(powerLabel);
            powerControlDiv.appendChild(powerSlider);
            hudContainer.appendChild(powerControlDiv);

            // --- Grid Overlay Toggle Button ---
            // Place in its own div to avoid flexbox issues
            const gridBtnDiv = document.createElement("div");
            gridBtnDiv.style.display = "flex";
            gridBtnDiv.style.justifyContent = "center";
            gridBtnDiv.style.alignItems = "center";
            gridBtnDiv.style.width = "100%";
            gridBtnDiv.style.pointerEvents = "auto";
            gridBtnDiv.style.zIndex = "10001";

            const gridToggleBtn = document.createElement("button");
            gridToggleBtn.textContent = this.showGridOverlay ? "Hide Grid Overlay" : "Show Grid Overlay";
            gridToggleBtn.style.marginTop = "10px";
            gridToggleBtn.style.fontSize = "13px";
            gridToggleBtn.style.padding = "6px 12px";
            gridToggleBtn.style.background = "#222";
            gridToggleBtn.style.color = "#fff";
            gridToggleBtn.style.border = "1px solid #555";
            gridToggleBtn.style.borderRadius = "4px";
            gridToggleBtn.style.cursor = "pointer";
            gridToggleBtn.style.pointerEvents = "auto";
            gridToggleBtn.style.zIndex = "10002";
            gridToggleBtn.onclick = (e) => {
                e.stopPropagation();
                this.showGridOverlay = !this.showGridOverlay;
                gridToggleBtn.textContent = this.showGridOverlay ? "Hide Grid Overlay" : "Show Grid Overlay";
                this.updateGridOverlays();
            };
            gridBtnDiv.appendChild(gridToggleBtn);
            hudContainer.appendChild(gridBtnDiv);
        }
    }

    private updateSunLighting(hours: number, minutes: number): void {
        const totalMinutes = hours * 60 + minutes;
        const dayProgress = totalMinutes / (24 * 60); // 0 to 1 for full day
        
        // Calculate sun position - sun rises at 5 AM, sets at 7 PM (longer day)
        const sunRiseHour = 5;
        const sunSetHour = 19;
        
        let sunIntensity = 0;
        let sunAngle = 0;
        let sunColor = new Color3(1, 0.95, 0.8); // Default warm daylight
        
        if (hours >= sunRiseHour && hours < sunSetHour) {
            // Daytime - sun is up
            const dayHours = sunSetHour - sunRiseHour; // 14 hours
            const dayProgress = (totalMinutes - sunRiseHour * 60) / (dayHours * 60);
            
            // Sun angle: starts low (sunrise), goes high (noon), ends low (sunset)
            sunAngle = Math.sin(dayProgress * Math.PI) * Math.PI / 3; // 0 to 60 degrees
            
            // Sun intensity: peaks at noon
            sunIntensity = Math.sin(dayProgress * Math.PI) * 1.2;
            
            // Extended golden hour periods for smoother transitions
            if (dayProgress < 0.35 || dayProgress > 0.65) {
                // Extended sunrise/sunset - warmer, redder light
                const goldenIntensity = dayProgress < 0.35 ? 
                    (dayProgress / 0.35) : // Fade in during sunrise
                    ((1 - dayProgress) / 0.35); // Fade out during sunset
                
                sunColor = Color3.Lerp(
                    new Color3(1, 0.8, 0.5), // Lighter golden
                    new Color3(1, 0.5, 0.2), // Deeper golden/red
                    Math.max(0, Math.min(1, goldenIntensity * 2))
                );
                sunIntensity *= (0.4 + goldenIntensity * 0.6); // Gradual intensity change
            } else {
                // Midday - cooler, whiter light with smooth transition
                const middayProgress = Math.abs(dayProgress - 0.5) / 0.15; // How close to noon
                sunColor = Color3.Lerp(
                    new Color3(1, 0.8, 0.5), // Golden
                    new Color3(1, 0.95, 0.9), // White
                    1 - middayProgress
                );
            }
        } else {
            // Nighttime - sun is down
            sunIntensity = 0;
            sunAngle = -Math.PI / 6; // Below horizon
        }
        
        // Update sun direction based on angle
        const sunDirection = new Vector3(
            Math.cos(dayProgress * Math.PI * 2 - Math.PI), // East to West movement
            -Math.sin(sunAngle), // Height based on time of day
            Math.sin(dayProgress * Math.PI * 2 - Math.PI) * 0.3 // Slight north-south variation
        ).normalize();
        
        this.sunLight.direction = sunDirection;
        this.sunLight.intensity = sunIntensity;
        this.sunLight.diffuse = sunColor;
        
        // Store previous and current sun state for interpolation
        this.prevSunDirection = this.currSunDirection || sunDirection.clone();
        this.currSunDirection = sunDirection.clone();
        this.prevSunIntensity = this.currSunIntensity || sunIntensity;
        this.currSunIntensity = sunIntensity;
        this.prevSunColor = this.currSunColor || sunColor.clone();
        this.currSunColor = sunColor.clone();

        // Smooth ambient light transitions
        if (hours < sunRiseHour || hours >= sunSetHour) {
            this.ambientLight.intensity = 0.15; // Dimmer at night
        } else {
            // Smooth transition during sunrise/sunset
            const dayProgress = (totalMinutes - sunRiseHour * 60) / ((sunSetHour - sunRiseHour) * 60);
            if (dayProgress < 0.2 || dayProgress > 0.8) {
                this.ambientLight.intensity = 0.2; // Slightly dimmer during golden hours
            } else {
                this.ambientLight.intensity = 0.3; // Normal during day
            }
        }
        
        // Smoother scene clear color transitions
        if (hours < sunRiseHour || hours >= sunSetHour) {
            // Night - darker blue
            this.scene.clearColor = new Color4(0.05, 0.1, 0.2, 1);
        } else {
            const dayProgress = (totalMinutes - sunRiseHour * 60) / ((sunSetHour - sunRiseHour) * 60);
            if (dayProgress < 0.25 || dayProgress > 0.75) {
                // Extended sunrise/sunset - warmer colors
                const intensity = dayProgress < 0.25 ? 
                    dayProgress / 0.25 : 
                    (1 - dayProgress) / 0.25;
                this.scene.clearColor = Color4.Lerp(
                    new Color4(0.3, 0.15, 0.4, 1),
                    new Color4(0.4, 0.3, 0.5, 1),
                    intensity
                );
            } else {
                // Day - normal light blue with smooth transition
                this.scene.clearColor = new Color4(0.2, 0.4, 0.6, 1);
            }
        }
    }

    private updateUI(): void {
        this.uiBinder.clear(); // Clean up old DOM element bindings
        // Debug: Log UIBinder binding counts to help track memory leaks
        if (!window['__uiBinderDebug']) window['__uiBinderDebug'] = { lastLog: 0 };
        const now = performance.now();
        if (now - window['__uiBinderDebug'].lastLog > 2000) { // Log every 2 seconds
            let totalBindings = 0;
            let keysWithBindings = 0;
            for (const [key, arr] of this.uiBinder['bindings'].entries()) {
                if (arr.length > 0) {
                    keysWithBindings++;
                    totalBindings += arr.length;
                    console.log(`[UIBinder] Key '${key}' has ${arr.length} bindings`);
                }
            }
            console.log(`[UIBinder] Total keys: ${this.uiBinder['bindings'].size}, total bindings: ${totalBindings}, keys with bindings: ${keysWithBindings}`);
            window['__uiBinderDebug'].lastLog = now;
        }
        const uiContainer = document.getElementById("uiContainer");
        if (!uiContainer) return;
        uiContainer.innerHTML = ""; // Clear existing content

        const title = document.createElement("div");
        title.style.marginBottom = "10px";
        title.style.fontWeight = "bold";
        if (this.gamePhase === 'in-station') {
            const currentStation = this.stations.get(this.currentLocation);
            if (!currentStation) return;
            const title = document.createElement("div");
            title.style.marginBottom = "10px";
            title.style.fontWeight = "bold";
            title.textContent = `At ${currentStation.name}`;
            uiContainer.appendChild(title);
            
            const statusDiv = document.createElement("div");
            statusDiv.textContent = `Cars: ${this.trainCars.length}`;
            statusDiv.style.marginBottom = "10px";
            statusDiv.style.fontSize = "12px";
            uiContainer.appendChild(statusDiv);
            
            // --- Enemy Count (binder) ---
            const enemyCountDiv = document.createElement("div");
            this.uiBinder.bind(
                'enemyCount',
                enemyCountDiv,
                (el, value) => {
                    el.textContent = `Enemies: ${value}`;
                    el.style.marginBottom = "6px";
                    el.style.fontSize = "12px";
                }
            );
            this.uiBinder.set('enemyCount', this.enemies.length);
            uiContainer.appendChild(enemyCountDiv);
            // --- Weapon Count (binder) ---
            const weaponCountDiv = document.createElement("div");
            this.uiBinder.bind(
                'weaponCount',
                weaponCountDiv,
                (el, value) => {
                    el.textContent = `Weapons: ${value}`;
                    el.style.marginBottom = "10px";
                    el.style.fontSize = "12px";
                }
            );
            this.uiBinder.set('weaponCount', this.weapons.length);
            uiContainer.appendChild(weaponCountDiv);
            // Only show available destinations in station phase
            const destinationsTitle = document.createElement("div");
            destinationsTitle.textContent = "Available Destinations:";
            destinationsTitle.style.marginBottom = "5px";
            destinationsTitle.style.fontSize = "12px";
            uiContainer.appendChild(destinationsTitle);
            currentStation.connectedRails.forEach(railId => {
                const rail = this.rails.get(railId);
                if (!rail || !rail.isOperational) return;
                // Find the destination station
                const destinationId = rail.stationA === currentStation.id ? rail.stationB : rail.stationA;
                const destinationStation = this.stations.get(destinationId);
                if (!destinationStation) return;
                const travelButton = document.createElement("button");
                travelButton.textContent = `→ ${destinationStation.name}`;
                travelButton.style.display = "block";
                travelButton.style.margin = "2px 0";
                travelButton.style.padding = "5px 10px";
                travelButton.style.width = "100%";
                travelButton.onclick = () => this.startJourney(railId, destinationStation.id);
                uiContainer.appendChild(travelButton);
            });
        } else if (this.gamePhase === 'on-rails') {
            // Show a different UI for on-rails phase (no station buttons)
            const currentRail = this.rails.get(this.currentRail!);
            const destinationStation = this.stations.get(this.destinationStation!);
            const travellingDiv = document.createElement("div");
            travellingDiv.style.marginBottom = "10px";
            travellingDiv.style.fontWeight = "bold";
            travellingDiv.textContent = `Travelling to: ${destinationStation?.name || 'Unknown'}`;
            uiContainer.appendChild(travellingDiv);
            // --- Enemy Count (binder) ---
            const enemyCountDiv = document.createElement("div");
            this.uiBinder.bind(
                'enemyCount',
                enemyCountDiv,
                (el, value) => {
                    el.textContent = `Enemies: ${value}`;
                    el.style.marginBottom = "6px";
                    el.style.fontSize = "12px";
                }
            );
            this.uiBinder.set('enemyCount', this.enemies.length);
            uiContainer.appendChild(enemyCountDiv);
            // --- Weapon Count (binder) ---
            const weaponCountDiv = document.createElement("div");
            this.uiBinder.bind(
                'weaponCount',
                weaponCountDiv,
                (el, value) => {
                    el.textContent = `Weapons: ${value}`;
                    el.style.marginBottom = "10px";
                    el.style.fontSize = "12px";
                }
            );
            this.uiBinder.set('weaponCount', this.weapons.length);
            uiContainer.appendChild(weaponCountDiv);
        }
        // --- Time speed control (always at the end of UI, for both phases) ---
        const timeControlDiv = document.createElement("div");
        timeControlDiv.style.display = "flex";
        timeControlDiv.style.flexDirection = "column";
        timeControlDiv.style.alignItems = "center";
        timeControlDiv.style.marginTop = "10px";
        const timeLabel = document.createElement("div");
        timeLabel.textContent = `Time Speed: ${this.timeSpeed}x`;
        timeLabel.style.fontSize = "12px";
        timeLabel.style.marginBottom = "8px";
        timeLabel.style.color = "#ccffcc";
        timeLabel.style.fontWeight = "bold";
        const timeButtonsDiv = document.createElement("div");
        timeButtonsDiv.style.display = "flex";
        timeButtonsDiv.style.gap = "4px";
        timeButtonsDiv.style.flexWrap = "wrap";
        const timeOptions = [1, 4, 8, 16, 32];
        timeOptions.forEach(speed => {
            const timeButton = document.createElement("button");
            this.uiBinder.bind(
                'timeSpeed',
                timeButton,
                (el, value) => {
                    el.textContent = `${speed}x`;
                    el.style.padding = "4px 8px";
                    el.style.fontSize = "11px";
                    el.style.border = "1px solid #666";
                    el.style.borderRadius = "3px";
                    el.style.cursor = "pointer";
                    if (speed === value) {
                        el.style.backgroundColor = "#4a9eff";
                        el.style.color = "white";
                    } else {
                        el.style.backgroundColor = "#333";
                        el.style.color = "#ccc";
                    }
                }
            );
            timeButton.onclick = () => {
                this.timeSpeed = speed;
                this.uiBinder.set('timeSpeed', speed);
            };
            timeButtonsDiv.appendChild(timeButton);
        });
        this.uiBinder.set('timeSpeed', this.timeSpeed);
        timeControlDiv.appendChild(timeLabel);
        timeControlDiv.appendChild(timeButtonsDiv);
        uiContainer.appendChild(timeControlDiv);
    }

    // Called when a station travel button is clicked
    private startJourney(railId: string, destinationStationId: string): void {
        // Restore previous time speed if it was set (after leaving station)
        if (this.previousTimeSpeed && this.timeSpeed === 1) {
            this.timeSpeed = this.previousTimeSpeed;
            this.previousTimeSpeed = undefined;
        }
        // Set phase to on-rails BEFORE updating UI
        this.gamePhase = 'on-rails';
        this.currentRail = railId;
        this.destinationStation = destinationStationId;
        this.updateUI(); // Immediately update UI to remove station buttons
        // Determine direction: if currentLocation is stationA, go forward; if stationB, go reverse
        const rail = this.rails.get(railId);
        if (!rail) return;
        if (rail.stationA === this.currentLocation && rail.stationB === destinationStationId) {
            this.travelDirection = 'forward';
            this.trainProgress = 0;
        } else if (rail.stationB === this.currentLocation && rail.stationA === destinationStationId) {
            this.travelDirection = 'reverse';
            this.trainProgress = 1;
        } else {
            // Invalid journey
            console.warn('Invalid journey: stations do not match rail');
            return;
        }
        this.isTrainMoving = true;
        this.setCameraOnRails();
        this.updateUI(); // Ensure UI updates immediately to hide station buttons
        this.updateHUD();
        console.log(`Started journey on ${rail.name} to ${this.stations.get(destinationStationId)?.name}`);
    }

    private updateTrainPosition(): void {
        if (!this.currentRail) return;
        const rail = this.rails.get(this.currentRail);
        if (!rail) return;
        // Total length of the rail for normalization
        const railLength = this.getTotalRailLength(rail);
        // Update each car's position based on its index and the train progress
        for (let carIndex = 0; carIndex < this.trainCars.length; carIndex++) {
            const car = this.trainCars[carIndex];
            const carGroup = car.group;
            // Get car length (Z axis)
            const carMesh = car.mesh;
            const carLength = carMesh.getBoundingInfo().boundingBox.extendSize.z * 2;
            // Compute center progress offset for this car
            let centerOffset = 0;
            for (let i = 0; i < carIndex; i++) {
                const prevCarMesh = this.trainCars[i].mesh;
                const prevCarLength = prevCarMesh.getBoundingInfo().boundingBox.extendSize.z * 2;
                centerOffset += (prevCarLength + this.carSpacing) / railLength;
            }
            // Progress for car center
            let centerProgress: number;
            if (this.travelDirection === 'forward') {
                centerProgress = Math.max(0, this.trainProgress - centerOffset);
            } else {
                centerProgress = Math.min(1, this.trainProgress + centerOffset);
            }
            // Two-point constraint: sample front and back points
            const halfCar = (carLength * 0.5) / railLength;
            const clamp = (v: number) => Math.max(0, Math.min(1, v));
            const frontPos = this.getPositionOnRail(rail, clamp(centerProgress + halfCar));
            const backPos = this.getPositionOnRail(rail, clamp(centerProgress - halfCar));
            if (frontPos && backPos) {
                carGroup.position = Vector3.Lerp(backPos, frontPos, 0.5);
                carGroup.position.y = 0.3;
                const dir = frontPos.subtract(backPos);
                if (dir.length() > 0.001) {
                    carGroup.rotation.y = Math.atan2(dir.x, dir.z);
                }
            }
        }
        this.updateTrainLights();
        
        // Check if journey is complete
        const isComplete = this.travelDirection === 'forward' ? 
            this.trainProgress >= 1 : this.trainProgress <= 0;
            
        if (isComplete) {
            this.isTrainMoving = false;
            this.gamePhase = 'in-station';
            // Move to destination station
            this.currentLocation = this.destinationStation!;
            this.currentRail = null;
            this.destinationStation = null;
            this.trainProgress = 0;
            this.updateTrainPosition(); // Position at new station
            this.updateUI(); // Ensure UI updates to show new station options
            this.updateHUD();
            // Store previous time speed before setting to 1x when entering station
            if (this.timeSpeed !== 1) {
                this.previousTimeSpeed = this.timeSpeed;
            }
            this.timeSpeed = 1;
            const arrivedStation = this.stations.get(this.currentLocation);
            console.log(`Arrived at ${arrivedStation?.name || 'Unknown Station'}`);
        }
    }

    private getPositionOnRail(rail: Rail, progress: number): Vector3 | null {
        if (progress <= 0) return rail.trackPoints[0].clone();
        if (progress >= 1) return rail.trackPoints[rail.trackPoints.length - 1].clone();
        
        const totalSegments = rail.trackPoints.length - 1;
        const scaledProgress = progress * totalSegments;
        const currentSegment = Math.floor(scaledProgress);
        const segmentProgress = scaledProgress - currentSegment;
        
        if (currentSegment >= totalSegments) {
            return rail.trackPoints[rail.trackPoints.length - 1].clone();
        }
        
        const startPoint = rail.trackPoints[currentSegment];
        const endPoint = rail.trackPoints[currentSegment + 1];
        
        return Vector3.Lerp(startPoint, endPoint, segmentProgress);
    }

    private getDirectionOnRail(rail: Rail, progress: number): Vector3 | null {
        if (progress <= 0 || progress >= 1) return null;
        
        const totalSegments = rail.trackPoints.length - 1;
        const scaledProgress = progress * totalSegments;
        const currentSegment = Math.floor(scaledProgress);
        
        if (currentSegment >= totalSegments) return null;
        
        const startPoint = rail.trackPoints[currentSegment];
        const endPoint = rail.trackPoints[currentSegment + 1];
        
        return endPoint.subtract(startPoint).normalize();
    }

    private getTotalRailLength(rail: Rail): number {
        let totalLength = 0;
        for (let i = 0; i < rail.trackPoints.length - 1; i++) {
            const segmentLength = rail.trackPoints[i + 1].subtract(rail.trackPoints[i]).length();
            totalLength += segmentLength;
        }
        return totalLength || 1; // Avoid division by zero
    }

    // --- Camera zoom/follow logic ---
    private cameraTargetRadius: number = 45; // For smooth zoom
    private cameraTargetPos: Vector3 = new Vector3(0, 0, 0);
    private cameraLerpSpeed: number = 0.08; // Smoothing factor

    private setCameraOnRails(): void {
        // Set target values for smooth interpolation
        this.cameraTargetRadius = 6; // Halved (was 18)
        this.camera.lowerRadiusLimit = 4; // Lock min zoom
        this.camera.upperRadiusLimit = 18; // Lock max zoom while travelling
        // Set camera radius to target and clamp
        this.camera.radius = this.cameraTargetRadius;
        if (this.camera.radius < this.camera.lowerRadiusLimit) {
            this.camera.radius = this.camera.lowerRadiusLimit;
        } else if (this.camera.radius > this.camera.upperRadiusLimit) {
            this.camera.radius = this.camera.upperRadiusLimit;
        }
        if (this.trainCars[0]) {
            this.cameraTargetPos = this.trainCars[0].group.position.clone();
        }
    }
    private setCameraInStation(): void {
        this.cameraTargetRadius = 45;
        this.camera.lowerRadiusLimit = 18; // Allow zoom out in station
        this.camera.upperRadiusLimit = 90; // Allow zoom out in station
        this.cameraTargetPos = new Vector3(0, 0, 0);
    }

    // --- Light follows train robustly ---
    private updateTrainLights(): void {
        if (this.trainLights.length === 0 || this.trainCars.length === 0) return;
        // Calculate current time for day/night light control
        const hoursInDay = (this.gameTimer * 24 / 120) % 24;
        const hours24 = Math.floor(hoursInDay);
        // Turn lights off during day (6 AM to 6 PM), on during night
        const lightsOn = hours24 < 6 || hours24 >= 18;
        const frontCar = this.trainCars[0];
        const backCar = this.trainCars[this.trainCars.length - 1];
        // Update front light
        if (this.trainLights[0] && frontCar) {
            const frontLight = this.trainLights[0];
            frontLight.position = frontCar.group.position.clone();
            frontLight.position.y += 0.4; // Mount above car
            frontLight.intensity = lightsOn ? 2.5 : 0;
            // Always point forward along the train, even in-station
            let direction: Vector3;
            if (this.currentRail) {
                direction = this.getDirectionOnRail(this.rails.get(this.currentRail)!, this.trainProgress) || new Vector3(1, 0, 0);
                if (this.travelDirection === 'reverse') direction = direction.scale(-1);
            } else {
                direction = new Vector3(1, 0, 0); // Default forward
            }
            frontLight.direction = direction.normalize();
        }
        // Update back light
        if (this.trainLights[1] && backCar && this.trainCars.length > 1) {
            const backLight = this.trainLights[1];
            backLight.position = backCar.group.position.clone();
            backLight.position.y += 0.4;
            backLight.intensity = lightsOn ? 1.2 : 0;
            let direction: Vector3;
            if (this.currentRail) {
                direction = this.getDirectionOnRail(this.rails.get(this.currentRail)!, this.trainProgress) || new Vector3(-1, 0, 0);
                if (this.travelDirection === 'reverse') direction = direction.scale(-1);
            } else {
                direction = new Vector3(-1, 0, 0);
            }
            backLight.direction = direction.normalize();
        }
    }

    private updateEnemies(deltaTime: number): void {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            // Enemy growth mechanic - random growth over time
            // Average 25 HP per 24 hours (120 seconds real time) = ~0.21 HP/second
            // Update enemy size based on health (grow larger as they get stronger)
            const healthPercentage = enemy.health / 75; // Compared to starting health
            const scale = 0.4 + (healthPercentage * 0.8); // Scale from 0.4 to 1.2
            enemy.mesh.scaling.setAll(scale);
            // Check if train is in sight range
            let nearestCarDistance = Infinity;
            let nearestCar: Mesh | null = null;
            this.trainCars.forEach(car => {
                const distance = car.group.position.subtract(enemy.mesh.position).length();
                if (distance < nearestCarDistance) {
                    nearestCarDistance = distance;
                    nearestCar = car.group;
                }
            });
            // State transitions
            if (nearestCarDistance <= enemy.sightRange && nearestCar) {
                enemy.state = 'attacking';
                enemy.targetPosition = nearestCar.position.clone();
            } else if (enemy.state === 'attacking') {
                enemy.state = 'wandering';
                enemy.wanderTarget = this.getRandomNearbyPosition(enemy.mesh.position, 8);
            }
            // Behavior based on state
            // Wandering: 6km/h = 0.0167 units/sec
            // Attacking: 30km/h = 0.0833 units/sec
            if (enemy.state === 'wandering') {
                const direction = enemy.wanderTarget.subtract(enemy.mesh.position).normalize();
                enemy.mesh.position.addInPlace(direction.scale(0.0167 * deltaTime));
                // Get new wander target if close to current one
                const wanderDistance = enemy.wanderTarget.subtract(enemy.mesh.position).length();
                if (wanderDistance < 2) {
                    enemy.wanderTarget = this.getRandomNearbyPosition(enemy.mesh.position, 8);
                }
            } else if (enemy.state === 'attacking' && nearestCar) {
                const direction = nearestCar.position.subtract(enemy.mesh.position).normalize();
                enemy.mesh.position.addInPlace(direction.scale(0.0833 * deltaTime));
                // Check if enemy reached the train
                if (nearestCarDistance < 1.0) {
                    console.log(`Enemy reached train! Dealing ${enemy.damage} damage`);
                    this.destroyEnemy(i);
                    continue;
                }
            }
            // Remove enemy if health <= 0
            if (enemy.health <= 0) {
                this.destroyEnemy(i);
            }
        }
    }

    // Spawns a new enemy at a random position along the current rail
    private spawnEnemy(): void {
        if (!this.currentRail) return;
        const rail = this.rails.get(this.currentRail);
        if (!rail) return;
        const randomProgress = Math.random();
        const trackPosition = this.getPositionOnRail(rail, randomProgress);
        if (!trackPosition) return;
        const offset = new Vector3(
            (Math.random() - 0.5) * 20,
            0,
            (Math.random() - 0.5) * 20
        );
        const spawnPosition = trackPosition.add(offset);
        const enemy: Enemy = {
            id: `enemy_${this.nextEnemyId++}`,
            mesh: MeshBuilder.CreateSphere(`enemy_${this.nextEnemyId}`, {
                diameter: 0.6
            }, this.scene),
            health: 75,
            maxHealth: 75,
            speed: 1.0,
            targetPosition: trackPosition.clone(),
            damage: 10,
            state: 'wandering',
            wanderTarget: this.getRandomNearbyPosition(spawnPosition, 5),
            sightRange: 12,
            isPaused: false,
            spawnTime: this.gameTimer,
            lastGrowthTime: this.gameTimer
        };
        enemy.mesh.position = spawnPosition;
        enemy.mesh.position.y = 0.3;
        const enemyMaterial = new StandardMaterial(`enemyMat_${this.nextEnemyId}`, this.scene);
        enemyMaterial.diffuseColor = new Color3(0.8, 0.1, 0.1);
        enemy.mesh.material = enemyMaterial;
        App.__trackObject('Enemy');
        this.enemies.push(enemy);
        this.uiBinder.set('enemyCount', this.enemies.length); // Ensure UI updates on spawn
        App.__logObjectCounts();
        console.log(`Spawned enemy at ${enemy.mesh.position}`);
    }

    private fireWeapon(weapon: Weapon, target: Enemy): void {
        // Apply damage
        target.health -= weapon.damage;
        
        // Visual feedback - briefly change weapon color
        const originalMaterial = weapon.mesh.material as StandardMaterial;
        const flashMaterial = new StandardMaterial("flash", this.scene);
        flashMaterial.diffuseColor = new Color3(1, 1, 0); // Yellow flash
        weapon.mesh.material = flashMaterial;
        
        setTimeout(() => {
            weapon.mesh.material = originalMaterial;
            flashMaterial.dispose();
        }, 100);
    }

    private destroyEnemy(index: number): void {
        const enemy = this.enemies[index];
        // Dispose material if present to avoid memory leaks
        if (enemy.mesh.material) {
            enemy.mesh.material.dispose();
        }
        enemy.mesh.dispose();
        App.__untrackObject('Enemy');
        this.enemies.splice(index, 1);
    }

    // Returns a random nearby position within a given radius
    private getRandomNearbyPosition(center: Vector3, radius: number): Vector3 {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        return new Vector3(
            center.x + Math.cos(angle) * distance,
            center.y,
            center.z + Math.sin(angle) * distance
        );
    }

    // Finds the nearest enemy to a given position within a certain range
    private findNearestEnemy(position: Vector3, range: number): Enemy | null {
        let nearest: Enemy | null = null;
        let nearestDistance = range;
        this.enemies.forEach(enemy => {
            const distance = position.subtract(enemy.mesh.position).length();
            if (distance < nearestDistance) {
                nearest = enemy;
                nearestDistance = distance;
            }
        });
        return nearest;
    }

    // Updates weapon positions and handles auto-firing
    private updateWeapons(): void {
        const currentTime = performance.now();
        this.weapons.forEach(weapon => {
            const car = this.trainCars[weapon.carIndex];
            const carPos = car ? car.group.position : weapon.mesh.position;
            // Auto-fire at nearest enemy in range when train is moving
            let target: Enemy | null = null;
            if (this.isTrainMoving && this.trainPower > 0) {
                if (currentTime - weapon.lastFired > (1000 / weapon.fireRate)) {
                    target = this.findNearestEnemy(carPos, weapon.range);
                    if (target) {
                        this.fireWeapon(weapon, target);
                        weapon.lastFired = currentTime;
                    }
                }
            } else {
                // Not firing, but still want to update orientation if possible
                target = this.findNearestEnemy(carPos, weapon.range);
            }
            // Rotate weapon to face target if one exists
            if (target) {
                const weaponWorldPos = car ? car.group.getAbsolutePosition().add(new Vector3(0, 0.15, 0)) : weapon.mesh.position;
                const toTarget = target.mesh.position.subtract(weaponWorldPos);
                const angleY = Math.atan2(toTarget.x, toTarget.z);
                weapon.mesh.rotation = new Vector3(0, angleY - (car ? car.group.rotation.y : 0), 0);
            } else {
                // Reset to default orientation
                // weapon.mesh.rotation = Vector3.Zero();
            }
        });
    }

    private setupControls(): void {
        // Hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Shift+Ctrl+Alt+I
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
                if (this.scene.debugLayer.isVisible()) {

                    this.scene.debugLayer.hide();
                } else {
                    this.scene.debugLayer.show();
                }
            }
        });

        // Handle window resize
        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    private startRenderLoop(): void {
        this.engine.runRenderLoop(() => {
            this.renderCount++;
            // Calculate tickAlpha for interpolation
            const now = performance.now();
            const sinceTick = now - this.lastTickTime;
            const tickAlpha = Math.max(0, Math.min(1, sinceTick / this.tickInterval));
            this.interpolateVisuals(tickAlpha);
            this.scene.render();
            // Debug output every second
            if (now - this.lastDebugTime > 1000) {
                console.log(`[DEBUG] Ticks: ${this.tickCount} | Renders: ${this.renderCount} | TickInterval: ${this.tickInterval}ms`);
                this.tickCount = 0;
                this.renderCount = 0;
                this.lastDebugTime = now;
            }
        });
    }

    private interpolateVisuals(tickAlpha: number): void {
        // Interpolate train position
        if (this.gamePhase === 'on-rails' && this.currentRail) {
            const rail = this.rails.get(this.currentRail);
            if (rail) {
                const railLength = this.getTotalRailLength(rail);
                for (let carIndex = 0; carIndex < this.trainCars.length; carIndex++) {
                    const car = this.trainCars[carIndex];
                    const carGroup = car.group;
                    const carMesh = car.mesh;
                    const carLength = carMesh.getBoundingInfo().boundingBox.extendSize.z * 2;
                    // Compute center progress offset for this car
                    let centerOffset = 0;
                    for (let i = 0; i < carIndex; i++) {
                        const prevCarMesh = this.trainCars[i].mesh;
                        const prevCarLength = prevCarMesh.getBoundingInfo().boundingBox.extendSize.z * 2;
                        centerOffset += (prevCarLength + this.carSpacing) / railLength;
                    }
                    // Progress for car center
                    let centerProgress: number;
                    if (this.travelDirection === 'forward') {
                        centerProgress = Math.max(0, this.trainProgress - centerOffset);
                    } else {
                        centerProgress = Math.min(1, this.trainProgress + centerOffset);
                    }
                    // Two-point constraint: sample front and back points
                    const halfCar = (carLength * 0.5) / railLength;
                    const clamp = (v: number) => Math.max(0, Math.min(1, v));
                    const frontPos = this.getPositionOnRail(rail, clamp(centerProgress + halfCar));
                    const backPos = this.getPositionOnRail(rail, clamp(centerProgress - halfCar));
                    if (frontPos && backPos) {
                        // Set car position to midpoint
                        carGroup.position = Vector3.Lerp(backPos, frontPos, 0.5);
                        carGroup.position.y = 0.3;
                        // Set rotation so Z+ points from back to front
                        const dir = frontPos.subtract(backPos);
                        if (dir.length() > 0.001) {
                            carGroup.rotation.y = Math.atan2(dir.x, dir.z); // FIX: Z+ points along direction of travel
                        }
                    }
                }
                this.updateTrainLights();
            }
        }
        // Interpolate enemies
        this.enemies.forEach(enemy => {
            const prevPos = this.prevEnemyPositions.get(enemy.id) || enemy.mesh.position;
            const currPos = enemy.mesh.position;
            enemy.mesh.position = Vector3.Lerp(prevPos, currPos, tickAlpha);
        });
        // Interpolate sun/lighting
        const interpGameTimer = this.prevGameTimer + (this.gameTimer - this.prevGameTimer) * tickAlpha;
        this.interpolateSunLighting(interpGameTimer);

        // Camera follow and smooth zoom
        if (this.camera) {
            // Smoothly interpolate radius
            this.camera.radius += (this.cameraTargetRadius - this.camera.radius) * this.cameraLerpSpeed;
            // Smoothly interpolate target position
            this.camera.target = Vector3.Lerp(this.camera.target, this.cameraTargetPos, this.cameraLerpSpeed);
            // If on-rails, update cameraTargetPos to follow train
            if (this.gamePhase === 'on-rails' && this.trainCars[0]) {
                this.cameraTargetPos = this.trainCars[0].group.position.clone();
            }
        }
    }

    private interpolateSunLighting(interpGameTimer: number): void {
        // Use the same logic as updateTimer for in-game time
        const totalDays = Math.floor(interpGameTimer / 86400);
        const hours24 = Math.floor((interpGameTimer % 86400) / 3600);
        const minutes = Math.floor((interpGameTimer % 3600) / 60);
        // Call updateSunLighting to update prev/curr state
        this.updateSunLighting(hours24, minutes);
        // Interpolate sun direction, intensity, and color
        if (this.prevSunDirection && this.currSunDirection && this.prevSunColor && this.currSunColor) {
            const now = performance.now();
            const sinceTick = now - this.lastTickTime;
            const tickAlpha = Math.max(0, Math.min(1, sinceTick / this.tickInterval));
            this.sunLight.direction = Vector3.Lerp(this.prevSunDirection, this.currSunDirection, tickAlpha);
            this.sunLight.intensity = this.prevSunIntensity + (this.currSunIntensity - this.prevSunIntensity) * tickAlpha;
            this.sunLight.diffuse = Color3.Lerp(this.prevSunColor, this.currSunColor, tickAlpha);
        }
    }
}

// --- Simple UI Data Binder ---
class UIBinder {
    private bindings: Map<string, { el: HTMLElement, update: (el: HTMLElement, value: any) => void }[]> = new Map();

    bind(key: string, el: HTMLElement, update: (el: HTMLElement, value: any) => void) {
        if (!this.bindings.has(key)) {
            this.bindings.set(key, []);
        }
        this.bindings.get(key)!.push({ el, update });
    }

    set(key: string, value: any) {
        if (!this.bindings.has(key)) return;
        for (const { el, update } of this.bindings.get(key)!) {
            update(el, value);
        }
    }

    // Get a data value
    get(key: string) {
        return this.bindings.get(key);
    }

    // Clean up bindings for elements no longer in the DOM
    clear() {
        for (const [key, arr] of this.bindings.entries()) {
            this.bindings.set(key, arr.filter(({ el }) => document.body.contains(el)));
        }
    }
}

// --- Material Leak Debug ---
let __materialCreateCount = 0;
let __materialDisposeCount = 0;
const __materialNamesCreated: string[] = [];
const __materialNamesDisposed: string[] = [];

// Patch StandardMaterial constructor to log creation
const _OriginalStandardMaterial = StandardMaterial;
// @ts-ignore
class DebugStandardMaterial extends _OriginalStandardMaterial {
    constructor(name: string, scene: Scene) {
        super(name, scene);
        __materialCreateCount++;
        __materialNamesCreated.push(name);
        console.log(`[MaterialDebug] Created StandardMaterial: ${name} (total created: ${__materialCreateCount})`);
    }
    dispose(forceDisposeEffect?: boolean, forceDisposeTextures?: boolean) {
        __materialDisposeCount++;
        __materialNamesDisposed.push(this.name);
        console.log(`[MaterialDebug] Disposed StandardMaterial: ${this.name} (total disposed: ${__materialDisposeCount})`);
        super.dispose(forceDisposeEffect, forceDisposeTextures);
    }
}
// @ts-ignore
(window as any).BABYLON = (window as any).BABYLON || {};
// @ts-ignore
(window as any).BABYLON.StandardMaterial = DebugStandardMaterial;

new App();