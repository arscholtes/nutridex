import SwiftUI

/// A creature not yet encountered: its shape, blacked out, against a burst of rays.
struct SilhouetteTile: View {
    let assetName: String

    var body: some View {
        RoundedRectangle(cornerRadius: 18)
            .fill(Theme.hidden)
            .overlay {
                Rays()
            }
            .overlay {
                Image(assetName)
                    .resizable()
                    .renderingMode(.template)
                    .scaledToFit()
                    .foregroundStyle(.black)
            }
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .aspectRatio(1, contentMode: .fit)
            .accessibilityHidden(true)
    }
}

/// A burst of rays from the centre.
struct Rays: View {
    var body: some View {
        Canvas { context, size in
            let center = CGPoint(x: size.width / 2, y: size.height / 2)
            let reach = max(size.width, size.height)
            let rays = 14
            for ray in 0..<rays {
                let start = Double(ray) / Double(rays) * 2 * .pi
                let end = start + .pi / Double(rays)
                var wedge = Path()
                wedge.move(to: center)
                wedge.addLine(to: CGPoint(x: center.x + cos(start) * reach, y: center.y + sin(start) * reach))
                wedge.addLine(to: CGPoint(x: center.x + cos(end) * reach, y: center.y + sin(end) * reach))
                wedge.closeSubpath()
                context.fill(wedge, with: .color(.white.opacity(0.14)))
            }
        }
    }
}
