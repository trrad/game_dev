# Dynamic Enemy Evolution System Design
*"The Wasteland Adapts - A Post-Apocalyptic Ecosystem"*

## Setting & Thematic Context

In the grime-soaked world of the post-collapse rail networks, the Wasteland creatures are as much a product of industrial decay as they are of biological evolution. These aren't just animals - they're the bastard offspring of a world that mixed flesh with steel, where radiation leaked into groundwater and abandoned factories became breeding grounds for horrors that learned to hunt moving trains.

*"We all end up dead on the rails somewhere eventually - too poor, or tired, or stupid to make the next hop. The things out there? They know it too. They've learned to wait."* - Conductor's Journal, found in Wreck Car #447

## Core Trait System

### Primary Traits
Enemies are defined by a combination of inherited traits that determine their capabilities, vulnerabilities, and behaviors.

#### **Physical Traits**
```typescript
interface PhysicalTraits {
    // Core Stats
    baseHealth: number;        // 20-500 HP range
    moveSpeed: number;         // 0.5-3.0 units/sec
    size: number;             // 0.5-2.5 scale multiplier
    
    // Movement Types
    movementType: MovementType;
    terrainPreference: TerrainType[];
    
    // Wasteland Characteristics
    metallic: number;         // 0.0-1.0, how much metal vs organic
    contamination: number;    // 0.0-1.0, chemical/radiation exposure
    
    // Physical Characteristics
    armor: number;            // 0-50 damage reduction
    agility: number;          // 0.1-2.0 dodge chance multiplier
    regeneration: number;     // 0-5 HP/second healing
}

enum MovementType {
    GROUND = 'ground',       // Standard movement
    FLYING = 'flying',       // Can cross obstacles, harder to hit
    BURROWING = 'burrowing', // Emerges near trains, immune to some attacks
    AQUATIC = 'aquatic',     // Faster in water areas, slower on land
    CLIMBING = 'climbing',   // Can scale vertical surfaces
    MECHANICAL = 'mechanical' // Self-propelled constructs
}
```

#### **Combat Traits**
```typescript
interface CombatTraits {
    // Damage Types
    damageType: DamageType;
    baseDamage: number;       // 5-100 damage per attack
    attackRange: number;      // 1-15 units
    attackRate: number;       // 0.2-3.0 attacks/second
    
    // Resistances (0.0 = immune, 1.0 = normal, 2.0 = vulnerable)
    resistances: {
        kinetic: number;      // Bullets, projectiles
        explosive: number;    // Bombs, area damage
        energy: number;       // Lasers, electric
        fire: number;         // Flame weapons
        cold: number;         // Ice/freeze weapons
        toxic: number;        // Chemical weapons
        radiation: number;    // Atomic damage
    };
    
    // Special Abilities
    abilities: SpecialAbility[];
}

enum DamageType {
    KINETIC = 'kinetic',     // Standard projectile damage
    EXPLOSIVE = 'explosive', // Area effect damage
    ENERGY = 'energy',       // Beam/electric damage
    FIRE = 'fire',          // Burning damage over time
    COLD = 'cold',          // Slowing/freezing effects
    TOXIC = 'toxic',        // Chemical damage over time
    RADIATION = 'radiation', // Atomic contamination
    SONIC = 'sonic'         // Penetrates armor
}

enum SpecialAbility {
    SWARM = 'swarm',         // Attacks in coordinated groups
    CAMOUFLAGE = 'camouflage', // Harder to detect until close
    BERSERKER = 'berserker', // Damage increases as health decreases
    REGENERATOR = 'regenerator', // Heals rapidly out of combat
    EXPLODER = 'exploder',   // Explodes on death
    MIMIC = 'mimic',         // Copies successful traits from other enemies
    HIVE_MIND = 'hive_mind', // Shares information between individuals
    ADAPTIVE = 'adaptive',   // Develops resistance to frequently used damage types
    FUEL_DRAIN = 'fuel_drain', // Siphons energy from trains
    SIGNAL_JAMMER = 'signal_jammer', // Disrupts train communications
    EMP_PULSE = 'emp_pulse', // Disables electrical systems
    SCRAP_ARMOR = 'scrap_armor' // Incorporates destroyed materials as armor
}
```

#### **Behavioral Traits**
```typescript
interface BehavioralTraits {
    aggressionLevel: number;  // 0.0-1.0, affects attack frequency
    intelligence: number;     // 0.0-1.0, affects tactical behavior
    socialBehavior: SocialBehavior;
    huntingStrategy: HuntingStrategy;
    fearThreshold: number;    // 0.0-1.0, when to retreat
    curiosity: number;        // 0.0-1.0, attraction to new stimuli
    scavenging: number;       // 0.0-1.0, tendency to collect materials
}

enum SocialBehavior {
    SOLITARY = 'solitary',   // Hunts alone
    PACK = 'pack',           // Small coordinated groups (2-5)
    SWARM = 'swarm',         // Large uncoordinated groups (10-50)
    HIVE = 'hive'           // Highly coordinated collective behavior
}

enum HuntingStrategy {
    AMBUSH = 'ambush',       // Waits for trains to approach
    PURSUIT = 'pursuit',     // Actively chases trains
    PATROL = 'patrol',       // Guards territory, attacks intruders
    SCAVENGER = 'scavenger', // Follows trains for opportunities
    TERRITORIAL = 'territorial', // Defends specific areas aggressively
    TRAP_SETTER = 'trap_setter' // Uses environment as weapons
}
```

