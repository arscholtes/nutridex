import SwiftUI

/// A compound class, food category or body system, ringed in its type colour.
struct TypeBadge: View {
    let type: String?

    var body: some View {
        if let type {
            Text(type.capitalized)
                .font(.dex(.caption, weight: .bold))
                .foregroundStyle(Theme.ink)
                .padding(.horizontal, 10)
                .padding(.vertical, 3)
                .background(Theme.card, in: Theme.control)
                .overlay(Theme.control.stroke(Dex.bundled.palette.swatch(for: type).background, lineWidth: 2))
        }
    }
}

/// A claim's evidence grade, in the plan's colours: A green, B blue, C amber, D gray.
struct GradeBadge: View {
    let grade: String

    private var colors: (background: Color, text: Color) {
        switch grade {
        case "A": (Color(hex: "#047857"), .white)
        case "B": (Color(hex: "#0369A1"), .white)
        case "C": (Color(hex: "#FCD34D"), Color(hex: "#1C1917"))
        default: (Color(hex: "#737373"), .white)
        }
    }

    private var meaning: String {
        switch grade {
        case "A": "Consistent human trials"
        case "B": "Some human evidence"
        case "C": "Mechanistic only"
        default: "Traditional or anecdotal"
        }
    }

    var body: some View {
        Text(grade)
            .font(.dex(.caption, weight: .heavy))
            .foregroundStyle(colors.text)
            .frame(minWidth: 22, minHeight: 22)
            .background(colors.background, in: Theme.skin.radius.control == nil ? AnyShape(Circle()) : AnyShape(RoundedRectangle(cornerRadius: 5)))
            .overlay {
                if Theme.isHandheld { RoundedRectangle(cornerRadius: 5).strokeBorder(Theme.ink, lineWidth: 1.5) }
            }
            .help("Evidence grade \(grade): \(meaning)")
            .accessibilityLabel("Evidence grade \(grade): \(meaning)")
    }
}

/// A stat bar. The amount beside it carries the value, so VoiceOver skips the bar.
struct Meter: View {
    let share: Double
    let style: AnyShapeStyle

    init(share: Double, color: Color) {
        self.share = share
        style = AnyShapeStyle(color)
    }

    init(share: Double, style: some ShapeStyle) {
        self.share = share
        self.style = AnyShapeStyle(style)
    }

    /// - Parameter share: from 0 to 1
    /// - Returns: how much to fill: none at exactly zero, a sliver for any amount, so none never looks like a little
    static func fill(share: Double) -> Double {
        share == 0 ? 0 : max(0.02, share)
    }

    private static let segment: CGFloat = 7
    private static let gap: CGFloat = 2.5

    /// - Parameters:
    ///   - share: from 0 to 1
    ///   - total: how many segments fit
    /// - Returns: how many of the handheld's segments to light, on the same terms
    static func litSegments(share: Double, total: Int) -> Int {
        share == 0 ? 0 : max(1, Int((share * Double(total)).rounded()))
    }

    var body: some View {
        Group {
            switch Theme.skin.meter {
            case .segments: segments
            case .pill: capsule(track: Theme.ink.opacity(0.09))
            case .thin: capsule(track: Theme.line)
            case .solid: solid
            }
        }
        .frame(height: height)
        .accessibilityHidden(true)
    }

    private var height: CGFloat {
        switch Theme.skin.meter {
        case .thin: 4
        case .solid: 12
        case .pill, .segments: 9
        }
    }

    private func capsule(track: Color) -> some View {
        GeometryReader { space in
            Capsule()
                .fill(track)
                .overlay(alignment: .leading) {
                    Capsule().fill(style).frame(width: space.size.width * Self.fill(share: share))
                }
        }
    }

    private var solid: some View {
        GeometryReader { space in
            Rectangle()
                .fill(style)
                .frame(width: space.size.width * Self.fill(share: share))
                .frame(maxWidth: .infinity, alignment: .leading)
                .overlay(Rectangle().strokeBorder(Theme.ink, lineWidth: 1.5))
        }
    }

