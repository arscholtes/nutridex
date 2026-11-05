import SwiftUI

/// One entry after another under your thumb: swipe sideways to the next thing you have unlocked of its
/// kind. Dex numbers stay as they are, with the gaps where the hidden ones sit.
struct EntryPager: View {
    let kind: EntryKind
    let slug: String
    @Environment(\.dexVisibility) private var visibility
    @Environment(DexNavigator.self) private var nav
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var current: String?

    private var cards: [EntryCard] { visibility.entries(of: kind) }

    private func neighbour(_ offset: Int) -> EntryCard? {
        guard let at = cards.firstIndex(where: { $0.slug == current }), cards.indices.contains(at + offset) else { return nil }
        return cards[at + offset]
    }

    private func go(_ offset: Int) {
        guard let card = neighbour(offset) else { return }
        withAnimation { current = card.slug }
    }

    var body: some View {
        let cards = cards
        let at = cards.firstIndex { $0.slug == current }
        DexScreen { pages(cards) }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if Theme.isHandheld, let at {
                    DexDeck(
                        prev: at > 0 ? cards[at - 1] : nil,
                        next: at < cards.count - 1 ? cards[at + 1] : nil,
                        number: cards[at].number,
                        onPrev: { go(-1) },
                        onNext: { go(1) },
                        onBack: { nav.backToList() }
                    )
                }
            }
            .overlay(alignment: .bottom) {
                if !Theme.isHandheld, let at, cards.count > 1 {
                    Text("\(at + 1) of \(cards.count)")
                        .font(.dex(.footnote, weight: .bold))
                        .monospacedDigit()
                        .foregroundStyle(Theme.ink)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        // Glass takes on what scrolls beneath it, and a dark tile would swallow the dark words.
                        .background(Theme.screen.opacity(0.75), in: Capsule())
                        .dexFloating(in: Capsule())
                        .padding(.bottom, 6)
                        .allowsHitTesting(false)
                        .accessibilityHidden(true)
                }
            }
            .overlay(alignment: .top) {
                if !Theme.isHandheld { statusFade }
            }
            .background { if !Theme.isHandheld { keyboardSteps } }
            .toolbar {
                if Theme.isHandheld, let at {
                    ToolbarItem(placement: .principal) { Text(cards[at].number).font(.dexNumber(.headline)).foregroundStyle(.white) }
                    ToolbarItem(placement: .topBarTrailing) {
                        Lens(color: Dex.bundled.palette.swatch(for: cards[at].type).background, size: 24).padding(6)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .sensoryFeedback(.selection, trigger: current)
            .accessibilityAction(named: "Next entry") { go(1) }
            .accessibilityAction(named: "Previous entry") { go(-1) }
            .onAppear { current = slug }
            .onChange(of: slug) { _, now in current = now }
            .onChange(of: current) { _, now in
                // The iPad's list follows along; a phone's back button still leads to where you came from.
                if sizeClass == .regular, nav.path.isEmpty, let now { nav.selection = .entry(kind, now) }
            }
    }

    private func pages(_ cards: [EntryCard]) -> some View {
        ScrollView(.horizontal) {
            LazyHStack(spacing: 0) {
                ForEach(cards) { card in
                    SwipingPage { EntryPage(kind: kind, slug: card.slug) }
                        .containerRelativeFrame(.horizontal)
                        .id(card.slug)
                }
            }
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.paging)
        .scrollPosition(id: $current)
        .scrollIndicators(.hidden)
    }

    /// The system's scroll edge effect cannot see a vertical scroll inside this sideways one.
    private var statusFade: some View {
        LinearGradient(
            stops: [.init(color: Theme.screen, location: 0), .init(color: Theme.screen, location: 0.5), .init(color: Theme.screen.opacity(0), location: 1)],
            startPoint: .top,
            endPoint: .bottom
        )
        .frame(height: 56)
        .ignoresSafeArea(edges: .top)
        .allowsHitTesting(false)
    }

    /// Command and an arrow step along, for an iPad with a keyboard.
    private var keyboardSteps: some View {
        Group {
            Button("Previous entry") { go(-1) }.keyboardShortcut(.leftArrow, modifiers: .command)
            Button("Next entry") { go(1) }.keyboardShortcut(.rightArrow, modifiers: .command)
        }
        .opacity(0)
        .accessibilityHidden(true)
    }
}

/// The Yellow version's previous and next entry either side of a D-pad, whose up arrow goes back to the list.
struct DexDeck: View {
    let prev: EntryCard?
    let next: EntryCard?
    let number: String
    let onPrev: () -> Void
    let onNext: () -> Void
    let onBack: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            stepLabel(prev, label: "Previous", end: "First entry", alignment: .trailing, action: onPrev)
            pad
            stepLabel(next, label: "Next", end: "Last entry", alignment: .leading, action: onNext)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity)
        .background {
            Theme.shell
                .overlay(alignment: .top) { Theme.shellDeep.frame(height: 4) }
                .ignoresSafeArea(edges: .bottom)
        }
    }

