import SwiftUI

/// How much of the collection is unlocked. It counts what is hidden without naming any of it.
struct UnlockProgressBar: View {
    @Environment(EncounterStore.self) private var store

    var body: some View {
        let progress = store.totalProgress
        VStack(alignment: .leading, spacing: 4) {
            Text("Unlocked \(progress.seen) of \(progress.total)")
                .font(.dex(.subheadline, weight: .bold))
                .monospacedDigit()
                .foregroundStyle(Theme.ink)
            Meter(share: progress.total == 0 ? 0 : Double(progress.seen) / Double(progress.total), color: Theme.shell)
        }
    }
}

/// The way into the game: you say what you had, and only foods matching it appear.
struct HadComposer: View {
    @Environment(EncounterStore.self) private var store
    @State private var words = ""

    private var candidates: [EntryCard] {
        let trimmed = words.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 3 else { return [] }
        return DexSearch.filter(Dex.bundled.cards, query: trimmed, kind: .ingredient, type: nil).filter { !store.isRevealed($0) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            TextField("What did you have?", text: $words)
                .font(.dex(.body))
                .foregroundStyle(Theme.ink)
                .autocorrectionDisabled()
                #if os(iOS)
                .textInputAutocapitalization(.never)
                #endif
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(.white, in: RoundedRectangle(cornerRadius: 9))
                .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.ink, lineWidth: 2))
            if words.trimmingCharacters(in: .whitespacesAndNewlines).count >= 3, candidates.isEmpty {
                Note(text: "Nothing new matches that yet.")
            }
            ForEach(candidates) { card in
                HStack {
                    Text(card.name).font(.dex(.subheadline, weight: .bold)).foregroundStyle(Theme.ink)
                    Spacer()
                    Button {
                        store.encounter(food: card.slug)
                        words = ""
                    } label: {
                        Text("I've had this")
                            .font(.dex(.subheadline, weight: .heavy))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Theme.shell, in: RoundedRectangle(cornerRadius: 8))
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("I've had \(card.name)")
                }
            }
        }
        .padding(10)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink, lineWidth: 2))
    }
}

/// New encounters waiting on this device, with the button that sends them home.
struct UploadBar: View {
    @Environment(DexGame.self) private var game

    var body: some View {
        let count = game.store.pending.count
        if count > 0 {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(count == 1 ? "1 new encounter to upload" : "\(count) new encounters to upload")
                        .font(.dex(.subheadline, weight: .bold))
                        .foregroundStyle(Theme.ink)
                    Spacer(minLength: 8)
                    Button { Task { await game.upload() } } label: {
                        Text(game.isUploading ? "Uploading" : "Upload")
                            .font(.dex(.subheadline, weight: .heavy))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Theme.shell, in: RoundedRectangle(cornerRadius: 8))
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                    .disabled(game.isUploading)
                }
                if let problem = game.uploadError {
                    Text(problem).font(.dex(.footnote, weight: .bold)).foregroundStyle(Color(hex: "#7F1D1D")).fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(10)
            .background(Color(hex: "#FFD23F"), in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.ink, lineWidth: 2))
        }
    }
}

/// Plays one unlock: a blacked-out shape on turning rays, a flash, then the creature in colour. Next
/// moves on, and after the last the app is exactly where it was.
struct UnlockOverlay: View {
    let card: EntryCard
    let position: Int
    let total: Int
    let onNext: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var revealed = false
    @State private var flash = false
    @State private var spin = false

    private var assetName: String { EntryKind.assetName(card.kind, card.slug) }

    var body: some View {
        ZStack {
            Color.black.opacity(0.82).ignoresSafeArea()
            VStack(spacing: 0) {
                stage
                details
            }
            .frame(maxWidth: 400)
            .clipShape(RoundedRectangle(cornerRadius: 24))
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(Theme.ink, lineWidth: 3))
            .padding(20)
        }
        .task(id: card.id) { await play() }
        .accessibilityAddTraits(.isModal)
        #if os(iOS)
        .sensoryFeedback(.success, trigger: revealed) { _, now in now }
        #endif
    }

    private var stage: some View {
        ZStack {
            Color(hex: "#1F86C9")
            Rays()
                .scaleEffect(1.7)
                .rotationEffect(.degrees(spin ? 360 : 0))
                .animation(reduceMotion ? nil : .linear(duration: 9).repeatForever(autoreverses: false), value: spin)
            if revealed {
                Image(assetName).resizable().scaledToFit().padding(30).transition(.scale(scale: 0.7).combined(with: .opacity))
            } else {
                Image("\(assetName)-silhouette").resizable().renderingMode(.template).scaledToFit().foregroundStyle(.black).padding(30).transition(.opacity)
            }
            Color.white.opacity(flash ? 1 : 0)
        }
        .aspectRatio(1, contentMode: .fit)
        .clipped()
        .accessibilityHidden(true)
    }

    private var details: some View {
        VStack(spacing: 6) {
            Text("Unlocked \(card.name)").font(.dex(.title2, weight: .heavy)).multilineTextAlignment(.center)
            Text(card.number).font(.dexNumber(.subheadline))
            if let reveal = Dex.bundled.reveals[card.slug] {
                Text("It reveals \(reveal.compounds.count) compounds and \(reveal.effects.count) effects.").font(.dex(.footnote)).multilineTextAlignment(.center)
            }
            Button(action: onNext) {
                Text("Next")
                    .font(.dex(.headline, weight: .heavy))
                    .foregroundStyle(Theme.ink)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 11)
                    .background(.white, in: RoundedRectangle(cornerRadius: 10))
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.ink, lineWidth: 2))
            }
            .buttonStyle(.plain)
            .keyboardShortcut(.defaultAction)
            .padding(.top, 6)
            if total > 1 {
                Text("\(position) of \(total)").font(.dex(.caption))
            }
        }
        .foregroundStyle(.white)
        .opacity(revealed ? 1 : 0)
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(Theme.shell)
    }

    private func play() async {
        revealed = false
        flash = false
        spin = true
        guard !reduceMotion else {
            revealed = true
            return
        }
        try? await Task.sleep(for: .seconds(1.25))
        withAnimation(.easeOut(duration: 0.12)) { flash = true }
        try? await Task.sleep(for: .seconds(0.12))
        withAnimation(.spring(duration: 0.5, bounce: 0.4)) { revealed = true }
        withAnimation(.easeOut(duration: 0.45)) { flash = false }
    }
}
