/**
 * Train entity using the ECS architecture.
 * Core game object that can move between stations, carry cargo, and mount attachments.
 */
import { GameObject } from '../core/GameObject';
import { Logger, LogCategory } from '../utils/Logger';
import { MovementComponent } from '../components/MovementComponent';
import { PositionComponent } from '../components/PositionComponent';
import { InventoryComponent } from '../components/InventoryComponent';
import { AttachmentComponent } from '../components/AttachmentComponent';
import { TrainCarPositionComponent } from '../components/TrainCarPositionComponent';
import type { TrainConfig } from '../types/TrainConfig';

type TrainEventHandler = (event: {
    type: string;
    trainId: string;
    timestamp: number;
    [key: string]: any;
}) => void;

export class Train extends GameObject {
    private eventHandlers = new Map<string, TrainEventHandler[]>();

    public on(eventType: string, handler: TrainEventHandler): void {
        const handlers = this.eventHandlers.get(eventType) || [];
        handlers.push(handler);
        this.eventHandlers.set(eventType, handlers);
    }

    protected override emitEvent(event: { type: string; trainId: string; timestamp: number; [key: string]: any }): void {
        super.emitEvent(event);
        const handlers = this.eventHandlers.get(event.type) || [];
        handlers.forEach(handler => handler(event));
    }
    /** Current progress along rail (0-1) */
    private _progress: number = 0;
    /** Whether the train is currently moving */
    private _isMoving: boolean = false;
    /** Current rail's distance in game units */
    private _currentRailDistance: number = 0;

    constructor(
        public readonly playerId: string,
        private config: TrainConfig
    ) {
        super('train');
        
        // Add required components
        this.addComponent(new PositionComponent());
        this.addComponent(new MovementComponent(this, config.baseSpeed));
        this.addComponent(new InventoryComponent(this, config.cargoCapacity));
        this.addComponent(new AttachmentComponent());
        this.addComponent(new TrainCarPositionComponent());

        // Initialize metrics
        this.metrics.set('distance_traveled', 0);
        this.metrics.set('cargo_delivered', 0);
        this.metrics.set('attachments_added', 0);

        Logger.log(LogCategory.TRAIN, `Train created for player ${playerId}`, { 
            trainId: this.id,
            config
        });
    }

    /**
     * Start a journey along a rail to a destination
     * @param railId The ID of the rail to travel on
     * @param destinationId The destination station ID
     * @param distance The length of the rail in game units
     */
    startJourney(railId: string, destinationId: string, distance: number): boolean {
        if (this._isMoving) {
            Logger.warn(LogCategory.TRAIN, `Train ${this.id} cannot start journey while moving`);
            return false;
        }

        // Get required components
        const movement = this.getComponent<MovementComponent>('movement');
        if (!movement) {
            Logger.error(LogCategory.TRAIN, `Train ${this.id} missing movement component`, new Error('Required component missing'));
            return false;
        }

        this._isMoving = true;
        this._progress = 0;
        this._currentRailDistance = distance;
        
        this.emitEvent({
            type: 'journey_started',
            trainId: this.id,
            railId,
            destinationId,
            distance,
            timestamp: performance.now()
        });

        return true;
    }

    /**
     * Update train position and check for journey completion
     * Speed is in game units per second
     */
    update(deltaTime: number): void {
        if (!this._isMoving) return;

        // Get current speed before updating
        const movement = this.getComponent<MovementComponent>('movement');
        if (!movement) return;

        // Calculate how far we would move this update
        const distanceThisFrame = movement.getSpeed() * deltaTime;
        const progressThisFrame = distanceThisFrame / this._currentRailDistance;
        
        // Update progress and check completion
        this._progress += progressThisFrame;
        
        // Normal movement update - do component updates first
        this.metrics.set('distance_traveled', 
            this.metrics.get('distance_traveled')! + distanceThisFrame
        );
        super.update(deltaTime);

        // Check completion after updates
        if (this._progress >= 1) {
            this._isMoving = false;
            this._progress = 1;
            
            this.emitEvent({
                type: 'journey_completed',
                trainId: this.id,
                distance: this._currentRailDistance,
                timestamp: performance.now()
            });
        }
    }

    get progress(): number {
        return this._progress;
    }

    get isMoving(): boolean {
        return this._isMoving;
    }

    dispose(): void {
        this.emitEvent({
            type: 'train_disposed',
            trainId: this.id,
            timestamp: performance.now()
        });
        super.dispose();
    }
}
