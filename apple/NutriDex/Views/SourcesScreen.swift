import SwiftUI

/// The sources.
struct SourcesScreen: View {
    var body: some View {
        DexScreen { SourcesList() }
            .navigationTitle("Sources")
            .navigationBarTitleDisplayMode(.inline)
    }
}

/// Your account, or signing in.
struct AccountRouteScreen: View {
    var body: some View {
        DexScreen { AccountScreen() }
            .navigationBarTitleDisplayMode(.inline)
    }
}

/// The skins.
struct SkinsScreen: View {
    var body: some View {
        DexScreen { SkinsList() }
            .navigationBarTitleDisplayMode(.inline)
    }
}
