import Foundation

/// The home search and filters, as the web Dex runs them in Postgres.
enum DexSearch {
    /// A name this close counts as a misspelling, the same threshold the web Dex uses.
    private static let similarityThreshold = 0.4

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

        let scored = inScope.enumerated().map { (index: $0.offset, card: $0.element, score: wordSimilarity(words, in: $0.element.name)) }
        let containing = scored.filter { $0.card.name.localizedCaseInsensitiveContains(words) }
        let matches = containing.isEmpty ? scored.filter { $0.score >= similarityThreshold } : containing
        return matches.sorted { ($0.score, -$0.index) > ($1.score, -$1.index) }.map(\.card)
    }

    /// - Returns: how closely the query matches the best run of words in the name, from 0 to 1
    static func wordSimilarity(_ query: String, in name: String) -> Double {
        let wanted = trigrams(of: query)
        let words = tokens(of: name)
        guard !wanted.isEmpty, !words.isEmpty else { return 0 }
        var best = 0.0
        for start in words.indices {
            var run = Set<String>()
            for word in words[start...] {
                run.formUnion(trigrams(of: word))
                let shared = wanted.intersection(run).count
                best = max(best, Double(shared) / Double(wanted.union(run).count))
            }
        }
        return best
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
