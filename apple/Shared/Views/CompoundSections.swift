import SwiftUI

/// A compound's badges and identity, under its name.
struct CompoundDetails: View {
    let entry: CompoundEntry

    private var compound: CompoundEntry.Compound { entry.compound }

    var body: some View {
        HStack(spacing: 8) {
            TypeBadge(type: compound.compoundClass)
            if let grade = entry.bestGrade { GradeBadge(grade: grade) }
        }
        identity
    }

    @ViewBuilder private var identity: some View {
        let classes = entry.classes.map(\.name).joined(separator: ", ")
        let suffix = entry.classes.isEmpty ? "" : ", in ChEBI's \(classes) class"
        if let label = compound.chebiLabel, let url = URL(string: "https://www.ebi.ac.uk/chebi/searchId.do?chebiId=\(label)") {
            Link(destination: url) {
                Text(verbatim: label + suffix).underline(color: Theme.line)
            }
            .font(.dex(.footnote))
            .foregroundStyle(Theme.inkSoft)
        } else {
            Note(text: "No ChEBI id on file\(suffix)")
        }
    }
}

/// What a compound does, which foods carry it, what helps it absorb, what prep does, and how it works.
struct CompoundSections: View {
    let entry: CompoundEntry
    @Environment(\.dexVisibility) private var visibility

    private var foods: [FoodAmount] { entry.foods.filter { visibility.shows(.ingredient, $0.slug) } }
    private var absentNone: [Named] { entry.absent.none.filter { visibility.shows(.ingredient, $0.slug) } }
    private var absentUnmeasured: [Named] { entry.absent.unmeasured.filter { visibility.shows(.ingredient, $0.slug) } }
    private var effects: [EffectClaim] { entry.effects.filter { visibility.shows(.effect, $0.effect.slug) } }

    private static let notOnFile = "Not on file yet"

    private var compound: CompoundEntry.Compound { entry.compound }

    var body: some View {
        DexSection(title: "What it does", empty: "No sourced effect on file for it yet.", isEmpty: effects.isEmpty) {
            EffectList(claims: effects, page: .compound)
            if effects.contains(where: { $0.minFoodPer100g != nil }) {
                Note(text: ClaimNotes.meaning)
            }
        }
        DexSection(title: "Cautions", empty: "No caution on file. That means none has been sourced yet, not that there are none.", isEmpty: entry.cautions.isEmpty) {
            ForEach(entry.cautions, id: \.self) { CautionCard(kind: $0.kind, summary: $0.summary, grade: $0.grade, source: $0.source) }
        }
        DexSection(title: "Foods that carry it, per 100 g", empty: "No food in the Dex has a measured amount of it.", isEmpty: foods.isEmpty && absentNone.isEmpty && absentUnmeasured.isEmpty) {
            ForEach(foods, id: \.slug) { FoodRow(food: $0, color: Dex.bundled.palette.swatch(for: compound.compoundClass).background) }
            if !foods.isEmpty, foods.allSatisfy({ $0.perServing == nil }) {
                Note(text: "No typical serving sizes on file yet, so amounts are per 100 g only.")
            }
            if !absentNone.isEmpty {
                Note(text: "USDA measured none in: \(absentNone.map(\.name).joined(separator: ", ")).")
            }
            if !absentUnmeasured.isEmpty {
                Note(text: "Carried by, with no measured amount: \(absentUnmeasured.map(\.name).joined(separator: ", ")).")
            }
        }
        DexSection(title: "What helps or hinders absorption", empty: "No absorption rule on file for it yet.", isEmpty: entry.modifiers.isEmpty) {
            ForEach(entry.modifiers, id: \.self) { ModifierCard(claim: $0) }
        }
        DexSection(title: "How prep changes it", empty: "No prep effect on file for it yet.", isEmpty: entry.prep.isEmpty) {
            ForEach(entry.prep, id: \.self) { PrepCard(claim: $0, showsCompound: false) }
        }
        DexSection(title: "How it works", empty: "No mechanism on file yet.", isEmpty: compound.mechanismSummary == nil && compound.mechanismDetail == nil) {
            if let summary = compound.mechanismSummary { Text(summary).font(.dex(.body)).foregroundStyle(Theme.ink) }
            if let detail = compound.mechanismDetail { Note(text: detail) }
        }
        VStack(alignment: .leading, spacing: 10) {
            SectionTitle(title: "Solubility and stability")
            Grid(alignment: .leading, horizontalSpacing: 14, verticalSpacing: 4) {
                stability("Solubility", compound.solubility)
                stability("Heat", compound.heatStability)
                stability("Light", compound.lightStability)
            }
        }
        SourcesSection(sources: entry.sources)
    }

    private func stability(_ label: String, _ value: String?) -> some View {
        GridRow {
            Text(label).font(.dex(.footnote)).foregroundStyle(Theme.inkSoft)
            Text(value ?? Self.notOnFile).font(.dex(.footnote)).foregroundStyle(Theme.ink)
        }
    }
}
