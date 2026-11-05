import SwiftUI

struct RGB {
    let red: Double
    let green: Double
    let blue: Double

    /// - Parameter hex: a colour as #RRGGBB
    init(hex: String) {
        let value = UInt32(hex.dropFirst(), radix: 16) ?? 0
        red = Double((value >> 16) & 0xFF) / 255
        green = Double((value >> 8) & 0xFF) / 255
        blue = Double(value & 0xFF) / 255
    }
}

extension Color {
    init(hex: String) {
        let c = RGB(hex: hex)
        self.init(red: c.red, green: c.green, blue: c.blue)
    }
}

/// A colour as the snapshot writes it.
struct SkinColor: Decodable {
    let color: Color

    init(from decoder: Decoder) throws {
        color = Color(hex: try decoder.singleValueContainer().decode(String.self))
    }
}

/// One look someone can choose. lib/skins.ts holds the table, and the snapshot carries it here, so the web
/// and the apps cannot disagree about what a skin is.
struct DexSkin: Decodable, Identifiable, Hashable {
    enum Shell: String, Decodable { case page, handheld }
    enum Backdrop: String, Decodable { case flat, pearl, dots, depths, scanlines }
    enum Stage: String, Decodable { case foil, flat, plate, type, glow, tint }
    enum CardFace: String, Decodable { case wash, flat, sheet, type, glow }
    enum CreatureLook: String, Decodable { case plain, sticker, glow }
    enum MeterLook: String, Decodable { case pill, thin, solid, segments }
    enum Title: String, Decodable { case none, thick, hair, dashed, banner }
    enum Hero: String, Decodable {
        case artFirst = "art-first"
        case titleFirst = "title-first"
    }
    enum Nav: String, Decodable { case round, text }
    enum Mark: String, Decodable { case holo, accent, none }
    enum ShadowLook: String, Decodable { case none, soft, hard }

    struct Colors: Decodable {
        let screen, card, line, ink, inkSoft, accent, night, onNight, tile, onTile, chip, onChip, hidden, notice, danger: SkinColor
    }

    struct Typeface: Decodable {
        enum Design: String, Decodable {
            case `default`, rounded, serif, monospaced

            var font: Font.Design {
                switch self {
                case .default: .default
                case .rounded: .rounded
                case .serif: .serif
                case .monospaced: .monospaced
                }
            }
        }

        enum Weight: String, Decodable {
            case regular, medium, semibold, bold, heavy, black

            var font: Font.Weight {
                switch self {
                case .regular: .regular
                case .medium: .medium
                case .semibold: .semibold
                case .bold: .bold
                case .heavy: .heavy
                case .black: .black
                }
            }
        }

        let design: Design
        let heading: Weight
        let strong: Weight
    }

    struct Radius: Decodable {
        let card, tile, panel: CGFloat
        /// Nil is a pill, whatever its height.
        let control: CGFloat?

        private enum CodingKeys: String, CodingKey { case card, tile, panel, control }

        init(from decoder: Decoder) throws {
            let values = try decoder.container(keyedBy: CodingKeys.self)
            card = try values.decode(CGFloat.self, forKey: .card)
            tile = try values.decode(CGFloat.self, forKey: .tile)
            panel = try values.decode(CGFloat.self, forKey: .panel)
            control = (try? values.decode(String.self, forKey: .control)) == "pill" ? nil : try values.decode(CGFloat.self, forKey: .control)
        }
    }

    struct Outline: Decodable {
        enum Ink: String, Decodable { case ink, line, accent }
        let width: CGFloat
        let color: Ink
        let dashed: Bool
    }

    let id: String
    let name: String
    let about: String
    let shell: Shell
    let dark: Bool
    let colors: Colors
    let font: Typeface
    let radius: Radius
    let outline: Outline
    let shadow: ShadowLook
    let backdrop: Backdrop
    let stage: Stage
    let card: CardFace
    let creature: CreatureLook
    let meter: MeterLook
    let glass: Bool
    let title: Title
    let period: Bool
    let hero: Hero
    let nav: Nav
    let mark: Mark

    static func == (a: DexSkin, b: DexSkin) -> Bool { a.id == b.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }

    var scheme: ColorScheme { dark ? .dark : .light }

    var outlineColor: Color {
        switch outline.color {
        case .ink: colors.ink.color
        case .line: colors.line.color
        case .accent: colors.accent.color
        }
    }

    /// - Parameter asked: the emphasis a view asks for
    /// - Returns: how heavy this skin sets it: a heavy heading and bold text each have their own weight here
    func weight(for asked: Font.Weight) -> Font.Weight {
        switch asked {
        case .heavy: font.heading.font
        case .bold: font.strong.font
        default: asked
        }
    }

    /// - Parameter title: a section's name
    /// - Returns: the name as this skin writes it
    func heading(_ title: String) -> String {
        let written = period ? "\(title)." : title
        return self.title == .dashed ? written.uppercased() : written
    }
}

/// The colours of the skin being worn. The root view redraws everything when the skin changes.
enum Theme {
    nonisolated(unsafe) static var skin = Dex.bundled.skins[0]
    static var isHandheld: Bool { skin.shell == .handheld }

