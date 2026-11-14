import SwiftUI

/// Who this device is signed in as, with signing out and deleting the account. Signed out, it is where you sign in.
struct AccountScreen: View {
    @Environment(DexGame.self) private var game
    @State private var confirmingDelete = false
    @State private var problem: String?

    var body: some View {
        if let email = game.signedInEmail {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Account").font(.dex(.largeTitle, weight: .heavy)).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                    Text("Signed in as").font(.dex(.subheadline, weight: .bold)).foregroundStyle(Theme.inkSoft)
                    Text(email).font(.dex(.title3, weight: .bold)).foregroundStyle(Theme.ink)
                    Note(text: "What you unlock and the skin you wear are kept on this account. To download everything, use Settings on the NutriDex website.")
                    Button("Sign out") { Task { await game.signOut() } }
                        .buttonStyle(DexPrimaryButton())
                    Button("Delete account", role: .destructive) { confirmingDelete = true }
                        .font(.dex(.subheadline, weight: .bold))
                        .foregroundStyle(Theme.danger)
                    if let problem {
                        Text(problem).font(.dex(.footnote, weight: .bold)).foregroundStyle(Theme.danger).fixedSize(horizontal: false, vertical: true)
                    }
                }
                .frame(maxWidth: 520, alignment: .leading)
                .padding(16)
                .frame(maxWidth: .infinity)
            }
            .confirmationDialog("Delete your account?", isPresented: $confirmingDelete, titleVisibility: .visible) {
                Button("Delete account and everything on it", role: .destructive) {
                    Task {
                        do {
                            try await game.deleteAccount()
                            problem = nil
                        } catch {
                            problem = (error as? EncounterProblem)?.message ?? error.localizedDescription
                        }
                    }
                }
            } message: {
                Text("Your unlocked foods, your skin and your recipes are removed from NutriDex on every device. This cannot be undone.")
            }
        } else {
            SignInScreen(closesWhenDone: false)
        }
    }
}
