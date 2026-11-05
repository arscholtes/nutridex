import SwiftUI

/// Shows the notice until this device has accepted the running version, then the Dex.
struct RootView: View {
    @AppStorage("acceptedDisclaimerVersion") private var accepted: String?
    @State private var nav = DexNavigator()
    @State private var browser = DexBrowser()
    @State private var game = DexGame(store: EncounterStore(defaults: RootView.storeDefaults), transport: RootView.transport, skins: SkinStore(defaults: RootView.storeDefaults))
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.scenePhase) private var scenePhase

    /// A launch argument such as `-debugEncountered carrot,kale` fills a throwaway record, for checking screens.
    private static var storeDefaults: UserDefaults {
        #if DEBUG
        let arguments = UserDefaults.standard
        if arguments.string(forKey: "debugEncountered") != nil || arguments.string(forKey: "debugUpload") != nil {
            return UserDefaults(suiteName: "nutridex-debug-\(UUID().uuidString)")!
        }
        #endif
        return .standard
    }

    private static var transport: EncounterTransport {
        #if DEBUG
        if UserDefaults.standard.string(forKey: "debugEncountered") != nil { return TestCopyTransport() }
        #endif
        return HTTPEncounterTransport.configured
    }

    /// A throwaway record stays exactly what the launch argument asked for, with nothing merged in from home.
    private static var syncs: Bool {
        #if DEBUG
        UserDefaults.standard.string(forKey: "debugEncountered") == nil
        #else
        true
        #endif
    }

    var body: some View {
        Group {
            if DisclaimerGate.needsAcceptance(accepted: accepted, version: Dex.bundled.version) {
                DisclaimerScreen { accepted = Dex.bundled.version }
            } else if sizeClass == .regular {
                splitView
            } else {
                stackView
            }
        }
        .overlay {
            if let card = game.unlocking {
                UnlockOverlay(card: card, position: game.unlockProgress.position, total: game.unlockProgress.total) { game.next() }
            }
        }
        // Colours come from the skin being worn, so changing it draws everything again. What you are looking at stays.
        .id(game.skins.skin)
        .environment(nav)
        .environment(browser)
        .environment(game)
        .environment(game.store)
        .environment(\.dexVisibility, DexVisibility(store: game.store))
        .preferredColorScheme(game.skins.skin.scheme)
        .tint(Theme.accent)
        .task { if Self.syncs { await game.sync() } }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active, Self.syncs { Task { await game.sync() } }
        }
        #if DEBUG
        .onAppear(perform: openDebugRoute)
        #endif
    }

    #if DEBUG
    /// Opens a screen from a launch argument such as `-debugRoute ingredient/carrot`, for checking screens on a simulator.
    private func openDebugRoute() {
        for food in UserDefaults.standard.string(forKey: "debugEncountered")?.split(separator: ",") ?? [] {
            game.store.encounter(food: String(food))
        }
        if let food = UserDefaults.standard.string(forKey: "debugUpload") {
            game.store.encounter(food: food)
            Task { await game.upload() }
        }
        guard let parts = UserDefaults.standard.string(forKey: "debugRoute")?.split(separator: "/"), parts.count == 2,
              let kind = EntryKind(rawValue: String(parts[0])) else { return }
        let route = DexRoute.entry(kind, String(parts[1]))
        if sizeClass == .regular { nav.choose(route) } else { nav.path = [route] }
    }
    #endif

    private var stackView: some View {
        @Bindable var nav = nav
        return NavigationStack(path: $nav.path) {
            HomeScreen()
                .navigationDestination(for: DexRoute.self) { RouteView(route: $0) }
        }
    }

    /// Two columns of our own, because a system split view floats its sidebar over the detail, which throws off a sideways pager.
    private var splitView: some View {
        @Bindable var nav = nav
        return HStack(spacing: 0) {
            SidebarScreen()
                .frame(width: 340)
                .background(Theme.sidebarWash)
            NavigationStack(path: $nav.path) {
                Group {
                    if let selection = nav.selection {
                        RouteView(route: selection)
                    } else {
                        LandingScreen()
                    }
                }
                .navigationDestination(for: DexRoute.self) { RouteView(route: $0) }
            }
        }
        .background(DexBackdrop())
    }
}

/// The screen for a place in the app. Something not yet encountered does not exist here.
struct RouteView: View {
    let route: DexRoute
    @Environment(\.dexVisibility) private var visibility

    var body: some View {
        if !visibility.shows(route) {
            MissingEntry()
        } else {
            screen
        }
    }

    @ViewBuilder private var screen: some View {
        switch route {
        case .sources:
            SourcesScreen()
        case .skins:
            SkinsScreen()
        case let .entry(kind, slug):
            EntryPager(kind: kind, slug: slug)
        }
    }
}

/// What the app shows for an entry it does not hold.
struct MissingEntry: View {
    @Environment(DexNavigator.self) private var nav

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("That is not in your Dex.").font(.dex(.title2, weight: .bold)).foregroundStyle(Theme.ink)
            Button("Back to the list") { nav.backToList() }.font(.dex(.body, weight: .bold))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DexBackdrop())
    }
}
