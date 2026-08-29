import studyPack from "../worker/study-pack.json";
import { supabase } from "./supabase";

type CardInput = {
  id?: number; topic?: string; kind?: "word" | "phrase"; italian?: string;
  ipa?: string; translation?: string; example?: string;
  exampleTranslation?: string; usage?: string; association?: string;
};

// These positional ids are persisted in progress and owner overrides. Never reorder the base pack.
const baseCards = (studyPack as CardInput[]).map((card, index) => ({ ...card, id: index + 1 }));
const originalFetch = window.fetch.bind(window);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function dbCard(card: CardInput, userId: string) {
  return {
    ...(card.id && card.id >= 1_000_000 ? { id: card.id } : {}),
    user_id: userId,
    topic: clean(card.topic) || "Без темы",
    kind: card.kind === "phrase" ? "phrase" : "word",
    italian: clean(card.italian), ipa: clean(card.ipa), translation: clean(card.translation),
    example: clean(card.example), example_translation: clean(card.exampleTranslation),
    usage: clean(card.usage), association: clean(card.association) || "book",
    updated_at: new Date().toISOString(),
  };
}
function appCard(card: Record<string, unknown>) {
  return {
    id: Number(card.id), topic: card.topic, kind: card.kind, italian: card.italian,
    ipa: card.ipa, translation: card.translation, example: card.example,
    exampleTranslation: card.example_translation, usage: card.usage, association: card.association,
  };
}
function baseCardWithOverride(card: CardInput & { id: number }, override?: Record<string, unknown>) {
  if (!override) return card;
  const { card_id: _cardId, deleted_at: _deletedAt, updated_at: _updatedAt, ...changes } = override;
  return { ...card, ...changes, id: card.id };
}
function baseOverride(card: CardInput & { id: number }, deletedAt: string | null = null) {
  return {
    card_id: card.id,
    topic: clean(card.topic),
    kind: card.kind === "phrase" ? "phrase" : "word",
    italian: clean(card.italian),
    ipa: clean(card.ipa),
    translation: clean(card.translation),
    example: clean(card.example),
    exampleTranslation: clean(card.exampleTranslation),
    usage: clean(card.usage),
    association: clean(card.association) || "book",
    deleted_at: deletedAt,
    updated_at: new Date().toISOString(),
  };
}
async function hideBaseCards(ids: number[]) {
  const uniqueIds = Array.from(new Set(ids.filter((id) => id > 0 && id < 1_000_000)));
  if (!uniqueIds.length) return { hidden: 0, error: null };
  const { data, error } = await supabase.from("base_card_overrides").select("*").in("card_id", uniqueIds);
  if (error) return { hidden: 0, error };
  const overrides = new Map((data || []).map((item) => [Number(item.card_id), item]));
  const deletedAt = new Date().toISOString();
  const rows = uniqueIds.flatMap((id) => {
    const original = baseCards.find((card) => card.id === id);
    if (!original) return [];
    const effective = baseCardWithOverride(original, overrides.get(id));
    return [baseOverride(effective, deletedAt)];
  });
  if (!rows.length) return { hidden: 0, error: null };
  const result = await supabase.from("base_card_overrides").upsert(rows, { onConflict: "card_id" });
  return { hidden: result.error ? 0 : rows.length, error: result.error };
}
async function currentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}
async function currentUserIsOwner() {
  const user = await currentUser();
  if (!user?.email) return false;
  const { data } = await supabase
    .from("allowed_emails")
    .select("is_owner")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();
  return data?.is_owner === true;
}

