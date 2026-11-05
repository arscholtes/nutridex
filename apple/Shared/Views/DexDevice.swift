import SwiftUI

/// The page everything sits on, in the skin's own way.
struct DexBackdrop: View {
    var skin = Theme.skin

    var body: some View {
        Group {
            switch skin.backdrop {
            case .flat: skin.colors.screen.color
            case .pearl: mesh
            case .dots: dots
            case .depths: depths
            case .scanlines: scanlines
            }
        }
        .ignoresSafeArea()
    }

    private var dots: some View {
        Canvas { context, size in
            let gap: CGFloat = 18
            for x in stride(from: gap / 2, to: size.width, by: gap) {
                for y in stride(from: gap / 2, to: size.height, by: gap) {
                    context.fill(Path(ellipseIn: CGRect(x: x - 1.5, y: y - 1.5, width: 3, height: 3)), with: .color(skin.colors.line.color))
                }
            }
        }
        .background(skin.colors.screen.color)
    }

    private var depths: some View {
        skin.colors.screen.color
            .overlay(RadialGradient(colors: [skin.colors.accent.color.opacity(0.22), .clear], center: .top, startRadius: 0, endRadius: 520))
            .overlay(RadialGradient(colors: [skin.colors.tile.color.opacity(0.9), .clear], center: .bottomTrailing, startRadius: 0, endRadius: 460))
    }

    private var scanlines: some View {
        Canvas { context, size in
            for y in stride(from: 0, to: size.height, by: 3) {
                context.fill(Path(CGRect(x: 0, y: y, width: size.width, height: 1)), with: .color(.white.opacity(0.035)))
            }
        }
        .background(skin.colors.screen.color)
    }

    private var mesh: some View {
        MeshGradient(
            width: 3,
            height: 3,
            points: [
                [0, 0], [0.5, 0], [1, 0],
                [0, 0.5], [0.55, 0.42], [1, 0.5],
                [0, 1], [0.45, 1], [1, 1],
            ],
            colors: [
                Color(hex: "#D9FAF0"), Color(hex: "#EEF3FF"), Color(hex: "#E6DCFF"),
                Color(hex: "#D3EEFF"), Color(hex: "#FBFAFF"), Color(hex: "#FFE0F2"),
                Color(hex: "#E6DCFF"), Color(hex: "#FFEEDB"), Color(hex: "#D5F9EA"),
            ]
        )
    }
}

