# Train Trading Game - Complete Design Document

*Industrial frontier meets cozy trading in a post-apocalyptic world powered by ancient technology*

## Game Vision

**Train Trading Game** is a multiplayer roguelike trading and exploration game where players control customizable trains traversing a post-apocalyptic world via ancient rail networks. The core experience combines strategic trade route optimization with satisfying 3D train customization and tactical survival against evolving threats. 

**The Living World**: The game's central innovation is its evolutionary enemy system - creatures that genuinely evolve & adapt to player strategies over time. Successful enemy populations grow stronger and develop new traits, while failed attack patterns disappear from the gene pool. The world literally remembers how you play and evolves countermeasures.

**Roguelike Structure**: Each journey between stations is a run with permanent consequences. Lost train cars are gone forever, successful routes unlock new opportunities, and the enemy populations you encounter today are shaped by the collective actions of all players who came before.

**Core Inspiration**: FTL meets Dredge meets a living ecosystem - strategic decision-making with atmospheric exploration, where every choice ripples through a world that adapts and remembers. The constant pressure isn't just from immediate threats, but from knowing that today's easy victory might spawn tomorrow's nightmare enemy.

### The World

In the wreckage of a ruined high-tech civilization, hardy frontier communities cling to survival using the remnants of ancient rail networks. These indestructible rails, glowing with lost technology, serve as lifelines between scattered stations in an ever-changing wasteland. 

**Evolutionary Pressure**: The space between stations isn't just dangerous - it's alive and learning. Every train that passes through leaves traces in the ecosystem. Enemy populations that successfully damage or destroy trains gain resources to reproduce and spread their traits. Those that fail simply vanish from the gene pool. Over time, the creatures hunting rail travelers become precisely adapted to counter the most common player strategies.

**Permanent Consequences**: This is a world where choices matter permanently. A route that was safe last week might now be overrun by Energy Crabs - evolved descendants of the creatures that learned to counter the ballistic weapons that previous travelers relied on. Your decisions don't just affect your current run; they reshape the world for everyone who comes after.

**The Rails as Sanctuary**: Only the ancient rails themselves remain constant - indestructible pathways that launch trains through hostile territory using mysterious power bands. Everything else - the stations, the trade routes, the very DNA of your enemies - shifts with the tide of survival and adaptation.

## Art Direction & Atmosphere

### Visual Style
- **Industrial Frontier, Future Noire, Grunge**: Frontiers people pushing the limits of civilization in the wreckage of a ruined high-tech world
- **Voxel-Based Aesthetic**: Chunky, simple aesthetic for train customization that feels tactile and modular
- **Post-Apocalyptic and Neon Color Palette**: Greys, greens, purples dominate the landscape
- **Dynamic Environment**: Constantly changing fog, lighting, storms - even the ground itself seems to shift trip to trip
- **Atmospheric Effects**: Field of view camera filters, volumetric fog, particle effects create immersion

### The Rails
- **Ancient Technology**: Indestructible relics that glow with otherworldly energy
- **Visual Representation**: Rendered as glowing, greased lines cutting through the landscape
- **Power Band System**: Rails generate acceleration fields that provide constant thrust to trains within the optimal band
- **Friction Mechanics**: Zero friction within the power band, increasing resistance outside it
- **Launch System**: Initial acceleration via rail system or conventional means to reach the power band
- **Scheduled Departures**: The rails activate on predetermined schedules, forcing timing decisions

### Technical Art Goals
- **Performance-First**: Runs smoothly on web browsers and mobile devices
- **Scalable Quality**: Adaptive rendering based on device capabilities
- **Modular Assets**: Reusable voxel components enable infinite customization possibilities
- **Clear Visual Hierarchy**: Important gameplay elements are immediately recognizable

## Core Game States

### On-Rail State: Survival and Strategy

When launched from a station, your train hurtles across the wasteland on ancient rails, gradually losing momentum as you coast toward your destination. This is where survival instincts meet tactical decision-making.

**The Player Character**: You are a small figure - a "lil guy" who must stay within life support systems or risk death in the harsh environment. You can:
- Shelter in life support pod attachments
- Hide inside sealed voxel compartments  
- Venture outside in a limited-duration environmental suit
- Climb around the moving train to repair damage and operate systems manually
- Physically disconnect doomed train cars to save the rest

