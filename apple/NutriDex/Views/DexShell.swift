import SwiftUI

/// The lens, which takes each entry's type colour.
struct Lens: View {
    let color: Color
    let size: CGFloat

    var body: some View {
        Circle()
            .fill(RadialGradient(colors: [color.mix(with: .white, by: 0.55), color, color.mix(with: .black, by: 0.45)], center: UnitPoint(x: 0.42, y: 0.38), startRadius: 0, endRadius: size * 0.62))
            .overlay(alignment: .topLeading) {
                Circle().fill(.white).frame(width: size * 0.18, height: size * 0.18).offset(x: size * 0.25, y: size * 0.2)
            }
            .frame(width: size, height: size)
            .overlay(Circle().stroke(.white, lineWidth: size * 0.07).padding(-size * 0.035))
            .overlay(Circle().stroke(Theme.shellDeep, lineWidth: size * 0.03).padding(-size * 0.085))
            .accessibilityHidden(true)
    }
}

/// The top plate's stepped lower edge.
struct PlateShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + rect.height * 0.62))
        path.addLine(to: CGPoint(x: rect.minX + rect.width * 0.68, y: rect.minY + rect.height * 0.62))
        path.addLine(to: CGPoint(x: rect.minX + rect.width * 0.61, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.closeSubpath()
        return path
    }
}

/// The device's top plate: lens, three lights and the name.
struct DexPlate: View {
    var lens: Color = Color(hex: "#38B6F2")
    var onSources: (() -> Void)?

    var body: some View {
        HStack(alignment: .top, spacing: 18) {
            Lens(color: lens, size: 58)
                .padding(.leading, 6)
                .padding(.top, 6)
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 7) {
                    ForEach(["#FF5A52", "#FFD23F", "#52D273"], id: \.self) { hex in
                        Circle()
                            .fill(Color(hex: hex))
                            .frame(width: 11, height: 11)
                            .overlay(Circle().stroke(Theme.shellDeep, lineWidth: 1.5))
                    }
                }
                .accessibilityHidden(true)
                Text("NutriDex")
                    .font(.dex(.title2, weight: .heavy))
                    .foregroundStyle(.white)
                    .accessibilityAddTraits(.isHeader)
            }
            Spacer(minLength: 0)
            if let onSources {
                Button("Sources", action: onSources)
                    .font(.dex(.subheadline, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.top, 2)
            }
        }
        .padding(.horizontal, 14)
        .padding(.bottom, 22)
        .background {
            ZStack {
                PlateShape().fill(Theme.shellDeep).offset(y: 4)
                PlateShape().fill(Theme.shell)
            }
            .ignoresSafeArea(edges: .top)
        }
    }
}

/// The light screen in its bezel, with the two small lights above it.
struct ScreenBezel<Content: View>: View {
    @ViewBuilder let content: Content

    private let frame = UnevenRoundedRectangle(topLeadingRadius: 14, bottomLeadingRadius: 40, bottomTrailingRadius: 14, topTrailingRadius: 14)
    private let glass = UnevenRoundedRectangle(topLeadingRadius: 8, bottomLeadingRadius: 34, bottomTrailingRadius: 8, topTrailingRadius: 8)

    var body: some View {
        VStack(spacing: 7) {
            HStack(spacing: 14) {
                Circle().fill(Theme.shell).frame(width: 7, height: 7)
                Circle().fill(Theme.shell).frame(width: 7, height: 7)
            }
            .accessibilityHidden(true)
            content
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Theme.screen)
                .clipShape(glass)
                .overlay(glass.stroke(Theme.ink, lineWidth: 2))
        }
        .padding(.top, 8)
        .padding([.horizontal, .bottom], 8)
        .background(Theme.bezel, in: frame)
        .background(frame.fill(Theme.shellDeep).offset(y: 4))
        .padding(.horizontal, 8)
        .padding(.top, 6)
        .padding(.bottom, 8)
    }
}

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

    var body: some View {
        ScreenBezel { content }
            .background(Theme.shellBody.ignoresSafeArea())
            .safeAreaInset(edge: .bottom, spacing: 0) { DexDeck(pager: pager, kind: kind) }
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

/// The panel an entry opens with: its number and art on its type colour, then its name.
struct EntryViewer<Art: View, Details: View>: View {
    let number: String
    let type: String?
    let name: String
    @ViewBuilder let art: Art
    @ViewBuilder let details: Details
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        let swatch = Dex.bundled.palette.swatch(for: type)
        VStack(alignment: .leading, spacing: 8) {
            VStack(alignment: .leading, spacing: 6) {
                Text(number)
                    .font(.dexNumber(.title3))
                    .foregroundStyle(swatch.foreground)
                art
                    // Small on a phone, so what the entry says starts on the first screen.
                    .frame(maxWidth: sizeClass == .regular ? 240 : 132)
                    .frame(maxWidth: .infinity)
            }
            .padding(12)
            .background(swatch.background, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.ink, lineWidth: 2))
            Text(name)
                .font(.dex(.largeTitle, weight: .heavy))
                .foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            details
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
