import SwiftUI

/// A food's entry on a phone or iPad.
struct IngredientEntryScreen: View {
    let entry: IngredientEntry

    var body: some View {
        EntryLayout {
            EntryViewer(number: entry.pager.number, type: entry.ingredient.category, name: entry.ingredient.name, artWidth: 240) {
                CreatureArt(kind: .ingredient, slug: entry.ingredient.slug, cutout: true)
            } details: {
                IngredientDetails(entry: entry)
            }
        } sections: {
            IngredientSections(entry: entry)
        }
    }
}
