// FEEL · Feel.swift
// How the app moves, in one file: the tokens, and the moves the system doesn't already give you.
// iOS 17+ (the zoom page transition needs iOS 18 and falls back quietly). No packages.
//
//   Feel.tone = .lively                                   // once, at launch (crisp is the default)
//   Button("Add to cart") { … }.buttonStyle(FeelPress(haptic: true))
//   CardView().feelPressable { open(card) }                // a card or row that opens something
//   content.feelToast($toast)                              // toast host, at the root
//   panel.feelDragToDismiss { showPanel = false }          // your own bottom panel
//   .feelZoomSource(id: item.id, in: ns) / .feelZoomDestination(id: item.id, in: ns)
//
// System sheets (.sheet), navigation pushes and menus already move and drag correctly: FEEL tunes
// them (detents, grabber, haptics) instead of rebuilding them. See references/swiftui.md.
import SwiftUI

public enum FeelTone: Sendable { case crisp, soft, lively }

public enum Feel {
    /// crisp: tools, money, work. soft: calm, reading, wellness. lively: consumer, social, games.
    /// Set it once at launch, before the first view appears.
    nonisolated(unsafe) public static var tone: FeelTone = .crisp

    /// How far a pressed thing sinks.
    public static var pressScale: CGFloat {
        switch tone { case .crisp: 0.97; case .soft: 0.98; case .lively: 0.95 }
    }
    /// Going down under the finger: quick, no bounce.
    public static var down: Animation {
        switch tone { case .crisp: .snappy(duration: 0.12); case .soft: .smooth(duration: 0.16); case .lively: .snappy(duration: 0.12) }
    }
    /// Coming back up.
    public static var release: Animation {
        switch tone { case .crisp: .snappy(duration: 0.3); case .soft: .smooth(duration: 0.4); case .lively: .bouncy(duration: 0.4, extraBounce: 0.05) }
    }
    /// Menus, popovers, things that grow out of where they belong.
    public static var pop: Animation {
        switch tone { case .crisp: .snappy(duration: 0.3); case .soft: .smooth(duration: 0.4); case .lively: .bouncy(duration: 0.35) }
    }
    /// Panels anchored to an edge: never bounce past it.
    public static var panel: Animation {
        switch tone { case .crisp: .smooth(duration: 0.3); case .soft: .smooth(duration: 0.4); case .lively: .smooth(duration: 0.35) }
    }
    /// Toasts and banners.
    public static var toast: Animation {
        switch tone { case .crisp: .snappy(duration: 0.35); case .soft: .smooth(duration: 0.45); case .lively: .bouncy(duration: 0.45, extraBounce: 0.05) }
    }
    /// Content swapping in place (tabs, steps, filters): a crossfade.
    public static var swap: Animation {
        switch tone { case .crisp: .easeOut(duration: 0.18); case .soft: .easeOut(duration: 0.24); case .lively: .easeOut(duration: 0.2) }
    }
    /// What any of the above becomes when Reduce Motion is on: a short fade, no travel, no bounce.
    public static let reduced: Animation = .easeOut(duration: 0.15)
}

// MARK: - Press

/// A button that sinks under the finger the moment it lands and springs back on release.
/// `size: .large` for cards and rows (they sink half as far). `haptic: true` for the few
/// buttons that commit something (buy, send, save), never for every tap.
public struct FeelPress: ButtonStyle {
    public enum Size: Sendable { case regular, large }
    var size: Size
    var haptic: Bool
    public init(size: Size = .regular, haptic: Bool = false) { self.size = size; self.haptic = haptic }

    public func makeBody(configuration: Configuration) -> some View {
        Pressed(configuration: configuration, size: size, haptic: haptic)
    }

    private struct Pressed: View {
        let configuration: ButtonStyleConfiguration
        let size: Size
        let haptic: Bool
        @Environment(\.accessibilityReduceMotion) private var reduce
        @Environment(\.isEnabled) private var enabled

