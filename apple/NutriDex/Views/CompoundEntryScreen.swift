import SwiftUI

/// A compound's entry: what it does, which foods carry it, what helps it absorb, what prep does, and how it works.
struct CompoundEntryScreen: View {
    let entry: CompoundEntry

    private static let notOnFile = "Not on file yet"

    private var compound: CompoundEntry.Compound { entry.compound }

    var body: some View {
        EntryChrome(kind: .compound, type: compound.compoundClass, pager: entry.pager) {
            EntryLayout {
                EntryViewer(number: entry.pager.number, type: compound.compoundClass, name: compound.name) {
                    CreatureArt(kind: .compound, slug: compound.slug)
                } details: {
                    HStack(spacing: 8) {
                        TypeBadge(type: compound.compoundClass)
                        if let grade = entry.bestGrade { GradeBadge(grade: grade) }
                    }
                    identity
                }
            } sections: {
                DexSection(title: "What it does", empty: "No sourced effect on file for it yet.", isEmpty: entry.effects.isEmpty) {
                    EffectList(claims: entry.effects, page: .compound)
                    if entry.effects.contains(where: { $0.minFoodPer100g != nil }) {
                        Note(text: ClaimNotes.meaning)
                    }
                }
                DexSection(title: "Cautions", empty: "No caution on file. That means none has been sourced yet, not that there are none.", isEmpty: entry.cautions.isEmpty) {
                    ForEach(entry.cautions, id: \.self) { CautionCard(kind: $0.kind, summary: $0.summary, grade: $0.grade, source: $0.source) }
                }
                DexSection(title: "Foods that carry it, per 100 g", empty: "No food in the Dex has a measured amount of it.", isEmpty: entry.foods.isEmpty && entry.absent.none.isEmpty && entry.absent.unmeasured.isEmpty) {
                    ForEach(entry.foods, id: \.slug) { FoodRow(food: $0, color: Dex.bundled.palette.swatch(for: compound.compoundClass).background) }
                    if !entry.foods.isEmpty, entry.foods.allSatisfy({ $0.perServing == nil }) {
                        Note(text: "No typical serving sizes on file yet, so amounts are per 100 g only.")
                    }
                    if !entry.absent.none.isEmpty {
                        Note(text: "USDA measured none in: \(entry.absent.none.map(\.name).joined(separator: ", ")).")
                    }
                    if !entry.absent.unmeasured.isEmpty {
                        Note(text: "Carried by, with no measured amount: \(entry.absent.unmeasured.map(\.name).joined(separator: ", ")).")
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
        }
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

    private func stability(_ label: String, _ value: String?) -> some View {
        GridRow {
            Text(label).font(.dex(.footnote)).foregroundStyle(Theme.inkSoft)
            Text(value ?? Self.notOnFile).font(.dex(.footnote)).foregroundStyle(Theme.ink)
        }
    }
}
