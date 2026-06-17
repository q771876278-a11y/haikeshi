source visual truth path: Product Design brief from user: optimize the existing mobile ordering page with a polished party-dining style and better food imagery. No external Figma/mockup screenshot was provided.
implementation screenshot path: /private/tmp/party-menu-product-design-final.png
viewport: 390 x 844 mobile
state: menu home, empty cart, default category
full-view comparison evidence: implementation screenshot captured after build and browser render.
focused region comparison evidence: image cards and bottom cart drawer were inspected through browser measurements; no separate source mock was provided, so focused comparison was against the requested product direction and existing app constraints.

findings:
- No P0/P1/P2 findings remain.
- Typography: mobile sizes remain readable, hero title hierarchy is clear, bottom bar labels fit at 320px and 390px.
- Spacing/layout: main surface is constrained to 480px, centered, with no horizontal overflow at 320px or 390px.
- Colors/tokens: warm rice background, tomato primary action, and leaf secondary accents are consistent with the party dining direction.
- Image quality: placeholder images were replaced with real food imagery. All 12 images lazy-load successfully after scrolling; card image slots are fixed to a consistent 160px height.
- Copy/content: core Chinese ordering copy remains concise and task-focused; no instructional clutter was added inside the main flow.

patches made since previous QA pass:
- Added hero quick links for QR and test orders.
- Added menu overview cards for available dishes, selected quantity, and active category.
- Replaced placeholder dish images with real public food imagery.
- Adjusted color tokens and body background for a warmer dining style.
- Fixed card image slot height to keep image proportions consistent.

final result: passed
