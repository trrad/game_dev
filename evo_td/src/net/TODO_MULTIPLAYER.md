# TODO: Colyseus Multiplayer Integration

## Overview
This file outlines the planned integration of Colyseus multiplayer functionality into the ECS-based train trading game. The existing `src/net/ColyseusClient.ts` provides the foundation for client-side networking.

## High-Level Architecture

### Server-Side (Colyseus Room)
- **TrainTradingRoom**: Main game room handling multiple players
- **State synchronization**: Share train positions, station states, enemy spawns
- **Player management**: Handle join/leave, player-specific trains
- **Authority system**: Server authoritative for combat, movement validation

### Client-Side Integration Points
- **Existing ECSApp**: Extend current single-player architecture
- **NetworkSystem**: New ECS system to handle multiplayer events
- **State reconciliation**: Merge server state with local predictions
- **UI updates**: Show other players' trains and actions

## Key Components to Modify

### Core Systems
- **TrainSystem**: Add network sync for train movements and actions
- **EnemySystem**: Synchronize enemy spawns and AI behavior across clients
- **ProjectileSystem**: Share projectile creation and collision events
- **TimeManager**: Coordinate game time across all players

### Entity Synchronization
- **Train entities**: Position, speed, cargo, attachments
- **Station states**: Cargo levels, player ownership, upgrades
- **Enemy entities**: Positions, health, targeting
- **Environmental**: Shared world events, time-of-day

### Networking Features
- **Real-time movement**: Smooth interpolation of other players' trains
- **Event broadcasting**: Combat actions, station interactions
- **Chat system**: Player communication
- **Spectator mode**: Watch other players' games

## Implementation Phases

### Phase 1: Basic Connection
- Set up Colyseus server room
- Connect existing `ColyseusClient.ts` to ECSApp
- Implement player join/leave handling
- Basic state sharing (train positions only)

### Phase 2: Core Gameplay Sync
- Synchronize train movements and station interactions
- Share enemy spawning and behavior
- Implement basic combat event sharing
- Add player identification to UI

### Phase 3: Advanced Features
- Real-time collaborative station building
- Shared economy and trading mechanics
- Spectator/observer modes
- Performance optimizations and state compression

### Phase 4: Polish & Features
- Reconnection handling and state recovery
- Advanced UI for multiplayer (player lists, chat)
- Game lobbies and matchmaking
- Anti-cheat and validation systems

## Technical Considerations

### State Management
- **Server authority**: Server validates all game-changing actions
- **Client prediction**: Local actions predicted for responsiveness
- **Conflict resolution**: Handle cases where client/server state diverges

### Performance
- **Update frequency**: Balance between smoothness and bandwidth
- **State compression**: Minimize network payload size
- **Culling**: Only send relevant updates to each client
- **Interpolation**: Smooth movement between network updates

### User Experience
- **Connection indicators**: Show network status to players
- **Graceful degradation**: Handle network issues smoothly
- **Tutorial integration**: Explain multiplayer-specific features

## Files to Create/Modify

### New Files
- `src/systems/NetworkSystem.ts` - Handle multiplayer events
- `src/net/GameRoomClient.ts` - Game-specific Colyseus client wrapper
- `server/TrainTradingRoom.ts` - Colyseus room implementation
- `server/schemas/` - Colyseus state schemas

### Existing Files to Extend
- `src/ecs-app.ts` - Add network system initialization
- `src/systems/TrainSystem.ts` - Add network event handlers
- `src/systems/EnemySystem.ts` - Sync enemy behavior
- `src/ui/UISystem.ts` - Add multiplayer UI elements

## Notes
- Keep single-player mode fully functional
- Use feature flags to toggle multiplayer on/off
- Existing `src/net/ColyseusClient.ts` provides the networking foundation
- Focus on cooperative gameplay rather than competitive PvP initially
- Consider WebRTC for direct peer-to-peer features (voice chat, etc.)

## Future Considerations
- Mobile client support
- Cross-platform play
- Dedicated server hosting
- Replay system for sharing interesting games
- Mod support in multiplayer context

---
*This is a high-level planning document. Implementation details will be refined during actual development.*
