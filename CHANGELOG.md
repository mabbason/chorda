# Changelog

All notable changes to Chorda will be documented in this file.

## [0.1.0.0] - 2026-04-03

### Added
- Full brand identity: Goldman Sans font, purple/pink/green/yellow color palette, custom logos on all auth screens, favicons, and PWA manifest
- Hand-filtered audio playback: audio only plays for the hand(s) you're practicing, toggling preserves your playback position
- Persistent user menu (top-right on all pages) with Dashboard, Switch User, and Logout
- Circular user avatars in the user picker and avatar selection

### Fixed
- Left/Right hand toggle buttons now match piano hand positions (L on left, R on right)
- "Mark Learned" button replaced with a clean check icon (circle outline when unlearned, filled green when learned)
- Back arrow replaced with a proper SVG icon in a rounded button matching the stop button
- Key highlight visibility increased from 15%/30% to 55%/65% opacity for white/black keys
- Fixed missing `visibleHands` dependency in usePlayback (uses ref instead to avoid re-renders)
- Added mount guard to prevent double-scheduling on initial song load
- Improved error handling in UserPicker (proper unknown error narrowing)
- Added Escape key handler to UserMenu for keyboard accessibility
