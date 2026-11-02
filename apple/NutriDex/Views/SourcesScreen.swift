import SwiftUI

/// The sources, in the device's bezel.
struct SourcesScreen: View {
    var body: some View {
        ScreenBezel { SourcesList() }
            .background(Theme.shellBody.ignoresSafeArea())
            .navigationTitle("Sources")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Theme.shell, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
    }
}