/// Holographic foil: colours that melt into each other, with a band of light across them.
struct HoloFoil: View {
    var body: some View {
        MeshGradient(
            width: 3,
            height: 3,
            points: [
                [0, 0], [0.5, 0], [1, 0],
                [0, 0.5], [0.62, 0.38], [1, 0.5],
                [0, 1], [0.38, 1], [1, 1],
            ],
            colors: [
                Color(hex: "#D38BFF"), Color(hex: "#FF9AD5"), Color(hex: "#FFD29A"),
                Color(hex: "#9C9BFF"), Color(hex: "#F4F1FF"), Color(hex: "#7DF0D2"),
                Color(hex: "#7CC8FF"), Color(hex: "#7DE3F0"), Color(hex: "#B8F5C9"),
            ]
        )
        .overlay {
            LinearGradient(
                stops: [
                    .init(color: .white.opacity(0), location: 0.3),
                    .init(color: .white.opacity(0.5), location: 0.48),
                    .init(color: .white.opacity(0), location: 0.66),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
}

extension EnvironmentValues {
    /// How far the page holding a view has been swiped from rest, from -1 to 1. Zero anywhere that does not swipe.
    @Entry var swipePhase: Double = 0
}

/// What a creature stands on at the top of an entry, in the skin's own way.
struct StageBacking: View {
    let skin: DexSkin
    let type: String?
    /// How far foil's colours have shifted. No other stage catches the light.
    var hueShift: Double = 0

    private var swatch: Color { Dex.bundled.palette.swatch(for: type).background }

    var body: some View {
        switch skin.stage {
        case .foil: HoloFoil().hueRotation(.degrees(hueShift))
        case .flat, .plate: skin.colors.card.color
        case .type: swatch
        case .tint: swatch.mix(with: .white, by: 0.72)
        case .glow:
            skin.colors.card.color
                .overlay(RadialGradient(colors: [swatch.opacity(0.6), .clear], center: .center, startRadius: 0, endRadius: 170))
        }
    }
}

/// The creature at the top of an entry on the skin's stage. On foil it is the one loud thing on any screen:
/// swiping tilts the card and shifts the foil's colours, the way a real one catches the light, and the
/// creature keeps its own.
struct DexStage<Content: View>: View {
    let type: String?
    var revealed = true
    @ViewBuilder let content: Content
    @Environment(\.swipePhase) private var phase

    private var skin: DexSkin { Theme.skin }
    private var isFoil: Bool { skin.stage == .foil }
    private var shape: RoundedRectangle { RoundedRectangle(cornerRadius: isFoil ? 28 : skin.radius.card) }

    var body: some View {
        content
            .padding(skin.hero == .titleFirst ? 36 : 20)
            .frame(maxWidth: .infinity)
            .background {
                if revealed { StageBacking(skin: skin, type: type, hueShift: phase * 70) } else { Theme.tile }
            }
            .clipShape(shape)
            .overlay {
                if isFoil {
                    shape.strokeBorder(.white.opacity(0.85), lineWidth: 2.5)
                } else if skin.stage == .plate {
                    shape.strokeBorder(skin.outlineColor, style: Theme.outlineStyle())
                    shape.inset(by: 7).strokeBorder(Theme.ink, lineWidth: 1)
                } else if skin.outline.width > 0 {
                    shape.strokeBorder(skin.outlineColor, style: Theme.outlineStyle())
                }
            }
            .background {
                if skin.shadow == .hard { shape.fill(Theme.accent).offset(x: 5, y: 5) }
            }
            .shadow(color: isFoil ? Theme.accent.opacity(0.28) : .clear, radius: 20, y: 12)
            .rotation3DEffect(.degrees(isFoil ? phase * -22 : 0), axis: (x: 0, y: 1, z: 0), perspective: 0.6)
    }
}

/// The handheld's lens, which takes each entry's type colour.
struct Lens: View {
    let color: Color
    let size: CGFloat

    var body: some View {
        Circle()
            .fill(RadialGradient(colors: [color.mix(with: .white, by: 0.55), color, color.mix(with: .black, by: 0.45)], center: UnitPoint(x: 0.42, y: 0.38), startRadius: 0, endRadius: size * 0.62))
            .overlay(alignment: .topLeading) {
                Circle().fill(.white).frame(width: size * 0.18, height: size * 0.18).offset(x: size * 0.25, y: size * 0.2)
            }
            .frame(width: size, height: size)
            .overlay(Circle().stroke(.white, lineWidth: size * 0.07).padding(-size * 0.035))
            .overlay(Circle().stroke(Theme.shellDeep, lineWidth: size * 0.03).padding(-size * 0.085))
            .accessibilityHidden(true)
    }
}

/// The handheld's top plate's stepped lower edge.
struct PlateShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + rect.height * 0.62))
        path.addLine(to: CGPoint(x: rect.minX + rect.width * 0.68, y: rect.minY + rect.height * 0.62))
        path.addLine(to: CGPoint(x: rect.minX + rect.width * 0.61, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.closeSubpath()
        return path
    }
}

/// The handheld's top plate: lens, three lights and the name.
struct DexPlate: View {
    var lens: Color = Color(hex: "#38B6F2")
    var onSkins: (() -> Void)?
    var onSources: (() -> Void)?

    var body: some View {
        HStack(alignment: .top, spacing: 18) {
            Lens(color: lens, size: 58)
                .padding(.leading, 6)
                .padding(.top, 6)
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 7) {
                    ForEach(["#FF5A52", "#FFD23F", "#52D273"], id: \.self) { hex in
                        Circle()
                            .fill(Color(hex: hex))
                            .frame(width: 11, height: 11)
                            .overlay(Circle().stroke(Theme.shellDeep, lineWidth: 1.5))
                    }
                }
                .accessibilityHidden(true)
                Text("NutriDex")
                    .font(.dex(.title2, weight: .heavy))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .accessibilityAddTraits(.isHeader)
            }
            Spacer(minLength: 0)
            HStack(spacing: 14) {
                if let onSkins {
                    Button("Skins", action: onSkins)
                }
                if let onSources {
                    Button("Sources", action: onSources)
                }
            }
            .font(.dex(.subheadline, weight: .bold))
            .foregroundStyle(.white)
            .fixedSize()
            .padding(.top, 2)
        }
        .padding(.horizontal, 14)
        .padding(.bottom, 22)
        .background {
            ZStack {
                PlateShape().fill(Theme.shellDeep).offset(y: 4)
                PlateShape().fill(Theme.shell)
            }
            .ignoresSafeArea(edges: .top)
        }
    }
}

/// The handheld's light screen in its bezel, with the two small lights above it.
struct ScreenBezel<Content: View>: View {
    @ViewBuilder let content: Content

    private let frame = UnevenRoundedRectangle(topLeadingRadius: 14, bottomLeadingRadius: 40, bottomTrailingRadius: 14, topTrailingRadius: 14)
    private let glass = UnevenRoundedRectangle(topLeadingRadius: 8, bottomLeadingRadius: 34, bottomTrailingRadius: 8, topTrailingRadius: 8)

