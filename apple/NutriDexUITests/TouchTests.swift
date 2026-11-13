import Compression
import SQLite3
import XCTest

/// Drives the app the way a thumb does, from a throwaway record, so nothing reaches anyone's real one.
final class TouchTests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    /// The version and skins from the file the app bundles. A UI test cannot reach into the app, so it
    /// reads the same file from the repo.
    private var head: [String: Any] {
        get throws {
            let path = URL(filePath: #filePath).deletingLastPathComponent().deletingLastPathComponent().appending(path: "Shared/Resources/dex.sqlite").path
            var db: OpaquePointer?
            defer { sqlite3_close(db) }
            var statement: OpaquePointer?
            defer { sqlite3_finalize(statement) }
            guard sqlite3_open_v2(path, &db, SQLITE_OPEN_READONLY, nil) == SQLITE_OK,
                  sqlite3_prepare_v2(db, "select size, body from meta where key = 'head'", -1, &statement, nil) == SQLITE_OK,
                  sqlite3_step(statement) == SQLITE_ROW, let bytes = sqlite3_column_blob(statement, 1)
            else {
                XCTFail("cannot read \(path): run npm run export:native")
                throw CocoaError(.fileReadUnknown)
            }
            let size = Int(sqlite3_column_int64(statement, 0))
            var json = Data(count: size)
            let written = json.withUnsafeMutableBytes { dst in
                compression_decode_buffer(dst.bindMemory(to: UInt8.self).baseAddress!, size, bytes.assumingMemoryBound(to: UInt8.self), Int(sqlite3_column_bytes(statement, 1)), nil, COMPRESSION_ZLIB)
            }
            XCTAssertEqual(written, size, "the bundled head did not inflate whole")
            return try XCTUnwrap(JSONSerialization.jsonObject(with: json) as? [String: Any])
        }
    }

    /// The version the disclaimer was accepted at.
    private var version: String {
        get throws { try XCTUnwrap(head["version"] as? String) }
    }

    /// Every skin's id.
    private var skins: [String] {
        get throws { try XCTUnwrap(head["skins"] as? [[String: Any]]).compactMap { $0["id"] as? String } }
    }

    private func launch(foods: String = "carrot,kale,egg", route: String? = nil, skin: String? = nil) throws -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = try ["-acceptedDisclaimerVersion", version, "-debugEncountered", foods] + (route.map { ["-debugRoute", $0] } ?? []) + (skin.map { ["-skin", $0] } ?? [])
        app.launch()
        return app
    }

    /// Fails unless the element comes fully within reach of a finger.
    private func expectInReach(_ element: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        let inReach = expectation(for: NSPredicate(format: "isHittable == true"), evaluatedWith: element)
        wait(for: [inReach], timeout: 5)
    }

    /// Saves what the screen shows, when a run asks for pictures.
    private func picture(_ name: String) {
        guard let folder = ProcessInfo.processInfo.environment["SHOT_DIR"] else { return }
        try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(filePath: folder).appending(path: "\(name).png"))
    }

    private func heading(_ app: XCUIApplication, _ name: String) -> XCUIElement {
        app.staticTexts.matching(NSPredicate(format: "label == %@", name)).firstMatch
    }

    func testCookingAlongWithTheJuiceGoesStageByStageAndCountsEveryFoodInIt() throws {
        let app = try launch(foods: "carrot")
        app.buttons["Recipes"].firstMatch.tap()
        expectInReach(heading(app, "Recipes"))
        XCTAssertTrue(app.staticTexts["3 foods you have never had"].exists, "the list does not say what is new in the juice")
        picture("recipes")
        app.staticTexts["Juice"].firstMatch.tap()
        expectInReach(app.buttons["Cook along"])
        XCTAssertEqual(app.staticTexts.matching(NSPredicate(format: "label == %@", "Not had yet")).count, 3, "a food never had is not marked")
        picture("recipe-juice")
        app.buttons["Cook along"].tap()
        expectInReach(heading(app, "Before you start"))
        picture("cook-gather")
        app.buttons["Start"].tap()
        expectInReach(heading(app, "Granny Smith apple: juiced"))
        picture("cook-stage")
        // A sideways swipe moves on, as the button does.
        app.swipeLeft()
        expectInReach(heading(app, "Carrot: juiced"))
        app.buttons["Next"].tap()
        app.buttons["Next"].tap()
        expectInReach(heading(app, "Kale: juiced"))
        app.buttons["Finish"].tap()
        expectInReach(app.buttons["I cooked it"])
        app.buttons["I cooked it"].tap()
        expectInReach(heading(app, "Counted"))
        picture("cook-counted")
        app.buttons["Back to the recipe"].tap()
        expectInReach(app.buttons["Cook along"])
        XCTAssertEqual(app.staticTexts.matching(NSPredicate(format: "label == %@", "Not had yet")).count, 0, "cooking it did not count its foods as had")
    }

    func testSwipingLeftMovesToTheNextEntryYouHaveUnlocked() throws {
        let app = try launch(route: "ingredient/carrot")
        expectInReach(heading(app, "Carrot"))
        picture("entry-carrot")
        app.swipeLeft()
        expectInReach(heading(app, "Egg"))
        picture("entry-egg")
        app.swipeLeft()
        expectInReach(heading(app, "Kale"))
        picture("entry-kale")
    }

    func testAnEntryComesToRestAtTheStartOfTheSpaceItHas() throws {
        // A skin whose titles start at the left edge, so where a title sits says where the page came to rest.
        let app = try launch(route: "ingredient/carrot", skin: "iridescent")
        expectInReach(heading(app, "Carrot"))
        // On an iPad the sidebar holds the sources button; on a phone there is no sidebar on this screen.
        let sidebar = app.buttons["Sources"]
        let start = sidebar.exists ? sidebar.frame.maxX : 0
        let titleIsHome = { (name: String) in
            app.staticTexts.matching(NSPredicate(format: "label == %@", name)).allElementsBoundByIndex.contains {
                $0.frame.minX >= start && $0.frame.minX < start + 60
            }
        }
        XCTAssertTrue(titleIsHome("Carrot"), "the first page is not where it should rest")
        app.swipeLeft()
        sleep(1)
        picture("entry-after-swipe")
        XCTAssertTrue(titleIsHome("Egg"), "the next page is not where it should rest")
    }

    func testSwipingRightMovesBack() throws {
        let app = try launch(route: "ingredient/egg")
        expectInReach(heading(app, "Egg"))
        app.swipeRight()
        expectInReach(heading(app, "Carrot"))
    }

    func testSwipingStopsAtTheLastEntryYouHaveUnlocked() throws {
        let app = try launch(route: "ingredient/kale")
        expectInReach(heading(app, "Kale"))
        app.swipeLeft()
        expectInReach(heading(app, "Kale"))
    }

    func testSwipingNeverReachesAFoodYouHaveNotHad() throws {
        let app = try launch(foods: "carrot,kale", route: "ingredient/carrot")
        expectInReach(heading(app, "Carrot"))
        app.swipeLeft()
        expectInReach(heading(app, "Kale"))
        XCTAssertFalse(heading(app, "Egg").exists)
    }

    func testBackReturnsToTheList() throws {
        try XCTSkipIf(UIDevice.current.userInterfaceIdiom == .pad, "An iPad keeps the list beside the entry, so there is nothing to go back to.")
        let app = try launch(route: "ingredient/carrot")
        expectInReach(heading(app, "Carrot"))
        app.navigationBars.buttons.firstMatch.tap()
        expectInReach(app.textFields["What did you have?"])
    }

    func testTappingACardOpensIt() throws {
        let app = try launch()
        picture("home")
        // A card reads as one element to VoiceOver, so its label holds more than the name.
        let card = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Carrot")).firstMatch
        expectInReach(card)
        card.tap()
        expectInReach(heading(app, "Carrot"))
        XCTAssertTrue(app.staticTexts["What it does"].exists)
    }

    private func wear(_ skin: String, on app: XCUIApplication) {
        let open = app.buttons["Skins"]
        expectInReach(open)
        open.tap()
        let choice = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", skin)).firstMatch
        // The list only makes what is near the screen, so one further down has to be scrolled to before it exists.
        for _ in 0..<8 where !(choice.exists && choice.isHittable) { app.swipeUp() }
        expectInReach(choice)
        choice.tap()
    }

    /// Every skin has to show the cards, open an entry, swipe, and reach what it does.
    func testEverySkinShowsTheCardsOpensAnEntryAndSwipes() throws {
        for skin in try skins {
            let app = try launch(skin: skin)
            sleep(1)
            picture("skin-\(skin)-home")
            let card = UIDevice.current.userInterfaceIdiom == .phone
                ? app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Carrot")).firstMatch
                : heading(app, "Carrot")
            expectInReach(card)
            card.tap()
            expectInReach(heading(app, "Carrot"))
            sleep(1)
            picture("skin-\(skin)-entry")
            app.swipeLeft()
            expectInReach(heading(app, "Egg"))
            app.terminate()
        }
    }

    func testTheLastSkinInTheListCanBeReachedAndWorn() throws {
        let app = try launch()
        let last = "Arcade"
        wear(last, on: app)
        sleep(1)
        picture("skins-list-after-arcade")
        let worn = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", last)).firstMatch
        expectInReach(worn)
        XCTAssertTrue(worn.isSelected)
    }

    func testNewAgeHasNoDPad() throws {
        let app = try launch(route: "ingredient/carrot")
        expectInReach(heading(app, "Carrot"))
        XCTAssertFalse(app.buttons["Back to the list"].exists)
    }

    func testTheYellowVersionBringsBackTheDPadAndStillSwipes() throws {
        let app = try launch()
        wear("Yellow version", on: app)
        sleep(1)
        picture("skins-after-yellow")
        // A phone goes back to the cards; an iPad keeps its list beside the skins.
        if UIDevice.current.userInterfaceIdiom == .phone { app.navigationBars.buttons.firstMatch.tap() }
        sleep(1)
        picture("yellow-home")
        let card = UIDevice.current.userInterfaceIdiom == .phone
            ? app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Carrot")).firstMatch
            : heading(app, "Carrot")
        expectInReach(card)
        card.tap()
        expectInReach(app.buttons["Back to the list"])
        picture("yellow-entry")
        app.swipeLeft()
        expectInReach(heading(app, "Egg"))
        app.buttons["Next"].tap()
        expectInReach(heading(app, "Kale"))
    }

    func testAChosenSkinIsMarkedAsWorn() throws {
        let app = try launch()
        wear("Yellow version", on: app)
        let worn = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Yellow version")).firstMatch
        expectInReach(worn)
        XCTAssertTrue(worn.isSelected)
    }

    func testTappingATileOpensItsEffect() throws {
        let app = try launch(route: "ingredient/kale")
        expectInReach(heading(app, "Kale"))
        let tile = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Blood clotting")).firstMatch
        XCTAssertTrue(tile.waitForExistence(timeout: 5))
        for _ in 0..<4 where !tile.isHittable { app.swipeUp() }
        sleep(1)
        picture("bento-kale")
        tile.tap()
        expectInReach(heading(app, "Blood clotting"))
    }

    func testTypingWhatYouHadAddsItToWhatWaitsToUpload() throws {
        let app = try launch()
        let field = app.textFields["What did you have?"]
        expectInReach(field)
        field.tap()
        field.typeText("beet")
        let had = app.buttons["I've had Beet"]
        expectInReach(had)
        picture("composer")
        had.tap()
        expectInReach(app.staticTexts["4 new encounters to upload"])
    }

    func testTheMainControlsAreBigEnoughForAThumb() throws {
        let app = try launch()
        for control in [app.buttons["Upload"], app.buttons["Sources"]] {
            expectInReach(control)
            XCTAssertGreaterThanOrEqual(control.frame.height, 44, control.label)
        }
    }

    func testTappingAnywhereOnTheWhatDidYouHavePillStartsTyping() throws {
        let app = try launch()
        let field = app.textFields["What did you have?"]
        expectInReach(field)
        // Just above the text line, on the pill.
        field.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: -0.4)).tap()
        // Asserting on the keyboard would depend on whether the simulator has a hardware one attached.
        app.typeText("beet")
        XCTAssertEqual(field.value as? String, "beet")
    }
}