## Evolution Speed & Adaptation Timeline

### Population Variation Schedule
*4-6 significant adaptations per hour of gameplay*

```typescript
interface EvolutionTiming {
    // Major population shifts
    significantAdaptation: 10-15 minutes;  // New dominant traits emerge
    minorVariation: 3-5 minutes;           // Stat adjustments, resistance shifts
    
    // Event-driven evolution
    playerDeathResponse: 2-3 minutes;      // Rapid adaptation to successful tactics
    weaponCounterAdaptation: 8-12 minutes; // Resistance to frequently used weapons
    routeSpecialization: 20-30 minutes;    // Population divergence per rail line
    
    // Environmental triggers
    seasonalShift: 1-2 hours;              // Weather/environmental adaptation
    industrialEvent: 30-45 minutes;        // Response to world events
}
```

## Information & Intelligence Systems

### Reputation-Based Intel Network
*"Good intel costs more than most can afford"*

```typescript
enum IntelSource {
    RUMOR_MILL = 'rumor_mill',           // Free, unreliable tavern gossip
    NEWS_BOARD = 'news_board',           // Public notices, partially reliable
    CONDUCTOR_NETWORK = 'conductor_network', // Fellow operators, moderate cost
    SCOUT_REPORTS = 'scout_reports',     // Professional scouts, expensive but accurate
    SCANNER_DATA = 'scanner_data',       // Your own equipment, real-time but limited
    BLACK_MARKET = 'black_market',       // Stolen intel, high cost, very detailed
    GUILD_INTELLIGENCE = 'guild_intelligence' // Requires high guild standing
}

enum IntelType {
    ENEMY_COMPOSITION = 'enemy_composition',     // What types are common
    RESISTANCE_PROFILE = 'resistance_profile',   // What damage types are effective
    BEHAVIORAL_PATTERN = 'behavioral_pattern',   // How they hunt/attack
    POPULATION_TRENDS = 'population_trends',     // Recent evolutionary changes
    ROUTE_SAFETY = 'route_safety',              // Overall threat assessment
    RECENT_INCIDENTS = 'recent_incidents'        // Fresh attack reports
}

enum ScannerType {
    BASIC_DETECTOR = 'basic_detector',       // Detects presence only
    THREAT_ASSESSOR = 'threat_assessor',     // Estimates danger level
    EVOLUTIONARY_TRACKER = 'evolutionary_tracker', // Detects recent mutations
    FULL_SPECTRUM = 'full_spectrum'          // Complete analysis suite
}
```

## Visual Design: Modular Creature Groups

### Base Creature Archetypes
Different visual families that can be blended and hybridized:

#### **1. Mechanical**
*Industrial constructs and automated systems gone feral*
- **Base Shapes**: Angular, geometric forms with visible joints
- **Materials**: Rusted metal, exposed wiring, hydraulic pistons
- **Movement**: Mechanical precision, grinding sounds, steam vents
- **Parts**: Wheels, treads, robotic arms, sensor arrays
- **Colors**: Rust browns, oxidized greens, warning yellows

#### **2. Chem-Waste**
*Creatures warped by industrial chemicals and toxic runoff*
- **Base Shapes**: Flowing, irregular blobs with corrosive textures
- **Materials**: Translucent toxic slimes, bubbling surfaces
- **Movement**: Oozing, dissolving through obstacles
- **Parts**: Chemical tanks, dripping appendages, gas vents
- **Colors**: Sickly yellows, toxic greens, chemical purples

#### **3. Scavengers**
*Opportunistic creatures that incorporate found materials*
- **Base Shapes**: Organic cores with grafted metal bits
- **Materials**: Mixed flesh/metal, improvised armor plating
- **Movement**: Adaptive, using tools and scavenged parts
- **Parts**: Scrap shields, found weapons, collected debris
- **Colors**: Muted organic tones with metallic accents

#### **4. Blobs**
*Amorphous life forms that adapt their shape*
- **Base Shapes**: Fluid, constantly shifting forms
- **Materials**: Organic membranes, internal organs visible
- **Movement**: Flowing, splitting, reforming
- **Parts**: Pseudopods, sensory organs, internal structures
- **Colors**: Dark flesh tones, internal glows, blood reds

