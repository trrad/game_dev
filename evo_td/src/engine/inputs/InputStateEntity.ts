// src/engine/input/InputStateEntity.ts - Global Reactive Input State

import { NetworkReactiveEntity } from '../networking/NetworkReactiveEntity';
import { NetworkRole, EntitySchema } from '../networking/NetworkTypes';
import { Scene, Vector3 } from '@babylonjs/core';

// Input event types for collections
export interface ClickEvent {
  timestamp: number;
  sequenceId: number;
  button: number;
  screenPosition: { x: number; y: number };
  worldPosition: Vector3;
  pickedEntityId?: string;
  pickedUIElement?: string;
  surfaceNormal?: Vector3;
  raycastDistance?: number;
  modifierKeys: string[];
}

export interface KeyEvent {
  timestamp: number;
  sequenceId: number;
  keyCode: string;
  modifierKeys: string[];
}

// Schema for InputStateEntity - note client authority on input properties
export const INPUT_STATE_SCHEMA: EntitySchema = {
  entityType: 'input_state',
  properties: [
    // =================================================================
    // CLIENT AUTHORITATIVE - Client enriches and sends to server
    // =================================================================
    
    // Current input state (continuous)
    { 
      name: 'keysPressed', 
      type: 'collection', 
      defaultValue: new Map<string, string>(), 
      networkSync: true, 
      authority: 'client' 
    },
    { 
      name: 'mouseButtons', 
      type: 'collection', 
      defaultValue: new Map<string, number>(), 
      networkSync: true, 
      authority: 'client' 
    },
    { 
      name: 'mouseScreenPosition', 
      type: 'vector', 
      defaultValue: { x: 0, y: 0, z: 0 }, 
      networkSync: true, 
      authority: 'client' 
    },
    
    // Client-enriched context (continuously updated by 3D picking)
    { 
      name: 'mouseWorldPosition', 
      type: 'vector', 
      defaultValue: { x: 0, y: 0, z: 0 }, 
      networkSync: true, 
      authority: 'client' 
    },
    { 
      name: 'currentlyPickedEntity', 
      type: 'string', 
      defaultValue: '', 
      networkSync: true, 
      authority: 'client' 
    },
    { 
      name: 'currentlyPickedUIElement', 
      type: 'string', 
      defaultValue: '', 
      networkSync: true, 
      authority: 'client' 
    },
    { 
      name: 'currentSurfaceNormal', 
      type: 'vector', 
      defaultValue: { x: 0, y: 1, z: 0 }, 
      networkSync: true, 
      authority: 'client' 
    },
    { 
      name: 'currentRaycastDistance', 
      type: 'number', 
      defaultValue: 0, 
      networkSync: true, 
      authority: 'client' 
    },
    
    // Recent input events (with auto-expiry)
    { 
      name: 'recentClicks', 
      type: 'collection', 
      defaultValue: new Map<string, ClickEvent>(), 
      networkSync: true, 
      authority: 'client' 
    },
    { 
      name: 'recentKeyPresses', 
      type: 'collection', 
      defaultValue: new Map<string, KeyEvent>(), 
      networkSync: true, 
      authority: 'client' 
    },
    { 
      name: 'recentKeyReleases', 
      type: 'collection', 
      defaultValue: new Map<string, KeyEvent>(), 
      networkSync: true, 
      authority: 'client' 
    },
    
    // =================================================================
    // SERVER AUTHORITATIVE - Server validation results and acknowledgments
    // =================================================================
    
    { 
      name: 'inputValidationErrors', 
      type: 'number', 
      defaultValue: 0, 
      networkSync: true, 
      authority: 'server' 
    },
    { 
      name: 'acknowledgedClickSequence', 
      type: 'number', 
      defaultValue: 0, 
      networkSync: true, 
      authority: 'server' 
    },
    { 
      name: 'serverInputRate', 
      type: 'number', 
      defaultValue: 0, 
      networkSync: true, 
      authority: 'server' 
    },
    
    // =================================================================
    // LOCAL ONLY - Performance and debug info
    // =================================================================
    
    { 
      name: 'clientInputRate', 
      type: 'number', 
      defaultValue: 0, 
      networkSync: false, 
      authority: 'client' 
    },
    { 
      name: 'pickingPerformance', 
      type: 'number', 
      defaultValue: 0, 
      networkSync: false, 
      authority: 'client' 
    }
  ]
};

/**
 * Global InputStateEntity - One per client session
 * 
 * Centralizes all input state using reactive properties with client authority.
 * Replaces the event-based PlayerInput system with pure reactive state.
 */
export class InputStateEntity extends NetworkReactiveEntity {
  private sequenceCounter: number = 0;
  private eventExpiryCleanup?: () => void;
  
  constructor(networkId: string, scene: Scene | null, role: NetworkRole) {
    super('input_state', networkId, scene, role);
    
    // Create reactive properties from schema
    this.createPropertiesFromSchema(INPUT_STATE_SCHEMA);
    
    // Set up behaviors
    this.setupBehaviors();
    this.setupRoleBehaviors();
    
    console.log(`🎮 InputStateEntity created with ${role.isClient ? 'CLIENT' : 'SERVER'} authority patterns`);
  }
  
