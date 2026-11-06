import Compression
import Foundation
import SQLite3

/// Why the bundled data file could not be read. The file is written by the export and checked by tests,
/// so any of these is a broken build.
enum DexFileError: Error, CustomStringConvertible {
    case cannotOpen(String)
    case cannotRead(String)
    case wrongSize(expected: Int, got: Int)

    var description: String {
        switch self {
        case let .cannotOpen(message): "dex.sqlite cannot be opened: \(message)"
        case let .cannotRead(message): "dex.sqlite cannot be read: \(message)"
        case let .wrongSize(expected, got): "a part of dex.sqlite inflates to \(got) bytes, not the \(expected) it records"
        }
    }
}

/// The data file the app bundles: one SQLite file in which each part is JSON, compressed on its own,
/// so the app opens only what it shows. `npm run export:native` writes it.
final class DexFile {
    private let db: OpaquePointer

    /// - Parameter url: the file
    init(url: URL) throws {
        var handle: OpaquePointer?
        guard sqlite3_open_v2(url.path, &handle, SQLITE_OPEN_READONLY, nil) == SQLITE_OK, let handle else {
            let message = handle.map { String(cString: sqlite3_errmsg($0)) } ?? "no handle"
            sqlite3_close(handle)
            throw DexFileError.cannotOpen(message)
        }
        db = handle
    }

    deinit {
        sqlite3_close(db)
    }

    /// - Returns: a part shared by the whole app, such as the cards, as JSON
    func meta(_ key: String) throws -> Data {
        guard let data = try read("select size, body from meta where key = ?", [key]) else {
            throw DexFileError.cannotRead("it has no \(key)")
        }
        return data
    }

    /// - Returns: one entry as JSON, or nil when the file has no such entry
    func entry(_ kind: EntryKind, _ slug: String) throws -> Data? {
        try read("select size, body from entry where kind = ? and slug = ?", [kind.rawValue, slug])
    }

    private func read(_ query: String, _ values: [String]) throws -> Data? {
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, query, -1, &statement, nil) == SQLITE_OK, let statement else {
            throw DexFileError.cannotRead(String(cString: sqlite3_errmsg(db)))
        }
        defer { sqlite3_finalize(statement) }
        let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
        for (index, value) in values.enumerated() {
            sqlite3_bind_text(statement, Int32(index + 1), value, -1, transient)
        }
        switch sqlite3_step(statement) {
        case SQLITE_ROW:
            let size = Int(sqlite3_column_int64(statement, 0))
            let count = Int(sqlite3_column_bytes(statement, 1))
            guard let bytes = sqlite3_column_blob(statement, 1) else { throw DexFileError.cannotRead("a part has no body") }
            return try Self.inflate(Data(bytes: bytes, count: count), size: size)
        case SQLITE_DONE:
            return nil
        default:
            throw DexFileError.cannotRead(String(cString: sqlite3_errmsg(db)))
        }
    }

    /// Undoes the export's compression, which is raw DEFLATE.
    /// - Parameters:
    ///   - body: the compressed bytes
    ///   - size: how many bytes the export recorded before compressing
    /// - Returns: the JSON
    static func inflate(_ body: Data, size: Int) throws -> Data {
        var out = Data(count: size)
        let written = out.withUnsafeMutableBytes { dst in
            body.withUnsafeBytes { src in
                compression_decode_buffer(dst.bindMemory(to: UInt8.self).baseAddress!, size, src.bindMemory(to: UInt8.self).baseAddress!, body.count, nil, COMPRESSION_ZLIB)
            }
        }
        guard written == size else { throw DexFileError.wrongSize(expected: size, got: written) }
        return out
    }
}
