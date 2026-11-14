import SwiftUI

/// What a screen may show. The handhelds show only what has been encountered; the Mac shows everything
/// and blacks out the rest. A screen nobody gave a view to shows nothing.
struct DexVisibility {
    private enum Reach {
        case everything
        case nothing
        case unlocked(EncounterStore)
    }

    private let reach: Reach

    /// The Mac's view.
    static let everything = DexVisibility(reach: .everything)

    /// What the environment holds until an app's root view says otherwise.
    static let nothing = DexVisibility(reach: .nothing)

    private init(reach: Reach) {
        self.reach = reach
    }

    /// The handhelds' view of what this store has unlocked.
    init(store: EncounterStore) {
        reach = .unlocked(store)
    }

    var isEverything: Bool {
        if case .everything = reach { true } else { false }
    }

    func shows(_ kind: EntryKind, _ slug: String) -> Bool {
        switch reach {
        case .everything: true
        case .nothing: false
        case let .unlocked(store): store.isRevealed(kind, slug)
        }
    }

    func shows(_ route: DexRoute) -> Bool {
        guard case let .entry(kind, slug) = route else { return true }
        return shows(kind, slug)
    }

    /// What can be swiped through of one kind, in dex order.
    func entries(of kind: EntryKind) -> [EntryCard] {
        Dex.bundled.cards.filter { $0.kind == kind && shows(kind, $0.slug) }
    }

    /// A card's stats, without one that names a hidden food. The snapshot says which stat names which food.
    func stats(of card: EntryCard) -> [String] {
        zip(card.stats, card.statFoods).filter { _, food in food.map { shows(.ingredient, $0) } ?? true }.map(\.0)
    }

    /// The richest food for a compound, unless naming it would give away a food not yet encountered.
    func richest(of compound: CompoundAmount) -> Named? {
        shows(.ingredient, compound.richest.slug) ? compound.richest : nil
    }

    /// The citations behind what is shown.
    var sources: [SourceUse] {
        guard !isEverything else { return Dex.bundled.sources }
        let behind = Set(Dex.bundled.cards.filter { shows($0.kind, $0.slug) }.flatMap(\.sources))
        return Dex.bundled.sources.filter { behind.contains($0.id) }
    }
}

extension EnvironmentValues {
    @Entry var dexVisibility = DexVisibility.nothing
}