    private func stepLabel(_ step: EntryCard?, label: String, end: String, alignment: HorizontalAlignment, action: @escaping () -> Void) -> some View {
        Group {
            if let step {
                Button(action: action) {
                    VStack(alignment: alignment, spacing: 0) {
                        Text(step.number).font(.dexNumber(.caption))
                        Text(step.name).font(.dex(.subheadline, weight: .bold)).lineLimit(1)
                    }
                }
                .accessibilityLabel("\(label): \(step.name)")
            } else {
                Text(end).font(.dex(.caption, weight: .bold)).opacity(0.75)
            }
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity, alignment: alignment == .trailing ? .trailing : .leading)
    }

    private var pad: some View {
        Grid(horizontalSpacing: 0, verticalSpacing: 0) {
            GridRow {
                Color.clear.gridCellUnsizedAxes([.horizontal, .vertical])
                padKey("arrowtriangle.up.fill", enabled: true, shortcut: .upArrow, label: "Back to the list", action: onBack)
                Color.clear.gridCellUnsizedAxes([.horizontal, .vertical])
            }
            GridRow {
                padKey("arrowtriangle.left.fill", enabled: prev != nil, shortcut: .leftArrow, label: "Previous", action: onPrev)
                Theme.ink.frame(width: 24, height: 24)
                padKey("arrowtriangle.right.fill", enabled: next != nil, shortcut: .rightArrow, label: "Next", action: onNext)
            }
            GridRow {
                Color.clear.gridCellUnsizedAxes([.horizontal, .vertical])
                Image(systemName: "arrowtriangle.down.fill")
                    .font(.system(size: 9))
                    .foregroundStyle(.white.opacity(0.3))
                    .frame(width: 24, height: 24)
                    .background(Theme.ink)
                    .accessibilityHidden(true)
                Color.clear.gridCellUnsizedAxes([.horizontal, .vertical])
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 4))
    }

    private func padKey(_ symbol: String, enabled: Bool, shortcut: KeyEquivalent, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 9))
                .foregroundStyle(enabled ? .white : .white.opacity(0.3))
                .frame(width: 24, height: 24)
                .background(Theme.ink)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .keyboardShortcut(shortcut, modifiers: .command)
        .accessibilityLabel(label)
    }
}

/// A page that tells what it holds how far it has been swiped from rest.
struct SwipingPage<Content: View>: View {
    @ViewBuilder let content: Content
    @State private var phase: Double = 0

    var body: some View {
        content
            .environment(\.swipePhase, phase)
            .onGeometryChange(for: Double.self) { proxy in
                let width = proxy.size.width
                return width > 0 ? max(-1, min(1, proxy.frame(in: .scrollView(axis: .horizontal)).minX / width)) : 0
            } action: { phase = $0 }
    }
}

/// One entry in the pager.
struct EntryPage: View {
    let kind: EntryKind
    let slug: String

    var body: some View {
        switch kind {
        case .ingredient:
            if let entry = Dex.bundled.ingredients[slug] { IngredientEntryScreen(entry: entry) } else { MissingEntry() }
        case .compound:
            if let entry = Dex.bundled.compounds[slug] { CompoundEntryScreen(entry: entry) } else { MissingEntry() }
        case .effect:
            if let entry = Dex.bundled.effects[slug] { EffectEntryScreen(entry: entry) } else { MissingEntry() }
        }
    }
}

/// An entry's viewer and sections: side by side with room to spare, one column otherwise.
struct EntryLayout<Viewer: View, Sections: View>: View {
    @ViewBuilder let viewer: Viewer
    @ViewBuilder let sections: Sections

    private static var sideBySideFrom: CGFloat { 720 }

    var body: some View {
        GeometryReader { space in
            if space.size.width >= Self.sideBySideFrom {
                HStack(alignment: .top, spacing: 24) {
                    ScrollView { viewer.padding(.vertical, 16) }
                        .frame(width: 320)
                        .scrollBounceBehavior(.basedOnSize)
                    ScrollView {
                        VStack(alignment: .leading, spacing: 24) { sections }
                            .padding(.vertical, 16)
                            .padding(.bottom, 44)
                    }
                }
                .padding(.horizontal, 20)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        viewer
                        sections
                    }
                    .padding(16)
                    .padding(.bottom, 44)
                }
            }
        }
    }
}
