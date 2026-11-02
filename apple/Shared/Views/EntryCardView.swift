import SwiftUI

/// One Dex card on its type colour: number, art, name, type badge, evidence badge and stats from real data.
struct EntryCardView: View {
    let card: EntryCard
    /// False blacks out the creature and shows its description instead of its stats.
    var revealed = true

    @Environment(\.dexVisibility) private var visibility

    private static let hidden = TypeSwatch(color: "#33403B", textOnColor: "light")

    var body: some View {
        let swatch = revealed ? Dex.bundled.palette.swatch(for: card.type) : Self.hidden
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(card.number).font(.dexNumber(.subheadline))
                Spacer()
                if revealed, let grade = card.bestGrade { GradeBadge(grade: grade) }
            }
            if card.kind == .effect {
                EffectTile(name: card.name, type: card.type, revealed: revealed)
            } else {
                CreatureArt(kind: card.kind, slug: card.slug, revealed: revealed)
            }
            Text(card.name).font(.dex(.headline, weight: .bold)).fixedSize(horizontal: false, vertical: true)
            if revealed {
                TypeBadge(type: card.type)
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(visibility.stats(of: card), id: \.self) { Text($0).font(.dex(.caption, weight: .medium)).fixedSize(horizontal: false, vertical: true) }
                }
            } else {
                Text(card.description).font(.dex(.caption)).lineLimit(5).fixedSize(horizontal: false, vertical: true)
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
