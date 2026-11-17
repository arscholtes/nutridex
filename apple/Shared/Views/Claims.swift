import SwiftUI

/// What the EU's permitted claims mean, wherever they appear.
enum ClaimNotes {
    static let meaning = "These are the wordings EU law allows on food labels. They mean a nutrient contributes to that function at adequate intake, not that eating more improves it."
    static let foodBar = "Percentages are of the EU's daily reference value for an adult, in 100 g of this food, and a typical serving may be far less. A bigger tile means more of the nutrient behind it, not that more is better. A nutrient appears here when 100 g supplies at least 15% of that value, the EU's bar for calling a food a source. \(meaning)"
    static let effectBar = "A food is listed when 100 g supplies at least 15% of the nutrient's reference value, the EU's bar for calling a food a source."
    /// The same words as the web's `NO_CLAIMS_ON_ALCOHOL`.
    static let noClaimsOnAlcohol = "EU law allows no claims on a drink over 1.2% alcohol, so none is shown."
}

/// A claim's dose and onset, where its source gives them.
private struct ClaimFacts: View {
    let doseContext: String?
    let onset: String?
    /// The context states what a food must supply, which is not a dose someone takes.
    let isBar: Bool

    var body: some View {
        if isBar {
            if let doseContext { Note(text: doseContext) }
        } else if doseContext != nil || onset != nil {
            VStack(alignment: .leading, spacing: 3) {
                if let doseContext { fact("Dose", doseContext) }
                if let onset { fact("Onset", onset) }
            }
        }
    }

    private func fact(_ label: String, _ value: String) -> some View {
        Text("\(Text("\(label)  ").foregroundStyle(Theme.inkSoft))\(Text(value).foregroundStyle(Theme.ink))")
            .font(.dex(.footnote))
    }
}

/// What compounds do, on a compound's or an effect's page. A source behind several claims is cited
/// once, under them, with any bar they share.
struct EffectList: View {
    enum Page { case compound, effect }

    let claims: [EffectClaim]
    let page: Page

    var body: some View {
        VStack(spacing: 10) {
            ForEach(claims.groupedBySource()) { group in
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(Array(group.claims.enumerated()), id: \.offset) { index, claim in
                        if index > 0 { Divider() }
                        row(claim, shared: group.sharedDoseContext != nil)
                    }
                    if let shared = group.sharedDoseContext {
                        Divider()
                        Note(text: shared)
                    }
                    SourceLinkText(source: group.source)
                }
                .dexPanel()
            }
        }
    }

    private func row(_ claim: EffectClaim, shared: Bool) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            FlowRow {
                if page == .effect {
                    EntryLinkText(route: .entry(.compound, claim.compound.slug), title: claim.compound.name)
                } else {
                    EntryLinkText(route: .entry(.effect, claim.effect.slug), title: claim.effect.name)
                    if claim.effect.direction != "benefit" {
                        Text(claim.effect.direction.capitalized).font(.dex(.caption, weight: .bold)).foregroundStyle(Theme.inkSoft)
                    }
                }
                GradeBadge(grade: claim.grade)
            }
            if let summary = claim.summary {
                Text(summary).font(.dex(.subheadline)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
            }
            ClaimFacts(doseContext: shared ? nil : claim.doseContext, onset: claim.onset, isBar: claim.minFoodPer100g != nil)
        }
    }
}

/// What a food does, as a grid: the more of your daily amount behind an effect, the bigger its tile
/// and the more it says. Its source's exact wording and citation are one tap away, on the effect's page.
struct EffectBento: View {
    let tiles: [BentoTile]
    @Environment(\.dexVisibility) private var visibility

    /// - Returns: a tile with only the nutrients that may be shown; none means the tile goes too
    private func shown(_ tile: BentoTile) -> [BentoCompound] {
        tile.compounds.filter { visibility.shows(.compound, $0.slug) }
    }

    var body: some View {
        BentoLayout {
            ForEach(tiles.filter { !shown($0).isEmpty }) { tile in
                BentoTileView(tile: tile, compounds: shown(tile))
                    .layoutValue(key: BentoSpan.self, value: BentoLayout.span(of: tile.size))
            }
        }
    }
}

