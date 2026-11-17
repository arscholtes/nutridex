import Foundation
import Security

/// A signed-in person's NutriDex session, as `POST /api/v1/session` returns it.
struct Session: Codable, Equatable {
    let token: String
    let email: String
    let expiresAt: Date
}

/// Where this device keeps its session: the Keychain, on this device only and never in a backup.
struct SessionStore {
    let service: String

    init(service: String = "NutriDex.session") {
        self.service = service
    }

    /// - Returns: the session, or nil when signed out or when the stored one has expired
    func current(now: Date = .now) -> Session? {
        var query = item
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var found: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &found) == errSecSuccess, let data = found as? Data,
              let session = try? Self.decoder.decode(Session.self, from: data), session.expiresAt > now
        else { return nil }
        return session
    }

    /// Keeps a session, replacing any already kept.
    /// - Throws: `EncounterProblem` when the Keychain refuses it
    func save(_ session: Session) throws {
        let data = try Self.encoder.encode(session)
        SecItemDelete(item as CFDictionary)
        var add = item
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(add as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw EncounterProblem("This device would not keep your sign-in (Keychain error \(status)).")
        }
    }

    /// Signs this device out by forgetting the session.
    func clear() {
        SecItemDelete(item as CFDictionary)
    }

    private var item: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: "session"]
    }

    private static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    private static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()
}
