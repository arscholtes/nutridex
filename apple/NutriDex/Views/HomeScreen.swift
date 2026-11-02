import SwiftUI

/// The search box, kind tabs and type filter.
struct BrowserControls: View {
    @Environment(DexBrowser.self) private var browser
    @Environment(EncounterStore.self) private var store

    private static let kinds: [(label: String, kind: EntryKind?)] = [("All", nil), ("Foods", .ingredient), ("Compounds", .compound), ("Effects", .effect)]

    private func count(_ kind: EntryKind?) -> Int {
        Dex.bundled.cards.filter { (kind == nil || $0.kind == kind) && store.isRevealed($0) }.count
    }

    private func types(of kind: EntryKind) -> [String] {
        Set(Dex.bundled.cards.filter { $0.kind == kind && store.isRevealed($0) }.compactMap(\.type)).sorted()
    }

    var body: some View {
        @Bindable var browser = browser
        VStack(alignment: .leading, spacing: 10) {
            FlowRow {
                ForEach(Self.kinds, id: \.label) { tab in
                    let selected = browser.kind == tab.kind
                    Button { browser.choose(kind: tab.kind) } label: {
                        HStack(spacing: 4) {
                            Text(tab.label).fontWeight(.bold)
                            Text("\(count(tab.kind))").monospacedDigit()
                        }
                        .font(.dex(.subheadline))
                        .foregroundStyle(selected ? Theme.screen : Theme.ink)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(selected ? Theme.ink : Theme.card, in: RoundedRectangle(cornerRadius: 9))
                        .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.ink, lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
            HStack(spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass").foregroundStyle(Theme.inkSoft).accessibilityHidden(true)
                    TextField("Search what you have unlocked", text: $browser.query)
                        .font(.dex(.body))
                        .foregroundStyle(Theme.ink)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .submitLabel(.search)
                    if !browser.query.isEmpty {
                        Button { browser.query = "" } label: {
                            Image(systemName: "xmark.circle.fill").foregroundStyle(Theme.inkSoft)
                        }
                        .accessibilityLabel("Clear search")
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 9))
                .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.ink, lineWidth: 2))
                typeMenu
            }
        }
    }

    private var typeMenu: some View {
        Menu {
            Button("Any type") { browser.type = nil }
            ForEach(Self.kinds.compactMap(\.kind).filter { browser.kind == nil || browser.kind == $0 }, id: \.self) { kind in
                Section(Self.kinds.first { $0.kind == kind }?.label ?? "") {
                    ForEach(types(of: kind), id: \.self) { type in
                        Button(type.capitalized) { browser.type = type }
                    }
                }
            }
        } label: {
            HStack(spacing: 3) {
                Text(browser.type?.capitalized ?? "Any type").lineLimit(1)
                Image(systemName: "chevron.up.chevron.down").font(.caption2)
            }
            .font(.dex(.subheadline, weight: .bold))
            .foregroundStyle(Theme.ink)
            .padding(.horizontal, 10)
            .padding(.vertical, 9)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 9))
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.ink, lineWidth: 2))
        }
    }
}

/// The grid of cards, or what to do when nothing matches.
struct CardGrid: View {
    let onChoose: ((EntryCard) -> Void)?
    @Environment(DexBrowser.self) private var browser
    @Environment(EncounterStore.self) private var store
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        let cards = browser.cards.filter(store.isRevealed)
        if store.totalProgress.seen == 0 {
            Text("Your Dex is empty. Tell it what you had to unlock your first entry.")
                .font(.dex(.body))
                .foregroundStyle(Theme.ink)
                .padding(.vertical, 20)
        } else if cards.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("Nothing you have unlocked matches that.").font(.dex(.body)).foregroundStyle(Theme.ink)
                Button("Show everything") {
                    browser.query = ""
                    browser.choose(kind: nil)
                }
                .font(.dex(.body, weight: .bold))
                .tint(Theme.shell)
            }
            .padding(.vertical, 20)
        } else {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: sizeClass == .regular ? 170 : 148), spacing: 12, alignment: .top)], spacing: 14) {
                ForEach(cards) { card in
                    if let onChoose {
                        Button { onChoose(card) } label: { EntryCardView(card: card) }
                            .buttonStyle(.plain)
                    } else {
                        NavigationLink(value: card.route) { EntryCardView(card: card) }
                            .buttonStyle(.plain)
                    }
                }
            }
            .padding(.bottom, 6)
        }
    }
}

