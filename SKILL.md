# ms — Meta Skill CLI

> Local-first skill management platform for AI coding agents

> Version: 0.2.3

## Capabilities

### Core Commands
- **search**: Hybrid BM25 + semantic skill search
- **load**: Progressive disclosure skill loading with token packing
- **suggest**: Context-aware recommendations with Thompson sampling
- **build**: Extract skills from CASS sessions
- **list**: List all indexed skills
- **show**: Show skill details
- **lint**: Validate skill files for issues
- **doctor**: Health checks and diagnostics
- **index**: Index skills from configured paths
- **setup**: Auto-configure ms for AI coding agents

### Robot Mode
All commands support `-O json` for JSON output:
```bash
ms search "query" -O json
ms load skill-name -O json --level overview
ms suggest -O json
ms list -O json
```

## MCP Server
Start MCP server for native tool integration:
```bash
ms mcp serve           # stdio transport (Claude Code)
ms mcp serve --tcp-port 8080  # HTTP transport
```

### Available MCP Tools
- `search` - Search for skills using BM25 full-text search
- `load` - Load a skill by ID
- `suggest` - Get context-aware skill suggestions
- `evidence` - View provenance evidence for skill rules
- `list` - List all indexed skills
- `show` - Show detailed information about a specific skill
- `doctor` - Run health checks on the ms installation
- `lint` - Lint a skill file for validation issues
- `feedback` - Record skill feedback
- `index` - Re-index skills

## Context Integration
- Reads `.ms/config.toml` for project-specific settings
- Respects `NO_COLOR` and `FORCE_COLOR` environment variables
- Auto-detects project type from marker files

## Examples
```bash
# Find skills for error handling
ms search "rust error handling"

# Load with full content
ms load rust-error-patterns --level full

# Get suggestions for current project
ms suggest --explain

# Validate a skill file
ms lint SKILL.md

# Run health checks
ms doctor
```
