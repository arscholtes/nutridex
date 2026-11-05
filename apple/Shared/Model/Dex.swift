import Foundation

// What the app shows, read from dex.sqlite. `npm run export:native` writes that file from the same
// functions the web Dex reads through, so this layer decodes judgments and never makes them.

/// A nutrient behind a tile. Its daily share is nil where no claim sets a bar.
struct BentoCompound: Decodable, Hashable, Identifiable {
    let slug: String
    let name: String
    let dailyShare: Double?

    var id: String { slug }
}

/// One effect of a food, sized by how much of a daily amount is behind it.
struct BentoTile: Decodable, Hashable, Identifiable {
    let effect: ClaimEffect
    let size: String
    let grade: String
    let topShare: Double?
    let compounds: [BentoCompound]
    let wording: String?
    /// What a trial used, for a claim resting on one rather than on what a food holds.
    let dose: String?

    var id: String { effect.slug }
}

enum EntryKind: String, Decodable, Hashable {
    case ingredient, compound, effect
}

struct Named: Decodable, Hashable {
    let slug: String
    let name: String
}

struct NamedWithClass: Decodable, Hashable {
    let slug: String
    let name: String
    let compoundClass: String?

    enum CodingKeys: String, CodingKey {
        case slug, name
        case compoundClass = "class"
    }
}

struct SourceRef: Decodable, Hashable, Identifiable {
    let id: String
    let title: String
    let url: String?
    let year: Int?
    let studyType: String?
    let limitations: String?
}

struct DexStep: Decodable, Hashable {
    let slug: String
    let name: String
    let number: String
}

struct DexPager: Decodable, Hashable {
    let number: String
    let total: Int
    let prev: DexStep?
    let next: DexStep?
}

struct EntryCard: Decodable, Identifiable, Hashable {
    let kind: EntryKind
    let slug: String
    let name: String
    let number: String
    let type: String?
    let bestGrade: String?
    let stats: [String]
    /// A line about the entry for someone who has not encountered it.
    let description: String
    /// The catalog name of its creature, shared by every food wearing the same drawing; an effect has none.
    let art: String?
    /// The ids of the sources behind its entry.
    let sources: [String]

    var id: String { "\(kind.rawValue):\(slug)" }
    var route: DexRoute { .entry(kind, slug) }
    var creatureAssetName: String { EntryKind.assetName(kind, slug) }
}

extension EntryKind {
    /// - Returns: the catalog name of an entry's creature, as the export named it
    static func assetName(_ kind: EntryKind, _ slug: String) -> String {
        Dex.bundled.art(kind, slug)
    }
}

struct Absences: Decodable, Hashable {
    let none: [Named]
    let unmeasured: [Named]
}

struct FoodAmount: Decodable, Hashable {
    let slug: String
    let name: String
    let amount: Double
    let unit: String
    let perServing: Double?
    let share: Double
}

struct CompoundAmount: Decodable, Hashable {
    let slug: String
    let name: String
    let compoundClass: String?
    let amount: Double
    let unit: String
    let share: Double
    let richest: Named

    enum CodingKeys: String, CodingKey {
        case slug, name, amount, unit, share, richest
        case compoundClass = "class"
    }
}

struct PanelRow: Decodable, Hashable {
    let slug: String
    let name: String
    let group: String
    let amount: Double?
    let unit: String?
    let share: Double?
}

struct AbsorptionFlag: Decodable, Hashable {
    let compoundSlug: String
    let status: String
    let reason: String
    let suggestion: String?
    let grade: String
    let basis: String
}

struct AbsorptionTip: Decodable, Hashable {
    let flag: AbsorptionFlag
    let compound: Named
    let className: String?
    let sources: [SourceRef]
}

struct ModifierClaim: Decodable, Hashable {
    let ruleId: String
    let basis: String
    let className: String?
    let direction: String
    let condition: String?
    let modifierCompound: Named?
    let magnitude: String?
    let mechanism: String?
    let grade: String
    let source: SourceRef
}

struct PrepClaim: Decodable, Hashable {
    let compound: Named
    let method: String
    let retentionFactor: Double?
    let direction: String?
    let note: String?
    let source: SourceRef
}

struct ClaimEffect: Decodable, Hashable {
    let slug: String
    let name: String
    let direction: String
    let bodySystem: String?
}

struct EffectClaim: Decodable, Hashable {
    let effect: ClaimEffect
    let compound: NamedWithClass
    let summary: String?
    let doseContext: String?
    let onset: String?
    let minFoodPer100g: Double?
    let grade: String
    let source: SourceRef
}

