import Foundation

// What the app shows, decoded from dex.json. `npm run export:native` writes that file from the same
// functions the web Dex reads through, so this layer decodes judgments and never makes them.

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

    var id: String { "\(kind.rawValue):\(slug)" }
    var route: DexRoute { .entry(kind, slug) }
    var creatureAssetName: String { EntryKind.assetName(kind, slug) }
}

extension EntryKind {
    /// - Returns: the catalog name of an entry's creature, matching the export script
    static func assetName(_ kind: EntryKind, _ slug: String) -> String {
        "\(kind == .ingredient ? "food" : kind.rawValue)-\(slug)"
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

struct Dex: Decodable {
    let version: String
    let disclaimer: Disclaimer
    let palette: Palette
    let cards: [EntryCard]
    let ingredients: [String: IngredientEntry]
    let compounds: [String: CompoundEntry]
    let effects: [String: EffectEntry]
    let sources: [SourceUse]

    /// The data the app ships with. It is written at build time and checked by tests, so a file that
    /// cannot load is a broken build and stops loudly.
    static let bundled: Dex = {
        guard let url = Bundle.main.url(forResource: "dex", withExtension: "json") else {
            fatalError("dex.json is missing from the app: run npm run export:native")
        }
        do {
            return try JSONDecoder().decode(Dex.self, from: Data(contentsOf: url))
        } catch {
            fatalError("dex.json does not match the app's model: \(error)")
        }
    }()
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
