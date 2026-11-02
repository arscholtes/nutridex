import SwiftUI

/// The lens, which takes each entry's type colour.
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

/// The top plate's stepped lower edge.
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

/// The device's top plate: lens, three lights and the name.
struct DexPlate: View {
    var lens: Color = Color(hex: "#38B6F2")
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
                    .accessibilityAddTraits(.isHeader)
            }
            Spacer(minLength: 0)
            if let onSources {
                Button("Sources", action: onSources)
                    .font(.dex(.subheadline, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.top, 2)
            }
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

/// The light screen in its bezel, with the two small lights above it.
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

/// The panel an entry opens with: its number and art on its type colour, then its name.
struct EntryViewer<Art: View, Details: View>: View {
    let number: String
    let type: String?
    let name: String
    var artWidth: CGFloat = 240
    var revealed = true
    @ViewBuilder let art: Art
    @ViewBuilder let details: Details

    var body: some View {
        let swatch = revealed ? Dex.bundled.palette.swatch(for: type) : TypeSwatch(color: "#33403B", textOnColor: "light")
        VStack(alignment: .leading, spacing: 8) {
            VStack(alignment: .leading, spacing: 6) {
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
            Text(name)
                .font(.dex(.largeTitle, weight: .heavy))
                .foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            details
        }
    }
}
