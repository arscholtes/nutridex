import Foundation
import Observation

enum DexRoute: Hashable {
    case entry(EntryKind, String)
    case sources
    case skins
}

/// Where the app is. A phone keeps entries on a stack; an iPad keeps a sidebar selection with a
/// stack on top of it for links followed from inside an entry.
@Observable
final class DexNavigator {
    var selection: DexRoute?
    var path: [DexRoute] = []

    /// Moves to a neighbouring entry in place, so the back button still leads where it did.
    func step(to route: DexRoute) {
        if path.isEmpty {
            selection = route
        } else {
            path[path.count - 1] = route
        }
    }

    func backToList() {
        selection = nil
        path = []
    }

    /// Chooses from the iPad sidebar, which starts a fresh stack.
    func choose(_ route: DexRoute) {
        selection = route
        path = []
    }
}

/// What the search box and filters currently ask for.
@Observable
final class DexBrowser {
    var query = ""
    var kind: EntryKind?
    var type: String?

    var cards: [EntryCard] {
        DexSearch.filter(Dex.bundled.cards, query: query, kind: kind, type: type)
    }

    func choose(kind newKind: EntryKind?) {
        kind = newKind
        type = nil
    }
}
