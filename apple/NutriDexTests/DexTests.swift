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
        #expect(count(.compound) == 41)
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
        #expect(carotenoids == ["alpha-carotene", "beta-carotene", "lutein-zeaxanthin", "lycopene"])
    }

    @Test func aSearchKeepsEachEntrysNumber() {
        #expect(DexSearch.filter(cards, query: "carrot", kind: .ingredient, type: nil).first?.number == "F006")
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

    @Test func aMeterIsEmptyAtExactlyZero() {
        #expect(Meter.litSegments(share: 0, total: 20) == 0)
    }

    @Test func aMeterKeepsASliverForATinyAmount() {
        #expect(Meter.litSegments(share: 0.001, total: 20) == 1)
    }

    @Test func aMeterFillsInProportion() {
        #expect(Meter.litSegments(share: 0.5, total: 20) == 10)
        #expect(Meter.litSegments(share: 1, total: 20) == 20)
    }

    @Test func aChebiIdIsAnIdentifierNotAQuantity() throws {
        let vitaminC = try #require(Dex.bundled.compounds["vitamin-c"])
        #expect(vitaminC.compound.chebiLabel == "CHEBI:29073")
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

    @Test func aFoodsClaimsGroupByEffect() throws {
        let carrot = try #require(Dex.bundled.ingredients["carrot"])
        let groups = carrot.effects.groupedByEffect()
        #expect(Set(groups.map(\.effect.slug)).count == groups.count)
        #expect(groups.contains { $0.effect.slug == "vision" })
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
