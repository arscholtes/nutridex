import SwiftUI

/// A food's badges and line of context, under its name.
struct IngredientDetails: View {
    let entry: IngredientEntry

    var body: some View {
        HStack(spacing: 8) {
            TypeBadge(type: entry.ingredient.category)
            if let grade = entry.bestGrade { GradeBadge(grade: grade) }
        }
        Note(text: "\(entry.measured) compounds measured per 100 g, from USDA FoodData Central")
    }
}

/// What a food does, what is in it, how it absorbs, what prep does, and why we think so.
struct IngredientSections: View {
    let entry: IngredientEntry
    var panelColumns = 1
    @Environment(\.dexVisibility) private var visibility

    private var compounds: [CompoundAmount] { entry.compounds.filter { visibility.shows(.compound, $0.slug) } }
    private var absentNone: [Named] { entry.absent.none.filter { visibility.shows(.compound, $0.slug) } }
    private var absentUnmeasured: [Named] { entry.absent.unmeasured.filter { visibility.shows(.compound, $0.slug) } }
    private var absorption: [AbsorptionTip] { entry.absorption.filter { visibility.shows(.compound, $0.compound.slug) } }
    private var prep: [PrepClaim] { entry.prep.filter { visibility.shows(.compound, $0.compound.slug) } }

    private func richestNote(_ compound: CompoundAmount) -> String {
        guard let richest = visibility.richest(of: compound) else { return "\(Int((compound.share * 100).rounded()))% of the richest food there is" }
        return richest.slug == entry.ingredient.slug ? "The most of any food in the Dex" : "\(Int((compound.share * 100).rounded()))% of \(richest.name), the most in the Dex"
    }

    var body: some View {
        DexSection(title: "What it does", empty: "No sourced effect reaches what is in it yet.", isEmpty: entry.effects.isEmpty) {
            EffectBento(tiles: entry.tiles)
            if entry.effects.contains(where: { $0.minFoodPer100g != nil }) {
                Note(text: ClaimNotes.foodBar)
            }
        }
        DexSection(title: "Cautions", empty: "No caution on file. That means none has been sourced yet, not that there are none.", isEmpty: entry.cautions.isEmpty) {
            ForEach(entry.cautions, id: \.self) { CautionCard(kind: $0.kind, summary: $0.summary, grade: $0.grade, advice: $0.advice) }
        }
        DexSection(title: "What is in it", empty: "USDA measured none of the Dex's compounds in it.", isEmpty: compounds.isEmpty && absentNone.isEmpty && absentUnmeasured.isEmpty) {
            ForEach(compounds, id: \.slug) { compound in
                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .firstTextBaseline) {
                        EntryLinkText(route: .entry(.compound, compound.slug), title: compound.name)
                        Spacer(minLength: 8)
                        Text("\(formatAmount(compound.amount, unit: compound.unit)) per 100 g").font(.dex(.footnote, weight: .medium)).monospacedDigit().foregroundStyle(Theme.ink)
                    }
                    Meter(share: compound.share, color: Dex.bundled.palette.swatch(for: compound.compoundClass).background)
                    Note(text: richestNote(compound))
                }
                .dexPanel()
            }
            if !absentNone.isEmpty {
                Note(text: "USDA measured none of: \(absentNone.map(\.name).joined(separator: ", ")).")
            }
            if !absentUnmeasured.isEmpty {
                Note(text: "Not measured, so missing rather than zero: \(absentUnmeasured.map(\.name).joined(separator: ", ")).")
            }
        }
        DexSection(title: "Nutrition per 100 g", empty: "No panel nutrients are in the Dex yet.", isEmpty: entry.panel.isEmpty) {
            PanelTable(title: "Energy and macronutrients", rows: entry.panel.filter { $0.group == "macro" }, colorType: "macronutrient", columns: panelColumns)
            PanelTable(title: "Vitamins and choline", rows: entry.panel.filter { $0.group == "vitamin" }, colorType: "vitamin", columns: panelColumns)
            PanelTable(title: "Minerals", rows: entry.panel.filter { $0.group == "mineral" }, colorType: "mineral", columns: panelColumns)
            Note(text: "From USDA FoodData Central. Each bar compares this food with the richest in the Dex. Where USDA has no value for this food it says missing, never zero.")
        }
        DexSection(title: "Absorption, for 100 g eaten on its own", empty: "No absorption rule reaches what is in it yet.", isEmpty: absorption.isEmpty) {
            ForEach(absorption, id: \.self) { AbsorptionTipCard(tip: $0) }
        }
        DexSection(title: "Pairs well with", empty: "Nothing on file suggests a pairing yet.", isEmpty: entry.pairsWellWith.isEmpty) {
            ForEach(entry.pairsWellWith, id: \.self) { pairing in
                Text("• \(pairing)").font(.dex(.subheadline)).foregroundStyle(Theme.ink)
            }
        }
        DexSection(title: "How prep changes it", empty: "No prep effect on file for what is in it.", isEmpty: prep.isEmpty) {
            ForEach(prep, id: \.self) { PrepCard(claim: $0, showsCompound: true) }
        }
        SourcesSection(sources: entry.sources)
    }
}

/// One group of the nutrient panel: each nutrient's amount and stat bar, or missing.
private struct PanelTable: View {
    let title: String
    let rows: [PanelRow]
    let colorType: String
    let columns: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.dex(.subheadline, weight: .heavy)).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 20, alignment: .top), count: columns), alignment: .leading, spacing: 10) {
                ForEach(rows, id: \.slug) { row in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(alignment: .firstTextBaseline) {
                            EntryLinkText(route: .entry(.compound, row.slug), title: row.name)
                            Spacer(minLength: 8)
                            if let amount = row.amount, let unit = row.unit {
                                Text(formatAmount(amount, unit: unit)).font(.dex(.footnote, weight: .medium)).monospacedDigit().foregroundStyle(Theme.ink)
                            } else {
                                Text("missing").font(.dex(.footnote)).foregroundStyle(Theme.inkSoft)
                            }
                        }
                        if let share = row.share {
                            Meter(share: share, color: Dex.bundled.palette.swatch(for: colorType).background)
                        }
                    }
                }
            }
        }
        .dexPanel()
    }
}
