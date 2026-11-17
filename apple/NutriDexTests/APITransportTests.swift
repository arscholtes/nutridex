import Foundation
import Testing
@testable import NutriDex

/// A stand-in network: records every request the apps make and gives one answer.
final class RecordingProtocol: URLProtocol {
    struct Seen {
        let method: String
        let path: String
        let bearer: String?
        let body: Data?
    }

    nonisolated(unsafe) static var seen: [Seen] = []
    nonisolated(unsafe) static var answer: (status: Int, body: String) = (200, "{}")

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        // URLSession hands a protocol the body as a stream, not as httpBody.
        let body = request.httpBody ?? request.httpBodyStream.map(Self.read)
        Self.seen.append(Seen(method: request.httpMethod ?? "", path: request.url?.path ?? "", bearer: request.value(forHTTPHeaderField: "Authorization"), body: body))
        let response = HTTPURLResponse(url: request.url!, statusCode: Self.answer.status, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(Self.answer.body.utf8))
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}

    private static func read(_ stream: InputStream) -> Data {
        stream.open()
        defer { stream.close() }
        var data = Data()
        var buffer = [UInt8](repeating: 0, count: 4096)
        while stream.hasBytesAvailable {
            let count = stream.read(&buffer, maxLength: buffer.count)
            if count <= 0 { break }
            data.append(buffer, count: count)
        }
        return data
    }
}

/// The apps reach your account through /api/v1, with your session as the key.
@MainActor
@Suite(.serialized)
struct APITransportTests {
    let sessions = SessionStore(service: "NutriDexTests.\(UUID().uuidString)")
    let carrot = #"{"food":"carrot","firstHadAt":"2026-11-14T12:00:00.000Z","catches":1,"forms":1,"tier":1}"#

    init() {
        RecordingProtocol.seen = []
    }

    func transport() -> APITransport {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [RecordingProtocol.self]
        return APITransport(baseURL: URL(string: "http://dex.test"), sessions: sessions, network: URLSession(configuration: configuration))
    }

    func signIn() throws {
        try sessions.save(Session(token: "t1", email: "fay@example.com", expiresAt: .now.addingTimeInterval(86_400)))
    }

    @Test func uploadSendsYourFoodsToYourAccount() async throws {
        try signIn()
        defer { sessions.clear() }
        RecordingProtocol.answer = (200, #"{"new":["carrot"],"foods":[\#(carrot)]}"#)
        let item = UploadItem(food: "carrot", encounteredAt: Date(timeIntervalSince1970: 1_800_000_000))

        let response = try await transport().upload([item])

        let request = try #require(RecordingProtocol.seen.first)
        #expect(RecordingProtocol.seen.count == 1)
        #expect((request.method, request.path, request.bearer) == ("POST", "/api/v1/me/encounters", "Bearer t1"))
        #expect(try JSONDecoder().decode(UploadBody.self, from: try #require(request.body)).encounters == [item])
        #expect(response.new == ["carrot"])
        #expect(response.encounters.map(\.food) == ["carrot"])
    }

    @Test func yourFoodsAndSkinComeFromYourRecord() async throws {
        try signIn()
        defer { sessions.clear() }
        RecordingProtocol.answer = (200, #"{"email":"fay@example.com","skin":"yellow","rank":"Taster","foods":[\#(carrot)]}"#)

        let foods = try await transport().fetch()
        let skin = try await transport().fetchSkin()

        #expect(foods.map(\.food) == ["carrot"])
        #expect(skin == "yellow")
        #expect(RecordingProtocol.seen.map { "\($0.method) \($0.path) \($0.bearer ?? "")" } == ["GET /api/v1/me Bearer t1", "GET /api/v1/me Bearer t1"])
    }

    @Test func yourSkinIsSavedToYourAccount() async throws {
        try signIn()
        defer { sessions.clear() }
        RecordingProtocol.answer = (200, #"{"skin":"yellow"}"#)

        try await transport().saveSkin("yellow")

        let request = try #require(RecordingProtocol.seen.first)
        #expect((request.method, request.path, request.bearer) == ("PUT", "/api/v1/me/skin", "Bearer t1"))
        #expect(String(data: try #require(request.body), encoding: .utf8) == #"{"skin":"yellow"}"#)
    }

    @Test func aRefusedSessionSignsYouOut() async throws {
        try signIn()
        RecordingProtocol.answer = (401, #"{"error":"Sign in again."}"#)

        await #expect(throws: EncounterProblem.self) { try await transport().fetch() }
        #expect(sessions.current() == nil)
    }

    @Test func signedOutNeverCallsTheServer() async throws {
        await #expect(throws: EncounterProblem.signedOut) { try await transport().upload([]) }
        #expect(RecordingProtocol.seen.isEmpty)
    }
}
