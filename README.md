# World Cup 2026: Pixel Penalty

A pixelated penalty shootout mini-game built with vanilla HTML, CSS, and JavaScript.

🎮 **[Play Live Demo](https://lopezbyronlaw-byte.github.io/pixel-penalty/)**

## How to Run

Simply open `index.html` in any modern web browser:

```bash
# Option 1: Open directly
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows

# Option 2: Use a local server (recommended for best experience)
python3 -m http.server 8000
# Then visit http://localhost:8000

# Option 3: Use Node's http-server
npx http-server -p 8000
# Then visit http://localhost:8000
```

## Controls

### Mouse/Touch
- **Aim Slider**: Drag left/right to aim (-45° to +45°)
- **Power Slider**: Drag to set shot power (30% to 100%)
- **Curve Slider**: Drag to add spin/curve to your shot (-100 to +100)
- **Shoot Button**: Click to take the shot
- **Touch Canvas**: Tap on the canvas to aim and shoot in one action (position determines aim, distance determines power)

### Keyboard
- **← / →**: Adjust aim left/right
- **↑ / ↓**: Increase/decrease power
- **A / D**: Adjust curve left/right
- **Space / Enter**: Shoot
- **R**: Reset shot position

## Game Rules

- You have **5 penalty shots**
- Score as many goals as possible
- Choose from **3 difficulty levels**: Easy, Medium, Hard
- The goalkeeper has **smart AI** with diving animations
- Results tracked: Goals, Saves, Misses, Streak
- **Career statistics** saved locally (accuracy, best streak, perfect games)

## Project Structure

```
wc2026-pixel-penalty/
├── index.html      # Main HTML structure (3 screens)
├── styles.css      # Pixel-art styling, 7-color palette
├── app.js          # Game logic, state machine, canvas rendering
└── README.md       # This file
```

## Technical Details

### Color Palette (7 colors)
- Background: `#1a1c2c` (dark navy)
- Card: `#262b44` (slate)
- Primary: `#41a6f6` (sky blue)
- Secondary: `#ffcd75` (gold)
- Success: `#38b764` (green)
- Danger: `#e43b44` (red)
- Text: `#f4f4f4` (white)
- Muted: `#8b9bb4` (gray-blue)

### Architecture
- **State Machine**: `select → game → results`
- **Game Loop**: `requestAnimationFrame` with separate `update()` and `render()` functions
- **Canvas**: Low-res (160x200) scaled up with `image-rendering: pixelated`
- **Audio**: Web Audio API for procedural sound effects

### Features

#### Gameplay
- **13 teams** to choose from (USA, Mexico, Canada, Brazil, Argentina, Ecuador, Germany, France, Spain, England, Italy, Netherlands, Japan)
- **3 difficulty levels** with different AI behaviors
- **Ball curve/spin mechanics** for strategic shots
- **Smart goalkeeper AI** with diving animations and predictive behavior
- **Streak tracking** for consecutive goals
- **Career statistics** with localStorage persistence

#### Visual & Audio
- **Animated crowd** that responds to goals
- **Particle effects** for goals and saves
- **Celebration animations** with visual feedback
- **Curved aim indicator** showing ball trajectory
- Procedural sound effects (kick, goal, save, miss, dive, crowd)
- CSS-generated pixel flags for all teams

#### Controls & Accessibility
- Responsive design (desktop + mobile)
- Touch-friendly controls
- Keyboard accessibility with visible focus states
- Haptic feedback on mobile (vibration)
- Player name personalization
- Multiple control schemes (sliders, keyboard, touch)

## Browser Support

Works on all modern browsers:
- Chrome/Edge 80+
- Firefox 75+
- Safari 13.1+
- Mobile browsers (iOS Safari, Chrome for Android)

## Known Limitations

- Flags are simplified 3-stripe patterns (not accurate national flags)
- Audio may not play until first user interaction (browser policy)
- Stats are stored locally (clearing browser data will reset statistics)

## No External Dependencies

This game uses:
- No frameworks (pure vanilla JS)
- No build tools
- No external images
- No external fonts
- No CDN dependencies

Everything is self-contained in 3 files.

## Deployment

### GitHub Pages (Recommended)
The repository includes a GitHub Actions workflow that automatically deploys to GitHub Pages when you push to the `main` branch.

**Setup:**
1. Go to your repository settings on GitHub
2. Navigate to **Pages** in the sidebar
3. Under "Build and deployment", select:
   - **Source**: GitHub Actions
4. The workflow will automatically deploy on the next push to `main`

Your game will be live at: `https://lopezbyronlaw-byte.github.io/pixel-penalty/`

### Alternative Deployment Options

#### Netlify
1. Drag and drop the entire folder to [Netlify Drop](https://app.netlify.com/drop)
2. Your site will be live instantly

#### Vercel
```bash
npx vercel --prod
```

#### Any Static Host
Simply upload `index.html`, `app.js`, and `styles.css` to any web server.
