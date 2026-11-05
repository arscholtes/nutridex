import SwiftUI

/// What a screen may show. The handhelds show only what has been encountered; the Mac shows everything
/// and blacks out the rest.
struct DexVisibility {
    private let store: EncounterStore?

    /// The Mac's view.
    static let everything = DexVisibility(store: nil)

    /// The handhelds' view of what this store has unlocked.
    init(store: EncounterStore?) {
        self.store = store
    }

    var isEverything: Bool { store == nil }

    func shows(_ kind: EntryKind, _ slug: String) -> Bool {
        store?.isRevealed(kind, slug) ?? true
    }

    func shows(_ route: DexRoute) -> Bool {
        guard case let .entry(kind, slug) = route else { return true }
        return shows(kind, slug)
    }

    /// What can be swiped through of one kind, in dex order.
    func entries(of kind: EntryKind) -> [EntryCard] {
        Dex.bundled.cards.filter { $0.kind == kind && shows(kind, $0.slug) }
    }

    /// A card's stats, without one that would name a hidden food.
    func stats(of card: EntryCard) -> [String] {
        card.stats.filter { stat in
            guard stat.hasPrefix("Most in ") else { return true }
            let name = String(stat.dropFirst("Most in ".count))
            guard let food = Dex.bundled.cards.first(where: { $0.kind == .ingredient && $0.name == name }) else { return true }
            return shows(.ingredient, food.slug)
        }
    }

    /// The richest food for a compound, unless naming it would give away a food not yet encountered.
    func richest(of compound: CompoundAmount) -> Named? {
        shows(.ingredient, compound.richest.slug) ? compound.richest : nil
    }

    /// The citations behind what is shown.
    var sources: [SourceUse] {
        guard !isEverything else { return Dex.bundled.sources }
        var behind = Set<String>()
        for (slug, entry) in Dex.bundled.ingredients where shows(.ingredient, slug) { behind.formUnion(entry.sources.map(\.id)) }
        for (slug, entry) in Dex.bundled.compounds where shows(.compound, slug) { behind.formUnion(entry.sources.map(\.id)) }
        for (slug, entry) in Dex.bundled.effects where shows(.effect, slug) { behind.formUnion(entry.sources.map(\.id)) }
        return Dex.bundled.sources.filter { behind.contains($0.id) }
    }
}

extension EnvironmentValues {
    @Entry var dexVisibility = DexVisibility.everything
}
