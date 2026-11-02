import AppKit
import Foundation
import Testing
@testable import NutriDexMac

@MainActor
private func freshStore() -> (EncounterStore, UserDefaults) {
    let defaults = UserDefaults(suiteName: "nutridex-tests-\(UUID().uuidString)")!
    return (EncounterStore(defaults: defaults), defaults)
}

@MainActor
struct EncounterTests {
    @Test func nothingIsRevealedAtFirst() {
        let (store, _) = freshStore()
        #expect(!store.isRevealed(.ingredient, "carrot"))
        #expect(!store.isRevealed(.compound, "beta-carotene"))
        #expect(!store.isRevealed(.effect, "vision"))
    }

    @Test func havingAFoodRevealsItAndWhatItCarriesAndDoes() {
        let (store, _) = freshStore()
        store.encounter(food: "carrot")
        #expect(store.isRevealed(.ingredient, "carrot"))
        #expect(store.isRevealed(.compound, "beta-carotene"))
        #expect(store.isRevealed(.compound, "zinc"))
        #expect(store.isRevealed(.effect, "vision"))
    }

    @Test func itRevealsNothingElse() {
        let (store, _) = freshStore()
        store.encounter(food: "carrot")
        #expect(!store.isRevealed(.ingredient, "kale"))
        #expect(!store.isRevealed(.compound, "curcumin"))
        #expect(!store.isRevealed(.effect, "nails"))
    }

    @Test func forgettingHidesOnlyWhatNoOtherFoodStillReveals() {
        let (store, _) = freshStore()
        store.encounter(food: "carrot")
        store.encounter(food: "sweet-potato")
        store.forget(food: "carrot")
        #expect(!store.isRevealed(.ingredient, "carrot"))
        #expect(store.isRevealed(.compound, "beta-carotene"))
    }

    @Test func itSurvivesARelaunch() {
        let (store, defaults) = freshStore()
        let when = Date(timeIntervalSince1970: 1_800_000_000)
        store.encounter(food: "carrot", on: when)
        let relaunched = EncounterStore(defaults: defaults)
        #expect(relaunched.isRevealed(.ingredient, "carrot"))
        #expect(relaunched.date(of: "carrot") == when)
    }

    @Test func progressCountsWhatIsRevealedOfEachKind() {
        let (store, _) = freshStore()
        #expect(store.progress(of: .ingredient) == (seen: 0, total: 15))
        store.encounter(food: "carrot")
        #expect(store.progress(of: .ingredient) == (seen: 1, total: 15))
        #expect(store.progress(of: .compound).seen == Dex.bundled.reveals["carrot"]?.compounds.count)
        #expect(store.progress(of: .effect).total == 29)
    }

    @Test func itSaysWhichFoodsRevealAnEntry() {
        let names = Dex.bundled.foods(revealing: .compound, "curcumin").map(\.slug)
        #expect(names == ["turmeric"])
        #expect(Dex.bundled.foods(revealing: .effect, "vision").map(\.slug).contains("carrot"))
    }

    @Test func aFilterShowsOnlyWhatItAsksFor() {
        let (store, _) = freshStore()
        store.encounter(food: "carrot")
        let foods = Dex.bundled.cards.filter { $0.kind == .ingredient }
        #expect(EncounterFilter.encountered.apply(foods, store: store).map(\.slug) == ["carrot"])
        #expect(EncounterFilter.notYet.apply(foods, store: store).count == 14)
        #expect(EncounterFilter.all.apply(foods, store: store).count == 15)
    }
}

@MainActor
struct DescriptionTests {
    @Test func everyEntrySaysSomethingBeforeItIsEncountered() {
        #expect(Dex.bundled.cards.allSatisfy { !$0.description.isEmpty })
    }
}

@MainActor
struct SilhouetteTests {
    /// - Returns: the alpha of one pixel of the asset drawn at 64 points
    private func alpha(of name: String, x: Int, y: Int) throws -> CGFloat {
        let image = try #require(NSImage(named: name))
        let bitmap = try #require(NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 64, pixelsHigh: 64, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0))
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
        image.draw(in: NSRect(x: 0, y: 0, width: 64, height: 64))
        NSGraphicsContext.restoreGraphicsState()
        return try #require(bitmap.colorAt(x: x, y: y)).alphaComponent
    }

    // At 64 points the tile starts near 2 with corners about 10 across, so (12, 12) is on the tile but
    // off every creature, and a true corner like (3, 3) would be clear even with the tile left in.
    @Test func aFoodsSilhouetteIsItsShapeNotASquare() throws {
        #expect(try alpha(of: "food-carrot", x: 12, y: 12) > 0.9)
        #expect(try alpha(of: "food-carrot-silhouette", x: 12, y: 12) == 0)
        #expect(try alpha(of: "food-carrot-silhouette", x: 32, y: 32) > 0.9)
    }

    @Test func aCompoundsSilhouetteIsItsShapeNotASquare() throws {
        #expect(try alpha(of: "compound-iron", x: 12, y: 12) > 0.9)
        #expect(try alpha(of: "compound-iron-silhouette", x: 12, y: 12) == 0)
        #expect(try alpha(of: "compound-iron-silhouette", x: 32, y: 32) > 0.9)
    }

    @Test func aSilhouetteDropsTheShadowUnderTheCreature() throws {
        #expect(try alpha(of: "food-carrot", x: 22, y: 57) > 0)
        #expect(try alpha(of: "food-carrot-silhouette", x: 22, y: 57) == 0)
    }

    @Test func everyFoodAndCompoundHasOne() {
        for card in Dex.bundled.cards where card.kind != .effect {
            #expect(NSImage(named: "\(card.creatureAssetName)-silhouette") != nil, "\(card.slug)")
        }
    }
}

@MainActor
struct CompareTests {
    private var foods: [IngredientEntry] { Array(Dex.bundled.ingredients.values) }

    private func amount(_ food: IngredientEntry, _ slug: String) -> Double? {
        food.panel.first { $0.slug == slug }?.amount
    }

    @Test func descendingPutsTheRichestFirst() throws {
        let sorted = foods.sorted(using: CompareOrder(.nutrient("vitamin-c"), order: .reverse))
        #expect(sorted.first?.ingredient.slug == "kale")
    }

    @Test func ascendingPutsTheLeastFirst() throws {
        let sorted = foods.sorted(using: CompareOrder(.nutrient("vitamin-c"), order: .forward))
        let lowest = try #require(sorted.first)
        let first = amount(lowest, "vitamin-c")
        #expect(first == sorted.compactMap { amount($0, "vitamin-c") }.min())
    }

    @Test func missingAmountsStayLastEitherWay() {
        let gaps = foods.flatMap { food in food.panel.filter { $0.amount == nil }.map(\.slug) }
        guard let slug = gaps.first else { return }
        for order in [SortOrder.forward, .reverse] {
            let sorted = foods.sorted(using: CompareOrder(.nutrient(slug), order: order))
            let values = sorted.map { amount($0, slug) }
            let firstMissing = values.firstIndex { $0 == nil }!
            #expect(values[firstMissing...].allSatisfy { $0 == nil })
        }
    }

    @Test func namesSortAlphabetically() {
        let sorted = foods.sorted(using: CompareOrder(.name, order: .forward))
        #expect(sorted.first?.ingredient.slug == "beet")
        #expect(sorted.last?.ingredient.slug == "watermelon")
    }
}
