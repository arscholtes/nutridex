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
                .background(.white, in: Capsule())
                .overlay(Capsule().stroke(Dex.bundled.palette.swatch(for: type).background, lineWidth: 2))
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
        case "C": (Color(hex: "#FCD34D"), Theme.ink)
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
            .frame(minWidth: 20, minHeight: 20)
            .background(colors.background, in: RoundedRectangle(cornerRadius: 5))
            .overlay(RoundedRectangle(cornerRadius: 5).stroke(Theme.ink, lineWidth: 1.5))
            .accessibilityLabel("Evidence grade \(grade): \(meaning)")
    }
}

/// A segmented stat bar. The amount beside it carries the value, so VoiceOver skips the bar.
struct Meter: View {
    let share: Double
    let color: Color

    private static let segment: CGFloat = 7
    private static let gap: CGFloat = 2.5

    /// - Parameters:
    ///   - share: from 0 to 1
    ///   - total: how many segments fit
    /// - Returns: how many to light: none at exactly zero, at least one for any amount, so none never looks like a little
    static func litSegments(share: Double, total: Int) -> Int {
        share == 0 ? 0 : max(1, Int((share * Double(total)).rounded()))
    }

    var body: some View {
        Canvas { context, size in
            let total = max(1, Int(size.width / (Self.segment + Self.gap)))
            let lit = Self.litSegments(share: share, total: total)
            for index in 0..<total {
                let rect = CGRect(x: CGFloat(index) * (Self.segment + Self.gap), y: 0, width: Self.segment, height: size.height)
                context.fill(Path(rect), with: .color(index < lit ? color : Theme.ink.opacity(0.13)))
            }
        }
        .frame(height: 9)
        .accessibilityHidden(true)
    }
}

/// An entry's creature, from the catalog the export script fills.
struct CreatureArt: View {
    let kind: EntryKind
    let slug: String

    var body: some View {
        Image(EntryKind.assetName(kind, slug))
            .resizable()
            .scaledToFit()
            .accessibilityHidden(true)
    }
}

/// An effect has no creature yet, so it stands on its initial in its type colour.
struct EffectTile: View {
    let name: String
    let type: String?

    var body: some View {
        let swatch = Dex.bundled.palette.swatch(for: type)
        RoundedRectangle(cornerRadius: 18)
            .fill(.white.opacity(0.85))
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                Text(String(name.prefix(1)))
                    .font(.system(size: 64, weight: .heavy, design: .rounded))
                    .foregroundStyle(swatch.textOnColor == "light" ? swatch.background : Theme.ink)
            }
            .accessibilityHidden(true)
    }
}

/// A link to another entry.
struct EntryLinkText: View {
    let route: DexRoute
    let title: String

    var body: some View {
        NavigationLink(value: route) {
            Text(title)
                .font(.dex(.subheadline, weight: .bold))
                .foregroundStyle(Theme.ink)
                .underline(color: Theme.shell.opacity(0.55))
                .multilineTextAlignment(.leading)
        }
        .buttonStyle(.plain)
    }
}

/// A source's title and year, opening its page when it has one.
struct SourceLinkText: View {
    let source: SourceRef

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
        .foregroundStyle(Theme.inkSoft)
        .multilineTextAlignment(.leading)
    }
}

/// A section's heading, as a tab on the screen.
struct SectionTitle: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.dex(.subheadline, weight: .heavy))
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 3)
            .background(Theme.shell, in: Capsule())
            .accessibilityAddTraits(.isHeader)
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
    /// A bordered panel on the screen.
    func dexPanel() -> some View {
        padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.line, lineWidth: 2))
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