/// How many columns and rows a tile takes.
struct BentoSpan: LayoutValueKey {
    static let defaultValue = BentoLayout.Span(columns: 1, rows: 1)
}

/// Lays tiles on a grid, filling any gap with the next tile that fits.
struct BentoLayout: Layout {
    struct Span: Equatable {
        let columns: Int
        let rows: Int
    }

    struct Cell: Equatable {
        let column: Int
        let row: Int
    }

    private static let shortestRow: CGFloat = 156

    var spacing: CGFloat = 12

    /// - Returns: how tall every row is: its usual height, or taller where a tile's words need it
    static func rowHeight(needed: [CGFloat], minimum: CGFloat) -> CGFloat {
        max(minimum, needed.max() ?? 0)
    }

    static func span(of size: String) -> Span {
        switch size {
        case "large": Span(columns: 2, rows: 2)
        case "wide": Span(columns: 2, rows: 1)
        default: Span(columns: 1, rows: 1)
        }
    }

    /// - Returns: how many columns fit a width
    static func columns(for width: CGFloat) -> Int {
        width >= 900 ? 6 : width >= 520 ? 4 : 2
    }

    /// - Returns: where each tile goes, and how many rows that takes
    static func place(_ spans: [Span], columns: Int) -> (cells: [Cell], rows: Int) {
        var taken = Set<[Int]>()
        var rows = 0
        let cells = spans.map { span -> Cell in
            var row = 0
            while true {
                for column in 0...max(0, columns - span.columns) {
                    let wanted = (row..<row + span.rows).flatMap { r in (column..<column + span.columns).map { [$0, r] } }
                    if wanted.allSatisfy({ !taken.contains($0) }) {
                        taken.formUnion(wanted)
                        rows = max(rows, row + span.rows)
                        return Cell(column: column, row: row)
                    }
                }
                row += 1
            }
        }
        return (cells, rows)
    }

    private func arrangement(_ subviews: Subviews, width: CGFloat) -> (cells: [Cell], rows: Int, cellWidth: CGFloat, rowHeight: CGFloat) {
        let columns = Self.columns(for: width)
        let placed = Self.place(subviews.map { $0[BentoSpan.self] }, columns: columns)
        let cellWidth = (width - spacing * CGFloat(columns - 1)) / CGFloat(columns)
        let needed = subviews.map { subview -> CGFloat in
            let span = subview[BentoSpan.self]
            let tileWidth = CGFloat(span.columns) * cellWidth + CGFloat(span.columns - 1) * spacing
            let height = subview.sizeThatFits(ProposedViewSize(width: tileWidth, height: nil)).height
            return (height - CGFloat(span.rows - 1) * spacing) / CGFloat(span.rows)
        }
        return (placed.cells, placed.rows, cellWidth, Self.rowHeight(needed: needed, minimum: Self.shortestRow))
    }

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 360
        let layout = arrangement(subviews, width: width)
        return CGSize(width: width, height: CGFloat(layout.rows) * layout.rowHeight + CGFloat(max(0, layout.rows - 1)) * spacing)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let layout = arrangement(subviews, width: bounds.width)
        for (index, subview) in subviews.enumerated() {
            let span = subview[BentoSpan.self]
            let cell = layout.cells[index]
            subview.place(
                at: CGPoint(x: bounds.minX + CGFloat(cell.column) * (layout.cellWidth + spacing), y: bounds.minY + CGFloat(cell.row) * (layout.rowHeight + spacing)),
                proposal: ProposedViewSize(
                    width: CGFloat(span.columns) * layout.cellWidth + CGFloat(span.columns - 1) * spacing,
                    height: CGFloat(span.rows) * layout.rowHeight + CGFloat(span.rows - 1) * spacing
                )
            )
        }
    }
}

/// One effect: the bigger the tile, the more it says.
struct BentoTileView: View {
    let tile: BentoTile
    let compounds: [BentoCompound]

