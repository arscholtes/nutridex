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
        #expect(store.isRevealed(.compound, "vitamin-a"))
        #expect(store.isRevealed(.effect, "vision"))
    }

    @Test func itRevealsNothingElse() {
        let (store, _) = freshStore()
        store.encounter(food: "carrot")
        #expect(!store.isRevealed(.ingredient, "kale"))
        #expect(!store.isRevealed(.compound, "curcumin"))
        #expect(!store.isRevealed(.compound, "zinc"))
        #expect(!store.isRevealed(.effect, "nails"))
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

/// Stands in for the server, recording what it is sent.
private final class StubTransport: EncounterTransport {
    var uploads: [[String]] = []
    var serverFoods: [String] = []
    var failure: EncounterProblem?

    func upload(_ items: [UploadItem]) async throws -> UploadResponse {
        if let failure { throw failure }
        uploads.append(items.map(\.food))
        let added = items.map(\.food).filter { !serverFoods.contains($0) }
        serverFoods += added
        return UploadResponse(new: added, encounters: serverFoods.map(Self.row))
    }

    func fetch() async throws -> [ServerEncounter] {
        if let failure { throw failure }
        return serverFoods.map(Self.row)
    }

    private static func row(_ food: String) -> ServerEncounter {
        ServerEncounter(food: food, encounteredAt: "2026-11-02T12:00:00.000Z", uploadedAt: "2026-11-02T12:05:00.000Z")
    }
}

@MainActor
private func freshGame() -> (DexGame, StubTransport, UserDefaults) {
    let defaults = UserDefaults(suiteName: "nutridex-tests-\(UUID().uuidString)")!
    let transport = StubTransport()
    return (DexGame(store: EncounterStore(defaults: defaults), transport: transport), transport, defaults)
}

@MainActor
struct UploadTests {
    @Test func aNewEncounterWaitsUntilYouUpload() {
        let (game, transport, _) = freshGame()
        game.store.encounter(food: "carrot")
        #expect(game.store.pending.map(\.food) == ["carrot"])
        #expect(transport.uploads.isEmpty)
        #expect(game.store.isRevealed(.ingredient, "carrot"))
    }

    @Test func uploadSendsOnlyWhatIsNewAsOneArray() async {
        let (game, transport, _) = freshGame()
        game.store.encounter(food: "carrot")
        await game.upload()
        game.store.encounter(food: "kale")
        game.store.encounter(food: "egg")
        await game.upload()
        #expect(transport.uploads == [["carrot"], ["egg", "kale"]])
        #expect(game.store.pending.isEmpty)
    }

    @Test func nothingNewSendsNothing() async {
        let (game, transport, _) = freshGame()
        await game.upload()
        #expect(transport.uploads.isEmpty)
    }

    @Test func aFailedUploadKeepsEverythingAndSaysWhy() async {
        let (game, transport, _) = freshGame()
        game.store.encounter(food: "carrot")
        transport.failure = EncounterProblem("The home database did not answer.")
        await game.upload()
        #expect(game.store.pending.map(\.food) == ["carrot"])
        #expect(game.uploadError == "The home database did not answer.")
        #expect(game.unlocking == nil)
        transport.failure = nil
        await game.upload()
        #expect(game.uploadError == nil)
        #expect(game.store.pending.isEmpty)
    }
}

@MainActor
struct UnlockTests {
    @Test func uploadingPlaysEachNewFoodThenNextReturnsYouToTheScreen() async {
        let (game, _, _) = freshGame()
        game.store.encounter(food: "carrot")
        game.store.encounter(food: "kale")
        await game.upload()
        #expect(game.unlocking?.slug == "carrot")
        #expect(game.unlockProgress == (position: 1, total: 2))
        game.next()
        #expect(game.unlocking?.slug == "kale")
        #expect(game.unlockProgress == (position: 2, total: 2))
        game.next()
        #expect(game.unlocking == nil)
    }

    @Test func gettingOnTheComputerPlaysWhatArrivedFromAnotherDevice() async {
        let (game, transport, _) = freshGame()
        transport.serverFoods = ["egg"]
        await game.sync()
        #expect(game.store.isRevealed(.ingredient, "egg"))
        #expect(game.unlocking?.slug == "egg")
    }

    @Test func anUnlockPlaysOnlyOnce() async {
        let (game, transport, _) = freshGame()
        transport.serverFoods = ["egg"]
        await game.sync()
        game.next()
        await game.sync()
        #expect(game.unlocking == nil)
    }

    @Test func oneYouClosedTheAppOnStillPlaysNextTime() async {
        let (game, transport, defaults) = freshGame()
        transport.serverFoods = ["egg"]
        await game.sync()
        let relaunched = DexGame(store: EncounterStore(defaults: defaults), transport: transport)
        await relaunched.sync()
        #expect(relaunched.unlocking?.slug == "egg")
    }

    @Test func aFinishedOneStaysFinishedAfterARelaunch() async {
        let (game, transport, defaults) = freshGame()
        transport.serverFoods = ["egg"]
        await game.sync()
        game.next()
        let relaunched = DexGame(store: EncounterStore(defaults: defaults), transport: transport)
        await relaunched.sync()
        #expect(relaunched.unlocking == nil)
        #expect(relaunched.store.isRevealed(.ingredient, "egg"))
    }

    @Test func aFailedSyncChangesNothingAndSaysSo() async {
        let (game, transport, _) = freshGame()
        game.store.encounter(food: "carrot")
        transport.failure = EncounterProblem("The home database did not answer.")
        await game.sync()
        #expect(game.store.isRevealed(.ingredient, "carrot"))
        #expect(game.syncProblem == "The home database did not answer.")
    }

    @Test func aSyncDoesNotInterruptAnAnimationAlreadyPlaying() async {
        let (game, transport, _) = freshGame()
        transport.serverFoods = ["egg"]
        await game.sync()
        transport.serverFoods = ["egg", "kale"]
        await game.sync()
        #expect(game.unlocking?.slug == "egg")
        game.next()
        #expect(game.unlocking?.slug == "kale")
    }
}

@MainActor
struct VisibilityTests {
    private func visibility(_ foods: [String]) -> DexVisibility {
        let (store, _) = freshStore()
        for food in foods { store.encounter(food: food) }
        return DexVisibility(store: store)
    }

    @Test func nothingShowsBeforeYouEncounterIt() {
        let v = visibility([])
        #expect(!v.shows(.ingredient, "carrot"))
        #expect(!v.shows(.compound, "beta-carotene"))
        #expect(!v.shows(.effect, "vision"))
    }

    @Test func theMacSeesEverything() {
        #expect(DexVisibility.everything.shows(.ingredient, "carrot"))
        #expect(DexVisibility.everything.isEverything)
    }

    @Test func aTraceDoesNotUnlockANutrient() {
        let v = visibility(["carrot"])
        #expect(v.shows(.compound, "vitamin-a"))
        #expect(!v.shows(.compound, "zinc"))
    }

    @Test func steppingSkipsWhatIsHidden() throws {
        let v = visibility(["beet", "carrot", "watermelon"])
        let carrot = try #require(Dex.bundled.ingredients["carrot"])
        let pager = v.pager(carrot.pager, kind: .ingredient)
        #expect(pager.prev?.slug == "beet")
        #expect(pager.next?.slug == "watermelon")
        #expect(pager.number == "F006")
    }

    @Test func aCardDropsAStatNamingAHiddenFood() throws {
        let v = visibility(["carrot"])
        let beta = try #require(Dex.bundled.cards.first { $0.slug == "beta-carotene" })
        #expect(v.stats(of: beta).joined().contains("Sweet potato") == false)
        #expect(!v.stats(of: beta).isEmpty)
        let everything = DexVisibility.everything.stats(of: beta).joined()
        #expect(everything.contains("Sweet potato"))
    }

    @Test func aRichestFoodIsNamedOnlyOnceYouHaveHadIt() throws {
        let carrot = try #require(Dex.bundled.ingredients["carrot"]?.compounds.first { $0.slug == "beta-carotene" })
        #expect(visibility(["carrot"]).richest(of: carrot) == nil)
        #expect(visibility(["carrot", "sweet-potato"]).richest(of: carrot)?.slug == "sweet-potato")
    }

    @Test func sourcesAreOnlyThoseBehindWhatIsUnlocked() {
        #expect(visibility([]).sources.isEmpty)
        let carrot = visibility(["carrot"]).sources.map(\.title).joined()
        #expect(carrot.contains("Carrots"))
        #expect(!carrot.contains("Kale"))
        #expect(DexVisibility.everything.sources.count == Dex.bundled.sources.count)
    }

    @Test func everythingCanBeUnlocked() {
        let v = visibility(Array(Dex.bundled.ingredients.keys))
        #expect(Dex.bundled.cards.filter { !v.shows($0.kind, $0.slug) }.map(\.slug) == [])
    }
}

@MainActor
struct WireFormatTests {
    @Test func anUploadIsAnArrayOfFoodsAndDatesTheServerAccepts() throws {
        let item = UploadItem(food: "carrot", encounteredAt: Date(timeIntervalSince1970: 1_800_000_000))
        let body = try JSONSerialization.jsonObject(with: JSONEncoder().encode(UploadBody(encounters: [item]))) as? [String: [[String: String]]]
        #expect(body?["encounters"]?.first?["food"] == "carrot")
        #expect(body?["encounters"]?.first?["encounteredAt"] == "2027-01-15T08:00:00.000Z")
    }

    @Test func aServerDateReadsBack() {
        #expect(UploadItem.dateFormat.date(from: "2026-11-02T12:00:00.000Z") != nil)
    }

    /// Runs against a real server when asked: TEST_RUNNER_NUTRIDEX_LIVE_TEST=1 xcodebuild test
    @Test(.enabled(if: ProcessInfo.processInfo.environment["NUTRIDEX_LIVE_TEST"] == "1"))
    func theRealServerTakesAnUpload() async throws {
        let transport = HTTPEncounterTransport.configured
        let response = try await transport.upload([UploadItem(food: "olive-oil", encounteredAt: .now)])
        #expect(response.encounters.contains { $0.food == "olive-oil" })
        #expect(try await transport.fetch().contains { $0.food == "olive-oil" })
    }
}
