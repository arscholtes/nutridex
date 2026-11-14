import AuthenticationServices
import SwiftUI

/// Sign in, so what you unlock and the skin you wear follow you to every device you sign in on.
struct SignInScreen: View {
    @Environment(DexGame.self) private var game
    @Environment(\.webAuthenticationSession) private var webAuthenticationSession
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var code = ""
    @State private var codeSent = false
    @State private var working = false
    @State private var problem: String?
    @State private var nonce = AppleNonce.make()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Sign in").font(.dex(.largeTitle, weight: .heavy)).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                Note(text: "What you unlock and the skin you wear are kept on your account, so every device you sign in on shows the same Dex.")
                SignInWithAppleButton(.signIn) { request in
                    nonce = AppleNonce.make()
                    request.requestedScopes = [.email]
                    request.nonce = AppleNonce.hashed(nonce)
                } onCompletion: { result in
                    Task { await finishApple(result) }
                }
                .signInWithAppleButtonStyle(Theme.skin.scheme == .dark ? .white : .black)
                .frame(height: 50)
                Button("Continue with Google") { Task { await google() } }
                    .buttonStyle(DexPrimaryButton())
                Text("Or get a code by email").font(.dex(.subheadline, weight: .bold)).foregroundStyle(Theme.inkSoft).padding(.top, 8)
                emailFields
                if let problem {
                    Text(problem).font(.dex(.footnote, weight: .bold)).foregroundStyle(Theme.danger).fixedSize(horizontal: false, vertical: true)
                }
            }
            .frame(maxWidth: 520, alignment: .leading)
            .padding(16)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.screen)
        .disabled(working)
    }

    @ViewBuilder private var emailFields: some View {
        TextField("Email", text: $email)
            .textContentType(.emailAddress)
            .autocorrectionDisabled()
            #if os(iOS)
            .keyboardType(.emailAddress)
            .textInputAutocapitalization(.never)
            #endif
            .textFieldStyle(.roundedBorder)
        if codeSent {
            TextField("Six-digit code", text: $code)
                .textContentType(.oneTimeCode)
                #if os(iOS)
                .keyboardType(.numberPad)
                #endif
                .textFieldStyle(.roundedBorder)
            Button("Sign in") { Task { await run { try await game.signIn(.emailed(email: email, code: code)) } } }
                .buttonStyle(DexPrimaryButton())
        } else {
            Button("Email me a code") {
                Task {
                    await run(dismissing: false) {
                        try await game.transport.requestCode(email: email)
                        codeSent = true
                    }
                }
            }
            .buttonStyle(DexPrimaryButton())
        }
    }

    private func finishApple(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let data = credential.identityToken, let token = String(data: data, encoding: .utf8)
            else {
                problem = "Apple did not send back a sign-in NutriDex can use."
                return
            }
            await run { try await game.signIn(.apple(idToken: token, nonce: nonce)) }
        case .failure(let error):
            if (error as? ASAuthorizationError)?.code == .canceled { return }
            problem = error.localizedDescription
        }
    }

    private func google() async {
        let verifier = PKCE.verifier()
        await run {
            let start = try game.transport.googleStart(challenge: PKCE.challenge(for: verifier))
            let back = try await webAuthenticationSession.authenticate(using: start, callback: .customScheme(SheetCallback.scheme), additionalHeaderFields: [:])
            try await game.signIn(.sheet(code: SheetCallback.code(from: back), verifier: verifier))
        }
    }

    /// Runs one step of signing in, and says what went wrong. Closing the sheet yourself is not a problem.
    private func run(dismissing: Bool = true, _ work: () async throws -> Void) async {
        working = true
        defer { working = false }
        do {
            try await work()
            problem = nil
            if dismissing { dismiss() }
        } catch let error as ASWebAuthenticationSessionError where error.code == .canceledLogin {
            return
        } catch {
            problem = (error as? EncounterProblem)?.message ?? error.localizedDescription
        }
    }
}
