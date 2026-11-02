import SwiftUI

/// An effect's page on a phone or iPad.
struct EffectEntryScreen: View {
    let entry: EffectEntry
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        EntryChrome(kind: .effect, type: entry.effect.bodySystem, pager: entry.pager) {
            EntryLayout {
                EntryViewer(number: entry.pager.number, type: entry.effect.bodySystem, name: entry.effect.name, artWidth: sizeClass == .regular ? 240 : 132) {
                    EffectTile(name: entry.effect.name, type: entry.effect.bodySystem)
                } details: {
                    EffectDetails(entry: entry)
                }
            } sections: {
                EffectSections(entry: entry)
            }
        }
    }
}
