import SwiftUI

/// The mark on a food someone has never had.
struct NotHadMark: View {
    var body: some View {
        Text("Not had yet")
            .font(.dex(.caption2, weight: .bold))
            .foregroundStyle(Theme.inkSoft)
            .padding(.horizontal, 7)
            .padding(.vertical, 2)
            .overlay(Capsule().stroke(Theme.line))
    }
}

private func counted(_ count: Int, _ one: String, _ many: String) -> String {
    count == 1 ? "1 \(one)" : "\(count) \(many)"
}

private func grams(_ amount: Double) -> String {
    "\(amount.formatted(.number.precision(.fractionLength(0...1)))) g"
}

/// Every recipe that is everyone's. A recipe shows whatever is in it, and says how many of its foods you have never had.
struct RecipesList: View {
    @Environment(DexGame.self) private var game
    let onOpen: (Recipe) -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("Recipes").font(.dex(.largeTitle, weight: .heavy)).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                if Dex.bundled.recipes.isEmpty {
                    Note(text: "No recipes yet.")
                }
                ForEach(Dex.bundled.recipes) { recipe in
                    Button { onOpen(recipe) } label: { row(recipe) }
                        .buttonStyle(.plain)
                }
            }
            .padding(12)
        }
    }

    private func row(_ recipe: Recipe) -> some View {
        let notHad = recipe.notHad(in: game.store).count
        return VStack(alignment: .leading, spacing: 4) {
            Text(recipe.name).font(.dex(.headline, weight: .bold)).foregroundStyle(Theme.ink)
            Note(text: "\(counted(recipe.rows.count, "ingredient", "ingredients")) · \(counted(recipe.servings, "serving", "servings"))")
            if notHad > 0 {
                Text(counted(notHad, "food you have never had", "foods you have never had"))
                    .font(.dex(.footnote, weight: .bold))
                    .foregroundStyle(Theme.inkSoft)
            }
        }
        .dexPanel()
        .contentShape(Rectangle())
    }
}

/// A recipe: its spanning grid, then its cautions and what changes how its compounds absorb.
struct RecipeDetail: View {
    @Environment(DexGame.self) private var game
    let recipe: Recipe
    let onCook: () -> Void

    var body: some View {
        let notHad = recipe.notHad(in: game.store).count
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(recipe.name).font(.dex(.largeTitle, weight: .heavy)).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                    Note(text: "\(counted(recipe.servings, "serving", "servings")) · \(counted(recipe.rows.count, "ingredient", "ingredients")) · \(counted(recipe.steps.count, "step", "steps"))")
                    if notHad > 0 {
                        Note(text: "\(notHad == 1 ? "One food here is one you have never had." : "\(notHad) foods here are ones you have never had.") Its entry opens once you have.")
                    }
                }
                Button("Cook along", action: onCook).buttonStyle(DexPrimaryButton())
                RecipeGridView(recipe: recipe)
                DexSection(title: "Cautions", empty: "No caution on file. That means none has been sourced yet, not that there are none.", isEmpty: recipe.cautions.isEmpty) {
                    ForEach(recipe.cautions, id: \.self) { CautionCard(kind: $0.kind, summary: $0.summary, grade: $0.grade, advice: $0.advice) }
                }
                DexSection(title: "Absorption", empty: "Nothing in this recipe changes how its compounds absorb, as far as anything on file says.", isEmpty: recipe.absorption.isEmpty) {
                    ForEach(recipe.absorption, id: \.self) { AbsorptionTipCard(tip: $0, linked: game.store.isRevealed(.compound, $0.compound.slug)) }
                }
            }
            .padding(12)
        }
    }
}

/// One block of a step's column: a cell and the rows it covers, or a gap of one row.
struct GridSegment: Hashable {
    let cell: RecipeCell?
    let rows: Int
}

extension RecipeStep {
    /// - Parameter rowCount: how many ingredients the recipe has
    /// - Returns: the step's column from top to bottom, with a one-row gap wherever it uses nothing
    func segments(rowCount: Int) -> [GridSegment] {
        var out: [GridSegment] = []
        var row = 0
        while row < rowCount {
            if let cell = cells.first(where: { $0.rowStart == row }) {
                out.append(GridSegment(cell: cell, rows: cell.rowSpan))
                row += cell.rowSpan
            } else {
                out.append(GridSegment(cell: nil, rows: 1))
                row += 1
            }
        }
        return out
    }
}

/// Ingredients as rows, a column per step, each step's cell spanning the rows it uses.
struct RecipeGridView: View {
    @Environment(DexGame.self) private var game
    @ScaledMetric(relativeTo: .footnote) private var rowHeight: CGFloat = 56
    let recipe: Recipe
    /// The step being cooked now, drawn brighter; nil lights none.
    var lit: Int?

