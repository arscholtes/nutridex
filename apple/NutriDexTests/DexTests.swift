import Compression
import Foundation
import Testing
import UIKit
@testable import NutriDex

@MainActor
struct SnapshotTests {
    let dex = Dex.bundled

    @Test func holdsEveryEntryTheWebDexHas() {
        let count = { (kind: EntryKind) in dex.cards.filter { $0.kind == kind }.count }
        #expect(count(.ingredient) == 15)
        #expect(count(.compound) == 152)
        #expect(count(.effect) == 29)
        #expect(!dex.version.isEmpty)
    }

    @Test func aFoodCarriesItsNumberAndNeighbours() throws {
        let carrot = try #require(dex.ingredients["carrot"])
        #expect(carrot.pager.number == "F006")
        #expect(carrot.pager.prev?.slug == "cantaloupe")
        #expect(carrot.pager.next?.slug == "egg")
    }

    @Test func keepsTheEnginesJudgments() throws {
        let carrot = try #require(dex.ingredients["carrot"])
        #expect(carrot.absorption.contains { $0.flag.status == "missed" })
        #expect(carrot.effects.contains { $0.effect.slug == "vision" })
        #expect(!carrot.effects.contains { $0.compound.slug == "zinc" })
    }

    @Test func aCompoundSaysWhatItDoes() throws {
        let vitaminC = try #require(dex.compounds["vitamin-c"])
        #expect(vitaminC.effects.contains { $0.effect.slug == "immune-system" })
        #expect(vitaminC.compound.compoundClass == "vitamin")
    }

    @Test func anEffectListsOnlyFoodsClearingTheBar() throws {
        let immune = try #require(dex.effects["immune-system"])
        let vitaminC = try #require(immune.foods.first { $0.compound.slug == "vitamin-c" })
        #expect(vitaminC.bar == 12)
        #expect(vitaminC.ranked.contains { $0.slug == "kale" })
        #expect(!vitaminC.ranked.contains { $0.slug == "carrot" })
    }

