/**
 * TrainCarModificationUI - User interface for designing and modifying train car layouts
 */

import { Logger, LogCategory } from '../engine/utils/Logger';
import { TrainCar } from '../entities/TrainCar';
import { Attachment, AttachmentSlotType } from '../entities/Attachment';
import { AttachmentFactory } from '../entities/AttachmentFactory';
import { AttachmentSlotComponent } from '../components/AttachmentSlotComponent';

/**
 * UI for modifying train car configurations and attachments
 */
export class TrainCarModificationUI {
    private containerElement: HTMLElement;
    private currentCar: TrainCar | null = null;
    private selectedAttachmentType: string | null = null;
    private selectedSlotType: AttachmentSlotType | null = null;

    constructor() {
        this.containerElement = document.createElement('div');
        this.containerElement.id = 'train-car-modification-ui';
        this.containerElement.className = 'ui-panel';
        this.setupUI();
    }

    /**
     * Set up the UI elements
     */
    private setupUI(): void {
        this.containerElement.innerHTML = `
            <div class="ui-header">
                <h3>Train Car Modification</h3>
                <button id="close-mod-ui" class="ui-button close-button">×</button>
            </div>
            
            <div class="ui-content">
                <div class="car-info-section">
                    <h4>Current Car</h4>
                    <div id="car-info">No car selected</div>
                </div>
                
                <div class="attachment-selection">
                    <h4>Available Attachments</h4>
                    <div id="attachment-types" class="button-grid">
                        <!-- Attachment type buttons will be populated here -->
                    </div>
                </div>
                
                <div class="slot-selection">
                    <h4>Slot Types</h4>
                    <div id="slot-types" class="button-grid">
                        <button class="slot-type-btn" data-slot="top">Top</button>
                        <button class="slot-type-btn" data-slot="side_left">Left Side</button>
                        <button class="slot-type-btn" data-slot="side_right">Right Side</button>
                        <button class="slot-type-btn" data-slot="front">Front</button>
                        <button class="slot-type-btn" data-slot="rear">Rear</button>
                        <button class="slot-type-btn" data-slot="internal">Internal</button>
                    </div>
                </div>
                
                <div class="grid-layout">
                    <h4>Attachment Grid</h4>
                    <div id="attachment-grid" class="grid-container">
                        <!-- Grid will be populated dynamically -->
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button id="place-attachment" class="ui-button action-button" disabled>Place Attachment</button>
                    <button id="remove-attachment" class="ui-button action-button">Remove Selected</button>
                    <button id="clear-all" class="ui-button action-button warning">Clear All</button>
                    <button id="sample-loadout" class="ui-button action-button">Sample Loadout</button>
                </div>
                
                <div class="car-stats">
                    <h4>Car Statistics</h4>
                    <div id="car-stats-content">
                        <!-- Stats will be populated here -->
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.populateAttachmentTypes();
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Close button
        const closeBtn = this.containerElement.querySelector('#close-mod-ui');
        closeBtn?.addEventListener('click', () => this.hide());

        // Attachment type selection
        const attachmentContainer = this.containerElement.querySelector('#attachment-types');
        attachmentContainer?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('attachment-type-btn')) {
                this.selectAttachmentType(target.dataset.attachment || null);
            }
        });

        // Slot type selection
        const slotContainer = this.containerElement.querySelector('#slot-types');
        slotContainer?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('slot-type-btn')) {
                this.selectSlotType(target.dataset.slot as AttachmentSlotType);
            }
        });

        // Action buttons
        const placeBtn = this.containerElement.querySelector('#place-attachment');
        placeBtn?.addEventListener('click', () => this.placeSelectedAttachment());

        const removeBtn = this.containerElement.querySelector('#remove-attachment');
        removeBtn?.addEventListener('click', () => this.removeSelectedAttachment());

        const clearBtn = this.containerElement.querySelector('#clear-all');
        clearBtn?.addEventListener('click', () => this.clearAllAttachments());

        const sampleBtn = this.containerElement.querySelector('#sample-loadout');
        sampleBtn?.addEventListener('click', () => this.applySampleLoadout());
    }

    /**
     * Populate available attachment types
     */
    private populateAttachmentTypes(): void {
        const container = this.containerElement.querySelector('#attachment-types');
        if (!container) return;

        const types = AttachmentFactory.getAvailableTypes();
        container.innerHTML = types.map(type => {
            const displayName = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `<button class="attachment-type-btn ui-button" data-attachment="${type}">${displayName}</button>`;
        }).join('');
    }

    /**
     * Select an attachment type
     */
    private selectAttachmentType(type: string | null): void {
        this.selectedAttachmentType = type;
        
        // Update UI selection
        const buttons = this.containerElement.querySelectorAll('.attachment-type-btn');
        buttons.forEach(btn => btn.classList.remove('selected'));
        
        if (type) {
            const selectedBtn = this.containerElement.querySelector(`[data-attachment="${type}"]`);
            selectedBtn?.classList.add('selected');
        }

        this.updatePlaceButtonState();
        Logger.log(LogCategory.UI, `Selected attachment type: ${type}`);
    }

    /**
     * Select a slot type
     */
    private selectSlotType(slotType: AttachmentSlotType): void {
        this.selectedSlotType = slotType;
        
        // Update UI selection
        const buttons = this.containerElement.querySelectorAll('.slot-type-btn');
        buttons.forEach(btn => btn.classList.remove('selected'));
        
        const selectedBtn = this.containerElement.querySelector(`[data-slot="${slotType}"]`);
        selectedBtn?.classList.add('selected');

        this.updatePlaceButtonState();
        this.updateGridDisplay();
        Logger.log(LogCategory.UI, `Selected slot type: ${slotType}`);
    }

    /**
     * Update the place button enabled state
     */
    private updatePlaceButtonState(): void {
        const placeBtn = this.containerElement.querySelector('#place-attachment') as HTMLButtonElement;
        if (placeBtn) {
            placeBtn.disabled = !(this.selectedAttachmentType && this.selectedSlotType && this.currentCar);
        }
    }

    /**
     * Update the grid display for the selected slot type
     */
    private updateGridDisplay(): void {
        const gridContainer = this.containerElement.querySelector('#attachment-grid');
        if (!gridContainer || !this.currentCar || !this.selectedSlotType) {
            if (gridContainer) gridContainer.innerHTML = '<p>Select a car and slot type to view grid</p>';
            return;
        }

        const slotComponent = this.currentCar.getSlotComponent();
        if (!slotComponent) {
            gridContainer.innerHTML = '<p>No slot configuration available</p>';
            return;
        }

        const grid = slotComponent.getGrid();
        const slots = slotComponent.getAvailableSlots(this.selectedSlotType);
        
        // Create a visual grid representation
        let gridHTML = `<div class="grid-info">Grid: ${grid.width}×${grid.height}×${grid.depth} (Unit: ${grid.unitSize})</div>`;
        gridHTML += '<div class="grid-visual">';
        
        // For simplicity, show a 2D slice (top view for top slots, side view for side slots)
        if (this.selectedSlotType === AttachmentSlotType.TOP) {
            // Top-down view (X-Z plane)
            for (let z = 0; z < grid.depth; z++) {
                gridHTML += '<div class="grid-row">';
                for (let x = 0; x < grid.width; x++) {
                    const slot = slots.find(s => 
                        s.gridPosition.x === x && s.gridPosition.z === z
                    );
                    const cssClass = slot ? (slot.isOccupied ? 'occupied' : 'available') : 'empty';
                    gridHTML += `<div class="grid-cell ${cssClass}" data-x="${x}" data-z="${z}" title="(${x}, ${z})"></div>`;
                }
                gridHTML += '</div>';
            }
        } else {
            // Side view or simplified representation
            gridHTML += '<div class="slot-list">';
            slots.forEach(slot => {
                const status = slot.isOccupied ? 'Occupied' : 'Available';
                const occupiedBy = slot.occupiedBy ? ` by ${slot.occupiedBy}` : '';
                gridHTML += `
                    <div class="slot-item ${slot.isOccupied ? 'occupied' : 'available'}"
                         data-slot-id="${slot.id}">
                        <strong>${slot.id}</strong><br>
                        Position: (${slot.gridPosition.x}, ${slot.gridPosition.y}, ${slot.gridPosition.z})<br>
                        Status: ${status}${occupiedBy}
                    </div>
                `;
            });
            gridHTML += '</div>';
        }
        
        gridHTML += '</div>';
        gridContainer.innerHTML = gridHTML;

        // Add click handlers for grid cells
        const gridCells = gridContainer.querySelectorAll('.grid-cell, .slot-item');
        gridCells.forEach(cell => {
            cell.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                // Handle grid cell selection for placement
                this.selectGridPosition(target);
            });
        });
    }

    /**
     * Handle grid position selection
     */
    private selectGridPosition(cellElement: HTMLElement): void {
        // Remove previous selection
        const prevSelected = this.containerElement.querySelectorAll('.grid-cell.selected, .slot-item.selected');
        prevSelected.forEach(el => el.classList.remove('selected'));

        // Add selection to clicked cell
        cellElement.classList.add('selected');
        
        Logger.log(LogCategory.UI, 'Selected grid position', {
            slotId: cellElement.dataset.slotId,
            x: cellElement.dataset.x,
            z: cellElement.dataset.z
        });
    }

    /**
     * Place the selected attachment
     */
    private placeSelectedAttachment(): void {
        if (!this.currentCar || !this.selectedAttachmentType || !this.selectedSlotType) {
            Logger.warn(LogCategory.UI, 'Cannot place attachment: missing selection');
            return;
        }

        const attachment = AttachmentFactory.createByName(this.selectedAttachmentType);
        if (!attachment) {
            Logger.warn(LogCategory.UI, `Failed to create attachment: ${this.selectedAttachmentType}`);
            return;
        }

        // For now, place at grid position (0, 0, 0) - in a real implementation,
        // we'd use the selected grid position
        const success = this.currentCar.addAttachment(
            attachment,
            this.selectedSlotType,
            0, 0, 0
        );

        if (success) {
            Logger.log(LogCategory.UI, `Successfully placed ${this.selectedAttachmentType}`);
            this.updateCarInfo();
            this.updateGridDisplay();
        } else {
            Logger.warn(LogCategory.UI, `Failed to place ${this.selectedAttachmentType}`);
        }
    }

    /**
     * Remove selected attachment
     */
    private removeSelectedAttachment(): void {
        // Implementation depends on how we track selected attachments
        Logger.log(LogCategory.UI, 'Remove attachment requested (not implemented)');
    }

    /**
     * Clear all attachments from the car
     */
    private clearAllAttachments(): void {
        if (!this.currentCar) return;

        // Implementation would iterate through all attachments and remove them
        Logger.log(LogCategory.UI, 'Clear all attachments requested (not implemented)');
    }

    /**
     * Apply a sample loadout for the current car type
     */
    private applySampleLoadout(): void {
        if (!this.currentCar) return;

        const loadout = AttachmentFactory.getSampleLoadout(this.currentCar.carType);
        Logger.log(LogCategory.UI, `Applying sample loadout for ${this.currentCar.carType}`, {
            attachmentCount: loadout.length
        });

        // For demonstration, just log what would be placed
        loadout.forEach((attachment, index) => {
            const config = attachment.getConfig();
            Logger.log(LogCategory.UI, `Loadout item ${index + 1}: ${config.name} (${config.type})`);
        });
    }

    /**
     * Set the current car to modify
     */
    setCar(car: TrainCar): void {
        this.currentCar = car;
        this.updateCarInfo();
        this.updateGridDisplay();
        this.updatePlaceButtonState();
        
        Logger.log(LogCategory.UI, `Set modification target: ${car.carType} car ${car.carId}`);
    }

    /**
     * Update car information display
     */
    private updateCarInfo(): void {
        const infoElement = this.containerElement.querySelector('#car-info');
        const statsElement = this.containerElement.querySelector('#car-stats-content');
        
        if (!infoElement || !statsElement) return;

        if (!this.currentCar) {
            infoElement.innerHTML = 'No car selected';
            statsElement.innerHTML = 'No car data';
            return;
        }

        const stats = this.currentCar.getAttachmentStats();
        
        infoElement.innerHTML = `
            <div><strong>Type:</strong> ${this.currentCar.carType}</div>
            <div><strong>ID:</strong> ${this.currentCar.carId}</div>
            <div><strong>Health:</strong> ${this.currentCar.health}/${this.currentCar.health}</div>
            <div><strong>Length:</strong> ${this.currentCar.length}</div>
        `;

        statsElement.innerHTML = `
            <div><strong>Attachment Slots:</strong> ${stats.occupied}/${stats.total}</div>
            <div><strong>Available:</strong> ${stats.available}</div>
            <div class="slot-breakdown">
                ${Array.from(stats.byType.entries()).map(([type, data]) => 
                    `<div>${type}: ${data.occupied}/${data.total}</div>`
                ).join('')}
            </div>
        `;
    }

    /**
     * Show the UI
     */
    show(): void {
        if (!document.body.contains(this.containerElement)) {
            document.body.appendChild(this.containerElement);
        }
        this.containerElement.style.display = 'block';
        Logger.log(LogCategory.UI, 'Showed train car modification UI');
    }

    /**
     * Hide the UI
     */
    hide(): void {
        this.containerElement.style.display = 'none';
        Logger.log(LogCategory.UI, 'Hid train car modification UI');
    }

    /**
     * Clean up the UI
     */
    dispose(): void {
        if (document.body.contains(this.containerElement)) {
            document.body.removeChild(this.containerElement);
        }
        this.currentCar = null;
        Logger.log(LogCategory.UI, 'Disposed train car modification UI');
    }

    /**
     * Check if the UI is currently visible
     */
    isVisible(): boolean {
        return this.containerElement.style.display !== 'none' && 
               document.body.contains(this.containerElement);
    }
}
