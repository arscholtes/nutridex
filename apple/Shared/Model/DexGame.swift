import Foundation
import Observation

/// A failure someone should be told about, in words they can read.
struct EncounterProblem: Error, Equatable {
    let message: String

    init(_ message: String) {
        self.message = message
    }
}

/// One food going up to the home database.
struct UploadItem: Codable, Equatable {
    /// The format the server stores and returns.
    static let dateFormat: ISO8601DateFormatter = {
        let format = ISO8601DateFormatter()
        format.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return format
    }()

    let food: String
    let encounteredAt: String

    init(food: String, encounteredAt: Date) {
        self.food = food
        self.encounteredAt = Self.dateFormat.string(from: encounteredAt)
    }
}

struct UploadBody: Codable {
    let encounters: [UploadItem]
}

struct ServerEncounter: Codable, Equatable {
    let food: String
    let encounteredAt: String
    let uploadedAt: String
}

struct UploadResponse: Codable {
    let new: [String]
    let encounters: [ServerEncounter]
}

/// How the apps reach the home database.
protocol EncounterTransport {
    func upload(_ items: [UploadItem]) async throws -> UploadResponse
    func fetch() async throws -> [ServerEncounter]
}

/// The server's encounters API, at the address and with the token set in the build configuration.
struct HTTPEncounterTransport: EncounterTransport {
    let baseURL: URL?
    let token: String

    static var configured: HTTPEncounterTransport {
        let info = Bundle.main.infoDictionary
        return HTTPEncounterTransport(baseURL: (info?["NutriDexAPIURL"] as? String).flatMap(URL.init(string:)), token: info?["NutriDexUploadToken"] as? String ?? "")
    }

    func upload(_ items: [UploadItem]) async throws -> UploadResponse {
        try JSONDecoder().decode(UploadResponse.self, from: await send("POST", body: JSONEncoder().encode(UploadBody(encounters: items))))
    }

    func fetch() async throws -> [ServerEncounter] {
        try JSONDecoder().decode(UploadResponse.Fetched.self, from: await send("GET", body: nil)).encounters
    }

    private func send(_ method: String, body: Data?) async throws -> Data {
        guard let baseURL, !token.isEmpty else { throw EncounterProblem("This app has no upload address or token set, so it cannot reach the home database.") }
        var request = URLRequest(url: baseURL.appending(path: "api/encounters"))
        request.httpMethod = method
        request.httpBody = body
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw EncounterProblem("The home database did not answer: \(error.localizedDescription)")
        }
        guard let status = (response as? HTTPURLResponse)?.statusCode, (200..<300).contains(status) else {
            let said = (try? JSONDecoder().decode(ServerError.self, from: data))?.error
            throw EncounterProblem(said ?? "The home database refused that.")
        }
        return data
    }

    private struct ServerError: Decodable {
        let error: String
    }
}

extension UploadResponse {
    fileprivate struct Fetched: Decodable {
        let encounters: [ServerEncounter]
    }
}

/// The game's moves: uploading, picking up what other devices uploaded, and the unlock animation.
@Observable
final class DexGame {
    let store: EncounterStore
    private let transport: EncounterTransport

    private(set) var isUploading = false
    private(set) var uploadError: String?
    private(set) var syncProblem: String?
    /// The animation's queue. Its first entry is on screen.
    private var queue: [EntryCard] = []
    private var queueTotal = 0

    init(store: EncounterStore, transport: EncounterTransport) {
        self.store = store
        self.transport = transport
    }

    /// The food whose unlock animation is on screen.
    var unlocking: EntryCard? { queue.first }

    /// Where the animation is, counting from 1.
    var unlockProgress: (position: Int, total: Int) { (queueTotal - queue.count + 1, queueTotal) }

    /// Sends everything new as one array, then plays what it unlocked.
    func upload() async {
        let pending = store.pending
        guard !pending.isEmpty else { return }
        isUploading = true
        defer { isUploading = false }
        do {
            let response = try await transport.upload(pending)
            store.merge(response.encounters)
            uploadError = nil
            playAwaitingUnlocks()
        } catch {
            uploadError = (error as? EncounterProblem)?.message ?? error.localizedDescription
        }
    }

    /// Picks up what has arrived from other devices and plays it. Not reaching the server leaves the game as it is.
    func sync() async {
        do {
            store.merge(try await transport.fetch())
            syncProblem = nil
            playAwaitingUnlocks()
        } catch {
            syncProblem = (error as? EncounterProblem)?.message ?? error.localizedDescription
        }
    }

    /// Finishes the animation on screen and moves on. After the last one you are back where you were.
    func next() {
        guard let finished = queue.first else { return }
        store.celebrate(food: finished.slug)
        queue.removeFirst()
        if queue.isEmpty { queueTotal = 0 }
    }

    private func playAwaitingUnlocks() {
        let waiting = store.awaitingUnlock.filter { card in !queue.contains { $0.slug == card.slug } }
        queue += waiting
        queueTotal += waiting.count
    }
}
