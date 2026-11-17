import Foundation
import Testing
@testable import NutriDex

/// A signed-in person's session lives in the Keychain, and an expired one reads as signed out.
@MainActor
struct SessionStoreTests {
    let store = SessionStore(service: "NutriDexTests.\(UUID().uuidString)")
    let now = Date(timeIntervalSince1970: 1_800_000_000)

    func session(token: String, expiresIn seconds: TimeInterval) -> Session {
        Session(token: token, email: "fay@example.com", expiresAt: now.addingTimeInterval(seconds))
    }

    @Test func aSavedSessionReadsBack() throws {
        defer { store.clear() }
        let saved = session(token: "t1", expiresIn: 86_400)
        try store.save(saved)
        #expect(store.current(now: now) == saved)
    }

    @Test func anExpiredSessionReadsAsSignedOut() throws {
        defer { store.clear() }
        try store.save(session(token: "t1", expiresIn: -1))
        #expect(store.current(now: now) == nil)
    }

    @Test func savingAgainReplacesTheSession() throws {
        defer { store.clear() }
        try store.save(session(token: "t1", expiresIn: 86_400))
        try store.save(session(token: "t2", expiresIn: 86_400))
        #expect(store.current(now: now)?.token == "t2")
    }

    @Test func clearingSignsOut() throws {
        try store.save(session(token: "t1", expiresIn: 86_400))
        store.clear()
        #expect(store.current(now: now) == nil)
    }

    @Test func nothingSavedReadsAsSignedOut() {
        #expect(store.current(now: now) == nil)
    }
}
