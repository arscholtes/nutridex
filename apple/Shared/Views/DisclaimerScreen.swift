import SwiftUI

/// The notice, as the device's first screen, with no way into the Dex until it is accepted.
struct DisclaimerScreen: View {
    let onAccept: () -> Void

    private var notice: Disclaimer { Dex.bundled.disclaimer }

    var body: some View {
        VStack(spacing: 0) {
            DexPlate()
            ScreenBezel {
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(notice.title).font(.dex(.title, weight: .heavy)).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                            Note(text: "\(notice.intro) Version \(Dex.bundled.version).")
                        }
                        ForEach(notice.sections, id: \.heading) { section in
                            VStack(alignment: .leading, spacing: 3) {
                                Text(section.heading).font(.dex(.headline, weight: .bold)).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                                Text(section.body).font(.dex(.body)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                            }
                        }
                        Button(action: onAccept) {
                            Text("I understand and agree")
                                .font(.dex(.headline, weight: .heavy))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 13)
                                .background(Theme.shell, in: RoundedRectangle(cornerRadius: 10))
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.ink, lineWidth: 2))
                        }
                        .buttonStyle(.plain)
                    }
                    .frame(maxWidth: 640)
                    .padding(16)
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .background(Theme.shellBody.ignoresSafeArea())
    }
}
