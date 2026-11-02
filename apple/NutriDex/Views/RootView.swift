import SwiftUI

/// Shows the notice until this device has accepted the running version, then the Dex.
struct RootView: View {
    @AppStorage("acceptedDisclaimerVersion") private var accepted: String?
    @State private var nav = DexNavigator()
    @State private var browser = DexBrowser()
    @Environment(\.horizontalSizeClass) private var sizeClass

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
        .environment(nav)
        .environment(browser)
        .preferredColorScheme(.light)
        .tint(Theme.shell)
        #if DEBUG
        .onAppear(perform: openDebugRoute)
        #endif
    }

    #if DEBUG
    /// Opens a screen from a launch argument such as `-debugRoute ingredient/carrot`, for checking screens on a simulator.
    private func openDebugRoute() {
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

    private var splitView: some View {
        @Bindable var nav = nav
        return NavigationSplitView {
            SidebarScreen()
                .navigationSplitViewColumnWidth(min: 300, ideal: 340, max: 420)
        } detail: {
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
    }
}

/// The screen for a place in the app.
struct RouteView: View {
    let route: DexRoute

    var body: some View {
        switch route {
        case .sources:
            SourcesScreen()
        case let .entry(.ingredient, slug):
            if let entry = Dex.bundled.ingredients[slug] { IngredientEntryScreen(entry: entry) } else { MissingEntry() }
        case let .entry(.compound, slug):
            if let entry = Dex.bundled.compounds[slug] { CompoundEntryScreen(entry: entry) } else { MissingEntry() }
        case let .entry(.effect, slug):
            if let entry = Dex.bundled.effects[slug] { EffectEntryScreen(entry: entry) } else { MissingEntry() }
        }
    }
}

/// What the device shows for an entry it does not hold.
struct MissingEntry: View {
    @Environment(DexNavigator.self) private var nav

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("That entry is not in the Dex.").font(.dex(.title2, weight: .bold)).foregroundStyle(Theme.ink)
            Button("Back to the list") { nav.backToList() }.font(.dex(.body, weight: .bold))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.screen)
    }
}
