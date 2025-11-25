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

// Stub: Greek salad recipe
function getGreekSalad(url: string): Recipe {
  return {
    title: "Greek Salad (stubbed from OneDish)",
    sourceUrl: url,
    servings: 4,
    ingredients: [
      { name: "cucumber", amount: "1", unit: "large" },
      { name: "tomatoes", amount: "3", unit: "medium" },
      { name: "red onion", amount: "1/2", unit: "medium" },
      { name: "green bell pepper", amount: "1", unit: "small" },
      { name: "kalamata olives", amount: "1/2", unit: "cup" },
      { name: "feta cheese", amount: "3/4", unit: "cup" },
      { name: "extra-virgin olive oil", amount: "1/4", unit: "cup" },
      { name: "red wine vinegar", amount: "2", unit: "tablespoons" },
      { name: "garlic", amount: "1", unit: "clove" },
      { name: "dried oregano", amount: "1", unit: "teaspoon" },
      { name: "sea salt", amount: "to taste" },
      { name: "black pepper", amount: "to taste" },
    ],
    steps: [
      "Chop the cucumber, tomatoes, bell pepper, and red onion into bite-sized pieces.",
      "Add the chopped vegetables to a large bowl along with the olives.",
      "Whisk together the olive oil, red wine vinegar, minced garlic, oregano, salt, and pepper.",
      "Pour the dressing over the vegetables and toss gently to combine.",
      "Top with crumbled feta just before serving."
    ],
    estimatedTimeMinutes: 20,
  };
}

// Stub: Salmon & vegetables sheet pan recipe
function getSalmonSheetPan(url: string): Recipe {
  return {
    title: "One-Pan Salmon and Vegetables (stubbed from OneDish)",
    sourceUrl: url,
    servings: 4,
    ingredients: [
      { name: "salmon fillets", amount: "4", unit: "pieces" },
      { name: "broccoli florets", amount: "3", unit: "cups" },
      { name: "carrots", amount: "3", unit: "medium" },
      { name: "red onion", amount: "1", unit: "medium" },
      { name: "olive oil", amount: "3", unit: "tablespoons" },
      { name: "garlic", amount: "3", unit: "cloves" },
      { name: "lemon", amount: "1", unit: "whole" },
      { name: "sea salt", amount: "to taste" },
      { name: "black pepper", amount: "to taste" },
      { name: "dried herbs (e.g. thyme or Italian seasoning)", amount: "2", unit: "teaspoons" },
    ],
    steps: [
      "Preheat the oven to 400°F (200°C). Line a large sheet pan with parchment paper.",
      "Chop the broccoli, carrots, and red onion into bite-sized pieces and spread them on the sheet pan.",
      "Drizzle the vegetables with olive oil, minced garlic, salt, pepper, and dried herbs. Toss to coat and spread in an even layer.",
      "Nestle the salmon fillets among the vegetables. Drizzle the salmon with a little more olive oil and season with salt, pepper, and herbs.",
      "Slice the lemon and place slices over the salmon and/or vegetables.",
      "Bake for 15–20 minutes, or until the salmon is cooked through and the vegetables are tender.",
    ],
    estimatedTimeMinutes: 30,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body?.url as string | undefined;

    if (!url) {
      return NextResponse.json(
        { error: "Missing URL in request body." },
        { status: 400 }
      );
    }

    // Very simple routing: if the URL looks like the salmon recipe, return that stub.
    // Otherwise, default to the Greek salad stub.
    let recipe: Recipe;
    if (url.includes("one-pan-meal-salmon-and-vegetables")) {
      recipe = getSalmonSheetPan(url);
    } else if (url.includes("greek-salad")) {
      recipe = getGreekSalad(url);
    } else {
      // Fallback: Greek salad for now
      recipe = getGreekSalad(url);
    }

    return NextResponse.json(recipe);
  } catch (err) {
    console.error("Error in /api/parse-url:", err);
    return NextResponse.json(
      { error: "Unexpected error parsing recipe URL." },
      { status: 500 }
    );
  }
}
