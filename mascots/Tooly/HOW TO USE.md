# Tooly

A spanner you can talk to: ask Tooly, and the job gets sorted.

## The moves

| Move | Use it for |
|---|---|
| `idle` | Always: breathing and blinking |
| `appear` | Arriving: first launch, a sheet opening |
| `hello` | Onboarding, welcome back, sign-in |
| `think` | Loading, processing, AI at work |
| `celebrate` | Success, goal reached, streak, purchase |
| `oops` | Errors, no connection, something failed |
| `sleep` | Empty states, nothing yet, night, offline |
| `point` | Tips, tooltips, new features, look here |
| `love` | Thank you, ratings, upgrade, favourites |

Tap = a squish, on top of any move.

## In Xcode (iOS 17+, macOS 14+)

1. Drag `ios/Tooly.xcassets` and `ios/ToolyView.swift` into your project (tick your app target).
2. Use it:

```swift
ToolyView(move: .hello)
    .frame(width: 200, height: 200)

// switch moves as things happen
@State var move: ToolyMove = .idle
ToolyView(move: move) { finished in /* a one-shot ended, it's back to idle */ }
Button("Save") { move = .think; save { ok in move = ok ? .celebrate : .oops } }
```

## On the web

Copy `web/mascot.js` and the `web/tooly` folder to your site:

```html
<script type="module" src="/mascot.js"></script>
<mascot-view src="/tooly" state="idle" style="width:200px"></mascot-view>
<script type="module">
  document.querySelector("mascot-view").play("celebrate");
</script>
```

React / Next.js: put `mascot.js` and `tooly/` in `public/`, load the script once in the root layout (`<Script type="module" src="/mascot.js" strategy="afterInteractive" />` from next/script), copy `web/mascot-view.d.ts` into the project for TypeScript, then render `<mascot-view src="/tooly" state={move} />` in a client component. For one-shots, call `.play("celebrate")` on a ref.

Open `web/index.html` through a local server (`npx serve web`) to try every move.
