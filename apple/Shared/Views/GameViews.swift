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
            Meter(share: progress.total == 0 ? 0 : Double(progress.seen) / Double(progress.total), style: Theme.progressFill)
        }
    }
}

/// The way into the game, at the bottom of the screen under your thumb: you say what you had, and only foods matching it appear.
struct HadComposer: View {
    @Environment(EncounterStore.self) private var store
    @State private var words = ""
    @FocusState private var typing: Bool

    private var trimmed: String { words.trimmingCharacters(in: .whitespacesAndNewlines) }

    private var candidates: [EntryCard] {
        guard trimmed.count >= 3 else { return [] }
        return DexSearch.filter(Dex.bundled.cards, query: trimmed, kind: .ingredient, type: nil).filter { !store.isRevealed($0) }
    }

    var body: some View {
        VStack(spacing: 8) {
            if trimmed.count >= 3 {
                results
            }
            HStack(spacing: 8) {
                Image(systemName: "fork.knife").foregroundStyle(Theme.accent).accessibilityHidden(true)
                TextField("What did you have?", text: $words)
                    .focused($typing)
                    .font(.dex(.body))
                    .foregroundStyle(Theme.ink)
                    .autocorrectionDisabled()
                    #if os(iOS)
                    .textInputAutocapitalization(.never)
                    #endif
                if !words.isEmpty {
                    Button { words = "" } label: {
                        Image(systemName: "xmark.circle.fill").foregroundStyle(Theme.inkSoft).frame(width: 32, height: 44)
                    }
                    .accessibilityLabel("Clear")
                }
            }
            .padding(.horizontal, 16)
            .frame(minHeight: 52)
            .background {
                // The field is one line tall; the whole pill has to answer a thumb.
                Capsule().fill(.clear).contentShape(Capsule()).onTapGesture { typing = true }
            }
            .dexFloating(in: Capsule())
        }
        .padding(.horizontal, 12)
        .padding(.bottom, 4)
    }

    private var results: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 6) {
                if candidates.isEmpty {
                    Note(text: "Nothing new matches that yet.")
                }
                ForEach(candidates) { card in
                    HStack {
                        Text(card.name).font(.dex(.subheadline, weight: .bold)).foregroundStyle(Theme.ink)
                        Spacer()
                        Button("I've had this") {
                            store.encounter(food: card.slug)
                            words = ""
                        }
                        .buttonStyle(DexPrimaryButton())
                        .accessibilityLabel("I've had \(card.name)")
                    }
                }
            }
            .padding(12)
        }
        .frame(maxHeight: 240)
        .fixedSize(horizontal: false, vertical: true)
        .dexFloating(in: RoundedRectangle(cornerRadius: 24))
    }
}

/// New encounters waiting on this device, with the button that sends them home.
struct UploadBar: View {
    @Environment(DexGame.self) private var game

    private var barShape: RoundedRectangle { RoundedRectangle(cornerRadius: Theme.skin.radius.control == nil ? 26 : Theme.skin.radius.panel) }

    var body: some View {
        let count = game.store.pending.count
        if count > 0 {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(count == 1 ? "1 new encounter to upload" : "\(count) new encounters to upload")
                        .font(.dex(.subheadline, weight: .bold))
                        .foregroundStyle(Theme.ink)
                    Spacer(minLength: 8)
                    Button(game.isUploading ? "Uploading" : "Upload") { Task { await game.upload() } }
                        .buttonStyle(DexPrimaryButton())
                        .disabled(game.isUploading)
                }
                if let problem = game.uploadError {
                    Text(problem).font(.dex(.footnote, weight: .bold)).foregroundStyle(Theme.danger).fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(.leading, 16)
            .padding([.trailing, .vertical], 8)
            .background {
                if Theme.skin.stage == .foil {
                    HoloFoil().opacity(0.55).overlay(.white.opacity(0.35))
                } else {
                    Theme.notice
                }
            }
            .clipShape(barShape)
            .dexOutline(barShape)
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

    /// - Returns: what an unlock brought with it, in plain English
    static func summary(compounds: Int, effects: Int) -> String {
        let counted = { (n: Int, word: String) in "\(n) \(word)\(n == 1 ? "" : "s")" }
        return "It reveals \(counted(compounds, "compound")) and \(counted(effects, "effect"))."
    }

    var body: some View {
        ZStack {
            (Theme.isHandheld ? Color.black.opacity(0.82) : Theme.tile.opacity(0.88)).ignoresSafeArea()
            VStack(spacing: 0) {
                stage
                details
            }
            .frame(maxWidth: 400)
            .clipShape(RoundedRectangle(cornerRadius: 30))
            .overlay(RoundedRectangle(cornerRadius: 30).strokeBorder(.white.opacity(0.85), lineWidth: 2.5))
            .shadow(color: Theme.accent.opacity(0.5), radius: 30)
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
            if Theme.skin.stage == .foil {
                HoloFoil()
            } else {
                Theme.hidden
            }
            Rays()
                .scaleEffect(1.7)
                .rotationEffect(.degrees(spin ? 360 : 0))
                .animation(reduceMotion ? nil : .linear(duration: 9).repeatForever(autoreverses: false), value: spin)
            if revealed {
                CreatureArt(kind: card.kind, slug: card.slug, cutout: true).padding(30).shadow(color: .black.opacity(0.3), radius: 14, y: 12).transition(.scale(scale: 0.7).combined(with: .opacity))
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
                Text(Self.summary(compounds: reveal.compounds.count, effects: reveal.effects.count)).font(.dex(.footnote)).multilineTextAlignment(.center)
            }
            Button("Next", action: onNext)
                .buttonStyle(DexPrimaryButton(fullWidth: true, onShell: true))
                .keyboardShortcut(.defaultAction)
                .padding(.top, 6)
            if total > 1 {
                Text("\(position) of \(total)").font(.dex(.caption))
            }
        }
        .foregroundStyle(Theme.isHandheld ? .white : Theme.ink)
        .opacity(revealed ? 1 : 0)
        .padding(18)
        .frame(maxWidth: .infinity)
        .background(Theme.isHandheld ? Theme.shell : Theme.card)
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

/// Choose how the Dex looks. A choice takes effect at once and follows you to your other devices.
struct SkinsList: View {
    @Environment(DexGame.self) private var game
    @State private var position: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Skins").font(.dex(.largeTitle, weight: .heavy)).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                Note(text: "Your choice follows you to every device using your passcode.")
                if let problem = game.skinProblem {
                    Text("It changed here, but did not reach your other devices yet. \(problem)")
                        .font(.dex(.footnote, weight: .bold))
                        .foregroundStyle(Theme.danger)
                        .fixedSize(horizontal: false, vertical: true)
                }
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 280), spacing: 14, alignment: .top)], spacing: 14) {
                    ForEach(Dex.bundled.skins) { skin in
                        SkinChoice(skin: skin, worn: game.skins.skin == skin) {
                            Task { await game.choose(skin: skin) }
                        }
                    }
                }
                .scrollTargetLayout()
            }
            .frame(maxWidth: 920, alignment: .leading)
            .padding(16)
            .frame(maxWidth: .infinity)
        }
        // Choosing a skin redraws the whole app, so this finds its way back to the one just chosen.
        .scrollPosition(id: $position, anchor: .center)
        .onAppear { position = game.skins.skin.id }
    }
}

