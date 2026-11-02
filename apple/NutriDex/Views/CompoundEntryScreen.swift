import SwiftUI

/// A compound's entry on a phone or iPad.
struct CompoundEntryScreen: View {
    let entry: CompoundEntry
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        EntryChrome(kind: .compound, type: entry.compound.compoundClass, pager: entry.pager) {
            EntryLayout {
                EntryViewer(number: entry.pager.number, type: entry.compound.compoundClass, name: entry.compound.name, artWidth: sizeClass == .regular ? 240 : 132) {
                    CreatureArt(kind: .compound, slug: entry.compound.slug)
                } details: {
                    CompoundDetails(entry: entry)
                }
            } sections: {
                CompoundSections(entry: entry)
            }
        }
    }
}
