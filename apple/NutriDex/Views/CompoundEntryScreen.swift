import SwiftUI

/// A compound's entry on a phone or iPad.
struct CompoundEntryScreen: View {
    let entry: CompoundEntry

    var body: some View {
        EntryLayout {
            EntryViewer(number: entry.pager.number, type: entry.compound.compoundClass, name: entry.compound.name, artWidth: 240) {
                CreatureArt(kind: .compound, slug: entry.compound.slug, cutout: true)
            } details: {
                CompoundDetails(entry: entry)
            }
        } sections: {
            CompoundSections(entry: entry)
        }
    }
}
