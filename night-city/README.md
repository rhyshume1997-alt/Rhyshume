# Night City Hovercar

A drivable night city in one Rive file. You sit in a hovercar; the two dashboard screens, the windshield display and eight billboards are live Rive artboards with their own state machines, animations and data binding. The city is drawn in 3D on a Rive GPU Canvas.

Not part of the live site: the whole folder is listed in `.vercelignore`.

## What is here

| Path | What it is |
|---|---|
| `index.html` | The city, full screen |
| `components.html` | Plain-words guide to using Rive on a web page, with the billboards and screens running as separate components |
| `nightcity.riv` | The built, signed Rive file both pages load. Made by `build.sh`; not in the repo until someone signs in and builds it |
| `vendor/` | The Rive web player, `@rive-app/webgl2` 2.51.0 (MIT): `rive.js`, `rive.wasm`, `rive_fallback.wasm` |
| `rive/` | The source project for the Rive CLI |
| `build.sh` | Verifies, builds and copies `nightcity.riv` into place |

## Running it

1. Install the Rive CLI: https://rive.app/cli
2. Sign in once: `rive login` (a free account works; free builds open with a short Rive splash)
3. Build the file:

```bash
./night-city/build.sh
```

4. Serve the folder with any static server and open it:

```bash
npx serve night-city
```

Opening `index.html` straight from disk does not work: browsers refuse to load the `.wasm` and `.riv` files from `file://`.

To work on the scene without signing in, use the CLI's own preview window, which rebuilds on every save:

```bash
rive night-city/rive
```

Controls: `W` `S` or up and down to speed up and brake, `A` `D` or left and right to steer, `E` `Q` to climb and descend, `Space` to boost. Click a billboard to tag it, click the map screen to switch its mode. On a touch screen, drag on the sky to steer and climb. A gamepad works too.

## Why the build needs a sign-in

The 3D scene is drawn by a script (`rive/city.luau`). Rive's web player only runs scripts that Rive has signed, and signing happens in `rive --publish`, which needs an account. An unsigned build plays in the CLI's preview window and nowhere else.

## How the Rive project is laid out

| File | Holds |
|---|---|
| `rive/scene.rml` | `Main`, the artboard the player sees. One scripted layout fills it and is handed the other artboards as inputs |
| `rive/city.luau` | The driving script: builds the city, flies the car, draws everything on a GPU Canvas, and passes clicks on to the artboard under the pointer |
| `rive/shaders/world.wgsl` | Sky, ground, towers and traffic. The city repeats every 16 blocks, wrapped around the camera in the shader |
| `rive/shaders/quad.wgsl` | A textured quad: signs in the world, screens and the windshield display in the car |
| `rive/shaders/cockpit.wgsl` | The car's interior |
| `rive/screens.rml` | `Speedo`, `Nav` and `Hud` |
| `rive/ads.rml` | The five billboard designs |
| `rive/data.rml` | The two view models (`Dash`, `Ad`), the converters and the fonts |

How the pieces talk:

- Each frame the script writes speed, altitude, heading, boost and so on into the `Dash` view model of each display. Data binds inside those artboards turn the numbers into a needle angle, an arc length, text. State machines switch to the boost and warning states when the booleans change.
- Each billboard has three state machine layers: a looping animation, a tagged state and a hover state. Its own listeners set `tagged` and `hover` on its `Ad` view model.
- A click on the picture becomes a ray from the driver's eye. If the ray lands on a sign or a dash screen, the script sends the click to that artboard at the matching point, and the artboard's own listener does the rest. The script then reads `tagged` back to count the signs.
- The script draws every artboard into a 2D canvas and uses those canvases as textures in the 3D pass.

The `.rml` files were first laid down by a one-off script and are now the source. Edit them by hand.

Checks to run after an edit, from the repo root:

```bash
rive night-city/rive --verify
rive inspect night-city/rive --summary
rive night-city/rive --screenshot=shot.png --advance=30
```

## Using Rive on your own pages

A Rive file is a small animated, clickable graphic that you put on a page the way you put an image on it. One `.riv` file holds the artwork, the animation and the rules for how it reacts. A player script draws it into a `<canvas>`.

The whole integration for a plain HTML page:

```html
<canvas id="hero" width="640" height="360"></canvas>
<script src="vendor/rive.js"></script>
<script>
  rive.RuntimeLoader.setWasmUrl('vendor/rive.wasm');
  const hero = new rive.Rive({
    src: 'hero.riv',
    canvas: document.getElementById('hero'),
    stateMachine: 'State Machine 1',
    autoplay: true,
    autoBind: true,
  });
</script>
```

To set a value the file exposes:

```js
hero.viewModelInstance.number('speed').value = 240;
```

Any artboard in `nightcity.riv` can be shown on its own this way by adding `artboard: 'AdCola'` (or `AdRamen`, `AdCabs`, `AdHotel`, `AdSynth`, `Speedo`, `Nav`, `Hud`). `components.html` does exactly that.

Notes:

- Files with scripts or 3D need `enableGPUCanvas: true` and a signed build. Files that are only shapes, animation and state machines need neither option, but the CLI still wants a sign-in to write the `.riv`.
- When several small Rive canvases share a page, pass `useOffscreenRenderer: true` so they share one GPU context. Do not use it together with `enableGPUCanvas`.
- In React use `@rive-app/react-webgl2`. iOS, Android, Flutter and React Native have their own players and load the same file.

Fonts embedded in the file: JetBrains Mono and Inter, both under the SIL Open Font License (texts in `rive/fonts/`).
