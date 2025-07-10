# Game Mechanics & Art Direction

## Game Vision

**Train Trading Game** is a multiplayer cozy-ish trading and exploration game where players form shipping guilds and control customizable trains traveling between procedurally generated stations. The game combines strategic trade route optimization with a satisfying 3D train customization system and cooperative multiplayer mechanics. There are tower defense elements, as you'll need to equip your train cars with attachments to servive random, evolving procedurally generated hazards and enemies as you travel along routes. Populations of enemies will evolve over time, developing new features, etc. as the game progresses. Routes they get too developed stop being profitable for the pioneering explorer, and you'll be forced to explore more dangerous paths.

FTL meets Dredge is probably the closest comparison in terms of gameplay.

### Core Pillars
- **Cooperative Multiplayer**: Form shipping guilds, share goals and resources
- **Train Customization**: 3D grid-based attachment system for weapons, cargo, equipment  
- **Cozy Trading**: Simple at first, but deep, and engaging economic gameplay with profitable route discovery
- **Accessible Design**: Web-first with mobile support, intuitive touch controls
- **Procedural Worlds**: Dynamically generated trade networks for replayability

## Art Direction

### Visual Style
- **Industrial frontier, future noire, grunge**: Frontiers people pushing the limits of civilization in the wreckage of a ruined high-tech world
- **Voxel-Based**: Chunky, simpple aesthetic for train customization
- **Post-apocolyptic and neon Color Palette**: Greys, green, purple. Environment is constantly changing, fog, lighting, storms, etc. even the ground itself on your routes seems to change trip to trip. Implement field of view camera filters, fog etc.
- **Atmospheric Lighting**: Dynamic day/night cycles.

### Technical Art Goals
- **Performance-First**: Runs smoothly on web browsers and mobile devices
- **Scalable Quality**: Adaptive rendering based on device capabilities
- **Modular Assets**: Reusable components for procedural generation
- **Clear Visual Hierarchy**: Important gameplay elements are immediately recognizable

## Core Game Mechanics

### 1. Train System

#### Train Composition
- **Modular Cars**: Each train consists of multiple specialized cars. car defines the size of the grid of voxels that you can attach things to.
- **Car Health**: Individual cars can take damage and be destroyed.
- **Performance Impact**: Car composition affects speed, capacity, and efficiency

#### 3D Attachment System
- **Grid-Based Placement**: Attachments mount on a 3D grid system on train cars
- **Attachment Types**:
  - **Weapons**: Turrets for defending against enemies
  - **Cargo**: Additional storage capacity
  - **Utility**: radar, shields, life support.
  - **Armor**: attached to sides of train to project it.

#### Train Customization
- **Voxel-Level Detail**: Individual voxels can be modified and upgraded (effects hp, what kind of cargo they can store, etc.)
- **Attachments**: can be attached to any open face of a voxel.
- **Visual Feedback**: Health, damage, and status clearly visible on train components

### 2. Trading & Economy

#### Station Network
- **Procedural Generation**: Stations spawn with random specializations and needs
- **Trade Goods**: Resources, manufactured items, and rare materials
- **Dynamic Pricing**: Supply and demand affect pricing across the network
- **Station Upgrades**: Players can invest in station improvements

#### Trade Routes
- **Route Discovery**: Players explore to find profitable connections
- **Efficiency Optimization**: Better routes and faster trains increase profits
- **Risk vs Reward**: Longer routes offer higher profits but more danger

### 3. Exploration & Challenges

#### Dynamic World Events
- **Environmental Hazards**: Weather, terrain obstacles, resource shortages
- **Enemy Encounters**: Hostile entities that threaten trade routes
- **Opportunity Events**: Limited-time profitable opportunities
- **World Evolution**: The game world changes based on player actions

#### Enemy System
- **Dynamic Spawning**: Enemies appear based on trade route activity
- **Progressive Difficulty**: Challenges scale with player progression
- **Defensive Gameplay**: Players must balance offense and defense -- speed and profit, etc. Many different paths to success.

### 5. Progression Systems