async function handleData(url: URL, init: RequestInit) {
  const user = await currentUser();
  if (!user) return json({ error: "Войдите в аккаунт" }, 401);
  const method = (init.method || "GET").toUpperCase();
  if (method === "GET") {
    const [cardsResult, progressResult, topicsResult, overridesResult] = await Promise.all([
      supabase.from("user_cards").select("*").order("created_at", { ascending: false }),
      supabase.from("user_progress").select("card_id,status"),
      supabase.from("user_topics").select("title").order("created_at"),
      supabase.from("base_card_overrides").select("*")
    ]);
    const error = cardsResult.error || progressResult.error || topicsResult.error || overridesResult.error;
    if (error) return json({ error: error.message }, 403);
    const overrides = new Map((overridesResult.data || []).map((item) => [Number(item.card_id), item]));
    const visibleBaseCards = baseCards
      .filter((card) => !overrides.get(card.id)?.deleted_at)
      .map((card) => baseCardWithOverride(card, overrides.get(card.id)));
    return json({
      cards: [
        ...visibleBaseCards,
        ...(cardsResult.data || []).map((card) => appCard(card)),
      ],
      progress: (progressResult.data || []).map((item) => ({ cardId: Number(item.card_id), status: item.status })),
      topics: (topicsResult.data || []).map((item) => item.title),
      packStatus: { expected: baseCards.length, loaded: baseCards.length, remaining: 0 },
    });
  }
  if (method === "POST" || method === "PUT") {
    if (!(await currentUserIsOwner())) return json({ error: "Только владелец сайта может менять карточки" }, 403);
    const body = JSON.parse(String(init.body || "{}")) as CardInput & { cards?: CardInput[] };
    if (Array.isArray(body.cards)) {
      const prepared = body.cards.map((card) => dbCard(card, user.id));
      const { data: existing } = await supabase.from("user_cards").select("topic,italian");
      const keys = new Set([
        ...baseCards.map((card) => `${card.topic}\u0000${String(card.italian).trim().toLocaleLowerCase("it")}`),
        ...(existing || []).map((card) => `${card.topic}\u0000${card.italian.trim().toLocaleLowerCase("it")}`),
      ]);
      const missing = prepared.filter((card) => {
        const key = `${card.topic}\u0000${card.italian.toLocaleLowerCase("it")}`;
        if (keys.has(key)) return false;
        keys.add(key); return true;
      });
      if (missing.length) {
        const { error } = await supabase.from("user_cards").insert(missing);
        if (error) return json({ error: error.message }, 400);
      }
      return json({ added: missing.length }, 201);
    }
    if (method === "PUT" && body.id && body.id < 1_000_000) {
      if (!(await currentUserIsOwner())) return json({ error: "Изменять базовые карточки может только владелец" }, 403);
      const original = baseCards.find((card) => card.id === body.id);
      if (!original) return json({ error: "Карточка не найдена" }, 404);
      const changed = { ...original, ...body };
      const override = baseOverride(changed as CardInput & { id: number });
      const { error } = await supabase.from("base_card_overrides").upsert(override, { onConflict: "card_id" });
      return error ? json({ error: error.message }, 400) : json({ card: { ...original, ...body } });
    }
    const prepared = dbCard(body, user.id);
    if (!prepared.italian || !prepared.ipa || !prepared.translation) return json({ error: "Заполните итальянский текст, IPA и перевод" }, 400);
    const query = method === "POST"
      ? supabase.from("user_cards").insert(prepared).select().single()
      : supabase.from("user_cards").update(prepared).eq("id", body.id!).select().single();
    const { data, error } = await query;
    if (error) return json({ error: error.message }, 400);
    return json({ card: appCard(data as Record<string, unknown>) }, method === "POST" ? 201 : 200);
  }
  if (method === "DELETE") {
    if (!(await currentUserIsOwner())) return json({ error: "Только владелец сайта может удалять карточки" }, 403);
    const contentType = new Headers(init.headers).get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = JSON.parse(String(init.body || "{}")) as { ids?: number[]; deduplicate?: boolean; topic?: string };
      if (Array.isArray(body.ids)) {
        const baseResult = await hideBaseCards(body.ids);
        if (baseResult.error) return json({ error: baseResult.error.message }, 400);
        const userIds = body.ids.filter((id) => id >= 1_000_000);
        if (userIds.length) {
          const { error } = await supabase.from("user_cards").delete().in("id", userIds);
          if (error) return json({ error: error.message }, 400);
        }
        return json({ removed: baseResult.hidden + userIds.length });
      }
      if (body.deduplicate) {
        const [overridesResult, userCardsResult] = await Promise.all([
          supabase.from("base_card_overrides").select("*"),
          supabase.from("user_cards").select("*").order("created_at", { ascending: true }),
        ]);
        const error = overridesResult.error || userCardsResult.error;
        if (error) return json({ error: error.message }, 400);
        const overrides = new Map((overridesResult.data || []).map((item) => [Number(item.card_id), item]));
        const effectiveBase = baseCards
          .filter((card) => !overrides.get(card.id)?.deleted_at)
          .map((card) => baseCardWithOverride(card, overrides.get(card.id)));
        const effectiveUser = (userCardsResult.data || []).map((card) => appCard(card));
        const scope = clean(body.topic);
        const seen = new Set<string>();
        const duplicateBaseIds: number[] = [];
        const duplicateUserIds: number[] = [];
        for (const card of [...effectiveBase, ...effectiveUser]) {
          if (scope && card.topic !== scope) continue;
          const key = clean(card.italian).toLocaleLowerCase("it");
          if (!key || !seen.has(key)) {
            if (key) seen.add(key);
            continue;
          }
          if (card.id < 1_000_000) duplicateBaseIds.push(card.id);
          else duplicateUserIds.push(card.id);
        }
        const baseResult = await hideBaseCards(duplicateBaseIds);
        if (baseResult.error) return json({ error: baseResult.error.message }, 400);
        if (duplicateUserIds.length) {
          const { error: deleteError } = await supabase.from("user_cards").delete().in("id", duplicateUserIds);
          if (deleteError) return json({ error: deleteError.message }, 400);
        }
        return json({ removed: baseResult.hidden + duplicateUserIds.length });
      }
    }
    const id = Number(url.searchParams.get("id"));
    if (id > 0 && id < 1_000_000) {
      const result = await hideBaseCards([id]);
      if (result.error) return json({ error: result.error.message }, 400);
    } else if (id >= 1_000_000) {
      const { error } = await supabase.from("user_cards").delete().eq("id", id);
      if (error) return json({ error: error.message }, 400);
    }
    return json({ ok: true });
  }
  return json({ error: "Метод не поддерживается" }, 405);
}