    private var shape: RoundedRectangle { RoundedRectangle(cornerRadius: Theme.skin.radius.tile) }
    private var isLarge: Bool { tile.size == "large" }
    private var isWide: Bool { tile.size == "wide" }

    private func percent(_ share: Double) -> String { "\(Int((share * 100).rounded()))%" }

    var body: some View {
        NavigationLink(value: DexRoute.entry(.effect, tile.effect.slug)) {
            VStack(alignment: .leading, spacing: 6) {
                if isLarge {
                    large
                } else if isWide {
                    wide
                } else {
                    small
                }
            }
            .foregroundStyle(isLarge ? Theme.onTile : Theme.ink)
            .multilineTextAlignment(.leading)
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background {
                if isLarge {
                    shape.fill(Theme.tile)
                } else if Theme.skin.card == .wash {
                    shape.fill(Theme.card).overlay(shape.fill(Dex.bundled.palette.swatch(for: tile.effect.bodySystem).background.opacity(0.14)))
                } else {
                    shape.fill(Theme.card)
                }
            }
            .overlay {
                if Theme.skin.card == .glow { shape.strokeBorder(Theme.line, lineWidth: 1.5) }
            }
            .dexOutline(shape)
            .dexShadow(shape, soft: 0.1, radius: 10, y: 5)
            .contentShape(shape)
        }
        .buttonStyle(.plain)
    }

    private var name: some View {
        HStack(spacing: 6) {
            Text(tile.effect.name).font(.dex(.subheadline, weight: .bold)).fixedSize(horizontal: false, vertical: true)
            if tile.effect.direction != "benefit" {
                Text(tile.effect.direction.capitalized).font(.dex(.caption2, weight: .bold)).opacity(0.7)
            }
            GradeBadge(grade: tile.grade)
        }
    }

    /// The creatures behind a tile, the ones supplying more of your daily amount drawn larger.
    private func creatures(most: Int) -> some View {
        HStack(alignment: .bottom, spacing: 4) {
            ForEach(compounds.prefix(most)) { compound in
                let size: CGFloat = (compound.dailyShare ?? 0) >= 1 ? 52 : (compound.dailyShare ?? 0) >= 0.4 ? 42 : 32
                // Shrinks in a narrow tile, rather than pushing it over its neighbour.
                CreatureArt(kind: .compound, slug: compound.slug, cutout: true).frame(maxWidth: size, maxHeight: size)
            }
            if compounds.count > most {
                Text("+\(compounds.count - most)").font(.dex(.caption, weight: .bold)).opacity(0.7).padding(.bottom, 3)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(compounds.map(\.name).joined(separator: ", "))
    }

    private var small: some View {
        Group {
            creatures(most: 3)
            Spacer(minLength: 0)
            if let share = tile.topShare {
                Text(percent(share)).font(.dexNumber(.title3))
            }
            name
        }
    }

    private var wide: some View {
        Group {
            HStack(alignment: .top) {
                if let share = tile.topShare {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(percent(share)).font(.dex(.largeTitle, weight: .heavy)).monospacedDigit().fixedSize()
                        Text("of your daily \(compounds[0].name) in 100 g").font(.dex(.caption)).opacity(0.8).fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 6)
                }
                creatures(most: 4)
            }
            if let dose = tile.dose {
                Text("Studied at: \(dose)").font(.dex(.caption)).opacity(0.8).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
            name
        }
    }

    private var large: some View {
        Group {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(percent(tile.topShare ?? 0))
                        .font(.system(size: 60, weight: Theme.skin.font.heading.font, design: Theme.skin.font.design.font))
                        .monospacedDigit()
                        .foregroundStyle(Theme.skin.stage == .foil ? Theme.progressFill : AnyShapeStyle(Theme.onTile))
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)
                    Text("of your daily \(compounds[0].name) in 100 g").font(.dex(.footnote)).opacity(0.9).fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 4)
                CreatureArt(kind: .compound, slug: compounds[0].slug, cutout: true)
                    .frame(width: 104, height: 104)
                    .accessibilityHidden(true)
            }
            if compounds.count > 1 {
                HStack(alignment: .bottom, spacing: 4) {
                    ForEach(compounds.dropFirst().prefix(5)) { compound in
                        CreatureArt(kind: .compound, slug: compound.slug, cutout: true).frame(width: 40, height: 40)
                    }
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(compounds.dropFirst().map(\.name).joined(separator: ", "))
            }
            Spacer(minLength: 0)
            name
            if let wording = tile.wording {
                Text(wording).font(.dex(.footnote)).opacity(0.9).lineLimit(4)
            }
        }
    }
}

