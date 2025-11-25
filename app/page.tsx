"use client";

import { FormEvent, useState } from "react";

type Ingredient = {
  name: string;
  amount: string;
  unit?: string;
  optional?: boolean; // 👈 NEW
};

type Recipe = {
  title: string;
  sourceUrl?: string;
  servings?: number;
  ingredients: Ingredient[];
  steps: string[];
  estimatedTimeMinutes?: number;
  warnings?: string[]; // 👈 NEW
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [recipeText, setRecipeText] = useState("");
  const [parsedRecipe, setParsedRecipe] = useState<Recipe | null>(null);
  const [oneDishRecipe, setOneDishRecipe] = useState<Recipe | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [targetServings, setTargetServings] = useState<number>(1);
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
    const handleRemoveOptionalIngredient = (index: number) => {
    if (!oneDishRecipe) return;
    const updated: Recipe = {
      ...oneDishRecipe,
      ingredients: oneDishRecipe.ingredients.filter((_, i) => i !== index),
    };
    setOneDishRecipe(updated);
  };


  const handleUrlSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url) {
      alert("Please paste a recipe URL first.");
      return;
    }

    setUrlLoading(true);
    setUrlError(null);
    setParsedRecipe(null);
    setOneDishRecipe(null);
    setConvertError(null);

    try {
      const res = await fetch("/api/parse-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          (data as any)?.error || "Failed to parse recipe from URL.";
        setUrlError(message);
        return;
      }

      const data = (await res.json()) as Recipe;
      setParsedRecipe(data);
    } catch (err) {
      console.error(err);
      setUrlError("Something went wrong talking to the server.");
    } finally {
      setUrlLoading(false);
    }
  };

  const handleTextSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!recipeText) {
      alert("Please paste some recipe text first.");
      return;
    }
    alert(
      `Recipe text received (${recipeText.length} characters).\nNext, we’ll turn this into a OneDish version.`
    );
  };

  const handleConvertToOneDish = async () => {
    if (!parsedRecipe) return;

    setConvertLoading(true);
    setConvertError(null);
    setOneDishRecipe(null);

    try {
      const res = await fetch("/api/convert-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipe: parsedRecipe,
          targetServings,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          (data as any)?.error || "Failed to convert recipe to OneDish version.";
        setConvertError(message);
        return;
      }

      const data = (await res.json()) as Recipe;
      setOneDishRecipe(data);
    } catch (err) {
      console.error(err);
      setConvertError("Something went wrong converting the recipe.");
    } finally {
      setConvertLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-100 flex justify-center px-4 py-6">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-[0_12px_30px_rgba(0,0,0,0.06)] px-5 py-6 flex flex-col gap-5 font-sans">
        {/* Header */}
        <header className="flex flex-col gap-1 mb-1">
          <div className="text-[13px] font-medium tracking-[0.18em] uppercase text-zinc-500">
            OneDish
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Cook for one. Skip the waste.
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Paste any recipe and we&apos;ll turn it into a single-serving,
            low-leftover version that fits your week.
          </p>
        </header>

        {/* Section: Paste URL */}
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 flex flex-col gap-2.5">
          <div className="text-[13px] font-semibold text-zinc-700">
            1. Paste a recipe URL
          </div>
          <form onSubmit={handleUrlSubmit} className="flex gap-2 items-center">
            <input
              type="url"
              placeholder="https://example.com/your-favorite-recipe"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 rounded-full border border-zinc-300 px-3.5 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/60"
            />
            <button
              type="submit"
              disabled={urlLoading}
              className="rounded-full bg-zinc-900 text-white text-sm font-semibold px-4 py-2 whitespace-nowrap hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {urlLoading ? "Parsing..." : "Use URL"}
            </button>
          </form>
          <p className="text-[12px] text-zinc-400">
            We&apos;ll skip the ads and stories and go straight to the actual
            recipe.
          </p>
          {urlError && (
            <p className="text-[12px] text-red-500 mt-1">{urlError}</p>
          )}
        </section>

        {/* Section: Paste recipe text */}
        <section className="rounded-2xl border border-zinc-200 px-3.5 py-3 flex flex-col gap-2.5">
          <div className="text-[13px] font-semibold text-zinc-700">
            2. Or paste recipe text
          </div>
          <form onSubmit={handleTextSubmit} className="flex flex-col gap-2">
            <textarea
              placeholder="Copy ingredients and steps from a cookbook or notes app and paste here..."
              value={recipeText}
              onChange={(e) => setRecipeText(e.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-zinc-300 px-3 py-2 text-[13px] outline-none resize-vertical focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/60"
            />
            <button
              type="submit"
              className="self-end rounded-full bg-zinc-900 text-white text-[13px] font-semibold px-4 py-1.5 hover:bg-zinc-800 transition-colors"
            >
              Use this recipe
            </button>
          </form>
          <p className="text-[12px] text-zinc-400">
            Perfect for recipes from physical cookbooks or screenshots.
          </p>
        </section>

        {/* Future: Upload photo */}
        <section className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-3.5 py-3 flex flex-col gap-1.5">
          <div className="text-[13px] font-medium text-zinc-600">
            Coming soon: snap a cookbook page
          </div>
          <p className="text-[12px] text-zinc-400">
            You&apos;ll be able to take a photo of a cookbook recipe and let
            OneDish read it for you.
          </p>
        </section>

        {/* Parsed recipe preview + OneDish controls */}
        {parsedRecipe && (
          <section className="mt-1 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-3 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[13px] font-semibold text-emerald-800">
                  Parsed recipe preview
                </div>
                <div className="text-sm font-semibold text-zinc-900">
                  {parsedRecipe.title}
                </div>
                {parsedRecipe.sourceUrl && (
                  <a
                    href={parsedRecipe.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] text-emerald-700 underline"
                  >
                    Source: {parsedRecipe.sourceUrl}
                  </a>
                )}
                <div className="text-[12px] text-zinc-500 mt-0.5">
                  {parsedRecipe.servings
                    ? `${parsedRecipe.servings} servings · ~${
                        parsedRecipe.estimatedTimeMinutes ?? 20
                      } min`
                    : `~${parsedRecipe.estimatedTimeMinutes ?? 20} min`}
                </div>
              </div>

              {/* OneDish controls */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-zinc-600">
                    Target servings
                  </span>
                  <select
                    value={targetServings}
                    onChange={(e) =>
                      setTargetServings(Number(e.target.value) || 1)
                    }
                    className="text-[12px] border border-zinc-300 rounded-full px-2 py-1 bg-white outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/60"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
                <button
                  onClick={handleConvertToOneDish}
                  disabled={convertLoading}
                  className="rounded-full bg-emerald-600 text-white text-[12px] font-semibold px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {convertLoading
                    ? "Converting..."
                    : `Make ${targetServings} serving${
                        targetServings > 1 ? "s" : ""
                      }`}
                </button>
                {convertError && (
                  <p className="text-[11px] text-red-500 max-w-[220px] text-right">
                    {convertError}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[12px] font-semibold text-zinc-700 mb-1">
                  Original ingredients
                </div>
                <ul className="text-[12px] text-zinc-700 list-disc list-inside space-y-0.5">
                  {parsedRecipe.ingredients.map((ing, idx) => (
                    <li key={idx}>
                      {ing.amount} {ing.unit} {ing.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[12px] font-semibold text-zinc-700 mb-1">
                  Steps
                </div>
                <ol className="text-[12px] text-zinc-700 list-decimal list-inside space-y-0.5">
                  {parsedRecipe.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        )}

        {/* OneDish version preview */}
        {oneDishRecipe && (
          <section className="mt-1 rounded-2xl border border-zinc-200 bg-white px-3.5 py-3 flex flex-col gap-2">
            <div className="text-[13px] font-semibold text-zinc-800">
              OneDish version
            </div>
            <div className="text-sm font-semibold text-zinc-900">
              {oneDishRecipe.title}
            </div>
            <div className="text-[12px] text-zinc-500">
              {oneDishRecipe.servings
                ? `${oneDishRecipe.servings} serving${
                    oneDishRecipe.servings > 1 ? "s" : ""
                  }`
                : null}
              {oneDishRecipe.estimatedTimeMinutes
                ? ` · ~${oneDishRecipe.estimatedTimeMinutes} min`
                : null}
            </div>
            {oneDishRecipe.warnings && oneDishRecipe.warnings.length > 0 && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="text-[12px] font-semibold text-amber-900 mb-1">
                  OneDish notes
                </div>
                <ul className="text-[11px] text-amber-900 list-disc list-inside space-y-0.5">
                  {oneDishRecipe.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[12px] font-semibold text-zinc-700 mb-1">
                  Scaled ingredients
                </div>
<ul className="text-[12px] text-zinc-700 list-disc list-inside space-y-0.5">
  {oneDishRecipe.ingredients.map((ing, idx) => (
    <li key={idx} className="flex items-start gap-2">
      <span className={ing.optional ? "italic opacity-80" : ""}>
        {ing.amount} {ing.unit} {ing.name}
        {ing.optional && (
          <span className="ml-1 text-[11px] text-amber-700">
            (optional)
          </span>
        )}
      </span>
      {ing.optional && (
        <button
          type="button"
          onClick={() => handleRemoveOptionalIngredient(idx)}
          className="text-[11px] text-zinc-500 underline hover:text-zinc-700"
        >
          remove
        </button>
      )}
    </li>
  ))}
</ul>

              </div>
              <div>
                <div className="text-[12px] font-semibold text-zinc-700 mb-1">
                  Steps
                </div>
                <ol className="text-[12px] text-zinc-700 list-decimal list-inside space-y-0.5">
                  {oneDishRecipe.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 mt-1">
              This is a first-pass OneDish scaling. Later, we&apos;ll add smarter
              tweaks for leftovers and ingredient overlap across the week.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