/// The phone's home: the plate, the screen and every card.
struct HomeScreen: View {
    @Environment(DexNavigator.self) private var nav

    var body: some View {
        VStack(spacing: 0) {
            DexPlate(onSources: { nav.path.append(.sources) })
            ScreenBezel {
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("What is in your food, what it does, and what helps it work.")
                            .font(.dex(.headline, weight: .heavy))
                            .foregroundStyle(Theme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        UploadBar()
                        UnlockProgressBar()
                        HadComposer()
                        BrowserControls()
                        CardGrid(onChoose: nil)
                    }
                    .padding(12)
                }
                .scrollDismissesKeyboard(.immediately)
            }
        }
        .background(Theme.shellBody.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
    }
}

/// The iPad's sidebar: the plate, the controls and a compact list of entries.
struct SidebarScreen: View {
    @Environment(DexNavigator.self) private var nav
    @Environment(DexBrowser.self) private var browser
    @Environment(EncounterStore.self) private var store

    private var selection: Binding<DexRoute?> {
        Binding { nav.selection } set: { route in
            if let route { nav.choose(route) }
        }
    }

    private var lens: Color {
        guard case let .entry(_, slug) = nav.selection, let card = Dex.bundled.cards.first(where: { $0.slug == slug }) else { return Color(hex: "#38B6F2") }
        return Dex.bundled.palette.swatch(for: card.type).background
    }

    var body: some View {
        VStack(spacing: 0) {
            DexPlate(lens: lens, onSources: { nav.choose(.sources) })
            VStack(alignment: .leading, spacing: 10) {
                UploadBar()
                UnlockProgressBar()
                HadComposer()
                BrowserControls()
            }
            .padding(10)
            List(browser.cards.filter(store.isRevealed), selection: selection) { card in
                HStack(spacing: 10) {
                    if card.kind == .effect {
                        EffectTile(name: card.name, type: card.type)
                            .frame(width: 38, height: 38)
                            .background(Dex.bundled.palette.swatch(for: card.type).background, in: RoundedRectangle(cornerRadius: 8))
                    } else {
                        CreatureArt(kind: card.kind, slug: card.slug).frame(width: 38, height: 38)
                    }
                    VStack(alignment: .leading, spacing: 0) {
                        Text(card.name).font(.dex(.subheadline, weight: .bold)).foregroundStyle(Theme.ink).lineLimit(2)
                        Text(card.number).font(.dexNumber(.caption2)).foregroundStyle(Theme.inkSoft)
                    }
                }
                .tag(card.route)
            }
            .listStyle(.sidebar)
            .scrollContentBackground(.hidden)
        }
        .background(Theme.screen)
        .toolbar(.hidden, for: .navigationBar)
    }
}

/// The iPad's landing page, before an entry is chosen: every card that matches the sidebar's search.
struct LandingScreen: View {
    @Environment(DexNavigator.self) private var nav

    var body: some View {
        ScreenBezel {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("What is in your food, what it does, and what helps it work.")
                        .font(.dex(.title2, weight: .heavy))
                        .foregroundStyle(Theme.ink)
                    CardGrid(onChoose: { nav.choose($0.route) })
                }
                .padding(16)
            }
        }
        .background(Theme.shellBody.ignoresSafeArea())
        .toolbarBackground(Theme.shell, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }
}
