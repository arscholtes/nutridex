import SwiftUI

/// Previous and next entry either side of a D-pad, whose up arrow goes back to the list.
struct DexDeck: View {
    let pager: DexPager
    let kind: EntryKind
    @Environment(DexNavigator.self) private var nav

    private func route(_ step: DexStep) -> DexRoute { .entry(kind, step.slug) }

    var body: some View {
        HStack(spacing: 12) {
            stepLabel(pager.prev, label: "Previous", end: "First entry", alignment: .trailing)
            pad
            stepLabel(pager.next, label: "Next", end: "Last entry", alignment: .leading)
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

    private func stepLabel(_ step: DexStep?, label: String, end: String, alignment: HorizontalAlignment) -> some View {
        Group {
            if let step {
                Button { nav.step(to: route(step)) } label: {
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
                padKey("arrowtriangle.up.fill", enabled: true, shortcut: .upArrow, label: "Back to the list") { nav.backToList() }
                Color.clear.gridCellUnsizedAxes([.horizontal, .vertical])
            }
            GridRow {
                padKey("arrowtriangle.left.fill", enabled: pager.prev != nil, shortcut: .leftArrow, label: "Previous") {
                    if let prev = pager.prev { nav.step(to: route(prev)) }
                }
                Theme.ink.frame(width: 24, height: 24)
                padKey("arrowtriangle.right.fill", enabled: pager.next != nil, shortcut: .rightArrow, label: "Next") {
                    if let next = pager.next { nav.step(to: route(next)) }
                }
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
        .sensoryFeedback(.selection, trigger: pager.number)
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

/// What every entry screen shares: the bezel, the deck and a bar in the shell's colour.
struct EntryChrome<Content: View>: View {
    let kind: EntryKind
    let type: String?
    let pager: DexPager
    @ViewBuilder let content: Content
    @Environment(\.dexVisibility) private var visibility

    var body: some View {
        ScreenBezel { content }
            .background(Theme.shellBody.ignoresSafeArea())
            .safeAreaInset(edge: .bottom, spacing: 0) { DexDeck(pager: visibility.pager(pager, kind: kind), kind: kind) }
            .navigationTitle(pager.number)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Theme.shell, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Lens(color: Dex.bundled.palette.swatch(for: type).background, size: 24)
                        .padding(6)
                }
            }
    }
}

/// An entry's viewer and sections: side by side with room to spare, one column on a phone.
struct EntryLayout<Viewer: View, Sections: View>: View {
    @Environment(\.horizontalSizeClass) private var sizeClass
    @ViewBuilder let viewer: Viewer
    @ViewBuilder let sections: Sections

    var body: some View {
        if sizeClass == .regular {
            HStack(alignment: .top, spacing: 20) {
                ScrollView { viewer.padding(.vertical, 16) }
                    .frame(width: 280)
                    .scrollBounceBehavior(.basedOnSize)
                ScrollView {
                    VStack(alignment: .leading, spacing: 22) { sections }
                        .padding(.vertical, 16)
                }
            }
            .padding(.horizontal, 16)
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    viewer
                    sections
                }
                .padding(12)
            }
        }
    }
}