**Combat Philosophy**: Not frantic micromanagement, but thoughtful resource allocation and crisis response:
- **Target Selection**: Choose priority targets among enemy swarms
- **Tactical Strategies**: Configure attachment behavior (focus closest threats, protect specific cars, conserve ammunition)
- **Repair Decisions**: Allocate limited resources to fix critical damage
- **Sacrifice Moments**: The agonizing choice to disconnect cars - losing precious cargo and equipment to save lives

**Energy and Momentum**: Your train rides within ancient power bands that provide constant acceleration:
- **Power Band Dynamics**: Rails accelerate trains within the optimal energy field, with lighter trains accelerating faster
- **Tactical Jettisoning**: Drop cars by pushing them out of the power band with brakes - they fall behind and get scavenged, reducing your mass for faster escape
- **Emergency Disconnection**: Explosive or compromised cars can be ejected before they detonate
- **Friction Consequences**: Trains outside the power band experience increasing resistance and deceleration
- **Power Management**: Battery voxels (volatile but essential) power your attachments and life support systems

### In-Station State: Planning and Preparation

Stations are safe harbors - pressurized environments where you can breathe freely and take time to plan. Each station has a distinct character based on its specialization and the threats it faces.

**Station Atmosphere**: Menu-driven interface enhanced by atmospheric 3D environments. Click on building meshes to access their services:

**Trading Posts**: Dynamic economies based on supply chains, local needs, and current threats. Prices fluctuate based on recent route dangers and seasonal factors.

**Workshops**: Modular train customization using the 3D voxel grid system. See your changes in real-time as you build and modify your mobile fortress.

**Information Brokers**: Grizzled veterans and automated systems provide crucial intelligence about route conditions, enemy evolution patterns, and hidden opportunities.

**Gear Shops**: Acquire new train cars, rare attachments, and life support upgrades. Each piece of equipment tells a story of previous owners and battles survived.

**Quest Givers**: NPCs offering missions that go beyond simple trading - escort contracts, exploration requests, emergency evacuations.

## Train Construction & Customization

### The Voxel System
Your train is built from individual voxels - chunky, modular blocks that can be customized and upgraded:

**Core Voxel Types**:
- **Passenger**: Life support systems, living quarters, command centers
- **Structural**: Framework and mounting points for attachments
- **Cargo**: Storage compartments for trade goods and resources
- **Battery**: Energy storage (explosive when damaged, essential for operations)

**Visual Customization**: Each voxel can be painted, textured, and modified for both aesthetic and functional purposes. Battle damage shows as individual voxel destruction, making combat feel visceral and personal.

### Attachment Philosophy
**Current Simplicity, Future Complexity**: Start with basic turret, engine, and armor types, but design for rich future expansion:

**Mounting System**: 
- Armor plates attach to sides, front, and back faces for protection
- Weapons, utilities, and equipment mount on top surfaces
- Future: Power requirements, voxel-type restrictions, attachment interactions

**Meaningful Choices**: Every attachment decision involves trade-offs between protection, firepower, cargo capacity, and weight (affecting launch costs).

## The Living World: Evolutionary Enemy System

### Five Foundational Tribes
The creatures that hunt rail travelers aren't static opponents - they're living populations that adapt, evolve, and spread across the landscape:

**Crabs**: Armored ground-huggers that excel at structural damage and coordinated assaults. They evolve thicker shells and more destructive claws.

**Locusts**: Aerial swarms that can overwhelm defenses through sheer numbers. Evolution favors speed, coordination, and evasive flight patterns.

**Scavengers**: Tool-using intelligences that learn from each encounter. They develop new weapons from salvaged train parts and improve their tactics.

**Goop**: Corrosive organic masses that deny area access and can split or merge. They evolve new chemical attacks and defensive capabilities.

**Energy Spheres**: Mysterious entities that manipulate electromagnetic fields. They develop stronger shields and more precise energy weapons.

### Evolution Mechanics
**Accelerated Adaptation**: In the irradiated wasteland, evolution happens at gameplay speed rather than geological time.

**Population-Based Adaptation**: Enemy groups that successfully attack trains gain resources and reproductive advantages. Failed attack groups dwindle and disappear.

**Hybridization System**: Successful enemy types can cross-breed, creating dangerous combinations:
- **Energy Crabs**: Armored ground units with electromagnetic shields
- **Goop Locusts**: Swarming aerial units that drop corrosive payloads
- **Scavenger Spheres**: Tool-using entities that can manipulate electromagnetic fields for tactical advantage
- **Crab Scavengers**: Armored ground units that adapt and improve their tactics between encounters

