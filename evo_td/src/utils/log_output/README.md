# Log Output Directory

This directory contains game session logs for debugging purposes.

## Log Files

- **Filename Format**: `game_logs_YYYY-MM-DDTHH-MM-SS-SSSZ.txt`
- **Content**: Timestamped log entries with categories and context
- **Generated**: Automatically when the game exits or `window.saveLogs()` is called

## Usage

### Automatic Logging
- Logs are automatically saved when:
  - Exit Game button is clicked
  - Browser tab/window is closed
  - `window.saveLogs()` is called from console

### Manual Commands (Browser Console)
```javascript
// Save current logs
window.saveLogs()

// Export logs (same as save)
window.exportLogs()

// Clear all logs
window.clearLogs()
```

## Environment Behavior

- **Development Server**: Logs saved directly to this directory
- **Browser**: Logs downloaded to Downloads folder (move them here manually)

## Log Categories

- `RENDERING` - Render component creation, mesh operations, visual updates
- `SYSTEM` - Core system operations, initialization, shutdown
- `ATTACHMENT` - Attachment creation, mounting, positioning
- `TRAIN` - Train movement, car operations
- `UI` - User interface interactions
- `ERROR` - Error conditions and warnings

## Debugging Attachment Issues

Look for:
1. `Processing attachments for car` - Shows if attachments are found
2. `AttachmentRenderComponent onAttach called` - Component attachment
3. `Creating visual for attachment` - Mesh creation
4. `Updated attachment visual position` - Position updates
