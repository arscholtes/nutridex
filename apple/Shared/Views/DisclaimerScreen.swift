import SwiftUI

/// The notice, as the first screen, with no way into the Dex until it is accepted.
struct DisclaimerScreen: View {
    let onAccept: () -> Void

    private var notice: Disclaimer { Dex.bundled.disclaimer }

    var body: some View {
        if Theme.isHandheld {
            VStack(spacing: 0) {
                DexPlate()
                ScreenBezel { noticeBody }
            }
            .background(Theme.shellBody.ignoresSafeArea())
        } else {
            noticeBody.background(DexBackdrop())
        }
    }

    private var noticeBody: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if !Theme.isHandheld { DexWordmark() }
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
                Button("I understand and agree", action: onAccept)
                    .buttonStyle(DexPrimaryButton(fullWidth: true))
            }
            .frame(maxWidth: 640)
            .padding(18)
            .frame(maxWidth: .infinity)
        }
    }
}