  protected setupBehaviors(): void {
    // Set up automatic event expiry to prevent memory leaks
    this.setupEventExpiry();
    
    // Set up input rate tracking
    this.setupRateTracking();
  }
  
  protected setupClientBehaviors(): void {
    // Client-specific setup will be handled by ReactiveInputEnricher
    console.log('🖥️ CLIENT: InputState ready for enrichment');
  }
  
  protected setupServerBehaviors(): void {
    // Server observes client input state changes for processing
    console.log('🖥️ SERVER: InputState ready for processing');
    
    // Example: Track input validation
    const recentClicks = this.getCollectionProperty<ClickEvent>('recentClicks');
    recentClicks?.itemAddedObservable.add((event) => {
      console.log(`📥 SERVER: Received click from client at (${event.value.worldPosition.x.toFixed(1)}, ${event.value.worldPosition.z.toFixed(1)})`);
      
      // Basic validation example
      if (this.isValidClickEvent(event.value)) {
        // Process through game logic (will be handled by game entities observing input state)
        this.acknowledgeInput(event.value.sequenceId);
      } else {
        this.incrementValidationErrors();
      }
    });
  }
  
  // =================================================================
  // CLIENT-SIDE INPUT API (used by ReactiveInputEnricher)
  // =================================================================
  
  /**
   * Update current key press state
   */
  updateKeyPressed(keyCode: string, pressed: boolean, modifierKeys: string[] = []): void {
    const keysPressed = this.getCollectionProperty<string>('keysPressed');
    if (!keysPressed) return;
    
    if (pressed) {
      keysPressed.addItem(keyCode, keyCode, 'key_press');
    } else {
      keysPressed.removeItem(keyCode, 'key_release');
    }
    
    // Add to recent events for server processing
    const eventCollection = pressed ? 
      this.getCollectionProperty<KeyEvent>('recentKeyPresses') :
      this.getCollectionProperty<KeyEvent>('recentKeyReleases');
      
    if (eventCollection) {
      const keyEvent: KeyEvent = {
        timestamp: Date.now(),
        sequenceId: ++this.sequenceCounter,
        keyCode,
        modifierKeys: [...modifierKeys]
      };
      
      eventCollection.addItem(`key_${this.sequenceCounter}`, keyEvent, 'key_event');
    }
  }
  
  /**
   * Update current mouse button state
   */
  updateMouseButton(button: number, pressed: boolean): void {
    const mouseButtons = this.getCollectionProperty<number>('mouseButtons');
    if (!mouseButtons) return;
    
    if (pressed) {
      mouseButtons.addItem(`button_${button}`, button, 'mouse_press');
    } else {
      mouseButtons.removeItem(`button_${button}`, 'mouse_release');
    }
  }
  
  /**
   * Update mouse position and enriched context
   */
  updateMouseContext(
    screenPosition: Vector3,
    worldPosition: Vector3,
    pickedEntityId?: string,
    pickedUIElement?: string,
    surfaceNormal?: Vector3,
    raycastDistance?: number
  ): void {
    // Update all mouse context reactively
    this.getVectorProperty('mouseScreenPosition')?.set(screenPosition, 'mouse_move');
    this.getVectorProperty('mouseWorldPosition')?.set(worldPosition, 'mouse_picking');
    this.getProperty<string>('currentlyPickedEntity')?.set(pickedEntityId || '', 'mouse_picking');
    this.getProperty<string>('currentlyPickedUIElement')?.set(pickedUIElement || '', 'mouse_picking');
    
    if (surfaceNormal) {
      this.getVectorProperty('currentSurfaceNormal')?.set(surfaceNormal, 'mouse_picking');
    }
    if (raycastDistance !== undefined) {
      this.getNumericProperty('currentRaycastDistance')?.set(raycastDistance, 'mouse_picking');
    }
  }
  
  /**
   * Add a click event (captures current context)
   */
  addClickEvent(button: number, modifierKeys: string[] = []): void {
    const recentClicks = this.getCollectionProperty<ClickEvent>('recentClicks');
    if (!recentClicks) return;
    
    // Capture current state for the click
    const clickEvent: ClickEvent = {
      timestamp: Date.now(),
      sequenceId: ++this.sequenceCounter,
      button,
      screenPosition: {
        x: this.getVectorProperty('mouseScreenPosition')?.getValue().x || 0,
        y: this.getVectorProperty('mouseScreenPosition')?.getValue().y || 0
      },
      worldPosition: this.getVectorProperty('mouseWorldPosition')?.getValue() || Vector3.Zero(),
      pickedEntityId: this.getProperty<string>('currentlyPickedEntity')?.getValue() || undefined,
      pickedUIElement: this.getProperty<string>('currentlyPickedUIElement')?.getValue() || undefined,
      surfaceNormal: this.getVectorProperty('currentSurfaceNormal')?.getValue(),
      raycastDistance: this.getNumericProperty('currentRaycastDistance')?.getValue(),
      modifierKeys: [...modifierKeys]
    };
    
    recentClicks.addItem(`click_${this.sequenceCounter}`, clickEvent, 'click_event');
    console.log(`🖱️ Click event added: (${clickEvent.worldPosition.x.toFixed(1)}, ${clickEvent.worldPosition.z.toFixed(1)})`);
  }
  