struct FoodCaution: Decodable, Hashable {
    let kind: String
    let summary: String
    let grade: String?
    let advice: String?
}

struct CompoundCaution: Decodable, Hashable {
    let kind: String
    let summary: String
    let grade: String
    let source: SourceRef
}

struct IngredientEntry: Decodable, Hashable {
    struct Ingredient: Decodable, Hashable {
        let slug: String
        let name: String
        let category: String?
    }

    let ingredient: Ingredient
    let pager: DexPager
    let measured: Int
    let compounds: [CompoundAmount]
    let absent: Absences
    let panel: [PanelRow]
    let absorption: [AbsorptionTip]
    let pairsWellWith: [String]
    let prep: [PrepClaim]
    let effects: [EffectClaim]
    /// The same effects as tiles, sized by how much of a daily amount is behind each.
    let tiles: [BentoTile]
    let cautions: [FoodCaution]
    let sources: [SourceRef]
    let bestGrade: String?
}

struct CompoundEntry: Decodable, Hashable {
    struct Compound: Decodable, Hashable {
        let slug: String
        let name: String
        let compoundClass: String?
        let chebiId: Int?
        let solubility: String?
        let heatStability: String?
        let lightStability: String?
        let mechanismSummary: String?
        let mechanismDetail: String?

        enum CodingKeys: String, CodingKey {
            case slug, name, chebiId, solubility, heatStability, lightStability, mechanismSummary, mechanismDetail
            case compoundClass = "class"
        }

        /// An identifier, so it is built as plain text rather than a number that locale formatting would group.
        var chebiLabel: String? { chebiId.map { "CHEBI:" + String($0) } }
    }

    struct ChebiClass: Decodable, Hashable {
        let name: String
        let chebiId: Int
    }

    let pager: DexPager
    let compound: Compound
    let classes: [ChebiClass]
    let foods: [FoodAmount]
    let absent: Absences
    let modifiers: [ModifierClaim]
    let prep: [PrepClaim]
    let effects: [EffectClaim]
    let cautions: [CompoundCaution]
    let sources: [SourceRef]
    let bestGrade: String?
}

struct EffectEntry: Decodable, Hashable {
    struct FoodsForCompound: Decodable, Hashable {
        let compound: Named
        let bar: Double?
        let ranked: [FoodAmount]
        let unmeasured: [Named]
    }

    let pager: DexPager
    let effect: ClaimEffect
    let compounds: [EffectClaim]
    let foods: [FoodsForCompound]
    let sources: [SourceRef]
    let bestGrade: String?
}

struct SourceUse: Decodable, Hashable, Identifiable {
    let id: String
    let title: String
    let url: String?
    let year: Int?
    let studyType: String?
    let limitations: String?
    let doi: String?
    let pmid: String?
    let population: String?
    let supports: [String]

    var ref: SourceRef { SourceRef(id: id, title: title, url: url, year: year, studyType: studyType, limitations: limitations) }
}

struct TypeSwatch: Decodable, Hashable {
    let color: String
    let textOnColor: String
}

struct Palette: Decodable, Hashable {
    let untyped: TypeSwatch
    let types: [String: TypeSwatch]

    /// - Returns: the type's colour, or the untyped colour when it has none
    func swatch(for type: String?) -> TypeSwatch {
        type.flatMap { types[$0] } ?? untyped
    }
}

struct Disclaimer: Decodable, Hashable {
    struct Section: Decodable, Hashable {
        let heading: String
        let body: String
    }

    let title: String
    let intro: String
    let sections: [Section]
}

/// What marking a food as had reveals.
struct Reveal: Decodable, Hashable {
    let compounds: [String]
    let effects: [String]
}

/// A search the web Dex ran and its results in order, so a test can hold the app's search to it.
struct SearchCheck: Decodable, Hashable {
    let query: String
    let kind: EntryKind?
    let results: [String]
}

/// A food's row in the Mac's comparison table.
struct CompareFood: Decodable, Hashable, Identifiable {
    let slug: String
    let name: String
    let number: String
    let panel: [PanelRow]

    var id: String { slug }
}

/// One kind of entry, read from the bundled file the first time it is shown and kept for a while after.
final class EntryShelf<Entry: Decodable> {
    private final class Kept {
        let entry: Entry
        init(_ entry: Entry) { self.entry = entry }
    }

    private let file: DexFile
    private let kind: EntryKind
    private let kept = NSCache<NSString, Kept>()
    /// Every entry of this kind, in dex order.
    let slugs: [String]

    init(file: DexFile, kind: EntryKind, slugs: [String]) {
        self.file = file
        self.kind = kind
        self.slugs = slugs
        kept.countLimit = 300
    }