    private var segments: some View {
        Canvas { context, size in
            let total = max(1, Int(size.width / (Self.segment + Self.gap)))
            let lit = Self.litSegments(share: share, total: total)
            for index in 0..<total {
                let rect = CGRect(x: CGFloat(index) * (Self.segment + Self.gap), y: 0, width: Self.segment, height: size.height)
                context.fill(Path(rect), with: index < lit ? .color(Theme.accent) : .color(Theme.ink.opacity(0.13)))
            }
        }
    }
}

/// An entry's creature, from the catalog the export script fills.
struct CreatureArt: View {
    let kind: EntryKind
    let slug: String
    var revealed = true
    /// True draws the creature with no tile behind it, to stand directly on a card.
    var cutout = false

    var body: some View {
        if !revealed {
            SilhouetteTile(assetName: "\(EntryKind.assetName(kind, slug))-silhouette")
        } else if cutout, Theme.skin.card != .type {
            // The silhouette asset is this creature without its tile, so in its own colours it is the cut-out.
            Image("\(EntryKind.assetName(kind, slug))-silhouette")
                .renderingMode(.original)
                .resizable()
                .scaledToFit()
                .dexCreatureLook()
                .accessibilityHidden(true)
        } else {
            Image(EntryKind.assetName(kind, slug))
                .resizable()
                .scaledToFit()
                .accessibilityHidden(true)
        }
    }
}

/// An effect has no creature yet, so it stands on its initial in its type colour.
struct EffectTile: View {
    let name: String
    let type: String?
    var revealed = true

    var body: some View {
        let swatch = Dex.bundled.palette.swatch(for: type)
        RoundedRectangle(cornerRadius: 18)
            .fill(revealed ? AnyShapeStyle(Theme.skin.card == .type ? Color.white.opacity(0.85) : .clear) : AnyShapeStyle(Theme.hidden))
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                Text(revealed ? String(name.prefix(1)) : "?")
                    .font(.system(size: 88, weight: Theme.skin.font.heading.font, design: Theme.skin.font.design.font))
                    .foregroundStyle(!revealed ? .black : swatch.textOnColor == "light" && !Theme.skin.dark ? swatch.background : Theme.skin.card == .type ? Color(hex: "#1C2823") : Theme.ink)
            }
            .accessibilityHidden(true)
    }
}

/// A link to another entry.
struct EntryLinkText: View {
    let route: DexRoute
    let title: String
    @Environment(\.dexVisibility) private var visibility

    var body: some View {
        if visibility.shows(route) {
            NavigationLink(value: route) {
                Text(title)
                    .font(.dex(.subheadline, weight: .bold))
                    .foregroundStyle(Theme.ink)
                    .underline(color: Theme.accent.opacity(0.55))
                    .multilineTextAlignment(.leading)
            }
            .buttonStyle(.plain)
        } else {
            // Not unlocked yet, so it has no page to go to.
            Text(title)
                .font(.dex(.subheadline, weight: .bold))
                .foregroundStyle(Theme.ink)
                .multilineTextAlignment(.leading)
        }
    }
}

/// A source's title and year, opening its page when it has one.
struct SourceLinkText: View {
    let source: SourceRef
    /// Set where it sits on something other than the page.
    var color = Theme.inkSoft

    private var text: String { source.year.map { "\(source.title) (\($0))" } ?? source.title }

    var body: some View {
        Group {
            if let address = source.url, let url = URL(string: address) {
                Link(destination: url) {
                    Text(text).underline(color: Theme.line)
                }
            } else {
                Text(text)
            }
        }
        .font(.dex(.caption))
        .foregroundStyle(color)
        .multilineTextAlignment(.leading)
    }
}

/// A section's heading.
struct SectionTitle: View {
    let title: String

    private var text: Text { Text(Theme.skin.heading(title)) }

    private var dashes: some View {
        Line().stroke(Theme.ink, style: StrokeStyle(lineWidth: 1, dash: [4, 3])).frame(height: 1)
    }

