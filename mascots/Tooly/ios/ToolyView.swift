//  ToolyView.swift
//  Made with Mascot Designer. iOS 17+, macOS 14+, SwiftUI only. Drop it in, it just works.
//
//  ToolyView(move: .hello)                       // idle appear hello think celebrate oops sleep point love
//  ToolyView(move: .point, side: .left)          // point the other way
//  ToolyView(move: move) { finished in … }        // a one-shot (appear, hello, celebrate) ended
//
//  Tap it and it squishes. Respects Reduce Motion (poses still change, nothing jumps).
//  The pictures live in Tooly.xcassets under "Tooly/<pose>". Same moves, to the
//  frame, as the web runtime (mascot.js).

import SwiftUI

public enum ToolyMove: String, CaseIterable, Sendable {
    case idle, appear, hello, think, celebrate, oops, sleep, point, love
}

public enum ToolySide: Sendable { case left, right }

public struct ToolyView: View {
    public var move: ToolyMove
    public var side: ToolySide
    public var pokeable: Bool
    public var showsShadow: Bool
    public var onFinish: ((ToolyMove) -> Void)?

    public init(move: ToolyMove = .idle, side: ToolySide = .right, pokeable: Bool = true, showsShadow: Bool = true, onFinish: ((ToolyMove) -> Void)? = nil) {
        self.move = move; self.side = side; self.pokeable = pokeable; self.showsShadow = showsShadow; self.onFinish = onFinish
    }

