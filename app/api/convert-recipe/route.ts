import { NextRequest, NextResponse } from "next/server";

type Ingredient = {
  name: string;
  amount?: string;
  unit?: string;
};

type Recipe = {
  title: string;
  sourceUrl?: string;
  servings?: number;
  ingredients: Ingredient[];
  steps: string[];
  estimatedTimeMinutes?: number;
};

type OneDishIngredient = Ingredient & {
  optional?: boolean;
};

type OneDishRecipe = Recipe & {
  warnings?: string[];
  ingredients: OneDishIngredient[];
};

type IngredientCategory =
  | "egg"
  | "lemonLime"
  | "onion"
  | "garlic"
  | "herb"
  | "spice"
  | "oil"
  | "liquid"
  | "flour"
  | "sugar"
  | "bakingAgent"
  | "salt"
  | "other";

/**
 * Parse things like:
 * "1", "2.5", "1/2", "1 1/2"
 */
function parseAmountToNumber(amount?: string): number | null {
  if (!amount) return null;
  const trimmed = amount.trim();
  if (!trimmed) return null;

  // "1/2"
  if (/^\d+\/\d+$/.test(trimmed)) {
    const [num, den] = trimmed.split("/").map(Number);
    if (!den) return null;
    return num / den;
  }

  // "1 1/2"
  if (/^\d+\s+\d+\/\d+$/.test(trimmed)) {
    const [wholeStr, fracStr] = trimmed.split(/\s+/);
    const [num, den] = fracStr.split("/").map(Number);
    if (!den) return null;
    return parseInt(wholeStr, 10) + num / den;
  }

  const numeric = Number(trimmed);
  return Number.isNaN(numeric) ? null : numeric;
}

/**
 * Format a number into "1", "1 1/2", "3/4", etc.
 * We round to nearest quarter.
 */
function formatFraction(value: number): string {
  const rounded = Math.round(value * 4) / 4;
  const whole = Math.floor(rounded + 1e-8);
  const frac = rounded - whole;

  const closeTo = (x: number, target: number) => Math.abs(x - target) < 1e-6;

  let fracStr = "";
  if (closeTo(frac, 0)) fracStr = "";
  else if (closeTo(frac, 0.25)) fracStr = "1/4";
  else if (closeTo(frac, 0.5)) fracStr = "1/2";
  else if (closeTo(frac, 0.75)) fracStr = "3/4";
  else fracStr = frac.toFixed(2);

  if (whole === 0 && fracStr) return fracStr;
  if (whole > 0 && !fracStr) return whole.toString();
  if (whole > 0 && fracStr) return `${whole} ${fracStr}`;
  return rounded.toString();
}

/**
 * Determine broad category from ingredient name.
 */
function categorizeIngredient(name: string): IngredientCategory {
  const n = name.toLowerCase();

  if (n.includes("egg")) return "egg";
  if (n.includes("lemon") || n.includes("lime")) return "lemonLime";
  if (n.includes("onion") || n.includes("shallot")) return "onion";
  if (n.includes("garlic")) return "garlic";

  if (
    ["parsley", "cilantro", "basil", "thyme", "oregano", "rosemary", "sage", "dill", "mint", "chive"].some((h) =>
      n.includes(h)
    )
  ) {
    return "herb";
  }

  if (
    [
      "cumin",
      "paprika",
      "turmeric",
      "coriander",
      "chili powder",
      "chilli powder",
      "cayenne",
      "cinnamon",
      "nutmeg",
      "allspice",
      "curry powder",
      "garam masala",
      "five-spice",
    ].some((s) => n.includes(s))
  ) {
    return "spice";
  }

  if (
    ["olive oil", "vegetable oil", "canola oil", "avocado oil", "sesame oil", "coconut oil"].some((o) =>
      n.includes(o)
    )
  ) {
    return "oil";
  }

  if (
    [
      "soy sauce",
      "vinegar",
      "fish sauce",
      "broth",
      "stock",
      "wine",
      "lemon juice",
      "lime juice",
      "milk",
      "cream",
    ].some((l) => n.includes(l))
  ) {
    return "liquid";
  }

  if (n.includes("flour")) return "flour";
  if (n.includes("sugar")) return "sugar";
  if (n.includes("baking powder") || n.includes("baking soda") || n.includes("yeast")) return "bakingAgent";
  if (n.includes("salt")) return "salt";

  return "other";
}

/**
 * Structural ingredients we really don't want to remove.
 */
function isStructuralIngredient(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes("flour") ||
    n.includes("sugar") ||
    n.includes("baking powder") ||
    n.includes("baking soda") ||
    n.includes("yeast") ||
    n.includes("egg") ||
    n.includes("butter")
  );
}

/**
 * Detect if this is likely a baking recipe.
 */