    var body: some View {
        Group {
            switch Theme.skin.title {
            case .banner:
                text
                    .font(.dex(.subheadline, weight: .heavy))
                    .foregroundStyle(Theme.onNight)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 3)
                    .background(Theme.accent, in: Theme.control)
            case .thick:
                VStack(alignment: .leading, spacing: 5) {
                    Rectangle().fill(Theme.ink).frame(height: 8)
                    text.font(.dex(.title3, weight: .heavy)).foregroundStyle(Theme.ink)
                }
            case .hair:
                VStack(alignment: .leading, spacing: 4) {
                    text.font(.dex(.title3, weight: .heavy)).italic().foregroundStyle(Theme.ink)
                    Rectangle().fill(Theme.line).frame(height: 1)
                }
            case .dashed:
                VStack(spacing: 4) {
                    dashes
                    text.font(.dex(.subheadline, weight: .heavy)).foregroundStyle(Theme.ink)
                    dashes
                }
            case .none:
                text
                    .font(.dex(Theme.skin.hero == .titleFirst ? .title : .title3, weight: .heavy))
                    .foregroundStyle(Theme.ink)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(title)
        .accessibilityAddTraits(.isHeader)
    }
}

/// A straight line across the space it has.
private struct Line: Shape {
    func path(in rect: CGRect) -> Path {
        Path { $0.move(to: CGPoint(x: rect.minX, y: rect.midY)); $0.addLine(to: CGPoint(x: rect.maxX, y: rect.midY)) }
    }
}

/// A titled section. With nothing to show it says why, rather than disappearing.
struct DexSection<Content: View>: View {
    let title: String
    let empty: String
    let isEmpty: Bool
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionTitle(title: title)
            if isEmpty {
                Note(text: empty)
            } else {
                content
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Small secondary text.
struct Note: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.dex(.footnote))
            .foregroundStyle(Theme.inkSoft)
            .fixedSize(horizontal: false, vertical: true)
    }
}

extension View {
    /// A panel on the page, in the skin's shape.
    @ViewBuilder func dexPanel() -> some View {
        let shape = RoundedRectangle(cornerRadius: Theme.skin.radius.panel)
        let panel = padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card, in: shape)
        if Theme.isHandheld {
            panel.overlay(shape.stroke(Theme.line, lineWidth: 2))
        } else {
            panel.dexOutline(shape).dexShadow(shape, soft: 0.07, radius: 10, y: 4)
        }
    }
}

/// The sources behind everything on a page.
struct SourcesSection: View {
    let sources: [SourceRef]

    var body: some View {
        DexSection(title: "Sources", empty: "Nothing on this page rests on a source yet.", isEmpty: sources.isEmpty) {
            VStack(alignment: .leading, spacing: 6) {
                ForEach(sources) { source in
                    SourceLinkText(source: source)
                }
            }
        }
    }
}

/// Lays its children out in rows, wrapping when a row is full.
struct FlowRow: Layout {
    var spacing: CGFloat = 6

    /// Layout hands back a row's own width rounded by a sliver, which must not wrap its last item.
    private static let tolerance: CGFloat = 0.5

    /// - Returns: where each item goes, and the total size
    static func arrange(sizes: [CGSize], spacing: CGFloat, maxWidth: CGFloat) -> (origins: [CGPoint], width: CGFloat, height: CGFloat) {
        var origins: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var widest: CGFloat = 0
        for size in sizes {
            if x > 0, x + size.width > maxWidth + tolerance {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            origins.append(CGPoint(x: x, y: y))
            x += size.width + spacing
            widest = max(widest, x - spacing)
            rowHeight = max(rowHeight, size.height)
        }
        return (origins, widest, y + rowHeight)
    }

    /// - Returns: how many rows these sizes take
    static func rowCount(sizes: [CGSize], spacing: CGFloat, maxWidth: CGFloat) -> Int {
        Set(arrange(sizes: sizes, spacing: spacing, maxWidth: maxWidth).origins.map(\.y)).count
    }

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = Self.arrange(sizes: subviews.map { $0.sizeThatFits(.unspecified) }, spacing: spacing, maxWidth: proposal.width ?? .infinity)
        return CGSize(width: rows.width, height: rows.height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let rows = Self.arrange(sizes: subviews.map { $0.sizeThatFits(.unspecified) }, spacing: spacing, maxWidth: proposal.width ?? bounds.width)
        for (index, origin) in rows.origins.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + origin.x, y: bounds.minY + origin.y), proposal: .unspecified)
        }
    }
}
