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

    private func send(_ method: String, _ path: String, _ body: Data?) async throws -> Data {
        guard let baseURL else { throw EncounterProblem("This app has no server address set, so it cannot reach your account.") }
        guard let session = sessions.current() else { throw EncounterProblem.signedOut }
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        request.httpBody = body
        request.setValue("Bearer \(session.token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await network.data(for: request)
        } catch {
            throw EncounterProblem("NutriDex did not answer: \(error.localizedDescription)")
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401 {
            sessions.clear()
            throw EncounterProblem("You were signed out. Sign in again.")
        }
        guard (200..<300).contains(status) else {
            throw EncounterProblem((try? JSONDecoder().decode(ServerError.self, from: data))?.error ?? "NutriDex refused that.")
        }
        return data
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