**Regional Specialization**: A low-resolution map overlay tracks dominant traits across the rail network. Heavily trafficked routes develop enemies resistant to common player strategies, while isolated areas harbor primitive but unpredictable threats.

**Migration Patterns**: Successful adaptations spread to neighboring regions through natural population movement, creating waves of evolved threats that require new countermeasures.

**Tactical Countermeasures**: Different enemy combinations require different approaches - ballistic weapons vs. energy shields, area denial vs. swarm tactics, speed vs. durability builds.

## Multiplayer & Social Systems

### Cooperative Philosophy
**Individual Trains, Shared World**: Up to 4 players operate independently but can choose to coordinate when beneficial:

**Flexible Interaction**: Take different routes to the same destination, or travel together for mutual protection. Share information about route conditions and enemy adaptations.

**Natural Specialization**: Some players gravitate toward heavy cargo hauling, others become fast scouts, mobile workshops, or combat specialists. Cooperation emerges organically rather than being forced.

**Time Control**: In multiplayer, players can vote on game speed (1x to 32x), defaulting to 1x in stations for planning. Solo play allows full pausing in stations.

### The Consuming Wave
**FTL-Style Pursuit Mode**: A procedural disaster - evolved super-organisms, reality-warping storms, or cascading environmental collapse - spreads across the rail network.

**Escalating Pressure**: The wave permanently destroys stations it reaches, forcing players to evacuate resources and people ahead of the advancing threat.

**Leapfrog Survival**: Rear players become expendable scouts while forward players establish new safe zones. Coordination and sacrifice determine group survival.

**Regional Reset**: Behind the wave, primitive enemy populations return, but the advanced infrastructure is gone forever.

### Boss Journeys
**Epic Cooperative Challenges**: Special routes requiring preparation, coordination, and specialized equipment:

**"Journey to Atlantis"**: Marathon routes across dangerous territory with time pressure and unique mechanics.

**Technology Gates**: Some routes require specific discoveries or equipment that no single player can obtain alone.

**Narrative Missions**: Uncover the mysteries of the lost civilization and the true nature of the rail network.

## Economic & Progression Systems

### Launch Economics
**Demand-Driven Pricing**: Launch costs fluctuate based on route popularity, cargo demand, and player/NPC behavior:
- **Supply & Demand**: Popular routes cost more during peak times, while dangerous routes offer discounts to attract brave traders
- **Dynamic Competition**: Other players and NPC traders compete for departure slots, driving up prices for prime routes
- **High Base Costs**: Even basic routes are expensive relative to starting funds, creating constant financial pressure

### Income vs. Expenses
**Thin Margins**: Operating costs consistently outpace easy profits:
- **Mission Contracts**: Pay well but require significant upfront investment in suitable equipment
- **Trading Profits**: Modest returns that barely cover route costs and equipment replacement
- **Information Economy**: Sensor data provides supplementary income but requires expensive sensor attachments
- **Salvage Operations**: Risky but potentially lucrative recovery of abandoned equipment

**Equipment Economics**: 
- **High Purchase Prices**: New attachments and train cars are major investments
- **Poor Resale Values**: Used equipment sells for 10-20% of purchase price, discouraging frequent reorganization
- **Attachment Removal Risk**: Attempting to relocate equipment may damage or destroy it, making optimization costly

## Roguelike Structure & Progression

### Permanent World State
**Collective Evolution**: Unlike traditional roguelikes where each run is isolated, the enemy populations persist and evolve based on the collective actions of all players. Your successful turret-heavy build doesn't just help you - it teaches the world to develop armor-piercing swarms.

**Total Loss on Death**: When you die, you lose everything - train cars, attachments, cargo, accumulated wealth. You restart with basic starting equipment and whatever route access you've previously unlocked.

**Scarcity Economics**: High mission costs and poor resale values mean you're always operating on thin margins, forced to make do with whatever gear you can afford rather than optimal loadouts.

**Persistent Unlocks**: Successful runs unlock access to new routes and station contacts. Knowledge and access persist, but all physical assets are lost on death.

### Meta-Game Progression
**Route Mastery**: Regular routes become safer as you eliminate weaker enemy populations, but also spawn stronger adapted threats. Players must constantly push into new territories to find profitable, less-adapted hunting grounds.

**Information Persistence**: Knowledge about current enemy evolution patterns, route conditions, and market trends carries between runs and can be shared or sold to other players.

