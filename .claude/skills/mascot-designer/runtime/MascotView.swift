//  __NAME__View.swift
//  Made with Mascot Designer. iOS 17+, macOS 14+, SwiftUI only. Drop it in, it just works.
//
//  __NAME__View(move: .hello)                       // idle appear hello think celebrate oops sleep point love
//  __NAME__View(move: .point, side: .left)          // point the other way
//  __NAME__View(move: move) { finished in … }        // a one-shot (appear, hello, celebrate) ended
//
//  Tap it and it squishes. Respects Reduce Motion (poses still change, nothing jumps).
//  The pictures live in __NAME__.xcassets under "__NAME__/<pose>". Same moves, to the
//  frame, as the web runtime (mascot.js).

import SwiftUI

public enum __NAME__Move: String, CaseIterable, Sendable {
    case idle, appear, hello, think, celebrate, oops, sleep, point, love
}

public enum __NAME__Side: Sendable { case left, right }

public struct __NAME__View: View {
    public var move: __NAME__Move
    public var side: __NAME__Side
    public var pokeable: Bool
    public var showsShadow: Bool
    public var onFinish: ((__NAME__Move) -> Void)?

    public init(move: __NAME__Move = .idle, side: __NAME__Side = .right, pokeable: Bool = true, showsShadow: Bool = __SHADOW__, onFinish: ((__NAME__Move) -> Void)? = nil) {
        self.move = move; self.side = side; self.pokeable = pokeable; self.showsShadow = showsShadow; self.onFinish = onFinish
    }