        var body: some View {
            let pressed = configuration.isPressed && enabled
            let depth = size == .large ? 1 - (1 - Feel.pressScale) / 2 : Feel.pressScale
            configuration.label
                .contentShape(Rectangle())
                .scaleEffect(pressed && !reduce ? depth : 1)
                .opacity(pressed && reduce ? 0.7 : 1)
                .animation(pressed ? (reduce ? Feel.reduced : Feel.down) : (reduce ? Feel.reduced : Feel.release), value: pressed)
                .sensoryFeedback(.impact(weight: .light, intensity: 0.7), trigger: configuration.isPressed) { _, now in haptic && now }
        }
    }
}

public extension View {
    /// Any view (a card, a row, an image) as a real button: pressed state, VoiceOver "button", one action.
    func feelPressable(size: FeelPress.Size = .large, haptic: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) { self }.buttonStyle(FeelPress(size: size, haptic: haptic))
    }
}

// MARK: - Drag

/// Your own panel (a bottom card, a mini player, a banner) follows the finger 1:1, resists the
/// wrong way like iOS does, and on release either springs back or is thrown away with the
/// finger's speed. For system sheets, use .sheet: it already does this.
public struct FeelDragToDismiss: ViewModifier {
    public enum Edge: Sendable { case bottom, top, leading, trailing }
    var edge: Edge
    var distance: CGFloat
    var speed: CGFloat
    var onDismiss: () -> Void
    @State private var offset: CGFloat = 0
    @State private var length: CGFloat = 300
    @Environment(\.accessibilityReduceMotion) private var reduce

    public init(edge: Edge = .bottom, distance: CGFloat = 0.3, speed: CGFloat = 700, onDismiss: @escaping () -> Void) {
        self.edge = edge; self.distance = distance; self.speed = speed; self.onDismiss = onDismiss
    }

    private var vertical: Bool { edge == .bottom || edge == .top }
    /// +1 when dismissing means moving down/right.
    private var sign: CGFloat { edge == .bottom || edge == .trailing ? 1 : -1 }

    /// iOS's rubber band: the further past, the harder it pulls back.
    private func rubber(_ x: CGFloat) -> CGFloat {
        let s: CGFloat = x < 0 ? -1 : 1
        return s * (1 - 1 / (abs(x) * 0.55 / max(length, 1) + 1)) * length
    }
    private var shown: CGFloat { offset * sign >= 0 ? offset : rubber(offset) }
    /// SwiftUI springs take speed as a share of the distance left to travel, per second.
    private func relative(_ velocity: CGFloat, to target: CGFloat) -> Double {
        let left = target - offset
        guard abs(left) > 1 else { return 0 }
        return Double(max(-30, min(30, velocity / left)))
    }

    public func body(content: Content) -> some View {
        content
            .background(GeometryReader { g in
                Color.clear
                    .onAppear { length = vertical ? g.size.height : g.size.width }
                    .onChange(of: g.size) { _, s in length = vertical ? s.height : s.width }
            })
            .offset(x: vertical ? 0 : shown, y: vertical ? shown : 0)
            .gesture(
                DragGesture(minimumDistance: 6)
                    .onChanged { v in
                        var t = Transaction(); t.disablesAnimations = true
                        withTransaction(t) { offset = vertical ? v.translation.height : v.translation.width }
                    }
                    .onEnded { v in
                        let velocity = vertical ? v.velocity.height : v.velocity.width   // points per second
                        let away = offset * sign > length * distance && velocity * sign > -100
                        let flung = velocity * sign > speed
                        if away || flung {
                            let target = sign * (length + 60)
                            let anim: Animation = reduce ? Feel.reduced : .interpolatingSpring(duration: 0.3, bounce: 0, initialVelocity: relative(velocity, to: target))
                            withAnimation(anim) { offset = target } completion: { onDismiss() } // remove the view here; it stays where it was thrown
                        } else {
                            let anim: Animation = reduce ? Feel.reduced : .interpolatingSpring(duration: 0.35, bounce: Feel.tone == .lively ? 0.15 : 0, initialVelocity: relative(velocity, to: 0))
                            withAnimation(anim) { offset = 0 }
                        }
                    }
            )
    }
}

