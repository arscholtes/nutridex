import SwiftUI

@main
struct NutriDexMacApp: App {
    var body: some Scene {
        WindowGroup("NutriDex") {
            MacRootView()
        }
        .defaultSize(width: 1500, height: 960)
    }
}