    @State private var engine = __NAME__Engine()
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public var body: some View {
        GeometryReader { geo in
            let B = min(geo.size.width, geo.size.height)
            TimelineView(.animation) { ctx in
                let now = ctx.date.timeIntervalSinceReferenceDate
                let f = engine.frame(now, reduced: reduceMotion)
                ZStack {
                    if showsShadow, let sw = __NAME__Meta.shadowWidth {
                        let lift = min(0.6, max(0, -f.ty) * 3)
                        Ellipse()
                            .fill(RadialGradient(colors: [Color(red: 0.08, green: 0.06, blue: 0.12).opacity(0.32), .clear], center: .center, startRadius: 0, endRadius: B * sw * 0.5))
                            .frame(width: B * sw * (1 - lift * 0.6) * abs(f.sx), height: B * 0.032)
                            .offset(x: f.tx * B, y: (__NAME__Meta.ground + 0.006 - 0.5) * B)
                            .opacity(f.opacity * (1 - lift))
                    }
                    ZStack {
                        ForEach(__NAME__Meta.poses, id: \.self) { pose in
                            Image("__NAME__/\(pose)")
                                .resizable()
                                .interpolation(.high)
                                .aspectRatio(contentMode: .fit)
                                .opacity(pose == f.pose ? f.poseMix : (pose == f.prev ? 1 - f.poseMix : 0))
                        }
                    }
                    .frame(width: B, height: B)
                    .scaleEffect(x: f.sx * f.flip, y: f.sy, anchor: UnitPoint(x: 0.5, y: __NAME__Meta.ground))
                    .rotationEffect(.degrees(f.rot), anchor: UnitPoint(x: 0.5, y: __NAME__Meta.ground))
                    .offset(x: f.tx * B, y: f.ty * B)
                    .opacity(f.opacity)

                    if !f.fx.isEmpty {
                        Canvas { g, size in
                            __NAME__FX.draw(f.fx, in: &g, box: B)
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
        .accessibilityLabel(Text(__NAME__Meta.name))
        .accessibilityAddTraits(.isImage)
    }
}

// MARK: - The engine (a pure function of time, like mascot.js)

struct __NAME__Frame {
    var sx = 1.0, sy = 1.0, rot = 0.0, tx = 0.0, ty = 0.0, opacity = 1.0
    var pose = "idle", prev: String? = nil, poseMix = 1.0, flip = 1.0
    var fx: [__NAME__FXItem] = []
}
struct __NAME__FXItem { var type: String; var t: Double; var alpha: Double; var loop: Bool }

final class __NAME__Engine {
    private var born: Double?
    private var name = "idle", start = 0.0
    private var side: __NAME__Side = .right
    private var from: __NAME__Frame?
    private var fromAt = 0.0
    private var fromPose: String?
    private var prevLoopFx: __NAME__FXItem?
    private var pokeAt = -1.0
    var onFinish: ((__NAME__Move) -> Void)?
    // several mascots on one screen don't blink in unison (the first one keeps the reference timing)
    private static var count = 0.0
    private let blinkShift: Double
    init(seed: Double? = nil) {
        let s = seed ?? { let c = __NAME__Engine.count; __NAME__Engine.count += 1; return c }()
        blinkShift = s > 0 ? __NAME__FX.rnd(s, 7) * __NAME__Motion.blinkEvery.reduce(0, +) : 0
    }

    private static func ease(_ e: Int, _ t: Double) -> Double {
        switch e {
        case 1: return t * t
        case 2: return 1 - (1 - t) * (1 - t)
        case 3: return 0.5 - 0.5 * cos(.pi * t)
        default: return t
        }
    }
    static func track(_ keys: [__NAME__Key]?, _ t: Double, _ fallback: Double) -> Double {
        guard let keys, let first = keys.first else { return fallback }
        if t <= first.t { return first.v }
        for i in 1..<keys.count where t <= keys[i].t {
            let a = keys[i - 1], b = keys[i], span = b.t - a.t
            if span <= 0 { return b.v }
            return a.v + (b.v - a.v) * ease(b.e, min(1, max(0, (t - a.t) / span)))
        }
        return keys[keys.count - 1].v
    }
    private func local(_ s: __NAME__State, _ T: Double) -> Double {
        guard let loop = s.loop, T >= s.duration else { return min(T, s.duration) }
        let span = s.duration - loop
        return loop + (T - loop).truncatingRemainder(dividingBy: span)
    }

    func set(_ newName: String, now: Double, side: __NAME__Side, first: Bool = false) {
        guard __NAME__Motion.states[newName] != nil else { return }
        if born == nil { born = now }
        let cur: __NAME__Frame? = first ? nil : frame(now, reduced: false)
        name = newName; start = now; self.side = side
        from = cur; fromAt = now; fromPose = cur?.pose
        prevLoopFx = cur?.fx.first(where: { $0.loop })
    }
    func poke(_ now: Double) { pokeAt = now }

    func frame(_ now: Double, reduced: Bool) -> __NAME__Frame {
        if born == nil { born = now }
        var def = __NAME__Motion.states[name]!
        while def.loop == nil, let next = def.next, now - start >= def.duration {
            let ended = name
            start += def.duration; name = next; from = nil; fromPose = nil; prevLoopFx = nil
            def = __NAME__Motion.states[name]!
            if let m = __NAME__Move(rawValue: ended), let cb = onFinish { DispatchQueue.main.async { cb(m) } }
        }
        let T = now - start
        let t = local(def, T)
        let tr = def.tracks
        var f = __NAME__Frame()
        f.sx = Self.track(tr["sx"], t, 1); f.sy = Self.track(tr["sy"], t, 1); f.rot = Self.track(tr["rot"], t, 0)
        f.tx = Self.track(tr["tx"], t, 0); f.ty = Self.track(tr["ty"], t, 0); f.opacity = Self.track(tr["opacity"], t, 1)
        if let from {
            let bw = min(1, max(0, (now - fromAt) / __NAME__Motion.blend))
            if bw < 1 {
                let w = Self.ease(2, bw)
                f.sx = from.sx + (f.sx - from.sx) * w; f.sy = from.sy + (f.sy - from.sy) * w
                f.rot = from.rot + (f.rot - from.rot) * w; f.tx = from.tx + (f.tx - from.tx) * w
                f.ty = from.ty + (f.ty - from.ty) * w; f.opacity = from.opacity + (f.opacity - from.opacity) * w
            }
        }
        var eyes = false
        let pt = now - pokeAt
        if pokeAt >= 0, pt >= 0, pt < __NAME__Motion.pokeDuration {
            f.sy *= Self.track(__NAME__Motion.pokeSy, pt, 1); f.sx *= Self.track(__NAME__Motion.pokeSx, pt, 1)
            eyes = pt >= __NAME__Motion.pokeEyes.0 && pt <= __NAME__Motion.pokeEyes.1
        }
        var i = 0
        let at = T < def.duration ? T : t
        for (k, fr) in def.frames.enumerated() where fr.0 <= at { i = k }
        var pose = def.frames[i].1
        let swapAt = def.frames[i].0
        var prev: String? = i > 0 ? def.frames[i - 1].1 : fromPose
        var mix = (T < def.duration || def.loop == nil) ? min(1, max(0, (T - swapAt) / __NAME__Motion.crossfade)) : 1
        if prev == nil || prev == pose { prev = nil; mix = 1 }
        if pose == "idle", mix == 1, eyes || (def.blink && blinking(now - (born ?? now))) { pose = "blink" }
        let flip: Double = (name == "point" && side == .left) ? -1 : 1
        f.tx *= flip
        if reduced {
            let o = f.opacity
            f = __NAME__Frame(); f.opacity = o
            if prev != nil { mix = min(1, max(0, (T - swapAt) / 0.25)) }
        }
        f.pose = pose; f.prev = prev; f.poseMix = mix; f.flip = flip
        if !reduced {
            for (a, type) in def.fx where T >= a && T - a < (__NAME__FX.life[type] ?? 0) {
                f.fx.append(.init(type: type, t: T - a, alpha: 1, loop: false))
            }
            if let lf = def.loopFx { f.fx.append(.init(type: lf, t: T, alpha: min(1, T / 0.3), loop: true)) }
            if let p = prevLoopFx, p.type != def.loopFx, T < 0.3 { f.fx.append(.init(type: p.type, t: p.t + T, alpha: 1 - T / 0.3, loop: true)) }
        }
        return f
    }
    private func blinking(_ g: Double) -> Bool {
        let every = __NAME__Motion.blinkEvery, cycle = every.reduce(0, +)
        let x = (g + blinkShift).truncatingRemainder(dividingBy: cycle)
        var acc = 0.0
        for d in every { acc += d; if x >= acc && x < acc + __NAME__Motion.blinkDuration { return true } }
        return false
    }
}

// MARK: - Effects (sparkles, confetti, thought bubble, Zzz, hearts)

enum __NAME__FX {
    static let life: [String: Double] = ["sparkle": 0.9, "confetti": 1.9, "dots": .infinity, "zzz": .infinity, "hearts": .infinity]
    static func rnd(_ i: Double, _ k: Double) -> Double { let x = sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - floor(x) }

    static func draw(_ items: [__NAME__FXItem], in g: inout GraphicsContext, box B: Double) {
        let A = __NAME__Meta.anchors
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
                    c.fill(star(P(x, y), r * (0.4 + 0.8 * s) * s * B), with: .color(__NAME__Meta.spark))
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
                    let col = __NAME__Meta.confetti[i % __NAME__Meta.confetti.count]
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
                    d.fill(Path(ellipseIn: CGRect(x: p.x - 0.015 * B, y: p.y - 0.015 * B, width: 0.03 * B, height: 0.03 * B)), with: .color(__NAME__Meta.ink))
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
                    z.draw(Text("z").font(.system(size: s, weight: .black, design: .rounded)).foregroundColor(__NAME__Meta.ink), at: .zero)
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
                    h.fill(heart(P(x, y), (0.03 + p * 0.03) * B), with: .color(__NAME__Meta.heart))
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

struct __NAME__Key { let t: Double; let v: Double; let e: Int }
struct __NAME__State {
    let duration: Double; let loop: Double?; let next: String?; let blink: Bool
    let frames: [(Double, String)]; let tracks: [String: [__NAME__Key]]; let fx: [(Double, String)]; let loopFx: String?
}

enum __NAME__Meta {
    static let name = "__DISPLAY__"
    static let poses = ["idle", "blink", "wave", "think", "celebrate", "oops", "sleep", "point", "love"]
    static let ground = __GROUND__
    static let shadowWidth: Double? = __SHADOWW__
    static let anchors = (cx: __CX__, top: __TOP__, left: __LEFT__, right: __RIGHT__)
    static let ink = __INK__
    static let spark = __SPARK__
    static let heart = Color(red: 1.0, green: 0.31, blue: 0.48)
    static let confetti: [Color] = __CONFETTI__
}

enum __NAME__Motion {
__MOTION__
}
