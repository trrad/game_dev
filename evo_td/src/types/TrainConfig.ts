/**
 * Configuration interface for Train entities.
 */
export interface TrainConfig {
    /** Maximum cargo capacity in units */
    cargoCapacity: number;
    /** Base movement speed */
    baseSpeed: number;
    /** Spacing between train cars */
    carSpacing: number;
    /** Power efficiency multiplier */
    powerEfficiency: number;
}