    private static let gap: CGFloat = 4

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: Self.gap) {
                    VStack(alignment: .leading, spacing: Self.gap) {
                        heading("Ingredient")
                        ForEach(recipe.rows) { label($0).frame(height: rowHeight, alignment: .leading) }
                    }
                    ForEach(recipe.steps) { step in
                        VStack(spacing: Self.gap) {
                            heading("Step \(step.position)")
                            ForEach(Array(step.segments(rowCount: recipe.rows.count).enumerated()), id: \.offset) { _, segment in
                                cell(segment, of: step)
                            }
                        }
                        .frame(minWidth: 96)
                    }
                }
            }
            if recipe.steps.isEmpty {
                Note(text: "No steps: each ingredient is prepared as its row says.")
            }
        }
        .dexPanel()
    }

    private func heading(_ text: String) -> some View {
        Text(text).font(.dex(.caption, weight: .bold)).foregroundStyle(Theme.inkSoft).frame(height: 22, alignment: .leading)
    }

    private func label(_ row: RecipeRow) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 6) {
                Text(row.name).font(.dex(.subheadline, weight: .bold)).foregroundStyle(Theme.ink).lineLimit(1)
                if game.store.records[row.food] == nil { NotHadMark() }
            }
            Text("\(grams(row.grams)) · \(row.prepMethod)").font(.dex(.caption)).foregroundStyle(Theme.inkSoft)
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder private func cell(_ segment: GridSegment, of step: RecipeStep) -> some View {
        let height = rowHeight * CGFloat(segment.rows) + Self.gap * CGFloat(segment.rows - 1)
        if let cell = segment.cell {
            let on = lit == step.position
            let shape = RoundedRectangle(cornerRadius: 8)
            VStack(spacing: 2) {
                Text(step.title).font(.dex(.footnote, weight: .bold)).foregroundStyle(Theme.ink).multilineTextAlignment(.center)
                if let prep = step.prepMethod { Text(prep).font(.dex(.caption)).foregroundStyle(Theme.inkSoft) }
                if cell.parts > 1 { Text("part \(cell.part) of \(cell.parts)").font(.dex(.caption)).foregroundStyle(Theme.inkSoft) }
            }
            .padding(6)
            .frame(maxWidth: .infinity, minHeight: height, maxHeight: height)
            .background(on ? Theme.accent.opacity(0.18) : .clear, in: shape)
            .overlay(shape.stroke(on ? Theme.accent : Theme.line, lineWidth: on ? 2 : 1))
            .opacity(lit != nil && !on ? 0.5 : 1)
            .accessibilityElement(children: .combine)
            .accessibilityAddTraits(on ? .isSelected : [])
        } else {
            Color.clear.frame(height: height).accessibilityHidden(true)
        }
    }
}

/// A recipe one stage at a time: what to gather, each step with what it does to what is in the food, then a place
/// to say it was cooked. The buttons, the arrow keys and a sideways swipe all move between stages.
struct CookAlongView: View {
    @Environment(DexGame.self) private var game
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @AccessibilityFocusState private var onHeading: Bool
    @FocusState private var hasKeys: Bool
    @State private var place = 0
    @State private var counted = false
    let recipe: Recipe
    let onDone: () -> Void

    private static let minSwipe: CGFloat = 70
    private static let moreSidewaysThanUp: CGFloat = 1.5

    /// Place 0 is gathering, 1...stages.count are the stages, and the last is saying it was cooked.
    private var last: Int { recipe.stages.count + 1 }

