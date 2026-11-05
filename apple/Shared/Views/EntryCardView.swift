import SwiftUI

/// One Dex card: number, art, name, type badge, evidence badge and stats from real data, on the skin's card.
struct EntryCardView: View {
    let card: EntryCard
    /// False blacks out the creature and shows its description instead of its stats.
    var revealed = true

    @Environment(\.dexVisibility) private var visibility

    private var skin: DexSkin { Theme.skin }
    private var shape: RoundedRectangle { RoundedRectangle(cornerRadius: skin.radius.card) }
    private var swatch: TypeSwatch { Dex.bundled.palette.swatch(for: card.type) }
    private var paintedSwatch: TypeSwatch { revealed ? swatch : TypeSwatch(color: "#33403B", textOnColor: "light") }

    private var textColor: Color {
        if skin.card == .type { return paintedSwatch.foreground }
        return revealed ? Theme.ink : Theme.onTile
    }

    /// A sticker sits a little crooked, the way a hand left it, and the same way every time.
    private var lean: Double {
        guard skin.creature == .sticker else { return 0 }
        return [-1.2, 0.9, 0][card.slug.unicodeScalars.reduce(0) { $0 + Int($1.value) } % 3]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack {
                Text(card.number).font(.dexNumber(.footnote))
                Spacer()
                if revealed, let grade = card.bestGrade { GradeBadge(grade: grade) }
            }
            if card.kind == .effect {
                EffectTile(name: card.name, type: card.type, revealed: revealed)
            } else {
                CreatureArt(kind: card.kind, slug: card.slug, revealed: revealed, cutout: true)
                    .frame(maxWidth: .infinity)
            }
            Text(card.name).font(.dex(.headline, weight: .bold)).fixedSize(horizontal: false, vertical: true)
            if revealed {
                TypeBadge(type: card.type)
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(visibility.stats(of: card), id: \.self) { Text($0).font(.dex(.caption)).foregroundStyle(skin.card == .type ? textColor : Theme.inkSoft).fixedSize(horizontal: false, vertical: true) }
                }
            } else {
                Text(card.description).font(.dex(.caption)).lineLimit(5).fixedSize(horizontal: false, vertical: true)
            }
        }
        .foregroundStyle(textColor)
        .multilineTextAlignment(.leading)
        .padding(skin.card == .flat ? 14 : 10)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background { face }
        .overlay { edge }
        .modifier(CardShadow(skin: skin, shape: shape, glow: swatch.background))
        .rotationEffect(.degrees(lean))
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder private var face: some View {
        if skin.card == .type {
            shape.fill(paintedSwatch.background)
        } else if !revealed {
            shape.fill(Theme.tile)
        } else if skin.card == .wash {
            shape.fill(Theme.card).overlay(shape.fill(swatch.background.opacity(0.12)))
        } else {
            shape.fill(Theme.card)
        }
    }

    @ViewBuilder private var edge: some View {
        switch skin.card {
        case .wash where skin.stage == .foil:
            shape.strokeBorder(AngularGradient(colors: Theme.holo, center: .center).opacity(revealed ? 0.55 : 0.8), lineWidth: 1.5)
        case .glow:
            shape.strokeBorder(swatch.background.opacity(0.7), lineWidth: 1.5)
        case .sheet, .type:
            shape.strokeBorder(skin.outlineColor, style: Theme.outlineStyle())
        case .wash, .flat:
            EmptyView()
        }
    }
}

/// A card's shadow, which on a glowing skin takes the colour of the card's own type.
private struct CardShadow: ViewModifier {
    let skin: DexSkin
    let shape: RoundedRectangle
    let glow: Color

    func body(content: Content) -> some View {
        if skin.card == .glow {
            content.shadow(color: glow.opacity(0.35), radius: 9)
        } else {
            content.dexShadow(shape, soft: 0.12, radius: 12, y: 6)
        }
    }
}