function isBakingRecipe(recipe: Recipe): boolean {
  const title = recipe.title.toLowerCase();
  const bakingWords = [
    "cake",
    "muffin",
    "bread",
    "cookie",
    "brownie",
    "loaf",
    "pie",
    "tart",
    "pastry",
    "scone",
    "biscuit",
  ];

  if (bakingWords.some((w) => title.includes(w))) return true;

  const text = recipe.ingredients.map((i) => i.name.toLowerCase()).join(" ");
  const bakingSignals = ["flour", "baking powder", "baking soda", "yeast", "dough"];
  let hits = 0;
  bakingSignals.forEach((w) => {
    if (text.includes(w)) hits++;
  });

  return hits >= 2;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const recipe: Recipe | undefined = body?.recipe;
    const targetServings: number | undefined = body?.targetServings;

    if (!recipe) {
      return NextResponse.json({ error: "Missing recipe in request body." }, { status: 400 });
    }

    const originalServings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
    const desiredServings = targetServings && targetServings > 0 ? targetServings : 1;
    const factor = desiredServings / originalServings;

    const baking = isBakingRecipe(recipe);
    const warnings: string[] = [];

    if (baking && factor < 0.5) {
      warnings.push(
        "This looks like a baking recipe. Scaling it this far down may affect texture or rise. Double-check key measurements."
      );
    }

    const oneDishIngredients: OneDishIngredient[] = recipe.ingredients.map((ing) => {
      const category = categorizeIngredient(ing.name);
      const baseAmount = parseAmountToNumber(ing.amount);

      // If we can't parse the amount, just pass it through unchanged.
      if (baseAmount === null) {
        return { ...ing, optional: false };
      }

      const scaled = baseAmount * factor;
      let finalAmount = scaled;
      let optional = false;

      // Category-specific rounding and thresholds
      switch (category) {
        case "egg": {
          const roundedEggs = Math.max(1, Math.round(scaled));
          if (roundedEggs !== scaled) {
            warnings.push("Eggs were rounded to the nearest whole egg for practicality.");
          }
          finalAmount = roundedEggs;
          break;
        }
        case "lemonLime": {
          const halfSteps = Math.round(scaled * 2) / 2;
          finalAmount = Math.max(0.5, halfSteps);
          if (Math.abs(finalAmount - scaled) > 1e-6) {
            warnings.push("Lemon/lime quantity was rounded to the nearest half for usability.");
          }
          break;
        }
        case "onion": {
          const quarterSteps = Math.round(scaled * 4) / 4;
          finalAmount = Math.max(0.25, quarterSteps);
          if (Math.abs(finalAmount - scaled) > 1e-6) {
            warnings.push("Onion amount was rounded to the nearest quarter onion.");
          }
          break;
        }
        case "garlic": {
          const cloves = Math.max(1, Math.round(scaled));
          if (cloves !== scaled) {
            warnings.push("Garlic cloves were rounded to whole cloves for proper flavor.");
          }
          finalAmount = cloves;
          break;
        }
        case "herb": {
          // If herbs are extremely small, mark as optional rather than removing.
          if (scaled < 0.5) {
            optional = true;
            warnings.push(
              `The amount of "${ing.name}" is very small after scaling. It's marked as optional – feel free to skip if you like.`
            );
          }
          // Round to nearest quarter teaspoon equivalent
          const quarter = Math.round(scaled * 4) / 4;
          finalAmount = Math.max(0.25, quarter);
          break;
        }
        case "spice": {
          if (scaled < 0.25) {
            optional = true;
            warnings.push(
              `The amount of "${ing.name}" became extremely small. It's marked as optional or "to taste" so you can adjust.`
            );
          }
          const quarter = Math.round(scaled * 4) / 4;
          finalAmount = Math.max(0.25, quarter);
          break;
        }
        case "oil":
        case "liquid": {
          if (scaled < 0.5) {
            warnings.push(
              `The amount of "${ing.name}" was very low; it was increased slightly to keep flavor and texture balanced.`
            );
          }
          const half = Math.round(scaled * 2) / 2;
          finalAmount = Math.max(0.5, half);
          break;
        }
        case "flour":
        case "sugar":
        case "bakingAgent": {
          // For structural ingredients, we don't drop them – if they get tiny, we warn.
          if (scaled < baseAmount * 0.25) {
            warnings.push(
              `The amount of "${ing.name}" is much lower after scaling. This could affect structure; measure carefully.`
            );
          }
          // Round to nearest quarter unit
          const quarter = Math.round(scaled * 4) / 4;
          finalAmount = Math.max(quarter, scaled > 0 ? quarter : 0);
          break;
        }
        case "salt":
        case "other":
        default: {
          // Generic: gentle rounding to quarters
          const quarter = Math.round(scaled * 4) / 4;
          finalAmount = quarter;
          break;
        }
      }

      const formattedAmount = formatFraction(finalAmount);
      return {
        ...ing,
        amount: formattedAmount,
        optional,
      };
    });

    const oneDish: OneDishRecipe = {
      title: recipe.title,
      sourceUrl: recipe.sourceUrl,
      servings: desiredServings,
      ingredients: oneDishIngredients,
      steps: recipe.steps,
      estimatedTimeMinutes: recipe.estimatedTimeMinutes,
      warnings: warnings.length ? Array.from(new Set(warnings)) : undefined,
    };

    return NextResponse.json(oneDish);
  } catch (error) {
    console.error("Error converting recipe:", error);
    return NextResponse.json({ error: "Failed to convert recipe." }, { status: 500 });
  }
}
