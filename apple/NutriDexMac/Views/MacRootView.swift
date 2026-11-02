import SwiftUI

/// Where the sidebar has you.
enum MacSection: Hashable {
    case dex(EntryKind?)
    case type(EntryKind, String)
    case compare
    case sources
}

/// Shows the notice until this Mac has accepted the running version, then the home database.
struct MacRootView: View {
    @AppStorage("acceptedDisclaimerVersion") private var accepted: String?
    @State private var nav = DexNavigator()
    @State private var browser = DexBrowser()
    @State private var game = DexGame(store: EncounterStore(defaults: MacRootView.storeDefaults), transport: HTTPEncounterTransport.configured)
    @Environment(\.scenePhase) private var scenePhase

    /// A launch argument such as `-debugEncountered carrot,kale` fills a throwaway record, for checking screens.
    private static var storeDefaults: UserDefaults {
        #if DEBUG
        if UserDefaults.standard.string(forKey: "debugEncountered") != nil {
            return UserDefaults(suiteName: "nutridex-debug-\(UUID().uuidString)")!
        }
        #endif
        return .standard
    }

    var body: some View {
        Group {
            if DisclaimerGate.needsAcceptance(accepted: accepted, version: Dex.bundled.version) {
                DisclaimerScreen { accepted = Dex.bundled.version }
            } else {
                MacBrowserView()
            }
        }
        .frame(minWidth: 1340, idealWidth: 1500, maxWidth: .infinity, minHeight: 720, idealHeight: 960, maxHeight: .infinity)
        .overlay {
            if let card = game.unlocking {
                UnlockOverlay(card: card, position: game.unlockProgress.position, total: game.unlockProgress.total) { game.next() }
            }
        }
        .environment(nav)
        .environment(browser)
        .environment(game)
        .environment(game.store)
        .preferredColorScheme(.light)
        .tint(Theme.shell)
        #if DEBUG
        .onAppear(perform: applyDebugArguments)
        #endif
        // Getting on the computer is what plays anything new from your other devices.
        .task { await game.sync() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await game.sync() } }
        }
    }

    #if DEBUG
    private func applyDebugArguments() {
        let arguments = UserDefaults.standard
        for food in arguments.string(forKey: "debugEncountered")?.split(separator: ",") ?? [] {
            game.store.encounter(food: String(food))
        }
        if let parts = arguments.string(forKey: "debugRoute")?.split(separator: "/"), parts.count == 2, let kind = EntryKind(rawValue: String(parts[0])) {
            nav.choose(.entry(kind, String(parts[1])))
        }
    }
    #endif
}

/// The home database: sections on the left, then the wall of cards and the entry you are reading.
struct MacBrowserView: View {
    @Environment(DexBrowser.self) private var browser
    @State private var section = MacBrowserView.startingSection
    @State private var filter = EncounterFilter.all

    private static var startingSection: MacSection {
        #if DEBUG
        if UserDefaults.standard.string(forKey: "debugSection") == "compare" { return .compare }
        if UserDefaults.standard.string(forKey: "debugSection") == "sources" { return .sources }
        #endif
        return .dex(nil)
    }

    var body: some View {
        @Bindable var browser = browser
        NavigationSplitView {
            MacSidebar(section: $section)
                .navigationSplitViewColumnWidth(min: 250, ideal: 270, max: 320)
        } detail: {
            switch section {
            case .compare:
                // A table this wide scrolls inside itself; it must not widen the window around it.
                CompareFoodsView(section: $section)
                    .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
            case .sources:
                SourcesList().background(Theme.screen)
            case .dex, .type:
                HSplitView {
                    VStack(spacing: 0) {
                        MacSyncNotice()
                        CardPane(filter: filter)
                    }
                    .frame(minWidth: 560, maxWidth: .infinity)
                    EntryPane()
                        .frame(minWidth: 500, maxWidth: .infinity, maxHeight: .infinity)
                        .layoutPriority(1)
                }
                .frame(minWidth: 0, maxWidth: .infinity, maxHeight: .infinity)
                .background(Theme.screen)
                .searchable(text: $browser.query, placement: .toolbar, prompt: "Search foods, compounds, effects")
                .toolbar {
                    ToolbarItem(placement: .principal) {
                        Picker("Show", selection: $filter) {
                            ForEach(EncounterFilter.allCases) { Text($0.rawValue).tag($0) }
                        }
                        .pickerStyle(.segmented)
                        .fixedSize()
                    }
                }
            }
        }
        .onChange(of: section) { _, new in
            switch new {
            case let .dex(kind):
                browser.choose(kind: kind)
            case let .type(kind, type):
                browser.kind = kind
                browser.type = type
            case .compare, .sources:
                break
            }
        }
    }
}

/// Anything waiting to go up, and a plain word when the home database cannot be reached.
struct MacSyncNotice: View {
    @Environment(DexGame.self) private var game