    private func go(_ to: Int) {
        let next = min(max(to, 0), last)
        guard next != place else { return }
        withAnimation(reduceMotion ? nil : .snappy(duration: 0.22)) { place = next }
        onHeading = true
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    pips
                    Group {
                        if place == 0 {
                            gather
                        } else if place == last {
                            finish
                        } else {
                            stage(recipe.stages[place - 1])
                        }
                    }
                    .dexPanel()
                    .id(place)
                    .transition(.opacity.combined(with: .offset(y: 6)))
                }
                .padding(12)
            }
            HStack(spacing: 10) {
                Button("Back") { go(place - 1) }.disabled(place == 0)
                Button(place == 0 ? "Start" : place == recipe.stages.count ? "Finish" : "Next") { go(place + 1) }.disabled(place == last)
            }
            .buttonStyle(DexPrimaryButton(fullWidth: true))
            .padding(12)
        }
        .focusable()
        .focused($hasKeys)
        .focusEffectDisabled()
        .onKeyPress(.rightArrow) { go(place + 1); return .handled }
        .onKeyPress(.leftArrow) { go(place - 1); return .handled }
        .onAppear { hasKeys = true }
        .simultaneousGesture(
            DragGesture(minimumDistance: 30).onEnded { drag in
                let (dx, dy) = (drag.translation.width, drag.translation.height)
                guard abs(dx) >= Self.minSwipe, abs(dx) >= abs(dy) * Self.moreSidewaysThanUp else { return }
                go(dx < 0 ? place + 1 : place - 1)
            }
        )
        .sensoryFeedback(.selection, trigger: place)
        .sensoryFeedback(.success, trigger: counted)
    }

    private var pips: some View {
        HStack(spacing: 5) {
            ForEach(0...last, id: \.self) { index in
                Capsule().fill(index <= place ? Theme.accent : Theme.line).frame(height: 6)
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Stage \(place + 1) of \(last + 1)")
    }

    private func title(_ text: String) -> some View {
        Text(text)
            .font(.dex(.title2, weight: .heavy))
            .foregroundStyle(Theme.ink)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.isHeader)
            .accessibilityFocused($onHeading)
    }

    private func foodLine(_ name: String, food: String, amount: Double) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(name).font(.dex(.body, weight: .bold)).foregroundStyle(Theme.ink)
            if game.store.records[food] == nil { NotHadMark() }
            Spacer(minLength: 8)
            Text(grams(amount)).font(.dex(.body)).monospacedDigit().foregroundStyle(Theme.inkSoft)
        }
        .accessibilityElement(children: .combine)
    }

    private var gather: some View {
        VStack(alignment: .leading, spacing: 12) {
            title("Before you start")
            Note(text: "\(recipe.servings == 1 ? "Makes 1 serving." : "Makes \(recipe.servings) servings.") Gather these.")
            ForEach(recipe.rows) { foodLine($0.name, food: $0.food, amount: $0.grams) }
            // Cautions are never gated, so they come before the first stage.
            ForEach(recipe.cautions, id: \.self) { CautionCard(kind: $0.kind, summary: $0.summary, grade: $0.grade, advice: $0.advice) }
            ForEach(recipe.absorption, id: \.self) { AbsorptionTipCard(tip: $0, linked: game.store.isRevealed(.compound, $0.compound.slug)) }
        }
    }

    private func stage(_ stage: CookStage) -> some View {
        let heading = stage.title ?? stage.foods.first.map { food in
            food.prepMethod == "raw" ? "Add the \(recipe.name(of: food.slug).lowercased())" : "\(recipe.name(of: food.slug)): \(food.prepMethod)"
        } ?? ""
        let unsourced = stage.prep.count - stage.sourced.count
        return VStack(alignment: .leading, spacing: 12) {
            Text(stage.step.map { "Step \($0) of \(recipe.stages.count)" } ?? "Ingredient \(place) of \(recipe.stages.count)")
                .font(.dex(.footnote, weight: .bold))
                .foregroundStyle(Theme.inkSoft)
            title(heading)
            ForEach(Array(stage.foods.enumerated()), id: \.offset) { _, food in
                foodLine(recipe.name(of: food.slug), food: food.slug, amount: food.grams)
            }
            if !stage.prep.isEmpty {
                Text("What this does").font(.dex(.footnote, weight: .bold)).foregroundStyle(Theme.inkSoft)
                ForEach(stage.sourced, id: \.self) { change in
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(Text(change.food).bold()), \(change.method): \(change.compound) \(change.keeps.map { "keeps \(Int(($0 * 100).rounded()))%" } ?? "changes by an amount no source gives")")
                            .font(.dex(.footnote))
                            .foregroundStyle(Theme.ink)
                        if let note = change.note { Note(text: note) }
                    }
                    .fixedSize(horizontal: false, vertical: true)
                }
                if unsourced > 0 {
                    Note(text: "\(stage.sourced.isEmpty ? "\(unsourced)" : "\(unsourced) more") \(unsourced == 1 ? "compound changes" : "compounds change") by an amount no source gives.")
                }
            }
            if !recipe.steps.isEmpty {
                RecipeGridView(recipe: recipe, lit: stage.step)
            }
        }
    }

    private var finish: some View {
        let new = recipe.notHad(in: game.store).count
        return VStack(alignment: .leading, spacing: 12) {
            title(counted ? "Counted" : "Did you cook it?")
            if counted {
                Note(text: "Each food in it is had on this device, in this recipe. Upload sends it to your record.")
                Button("Back to the recipe", action: onDone).buttonStyle(DexPrimaryButton())
            } else {
                Note(text: "Saying so counts every food in it as had, in this recipe.\(new == 0 ? "" : new == 1 ? " One is new to you and its entry opens." : " \(new) are new to you and their entries open.")")
                Button("I cooked it") {
                    game.store.cook(recipe)
                    counted = true
                    onHeading = true
                }
                .buttonStyle(DexPrimaryButton(fullWidth: true))
            }
        }
    }
}
