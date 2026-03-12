# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-03-12

### Added

- **Authentication Commands**: Added new commands for Quapp Store authentication
  - `quapp login` - Sign in to your Quapp developer account with email/password
  - `quapp logout` - Sign out and remove stored credentials
  - `quapp whoami` - Display currently logged-in user information
- **Publishing Command**: Added `quapp publish` command to upload and publish `.qpp` files to the Quapp Store
  - Support for release notes via `--notes` flag
  - Configurable visibility (public, unlisted, private) via `--visibility` flag
  - Automatic credential management using Supabase authentication
- **New Dependencies**: 
  - `@supabase/supabase-js` - For authentication and API interactions
  - `adm-zip` - For handling .qpp file operations

### Changed

- Updated description to reflect new publishing capabilities
- Enhanced CLI help text with new command documentation

## [1.1.3] - Previous Release

- Initial stable release with serve, build, and init commands
