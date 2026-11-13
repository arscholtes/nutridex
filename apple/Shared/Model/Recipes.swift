import Foundation

/// One ingredient of a recipe, as a row of its grid.
struct RecipeRow: Decodable, Hashable, Identifiable {
    let id: String
    let food: String
    let name: String
    let grams: Double
    let prepMethod: String
}

/// One block of a step's column: the rows it spans.
struct RecipeCell: Decodable, Hashable {
    let rowStart: Int
    let rowSpan: Int
    let part: Int
    let parts: Int
}

struct RecipeStep: Decodable, Hashable, Identifiable {
    let position: Int
    let title: String
    let prepMethod: String?
    let cells: [RecipeCell]

    var id: Int { position }
}

struct CookFood: Decodable, Hashable {
    let slug: String
    let grams: Double
    let prepMethod: String
}

/// What a stage does to one compound in one food. `keeps` is nil where no source gives an amount.
struct StageChange: Decodable, Hashable {
    let food: String
    let compound: String
    let method: String
    let keeps: Double?
    let note: String?
}

/// One stage of cooking along: a step, or one ingredient's own preparation in a recipe with no steps.
struct CookStage: Decodable, Hashable {
    let step: Int?
    let title: String?
    let prepMethod: String?
    let foods: [CookFood]
    let prep: [StageChange]

    /// The changes a source measures or describes.
    var sourced: [StageChange] { prep.filter { $0.keeps != nil || $0.note != nil } }
}

/// A food that cooking a recipe is a catch of, and in what form.
struct CookedFood: Decodable, Hashable {
    let food: String
    let form: String?
}

/// A recipe as the export worked it out: the grid, the cook-along stages and what cooking it records.
/// The apps draw it and judge nothing.
struct Recipe: Decodable, Hashable, Identifiable {
    let slug: String
    let name: String
    let servings: Int
    let rows: [RecipeRow]
    let steps: [RecipeStep]
    let stages: [CookStage]
    let cautions: [FoodCaution]
    let absorption: [AbsorptionTip]
    let cooked: [CookedFood]

    var id: String { slug }

    /// - Returns: the name the recipe gives a food
    func name(of food: String) -> String {
        rows.first { $0.food == food }?.name ?? food
    }

    /// - Returns: its foods this store has never had, each once, in the grid's order
    func notHad(in store: EncounterStore) -> [RecipeRow] {
        var seen = Set<String>()
        return rows.filter { store.records[$0.food] == nil && seen.insert($0.food).inserted }
    }
}
