import XCTest

/// Drives the app the way a thumb does, from a throwaway record, so nothing reaches anyone's real one.
final class TouchTests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    /// The version the disclaimer was accepted at, read from the snapshot the app bundles.
    private var version: String {
        get throws {
            let snapshot = URL(filePath: #filePath).deletingLastPathComponent().deletingLastPathComponent().appending(path: "Shared/Resources/dex.json")
            let json = try JSONSerialization.jsonObject(with: Data(contentsOf: snapshot)) as? [String: Any]
            return try XCTUnwrap(json?["version"] as? String)
        }
    }

    /// Every skin's id, read from the snapshot the app bundles.
    private var skins: [String] {
        get throws {
            let snapshot = URL(filePath: #filePath).deletingLastPathComponent().deletingLastPathComponent().appending(path: "Shared/Resources/dex.json")
            let json = try JSONSerialization.jsonObject(with: Data(contentsOf: snapshot)) as? [String: Any]
            return try XCTUnwrap(json?["skins"] as? [[String: Any]]).compactMap { $0["id"] as? String }
        }
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
