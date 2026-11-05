import SwiftUI

/// An effect's page on a phone or iPad.
struct EffectEntryScreen: View {
    let entry: EffectEntry

    var body: some View {
        EntryLayout {
            EntryViewer(number: entry.pager.number, type: entry.effect.bodySystem, name: entry.effect.name) {
                EffectTile(name: entry.effect.name, type: entry.effect.bodySystem)
            } details: {
                EffectDetails(entry: entry)
            }
        } sections: {
            EffectSections(entry: entry)
        }
    }
}
