import Foundation
import Testing
@testable import NutriDex

/// The secret the app keeps for Google's sheet, and the hash the server sees (RFC 7636).
struct PKCETests {
    @Test func theChallengeIsTheOneRFC7636WorksThrough() {
        #expect(PKCE.challenge(for: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk") == "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
    }

    @Test func aNewSecretIsFortyThreeURLSafeCharactersAndNeverRepeats() {
        let first = PKCE.verifier()
        let second = PKCE.verifier()
        #expect(first.count == 43)
        #expect(first != second)
        #expect(first.allSatisfy { $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "-" || $0 == "_") })
    }
}

/// Apple is given a hash of the nonce, and the server the nonce itself, so a token cannot be replayed.
struct AppleNonceTests {
    @Test func appleIsGivenTheSHA256OfTheNonce() {
        #expect(AppleNonce.hashed("abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
    }

    @Test func aNewNonceNeverRepeats() {
        #expect(AppleNonce.make() != AppleNonce.make())
    }
}

/// Where Google's sheet comes back to: the app's own address, carrying a code or a refusal.
struct SheetCallbackTests {
    @Test func theCodeComesBackOnTheAppsOwnAddress() throws {
        #expect(try SheetCallback.code(from: URL(string: "nutridex://auth/callback?code=xyz")!) == "xyz")
    }

    @Test func aRefusalComesBackAsASentence() {
        #expect(throws: EncounterProblem("Google did not sign you in: Cancelled")) {
            try SheetCallback.code(from: URL(string: "nutridex://auth/callback?error=access_denied&error_description=Cancelled")!)
        }
    }

    @Test func anyOtherAddressIsRefused() {
        #expect(throws: EncounterProblem.self) { try SheetCallback.code(from: URL(string: "https://elsewhere.test/auth/callback?code=xyz")!) }
    }
}

/// Signing in, out, and deleting the account, through /api/v1. Shares APITransportTests' stand-in network.
extension APITransportTests {
    private func sentJSON(_ index: Int) throws -> [String: String] {
        let body = try #require(RecordingProtocol.seen[index].body)
        return try #require(try JSONSerialization.jsonObject(with: body) as? [String: String])
    }

    private var sessionReply: String { #"{"token":"t9","email":"fay@example.com","expiresAt":"2026-12-31T00:00:00.000Z"}"# }

    @Test func googlesSheetStartsOnTheServerWithTheAppsChallenge() throws {
        #expect(try transport().googleStart(challenge: "C").absoluteString == "http://dex.test/api/v1/session/start?provider=google&challenge=C")
    }

    @Test func anEmailedCodeIsAskedForThenTradedForASessionThatIsKept() async throws {
        defer { sessions.clear() }
        RecordingProtocol.answer = (204, "")
        try await transport().requestCode(email: "fay@example.com")
        RecordingProtocol.answer = (200, sessionReply)
        try await transport().signIn(.emailed(email: "fay@example.com", code: "123456"))

        #expect(RecordingProtocol.seen.map { "\($0.method) \($0.path)" } == ["POST /api/v1/session/code", "POST /api/v1/session"])
        #expect(try sentJSON(0) == ["email": "fay@example.com"])
        #expect(try sentJSON(1) == ["email": "fay@example.com", "code": "123456"])
        #expect(sessions.current()?.token == "t9")
        #expect(sessions.current()?.email == "fay@example.com")
    }

    @Test func appleAndGooglesSheetEachSendTheirOwnProof() async throws {
        defer { sessions.clear() }
        RecordingProtocol.answer = (200, sessionReply)
        try await transport().signIn(.apple(idToken: "signed.by.apple", nonce: "raw-nonce"))
        try await transport().signIn(.sheet(code: "sheet-code", verifier: "kept-secret"))

        #expect(try sentJSON(0) == ["provider": "apple", "idToken": "signed.by.apple", "nonce": "raw-nonce"])
        #expect(try sentJSON(1) == ["code": "sheet-code", "codeVerifier": "kept-secret"])
    }

    @Test func aRefusedSignInSaysWhyAndKeepsNoSession() async throws {
        RecordingProtocol.answer = (401, #"{"error":"That code is not right. Check it and try again."}"#)
        await #expect(throws: EncounterProblem("That code is not right. Check it and try again.")) {
            try await transport().signIn(.emailed(email: "fay@example.com", code: "000000"))
        }
        #expect(sessions.current() == nil)
    }

    @Test func signingOutForgetsTheSessionEvenWhenTheServerCannotBeReached() async throws {
        try signIn()
        RecordingProtocol.answer = (500, "{}")
        await transport().signOut()

        #expect(RecordingProtocol.seen.map { "\($0.method) \($0.path) \($0.bearer ?? "")" } == ["DELETE /api/v1/session Bearer t1"])
        #expect(sessions.current() == nil)
    }

    @Test func deletingTheAccountSignsThisDeviceOut() async throws {
        try signIn()
        RecordingProtocol.answer = (204, "")
        try await transport().deleteAccount()

        #expect(RecordingProtocol.seen.map { "\($0.method) \($0.path) \($0.bearer ?? "")" } == ["DELETE /api/v1/me Bearer t1"])
        #expect(sessions.current() == nil)
    }
}
