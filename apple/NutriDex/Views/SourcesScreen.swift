import SwiftUI

/// Every citation, with what it supports and its limitations.
struct SourcesScreen: View {
    /// Past this, a source's list folds away so the other sources stay in view.
    private static let longList = 8

    var body: some View {
        ScreenBezel {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Sources").font(.dex(.largeTitle, weight: .heavy)).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                    Note(text: "Every citation in the Dex, what it supports, and where it falls short.")
                    ForEach(Dex.bundled.sources) { row(for: $0) }
                }
                .padding(12)
            }
        }
        .background(Theme.shellBody.ignoresSafeArea())
        .navigationTitle("Sources")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.shell, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    private func row(for source: SourceUse) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            SourceLinkText(source: source.ref).font(.dex(.subheadline, weight: .bold))
            Text(meta(source)).font(.dex(.caption)).foregroundStyle(Theme.inkSoft)
            if let population = source.population {
                Text(population).font(.dex(.footnote)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
            }
            if let limitations = source.limitations {
                Text("\(Text("Limitations: ").bold())\(limitations)")
                    .font(.dex(.footnote))
                    .foregroundStyle(Theme.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if source.supports.count > Self.longList {
                DisclosureGroup {
                    supports(source.supports)
                } label: {
                    Text("Supports \(source.supports.count) facts in the Dex").font(.dex(.footnote, weight: .bold)).foregroundStyle(Theme.ink)
                }
                .tint(Theme.inkSoft)
            } else if !source.supports.isEmpty {
                supports(source.supports)
            }
        }
        .dexPanel()
    }

    private func supports(_ items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            ForEach(items, id: \.self) { item in
                Text("• \(item)").font(.dex(.footnote)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func meta(_ source: SourceUse) -> String {
        [source.studyType, source.year.map(String.init), source.pmid.map { "PMID \($0)" }, source.doi.map { "doi \($0)" }]
            .compactMap { $0 }
            .joined(separator: ", ")
    }
}
