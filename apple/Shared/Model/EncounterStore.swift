import Foundation
import Observation

/// Which foods someone has had, and what that reveals. Only foods are recorded: the compounds and
/// effects a food reveals come from the snapshot, so they cannot drift from what the Dex says.
@Observable
final class EncounterStore {
    private static let key = "encounteredFoods"

    private let defaults: UserDefaults
    private(set) var foods: [String: Date]

    /// - Parameter defaults: where this device keeps the record
    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        foods = defaults.dictionary(forKey: Self.key) as? [String: Date] ?? [:]
    }

    func encounter(food slug: String, on date: Date = .now) {
        foods[slug] = date
        defaults.set(foods, forKey: Self.key)
    }

    func forget(food slug: String) {
        foods[slug] = nil
        defaults.set(foods, forKey: Self.key)
    }

    func date(of food: String) -> Date? {
        foods[food]
    }

    func isRevealed(_ kind: EntryKind, _ slug: String) -> Bool {
        switch kind {
        case .ingredient: foods[slug] != nil
        case .compound: foods.keys.contains { Dex.bundled.reveals[$0]?.compounds.contains(slug) == true }
        case .effect: foods.keys.contains { Dex.bundled.reveals[$0]?.effects.contains(slug) == true }
        }
    }

    func isRevealed(_ card: EntryCard) -> Bool {
        isRevealed(card.kind, card.slug)
    }

    /// - Returns: how much of a kind is revealed, out of all of it
    func progress(of kind: EntryKind) -> (seen: Int, total: Int) {
        let cards = Dex.bundled.cards.filter { $0.kind == kind }
        return (cards.filter(isRevealed).count, cards.count)
    }
}

/// Which entries a list shows, by whether they have been encountered.
enum EncounterFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case encountered = "Encountered"
    case notYet = "Not yet"

    var id: String { rawValue }

    func apply(_ cards: [EntryCard], store: EncounterStore) -> [EntryCard] {
        switch self {
        case .all: cards
        case .encountered: cards.filter(store.isRevealed)
        case .notYet: cards.filter { !store.isRevealed($0) }
        }
    }
}