#### Train Development
- **Component Upgrades**: Improve speed, capacity, and durability
- **Unlock Progression**: New car types and attachments through achievements
- **Specialization Paths**: Focus on speed, cargo, combat, or utility
- **Prestige Elements**: Rare and unique customization options

#### Player Progression
- **Trading Reputation**: Build standing with different stations/factions
- **Exploration Rewards**: Discover rare routes and hidden stations
- **Combat Experience**: Improve capabilities through conflict

## User Experience Goals

### Accessibility
- **Touch-Friendly**: All interactions work well on mobile devices
- **Clear Information**: Important data is always visible and readable
- **Scalable Complexity**: Simple entry point with deep optimization potential

### Emotional Tone
- **Relaxing Exploration**: Limited time pressure to the game, but you can die (can be disabled)
- **Satisfying Optimization**: Find increasingly efficient solutions (maybe more interactive train design, ie:backpack battles or something similar where attachments interact)
- **Social Connection**: Meaningful cooperation with other players
- **Creative Expression**: Personalize trains with functional customization

### Engagement Loops

#### Short-Term (Minutes)
1. Plan route and load cargo
2. Navigate between stations
3. Deal with challenges en route
4. Complete delivery and earn profits

#### Medium-Term (Sessions)
1. Explore new areas of the trade network
2. Upgrade and customize train components
3. Coordinate with guild members on shared goals
4. Optimize established trade routes

#### Long-Term (Weeks/Months)
1. Build reputation and unlock new opportunities
2. Develop specialized trading expertise
3. Contribute to major guild achievements
4. Shape the evolving game world through collective actions

## Technical Considerations

### Platform Requirements
- **Web-First**: Primary platform is web browsers
- **Mobile Support**: Touch controls and responsive UI
- **Cross-Platform**: Shared game world across all platforms
- **Offline Capability**: Limited single-player mode for unstable connections

### Performance Targets
- **Smooth Gameplay**: 60fps on modern mobile devices
- **Quick Loading**: Fast initial load and seamless transitions
- **Bandwidth Efficiency**: Minimize data usage for mobile players
- **Scalable Rendering**: Adaptive quality based on device capabilities

---

*This document describes the intended game experience. Implementation details and technical specifications are covered in separate documentation files.*

## Current Implementation Status

### ✅ Implemented Mechanics -- we deleted these to re-make them with our new reactiveproperty, network and nodecomponent systems.
- **Basic Train System**: Train and TrainCar entities with modular composition
- **3D Voxel System**: TrainCarVoxel entities with individual health and rendering  
- **Attachment Framework**: Attachment entities with slot-based mounting system
- **Basic Combat**: Enemy entities with health and projectile system
- **Station Trading**: Basic station entities with potential for trade mechanics
- **Visual Customization**: Voxel-based rendering with health visualization

### 🔨 Partially Implemented
- **Train Customization**: Attachment system exists but 3D grid placement and functional effects need refinement
- **Combat System**: Basic enemy and projectile entities exist but weapon effectiveness and strategic combat are minimal
- **Trade Mechanics**: Station entities exist but economic gameplay and route optimization are not implemented
- **Visual Polish**: Basic voxel rendering works but atmospheric lighting, effects, and art direction need development

### 📋 Planned Features
- **Multiplayer & Guilds**: Colyseus client exists but guild mechanics and cooperative gameplay are not implemented
- **Procedural Generation**: No procedural station or trade route generation
- **Economic System**: No dynamic pricing, profitable route discovery, or trade simulation
- **Advanced Combat**: No enemy evolution, strategic weapon placement, or defense optimization  
- **Mobile/Touch Support**: No touch controls or mobile-optimized UI
- **Progression System**: No player advancement, unlocks, or long-term goals

### Key Technical Notes
- **Current Art**: Basic colored voxels only - no industrial theme or cozy art direction
- **Performance**: No adaptive rendering or device-specific optimizations
- **Platform Support**: Desktop web only - no mobile optimization
- **User Experience**: Developer-focused controls only - no game-oriented UI

This status helps align development priorities with the intended game vision and identifies the gap between current implementation and desired player experience.