async function handleProgress(init: RequestInit) {
  const user = await currentUser();
  if (!user) return json({ error: "Войдите в аккаунт" }, 401);
  const body = JSON.parse(String(init.body || "{}")) as { cardId?: number; status?: string; reset?: boolean; resetIds?: number[] };
  if (body.reset) {
    const { error } = await supabase.from("user_progress").delete().eq("user_id", user.id);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  if (Array.isArray(body.resetIds)) {
    if (body.resetIds.length) await supabase.from("user_progress").delete().in("card_id", body.resetIds);
    return json({ ok: true });
  }
  if (!body.cardId || !["known", "repeat"].includes(body.status || "")) return json({ error: "Некорректный статус" }, 400);
  const { error } = await supabase.from("user_progress").upsert({ user_id: user.id, card_id: body.cardId, status: body.status, updated_at: new Date().toISOString() });
  return error ? json({ error: error.message }, 400) : json({ ok: true });
}

async function handleTopics(init: RequestInit) {
  const user = await currentUser();
  if (!user) return json({ error: "Войдите в аккаунт" }, 401);
  if (!(await currentUserIsOwner())) return json({ error: "Только владелец сайта может менять разделы" }, 403);
  const body = JSON.parse(String(init.body || "{}")) as { title?: string; oldTitle?: string; newTitle?: string };
  const method = (init.method || "POST").toUpperCase();
  if (method === "PUT") {
    const oldTitle = clean(body.oldTitle), newTitle = clean(body.newTitle);
    if (!oldTitle || !newTitle) return json({ error: "Введите название раздела" }, 400);
    await supabase.from("user_cards").update({ topic: newTitle }).eq("topic", oldTitle);
    await supabase.from("user_topics").delete().eq("title", oldTitle);
    await supabase.from("user_topics").upsert({ user_id: user.id, title: newTitle });
    return json({ oldTitle, title: newTitle });
  }
  const title = clean(body.title);
  if (!title) return json({ error: "Введите название раздела" }, 400);
  const { error } = await supabase.from("user_topics").upsert({ user_id: user.id, title });
  return error ? json({ error: error.message }, 400) : json({ title }, 201);
}

window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(raw, window.location.origin);
  if (url.pathname === "/api/data") return handleData(url, init);
  if (url.pathname === "/api/progress") return handleProgress(init);
  if (url.pathname === "/api/topics") return handleTopics(init);
  return originalFetch(input, init);
};