/// Frames a claim by its basis: a by-class claim is dashed and striped and says which class it rests
/// on; a measured one is solid. Both say so in words, so the difference never rests on colour alone.
struct BasisFrame<Content: View>: View {
    let basis: String
    let className: String?
    @ViewBuilder let content: Content

    var body: some View {
        if basis == "by-class" {
            VStack(alignment: .leading, spacing: 6) {
                content
                Text("By class: \(className ?? "")").font(.dex(.caption, weight: .bold)).foregroundStyle(Color(hex: Theme.skin.dark ? "#FCD34D" : "#78350F"))
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                Canvas { context, size in
                    var x: CGFloat = -size.height
                    while x < size.width {
                        var band = Path()
                        band.move(to: CGPoint(x: x, y: size.height))
                        band.addLine(to: CGPoint(x: x + size.height, y: 0))
                        context.stroke(band, with: .color(Color(hex: "#D97706").opacity(0.14)), lineWidth: 7)
                        x += 20
                    }
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "#D97706"), style: StrokeStyle(lineWidth: 2, dash: [6, 4])))
        } else {
            VStack(alignment: .leading, spacing: 6) {
                content
                Text("Measured").font(.dex(.caption, weight: .bold)).foregroundStyle(Theme.inkSoft)
            }
            .dexPanel()
        }
    }
}

/// An engine absorption flag on a food: what happens to one compound, and what would help.
struct AbsorptionTipCard: View {
    let tip: AbsorptionTip
    /// False where the compound's entry is closed to this viewer.
    var linked = true

    private var status: (label: String, background: Color, text: Color) {
        switch tip.flag.status {
        case "enhanced": ("Enhanced", Color(hex: "#D1FAE5"), Color(hex: "#064E3B"))
        case "missed": ("Missed", Color(hex: "#FDE68A"), Color(hex: "#451A03"))
        case "reduced": ("Reduced", Color(hex: "#FFE4E6"), Color(hex: "#881337"))
        default: ("Unknown", Color(hex: "#E5E5E5"), Color(hex: "#262626"))
        }
    }

    var body: some View {
        BasisFrame(basis: tip.flag.basis, className: tip.className) {
            VStack(alignment: .leading, spacing: 5) {
                FlowRow {
                    Text(status.label)
                        .font(.dex(.caption, weight: .bold))
                        .foregroundStyle(status.text)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 2)
                        .background(status.background, in: RoundedRectangle(cornerRadius: 5))
                    if linked {
                        EntryLinkText(route: .entry(.compound, tip.compound.slug), title: tip.compound.name)
                    } else {
                        Text(tip.compound.name).font(.dex(.subheadline, weight: .bold)).foregroundStyle(Theme.ink)
                    }
                    GradeBadge(grade: tip.flag.grade)
                }
                Text("\(tip.flag.reason).").font(.dex(.subheadline)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                if let suggestion = tip.flag.suggestion {
                    Text("\(suggestion).").font(.dex(.subheadline, weight: .bold)).foregroundStyle(Theme.ink)
                }
                ForEach(tip.sources) { SourceLinkText(source: $0) }
            }
        }
    }
}

/// An absorption rule on a compound: what helps or hinders it, how much, and why.
struct ModifierCard: View {
    let claim: ModifierClaim
    @Environment(\.dexVisibility) private var visibility

