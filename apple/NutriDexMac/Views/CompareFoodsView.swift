import SwiftUI

/// How the compare table sorts. Missing amounts stay last in either direction, so a gap never
/// reads as the least or the most of something.
struct CompareOrder: SortComparator, Hashable {
    enum Key: Hashable {
        case name
        case nutrient(String)
    }

    let key: Key
    var order: SortOrder

    init(_ key: Key, order: SortOrder = .reverse) {
        self.key = key
        self.order = order
    }

    func compare(_ a: CompareFood, _ b: CompareFood) -> ComparisonResult {
        switch key {
        case .name:
            let result = a.name.localizedStandardCompare(b.name)
            return order == .forward ? result : flipped(result)
        case let .nutrient(slug):
            switch (Self.amount(a, slug), Self.amount(b, slug)) {
            case (nil, nil): return a.name.localizedStandardCompare(b.name)
            case (nil, _): return .orderedDescending
            case (_, nil): return .orderedAscending
            case let (x?, y?):
                if x == y { return a.name.localizedStandardCompare(b.name) }
                let result: ComparisonResult = x < y ? .orderedAscending : .orderedDescending
                return order == .forward ? result : flipped(result)
            }
        }
    }

    private func flipped(_ result: ComparisonResult) -> ComparisonResult {
        switch result {
        case .orderedAscending: .orderedDescending
        case .orderedDescending: .orderedAscending
        case .orderedSame: .orderedSame
        }
    }

    private static func amount(_ food: CompareFood, _ slug: String) -> Double? {
        food.panel.first { $0.slug == slug }?.amount
    }
}

/// Every food against every nutrient per 100 g. Click a column to rank by it; double-click a food to open it.
struct CompareFoodsView: View {
    @Binding var section: MacSection
    @Environment(DexNavigator.self) private var nav
    @Environment(EncounterStore.self) private var store
    @State private var order = [CompareOrder(.name, order: .forward)]
    @State private var selected: CompareFood.ID?

    private var foods: [CompareFood] {
        Dex.bundled.compare.sorted(using: order)
    }

    /// The panel's nutrients, in its display order.
    private var nutrients: [PanelRow] {
        Dex.bundled.compare.first?.panel ?? []
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Compare foods").font(.dex(.title, weight: .heavy)).foregroundStyle(Theme.ink)
                Note(text: "Amounts per 100 g, from USDA FoodData Central. Bars compare each food with the richest in the Dex. Click a column to rank by it, and double-click a food to open it.")
            }
            .padding(14)
            Table(foods, selection: $selected, sortOrder: $order) {
                TableColumn("Food", sortUsing: CompareOrder(.name, order: .forward)) { food in
                    HStack(spacing: 8) {
                        CreatureArt(kind: .ingredient, slug: food.slug, revealed: store.isRevealed(.ingredient, food.slug))
                            .frame(width: 30, height: 30)
                        VStack(alignment: .leading, spacing: 0) {
                            Text(food.name).font(.dex(.subheadline, weight: .bold)).foregroundStyle(Theme.ink)
                            Text(food.number).font(.dexNumber(.caption2)).foregroundStyle(Theme.inkSoft)
                        }
                    }
                }
                .width(210)
                TableColumnForEach(nutrients, id: \.slug) { nutrient in
                    TableColumn(nutrient.name, sortUsing: CompareOrder(.nutrient(nutrient.slug))) { food in
                        CompareCell(row: food.panel.first { $0.slug == nutrient.slug })
                    }
                    .width(110)
                }
            }
            .contextMenu(forSelectionType: CompareFood.ID.self) { _ in
            } primaryAction: { slugs in
                if let slug = slugs.first {
                    nav.choose(.entry(.ingredient, slug))
                    section = .dex(.ingredient)
                }
            }
            .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
        }
        .background(Theme.screen)
    }
}

private struct CompareCell: View {
    let row: PanelRow?

    var body: some View {
        if let row, let amount = row.amount, let unit = row.unit {
            VStack(alignment: .trailing, spacing: 3) {
                Text(formatAmount(amount, unit: unit)).font(.dex(.caption, weight: .medium)).monospacedDigit().foregroundStyle(Theme.ink)
                Meter(share: row.share ?? 0, color: Dex.bundled.palette.swatch(for: colorType(row.group)).background)
            }
        } else {
            Text("missing").font(.dex(.caption)).foregroundStyle(Theme.inkSoft)
        }
    }

    private func colorType(_ group: String) -> String {
        group == "macro" ? "macronutrient" : group
    }
}
