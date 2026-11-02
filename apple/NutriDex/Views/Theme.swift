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

enum Theme {
    static let shell = Color(hex: "#D3222A")
    static let shellBody = Color(hex: "#BD1C25")
    static let shellDeep = Color(hex: "#8F141C")
    static let bezel = Color(hex: "#E4E7E8")
    static let screen = Color(hex: "#EEF3E6")
    static let card = Color(hex: "#FBFDF7")
    static let line = Color(hex: "#CFD8C9")
    static let ink = Color(hex: "#1C2823")
    static let inkSoft = Color(hex: "#4D5B54")
}

extension Font {
    /// The rounded system face, so every size follows Dynamic Type.
    static func dex(_ style: Font.TextStyle, weight: Font.Weight = .regular) -> Font {
        .system(style, design: .rounded, weight: weight)
    }

    /// Dex numbers read as a device readout; amounts stay in the rounded face, where digits are unmistakable.
    static func dexNumber(_ style: Font.TextStyle) -> Font {
        .system(style, design: .monospaced, weight: .medium)
    }
}

extension TypeSwatch {
    var background: Color { Color(hex: color) }
    var foreground: Color { textOnColor == "light" ? .white : Theme.ink }
}