    @State private var engine = ToolyEngine()
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public var body: some View {
        GeometryReader { geo in
            let B = min(geo.size.width, geo.size.height)
            TimelineView(.animation) { ctx in
                let now = ctx.date.timeIntervalSinceReferenceDate
                let f = engine.frame(now, reduced: reduceMotion)
                ZStack {
                    if showsShadow, let sw = ToolyMeta.shadowWidth {
                        let lift = min(0.6, max(0, -f.ty) * 3)
                        Ellipse()
                            .fill(RadialGradient(colors: [Color(red: 0.08, green: 0.06, blue: 0.12).opacity(0.32), .clear], center: .center, startRadius: 0, endRadius: B * sw * 0.5))
                            .frame(width: B * sw * (1 - lift * 0.6) * abs(f.sx), height: B * 0.032)
                            .offset(x: f.tx * B, y: (ToolyMeta.ground + 0.006 - 0.5) * B)
                            .opacity(f.opacity * (1 - lift))
                    }
                    ZStack {
                        ForEach(ToolyMeta.poses, id: \.self) { pose in
                            Image("Tooly/\(pose)")
                                .resizable()
                                .interpolation(.high)
                                .aspectRatio(contentMode: .fit)
                                .opacity(pose == f.pose ? f.poseMix : (pose == f.prev ? 1 - f.poseMix : 0))
                        }
                    }
                    .frame(width: B, height: B)
                    .scaleEffect(x: f.sx * f.flip, y: f.sy, anchor: UnitPoint(x: 0.5, y: ToolyMeta.ground))
                    .rotationEffect(.degrees(f.rot), anchor: UnitPoint(x: 0.5, y: ToolyMeta.ground))
                    .offset(x: f.tx * B, y: f.ty * B)
                    .opacity(f.opacity)

                    if !f.fx.isEmpty {
                        Canvas { g, size in
                            ToolyFX.draw(f.fx, in: &g, box: B)
                        }
                        .frame(width: B * 2, height: B * 2)
                        .allowsHitTesting(false)
                    }
                }
                .frame(width: B, height: B)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .aspectRatio(1, contentMode: .fit)
        .contentShape(Rectangle())
        .onTapGesture { if pokeable { engine.poke(Date.timeIntervalSinceReferenceDate) } }
        .onAppear {
            engine.onFinish = { m in onFinish?(m) }
            engine.set(move.rawValue, now: Date.timeIntervalSinceReferenceDate, side: side, first: true)
        }
        .onChange(of: move) { _, new in engine.set(new.rawValue, now: Date.timeIntervalSinceReferenceDate, side: side) }
        .onChange(of: side) { _, new in engine.set(move.rawValue, now: Date.timeIntervalSinceReferenceDate, side: new) }
        .accessibilityElement()
        .accessibilityLabel(Text(ToolyMeta.name))
        .accessibilityAddTraits(.isImage)
    }
}

// MARK: - The engine (a pure function of time, like mascot.js)

struct ToolyFrame {
    var sx = 1.0, sy = 1.0, rot = 0.0, tx = 0.0, ty = 0.0, opacity = 1.0
    var pose = "idle", prev: String? = nil, poseMix = 1.0, flip = 1.0
    var fx: [ToolyFXItem] = []
}
struct ToolyFXItem { var type: String; var t: Double; var alpha: Double; var loop: Bool }

final class ToolyEngine {
    private var born: Double?
    private var name = "idle", start = 0.0
    private var side: ToolySide = .right
    private var from: ToolyFrame?
    private var fromAt = 0.0
    private var fromPose: String?
    private var prevLoopFx: ToolyFXItem?
    private var pokeAt = -1.0
    var onFinish: ((ToolyMove) -> Void)?
    // several mascots on one screen don't blink in unison (the first one keeps the reference timing)
    private static var count = 0.0
    private let blinkShift: Double
    init(seed: Double? = nil) {
        let s = seed ?? { let c = ToolyEngine.count; ToolyEngine.count += 1; return c }()
        blinkShift = s > 0 ? ToolyFX.rnd(s, 7) * ToolyMotion.blinkEvery.reduce(0, +) : 0
    }

    private static func ease(_ e: Int, _ t: Double) -> Double {
        switch e {
        case 1: return t * t
        case 2: return 1 - (1 - t) * (1 - t)
        case 3: return 0.5 - 0.5 * cos(.pi * t)
        default: return t
        }
    }
    static func track(_ keys: [ToolyKey]?, _ t: Double, _ fallback: Double) -> Double {
        guard let keys, let first = keys.first else { return fallback }
        if t <= first.t { return first.v }
        for i in 1..<keys.count where t <= keys[i].t {
            let a = keys[i - 1], b = keys[i], span = b.t - a.t
            if span <= 0 { return b.v }
            return a.v + (b.v - a.v) * ease(b.e, min(1, max(0, (t - a.t) / span)))
        }
        return keys[keys.count - 1].v
    }
    private func local(_ s: ToolyState, _ T: Double) -> Double {
        guard let loop = s.loop, T >= s.duration else { return min(T, s.duration) }
        let span = s.duration - loop
        return loop + (T - loop).truncatingRemainder(dividingBy: span)
    }

    func set(_ newName: String, now: Double, side: ToolySide, first: Bool = false) {
        guard ToolyMotion.states[newName] != nil else { return }
        if born == nil { born = now }
        let cur: ToolyFrame? = first ? nil : frame(now, reduced: false)
        name = newName; start = now; self.side = side
        from = cur; fromAt = now; fromPose = cur?.pose
        prevLoopFx = cur?.fx.first(where: { $0.loop })
    }
    func poke(_ now: Double) { pokeAt = now }

    func frame(_ now: Double, reduced: Bool) -> ToolyFrame {
        if born == nil { born = now }
        var def = ToolyMotion.states[name]!
        while def.loop == nil, let next = def.next, now - start >= def.duration {
            let ended = name
            start += def.duration; name = next; from = nil; fromPose = nil; prevLoopFx = nil
            def = ToolyMotion.states[name]!
            if let m = ToolyMove(rawValue: ended), let cb = onFinish { DispatchQueue.main.async { cb(m) } }
        }
        let T = now - start
        let t = local(def, T)
        let tr = def.tracks
        var f = ToolyFrame()
        f.sx = Self.track(tr["sx"], t, 1); f.sy = Self.track(tr["sy"], t, 1); f.rot = Self.track(tr["rot"], t, 0)
        f.tx = Self.track(tr["tx"], t, 0); f.ty = Self.track(tr["ty"], t, 0); f.opacity = Self.track(tr["opacity"], t, 1)
        if let from {
            let bw = min(1, max(0, (now - fromAt) / ToolyMotion.blend))
            if bw < 1 {
                let w = Self.ease(2, bw)
                f.sx = from.sx + (f.sx - from.sx) * w; f.sy = from.sy + (f.sy - from.sy) * w
                f.rot = from.rot + (f.rot - from.rot) * w; f.tx = from.tx + (f.tx - from.tx) * w
                f.ty = from.ty + (f.ty - from.ty) * w; f.opacity = from.opacity + (f.opacity - from.opacity) * w
            }
        }
        var eyes = false
        let pt = now - pokeAt
        if pokeAt >= 0, pt >= 0, pt < ToolyMotion.pokeDuration {
            f.sy *= Self.track(ToolyMotion.pokeSy, pt, 1); f.sx *= Self.track(ToolyMotion.pokeSx, pt, 1)
            eyes = pt >= ToolyMotion.pokeEyes.0 && pt <= ToolyMotion.pokeEyes.1
        }
        var i = 0
        let at = T < def.duration ? T : t
        for (k, fr) in def.frames.enumerated() where fr.0 <= at { i = k }
        var pose = def.frames[i].1
        let swapAt = def.frames[i].0
        var prev: String? = i > 0 ? def.frames[i - 1].1 : fromPose
        var mix = (T < def.duration || def.loop == nil) ? min(1, max(0, (T - swapAt) / ToolyMotion.crossfade)) : 1
        if prev == nil || prev == pose { prev = nil; mix = 1 }
        if pose == "idle", mix == 1, eyes || (def.blink && blinking(now - (born ?? now))) { pose = "blink" }
        let flip: Double = (name == "point" && side == .left) ? -1 : 1
        f.tx *= flip
        if reduced {
            let o = f.opacity
            f = ToolyFrame(); f.opacity = o
            if prev != nil { mix = min(1, max(0, (T - swapAt) / 0.25)) }
        }
        f.pose = pose; f.prev = prev; f.poseMix = mix; f.flip = flip
        if !reduced {
            for (a, type) in def.fx where T >= a && T - a < (ToolyFX.life[type] ?? 0) {
                f.fx.append(.init(type: type, t: T - a, alpha: 1, loop: false))
            }
            if let lf = def.loopFx { f.fx.append(.init(type: lf, t: T, alpha: min(1, T / 0.3), loop: true)) }
            if let p = prevLoopFx, p.type != def.loopFx, T < 0.3 { f.fx.append(.init(type: p.type, t: p.t + T, alpha: 1 - T / 0.3, loop: true)) }
        }
        return f
    }
    private func blinking(_ g: Double) -> Bool {
        let every = ToolyMotion.blinkEvery, cycle = every.reduce(0, +)
        let x = (g + blinkShift).truncatingRemainder(dividingBy: cycle)
        var acc = 0.0
        for d in every { acc += d; if x >= acc && x < acc + ToolyMotion.blinkDuration { return true } }
        return false
    }
}

// MARK: - Effects (sparkles, confetti, thought bubble, Zzz, hearts)

enum ToolyFX {
    static let life: [String: Double] = ["sparkle": 0.9, "confetti": 1.9, "dots": .infinity, "zzz": .infinity, "hearts": .infinity]
    static func rnd(_ i: Double, _ k: Double) -> Double { let x = sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - floor(x) }

    static func draw(_ items: [ToolyFXItem], in g: inout GraphicsContext, box B: Double) {
        let A = ToolyMeta.anchors
        // 1 unit = the mascot's box; the canvas is twice as big, centred.
        func P(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: (x + 0.5) * B, y: (y + 0.5) * B) }
        for e in items {
            var c = g
            c.opacity = e.alpha
            switch e.type {
            case "sparkle":
                let pts: [(Double, Double, Double, Double)] = [(A.left - 0.03, A.top + 0.06, 0.045, 0), (A.left + 0.05, A.top - 0.05, 0.034, 0.1), (A.left - 0.08, A.top + 0.2, 0.028, 0.2), (A.right + 0.03, A.top + 0.02, 0.03, 0.15)]
                for (x, y, r, d) in pts {
                    let k = min(1, max(0, (e.t - d) / 0.55))
                    if k <= 0 || k >= 1 { continue }
                    let s = sin(.pi * k)
                    c.fill(star(P(x, y), r * (0.4 + 0.8 * s) * s * B), with: .color(ToolyMeta.spark))
                }
            case "confetti":
                for i in 0..<30 {
                    let di = Double(i), t = e.t
                    let ang = -Double.pi / 2 + (rnd(di, 1) - 0.5) * 2.4
                    let sp = 0.75 + rnd(di, 2) * 0.75
                    let x = A.cx + cos(ang) * sp * t + sin(t * 6 + di) * 0.012
                    let y = A.top + 0.04 + sin(ang) * sp * t + 1.6 * t * t
                    var p = c
                    p.opacity = e.alpha * (t > 1.45 ? max(0, (1.9 - t) / 0.45) : 1)
                    p.translateBy(x: P(x, y).x, y: P(x, y).y)
                    p.rotate(by: .radians(t * (4 + rnd(di, 3) * 8) + di))
                    p.scaleBy(x: 1, y: cos(t * (6 + rnd(di, 4) * 6) + di))
                    let col = ToolyMeta.confetti[i % ToolyMeta.confetti.count]
                    if i % 3 == 0 { p.fill(Path(ellipseIn: CGRect(x: -0.011 * B, y: -0.011 * B, width: 0.022 * B, height: 0.022 * B)), with: .color(col)) }
                    else { p.fill(Path(CGRect(x: -0.009 * B, y: -0.016 * B, width: 0.018 * B, height: 0.032 * B)), with: .color(col)) }
                }
            case "dots":
                let bx = min(0.98 - 0.22, A.right - 0.08), by = max(0.0, A.top - 0.13)
                let pop = 1 - pow(1 - min(1, max(0, e.t / 0.25)), 2)
                let o = P(bx, by + 0.12)
                var b = c
                b.translateBy(x: o.x, y: o.y); b.scaleBy(x: pop, y: pop); b.translateBy(x: -o.x, y: -o.y)
                var sh = b
                sh.addFilter(.shadow(color: .black.opacity(0.14), radius: 0.015 * B, x: 0, y: 0.008 * B))
                sh.fill(Path(roundedRect: CGRect(origin: P(bx, by), size: CGSize(width: 0.22 * B, height: 0.11 * B)), cornerRadius: 0.055 * B), with: .color(.white))
                sh.fill(Path(ellipseIn: CGRect(x: P(bx + 0.03, by + 0.13).x - 0.017 * B, y: P(bx + 0.03, by + 0.13).y - 0.017 * B, width: 0.034 * B, height: 0.034 * B)), with: .color(.white))
                sh.fill(Path(ellipseIn: CGRect(x: P(bx + 0.005, by + 0.165).x - 0.009 * B, y: P(bx + 0.005, by + 0.165).y - 0.009 * B, width: 0.018 * B, height: 0.018 * B)), with: .color(.white))
                for i in 0..<3 {
                    let ph = ((e.t - Double(i) * 0.18).truncatingRemainder(dividingBy: 1.2) + 1.2).truncatingRemainder(dividingBy: 1.2)
                    let k = ph < 0.5 ? sin(ph / 0.5 * .pi) : 0
                    var d = b
                    d.opacity = e.alpha * (0.35 + 0.65 * k)
                    let p = P(bx + 0.058 + Double(i) * 0.052, by + 0.055 - k * 0.014)
                    d.fill(Path(ellipseIn: CGRect(x: p.x - 0.015 * B, y: p.y - 0.015 * B, width: 0.03 * B, height: 0.03 * B)), with: .color(ToolyMeta.ink))
                }
            case "zzz":
                let life = 2.1
                for k in 0..<3 {
                    let start = Double(k) * 0.7
                    if e.t - start < 0 { continue }
                    let u = (e.t - start).truncatingRemainder(dividingBy: life) / life
                    let a = u < 0.12 ? u / 0.12 : (u > 0.65 ? (1 - u) / 0.35 : 1)
                    let x = A.right - 0.05 + u * 0.1 + sin(u * 5) * 0.014, y = A.top + 0.06 - u * 0.22
                    let s = (0.065 + u * 0.05) * B
                    var z = c
                    z.opacity = e.alpha * a
                    z.translateBy(x: P(x, y).x, y: P(x, y).y); z.rotate(by: .radians(-0.15))
                    z.draw(Text("z").font(.system(size: s, weight: .black, design: .rounded)).foregroundColor(ToolyMeta.ink), at: .zero)
                }
            case "hearts":
                let life = 1.6
                for k in 0..<2 {
                    let start = Double(k) * 0.8
                    if e.t - start < 0 { continue }
                    let p = (e.t - start).truncatingRemainder(dividingBy: life) / life
                    let sideK: Double = k % 2 == 1 ? 1 : -1
                    let x = A.cx + sideK * 0.17 + sin(p * 6) * 0.015, y = A.top + 0.12 - p * 0.2
                    var h = c
                    h.opacity = e.alpha * (p < 0.15 ? p / 0.15 : (p > 0.6 ? (1 - p) / 0.4 : 1))
                    h.fill(heart(P(x, y), (0.03 + p * 0.03) * B), with: .color(ToolyMeta.heart))
                }
            default: break
            }
        }
    }
    static func star(_ c: CGPoint, _ r: Double) -> Path {
        var p = Path()
        for i in 0..<8 {
            let a = Double(i) * .pi / 4 - .pi / 2, rr = i % 2 == 1 ? r * 0.28 : r
            let pt = CGPoint(x: c.x + cos(a) * rr, y: c.y + sin(a) * rr)
            if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
        }
        p.closeSubpath(); return p
    }
    static func heart(_ c: CGPoint, _ s: Double) -> Path {
        var p = Path(); let x = c.x, y = c.y
        p.move(to: CGPoint(x: x, y: y + s * 0.35))
        p.addCurve(to: CGPoint(x: x - s * 0.5, y: y - s * 0.18), control1: CGPoint(x: x - s * 0.1, y: y + s * 0.25), control2: CGPoint(x: x - s * 0.5, y: y + s * 0.05))
        p.addCurve(to: CGPoint(x: x, y: y - s * 0.28), control1: CGPoint(x: x - s * 0.5, y: y - s * 0.45), control2: CGPoint(x: x - s * 0.15, y: y - s * 0.52))
        p.addCurve(to: CGPoint(x: x + s * 0.5, y: y - s * 0.18), control1: CGPoint(x: x + s * 0.15, y: y - s * 0.52), control2: CGPoint(x: x + s * 0.5, y: y - s * 0.45))
        p.addCurve(to: CGPoint(x: x, y: y + s * 0.35), control1: CGPoint(x: x + s * 0.5, y: y + s * 0.05), control2: CGPoint(x: x + s * 0.1, y: y + s * 0.25))
        p.closeSubpath(); return p
    }
}

// MARK: - This mascot's numbers (written by Mascot Designer)

struct ToolyKey { let t: Double; let v: Double; let e: Int }
struct ToolyState {
    let duration: Double; let loop: Double?; let next: String?; let blink: Bool
    let frames: [(Double, String)]; let tracks: [String: [ToolyKey]]; let fx: [(Double, String)]; let loopFx: String?
}

enum ToolyMeta {
    static let name = "Tooly"
    static let poses = ["idle", "blink", "wave", "think", "celebrate", "oops", "sleep", "point", "love"]
    static let ground = 0.94
    static let shadowWidth: Double? = 0.259
    static let anchors = (cx: 0.5036, top: 0.3008, left: 0.3389, right: 0.6709)
    static let ink = Color(red: 0.106, green: 0.137, blue: 0.216)
    static let spark = Color(red: 1.000, green: 0.788, blue: 0.235)
    static let heart = Color(red: 1.0, green: 0.31, blue: 0.48)
    static let confetti: [Color] = [Color(red: 0.180, green: 0.337, blue: 0.737), Color(red: 1.000, green: 0.788, blue: 0.235), Color(red: 0.298, green: 0.788, blue: 0.941), Color(red: 0.482, green: 0.847, blue: 0.561), Color(red: 1.000, green: 0.310, blue: 0.482), Color(red: 1.000, green: 1.000, blue: 1.000)]
}

enum ToolyMotion {
    static let blend = 0.2
    static let crossfade = 0.09
    static let blinkDuration = 0.13
    static let blinkEvery: [Double] = [3.1, 2.4, 0.32, 4.2, 2.9, 3.6, 0.3, 2.2, 4.8]
    static let pokeDuration = 0.55
    static let pokeEyes = (0.03, 0.22)
    static let pokeSy: [ToolyKey] = [.init(t: 0.0, v: 1.0, e: 0), .init(t: 0.07, v: 0.86, e: 2), .init(t: 0.2, v: 1.07, e: 2), .init(t: 0.32, v: 0.97, e: 3), .init(t: 0.44, v: 1.01, e: 3), .init(t: 0.55, v: 1.0, e: 3)]
    static let pokeSx: [ToolyKey] = [.init(t: 0.0, v: 1.0, e: 0), .init(t: 0.07, v: 1.12, e: 2), .init(t: 0.2, v: 0.95, e: 2), .init(t: 0.32, v: 1.02, e: 3), .init(t: 0.44, v: 0.995, e: 3), .init(t: 0.55, v: 1.0, e: 3)]
    static let states: [String: ToolyState] = [
        "idle": ToolyState(duration: 3.6, loop: 0.0, next: nil, blink: true,
            frames: [(0.0, "idle")],
            tracks: [
            "sy": [.init(t: 0.0, v: 1.0, e: 0), .init(t: 1.8, v: 1.016, e: 3), .init(t: 3.6, v: 1.0, e: 3)],
            "sx": [.init(t: 0.0, v: 1.0, e: 0), .init(t: 1.8, v: 0.992, e: 3), .init(t: 3.6, v: 1.0, e: 3)],
            "rot": [.init(t: 0.0, v: 0.0, e: 0), .init(t: 0.9, v: 0.6, e: 3), .init(t: 2.7, v: -0.6, e: 3), .init(t: 3.6, v: 0.0, e: 3)]
            ],
            fx: [], loopFx: nil),
        "appear": ToolyState(duration: 0.9, loop: nil, next: "idle", blink: true,
            frames: [(0.0, "idle")],
            tracks: [
            "opacity": [.init(t: 0.0, v: 0.0, e: 0), .init(t: 0.1, v: 1.0, e: 2)],
            "sy": [.init(t: 0.0, v: 0.2, e: 0), .init(t: 0.3, v: 1.15, e: 2), .init(t: 0.48, v: 0.92, e: 3), .init(t: 0.64, v: 1.04, e: 3), .init(t: 0.8, v: 1.0, e: 3)],
            "sx": [.init(t: 0.0, v: 0.2, e: 0), .init(t: 0.3, v: 0.95, e: 2), .init(t: 0.48, v: 1.08, e: 3), .init(t: 0.64, v: 0.98, e: 3), .init(t: 0.8, v: 1.0, e: 3)],
            "ty": [.init(t: 0.0, v: 0.0, e: 0), .init(t: 0.3, v: -0.05, e: 2), .init(t: 0.48, v: 0.0, e: 1)]
            ],
            fx: [(0.28, "sparkle")], loopFx: nil),
        "hello": ToolyState(duration: 2.0, loop: nil, next: "idle", blink: true,
            frames: [(0.0, "idle"), (0.14, "wave"), (1.62, "idle")],
            tracks: [
            "sy": [.init(t: 0.0, v: 1.0, e: 0), .init(t: 0.14, v: 0.92, e: 2), .init(t: 0.3, v: 1.06, e: 2), .init(t: 0.46, v: 0.99, e: 3), .init(t: 0.6, v: 1.0, e: 3), .init(t: 1.5, v: 1.0, e: 0), .init(t: 1.62, v: 0.95, e: 1), .init(t: 1.78, v: 1.02, e: 2), .init(t: 1.95, v: 1.0, e: 3)],
            "sx": [.init(t: 0.0, v: 1.0, e: 0), .init(t: 0.14, v: 1.06, e: 2), .init(t: 0.3, v: 0.96, e: 2), .init(t: 0.46, v: 1.01, e: 3), .init(t: 0.6, v: 1.0, e: 3), .init(t: 1.5, v: 1.0, e: 0), .init(t: 1.62, v: 1.04, e: 1), .init(t: 1.78, v: 0.99, e: 2), .init(t: 1.95, v: 1.0, e: 3)],
            "rot": [.init(t: 0.0, v: 0.0, e: 0), .init(t: 0.3, v: -3.0, e: 2), .init(t: 0.55, v: 3.5, e: 3), .init(t: 0.8, v: -3.0, e: 3), .init(t: 1.05, v: 3.0, e: 3), .init(t: 1.3, v: -1.5, e: 3), .init(t: 1.55, v: 0.0, e: 3)],
            "ty": [.init(t: 0.0, v: 0.0, e: 0), .init(t: 0.14, v: 0.0, e: 0), .init(t: 0.3, v: -0.03, e: 2), .init(t: 0.48, v: 0.0, e: 1)]
            ],
            fx: [(0.34, "sparkle")], loopFx: nil),
        "think": ToolyState(duration: 2.4, loop: 0.0, next: nil, blink: false,
            frames: [(0.0, "think")],
            tracks: [
            "ty": [.init(t: 0.0, v: 0.0, e: 0), .init(t: 1.2, v: -0.018, e: 3), .init(t: 2.4, v: 0.0, e: 3)],
            "rot": [.init(t: 0.0, v: -1.5, e: 0), .init(t: 1.2, v: 1.5, e: 3), .init(t: 2.4, v: -1.5, e: 3)],
            "sy": [.init(t: 0.0, v: 1.0, e: 0), .init(t: 1.2, v: 1.01, e: 3), .init(t: 2.4, v: 1.0, e: 3)]
            ],
            fx: [], loopFx: "dots"),
        "celebrate": ToolyState(duration: 2.2, loop: nil, next: "idle", blink: true,
            frames: [(0.0, "idle"), (0.2, "celebrate"), (1.95, "idle")],
            tracks: [
            "sy": [.init(t: 0.0, v: 1.0, e: 0), .init(t: 0.2, v: 0.84, e: 2), .init(t: 0.36, v: 1.12, e: 2), .init(t: 0.56, v: 1.02, e: 3), .init(t: 0.74, v: 1.06, e: 1), .init(t: 0.82, v: 0.86, e: 2), .init(t: 0.96, v: 1.05, e: 2), .init(t: 1.1, v: 0.98, e: 3), .init(t: 1.24, v: 1.0, e: 3), .init(t: 1.85, v: 1.0, e: 0), .init(t: 1.95, v: 0.96, e: 1), .init(t: 2.1, v: 1.0, e: 2)],
            "sx": [.init(t: 0.0, v: 1.0, e: 0), .init(t: 0.2, v: 1.12, e: 2), .init(t: 0.36, v: 0.92, e: 2), .init(t: 0.56, v: 0.99, e: 3), .init(t: 0.74, v: 0.96, e: 1), .init(t: 0.82, v: 1.13, e: 2), .init(t: 0.96, v: 0.97, e: 2), .init(t: 1.1, v: 1.01, e: 3), .init(t: 1.24, v: 1.0, e: 3), .init(t: 1.85, v: 1.0, e: 0), .init(t: 1.95, v: 1.03, e: 1), .init(t: 2.1, v: 1.0, e: 2)],
            "ty": [.init(t: 0.0, v: 0.0, e: 0), .init(t: 0.2, v: 0.0, e: 0), .init(t: 0.5, v: -0.2, e: 2), .init(t: 0.56, v: -0.205, e: 0), .init(t: 0.8, v: 0.0, e: 1), .init(t: 1.0, v: -0.035, e: 2), .init(t: 1.12, v: 0.0, e: 1)],
            "rot": [.init(t: 0.0, v: 0.0, e: 0), .init(t: 0.5, v: -4.0, e: 2), .init(t: 0.8, v: 0.0, e: 1), .init(t: 1.0, v: 3.0, e: 2), .init(t: 1.12, v: 0.0, e: 1)]
            ],
            fx: [(0.42, "confetti")], loopFx: nil),
        "oops": ToolyState(duration: 2.6, loop: 0.8, next: nil, blink: false,
            frames: [(0.0, "idle"), (0.08, "oops")],
            tracks: [
            "sy": [.init(t: 0.0, v: 1.0, e: 0), .init(t: 0.08, v: 0.9, e: 2), .init(t: 0.22, v: 1.03, e: 2), .init(t: 0.34, v: 0.97, e: 3), .init(t: 0.8, v: 0.97, e: 0), .init(t: 1.7, v: 0.985, e: 3), .init(t: 2.6, v: 0.97, e: 3)],
            "sx": [.init(t: 0.0, v: 1.0, e: 0), .init(t: 0.08, v: 1.07, e: 2), .init(t: 0.22, v: 0.98, e: 2), .init(t: 0.34, v: 1.01, e: 3), .init(t: 0.8, v: 1.01, e: 0), .init(t: 1.7, v: 1.003, e: 3), .init(t: 2.6, v: 1.01, e: 3)],
            "tx": [.init(t: 0.0, v: 0.0, e: 0), .init(t: 0.1, v: 0.03, e: 2), .init(t: 0.2, v: -0.024, e: 3), .init(t: 0.3, v: 0.018, e: 3), .init(t: 0.4, v: -0.012, e: 3), .init(t: 0.5, v: 0.006, e: 3), .init(t: 0.6, v: 0.0, e: 3)],
            "rot": [.init(t: 0.0, v: 0.0, e: 0), .init(t: 0.1, v: 2.5, e: 2), .init(t: 0.2, v: -2.0, e: 3), .init(t: 0.3, v: 1.5, e: 3), .init(t: 0.4, v: -1.0, e: 3), .init(t: 0.5, v: 0.0, e: 3), .init(t: 0.8, v: 0.0, e: 0), .init(t: 1.7, v: -1.2, e: 3), .init(t: 2.6, v: 0.0, e: 3)]
            ],
            fx: [], loopFx: nil),
        "sleep": ToolyState(duration: 4.4, loop: 0.0, next: nil, blink: false,
            frames: [(0.0, "sleep")],
            tracks: [
            "sy": [.init(t: 0.0, v: 1.0, e: 0), .init(t: 2.2, v: 1.03, e: 3), .init(t: 4.4, v: 1.0, e: 3)],
            "sx": [.init(t: 0.0, v: 1.0, e: 0), .init(t: 2.2, v: 1.012, e: 3), .init(t: 4.4, v: 1.0, e: 3)],
            "rot": [.init(t: 0.0, v: 0.0, e: 0), .init(t: 2.2, v: 0.8, e: 3), .init(t: 4.4, v: 0.0, e: 3)]
            ],
            fx: [], loopFx: "zzz"),
        "point": ToolyState(duration: 2.4, loop: 0.5, next: nil, blink: false,
            frames: [(0.0, "point")],
            tracks: [
            "sy": [.init(t: 0.0, v: 1.0, e: 0), .init(t: 0.1, v: 0.95, e: 2), .init(t: 0.28, v: 1.03, e: 2), .init(t: 0.45, v: 1.0, e: 3)],
            "sx": [.init(t: 0.0, v: 1.0, e: 0), .init(t: 0.1, v: 1.04, e: 2), .init(t: 0.28, v: 0.98, e: 2), .init(t: 0.45, v: 1.0, e: 3)],
            "tx": [.init(t: 0.0, v: 0.0, e: 0), .init(t: 0.5, v: 0.0, e: 0), .init(t: 0.75, v: 0.02, e: 2), .init(t: 1.0, v: 0.0, e: 3), .init(t: 1.2, v: 0.012, e: 2), .init(t: 1.4, v: 0.0, e: 3), .init(t: 2.4, v: 0.0, e: 0)],
            "rot": [.init(t: 0.0, v: 0.0, e: 0), .init(t: 0.28, v: 2.0, e: 2), .init(t: 0.5, v: 0.0, e: 3), .init(t: 0.75, v: 2.5, e: 2), .init(t: 1.0, v: 0.0, e: 3), .init(t: 2.4, v: 0.0, e: 0)]
            ],
            fx: [], loopFx: nil),
        "love": ToolyState(duration: 2.4, loop: 0.0, next: nil, blink: false,
            frames: [(0.0, "love")],
            tracks: [
            "sy": [.init(t: 0.0, v: 1.0, e: 0), .init(t: 0.12, v: 1.035, e: 2), .init(t: 0.26, v: 0.995, e: 3), .init(t: 0.4, v: 1.025, e: 2), .init(t: 0.6, v: 1.0, e: 3), .init(t: 2.4, v: 1.0, e: 0)],
            "sx": [.init(t: 0.0, v: 1.0, e: 0), .init(t: 0.12, v: 1.02, e: 2), .init(t: 0.26, v: 1.0, e: 3), .init(t: 0.4, v: 1.015, e: 2), .init(t: 0.6, v: 1.0, e: 3), .init(t: 2.4, v: 1.0, e: 0)],
            "rot": [.init(t: 0.0, v: -1.0, e: 0), .init(t: 1.2, v: 1.0, e: 3), .init(t: 2.4, v: -1.0, e: 3)]
            ],
            fx: [], loopFx: "hearts")
    ]
}