    var body: some View {
        VStack(spacing: 7) {
            HStack(spacing: 14) {
                Circle().fill(Theme.shell).frame(width: 7, height: 7)
                Circle().fill(Theme.shell).frame(width: 7, height: 7)
            }
            .accessibilityHidden(true)
            content
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Theme.screen)
                .clipShape(glass)
                .overlay(glass.stroke(Theme.ink, lineWidth: 2))
        }
        .padding(.top, 8)
        .padding([.horizontal, .bottom], 8)
        .background(Theme.bezel, in: frame)
        .background(frame.fill(Theme.shellDeep).offset(y: 4))
        .padding(.horizontal, 8)
        .padding(.top, 6)
        .padding(.bottom, 8)
    }
}

/// A screen's surroundings: the page, or the handheld's bezel on its shell.
struct DexScreen<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        if Theme.isHandheld {
            ScreenBezel { content }
                .background(Theme.shellBody.ignoresSafeArea())
                #if os(iOS)
                .toolbarBackground(Theme.shell, for: .navigationBar)
                .toolbarBackground(.visible, for: .navigationBar)
                .toolbarColorScheme(.dark, for: .navigationBar)
                #endif
        } else {
            content.background(DexBackdrop())
        }
    }
}

/// The app's name.
struct DexWordmark: View {
    var body: some View {
        HStack(spacing: 8) {
            switch Theme.skin.mark {
            case .holo:
                Circle()
                    .fill(AngularGradient(colors: Theme.holo, center: .center))
                    .frame(width: 22, height: 22)
                    .overlay(Circle().strokeBorder(.white, lineWidth: 2))
                    .shadow(color: Theme.accent.opacity(0.3), radius: 5, y: 2)
                    .accessibilityHidden(true)
            case .accent:
                Circle().fill(Theme.accent).frame(width: 18, height: 18).accessibilityHidden(true)
            case .none:
                EmptyView()
            }
            Text("NutriDex")
                .font(.dex(Theme.skin.hero == .titleFirst ? .headline : .title, weight: .heavy))
                .foregroundStyle(Theme.ink)
                .fixedSize()
                .accessibilityAddTraits(.isHeader)
        }
    }
}

/// The main action on a screen: dark and pill-shaped, and big enough for a thumb.
struct DexPrimaryButton: ButtonStyle {
    var fullWidth = false
    /// Sitting on the handheld's red, where a red button would disappear.
    var onShell = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.dex(.subheadline, weight: .heavy))
            .foregroundStyle(onShell && Theme.isHandheld ? Theme.ink : Theme.onNight)
            .padding(.horizontal, 16)
            .frame(maxWidth: fullWidth ? .infinity : nil, minHeight: 44)
            .background(onShell && Theme.isHandheld ? .white : Theme.night, in: Theme.control)
            .dexControlOutline()
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.spring(duration: 0.2), value: configuration.isPressed)
    }
}

/// The panel an entry opens with: its creature on the skin's stage, with its number and name below it, or
/// on a skin that reads like a product page, set large and centred above it.
struct EntryViewer<Art: View, Details: View>: View {
    let number: String
    let type: String?
    let name: String
    var artWidth: CGFloat = 240
    var revealed = true
    @ViewBuilder let art: Art
    @ViewBuilder let details: Details
    @ScaledMetric(relativeTo: .largeTitle) private var headlineSize: CGFloat = 44

    var body: some View {
        if Theme.skin.hero == .titleFirst {
            VStack(spacing: 10) {
                numberText
                title.font(.system(size: headlineSize, weight: Theme.skin.font.heading.font, design: Theme.skin.font.design.font))
                details.multilineTextAlignment(.center)
                stage.padding(.top, 8)
            }
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
        } else {
            VStack(alignment: .leading, spacing: 10) {
                if Theme.isHandheld {
                    handheldPanel
                } else {
                    stage
                    numberText
                }
                title.font(.dex(.largeTitle, weight: .heavy))
                details
            }
        }
    }

    private var stage: some View {
        DexStage(type: type, revealed: revealed) {
            art.frame(maxWidth: artWidth)
                .shadow(color: Theme.skin.stage == .foil ? Theme.tile.opacity(0.28) : .clear, radius: 12, y: 10)
        }
    }

    private var numberText: some View {
        Text(number)
            .font(.dexNumber(.subheadline))
            .foregroundStyle(Theme.inkSoft)
    }

    private var title: some View {
        Text(name)
            .foregroundStyle(Theme.ink)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.isHeader)
    }

    private var handheldPanel: some View {
        let swatch = revealed ? Dex.bundled.palette.swatch(for: type) : TypeSwatch(color: "#33403B", textOnColor: "light")
        return VStack(alignment: .leading, spacing: 6) {
            Text(number)
                .font(.dexNumber(.title3))
                .foregroundStyle(swatch.foreground)
            art
                .frame(maxWidth: artWidth)
                .frame(maxWidth: .infinity)
        }
        .padding(12)
        .background(swatch.background, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.ink, lineWidth: 2))
    }
}
