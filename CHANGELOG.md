# Changelog

Notable changes to CliToolRegistry.Web are recorded here.

## Unreleased

### Added

- Schema-driven tool workspace for adding tools, completing or correcting entries, and importing or exporting workspace data.
- Profile editor for composing CliToolRegistry tool packages from catalog and workspace tools.
- Tool-focused catalog and explorers for available help, guidance, command references, and structured data.

### Changed

- Make the catalog the primary entry point and streamline navigation around tools and their content.
- Run GitHub Pages deployment only from `main`; feature-branch checks build and validate without publishing.

### Fixed

- Update schema-required catalog metadata in test fixtures and align browser checks with the current navigation.
- Add an accessible label to workspace file import and preserve list semantics in profile warnings.
