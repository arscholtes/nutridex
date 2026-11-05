import Foundation

/// Claims resting on one source, so it is cited once.
struct SourceGroup: Identifiable {
    let source: SourceRef
    let claims: [EffectClaim]

    var id: String { source.id }
    /// The dose or bar every claim shares, shown once under them.
    var sharedDoseContext: String? {
        guard claims.count > 1, let first = claims.first?.doseContext, claims.allSatisfy({ $0.doseContext == first }) else { return nil }
        return first
    }
}

extension Array where Element == EffectClaim {
    func groupedBySource() -> [SourceGroup] {
        var order: [String] = []
        var groups: [String: [EffectClaim]] = [:]
        for claim in self {
            if groups[claim.source.id] == nil { order.append(claim.source.id) }
            groups[claim.source.id, default: []].append(claim)
        }
        return order.map { SourceGroup(source: groups[$0]![0].source, claims: groups[$0]!) }
    }
}

private let amountFormat: NumberFormatter = {
    let format = NumberFormatter()
    format.locale = Locale(identifier: "en_US")
    format.numberStyle = .decimal
    format.maximumFractionDigits = 2
    return format
}()

/// - Returns: an amount as the web Dex prints it, such as "8,285 µg"
func formatAmount(_ amount: Double, unit: String) -> String {
    "\(amountFormat.string(from: NSNumber(value: amount)) ?? String(amount)) \(unit)"
}
