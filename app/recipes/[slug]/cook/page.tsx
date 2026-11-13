import { notFound } from "next/navigation";
import { AbsorptionTipCard, CautionCard } from "../../../../components/claims.tsx";
import { CookAlong, type StageView } from "../../../../components/cook-along.tsx";
import { GameShell } from "../../../../components/game.tsx";
import { gridFoods } from "../../../../components/recipe-view.tsx";
import { cookStages } from "../../../../lib/cook-along.ts";
import { recipePage } from "../../../../lib/db/recipes.ts";
import { viewer } from "../../../../lib/viewer.ts";

export default async function CookAlongRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { revealed, account } = await viewer();
  const page = await recipePage(slug);
  // Someone else's recipe does not exist as far as this screen can tell.
  if (!page || (page.owner !== null && page.owner !== account?.owner)) notFound();
  const stages: StageView[] = cookStages(page).map((s) => ({
    step: s.step,
    title: s.title,
    prepMethod: s.prepMethod,
    foods: s.foods,
    prep: s.prep.map((p) => ({ food: page.foodNames[p.ingredientSlug], compound: page.compoundNames[p.compoundSlug], method: p.method, keeps: p.retentionFactor, note: p.note })),
  }));
  return (
    <GameShell>
      <CookAlong slug={page.slug} name={page.name} servings={page.servings} grid={page.grid} stepTitles={page.stepTitles} foods={gridFoods(page, revealed)} stages={stages} signedIn={account !== null}>
        {/* Cautions are never gated, so they come before the first stage. */}
        {page.profile.cautions.map((c) => (
          <CautionCard key={`${c.kind}:${c.summary}`} caution={c} />
        ))}
        {page.absorption.map((tip) => (
          <AbsorptionTipCard key={`${tip.flag.compoundSlug}:${tip.flag.status}`} tip={tip} linked={revealed.compounds.has(tip.compound.slug)} />
        ))}
      </CookAlong>
    </GameShell>
  );
}