public extension View {
    func feelDragToDismiss(edge: FeelDragToDismiss.Edge = .bottom, onDismiss: @escaping () -> Void) -> some View {
        modifier(FeelDragToDismiss(edge: edge, onDismiss: onDismiss))
    }
}

// MARK: - Toast

public struct FeelToastMessage: Identifiable, Equatable, Sendable {
    public enum Kind: Sendable { case info, success, error }
    public let id = UUID()
    public var text: String
    public var kind: Kind
    /// Seconds on screen. Default: 4 s, plus a second for every 15 words past ten.
    public var seconds: Double?
    public init(_ text: String, kind: Kind = .info, seconds: Double? = nil) { self.text = text; self.kind = kind; self.seconds = seconds }
    var duration: Double {
        if let seconds { return seconds }
        let words = text.split(separator: " ").count
        return 4 + max(0, Double(words - 10)) / 15
    }
}

/// A toast host: put it once on the root view. Set the binding to show one; it comes from the
/// bottom edge, is announced to VoiceOver, stays long enough to read, can be swiped away, and
/// leaves on its own. A new toast replaces the one on screen.
public struct FeelToastHost: ViewModifier {
    @Binding var message: FeelToastMessage?
    @Environment(\.accessibilityReduceMotion) private var reduce

    public func body(content: Content) -> some View {
        content.overlay(alignment: .bottom) {
            ZStack {
                if let m = message {
                    Text(m.text)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                        .padding(.horizontal, 18).padding(.vertical, 14)
                        .background(.regularMaterial, in: Capsule())
                        .shadow(color: .black.opacity(0.12), radius: 16, y: 6)
                        .padding(.horizontal, 16).padding(.bottom, 12)
                        .feelDragToDismiss(edge: .bottom) { message = nil }
                        .id(m.id)
                        .transition(reduce ? .opacity : .move(edge: .bottom).combined(with: .opacity))
                        .task(id: m.id) {
                            AccessibilityNotification.Announcement(m.text).post()
                            try? await Task.sleep(for: .seconds(m.duration))
                            if message?.id == m.id { message = nil }
                        }
                }
            }
            .animation(reduce ? Feel.reduced : Feel.toast, value: message)
            .sensoryFeedback(trigger: message) { _, new in
                switch new?.kind { case .success?: .success; case .error?: .error; default: nil }
            }
        }
    }
}

public extension View {
    func feelToast(_ message: Binding<FeelToastMessage?>) -> some View { modifier(FeelToastHost(message: message)) }
}

// MARK: - Page change

public extension View {
    /// The card or image a detail page grows out of (iOS 18+; earlier iOS keeps the normal push).
    @ViewBuilder func feelZoomSource<ID: Hashable>(id: ID, in namespace: Namespace.ID) -> some View {
        #if os(iOS)
        if #available(iOS 18, *) { self.matchedTransitionSource(id: id, in: namespace) } else { self }
        #else
        self
        #endif
    }
    /// The detail page that grows out of its source (iOS 18+).
    @ViewBuilder func feelZoomDestination<ID: Hashable>(id: ID, in namespace: Namespace.ID) -> some View {
        #if os(iOS)
        if #available(iOS 18, *) { self.navigationTransition(.zoom(sourceID: id, in: namespace)) } else { self }
        #else
        self
        #endif
    }
    /// Content that swaps in place (tabs, steps): a crossfade keyed on what changed.
    func feelSwap<V: Equatable>(on value: V) -> some View { modifier(FeelSwap(value: value)) }
}

struct FeelSwap<V: Equatable>: ViewModifier {
    let value: V
    @Environment(\.accessibilityReduceMotion) private var reduce
    func body(content: Content) -> some View {
        content.id(AnyHashable(String(describing: value))).transition(.opacity).animation(reduce ? Feel.reduced : Feel.swap, value: value)
    }
}
