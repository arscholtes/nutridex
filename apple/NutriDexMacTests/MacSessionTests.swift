import Foundation
import Testing
@testable import NutriDexMac

/// The Mac keeps its session in the Keychain too; the Mac's Keychain works differently from the phone's.
@MainActor
struct MacSessionStoreTests {
    let store = SessionStore(service: "NutriDexMacTests.\(UUID().uuidString)")
    let now = Date(timeIntervalSince1970: 1_800_000_000)

    @Test func aSavedSessionReadsBackAndClears() throws {
        let saved = Session(token: "t1", email: "fay@example.com", expiresAt: now.addingTimeInterval(86_400))
        try store.save(saved)
        #expect(store.current(now: now) == saved)
        store.clear()
        #expect(store.current(now: now) == nil)
    }
}
