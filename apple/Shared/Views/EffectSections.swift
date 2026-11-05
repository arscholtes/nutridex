import SwiftUI

/// An effect's badges, under its name.
struct EffectDetails: View {
    let entry: EffectEntry

    private var effect: ClaimEffect { entry.effect }

    var body: some View {
        HStack(spacing: 8) {
            TypeBadge(type: effect.bodySystem)
            Text(effect.direction.capitalized).font(.dex(.caption, weight: .bold)).foregroundStyle(Theme.inkSoft)
            if let grade = entry.bestGrade { GradeBadge(grade: grade) }
        }
    }
}

/// The compounds behind an effect, with their evidence, and the foods that carry them.
struct EffectSections: View {
    let entry: EffectEntry
    @Environment(\.dexVisibility) private var visibility

    private var compounds: [EffectClaim] { entry.compounds.filter { visibility.shows(.compound, $0.compound.slug) } }
    private var foods: [EffectEntry.FoodsForCompound] {
        entry.foods.filter { visibility.shows(.compound, $0.compound.slug) }.map { group in
            EffectEntry.FoodsForCompound(compound: group.compound, bar: group.bar, ranked: group.ranked.filter { visibility.shows(.ingredient, $0.slug) }, unmeasured: group.unmeasured.filter { visibility.shows(.ingredient, $0.slug) })
        }
    }

    private var effect: ClaimEffect { entry.effect }

    var body: some View {
        DexSection(title: "Compounds behind it", empty: "No sourced compound reaches it yet.", isEmpty: compounds.isEmpty) {
            EffectList(claims: compounds, page: .effect)
            if compounds.contains(where: { $0.minFoodPer100g != nil }) {
                Note(text: ClaimNotes.meaning)
            }
        }
        ForEach(foods, id: \.compound.slug) { group in
            DexSection(
                title: group.bar == nil ? "Foods richest in \(group.compound.name), per 100 g" : "Foods that are a source of \(group.compound.name), per 100 g",
                empty: group.bar == nil ? "No food in the Dex has a measured amount of \(group.compound.name)." : "No food in the Dex reaches the bar for \(group.compound.name) yet.",
                isEmpty: group.ranked.isEmpty && group.unmeasured.isEmpty
            ) {
                ForEach(Array(group.ranked.enumerated()), id: \.offset) { index, food in
                    FoodRow(food: food, color: Dex.bundled.palette.swatch(for: effect.bodySystem).background, rank: index + 1)
                }
                if !group.unmeasured.isEmpty {
                    Note(text: "Carried by, with no measured amount: \(group.unmeasured.map(\.name).joined(separator: ", ")).")
                }
            }
        }
        if !foods.isEmpty {
            Note(text: foods.contains { $0.bar != nil } ? "Ranked by amount. \(ClaimNotes.effectBar)" : "Ranked by amount.")
        }
        SourcesSection(sources: entry.sources)
    }
}
