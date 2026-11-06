import Foundation

/// The home search and filters, ranked as the web Dex ranks them in Postgres. It is a copy of that
/// query, so every search the export records is checked against it (`SnapshotTests`).
enum DexSearch {
    /// A name this close counts as a misspelling, the same threshold the web Dex uses.
    private static let similarityThreshold = 0.4

    /// What a name is matched on, worked out once per name rather than on every keystroke.
    private struct Name {
        let lowered: String
        /// Its length in Unicode scalars, as Postgres counts characters.
        let length: Int
        let words: [Set<String>]
    }

    private struct Scored {
        let card: EntryCard
        let contains: Bool
        let prefix: Bool
        let length: Int
        let score: Float
    }

    private static var names: [String: Name] = [:]

    /// - Parameters:
    ///   - cards: every entry, in display order
    ///   - query: words to match; names containing them win, and only when none does do close spellings count
    ///   - kind: an entry kind, or nil for all
    ///   - type: a type badge, or nil for all
    /// - Returns: the matches, best first when searching
    static func filter(_ cards: [EntryCard], query: String, kind: EntryKind?, type: String?) -> [EntryCard] {
        let inScope = cards.filter { (kind == nil || $0.kind == kind) && (type == nil || $0.type == type) }
        let words = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !words.isEmpty else { return inScope }

        let wanted = trigrams(of: words)
        let lowered = words.lowercased()
        let scored = inScope.map { card in
            let name = prepared(card.name)
            // Postgres scores in single precision, so ties fall as they do there.
            return Scored(card: card, contains: name.lowered.contains(lowered), prefix: name.lowered.hasPrefix(lowered), length: name.length, score: Float(similarity(wanted, name.words)))
        }
        let anyContains = scored.contains { $0.contains }
        return scored.filter { $0.contains || (!anyContains && Double($0.score) >= similarityThreshold) }.sorted(by: webOrder).map(\.card)
    }

    /// The web's order: names containing the words, then names starting with them, shortest first, then
    /// closeness, then foods before compounds before effects, then shorter names, then by name.
    private static func webOrder(_ a: Scored, _ b: Scored) -> Bool {
        if a.contains != b.contains { return a.contains }
        if a.prefix != b.prefix { return a.prefix }
        if a.prefix, a.length != b.length { return a.length < b.length }
        if a.score != b.score { return a.score > b.score }
        if rank(a.card.kind) != rank(b.card.kind) { return rank(a.card.kind) < rank(b.card.kind) }
        if a.length != b.length { return a.length < b.length }
        // The database compares names byte by byte.
        return a.card.name.utf8.lexicographicallyPrecedes(b.card.name.utf8)
    }

    private static func rank(_ kind: EntryKind) -> Int {
        switch kind {
        case .ingredient: 0
        case .compound: 1
        case .effect: 2
        }
    }

    /// - Returns: how closely the query matches the best run of words in the name, from 0 to 1
    static func wordSimilarity(_ query: String, in name: String) -> Double {
        similarity(trigrams(of: query), tokens(of: name).map(trigrams(of:)))
    }

    private static func similarity(_ wanted: Set<String>, _ words: [Set<String>]) -> Double {
        guard !wanted.isEmpty, !words.isEmpty else { return 0 }
        var best = 0.0
        for start in words.indices {
            var run = Set<String>()
            for word in words[start...] {
                run.formUnion(word)
                let shared = wanted.intersection(run).count
                best = max(best, Double(shared) / Double(wanted.union(run).count))
            }
        }
        return best
    }

    private static func prepared(_ name: String) -> Name {
        if let known = names[name] { return known }
        let made = Name(lowered: name.lowercased(), length: name.unicodeScalars.count, words: tokens(of: name).map(trigrams(of:)))
        names[name] = made
        return made
    }

    private static func tokens(of text: String) -> [String] {
        text.lowercased().split { !$0.isLetter && !$0.isNumber }.map(String.init)
    }

    private static func trigrams(of text: String) -> Set<String> {
        var result = Set<String>()
        for word in tokens(of: text) {
            let padded = Array("  \(word) ")
            for i in 0..<(padded.count - 2) {
                result.insert(String(padded[i...(i + 2)]))
            }
        }
        return result
    }
}