    @Test func readsOneEntryWhenAskedFromWhatTheExportCompressed() throws {
        let file = try DexFile(url: try #require(Bundle.main.url(forResource: "dex", withExtension: "sqlite")))
        let carrot = try JSONDecoder().decode(IngredientEntry.self, from: try #require(try file.entry(.ingredient, "carrot")))
        #expect(carrot.ingredient.name == "Carrot")
        #expect(try file.entry(.ingredient, "not-a-food") == nil)
    }

    @Test func refusesAPartThatInflatesToTheWrongSize() throws {
        let json = Data(#"{"a":"carrot carrot carrot"}"#.utf8)
        var body = Data(count: json.count + 64)
        let written = body.withUnsafeMutableBytes { dst in
            json.withUnsafeBytes { src in
                compression_encode_buffer(dst.bindMemory(to: UInt8.self).baseAddress!, dst.count, src.bindMemory(to: UInt8.self).baseAddress!, json.count, nil, COMPRESSION_ZLIB)
            }
        }
        body = body.prefix(written)
        #expect(try DexFile.inflate(body, size: json.count) == json)
        #expect(throws: DexFileError.self) { try DexFile.inflate(body, size: json.count + 1) }
    }

    @Test func aCardCarriesTheSourcesBehindItsEntry() throws {
        let card = try #require(dex.cards.first { $0.kind == .ingredient && $0.slug == "carrot" })
        let carrot = try #require(dex.ingredients["carrot"])
        #expect(!card.sources.isEmpty)
        #expect(Set(card.sources) == Set(carrot.sources.map(\.id)))
    }

    @Test func everyFoodAndCompoundHasCreatureArtInTheCatalog() {
        for card in dex.cards where card.kind != .effect {
            #expect(UIImage(named: card.creatureAssetName) != nil, "\(card.slug)")
        }
    }

    @Test func aTypeHasItsColourAndAnUntypedEntryStillHasOne() {
        #expect(dex.palette.swatch(for: "vegetable").color == "#43B05C")
        #expect(dex.palette.swatch(for: nil).color == dex.palette.untyped.color)
        #expect(dex.palette.swatch(for: "not-a-type").color == dex.palette.untyped.color)
    }

    @Test func theNoticeSaysASettingNotACookie() {
        let words = dex.disclaimer.sections.map(\.body).joined(separator: " ").lowercased()
        #expect(words.contains("a setting on this device"))
        #expect(!words.contains("cookie"))
    }
}

@MainActor
struct SearchTests {
    let cards = Dex.bundled.cards

    @Test func nothingSearchedListsEverythingInOrder() {
        let found = DexSearch.filter(cards, query: "", kind: nil, type: nil)
        #expect(found.count == cards.count)
        #expect(found.first?.slug == "beet")
    }

    @Test func aMisspellingFindsTheFoodAsOnTheWeb() {
        #expect(DexSearch.filter(cards, query: "tumeric", kind: nil, type: nil).first?.slug == "turmeric")
    }

    @Test func wordsInTheNameWinOverCloseSpellings() {
        let found = DexSearch.filter(cards, query: "skin", kind: nil, type: nil).map(\.slug)
        #expect(found.contains("skin"))
        #expect(found.contains("skin-color"))
        #expect(!found.contains("canned-pumpkin-puree"))
    }

    @Test func nothingCloseFindsNothing() {
        #expect(DexSearch.filter(cards, query: "qqqqqq", kind: nil, type: nil).isEmpty)
    }

    @Test func filtersByKindAndType() {
        let carotenoids = DexSearch.filter(cards, query: "", kind: .compound, type: "carotenoid").map(\.slug).sorted()
        #expect(carotenoids == ["alpha-carotene", "beta-carotene", "beta-cryptoxanthin", "lutein-zeaxanthin", "lycopene"])
    }

    @Test func aSearchKeepsEachEntrysNumber() {
        #expect(DexSearch.filter(cards, query: "carrot", kind: .ingredient, type: nil).first?.number == "F006")
    }

    @Test func ranksEverySearchAsTheWebDoes() {
        let dex = Dex.bundled
        #expect(dex.searchChecks.count > 3)
        for check in dex.searchChecks {
            let found = DexSearch.filter(dex.cards, query: check.query, kind: check.kind, type: nil).map(\.id)
            #expect(found == check.results, "\(check.query) in \(check.kind?.rawValue ?? "everything")")
        }
    }

    @Test func aMisspellingScoresAsTheWebComments() {
        #expect(abs(DexSearch.wordSimilarity("tumeric", in: "Turmeric") - 0.55) < 0.02)
        #expect(DexSearch.wordSimilarity("tumeric", in: "Tomato paste") < 0.2)
    }
}

@MainActor
struct DisclaimerTests {
    @Test func someoneWhoNeverAcceptedSeesIt() {
        #expect(DisclaimerGate.needsAcceptance(accepted: nil, version: "0.3.0"))
    }

    @Test func thisVersionAcceptedHidesIt() {
        #expect(!DisclaimerGate.needsAcceptance(accepted: "0.3.0", version: "0.3.0"))
    }

    @Test func anUpdateBringsItBack() {
        #expect(DisclaimerGate.needsAcceptance(accepted: "0.2.0", version: "0.3.0"))
    }
}

@MainActor
struct NavigationTests {
    let carrot = DexRoute.entry(.ingredient, "carrot")
    let egg = DexRoute.entry(.ingredient, "egg")

    @Test func onAPhoneStepReplacesTheEntryOnTop() {
        let nav = DexNavigator()
        nav.path = [carrot]
        nav.step(to: egg)
        #expect(nav.path == [egg])
    }

    @Test func onAnIPadStepMovesTheSelection() {
        let nav = DexNavigator()
        nav.selection = carrot
        nav.step(to: egg)
        #expect(nav.selection == egg)
        #expect(nav.path.isEmpty)
    }

    @Test func stepKeepsWhatCameBefore() {
        let nav = DexNavigator()
        nav.path = [carrot, carrot]
        nav.step(to: egg)
        #expect(nav.path == [carrot, egg])
    }

    @Test func backToTheListClearsEverything() {
        let nav = DexNavigator()
        nav.selection = carrot
        nav.path = [egg]
        nav.backToList()
        #expect(nav.selection == nil)
        #expect(nav.path.isEmpty)
    }

    @Test func choosingFromTheSidebarStartsAFreshStack() {
        let nav = DexNavigator()
        nav.path = [egg]
        nav.choose(carrot)
        #expect(nav.selection == carrot)
        #expect(nav.path.isEmpty)
    }
}

@MainActor
struct DisplayTests {
    @Test func amountsReadAsOnTheWeb() {
        #expect(formatAmount(8285, unit: "µg") == "8,285 µg")
        #expect(formatAmount(0.24, unit: "mg") == "0.24 mg")
        #expect(formatAmount(21, unit: "mg") == "21 mg")
        #expect(formatAmount(0.123456, unit: "g") == "0.12 g")
    }

    @Test func anUnlockCountsInPlainEnglish() {
        #expect(UnlockOverlay.summary(compounds: 10, effects: 1) == "It reveals 10 compounds and 1 effect.")
        #expect(UnlockOverlay.summary(compounds: 1, effects: 2) == "It reveals 1 compound and 2 effects.")
    }

    @Test func aMeterIsEmptyAtExactlyZero() {
        #expect(Meter.fill(share: 0) == 0)
    }

    @Test func aMeterKeepsASliverForATinyAmount() {
        #expect(Meter.fill(share: 0.001) == 0.02)
    }

    @Test func theHandheldsMeterLightsSegmentsOnTheSameTerms() {
        #expect(Meter.litSegments(share: 0, total: 20) == 0)
        #expect(Meter.litSegments(share: 0.001, total: 20) == 1)
        #expect(Meter.litSegments(share: 0.5, total: 20) == 10)
    }

    @Test func aMeterFillsInProportion() {
        #expect(Meter.fill(share: 0.5) == 0.5)
        #expect(Meter.fill(share: 1) == 1)
    }

    @Test func aChebiIdIsAnIdentifierNotAQuantity() throws {
        let betaCarotene = try #require(Dex.bundled.compounds["beta-carotene"])
        #expect(betaCarotene.compound.chebiLabel == "CHEBI:17579")
    }

    @Test func aRowThatJustFitsStaysOneRow() {
        let sizes = [CGSize(width: 100, height: 20), CGSize(width: 20, height: 20)]
        #expect(FlowRow.rowCount(sizes: sizes, spacing: 6, maxWidth: 126) == 1)
        // A layout pass can hand back its own width rounded down by a sliver.
        #expect(FlowRow.rowCount(sizes: sizes, spacing: 6, maxWidth: 125.9999) == 1)
    }

    @Test func aRowThatDoesNotFitWraps() {
        let sizes = [CGSize(width: 100, height: 20), CGSize(width: 20, height: 20)]
        #expect(FlowRow.rowCount(sizes: sizes, spacing: 6, maxWidth: 120) == 2)
    }

    @Test func aHexColourBecomesItsChannels() {
        let c = RGB(hex: "#D3222A")
        #expect(abs(c.red - 211.0 / 255) < 0.001)
        #expect(abs(c.green - 34.0 / 255) < 0.001)
        #expect(abs(c.blue - 42.0 / 255) < 0.001)
    }

    @Test func aFoodsEffectsComeAsOneTilePerEffect() throws {
        let carrot = try #require(Dex.bundled.ingredients["carrot"])
        #expect(Set(carrot.tiles.map(\.effect.slug)).count == carrot.tiles.count)
        #expect(carrot.tiles.contains { $0.effect.slug == "vision" })
    }

    @Test func theTileWithMostOfYourDailyAmountLeadsAndIsLargest() throws {
        let carrot = try #require(Dex.bundled.ingredients["carrot"])
        #expect(carrot.tiles.first?.size == "large")
        #expect(carrot.tiles.filter { $0.size == "large" }.count == 1)
    }

    @Test func tilesFillGapsWithTheNextThatFits() {
        let small = BentoLayout.span(of: "small")
        let wide = BentoLayout.span(of: "wide")
        let placed = BentoLayout.place([small, wide, small], columns: 2)
        #expect(placed.cells == [.init(column: 0, row: 0), .init(column: 0, row: 1), .init(column: 1, row: 0)])
        #expect(placed.rows == 2)
    }

    @Test func aLargeTileTakesTwoRowsAndTwoColumns() {
        let placed = BentoLayout.place([BentoLayout.span(of: "large"), BentoLayout.span(of: "small")], columns: 2)
        #expect(placed.cells == [.init(column: 0, row: 0), .init(column: 0, row: 2)])
        #expect(placed.rows == 3)
    }

    @Test func everyRowStaysItsUsualHeightWhenTheWordsFit() {
        #expect(BentoLayout.rowHeight(needed: [120, 150], minimum: 156) == 156)
    }

    @Test func everyRowGrowsToFitTheTallestWords() {
        #expect(BentoLayout.rowHeight(needed: [120, 190], minimum: 156) == 190)
    }

    @Test func moreRoomMeansMoreColumns() {
        #expect(BentoLayout.columns(for: 370) == 2)
        #expect(BentoLayout.columns(for: 700) == 4)
        #expect(BentoLayout.columns(for: 1000) == 6)
    }

    @Test func aCompoundsClaimsGroupBySourceSoItIsCitedOnce() throws {
        let vitaminC = try #require(Dex.bundled.compounds["vitamin-c"])
        let groups = vitaminC.effects.groupedBySource()
        #expect(groups.count == 1)
        #expect(groups[0].claims.count > 5)
    }

    @Test func aSourcesSharedBarIsShownOnce() throws {
        let vitaminC = try #require(Dex.bundled.compounds["vitamin-c"])
        #expect(vitaminC.effects.groupedBySource()[0].sharedDoseContext != nil)
        let immune = try #require(Dex.bundled.effects["immune-system"])
        #expect(immune.compounds.groupedBySource()[0].sharedDoseContext == nil)
    }
}
