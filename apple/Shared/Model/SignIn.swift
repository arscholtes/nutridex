import CryptoKit
import Foundation
import Security

/// The secret an app keeps while Google's sheet is open, and the hash the server is shown (RFC 7636).
enum PKCE {
    /// - Returns: 32 random bytes, as 43 URL-safe characters
    static func verifier() -> String {
        urlSafeRandom(bytes: 32)
    }

    static func challenge(for verifier: String) -> String {
        urlSafe(Data(SHA256.hash(data: Data(verifier.utf8))))
    }
}

/// The nonce bound into Apple's token: Apple is given its hash and the server the nonce itself, so a token cannot be replayed.
enum AppleNonce {
    static func make() -> String {
        urlSafeRandom(bytes: 32)
    }

    static func hashed(_ nonce: String) -> String {
        SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

/// Reads where Google's sheet came back to: the app's own address, carrying a code or a refusal.
enum SheetCallback {
    static let scheme = "nutridex"

    /// - Returns: the code to trade at POST /api/v1/session
    /// - Throws: `EncounterProblem` saying why, when the address is not the app's or carries no code
    static func code(from url: URL) throws -> String {
        guard url.scheme == scheme, url.host() == "auth", url.path() == "/callback",
              let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems
        else { throw EncounterProblem("Google sent you back somewhere NutriDex does not know.") }
        if let code = items.first(where: { $0.name == "code" })?.value, !code.isEmpty { return code }
        let reason = items.first { $0.name == "error_description" }?.value ?? items.first { $0.name == "error" }?.value ?? "no reason given"
        throw EncounterProblem("Google did not sign you in: \(reason)")
    }
}

/// What proves who someone is, in the shape POST /api/v1/session takes.
enum SignInProof {
    case emailed(email: String, code: String)
    case apple(idToken: String, nonce: String)
    case sheet(code: String, verifier: String)

    var body: [String: String] {
        switch self {
        case let .emailed(email, code): ["email": email, "code": code]
        case let .apple(idToken, nonce): ["provider": "apple", "idToken": idToken, "nonce": nonce]
        case let .sheet(code, verifier): ["code": code, "codeVerifier": verifier]
        }
    }
}

/// Signing in, out and deleting the account. The apps reach it through `APITransport`; tests stand in for it.
protocol AccountTransport {
    /// The email of the session kept on this device, or nil when signed out.
    var signedInEmail: String? { get }
    func googleStart(challenge: String) throws -> URL
    func requestCode(email: String) async throws
    func signIn(_ proof: SignInProof) async throws
    func signOut() async
    func deleteAccount() async throws
}

private func urlSafeRandom(bytes count: Int) -> String {
    var bytes = [UInt8](repeating: 0, count: count)
    let status = SecRandomCopyBytes(kSecRandomDefault, count, &bytes)
    precondition(status == errSecSuccess, "the system's random source failed (\(status))")
    return urlSafe(Data(bytes))
}

private func urlSafe(_ data: Data) -> String {
    data.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
}
