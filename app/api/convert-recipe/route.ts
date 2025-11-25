import { NextRequest, NextResponse } from "next/server";

type Ingredient = {
  name: string;
  amount: string;
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

// Scale a human-readable amount string (like "1", "1/2", "1 1/2") by a factor
function scaleAmount(amount: string, factor: number): string {
  const trimmed = amount.trim();

  // Simple fraction like "1/2"
  if (/^\d+\/\d+$/.test(trimmed)) {
    const [num, den] = trimmed.split("/").map(Number);
    const base = num / den;
    const scaled = base * factor;
    return formatNumber(scaled);
  }

  // Mixed number like "1 1/2"
  if (/^\d+\s+\d+\/\d+$/.test(trimmed)) {
    const [wholeStr, fracStr] = trimmed.split(/\s+/);
    const [num, den] = fracStr.split("/").map(Number);
    const base = parseInt(wholeStr, 10) + num / den;
    const scaled = base * factor;
    return formatNumber(scaled);
  }

  // Plain number like "1", "2.5"
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric)) {
    const scaled = numeric * factor;
    return formatNumber(scaled);
  }

  // If we can't parse it, just return the original string
  return amount;
}

// Turn a numeric value into a nice fraction string (quarters: 1/4, 1/2, 3/4)
function formatNumber(value: number): string {
  if (value <= 0) return "0";

  // Round to nearest quarter
  const quarters = Math.round(value * 4); // e.g. 0.75 -> 3, 1.25 -> 5
  const whole = Math.floor(quarters / 4); // whole number part
  const rem = quarters % 4;               // remaining quarters (0..3)

  let fraction = "";
  if (rem === 1) fraction = "1/4";
  else if (rem === 2) fraction = "1/2";
  else if (rem === 3) fraction = "3/4";

  if (whole === 0 && fraction) {
    return fraction;              // "1/2"
  }
  if (whole > 0 && fraction) {
    return `${whole} ${fraction}`; // "1 1/2"
  }
  return String(whole);           // exact integer like "1" or "2"
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const recipe = body?.recipe as Recipe | undefined;
    const targetServings = body?.targetServings as number | undefined;

    if (
      !recipe ||
      !Array.isArray(recipe.ingredients) ||
      recipe.ingredients.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing or invalid recipe in request body." },
        { status: 400 }
      );
    }

    if (!targetServings || targetServings <= 0) {
      return NextResponse.json(
        { error: "Invalid targetServings in request body." },
        { status: 400 }
      );
    }

    const originalServings =
      recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
    const factor = targetServings / originalServings;

    const scaledIngredients: Ingredient[] = recipe.ingredients.map((ing) => ({
      ...ing,
      amount: scaleAmount(ing.amount, factor),
    }));

    const oneDishRecipe: Recipe = {
      ...recipe,
      title: `${recipe.title} (OneDish ${targetServings}-serving version)`,
      servings: targetServings,
      ingredients: scaledIngredients,
    };

    return NextResponse.json(oneDishRecipe);
  } catch (err) {
    console.error("Error in /api/convert-recipe:", err);
    return NextResponse.json(
      { error: "Unexpected error converting recipe." },
      { status: 500 }
    );
  }
}
