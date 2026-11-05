// What the disclaimer says. A draft in plain language, to be reviewed by a lawyer before anyone
// other than its maker uses the app. Changing it ships with a version bump, which shows it again.

export const DISCLAIMER_TITLE = "Before you use NutriDex";
export const DISCLAIMER_INTRO =
  "Please read this. It appears the first time you open the app and again after each update.";

export const DISCLAIMER_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "This is not medical advice",
    body:
      "NutriDex is for general information and learning. It does not diagnose, treat, cure or prevent any " +
      "disease, and it does not replace advice from a doctor, registered dietitian or pharmacist. Don't start, " +
      "stop or change a medication, supplement or diet because of something you read here without asking one " +
      "of them first.",
  },
  {
    heading: "Medications, pregnancy and health conditions",
    body:
      "Some foods and supplements interact with medications: vitamin K, for example, works against the blood " +
      "thinner warfarin. Others matter more if you are pregnant or breastfeeding, have kidney disease, or have " +
      "allergies. If any of that applies to you, check with your clinician before acting on anything here.",
  },
  {
    heading: "Supplements",
    body:
      "NutriDex shows what supplement labels say and flags amounts above published upper limits. It never " +
      "recommends a dose. The FDA does not approve dietary supplements before they are sold, so a label is the " +
      "maker's claim, not a verified fact.",
  },
  {
    heading: "How accurate the data is",
    body:
      "Nutrient amounts come from USDA FoodData Central and are averages; the food in front of you will differ. " +
      "Every effect carries an evidence grade, from A (consistent human trials) to D (traditional or anecdotal " +
      "use), and many findings are early. Missing data is shown as missing, never guessed. The information can " +
      "be incomplete or out of date.",
  },
  {
    heading: "Emergencies",
    body:
      "NutriDex is not for emergencies. If you think you or someone else is having a medical emergency, call " +
      "911 or your local emergency number. For a possible poisoning or overdose, call Poison Control at " +
      "1-800-222-1222.",
  },
  {
    heading: "No warranty",
    body:
      "NutriDex is provided as is, without warranties of any kind. You use it at your own risk, and its maker " +
      "is not liable for decisions you make based on it.",
  },
  {
    heading: "What is stored about you",
    body:
      "The foods you mark as had, and when: kept in a cookie on this device until you upload them, then in " +
      "NutriDex's database. Another cookie remembers which version of this notice you accepted, so it only " +
      "appears again after an update. The skin you choose: kept in a cookie on this device and, once you have " +
      "uploaded with your passcode, in NutriDex's database so it can follow you to your other devices. Nothing else.",
  },
];

/** The same notice for the native apps, which keep their one remembered thing in a setting. */
export const NATIVE_DISCLAIMER_SECTIONS: { heading: string; body: string }[] = DISCLAIMER_SECTIONS.map((s) =>
  s.heading === "What is stored about you"
    ? { ...s, body: "The foods you mark as had, and when: kept on this device until you upload them, then in NutriDex's database. A setting on this device remembers which version of this notice you accepted, so it only appears again after an update. The skin you choose: kept on this device and in NutriDex's database, so it can follow you to your other devices. Nothing else." }
    : s,
);
