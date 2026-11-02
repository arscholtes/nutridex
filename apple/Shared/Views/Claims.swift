import SwiftUI

/// What the EU's permitted claims mean, wherever they appear.
enum ClaimNotes {
    static let meaning = "These are the wordings EU law allows on food labels. They mean a nutrient contributes to that function at adequate intake, not that eating more improves it."
    static let foodBar = "A nutrient appears here when 100 g of this food supplies at least 15% of its reference value, the EU's bar for calling a food a source. A typical serving may be far less than 100 g. \(meaning)"
    static let effectBar = "A food is listed when 100 g supplies at least 15% of the nutrient's reference value, the EU's bar for calling a food a source."
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

/// What a food does: one line per effect, naming the nutrients behind it, with each claim's exact
/// wording and source a tap away.
struct FoodEffects: View {
    let claims: [EffectClaim]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            let groups = claims.groupedByEffect()
            ForEach(Array(groups.enumerated()), id: \.element.id) { index, group in
                if index > 0 { Divider() }
                line(group)
            }
        }
        .dexPanel()
    }

    private func line(_ group: EffectGroup) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            FlowRow {
                EntryLinkText(route: .entry(.effect, group.effect.slug), title: group.effect.name)
                if group.effect.direction != "benefit" {
                    Text(group.effect.direction.capitalized).font(.dex(.caption, weight: .bold)).foregroundStyle(Theme.inkSoft)
                }
                GradeBadge(grade: group.bestGrade)
            }
            FlowRow(spacing: 5) {
                Text("via").font(.dex(.footnote)).foregroundStyle(Theme.inkSoft)
                ForEach(Array(group.claims.enumerated()), id: \.offset) { _, claim in
                    EntryLinkText(route: .entry(.compound, claim.compound.slug), title: claim.compound.name)
                }
            }
            DisclosureGroup {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(group.claims.enumerated()), id: \.offset) { _, claim in
                        VStack(alignment: .leading, spacing: 3) {
                            if let summary = claim.summary {
                                Text(summary).font(.dex(.footnote)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                            }
                            ClaimFacts(doseContext: claim.doseContext, onset: claim.onset, isBar: claim.minFoodPer100g != nil)
                            SourceLinkText(source: claim.source)
                        }
                    }
                }
                .padding(.top, 4)
            } label: {
                Text("What the source says").font(.dex(.footnote)).foregroundStyle(Theme.inkSoft)
            }
            .tint(Theme.inkSoft)
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
                Text("By class: \(className ?? "")").font(.dex(.caption, weight: .bold)).foregroundStyle(Color(hex: "#78350F"))
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
                    EntryLinkText(route: .entry(.compound, tip.compound.slug), title: tip.compound.name)
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

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 8) {
                Text(kind.capitalized).font(.dex(.subheadline, weight: .bold)).foregroundStyle(Color(hex: "#881337"))
                if let grade { GradeBadge(grade: grade) }
            }
            Text(summary).font(.dex(.subheadline)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
            if let advice { Text(advice).font(.dex(.subheadline, weight: .medium)).foregroundStyle(Theme.ink) }
            if let source { SourceLinkText(source: source) }
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
