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
            ScrollView(.horizontal) {
                HStack(spacing: 8) {
                    ForEach(Self.kinds, id: \.label) { tab in
                        let selected = browser.kind == tab.kind
                        Button { browser.choose(kind: tab.kind) } label: {
                            HStack(spacing: 4) {
                                Text(tab.label).fontWeight(.bold)
                                Text("\(count(tab.kind))").monospacedDigit()
                            }
                            .font(.dex(.subheadline))
                            .foregroundStyle(selected ? Theme.onChip : Theme.ink)
                            .padding(.horizontal, 13)
                            .frame(minHeight: 40)
                            .background(selected ? Theme.chip : Theme.card, in: Theme.control)
                            .dexControlOutline()
                            .contentShape(Theme.control)
                        }
                        .buttonStyle(.plain)
                        .accessibilityAddTraits(selected ? .isSelected : [])
                    }
                }
            }
            .scrollIndicators(.hidden)
            .scrollClipDisabled()
            HStack(spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass").foregroundStyle(Theme.inkSoft).accessibilityHidden(true)
                    TextField("Search your Dex", text: $browser.query)
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
                .padding(.horizontal, 14)
                .frame(minHeight: 44)
                .background(Theme.card, in: Theme.control)
                .dexControlOutline()
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
            .padding(.horizontal, 14)
            .frame(minHeight: 44)
            .background(Theme.card, in: Theme.control)
            .dexControlOutline()
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
            Text("Your Dex is empty. Tell it what you had, down below, to unlock your first entry.")
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
                .tint(Theme.accent)
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

/// The top of a list: the name with its links or small round buttons. The handheld has its plate instead.
struct DexHeader: View {
    let onRecipes: () -> Void
    let onSkins: () -> Void
    let onSources: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            DexWordmark()
            Spacer()
            if Theme.skin.nav == .text {
                link("Recipes", action: onRecipes)
                link("Skins", action: onSkins)
                link("Sources", action: onSources)
            } else {
                round("fork.knife", label: "Recipes", action: onRecipes)
                round("paintbrush", label: "Skins", action: onSkins)
                round("book.closed", label: "Sources", action: onSources)
            }
        }
    }

    private func link(_ label: String, action: @escaping () -> Void) -> some View {
        Button(label, action: action)
            .buttonStyle(.plain)
            .font(.dex(.footnote, weight: .bold))
            .foregroundStyle(Theme.ink)
            .padding(.horizontal, 6)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
    }

    private func round(_ symbol: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.dex(.body, weight: .bold))
                .foregroundStyle(Theme.ink)
                .frame(width: 44, height: 44)
        }
        .dexFloating(in: Circle())
        .accessibilityLabel(label)
    }
}

/// The phone's home: progress up top, every card in the middle, and what you had under your thumb.
struct HomeScreen: View {
    @Environment(DexNavigator.self) private var nav

    private var content: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if !Theme.isHandheld {
                    DexHeader { nav.path.append(.recipes) } onSkins: { nav.path.append(.skins) } onSources: { nav.path.append(.sources) }
                }
                if Theme.skin.hero == .titleFirst {
                    Text("Your Dex.").font(.dex(.largeTitle, weight: .heavy)).foregroundStyle(Theme.ink)
                }
                UploadBar()
                UnlockProgressBar()
                BrowserControls()
                CardGrid(onChoose: nil)
            }
            .padding(.horizontal, 14)
            .padding(.top, 6)
        }
        .scrollDismissesKeyboard(.immediately)
        .safeAreaInset(edge: .bottom, spacing: 0) { HadComposer() }
    }

    var body: some View {
        Group {
            if Theme.isHandheld {
                VStack(spacing: 0) {
                    DexPlate(onRecipes: { nav.path.append(.recipes) }, onSkins: { nav.path.append(.skins) }, onSources: { nav.path.append(.sources) })
                    ScreenBezel { content }
                }
                .background(Theme.shellBody.ignoresSafeArea())
            } else {
                content.background(DexBackdrop())
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }
}

/// The iPad's sidebar: the controls and a compact list of entries.
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
            if Theme.isHandheld {
                DexPlate(lens: lens, onRecipes: { nav.choose(.recipes) }, onSkins: { nav.choose(.skins) }, onSources: { nav.choose(.sources) })
            }
            VStack(alignment: .leading, spacing: 12) {
                if !Theme.isHandheld {
                    DexHeader { nav.choose(.recipes) } onSkins: { nav.choose(.skins) } onSources: { nav.choose(.sources) }
                }
                UploadBar()
                UnlockProgressBar()
                BrowserControls()
            }
            .padding(14)
            List(browser.cards.filter(store.isRevealed), selection: selection) { card in
                HStack(spacing: 12) {
                    if card.kind == .effect {
                        EffectTile(name: card.name, type: card.type)
                            .frame(width: 44, height: 44)
                            .background(Dex.bundled.palette.swatch(for: card.type).background.opacity(0.2), in: RoundedRectangle(cornerRadius: 12))
                    } else {
                        CreatureArt(kind: card.kind, slug: card.slug).frame(width: 44, height: 44)
                    }
                    VStack(alignment: .leading, spacing: 0) {
                        Text(card.name).font(.dex(.subheadline, weight: .bold)).foregroundStyle(Theme.ink).lineLimit(2)
                        Text(card.number).font(.dexNumber(.caption2)).foregroundStyle(Theme.inkSoft)
                    }
                }
                .tag(card.route)
                .listRowSeparator(.hidden)
                .listRowBackground(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(nav.selection == card.route ? Theme.accent.opacity(0.14) : .clear)
                        .padding(.horizontal, 8)
                )
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) { HadComposer() }
        .background(Theme.isHandheld ? Theme.screen : Theme.sidebarWash)
    }
}

/// The iPad's landing page, before an entry is chosen: every card that matches the sidebar's search.
struct LandingScreen: View {
    @Environment(DexNavigator.self) private var nav

    var body: some View {
        DexScreen {
            ScrollView {
                CardGrid(onChoose: { nav.choose($0.route) }).padding(18)
            }
        }
    }
}
