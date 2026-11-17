import SwiftUI

/// The sources.
struct SourcesScreen: View {
    var body: some View {
        DexScreen { SourcesList() }
            .navigationTitle("Sources")
            .navigationBarTitleDisplayMode(.inline)
    }
}

/// The recipes, one recipe, and cooking along with one. Each opens the next on the same stack.
struct RecipeScreens: View {
    @Environment(DexNavigator.self) private var nav
    let route: DexRoute

    var body: some View {
        DexScreen {
            switch route {
            case let .recipe(slug):
                if let recipe = Dex.bundled.recipes.first(where: { $0.slug == slug }) {
                    RecipeDetail(recipe: recipe) { nav.path.append(.cook(slug)) }
                } else {
                    MissingEntry()
                }
            case let .cook(slug):
                if let recipe = Dex.bundled.recipes.first(where: { $0.slug == slug }) {
                    CookAlongView(recipe: recipe) { nav.path.removeLast() }
                } else {
                    MissingEntry()
                }
            default:
                RecipesList { nav.path.append(.recipe($0.slug)) }
            }
        }
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
