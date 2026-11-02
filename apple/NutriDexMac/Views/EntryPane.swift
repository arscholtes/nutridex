import SwiftUI

/// The entry you are reading, with a stack for links followed from inside it.
struct EntryPane: View {
    @Environment(DexNavigator.self) private var nav

    var body: some View {
        @Bindable var nav = nav
        NavigationStack(path: $nav.path) {
            Group {
                if let selection = nav.selection {
                    MacRouteView(route: selection)
                } else {
                    ContentUnavailableView("Choose an entry", systemImage: "rectangle.on.rectangle", description: Text("Pick a card to read everything on file about it."))
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Theme.screen)
                }
            }
            .navigationDestination(for: DexRoute.self) { MacRouteView(route: $0) }
        }
    }
}

struct MacRouteView: View {
    let route: DexRoute

    var body: some View {
        switch route {
        case .sources:
            SourcesList().background(Theme.screen)
        case let .entry(kind, slug):
            if let card = Dex.bundled.cards.first(where: { $0.kind == kind && $0.slug == slug }) {
                MacEntryView(card: card)
            } else {
                ContentUnavailableView("That entry is not in the Dex", systemImage: "questionmark.square.dashed")
            }
        }
    }
}

/// One entry in full. What you have not encountered is blacked out but still readable, because this
/// is the database you study at home.
struct MacEntryView: View {
    let card: EntryCard
    @Environment(DexNavigator.self) private var nav
    @Environment(EncounterStore.self) private var store

    private var pager: DexPager? {
        switch card.kind {
        case .ingredient: Dex.bundled.ingredients[card.slug]?.pager
        case .compound: Dex.bundled.compounds[card.slug]?.pager
        case .effect: Dex.bundled.effects[card.slug]?.pager
        }
    }

    var body: some View {
        let revealed = store.isRevealed(card)
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                HStack(alignment: .top, spacing: 22) {
                    EntryViewer(number: card.number, type: card.type, name: card.name, artWidth: 200, revealed: revealed) {
                        art(revealed)
                    } details: {
                        details
                    }
                    .frame(width: 260)
                    VStack(alignment: .leading, spacing: 14) {
                        SectionTitle(title: "Dex entry")
                        Text(card.description)
                            .font(.dex(.title3))
                            .foregroundStyle(Theme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        EncounterControl(card: card)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                sections
            }
            .padding(18)
            .animation(.spring(duration: 0.45), value: revealed)
        }
        .background(Theme.screen)
        .navigationTitle(card.name)
        .toolbar {
            ToolbarItemGroup(placement: .navigation) {
                Button { step(pager?.prev) } label: { Label("Previous entry", systemImage: "chevron.up") }
                    .disabled(pager?.prev == nil)
                    .keyboardShortcut("[", modifiers: .command)
                Button { step(pager?.next) } label: { Label("Next entry", systemImage: "chevron.down") }
                    .disabled(pager?.next == nil)
                    .keyboardShortcut("]", modifiers: .command)
            }
        }
    }

    private func step(_ to: DexStep?) {
        if let to { nav.step(to: .entry(card.kind, to.slug)) }
    }

    @ViewBuilder private func art(_ revealed: Bool) -> some View {
        if card.kind == .effect {
            EffectTile(name: card.name, type: card.type, revealed: revealed)
        } else {
            CreatureArt(kind: card.kind, slug: card.slug, revealed: revealed)
        }
    }

    @ViewBuilder private var details: some View {
        switch card.kind {
        case .ingredient:
            if let entry = Dex.bundled.ingredients[card.slug] { IngredientDetails(entry: entry) }
        case .compound:
            if let entry = Dex.bundled.compounds[card.slug] { CompoundDetails(entry: entry) }
        case .effect:
            if let entry = Dex.bundled.effects[card.slug] { EffectDetails(entry: entry) }
        }
    }

    @ViewBuilder private var sections: some View {
        switch card.kind {
        case .ingredient:
            if let entry = Dex.bundled.ingredients[card.slug] { IngredientSections(entry: entry, panelColumns: 2) }
        case .compound:
            if let entry = Dex.bundled.compounds[card.slug] { CompoundSections(entry: entry) }
        case .effect:
            if let entry = Dex.bundled.effects[card.slug] { EffectSections(entry: entry) }
        }
    }
}

/// Marks a food as had, which is what reveals things; other entries say which foods would reveal them.
struct EncounterControl: View {
    let card: EntryCard
    @Environment(DexNavigator.self) private var nav
    @Environment(EncounterStore.self) private var store
    @Environment(DexGame.self) private var game

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if card.kind == .ingredient {
                food
            } else {
                other
            }
        }
    }

    @ViewBuilder private var food: some View {
        if let date = store.date(of: card.slug) {
            Label("Encountered \(date.formatted(date: .abbreviated, time: .omitted))", systemImage: "checkmark.seal.fill")
                .font(.dex(.subheadline, weight: .bold))
                .foregroundStyle(Theme.ink)
        } else {
            Button {
                // At home there is nothing to carry back, so it goes up and plays straight away.
                store.encounter(food: card.slug)
                Task { await game.upload() }
            } label: {
                Text("I've had this").font(.dex(.headline, weight: .heavy)).padding(.horizontal, 6).padding(.vertical, 2)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            if let reveal = Dex.bundled.reveals[card.slug] {
                Note(text: "Reveals this food, \(reveal.compounds.count) compounds and \(reveal.effects.count) effects.")
            }
        }
    }

    @ViewBuilder private var other: some View {
        let foods = Dex.bundled.foods(revealing: card.kind, card.slug)
        let revealedBy = foods.filter { store.isRevealed($0) }
        if store.isRevealed(card) {
            Label("Encountered", systemImage: "checkmark.seal.fill")
                .font(.dex(.subheadline, weight: .bold))
                .foregroundStyle(Theme.ink)
            Note(text: "Through \(revealedBy.map(\.name).joined(separator: ", ")).")
        } else {
            Note(text: "You encounter this by having a food that \(card.kind == .compound ? "carries it" : "reaches it"):")
            FlowRow(spacing: 8) {
                ForEach(foods) { food in
                    EntryLinkText(route: food.route, title: food.name)
                }
            }
        }
    }
}