    /// - Returns: the entry, or nil when the Dex has none by that slug
    subscript(slug: String) -> Entry? {
        if let found = kept.object(forKey: slug as NSString) { return found.entry }
        do {
            guard let json = try file.entry(kind, slug) else { return nil }
            let entry = try JSONDecoder().decode(Entry.self, from: json)
            kept.setObject(Kept(entry), forKey: slug as NSString)
            return entry
        } catch {
            fatalError("the \(kind.rawValue) \(slug) in dex.sqlite does not match the app's model: \(error)")
        }
    }
}

final class Dex {
    private struct Head: Decodable {
        let version: String
        let disclaimer: Disclaimer
        let palette: Palette
        let skins: [DexSkin]
        let searchChecks: [SearchCheck]
    }

    let version: String
    let disclaimer: Disclaimer
    let palette: Palette
    /// The looks on offer, the one a new device starts on first.
    let skins: [DexSkin]
    /// Searches the web Dex ran, for the tests that hold the app's search to the web's.
    let searchChecks: [SearchCheck]
    let cards: [EntryCard]
    let reveals: [String: Reveal]
    let sources: [SourceUse]
    let ingredients: EntryShelf<IngredientEntry>
    let compounds: EntryShelf<CompoundEntry>
    let effects: EntryShelf<EffectEntry>
    private let file: DexFile
    private let artNames: [String: String]

    /// - Parameter file: the bundled data file
    init(file: DexFile) throws {
        let decoder = JSONDecoder()
        let head = try decoder.decode(Head.self, from: file.meta("head"))
        version = head.version
        disclaimer = head.disclaimer
        palette = head.palette
        skins = head.skins
        searchChecks = head.searchChecks
        let cards = try decoder.decode([EntryCard].self, from: file.meta("cards"))
        self.cards = cards
        reveals = try decoder.decode([String: Reveal].self, from: file.meta("reveals"))
        sources = try decoder.decode([SourceUse].self, from: file.meta("sources"))
        let slugs = { (kind: EntryKind) in cards.filter { $0.kind == kind }.map(\.slug) }
        ingredients = EntryShelf(file: file, kind: .ingredient, slugs: slugs(.ingredient))
        compounds = EntryShelf(file: file, kind: .compound, slugs: slugs(.compound))
        effects = EntryShelf(file: file, kind: .effect, slugs: slugs(.effect))
        artNames = Dictionary(uniqueKeysWithValues: cards.compactMap { card in card.art.map { (card.id, $0) } })
        self.file = file
    }

    /// Every food against every nutrient, read the first time the Mac's table opens.
    private(set) lazy var compare: [CompareFood] = {
        do {
            return try JSONDecoder().decode([CompareFood].self, from: file.meta("compare"))
        } catch {
            fatalError("the comparison table in dex.sqlite does not match the app's model: \(error)")
        }
    }()

    /// - Returns: the catalog name of an entry's creature
    func art(_ kind: EntryKind, _ slug: String) -> String {
        guard let name = artNames["\(kind.rawValue):\(slug)"] else {
            fatalError("the \(kind.rawValue) \(slug) has no creature in dex.sqlite: an effect has none, and every food and compound should")
        }
        return name
    }

    /// The data the app ships with. It is written at build time and checked by tests, so a file that
    /// cannot load is a broken build and stops loudly.
    static let bundled: Dex = {
        guard let url = Bundle.main.url(forResource: "dex", withExtension: "sqlite") else {
            fatalError("dex.sqlite is missing from the app: run npm run export:native")
        }
        do {
            return try Dex(file: DexFile(url: url))
        } catch {
            fatalError("dex.sqlite does not match the app's model: \(error)")
        }
    }()
}

extension Dex {
    /// - Returns: the skin with this id, or nil when this app does not have it
    func skin(id: String) -> DexSkin? {
        skins.first { $0.id == id }
    }

    /// - Returns: the foods whose having reveals this entry, in dex order
    func foods(revealing kind: EntryKind, _ slug: String) -> [EntryCard] {
        cards.filter { card in
            guard card.kind == .ingredient, let reveal = reveals[card.slug] else { return false }
            switch kind {
            case .ingredient: return card.slug == slug
            case .compound: return reveal.compounds.contains(slug)
            case .effect: return reveal.effects.contains(slug)
            }
        }
    }
}

enum DisclaimerGate {
    /// - Parameters:
    ///   - accepted: the version this device last accepted
    ///   - version: the running version
    /// - Returns: whether the notice shows
    static func needsAcceptance(accepted: String?, version: String) -> Bool {
        accepted != version
    }
}
