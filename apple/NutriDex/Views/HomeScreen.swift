import SwiftUI

/// One Dex card on its type colour: number, art, name, type badge, evidence badge and stats from real data.
struct EntryCardView: View {
    let card: EntryCard

    var body: some View {
        let swatch = Dex.bundled.palette.swatch(for: card.type)
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(card.number).font(.dexNumber(.subheadline))
                Spacer()
                if let grade = card.bestGrade { GradeBadge(grade: grade) }
            }
            if card.kind == .effect {
                EffectTile(name: card.name, type: card.type)
            } else {
                CreatureArt(kind: card.kind, slug: card.slug)
            }
            Text(card.name).font(.dex(.headline, weight: .bold)).fixedSize(horizontal: false, vertical: true)
            TypeBadge(type: card.type)
            VStack(alignment: .leading, spacing: 2) {
                ForEach(card.stats, id: \.self) { Text($0).font(.dex(.caption, weight: .medium)).fixedSize(horizontal: false, vertical: true) }
            }
        }
        .foregroundStyle(swatch.foreground)
        .multilineTextAlignment(.leading)
        .padding(10)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(swatch.background, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.ink, lineWidth: 2))
        .background(RoundedRectangle(cornerRadius: 18).fill(Theme.ink).offset(y: 3))
        .accessibilityElement(children: .combine)
    }
}

/// The search box, kind tabs and type filter.
struct BrowserControls: View {
    @Environment(DexBrowser.self) private var browser

    private static let kinds: [(label: String, kind: EntryKind?)] = [("All", nil), ("Foods", .ingredient), ("Compounds", .compound), ("Effects", .effect)]

    private func count(_ kind: EntryKind?) -> Int {
        kind.map { k in Dex.bundled.cards.filter { $0.kind == k }.count } ?? Dex.bundled.cards.count
    }

    private func types(of kind: EntryKind) -> [String] {
        Set(Dex.bundled.cards.filter { $0.kind == kind }.compactMap(\.type)).sorted()
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
                    TextField("Search foods, compounds, effects", text: $browser.query)
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
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        let cards = browser.cards
        if cards.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("Nothing in the Dex matches that.").font(.dex(.body)).foregroundStyle(Theme.ink)
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
            BrowserControls().padding(10)
            List(browser.cards, selection: selection) { card in
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