  // =================================================================
  // SERVER-SIDE VALIDATION API
  // =================================================================
  
  private isValidClickEvent(clickEvent: ClickEvent): boolean {
    // Basic validation - can be enhanced later
    const now = Date.now();
    const age = now - clickEvent.timestamp;
    
    // Reject clicks older than 5 seconds
    if (age > 5000) return false;
    
    // Validate world position bounds
    const pos = clickEvent.worldPosition;
    if (Math.abs(pos.x) > 100 || Math.abs(pos.y) > 100 || Math.abs(pos.z) > 100) {
      return false;
    }
    
    return true;
  }
  
  private acknowledgeInput(sequenceId: number): void {
    this.getNumericProperty('acknowledgedClickSequence')?.set(sequenceId, 'server_ack');
  }
  
  private incrementValidationErrors(): void {
    this.getNumericProperty('inputValidationErrors')?.increment('validation_error');
  }
  
  // =================================================================
  // AUTOMATIC CLEANUP AND PERFORMANCE
  // =================================================================
  
  private setupEventExpiry(): void {
    // Clean up old events every 5 seconds
    const cleanup = setInterval(() => {
      this.expireOldEvents();
    }, 5000);
    
    this.eventExpiryCleanup = () => clearInterval(cleanup);
    this.addCleanupFunction(this.eventExpiryCleanup);
  }
  
  private expireOldEvents(): void {
    const now = Date.now();
    const maxAge = 10000; // 10 seconds
    
    // Clean up old clicks
    const recentClicks = this.getCollectionProperty<ClickEvent>('recentClicks');
    if (recentClicks) {
      const expiredKeys: string[] = [];
      recentClicks.getEntries().forEach(([key, clickEvent]) => {
        if (now - clickEvent.timestamp > maxAge) {
          expiredKeys.push(key);
        }
      });
      
      expiredKeys.forEach(key => {
        recentClicks.removeItem(key, 'auto_expire');
      });
      
      if (expiredKeys.length > 0) {
        console.log(`🧹 Expired ${expiredKeys.length} old click events`);
      }
    }
    
    // Clean up old key events similarly
    [this.getCollectionProperty<KeyEvent>('recentKeyPresses'),
     this.getCollectionProperty<KeyEvent>('recentKeyReleases')].forEach(collection => {
      if (!collection) return;
      
      const expiredKeys: string[] = [];
      collection.getEntries().forEach(([key, keyEvent]) => {
        if (now - keyEvent.timestamp > maxAge) {
          expiredKeys.push(key);
        }
      });
      
      expiredKeys.forEach(key => {
        collection.removeItem(key, 'auto_expire');
      });
    });
  }
  
  private setupRateTracking(): void {
    // Track input rate for performance monitoring
    let inputCount = 0;
    const startTime = Date.now();
    
    // Count all input events
    [this.getCollectionProperty('recentClicks'),
     this.getCollectionProperty('recentKeyPresses'),
     this.getCollectionProperty('recentKeyReleases')].forEach(collection => {
      collection?.itemAddedObservable.add(() => {
        inputCount++;
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = inputCount / elapsed;
        
        if (this.getRole().isClient) {
          this.getNumericProperty('clientInputRate')?.set(rate, 'rate_tracking');
        } else {
          this.getNumericProperty('serverInputRate')?.set(rate, 'rate_tracking');
        }
      });
    });
  }
  
  // =================================================================
  // PUBLIC API FOR GAME LOGIC
  // =================================================================
  
  /**
   * Get the current world position of the mouse cursor
   */
  getCurrentMouseWorldPosition(): Vector3 {
    return this.getVectorProperty('mouseWorldPosition')?.getValue() || Vector3.Zero();
  }
  
  /**
   * Get the currently picked entity ID (empty string if none)
   */
  getCurrentlyPickedEntity(): string {
    return this.getProperty<string>('currentlyPickedEntity')?.getValue() || '';
  }
  
  /**
   * Check if a key is currently pressed
   */
  isKeyPressed(keyCode: string): boolean {
    return this.getCollectionProperty<string>('keysPressed')?.hasItem(keyCode) || false;
  }
  
  /**
   * Check if a mouse button is currently pressed
   */
  isMouseButtonPressed(button: number): boolean {
    return this.getCollectionProperty<number>('mouseButtons')?.hasItem(`button_${button}`) || false;
  }
  
  /**
   * Get recent clicks for processing
   */
  getRecentClicks(): ClickEvent[] {
    return this.getCollectionProperty<ClickEvent>('recentClicks')?.getValues() || [];
  }
  
  dispose(): void {
    if (this.eventExpiryCleanup) {
      this.eventExpiryCleanup();
    }
    super.dispose();
  }
}