    var body: some View {
        BasisFrame(basis: claim.basis, className: claim.className) {
            VStack(alignment: .leading, spacing: 5) {
                FlowRow {
                    Text(claim.direction == "enhances" ? "Helped by" : "Hindered by").font(.dex(.subheadline)).foregroundStyle(Theme.inkSoft)
                    if let compound = claim.modifierCompound {
                        if visibility.shows(.compound, compound.slug) {
                            EntryLinkText(route: .entry(.compound, compound.slug), title: compound.name)
                        } else {
                            Text("another compound").font(.dex(.subheadline, weight: .bold)).foregroundStyle(Theme.ink)
                        }
                    } else if let condition = claim.condition {
                        Text(condition).font(.dex(.subheadline, weight: .bold)).foregroundStyle(Theme.ink)
                    }
                    GradeBadge(grade: claim.grade)
                }
                if let magnitude = claim.magnitude {
                    Text("\(magnitude).").font(.dex(.subheadline)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                }
                if let mechanism = claim.mechanism { Note(text: "\(mechanism).") }
                SourceLinkText(source: claim.source)
            }
        }
    }
}

/// How one prep method changes one compound.
struct PrepCard: View {
    let claim: PrepClaim
    let showsCompound: Bool

    private var change: String {
        if let factor = claim.retentionFactor { return "keeps \(Int((factor * 100).rounded()))%" }
        return claim.direction ?? "changes by an amount no source gives"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            FlowRow(spacing: 5) {
                Text("\(claim.method.capitalized):").font(.dex(.subheadline, weight: .bold)).foregroundStyle(Theme.ink)
                if showsCompound {
                    EntryLinkText(route: .entry(.compound, claim.compound.slug), title: claim.compound.name)
                }
                Text(change).font(.dex(.subheadline)).foregroundStyle(Theme.ink)
            }
            if let note = claim.note { Note(text: "\(note).") }
            SourceLinkText(source: claim.source)
        }
        .dexPanel()
    }
}

/// One caution: rose, so it reads as a warning before it is read.
struct CautionCard: View {
    let kind: String
    let summary: String
    let grade: String?
    var advice: String?
    var source: SourceRef?

    /// The card stays rose in every skin, so what is on it stays dark.
    private let onRose = Color(hex: "#1C1917")

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 8) {
                Text(kind.capitalized).font(.dex(.subheadline, weight: .bold)).foregroundStyle(Color(hex: "#881337"))
                if let grade { GradeBadge(grade: grade) }
            }
            Text(summary).font(.dex(.subheadline)).foregroundStyle(onRose).fixedSize(horizontal: false, vertical: true)
            if let advice { Text(advice).font(.dex(.subheadline, weight: .medium)).foregroundStyle(onRose) }
            if let source { SourceLinkText(source: source, color: onRose) }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: "#FFF1F2"), in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "#FB7185"), lineWidth: 2))
    }
}

/// A food's row in a ranked list: its art, name, amount and stat bar.
struct FoodRow: View {
    let food: FoodAmount
    let color: Color
    var rank: Int?

    var body: some View {
        HStack(spacing: 10) {
            if let rank {
                Text("\(rank)").font(.dex(.footnote, weight: .medium)).monospacedDigit().foregroundStyle(Theme.inkSoft).frame(minWidth: 18, alignment: .trailing)
            }
            CreatureArt(kind: .ingredient, slug: food.slug).frame(width: 44, height: 44)
            VStack(alignment: .leading, spacing: 5) {
                HStack(alignment: .firstTextBaseline) {
                    EntryLinkText(route: .entry(.ingredient, food.slug), title: food.name)
                    Spacer(minLength: 8)
                    Text(amount).font(.dex(.footnote, weight: .medium)).monospacedDigit().foregroundStyle(Theme.ink)
                }
                Meter(share: food.share, color: color)
            }
        }
        .dexPanel()
    }

    private var amount: String {
        let per100g = formatAmount(food.amount, unit: food.unit)
        guard let serving = food.perServing else { return per100g }
        return "\(per100g), \(formatAmount(serving, unit: food.unit)) per serving"
    }
}
