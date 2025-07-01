# Unified Event & Logging System

## Overview
This replaces both the old `Logger` and `EventStack` systems with a single, comprehensive `UnifiedEventStack` that handles all logging and events.

## Key Features

### 🎯 Single Source of Truth
- All logging goes through `UnifiedEventStack`
- Rich category system with gameplay, technical, and debug categories
- Event-based architecture for everything

### 🎛️ Configurable Output
- **Console output**: Off by default, toggle in EventLogUI
- **File logging**: Exports to downloadable files with rich metadata
- **EventLogUI**: Rich filtering by category, level, and timestamp

### 🚀 Performance Optimized
- Separate buffers for high-frequency vs normal events
- Configurable buffer sizes and retention times
- Efficient filtering and real-time updates

### 🔧 Developer Experience
- **Verbose mode**: `npm run dev:ecs:verbose` enables debug/verbose events
- **Level filtering**: ERROR, WARN, INFO, DEBUG, VERBOSE
- **Category filtering**: Per-category enable/disable
- **Rich context**: JSON context data for all events

## Usage

### Basic Logging
```typescript
import { eventStack, EventCategory, LogLevel } from './core/UnifiedEventStack';

// Basic info logging
eventStack.info(EventCategory.TRAIN, 'train_departed', 'Train left station Alpha', {
    trainId: 'train_001',
    stationId: 'alpha',
    cargo: ['iron', 'coal']
});

// Error logging
eventStack.error(EventCategory.RENDERING, 'mesh_creation_failed', 'Failed to create voxel mesh', {
    voxelId: 'voxel_123',
    error: error.toString()
});

// Debug logging (only shown in verbose mode)
eventStack.debug(EventCategory.ATTACHMENT, 'component_attached', 'Render component attached to entity', {
    entityId: 'attachment_456',
    componentType: 'AttachmentRenderComponent'
});

// High-frequency verbose logging (separate buffer)
eventStack.verbose(EventCategory.PERFORMANCE, 'frame_rendered', 'Frame rendered', {
    fps: 60,
    renderTime: 16.7
});
```

### Game Events (Executable)
```typescript
// Queue executable game events
eventStack.pushGameEvent({
    type: 'train_move',
    execute: () => {
        train.moveTo(nextStation);
    },
    payload: { trainId: 'train_001', destination: 'beta' },
    category: EventCategory.TRAIN,
    message: 'Moving train to next station'
});

// Process all queued events
eventStack.processGameEvents();
```

### Configuration
```typescript
// Update runtime configuration
eventStack.updateConfig({
    minLogLevel: LogLevel.DEBUG,
    consoleOutputEnabled: true,
    enabledCategories: new Set([EventCategory.TRAIN, EventCategory.ENEMY])
});

// Toggle console output
const isEnabled = eventStack.toggleConsoleOutput();
```

## Event Categories

### Gameplay Events
- `TRAIN` - Train movement, loading, unloading
- `ENEMY` - Enemy spawning, movement, combat
- `COMBAT` - Weapon firing, damage, destruction
- `ECONOMY` - Resource generation, trading, costs
- `STATION` - Station operations, expansion
- `RAIL` - Rail construction, pathfinding

### Technical Events
- `RENDERING` - Mesh creation, visual updates
- `ATTACHMENT` - Attachment system operations
- `NETWORK` - Multiplayer networking (future)
- `PERFORMANCE` - FPS, timing, optimization
- `SYSTEM` - App lifecycle, initialization
- `UI` - User interface interactions
- `ERROR` - Error conditions

### Debug Events
- `DEBUG` - Development debugging info
- `VERBOSE` - High-frequency detailed events

## Migration from Old Systems

### Old Logger.log() calls
```typescript
// OLD
Logger.log(LogCategory.RENDERING, 'Attachment created', { id: 'att_123' });

// NEW
eventStack.info(EventCategory.RENDERING, 'attachment_created', 'Attachment created', { id: 'att_123' });
```

### Old EventStack.logEvent() calls
```typescript
// OLD
eventStack.logEvent(LogCategory.TRAIN, 'train_departed', 'Train left station', payload);

// NEW
eventStack.info(EventCategory.TRAIN, 'train_departed', 'Train left station', payload);
```

## Enhanced EventLogUI Features

- **Category filtering**: Toggle each category on/off
- **Level filtering**: Show only ERROR/WARN/INFO/DEBUG/VERBOSE
- **Console output toggle**: Enable/disable browser console output
- **Auto-scroll**: Automatically scroll to newest events
- **Timestamp display**: Show precise timing for each event
- **Context expansion**: View detailed JSON context data
- **Export functionality**: Download complete event logs
- **Collapsible interface**: Hide/show the event log panel

## NPM Scripts

- `npm run dev:ecs` - Normal development mode
- `npm run dev:ecs:verbose` - Verbose mode (shows debug & verbose events)

## Files Structure

```
src/
├── core/
│   └── UnifiedEventStack.ts      # Main unified logging system
├── ui/
│   └── EnhancedEventLogUI_New.ts # Rich event log UI
└── utils/
    └── CSSLoader.ts              # Updated with CSS injection support
```

## Benefits

1. **Consistency**: Single API for all logging needs
2. **Performance**: Optimized buffers and filtering
3. **Developer Experience**: Rich tooling and verbose mode
4. **Scalability**: Designed for high-frequency events
5. **Debugging**: Comprehensive context and export functionality
6. **Future-proof**: Extensible for multiplayer and advanced features

The system is designed to be drop-in replaceable for the old logging systems while providing significantly more capabilities and better performance.
