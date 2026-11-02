import SwiftUI

/// A food's entry on a phone or iPad.
struct IngredientEntryScreen: View {
    let entry: IngredientEntry
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        EntryChrome(kind: .ingredient, type: entry.ingredient.category, pager: entry.pager) {
            EntryLayout {
                EntryViewer(number: entry.pager.number, type: entry.ingredient.category, name: entry.ingredient.name, artWidth: sizeClass == .regular ? 240 : 132) {
                    CreatureArt(kind: .ingredient, slug: entry.ingredient.slug)
                } details: {
                    IngredientDetails(entry: entry)
                }
            } sections: {
                IngredientSections(entry: entry, panelColumns: sizeClass == .regular ? 2 : 1)
            }
        }
    }
}