    var body: some View {
        VStack(spacing: 6) {
            UploadBar()
            if let problem = game.syncProblem {
                Label(problem, systemImage: "exclamationmark.triangle.fill")
                    .font(.dex(.footnote, weight: .medium))
                    .foregroundStyle(Theme.ink)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(game.store.pending.isEmpty && game.syncProblem == nil ? 0 : 10)
        .background(Theme.screen)
    }
}

/// Sections of the database, its types, and how much of it you have encountered.
struct MacSidebar: View {
    @Binding var section: MacSection
    @Environment(DexBrowser.self) private var browser
    @Environment(DexNavigator.self) private var nav
    @Environment(EncounterStore.self) private var store

    private static let kinds: [(label: String, kind: EntryKind?, symbol: String)] = [
        ("Everything", nil, "square.grid.2x2"),
        ("Foods", .ingredient, "carrot"),
        ("Compounds", .compound, "atom"),
        ("Effects", .effect, "heart.text.square"),
    ]

    private var currentKind: EntryKind? {
        switch section {
        case let .dex(kind): kind
        case let .type(kind, _): kind
        case .compare, .sources: nil
        }
    }

    private var lens: Color {
        guard case let .entry(kind, slug) = nav.selection, store.isRevealed(kind, slug),
              let card = Dex.bundled.cards.first(where: { $0.kind == kind && $0.slug == slug }) else { return Color(hex: "#38B6F2") }
        return Dex.bundled.palette.swatch(for: card.type).background
    }

    private func count(_ kind: EntryKind?) -> Int {
        kind.map { k in Dex.bundled.cards.filter { $0.kind == k }.count } ?? Dex.bundled.cards.count
    }

    var body: some View {
        List(selection: $section) {
            Section("Dex") {
                ForEach(Self.kinds, id: \.label) { row in
                    Label(row.label, systemImage: row.symbol)
                        .badge(count(row.kind))
                        .tag(MacSection.dex(row.kind))
                }
            }
            if let kind = currentKind {
                Section("Types") {
                    ForEach(Set(Dex.bundled.cards.filter { $0.kind == kind }.compactMap(\.type)).sorted(), id: \.self) { type in
                        Label {
                            Text(type.capitalized)
                        } icon: {
                            Circle().fill(Dex.bundled.palette.swatch(for: type).background).frame(width: 11, height: 11)
                        }
                        .tag(MacSection.type(kind, type))
                    }
                }
            }
            Section("Research") {
                Label("Compare foods", systemImage: "tablecells").tag(MacSection.compare)
                Label("Sources", systemImage: "book.closed").tag(MacSection.sources)
            }
        }
        .listStyle(.sidebar)
        .safeAreaInset(edge: .top, spacing: 0) {
            DexPlate(lens: lens)
                .padding(.top, 26)
                .padding(.bottom, 6)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Encountered").font(.dex(.subheadline, weight: .heavy)).foregroundStyle(Theme.ink)
                progress("Foods", .ingredient)
                progress("Compounds", .compound)
                progress("Effects", .effect)
            }
            .padding(12)
            .background(Theme.bezel)
        }
    }

    private func progress(_ label: String, _ kind: EntryKind) -> some View {
        let value = store.progress(of: kind)
        return VStack(alignment: .leading, spacing: 3) {
            HStack {
                Text(label).font(.dex(.caption)).foregroundStyle(Theme.inkSoft)
                Spacer()
                Text("\(value.seen) of \(value.total)").font(.dex(.caption, weight: .medium)).monospacedDigit().foregroundStyle(Theme.ink)
            }
            Meter(share: value.total == 0 ? 0 : Double(value.seen) / Double(value.total), color: Theme.shell)
        }
    }
}

/// The wall of cards: what you have encountered in colour, the rest blacked out.
struct CardPane: View {
    let filter: EncounterFilter
    @Environment(DexBrowser.self) private var browser
    @Environment(DexNavigator.self) private var nav
    @Environment(EncounterStore.self) private var store

    var body: some View {
        let cards = filter.apply(browser.cards, store: store)
        ScrollView {
            if cards.isEmpty {
                ContentUnavailableView(filter == .encountered ? "Nothing encountered here yet" : "Nothing matches that", systemImage: "questionmark.square.dashed", description: Text(filter == .encountered ? "Open a food and choose I've had this." : "Try another search or filter."))
                    .padding(.top, 60)
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 158, maximum: 200), spacing: 12, alignment: .top)], spacing: 14) {
                    ForEach(cards) { card in
                        Button { nav.choose(card.route) } label: {
                            EntryCardView(card: card, revealed: store.isRevealed(card))
                                .overlay {
                                    if nav.selection == card.route {
                                        RoundedRectangle(cornerRadius: 18).stroke(Theme.shell, lineWidth: 4)
                                    }
                                }
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(store.isRevealed(card) ? card.name : "\(card.name), not encountered yet")
                    }
                }
                .padding(14)
            }
        }
        .background(Theme.screen)
    }
}