**Technological Arms Race**: New attachment types and train technologies are unlocked through exploration and experimentation, giving players new tools to outpace enemy adaptation cycles.

## Technical Vision

### Platform Strategy
**Web-First Development**: Primary platform is web browsers with mobile optimization and cross-platform multiplayer.

**Scalable Complexity**: Simple interactions that work on touch screens, with deeper complexity available for dedicated players.

**Reactive Architecture**: All game state managed through reactive property systems for smooth multiplayer synchronization.

### Performance Targets
**60fps on Modern Mobile**: Smooth gameplay experience across devices through adaptive rendering and efficient resource management.

**Bandwidth Efficiency**: Minimize data usage for mobile players through smart network compression and local prediction.

## Emotional Design Goals

### Scavenger Ingenuity
**Making-Do Satisfaction**: The deep satisfaction of succeeding with suboptimal, mismatched equipment cobbled together from whatever you could afford.

**Jury-Rigged Aesthetic**: Your train should look and feel like a survivor - battle-scarred, improvised, held together by determination and clever engineering.

**Resource Scarcity**: Constant financial pressure creates meaningful choices where every purchase matters and waste is genuinely painful.

### Strategic, Not Twitch-Based
**Thoughtful Decision-Making**: Emphasize planning, resource management, and tactical adaptation over reflexes and timing.

**Time Control Options**: Multiple game modes cater to different pressure preferences - from relaxed exploration to intense pursuit scenarios.

**High Stakes Commitment**: When you mount an attachment or commit to a route, the consequences are permanent and meaningful. No easy optimization or save-scumming.

**Collaborative Triumph**: Successful cooperation in the face of overwhelming odds should generate genuine camaraderie.

### Creative Expression
**Personal Trains**: The voxel customization system should enable players to create trains that reflect their personality and playstyle.

**Emergent Stories**: The combination of procedural threats, player decisions, and cooperative dynamics should generate memorable narratives.

**Progressive Mastery**: Simple systems that reveal deeper complexity through play, rewarding both casual enjoyment and obsessive optimization.

## Development Roadmap

### Phase 1: Core Evolutionary Loop
1. **Basic Enemy Evolution**: Population-based adaptation system with trait inheritance
2. **Rails & Station Generation**: Procedural rail network with dynamic route difficulty
3. **Train Movement**: Power band momentum system with tactical car jettisoning
4. **Simple Combat**: Basic attachment system vs. evolving enemy types

### Phase 2: Emergent Complexity
5. **Hybrid Evolution**: Cross-breeding system creating dangerous enemy combinations
6. **Information Economy**: Sensor systems and intelligence trading
7. **Multiplayer Evolution**: Shared world state where all players contribute to enemy adaptation
8. **Dynamic Pricing**: Economic systems that respond to route danger and success rates

### Phase 3: Advanced Ecosystem
9. **Regional Specialization**: Geographic clustering of evolved traits
10. **Consuming Wave Mode**: Ultimate evolutionary pressure scenarios
11. **Advanced Attachments**: Rock-paper-scissors balancing against specific evolved threats
12. **Long-term Persistence**: Enemy populations that evolve over days/weeks of real time

## Open Questions for Development

**Balance Philosophy**: How do we maintain the "cozy" feeling while preserving genuine stakes and meaningful loss?

**Evolution Pacing**: What's the optimal speed for enemy adaptation - fast enough to stay interesting, slow enough to feel fair?

**Cooperative Incentives**: How do we encourage collaboration without making solo play feel incomplete?

**Content Progression**: What unlocks new areas, technologies, or capabilities while maintaining the frontier atmosphere?

## Narrative Approach

### Environmental Storytelling
**Background Worldbuilding**: The story emerges through environmental details, station characteristics, and overheard conversations rather than explicit campaigns.

**Recurring Characters**: Familiar faces appear across stations - AI personalities, computer terminals, and hardy survivors who've made the rail network their home.

**Tutorial Immersion**: The initial learning experience establishes the world's atmosphere and basic survival knowledge without heavy exposition.

**Procedural Dialogue**: Long-term vision includes AI-generated NPC conversations that respond to current world state and player actions.

---

*This document represents the current vision for Train Trading Game. As development progresses, these systems will be refined, expanded, and balanced based on playtesting and player feedback.*

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
- **Quick Loading**: Fast initial load and seamless transitions -- bundle has potential to be extremely small - few MB for client, few hundred k for server.
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
