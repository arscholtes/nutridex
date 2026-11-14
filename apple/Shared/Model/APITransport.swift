import Foundation

/// The server's `/api/v1`, at the address set in the build configuration, with this device's session as the key.
struct APITransport: EncounterTransport {
    let baseURL: URL?
    let sessions: SessionStore
    let network: URLSession

    init(baseURL: URL?, sessions: SessionStore = SessionStore(), network: URLSession = .shared) {
        self.baseURL = baseURL
        self.sessions = sessions
        self.network = network
    }

    static var configured: APITransport {
        APITransport(baseURL: (Bundle.main.infoDictionary?["NutriDexAPIURL"] as? String).flatMap(URL.init(string:)))
    }

    func upload(_ items: [UploadItem]) async throws -> UploadResponse {
        let uploaded = try JSONDecoder().decode(Uploaded.self, from: await send("POST", "api/v1/me/encounters", JSONEncoder().encode(UploadBody(encounters: items))))
        return UploadResponse(new: uploaded.new, encounters: uploaded.foods.map(\.onAccount))
    }

    func fetch() async throws -> [ServerEncounter] {
        try await me().foods.map(\.onAccount)
    }

    func fetchSkin() async throws -> String? {
        try await me().skin
    }

    func saveSkin(_ id: String) async throws {
        _ = try await send("PUT", "api/v1/me/skin", JSONEncoder().encode(SkinChoice(skin: id)))
    }

    private func me() async throws -> Me {
        try JSONDecoder().decode(Me.self, from: await send("GET", "api/v1/me", nil))
    }

    /// A call about the person signed in here, with their session as the key.
    private func send(_ method: String, _ path: String, _ body: Data?) async throws -> Data {
        guard let session = sessions.current() else { throw EncounterProblem.signedOut }
        return try await call(method, path, body, bearer: session.token)
    }

    private func call(_ method: String, _ path: String, _ body: Data?, bearer: String?) async throws -> Data {
        guard let baseURL else { throw noAddress }
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        request.httpBody = body
        if let bearer { request.setValue("Bearer \(bearer)", forHTTPHeaderField: "Authorization") }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await network.data(for: request)
        } catch {
            throw EncounterProblem("NutriDex did not answer: \(error.localizedDescription)")
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401, bearer != nil {
            sessions.clear()
            throw EncounterProblem("You were signed out. Sign in again.")
        }
        guard (200..<300).contains(status) else {
            throw EncounterProblem((try? JSONDecoder().decode(ServerError.self, from: data))?.error ?? "NutriDex refused that.")
        }
        return data
    }

    private var noAddress: EncounterProblem {
        EncounterProblem("This app has no server address set, so it cannot reach your account.")
    }

    private struct SessionReply: Decodable {
        let token: String
        let email: String
        let expiresAt: String
    }

    private struct Me: Decodable {
        let skin: String?
        let foods: [OwnedFood]
    }

    private struct Uploaded: Decodable {
        let new: [String]
        let foods: [OwnedFood]
    }

    private struct OwnedFood: Decodable {
        let food: String
        let firstHadAt: String

        // /api/v1 keeps no upload time per food; being on the account is what marks it uploaded here.
        var onAccount: ServerEncounter {
            ServerEncounter(food: food, encounteredAt: firstHadAt, uploadedAt: firstHadAt)
        }
    }

    private struct SkinChoice: Encodable {
        let skin: String
    }

    private struct ServerError: Decodable {
        let error: String
    }
}

extension APITransport: AccountTransport {
    var signedInEmail: String? { sessions.current()?.email }

    /// Where Google's sheet starts: the server, which knows where the sign-in service is. The app keeps the secret.
    func googleStart(challenge: String) throws -> URL {
        guard let baseURL else { throw noAddress }
        var start = URLComponents(url: baseURL.appending(path: "api/v1/session/start"), resolvingAgainstBaseURL: false)!
        start.queryItems = [URLQueryItem(name: "provider", value: "google"), URLQueryItem(name: "challenge", value: challenge)]
        return start.url!
    }

    func requestCode(email: String) async throws {
        _ = try await call("POST", "api/v1/session/code", JSONEncoder().encode(["email": email]), bearer: nil)
    }

    /// Trades a proof for a session, and keeps it on this device.
    func signIn(_ proof: SignInProof) async throws {
        let reply = try JSONDecoder().decode(SessionReply.self, from: await call("POST", "api/v1/session", JSONEncoder().encode(proof.body), bearer: nil))
        guard let expiresAt = UploadItem.dateFormat.date(from: reply.expiresAt) else {
            throw EncounterProblem("NutriDex sent back a sign-in this app could not read.")
        }
        try sessions.save(Session(token: reply.token, email: reply.email, expiresAt: expiresAt))
    }

    /// Signs this device out. The session is forgotten here even when the server cannot be reached; there it lapses on its own.
    func signOut() async {
        defer { sessions.clear() }
        _ = try? await send("DELETE", "api/v1/session", nil)
    }

    /// Deletes the account and everything on it, then signs this device out.
    func deleteAccount() async throws {
        _ = try await send("DELETE", "api/v1/me", nil)
        sessions.clear()
    }
}