#### **5. Flying Insect Hive**
*Swarm creatures with collective intelligence*
- **Base Shapes**: Segmented arthropod bodies with wings
- **Materials**: Chitinous shells, transparent wing membranes
- **Movement**: Coordinated flight patterns, formation behavior
- **Parts**: Multiple wings, antennae, compound eyes, stingers
- **Colors**: Metallic blues, warning stripes, iridescent shells

#### **6. Crabs**
*Armored scuttling creatures with powerful claws*
- **Base Shapes**: Low, wide bodies with articulated legs
- **Materials**: Heavy shell armor, segmented joints
- **Movement**: Sideways scuttling, defensive postures
- **Parts**: Large claws, eye stalks, shell spikes, leg segments
- **Colors**: Earth tones, shell patterns, warning spots

### Hybrid Blending System
```typescript
interface CreatureBlend {
    primaryArchetype: ArchetypeType;    // Dominant visual family (60-80%)
    secondaryArchetype?: ArchetypeType; // Minor influence (20-40%)
    blendRatio: number;                 // How much secondary influence
    
    // Specific blend rules
    compatibleBlends: CompatibilityMatrix;
    visualPriority: BlendPriority[];
}

// Example blends:
// Mechanical + Scavenger = Robot with jury-rigged organic parts
// Chem-Waste + Blob = Toxic ooze with industrial chemical tanks
// Flying Insect + Mechanical = Drone-like creatures with metal wings
// Crab + Scavenger = Heavily armored creatures with found-object weapons

class ProceduralCreatureGenerator {
    generateCreature(traits: EnemyTraits): CreatureVisual {
        // 1. Select primary archetype based on traits
        const primary = this.selectPrimaryArchetype(traits);
        
        // 2. Determine if blending occurs (30% chance)
        const secondary = Math.random() < 0.3 ? this.selectSecondaryArchetype(traits, primary) : null;
        
        // 3. Create base body from primary archetype
        const baseBody = this.createArchetypeBody(primary, traits.physical);
        
        // 4. Add secondary archetype influences
        if (secondary) {
            this.blendSecondaryFeatures(baseBody, secondary, 0.3);
        }
        
        // 5. Add trait-specific parts
        const functionalParts = this.addTraitParts(baseBody, traits);
        
        // 6. Apply contamination/weathering effects
        const materials = this.createWastelandMaterials(baseBody, traits);
        
        return new CreatureVisual(baseBody, functionalParts, materials);
    }
    
    private selectPrimaryArchetype(traits: EnemyTraits): ArchetypeType {
        // Movement type influences primary archetype
        if (traits.physical.movementType === MovementType.MECHANICAL) {
            return ArchetypeType.MECHANICAL;
        }
        if (traits.physical.movementType === MovementType.FLYING) {
            return ArchetypeType.FLYING_INSECT;
        }
        
        // High metallic content suggests mechanical or scavenger
        if (traits.physical.metallic > 0.7) {
            return Math.random() < 0.6 ? ArchetypeType.MECHANICAL : ArchetypeType.SCAVENGER;
        }
        
        // High contamination suggests chem-waste
        if (traits.physical.contamination > 0.6) {
            return ArchetypeType.CHEM_WASTE;
        }
        
        // Social behavior influences choice
        if (traits.behavioral.socialBehavior === SocialBehavior.HIVE) {
            return ArchetypeType.FLYING_INSECT;
        }
        
        // Default distribution
        return this.weightedRandomArchetype();
    }
}
```

### Simple Animation System
```typescript
class WastelandAnimationController {
    setupAnimations(creature: CreatureVisual): void {
        // Archetype-specific base animations
        switch (creature.primaryArchetype) {
            case ArchetypeType.MECHANICAL:
                this.addMechanicalAnimations(creature); // Grinding, sparking
                break;
            case ArchetypeType.CHEM_WASTE:
                this.addFluidAnimations(creature); // Bubbling, flowing
                break;
            case ArchetypeType.BLOB:
                this.addBlobAnimations(creature); // Pulsing, morphing
                break;
            case ArchetypeType.FLYING_INSECT:
                this.addInsectAnimations(creature); // Wing beating, antennae
                break;
            case ArchetypeType.CRAB:
                this.addArthropodAnimations(creature); // Leg movement, claw snapping
                break;
        }
        
        // Universal breathing/idle animation
        this.addIdleAnimation(creature.baseBody);
    }
    
    private addMechanicalAnimations(creature: CreatureVisual): void {
        // Subtle mechanical movements
        creature.parts.forEach(part => {
            if (part.type === PartType.SENSORS) {
                this.addScanningRotation(part.mesh);
            }
            if (part.type === PartType.HYDRAULICS) {
                this.addPistonMovement(part.mesh);
            }
        });
        
        // Random sparking effects
        this.addSparkingParticles(creature.baseBody);
    }
}
```

This streamlined system maintains the atmospheric setting while keeping the traits generic and reusable. The visual archetype blending allows for tremendous variety without requiring complex art assets - you can create hundreds of unique creatures by mixing and matching these six base families with different contamination levels, parts, and weathering effects.