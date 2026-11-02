import Foundation
import Observation

/// What this device knows about one food someone has had.
struct EncounterRecord: Codable, Equatable {
    var encounteredAt: Date
    /// Nil until it has been uploaded.
    var uploadedAt: Date?
    /// True once its unlock animation has finished here.
    var celebrated = false
}

/// This device's working copy of which foods someone has had. The server holds the record; this lets
/// the game work offline and lets new encounters wait for an upload. Only foods are recorded: what a food
/// unlocks comes from the snapshot, so it cannot drift from what the Dex says.
@Observable
final class EncounterStore {
    private static let key = "encounterRecords"

    private let defaults: UserDefaults
    private(set) var records: [String: EncounterRecord]

    /// - Parameter defaults: where this device keeps its copy
    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        records = defaults.data(forKey: Self.key).flatMap { try? JSONDecoder().decode([String: EncounterRecord].self, from: $0) } ?? [:]
    }

    private func save() {
        // Plain strings and dates, so encoding them cannot fail in practice; if it ever did the game must not pretend it saved.
        guard let data = try? JSONEncoder().encode(records) else { fatalError("could not encode encounters") }
        defaults.set(data, forKey: Self.key)
    }

    /// Marks a food as had. It unlocks here straight away and waits to be uploaded.
    func encounter(food slug: String, on date: Date = .now) {
        guard records[slug] == nil else { return }
        records[slug] = EncounterRecord(encounteredAt: date)
        save()
    }

    func date(of food: String) -> Date? {
        records[food]?.encounteredAt
    }

    /// What is waiting to be uploaded, in a stable order.
    var pending: [UploadItem] {
        records.filter { $0.value.uploadedAt == nil }
            .map { UploadItem(food: $0.key, encounteredAt: $0.value.encounteredAt) }
            .sorted { $0.food < $1.food }
    }

    /// Takes in what the server holds: marks ours as uploaded and adds what came from another device.
    func merge(_ encounters: [ServerEncounter], at now: Date = .now) {
        for row in encounters {
            let when = UploadItem.dateFormat.date(from: row.encounteredAt) ?? now
            var record = records[row.food] ?? EncounterRecord(encounteredAt: when)
            record.uploadedAt = UploadItem.dateFormat.date(from: row.uploadedAt) ?? now
            records[row.food] = record
        }
        save()
    }

    /// Uploaded foods whose unlock animation has not finished here, in dex order.
    var awaitingUnlock: [EntryCard] {
        Dex.bundled.cards.filter { $0.kind == .ingredient && records[$0.slug]?.uploadedAt != nil && records[$0.slug]?.celebrated == false }
    }

    func celebrate(food: String) {
        records[food]?.celebrated = true
        save()
    }

    func isRevealed(_ kind: EntryKind, _ slug: String) -> Bool {
        switch kind {
        case .ingredient: records[slug] != nil
        case .compound: records.keys.contains { Dex.bundled.reveals[$0]?.compounds.contains(slug) == true }
        case .effect: records.keys.contains { Dex.bundled.reveals[$0]?.effects.contains(slug) == true }
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

    /// How much of the whole collection is unlocked.
    var totalProgress: (seen: Int, total: Int) {
        (Dex.bundled.cards.filter(isRevealed).count, Dex.bundled.cards.count)
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