/// One skin, showing the look it gives.
struct SkinChoice: View {
    let skin: DexSkin
    let worn: Bool
    let action: () -> Void

    private var shape: RoundedRectangle { RoundedRectangle(cornerRadius: min(24, Theme.skin.radius.card)) }

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 0) {
                SkinPreview(skin: skin).frame(height: 128).frame(maxWidth: .infinity).clipped()
                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        Text(skin.name).font(.dex(.headline, weight: .bold))
                        if worn {
                            Spacer()
                            Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.accent).accessibilityHidden(true)
                        }
                    }
                    Text(skin.about).font(.dex(.footnote)).foregroundStyle(Theme.inkSoft).fixedSize(horizontal: false, vertical: true)
                }
                .padding(14)
            }
            .foregroundStyle(Theme.ink)
            .background(Theme.card, in: shape)
            .clipShape(shape)
            .overlay(shape.strokeBorder(worn ? Theme.accent : Theme.line, lineWidth: worn ? 3 : 1))
            .contentShape(shape)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(skin.name). \(skin.about)")
        .accessibilityAddTraits(worn ? .isSelected : [])
    }

}

/// A small page in a skin's own colours and type, with something you have already unlocked standing on its stage.
struct SkinPreview: View {
    let skin: DexSkin
    @Environment(EncounterStore.self) private var store

    private var unlocked: EntryCard? { Dex.bundled.cards.first { $0.kind == .ingredient && store.isRevealed($0) } }

    var body: some View {
        if skin.shell == .handheld {
            handheld
        } else {
            HStack(spacing: 12) {
                stage
                VStack(alignment: .leading, spacing: 6) {
                    Text("NutriDex")
                        .font(.system(.title3, design: skin.font.design.font, weight: skin.font.heading.font))
                        .foregroundStyle(skin.colors.ink.color)
                    Text("Upload")
                        .font(.system(.footnote, design: skin.font.design.font, weight: skin.font.strong.font))
                        .foregroundStyle(skin.colors.onNight.color)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(skin.colors.night.color, in: skin.radius.control.map { AnyShape(RoundedRectangle(cornerRadius: $0)) } ?? AnyShape(Capsule()))
                }
                Spacer(minLength: 0)
            }
            .padding(12)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(DexBackdrop(skin: skin))
        }
    }

    private var stage: some View {
        let shape = RoundedRectangle(cornerRadius: min(skin.radius.card, 18))
        return ZStack {
            StageBacking(skin: skin, type: unlocked?.type)
            if let unlocked {
                Image("\(EntryKind.assetName(unlocked.kind, unlocked.slug))-silhouette")
                    .renderingMode(.original)
                    .resizable()
                    .scaledToFit()
                    .dexCreatureLook(skin)
                    .padding(10)
            }
        }
        .frame(width: 104, height: 104)
        .clipShape(shape)
        .overlay {
            if skin.outline.width > 0 {
                shape.strokeBorder(skin.outlineColor, style: StrokeStyle(lineWidth: skin.outline.width, dash: skin.outline.dashed ? [4, 3] : []))
            }
        }
    }

    private var handheld: some View {
        ZStack(alignment: .topLeading) {
            Theme.shellBody
            Lens(color: Color(hex: "#38B6F2"), size: 40).padding(14)
            RoundedRectangle(cornerRadius: 8)
                .fill(skin.colors.screen.color)
                .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(Theme.bezel, lineWidth: 5))
                .padding(.top, 66)
                .padding(.horizontal, 12)
                .padding(.bottom, 10)
        }
    }
}