    static var screen: Color { skin.colors.screen.color }
    static var card: Color { skin.colors.card.color }
    static var line: Color { skin.colors.line.color }
    static var ink: Color { skin.colors.ink.color }
    static var inkSoft: Color { skin.colors.inkSoft.color }
    /// Links, selection and anything else that needs one strong colour.
    static var accent: Color { skin.colors.accent.color }
    /// A main button.
    static var night: Color { skin.colors.night.color }
    static var onNight: Color { skin.colors.onNight.color }
    /// The largest tile, the back of a card not yet encountered, and the veil behind an unlock.
    static var tile: Color { skin.colors.tile.color }
    static var onTile: Color { skin.colors.onTile.color }
    static var chip: Color { skin.colors.chip.color }
    static var onChip: Color { skin.colors.onChip.color }
    /// What a blacked-out creature stands on.
    static var hidden: Color { skin.colors.hidden.color }
    static var notice: Color { skin.colors.notice.color }
    static var danger: Color { skin.colors.danger.color }

    // The handheld's shell.
    static let shell = Color(hex: "#D3222A")
    static let shellBody = Color(hex: "#BD1C25")
    static let shellDeep = Color(hex: "#8F141C")
    static let bezel = Color(hex: "#E4E7E8")

    /// What a holographic card runs through, ending where it started so the sweep has no seam.
    static let holo = ["#7DF0D2", "#7CC8FF", "#9C9BFF", "#D38BFF", "#FF9AD5", "#FFD29A", "#7DF0D2"].map { Color(hex: $0) }

    /// The shape of a chip, field or button.
    static var control: AnyShape { skin.radius.control.map { AnyShape(RoundedRectangle(cornerRadius: $0)) } ?? AnyShape(Capsule()) }

    /// What a bar of progress fills with.
    static var progressFill: AnyShapeStyle {
        skin.stage == .foil ? AnyShapeStyle(LinearGradient(colors: holo, startPoint: .leading, endPoint: .trailing)) : AnyShapeStyle(accent)
    }

    /// The sidebar's wash over the page, on the one page pale enough to want it.
    static var sidebarWash: Color { skin.backdrop == .pearl ? .white.opacity(0.4) : .clear }

    /// How the outline runs, at the skin's own width or a chosen one.
    static func outlineStyle(width: CGFloat? = nil) -> StrokeStyle {
        StrokeStyle(lineWidth: width ?? skin.outline.width, dash: skin.outline.dashed ? [4, 3] : [])
    }
}

extension View {
    /// Draws the skin's outline. Some skins have none.
    @ViewBuilder func dexOutline(_ shape: some InsettableShape, width: CGFloat? = nil) -> some View {
        if Theme.skin.outline.width > 0 {
            overlay(shape.strokeBorder(Theme.skin.outlineColor, style: Theme.outlineStyle(width: width)))
        } else {
            self
        }
    }

    /// Draws the skin's outline round a chip, field or button.
    @ViewBuilder func dexControlOutline() -> some View {
        if Theme.skin.outline.width > 0 {
            overlay(Theme.control.stroke(Theme.skin.outlineColor, style: Theme.outlineStyle()))
        } else {
            self
        }
    }

    /// Something floating over what scrolls beneath it: frosted glass, or a solid card.
    @ViewBuilder func dexFloating(in shape: some InsettableShape) -> some View {
        if Theme.skin.glass {
            glassEffect(.regular, in: shape)
        } else {
            background(Theme.card, in: shape)
                .overlay(shape.strokeBorder(Theme.skin.outlineColor, style: Theme.outlineStyle(width: max(1, Theme.skin.outline.width))))
        }
    }

    /// The skin's shadow: a soft tinted one, a hard edge of ink beneath, or none.
    /// - Parameters:
    ///   - shape: the outline of what casts it
    ///   - soft: how strong a soft shadow is, from 0 to 1
    ///   - radius: how far a soft shadow spreads
    ///   - y: how far down a soft shadow falls
    @ViewBuilder func dexShadow(_ shape: some InsettableShape, soft: Double, radius: CGFloat, y: CGFloat) -> some View {
        switch Theme.skin.shadow {
        case .none: self
        case .soft: shadow(color: Theme.accent.opacity(soft), radius: radius, y: y)
        case .hard: background(shape.fill(Theme.ink).offset(y: 3))
        }
    }

    /// Sets a creature off from what it stands on, never by touching its colours.
    /// - Parameter skin: the look to use, where it is not the one being worn
    @ViewBuilder func dexCreatureLook(_ skin: DexSkin = Theme.skin) -> some View {
        switch skin.creature {
        case .plain:
            self
        case .sticker:
            shadow(color: .white, radius: 0, x: 2)
                .shadow(color: .white, radius: 0, x: -2)
                .shadow(color: .white, radius: 0, y: 2)
                .shadow(color: .white, radius: 0, y: -2)
                .shadow(color: .black.opacity(0.25), radius: 2, y: 3)
        case .glow:
            shadow(color: .white.opacity(0.35), radius: 8)
        }
    }
}

extension Font {
    /// The skin's system face, so every size follows Dynamic Type.
    static func dex(_ style: Font.TextStyle, weight: Font.Weight = .regular) -> Font {
        .system(style, design: Theme.skin.font.design.font, weight: Theme.skin.weight(for: weight))
    }

    /// Dex numbers keep their digits in line, and on the handheld read as a device readout.
    static func dexNumber(_ style: Font.TextStyle) -> Font {
        Theme.isHandheld ? .system(style, design: .monospaced, weight: .medium) : .system(style, design: Theme.skin.font.design.font, weight: Theme.skin.font.strong.font).monospacedDigit()
    }
}

extension TypeSwatch {
    var background: Color { Color(hex: color) }
    /// Sits on the swatch itself, so it does not follow a dark skin's ink.
    var foreground: Color { textOnColor == "light" ? .white : Color(hex: "#1C2823") }
}
