"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import "flag-icons/css/flag-icons.min.css";
import generatedScenePaths from "./generated-image-map.json";

type CardKind = "word" | "phrase";
type Association =
  | "sea"
  | "house"
  | "coffee"
  | "sun"
  | "travel"
  | "street"
  | "flowers"
  | "book"
  | "hello"
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "goodbye"
  | "good-day"
  | "soon"
  | "tomorrow"
  | "later"
  | "next-time"
  | "see-you"
  | "phone"
  | "meeting"
  | "name"
  | "origin"
  | "how-are-you"
  | "excellent"
  | "good"
  | "not-bad"
  | "so-so"
  | "bad";
type Card = {
  id: number;
  topic: string;
  kind: CardKind;
  italian: string;
  ipa: string;
  translation: string;
  example: string;
  exampleTranslation: string;
  usage: string;
  association: Association;
};

const ALL_TOPICS = "Все разделы";
const NEW_TOPIC = "✨ Новое";
// "Новое" is a view of the latest uploaded batch, not a separate copy of
// cards. On the next upload this list is fully replaced; the cards themselves
// continue to live in their permanent thematic sections.
//
// The set deliberately includes words that were already in the library
// (for example, l'insegnante): they appear in today's batch without creating
// a duplicate card.
const LATEST_NEW_CARD_ITALIAN = new Set([
  "la segretaria", "l'impiegato", "l'insegnante", "il giornalista",
  "il farmacista", "il tassista", "il commesso", "l'infermiere",
  "il cameriere", "l'operaio", "il cuoco", "il chirurgo", "l'architetto",
  "l'estetista", "l'avvocato", "l'attore", "il dottore", "il medico",
  "il meccanico", "il poliziotto", "il traduttore", "il rappresentante",
  "la casalinga", "Che lavoro fai?", "Che fai nella vita?",
  "Di che cosa ti occupi?", "Dove lavori?", "fare la spesa",
  "fare una passeggiata", "fare le vacanze", "fare il bagno", "fare la coda",
  "fare uno sbaglio", "fare colazione", "Che tempo fa?", "Fa caldo.",
  "Fa freddo.", "parlare", "scrivere", "partire", "capire", "cercare",
  "giocare", "mangiare",
].map((italian) => italian.toLocaleLowerCase("it")));

const groupedTopicTitles: Record<number, string> = {
  1: "Приветствия и общение", 2: "Приветствия и общение", 3: "Приветствия и общение",
  4: "Служебные и связующие слова", 5: "Служебные и связующие слова",
  6: "Глаголы", 7: "Глаголы", 8: "Глаголы", 9: "Глаголы", 10: "Глаголы",
  11: "Глаголы", 12: "Глаголы", 13: "Глаголы",
  14: "Предлоги и артикли", 15: "Предлоги и артикли", 16: "Предлоги и артикли",
  17: "Предлоги и артикли", 18: "Предлоги и артикли", 19: "Предлоги и артикли",
  20: "Предлоги и артикли", 21: "Предлоги и артикли", 22: "Предлоги и артикли",
  23: "Существительные", 24: "Существительные", 25: "Существительные",
  26: "Семья", 27: "Человек: тело и внешность", 28: "Человек: тело и внешность",
  29: "Цвета и характеристики", 30: "Цвета и характеристики",
  31: "Страны, города и национальности", 32: "Страны, города и национальности",
  33: "Страны, города и национальности", 34: "Числа и счёт", 35: "Числа и счёт",
  36: "Числа и счёт", 37: "Служебные и связующие слова", 38: "Числа и счёт",
};

function groupedTopic(topic: string) {
  const match = topic.match(/^(\d+)\./);
  return match ? groupedTopicTitles[Number(match[1])] || topic : topic;
}

function isNewCard(card: Card) {
  return LATEST_NEW_CARD_ITALIAN.has(card.italian.trim().toLocaleLowerCase("it"));
}

function cardMatchesTopic(card: Card, selectedTopic: string) {
  if (selectedTopic === ALL_TOPICS) return true;
  if (selectedTopic === NEW_TOPIC) return isNewCard(card);
  return groupedTopic(card.topic) === selectedTopic;
}
type Status = "known" | "repeat";
type Tab = "study" | "repeat" | "sections" | "library" | "add" | "progress";
type AddMode = "batch" | "manual";

type VerbForm = {
  pronoun: string;
  form: string;
};

const irregularPresentConjugations: Record<string, VerbForm[]> = {
  essere: [
    { pronoun: "io", form: "sono" },
    { pronoun: "tu", form: "sei" },
    { pronoun: "lui / lei / Lei", form: "è" },
    { pronoun: "noi", form: "siamo" },
    { pronoun: "voi", form: "siete" },
    { pronoun: "loro", form: "sono" },
  ],
  avere: [
    { pronoun: "io", form: "ho" },
    { pronoun: "tu", form: "hai" },
    { pronoun: "lui / lei / Lei", form: "ha" },
    { pronoun: "noi", form: "abbiamo" },
    { pronoun: "voi", form: "avete" },
    { pronoun: "loro", form: "hanno" },
  ],
  stare: [
    { pronoun: "io", form: "sto" },
    { pronoun: "tu", form: "stai" },
    { pronoun: "lui / lei / Lei", form: "sta" },
    { pronoun: "noi", form: "stiamo" },
    { pronoun: "voi", form: "state" },
    { pronoun: "loro", form: "stanno" },
  ],
  fare: [
    { pronoun: "io", form: "faccio" },
    { pronoun: "tu", form: "fai" },
    { pronoun: "lui / lei / Lei", form: "fa" },
    { pronoun: "noi", form: "facciamo" },
    { pronoun: "voi", form: "fate" },
    { pronoun: "loro", form: "fanno" },
  ],
  andare: [
    { pronoun: "io", form: "vado" },
    { pronoun: "tu", form: "vai" },
    { pronoun: "lui / lei / Lei", form: "va" },
    { pronoun: "noi", form: "andiamo" },
    { pronoun: "voi", form: "andate" },
    { pronoun: "loro", form: "vanno" },
  ],
  venire: [
    { pronoun: "io", form: "vengo" },
    { pronoun: "tu", form: "vieni" },
    { pronoun: "lui / lei / Lei", form: "viene" },
    { pronoun: "noi", form: "veniamo" },
    { pronoun: "voi", form: "venite" },
    { pronoun: "loro", form: "vengono" },
  ],
  uscire: [
    { pronoun: "io", form: "esco" },
    { pronoun: "tu", form: "esci" },
    { pronoun: "lui / lei / Lei", form: "esce" },
    { pronoun: "noi", form: "usciamo" },
    { pronoun: "voi", form: "uscite" },
    { pronoun: "loro", form: "escono" },
  ],
  volere: [
    { pronoun: "io", form: "voglio" },
    { pronoun: "tu", form: "vuoi" },
    { pronoun: "lui / lei / Lei", form: "vuole" },
    { pronoun: "noi", form: "vogliamo" },
    { pronoun: "voi", form: "volete" },
    { pronoun: "loro", form: "vogliono" },
  ],
  dare: [
    { pronoun: "io", form: "do" },
    { pronoun: "tu", form: "dai" },
    { pronoun: "lui / lei / Lei", form: "dà" },
    { pronoun: "noi", form: "diamo" },
    { pronoun: "voi", form: "date" },
    { pronoun: "loro", form: "danno" },
  ],
};

const presentPronouns = ["io", "tu", "lui / lei / Lei", "noi", "voi", "loro"];
function presentForms(forms: string[]): VerbForm[] {
  return presentPronouns.map((pronoun, index) => ({ pronoun, form: forms[index] }));
}
const regularPresentConjugations: Record<string, VerbForm[]> = {
  parlare: presentForms(["parlo", "parli", "parla", "parliamo", "parlate", "parlano"]),
  scrivere: presentForms(["scrivo", "scrivi", "scrive", "scriviamo", "scrivete", "scrivono"]),
  partire: presentForms(["parto", "parti", "parte", "partiamo", "partite", "partono"]),
  capire: presentForms(["capisco", "capisci", "capisce", "capiamo", "capite", "capiscono"]),
  cercare: presentForms(["cerco", "cerchi", "cerca", "cerchiamo", "cercate", "cercano"]),
  giocare: presentForms(["gioco", "giochi", "gioca", "giochiamo", "giocate", "giocano"]),
  mangiare: presentForms(["mangio", "mangi", "mangia", "mangiamo", "mangiate", "mangiano"]),
};

const associations: { value: Association; label: string }[] = [
  { value: "sea", label: "Море" },
  { value: "house", label: "Итальянский дом" },
  { value: "coffee", label: "Кофе" },
  { value: "sun", label: "Солнечное утро" },
  { value: "travel", label: "Путешествие" },
  { value: "street", label: "Итальянская улочка" },
  { value: "flowers", label: "Окно с цветами" },
  { value: "book", label: "Учёба" },
  { value: "hello", label: "Приветствие" },
  { value: "morning", label: "Утро" },
  { value: "afternoon", label: "День" },
  { value: "evening", label: "Вечер" },
  { value: "night", label: "Ночь" },
  { value: "goodbye", label: "Прощание" },
  { value: "good-day", label: "Хорошего дня" },
  { value: "soon", label: "Скоро" },
  { value: "tomorrow", label: "Завтра" },
  { value: "later", label: "Позже" },
  { value: "next-time", label: "В следующий раз" },
  { value: "see-you", label: "Увидимся" },
  { value: "phone", label: "Созвонимся" },
  { value: "meeting", label: "Знакомство" },
  { value: "name", label: "Имя" },
  { value: "origin", label: "Откуда" },
  { value: "how-are-you", label: "Как дела" },
  { value: "excellent", label: "Отлично" },
  { value: "good", label: "Хорошо" },
  { value: "not-bad", label: "Неплохо" },
  { value: "so-so", label: "Так себе" },
  { value: "bad", label: "Плохо" },
];

const starterCards: Card[] = [
  {
    id: -1,
    topic: "Урок 1. Знакомство",
    kind: "word",
    italian: "buongiorno",
    ipa: "/bwɔnˈdʒorno/",
    translation: "добрый день",
    example: "Buongiorno, come sta?",
    exampleTranslation: "Добрый день, как Вы?",
    usage: "",
    association: "morning",
  },
  {
    id: -2,
    topic: "Урок 1. Знакомство",
    kind: "phrase",
    italian: "Piacere di conoscerti!",
    ipa: "/pjaˈtʃere di koˈnoʃʃerti/",
    translation: "Приятно познакомиться!",
    example: "",
    exampleTranslation: "",
    usage: "Неформальная фраза при знакомстве с одним человеком.",
    association: "meeting",
  },
  {
    id: -3,
    topic: "В кафе",
    kind: "word",
    italian: "caffè",
    ipa: "/kafˈfɛ/",
    translation: "кофе",
    example: "Vorrei un caffè, per favore.",
    exampleTranslation: "Я бы хотел(а) кофе, пожалуйста.",
    usage: "",
    association: "coffee",
  },
];

const emptyForm: Omit<Card, "id"> = {
  topic: "Урок 1. Знакомство",
  kind: "word",
  italian: "",
  ipa: "",
  translation: "",
  example: "",
  exampleTranslation: "",
  usage: "",
  association: "book",
};

const colorValues: Record<string, string> = {
  rosso: "#e53935",
  arancione: "#f57c00",
  giallo: "#f4cf22",
  verde: "#2fa84f",
  azzurro: "#56c9ee",
  blu: "#1859b8",
  viola: "#8139a8",
  rosa: "#f58eb6",
  marrone: "#74452f",
  beige: "#d8c5a4",
  bianco: "#ffffff",
  nero: "#171923",
  grigio: "#8b929b",
  turchese: "#19b9b3",
  oro: "#d5a51f",
  argento: "#aeb7c4",
};

const numberValues: Record<string, string> = {
  zero: "0",
  uno: "1",
  due: "2",
  tre: "3",
  quattro: "4",
  cinque: "5",
  sei: "6",
  sette: "7",
  otto: "8",
  nove: "9",
  dieci: "10",
  undici: "11",
  dodici: "12",
  tredici: "13",
  quattordici: "14",
  quindici: "15",
  sedici: "16",
  diciassette: "17",
  diciotto: "18",
  diciannove: "19",
  venti: "20",
  ventuno: "21",
  ventitré: "23",
  ventiquattro: "24",
  ventotto: "28",
  trenta: "30",
  trentotto: "38",
  quaranta: "40",
  quarantatré: "43",
  cinquanta: "50",
  cinquantasei: "56",
  sessanta: "60",
  settanta: "70",
  ottanta: "80",
  novanta: "90",
  cento: "100",
  centouno: "101",
  centotto: "108",
  duecento: "200",
  novecento: "900",
  mille: "1 000",
  duemila: "2 000",
  mila: "1 000+",
  "un milione": "1 000 000",
  "due milioni": "2 000 000",
  "un miliardo": "1 000 000 000",
  "due miliardi": "2 000 000 000",
};

const calculationValues: Record<string, string> = {
  "venti meno tre fa diciassette": "20 − 3 = 17",
  "nove più sei fa quindici": "9 + 6 = 15",
  "dodici più otto fa venti": "12 + 8 = 20",
  "sette più dodici fa diciannove": "7 + 12 = 19",
  "quattro più uno fa cinque": "4 + 1 = 5",
  "sedici diviso quattro fa quattro": "16 ÷ 4 = 4",
  "sette più quattro fa undici": "7 + 4 = 11",
  "uno più sei fa sette": "1 + 6 = 7",
  "tre meno tre fa zero": "3 − 3 = 0",
  "cinque per due fa dieci": "5 × 2 = 10",
};

const cardImagePaths: Record<string, string> = {
  segretaria: "card-professions/la-segretaria-v2.webp",
  impiegato: "card-professions/l-impiegato-v2.webp",
  insegnante: "card-professions/l-insegnante-v2.webp",
  giornalista: "card-professions/il-giornalista-v2.webp",
  farmacista: "card-professions/il-farmacista-v2.webp",
  tassista: "card-professions/il-tassista-v2.webp",
  commesso: "card-professions/il-commesso-v2.webp",
  infermiere: "card-professions/l-infermiere-v2.webp",
  cameriere: "card-professions/il-cameriere-v2.webp",
  operaio: "card-professions/l-operaio-v2.webp",
  cuoco: "card-professions/il-cuoco-v2.webp",
  chirurgo: "card-professions/il-chirurgo-v2.webp",
  architetto: "card-professions/l-architetto-v2.webp",
  estetista: "card-professions/l-estetista-v2.webp",
  avvocato: "card-professions/l-avvocato-v2.webp",
  attore: "card-professions/l-attore-v2.webp",
  // The existing physician image remains unchanged for both doctor cards.
  dottore: "card-scenes/semantic-045-il-medico-v2.webp",
  meccanico: "card-professions/il-meccanico-v2.webp",
  poliziotto: "card-professions/il-poliziotto-v2.webp",
  traduttore: "card-professions/il-traduttore-v2.webp",
  rappresentante: "card-professions/il-rappresentante-v2.webp",
  casalinga: "card-professions/la-casalinga-v2.webp",
  "fare la spesa": "card-actions/fare-la-spesa.webp",
  "fare una passeggiata": "card-actions/fare-una-passeggiata.webp",
  "fare le vacanze": "card-actions/fare-le-vacanze.webp",
  "fare il bagno": "card-actions/fare-il-bagno.webp",
  "fare la coda": "card-actions/fare-la-coda.webp",
  "fare uno sbaglio": "card-actions/fare-uno-sbaglio.webp",
  "fare colazione": "card-actions/fare-colazione.webp",
  scrivere: "card-actions/scrivere.webp",
  sporco: "card-images/sporco.webp",
  difficile: "card-images/difficile.webp",
  facile: "card-images/facile.webp",
  alto: "card-images/alto.webp",
  basso: "card-images/basso.webp",
  nuovo: "card-images/nuovo.webp",
  vecchio: "card-images/vecchio.webp",
  piccolo: "card-images/piccolo.webp",
  brutto: "card-images/brutto.webp",
  cattivo: "card-images/cattivo.webp",
  pulito: "card-images/pulito.webp",
  però: "card-images/pero.webp",
  anche: "card-images/anche.webp",
  bello: "card-images/bello.webp",
  grande: "card-images/grande.webp",
  buono: "card-images/buono.webp",
  felice: "card-images/felice.webp",
  triste: "card-images/triste.webp",
  guardare: "card-new/guardare.webp",
  ascoltare: "card-new/ascoltare.webp",
  tornare: "card-new/tornare.webp",
  usare: "card-new/usare.webp",
  desiderare: "card-new/desiderare.webp",
  perfezionare: "card-new/perfezionare.webp",
  conversare: "card-new/conversare.webp",
  telefonare: "card-new/telefonare.webp",
  chiamare: "card-new/chiamare.webp",
  visitare: "card-new/visitare.webp",
  lavare: "card-new/lavare.webp",
  cominciare: "card-new/cominciare.webp",
  iniziare: "card-new/iniziare.webp",
  cercare: "card-new/cercare.webp",
  trovare: "card-new/trovare.webp",
  pensare: "card-new/pensare.webp",
  riposare: "card-new/riposare.webp",
  fumare: "card-new/fumare.webp",
  aspettare: "card-new/aspettare.webp",
  insegnare: "card-new/insegnare.webp",
  inviare: "card-new/inviare.webp",
  mandare: "card-new/mandare.webp",
  giocare: "card-new/giocare.webp",
  spiegare: "card-new/spiegare.webp",
  raccontare: "card-new/raccontare.webp",
  "lo scambio": "card-new/lo-scambio.webp",
  "il madrelingua": "card-new/il-madrelingua.webp",
  "la conversazione": "card-new/la-conversazione.webp",
  "la lezione": "card-new/la-lezione.webp",
  "i dolci": "card-new/i-dolci.webp",
  "l'insegnante": "card-new/l-insegnante.webp",
  "sono di origine italiana": "card-new/sono-di-origine-italiana.webp",
  "in cambio di": "card-new/in-cambio-di.webp",
  "il petto": "card-body/il-petto.webp",
  "la pancia": "card-body/la-pancia.webp",
  "il gomito": "card-body/il-gomito.webp",
  "la spalla": "card-scenes/semantic-025-la-spalla.webp",
};

const familyImagePaths: Record<string, string> = {
  "la famiglia": "card-family/la-famiglia.webp",
  "il parente": "card-family/il-parente.webp",
  "il genitore": "card-family/il-genitore.webp",
  "i genitori": "card-family/i-genitori.webp",
  "il marito": "card-family/il-marito.webp",
  "la moglie": "card-family/la-moglie.webp",
  "il figlio": "card-family/il-figlio.webp",
  "la figlia": "card-family/la-figlia.webp",
  "il fratello": "card-family/il-fratello.webp",
  "la sorella": "card-family/la-sorella.webp",
  "il cugino": "card-family/il-cugino.webp",
  "la cugina": "card-family/la-cugina.webp",
  "lo zio": "card-family/lo-zio.webp",
  "la zia": "card-family/la-zia.webp",
  "il nonno": "card-family/il-nonno.webp",
  "la nonna": "card-family/la-nonna.webp",
  "il nipote": "card-family/il-nipote.webp",
  "la nipote": "card-family/la-nipote.webp",
  "il padre": "card-family/il-padre.webp",
  "la madre": "card-family/la-madre.webp",
};

const semanticEmoji: Array<[RegExp, string]> = [
  [/e tu|e lei/i, "👉"],
  [/di dove|dov’è|dove sono/i, "📍"],
  [/come va|come stai|come sta/i, "🤝"],
  [/che cosa fai/i, "🛠️"],
  [/quando parti/i, "🗓️"],
  [/perché studi/i, "🎓"],
  [/chi sei/i, "🪞"],
  [/quanti anni/i, "🎂"],
  [/famiglia|genitor|padre|madre/i, "👨‍👩‍👧"],
  [/marito|moglie/i, "💑"],
  [/figlio|fratello|cugino|nipote|zio|nonno|parente/i, "👨"],
  [/figlia|sorella|cugina|zia|nonna/i, "👩"],
  [/corpo|aspetto/i, "🧍"],
  [/testa/i, "🙂"],
  [/capell/i, "💇"],
  [/orecchio/i, "👂"],
  [/occhio|occhi/i, "👁️"],
  [/naso/i, "👃"],
  [/bocca/i, "👄"],
  [/mano/i, "✋"],
  [/braccio/i, "💪"],
  [/gamba|ginocchio|piede/i, "🦵"],
  [/dito/i, "☝️"],
  [/gola|collo/i, "🧣"],
  [/petto|pancia|gomito|spalla/i, "🧍"],
  [/libro/i, "📖"],
  [/amico|amica/i, "🫂"],
  [/studente|scuola|università|studiare/i, "🎓"],
  [/psicolog|psichiatr/i, "🧠"],
  [/turista|viaggi|vacanza/i, "🧳"],
  [/zaino/i, "🎒"],
  [/casa|camera/i, "🏠"],
  [/sedia/i, "🪑"],
  [/idea/i, "💡"],
  [/gelato/i, "🍨"],
  [/tavolo/i, "🪵"],
  [/lavoro|lavorare/i, "💼"],
  [/orario|ora/i, "🕒"],
  [/ritardo/i, "⏰"],
  [/anticipo/i, "⏱️"],
  [/umore/i, "🙂"],
  [/difficoltà|problema/i, "🧩"],
  [/spettacolo|film/i, "🎬"],
  [/aeroporto/i, "✈️"],
  [/medico/i, "🩺"],
  [/treno/i, "🚆"],
  [/regalo/i, "🎁"],
  [/fiore|rosa/i, "🌹"],
  [/borsa/i, "👜"],
  [/chiave/i, "🔑"],
  [/città|via/i, "🏙️"],
  [/caffè/i, "☕"],
  [/musica/i, "🎵"],
  [/bicicletta|\bbici\b/i, "🚲"],
  [/\bmoto\b|motocicletta/i, "🏍️"],
  [/macchina|automobile|\bauto\b/i, "🚗"],
  [/aiuto/i, "🤝"],
  [/indirizzo/i, "📍"],
  [/numero/i, "🔢"],
  [/radio/i, "📻"],
  [/telefono/i, "📱"],
  [/euro|milione|miliardo/i, "💶"],
  [/persona|uomo/i, "🧍"],
  [/fame|mangiare|affamato/i, "🍝"],
  [/sete|assetato/i, "🥤"],
  [/freddo|raffreddato/i, "🥶"],
  [/caldo/i, "🥵"],
  [/sonno/i, "😴"],
  [/fretta/i, "🏃"],
  [/paura/i, "😨"],
  [/mal di testa/i, "🤕"],
  [/mal di gola/i, "😷"],
  [/malato/i, "🤒"],
  [/felice|contento/i, "😄"],
  [/triste|deluso/i, "😢"],
  [/sporco/i, "🟤"],
  [/pulito/i, "✨"],
  [/difficile/i, "🧩"],
  [/facile/i, "✅"],
  [/alto/i, "🦒"],
  [/basso/i, "🪑"],
  [/nuovo/i, "🆕"],
  [/vecchio/i, "🏚️"],
  [/piccolo/i, "🐭"],
  [/brutto|cattivo/i, "👎"],
  [/però/i, "↔️"],
  [/anche/i, "➕"],
  [/nervoso|preoccupato/i, "😟"],
  [/arrabbiato/i, "😠"],
  [/sorpreso/i, "😮"],
  [/stanco/i, "🥱"],
  [/bello|buono/i, "👍"],
  [/grande/i, "📏"],
  [/luminoso/i, "💡"],
  [/contrario|d’accordo/i, "↔️"],
  [/fidanzato|sposato/i, "💍"],
  [/divorziato/i, "💔"],
  [/celibe|nubile|single/i, "👤"],
  [/libero/i, "🕊️"],
  [/impegnato/i, "📅"],
  [/fiero/i, "🏆"],
  [/pronto/i, "✅"],
  [/capace|bravo|in grado/i, "💪"],
  [/abituato/i, "🔁"],
  [/sicuro/i, "🔒"],
  [/alla moda/i, "👗"],
  [/al verde/i, "👛"],
  [/in forma/i, "🏃"],
  [/chiamarsi|nome/i, "🏷️"],
  [/abitare|vivere/i, "🏠"],
  [/partire|andare|venire|uscire/i, "🚶"],
  [/vedere|vedersi/i, "👀"],
  [/sentire|sentirsi/i, "👂"],
  [/parlare/i, "💬"],
  [/fare/i, "🛠️"],
  [/volere|voglia/i, "💭"],
  [/dare/i, "🤲"],
  [/avere/i, "🤲"],
  [/essere|stare/i, "🧍"],
  [/foto/i, "📷"],
  [/eco/i, "🔊"],
  [/programma/i, "📋"],
  [/clima/i, "🌤️"],
  [/pianeta/i, "🌍"],
  [/poeta/i, "✍️"],
  [/pigiama/i, "🛌"],
  [/stazione/i, "🚉"],
  [/attrice/i, "🎭"],
  [/virtù/i, "💎"],
  [/tema|catalogo/i, "📄"],
  [/bosco/i, "🌲"],
  [/lago|spiaggia/i, "🏖️"],
  [/arancia/i, "🍊"],
  [/camicia/i, "👕"],
  [/valigia/i, "🧳"],
  [/farmacia/i, "⚕️"],
  [/bugia/i, "🤥"],
  [/bar/i, "🍹"],
  [/uovo/i, "🥚"],
  [/lungo/i, "↔️"],
  [/corto/i, "✂️"],
  [/liscio/i, "➖"],
  [/riccio/i, "➰"],
];

const countryFlags: Array<[RegExp, string]> = [
  [/russia|russo|mosca|krasnojarsk/i, "ru"],
  [/italia|italiano|roma|toscana/i, "it"],
  [/francia|francese|parigi/i, "fr"],
  [/germania|tedesco|berlino/i, "de"],
  [/spagna|spagnolo|madrid/i, "es"],
  [/inghilterra|inglese|londra/i, "gb"],
  [/svezia|svedese|stoccolma/i, "se"],
  [/svizzera|svizzero|berna/i, "ch"],
  [/grecia|greco|atene/i, "gr"],
  [/polonia|polacco|varsavia/i, "pl"],
  [/brasile|brasiliano|brasilia/i, "br"],
  [/stati uniti|americano|statunitense|washington/i, "us"],
  [/cina|cinese|pechino/i, "cn"],
  [/perù|peruviano|lima/i, "pe"],
  [/tunisia|tunisino|tunisi/i, "tn"],
  [/turchia|turco|ankara/i, "tr"],
  [/argentina|argentino|buenos aires/i, "ar"],
  [/belgio|belga|bruxelles/i, "be"],
];

const cityLandmarks: Array<[RegExp, string]> = [
  [/krasnojarsk/i, "krasnoyarsk"],
  [/mosca/i, "moscow"],
  [/roma/i, "rome"],
  [/parigi/i, "paris"],
  [/berlino/i, "berlin"],
  [/madrid/i, "madrid"],
  [/londra/i, "london"],
  [/stoccolma/i, "stockholm"],
  [/berna/i, "bern"],
  [/atene/i, "athens"],
  [/varsavia/i, "warsaw"],
  [/brasilia/i, "brasilia"],
  [/washington/i, "washington"],
  [/pechino/i, "beijing"],
  [/lima/i, "lima"],
  [/tunisi/i, "tunis"],
  [/ankara/i, "ankara"],
  [/buenos aires/i, "buenos-aires"],
  [/bruxelles/i, "brussels"],
];

const associationEmoji: Record<Association, string> = {
  sea: "🌊", house: "🏠", coffee: "☕", sun: "☀️", travel: "🧳",
  street: "🏘️", flowers: "🌸", book: "📚", hello: "👋", morning: "🌅",
  afternoon: "🌤️", evening: "🌇", night: "🌙", goodbye: "👋", "good-day": "☀️",
  soon: "⏳", tomorrow: "📅", later: "🕒", "next-time": "🔜", "see-you": "👀",
  phone: "📱", meeting: "🤝", name: "🏷️", origin: "📍", "how-are-you": "🙂",
  excellent: "🤩", good: "😊", "not-bad": "🙂", "so-so": "😐", bad: "🙁",
};

function spokenCardText(value: string) {
  if (value.includes("=")) return value.split("=").at(-1)?.trim() || value;
  return value
    .replace(/\s*\+\s*(nome|professione|nazionalità|aggettivo|città|paese|infinito|oggetto|numero|anni)/gi, "")
    .trim();
}

function cleanItalian(value: string) {
  return value
    .toLocaleLowerCase("it")
    .replace(/[!?.…]/g, "")
    .replace(/^(il|lo|la|l’|i|gli|le)\s+/i, "")
    .trim();
}

function Visual({
  type,
  small = false,
  card,
}: {
  type: Association;
  small?: boolean;
  card?: Partial<Card>;
}) {
  const fullItalian = (card?.italian || "")
    .toLocaleLowerCase("it")
    .replace(/[!?.…]/g, "")
    .trim();
  const italian = cleanItalian(card?.italian || "");
  const topic = card?.topic || "";
  const familyImagePath = topic.includes("Семья")
    ? familyImagePaths[fullItalian]
    : undefined;
  if (familyImagePath)
    return (
      <figure
        className={`visual cardPhotoAssociation ${small ? "visualSmall" : ""}`}
        aria-label={card?.translation || italian}
      >
        <img
          src={`${import.meta.env.BASE_URL}${familyImagePath}`}
          alt=""
          loading={small ? "lazy" : "eager"}
        />
      </figure>
    );
  const cardImagePath = cardImagePaths[italian];
  if (cardImagePath)
    return (
      <figure
        className={`visual cardPhotoAssociation ${small ? "visualSmall" : ""}`}
        aria-label={card?.translation || italian}
      >
        <img
          src={`${import.meta.env.BASE_URL}${cardImagePath}`}
          alt=""
          loading={small ? "lazy" : "eager"}
        />
      </figure>
    );
  const exactColor = colorValues[italian];
  if (exactColor) {
    return (
      <figure
        className={`visual semanticVisual colorAssociation ${small ? "visualSmall" : ""}`}
        aria-label={`Цвет ${card?.translation || italian}`}
      >
        <span className="paintDrop" style={{ backgroundColor: exactColor }} />
        <span className="paintBrush">🖌️</span>
      </figure>
    );
  }
  const colorInPhrase = Object.entries(colorValues).find(([name]) => {
    const root = name.replace(/[eo]$/, "");
    return (
      topic.includes("Глаза и волосы") &&
      new RegExp(`\\b${root}`, "i").test(italian)
    );
  })?.[1];
  if (colorInPhrase) {
    return (
      <figure
        className={`visual semanticVisual colorAssociation ${small ? "visualSmall" : ""}`}
        aria-label={card?.translation || italian}
      >
        <span className="paintDrop" style={{ backgroundColor: colorInPhrase }} />
        <span className="paintBrush">👁️</span>
      </figure>
    );
  }
  const number = numberValues[italian];
  if (number)
    return (
      <figure
        className={`visual semanticVisual numberAssociation ${small ? "visualSmall" : ""}`}
        aria-label={`Число ${number}`}
      >
        <strong>{number}</strong>
      </figure>
    );
  const calculation = calculationValues[italian];
  if (calculation)
    return (
      <figure
        className={`visual semanticVisual numberAssociation ${small ? "visualSmall" : ""}`}
        aria-label={`Пример ${calculation}`}
      >
        <strong>{calculation}</strong>
      </figure>
    );
  const city = cityLandmarks.find(([pattern]) =>
    pattern.test(card?.italian || ""),
  )?.[1];
  const cityImagePath = city
    ? generatedScenePaths.city[city as keyof typeof generatedScenePaths.city]
    : undefined;
  if (cityImagePath && topic.includes("Города"))
    return (
      <figure
        className={`visual cardPhotoAssociation ${small ? "visualSmall" : ""}`}
        aria-label={`Символ города ${card?.italian || city}`}
      >
        <img
          src={`${import.meta.env.BASE_URL}${cityImagePath}`}
          alt=""
          loading={small ? "lazy" : "eager"}
        />
      </figure>
    );
  const flag = countryFlags.find(([pattern]) =>
    pattern.test(card?.italian || ""),
  )?.[1];
  if (flag && /(Страны|Национальности)/.test(topic))
    return (
      <figure
        className={`visual semanticVisual flagAssociation ${small ? "visualSmall" : ""}`}
        aria-label={card?.translation || italian}
      >
        <span className={`fi fi-${flag}`} aria-hidden="true" />
      </figure>
    );
  if (
    /артикл|предлог|Местоимения|Вопросительные|Глагол essere|Глагол avere/.test(
      topic,
    )
  ) {
    return (
      <figure
        className={`visual semanticVisual grammarAssociation ${small ? "visualSmall" : ""}`}
        aria-label={card?.translation || italian}
      >
        <span>●</span>
        <b>{card?.italian}</b>
        <span>●</span>
      </figure>
    );
  }
  const semanticSource = `${card?.italian || ""} ${card?.translation || ""}`;
  const exactCardImagePath = cardImagePaths[italian.toLocaleLowerCase("it-IT")];
  if (exactCardImagePath)
    return (
      <figure
        className={`visual cardPhotoAssociation ${small ? "visualSmall" : ""}`}
        aria-label={card?.translation || italian}
      >
        <img
          src={`${import.meta.env.BASE_URL}${exactCardImagePath}`}
          alt=""
          loading={small ? "lazy" : "eager"}
        />
      </figure>
    );
  const semanticIndex = semanticEmoji.findIndex(([pattern]) =>
    pattern.test(semanticSource),
  );
  const semanticImagePath =
    semanticIndex >= 0
      ? generatedScenePaths.semantic[
          String(semanticIndex) as keyof typeof generatedScenePaths.semantic
        ]
      : undefined;
  if (semanticImagePath)
    return (
      <figure
        className={`visual cardPhotoAssociation ${small ? "visualSmall" : ""}`}
        aria-label={card?.translation || italian}
      >
        <img
          src={`${import.meta.env.BASE_URL}${semanticImagePath}`}
          alt=""
          loading={small ? "lazy" : "eager"}
        />
      </figure>
    );
  const associationImagePath =
    generatedScenePaths.association[
      type as keyof typeof generatedScenePaths.association
    ];
  if (associationImagePath)
    return (
      <figure
        className={`visual cardPhotoAssociation ${small ? "visualSmall" : ""}`}
        aria-label={card?.translation || italian}
      >
        <img
          src={`${import.meta.env.BASE_URL}${associationImagePath}`}
          alt=""
          loading={small ? "lazy" : "eager"}
        />
      </figure>
    );
  const label = associations.find((a) => a.value === type)?.label || "Ассоциация";
  return (
    <figure className={`visual semanticVisual emojiAssociation ${small ? "visualSmall" : ""}`} aria-label={label}>
      <span>{associationEmoji[type]}</span>
    </figure>
  );
}

function cardWord(count: number) {
  const mod100 = count % 100,
    mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return "карточек";
  if (mod10 === 1) return "карточка";
  if (mod10 >= 2 && mod10 <= 4) return "карточки";
  return "карточек";
}

function parseBatchItems(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function FlashcardsApp({
  account,
}: {
  account?: {
    email: string;
    isOwner: boolean;
    onSignOut: () => void | Promise<unknown>;
  };
} = {}) {
  const isOwner = account?.isOwner === true;
  const [tab, setTab] = useState<Tab>("study");
  const [cards, setCards] = useState<Card[]>(starterCards);
  const [speakingText, setSpeakingText] = useState("");
  const [savedTopics, setSavedTopics] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<number, Status>>({});
  const [topic, setTopic] = useState(ALL_TOPICS);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [studyTopics, setStudyTopics] = useState<string[]>([]);
  const [studyAmount, setStudyAmount] = useState("20");
  const [includeKnown, setIncludeKnown] = useState(false);
  const [studySession, setStudySession] = useState<Card[]>([]);
  const [studySessionIndex, setStudySessionIndex] = useState(0);
  const [studySessionActive, setStudySessionActive] = useState(false);
  const [studyMessage, setStudyMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [offlineDemo, setOfflineDemo] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [addMode, setAddMode] = useState<AddMode>("batch");
  const [batchWords, setBatchWords] = useState("");
  const [batchResult, setBatchResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSucceeded, setImportSucceeded] = useState(false);
  const [kindFilter, setKindFilter] = useState<"all" | CardKind>("all");
  const [libraryTopic, setLibraryTopic] = useState(ALL_TOPICS);
  const [renamingTopic, setRenamingTopic] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [libraryMessage, setLibraryMessage] = useState("");

  function speakItalian(text: string) {
    const phrase = text.trim();
    if (!phrase || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(phrase);
    const italianVoices = window.speechSynthesis
      .getVoices()
      .filter((voice) => voice.lang.toLowerCase().startsWith("it"));
    const preferredVoice =
      italianVoices.find((voice) => voice.lang.toLowerCase() === "it-it" && voice.localService) ||
      italianVoices.find((voice) => voice.lang.toLowerCase() === "it-it") ||
      italianVoices[0];

    utterance.lang = "it-IT";
    utterance.rate = 0.92;
    utterance.pitch = 1;
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.onstart = () => setSpeakingText(phrase);
    utterance.onend = () => setSpeakingText("");
    utterance.onerror = () => setSpeakingText("");
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    async function loadCompletePack() {
      let data: {
        cards: Card[];
        topics: string[];
        progress: Array<{ cardId: number; status: Status }>;
        packStatus?: { remaining: number };
      } | null = null;
      for (let attempt = 0; attempt < 14; attempt += 1) {
        const response = await fetch("/api/data", { cache: "no-store" });
        if (!response.ok) throw new Error("data");
        data = await response.json();
        if (!data.packStatus?.remaining) break;
      }
      if (!data) throw new Error("data");
      setCards(data.cards.length ? data.cards : starterCards);
      setSavedTopics(data.topics || []);
      setProgress(
        Object.fromEntries(
          data.progress.map((item) => [item.cardId, item.status]),
        ),
      );
    }
    loadCompletePack()
      .catch(() => setOfflineDemo(true))
      .finally(() => setLoading(false));
  }, []);

  const rawTopics = useMemo(
    () => [
      ...Array.from(
        new Set([...savedTopics, ...cards.map((card) => card.topic)]),
      ),
    ],
    [cards, savedTopics],
  );
  const topics = useMemo(
    () => [
      ALL_TOPICS,
      ...(cards.some(isNewCard) ? [NEW_TOPIC] : []),
      ...Array.from(new Set(rawTopics.map(groupedTopic))),
    ],
    [cards, rawTopics],
  );
  const selectedCards = cards.filter(
    (card) => cardMatchesTopic(card, topic),
  );
  const repeatOnly = tab === "repeat";
  const repeatQueue = selectedCards.filter(
    (card) => progress[card.id] === "repeat",
  );
  const current = repeatOnly
    ? repeatQueue.length
      ? repeatQueue[index % repeatQueue.length]
      : null
    : studySessionActive
      ? studySession[studySessionIndex] || null
      : null;
  const currentConjugation = current
    ? irregularPresentConjugations[current.italian.trim().toLocaleLowerCase("it")] ||
      regularPresentConjugations[current.italian.trim().toLocaleLowerCase("it")]
    : undefined;
  const knownCount = selectedCards.filter(
    (card) => progress[card.id] === "known",
  ).length;
  const hardCount = cards.filter(
    (card) => progress[card.id] === "repeat",
  ).length;
  const libraryCards = cards
    .filter((card) => kindFilter === "all" || card.kind === kindFilter)
    .filter(
      (card) => cardMatchesTopic(card, libraryTopic),
    )
    .sort(
      (a, b) =>
        a.topic.localeCompare(b.topic, "ru") ||
        a.italian.localeCompare(b.italian, "it"),
    );

  async function mark(status: Status) {
    if (!current) return;
    setProgress((old) => ({ ...old, [current.id]: status }));
    if (current.id > 0 && !offlineDemo)
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: current.id, status }),
      });
    setRevealed(false);
    if (repeatOnly)
      setIndex((value) =>
        repeatQueue.length > 1 ? (value + 1) % repeatQueue.length : 0,
      );
    else setStudySessionIndex((value) => value + 1);
  }

  function toggleStudyTopic(item: string) {
    setStudyTopics((old) =>
      old.includes(item)
        ? old.filter((value) => value !== item)
        : [...old, item],
    );
    setStudyMessage("");
  }

  function startStudySession() {
    const amount = Number.parseInt(studyAmount, 10);
    if (!studyTopics.length) {
      setStudyMessage("Выбери хотя бы один раздел.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 1) {
      setStudyMessage("Укажи количество карточек — любое число от 1.");
      return;
    }
    const available = cards.filter(
      (card) =>
        studyTopics.some((item) => cardMatchesTopic(card, item)) &&
        (includeKnown || progress[card.id] !== "known"),
    );
    if (!available.length) {
      setStudyMessage(
        includeKnown
          ? "В выбранных разделах пока нет карточек."
          : "Все карточки в выбранных разделах уже изучены. Включи изученные или выбери другие разделы.",
      );
      return;
    }
    const shuffled = [...available];
    for (let position = shuffled.length - 1; position > 0; position -= 1) {
      const randomPosition = Math.floor(Math.random() * (position + 1));
      [shuffled[position], shuffled[randomPosition]] = [
        shuffled[randomPosition],
        shuffled[position],
      ];
    }
    const session = shuffled.slice(0, amount);
    setStudySession(session);
    setStudySessionIndex(0);
    setStudySessionActive(true);
    setRevealed(false);
    setStudyMessage(
      session.length < amount
        ? `В подходящих разделах нашлось ${session.length} карточек — добавила в занятие все.`
        : "",
    );
  }

  async function resetProgress(scope = false) {
    const ids =
      scope && topic !== ALL_TOPICS
        ? selectedCards.map((card) => card.id)
        : undefined;
    setProgress((old) =>
      ids
        ? Object.fromEntries(
            Object.entries(old).filter(([id]) => !ids.includes(Number(id))),
          )
        : {},
    );
    setIndex(0);
    setRevealed(false);
    if (!offlineDemo)
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids ? { resetIds: ids } : { reset: true }),
      });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isOwner) return;
    setMessage("");
    if (!form.italian.trim() || !form.ipa.trim() || !form.translation.trim()) {
      setMessage("Заполни итальянский текст, IPA и перевод");
      return;
    }
    if (!form.example.trim() || !form.exampleTranslation.trim()) {
      setMessage("Добавь жизненный пример на итальянском и его перевод");
      return;
    }
    if (/[→⇒⇢]|->/.test(form.italian)) {
      setMessage(
        "В одной карточке должно быть одно слово или одно цельное выражение — без стрелок и вариантов.",
      );
      return;
    }
    if (offlineDemo) {
      setMessage("Сохранение включится в опубликованной версии сайта");
      return;
    }
    const response = await fetch("/api/data", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, id: editingId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Не удалось сохранить");
      return;
    }
    setCards((old) =>
      editingId
        ? old.map((card) => (card.id === editingId ? data.card : card))
        : [data.card, ...old.filter((card) => card.id > 0)],
    );
    if (!savedTopics.includes(form.topic))
      setSavedTopics((old) => [...old, form.topic]);
    setForm({ ...emptyForm, topic: form.topic });
    setEditingId(null);
    setMessage("");
    setTab("library");
  }

  function edit(card: Card) {
    if (!isOwner) return;
    setForm({ ...card });
    setEditingId(card.id);
    setAddMode("manual");
    setTab("add");
    setMessage("");
  }

  async function remove(card: Card) {
    if (!isOwner) return;
    if (!confirm(`Удалить «${card.italian}»?`)) return;
    setCards((old) => old.filter((item) => item.id !== card.id));
    if (card.id > 0 && !offlineDemo)
      await fetch(`/api/data?id=${card.id}`, { method: "DELETE" });
  }

  async function addTopic() {
    if (!isOwner) return;
    const title = prompt("Название нового раздела", "Урок ");
    if (!title?.trim() || rawTopics.includes(title.trim())) return;
    if (!offlineDemo)
      await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
    setSavedTopics((old) => [...old, title.trim()]);
    setForm((old) => ({ ...old, topic: title.trim() }));
  }

  async function moveCard(card: Card, nextTopic: string) {
    if (!isOwner) return;
    if (!nextTopic || nextTopic === card.topic) return;
    const updated = { ...card, topic: nextTopic };
    setCards((old) =>
      old.map((item) => (item.id === card.id ? updated : item)),
    );
    if (offlineDemo || card.id < 1) return;
    const response = await fetch("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (!response.ok) {
      setCards((old) => old.map((item) => (item.id === card.id ? card : item)));
      setMessage("Не удалось перенести карточку. Попробуй ещё раз.");
    }
  }

  async function renameTopic(oldTitle: string) {
    if (!isOwner) return;
    const newTitle = renameValue.trim();
    if (!newTitle || newTitle === oldTitle) {
      setRenamingTopic(null);
      return;
    }
    const response = offlineDemo
      ? null
      : await fetch("/api/topics", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldTitle, newTitle }),
        });
    if (response && !response.ok) return;
    setCards((old) =>
      old.map((card) =>
        card.topic === oldTitle ? { ...card, topic: newTitle } : card,
      ),
    );
    setSavedTopics((old) =>
      Array.from(
        new Set(old.map((item) => (item === oldTitle ? newTitle : item))),
      ),
    );
    if (topic === oldTitle) setTopic(newTitle);
    if (libraryTopic === oldTitle) setLibraryTopic(newTitle);
    setRenamingTopic(null);
  }

  function openLibrary(selectedTopic: string) {
    setLibraryTopic(selectedTopic);
    setKindFilter("all");
    setExpandedCardId(null);
    setSelectedIds([]);
    setLibraryMessage("");
    setTab("library");
  }

  async function refreshCards() {
    const data = await fetch("/api/data").then((response) => response.json());
    setCards(data.cards);
    setSavedTopics(data.topics || []);
  }

  function toggleSelected(id: number) {
    setSelectedIds((old) =>
      old.includes(id) ? old.filter((item) => item !== id) : [...old, id],
    );
  }

  async function deleteSelected() {
    if (!isOwner) return;
    const ids = selectedIds.filter((id) => id > 0);
    if (!ids.length || !confirm(`Удалить выбранные карточки: ${ids.length}?`))
      return;
    const response = await fetch("/api/data", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) {
      setLibraryMessage("Не удалось удалить карточки.");
      return;
    }
    setCards((old) => old.filter((card) => !ids.includes(card.id)));
    setSelectedIds([]);
    setLibraryMessage(`Удалено карточек: ${ids.length}.`);
  }

  async function removeDuplicates() {
    if (!isOwner) return;
    const scope =
      libraryTopic === ALL_TOPICS
        ? "во всём словаре"
        : `в разделе «${libraryTopic}»`;
    if (
      !confirm(
        `Удалить повторяющиеся карточки ${scope}? Останется по одной карточке с каждым итальянским словом или фразой.`,
      )
    )
      return;
    const response = await fetch("/api/data", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deduplicate: true,
        topic: rawTopics.includes(libraryTopic) ? libraryTopic : "",
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setLibraryMessage(data.error || "Не удалось удалить повторы.");
      return;
    }
    await refreshCards();
    setSelectedIds([]);
    setLibraryMessage(
      data.removed
        ? `Готово. Удалено повторов: ${data.removed}.`
        : "Повторов не найдено.",
    );
  }

  function makePrompt() {
    const list = parseBatchItems(batchWords);
    return `Подготовь учебные карточки по итальянскому языку для импорта в мой сайт.
Раздел: ${form.topic}.
Список (${list.length} элементов), каждый элемент записан отдельной нумерованной строкой:
${list.map((item, itemIndex) => `${itemIndex + 1}. ${item}`).join("\n")}

Обязательные правила:
1. Количество объектов в ответе должно быть ровно ${list.length}: по одному для каждого элемента, в исходном порядке. Ничего не пропускай, не объединяй и не добавляй от себя.
2. kind="word" ставь для отдельного слова, включая глагол в инфинитиве. kind="phrase" ставь для выражения или готового предложения из нескольких слов.
2.1. В поле italian каждой карточки указывай только одно слово или одно цельное выражение. Не объединяй единственное и множественное число, варианты или формы стрелками (например, нельзя: la bugia → le bugie).
3. Для КАЖДОЙ карточки — и word, и phrase — поля example и exampleTranslation обязательны и не могут быть пустыми. example — естественное итальянское предложение уровня A1–A2 длиной примерно 4–10 слов, показывающее слово или выражение в понятном бытовом контексте. Для глагола допустима естественная спрягаемая форма. exampleTranslation — точный русский перевод всего предложения. usage оставь пустым.
3.1. Пример должен быть фразой, которую реально можно сказать в обычной жизни. Запрещены метаязыковые шаблоны вроде «Oggi uso la parola…», «Oggi studio il verbo…», «Questa parola è…», «Vedo…» без полезного контекста и «Il numero è…».
3.2. Используй полную общеупотребительную словарную форму, если сокращение может быть непонятно начинающему: например, la bicicletta, а не la bici.
4. Для phrase не пиши технические пояснения вроде «готовая учебная модель». Покажи выражение в нормальной жизненной фразе и переведи её.
5. ipa обязательна для каждого элемента: только нормативная итальянская IPA в косых чертах, без русской транскрипции.
6. translation обязательна: точный естественный русский перевод.
7. association выбери строго из: sea, house, coffee, sun, travel, street, flowers, book, hello, morning, afternoon, evening, night, goodbye, good-day, soon, tomorrow, later, next-time, see-you, phone, meeting, name, origin, how-are-you, excellent, good, not-bad, so-so, bad. Она обязана буквально соответствовать значению: male=bad, così così=so-so, benissimo=excellent, приветствие=hello, прощание=goodbye. coffee разрешена только для caffè, espresso, cappuccino и непосредственно связанных с кофе слов. Не создавай случайную ассоциацию. Если среди вариантов нет точного смысла, используй нейтральную book.

Верни ТОЛЬКО JSON-массив без Markdown и комментариев. Поля каждого объекта: topic, kind, italian, ipa, translation, example, exampleTranslation, usage, association. Все поля обязательны; ненужные поля заполни пустой строкой. topic везде: ${form.topic}.`;
  }

  async function copyPrompt() {
    if (!batchWords.trim()) {
      setMessage("Сначала вставь список итальянских слов или фраз");
      return;
    }
    await navigator.clipboard.writeText(makePrompt());
    setCopied(true);
    setMessage("");
    setTimeout(() => setCopied(false), 2000);
  }

  async function importBatch() {
    if (importing) return;
    setMessage("");
    setImportSucceeded(false);
    if (offlineDemo) {
      setMessage("Импорт включится в опубликованной версии сайта");
      return;
    }
    if (!batchResult.trim()) {
      setMessage("Сначала вставь ответ ChatGPT во второе поле");
      return;
    }
    setImporting(true);
    try {
      const cleaned = batchResult
        .trim()
        .replace(/^\`\`\`(?:json)?\s*/i, "")
        .replace(/\s*\`\`\`$/, "");
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed) || !parsed.length) throw new Error("format");
      const expectedCount = parseBatchItems(batchWords).length;
      if (parsed.length !== expectedCount)
        throw new Error(
          `ChatGPT вернул ${parsed.length} карточек вместо ${expectedCount}. Попроси его обработать все элементы списка.`,
        );
      const combinedCard = parsed.find((card) =>
        /[→⇒⇢]|->/.test(String(card?.italian || "")),
      );
      if (combinedCard)
        throw new Error(
          `В карточке «${combinedCard.italian}» объединено несколько форм. Оставь одно слово или одно цельное выражение без стрелок.`,
        );
      const incompleteExample = parsed.find(
        (card) =>
          !String(card?.example || "").trim() ||
          !String(card?.exampleTranslation || "").trim(),
      );
      if (incompleteExample)
        throw new Error(
          `У карточки «${incompleteExample.italian || "без названия"}» нет жизненного примера или его перевода. Попроси ChatGPT дополнить ответ.`,
        );
      const genericExample = parsed.find(
        (card) =>
          card?.kind === "word" &&
          /(Oggi (uso la parola|studio il verbo)|Questa parola è|Il numero è)/i.test(
            String(card.example || ""),
          ),
      );
      if (genericExample)
        throw new Error(
          `У слова «${genericExample.italian || "без названия"}» шаблонный пример. Нужна естественная бытовая фраза с этим словом.`,
        );
      const cardsForTopic = parsed.map((card) => ({
        ...card,
        topic: form.topic,
      }));
      const response = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: cardsForTopic }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "save");
      const refreshed = await fetch("/api/data").then((result) =>
        result.json(),
      );
      setCards(refreshed.cards);
      setSavedTopics(refreshed.topics || []);
      setBatchWords("");
      setBatchResult("");
      setImportSucceeded(true);
      setMessage(
        data.added > 0
          ? `Готово! Добавлено карточек: ${data.added}. Теперь открой «Словарь» или «Учить».`
          : "Эти карточки уже были добавлены раньше. Повторно они не сохранены.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error && error.message !== "format"
          ? error.message
          : "Не удалось прочитать результат. Проверь, что скопирован весь ответ — от [ до ].",
      );
    } finally {
      setImporting(false);
    }
  }

  function openStudy(selectedTopic: string, repeat = false) {
    setTopic(selectedTopic);
    setIndex(0);
    setRevealed(false);
    if (!repeat) {
      setStudyTopics(
        selectedTopic === ALL_TOPICS ? topics.slice(1) : [selectedTopic],
      );
      setStudySessionActive(false);
      setStudyMessage("");
    }
    setTab(repeat ? "repeat" : "study");
  }

  return (
    <main
      className={`appShell warmTheme ${
        tab === "study" && !studySessionActive ? "studySetupTheme" : ""
      }`}
    >
      <header className="topbar">
        <div className="brandMark">
          <span>ciao</span>
        </div>
        <div>
          <p className="eyebrow">IL MIO VIAGGIO ITALIANO</p>
          <h1>Le mie parole</h1>
        </div>
        {account && (
          <div className="accountBox">
            <span title={account.email}>{account.email}</span>
            <button type="button" onClick={() => void account.onSignOut()}>
              Выйти
            </button>
          </div>
        )}
        <div className="streak" aria-label="Изучено карточек">
          <span>✦</span>
          <b>{cards.filter((c) => progress[c.id] === "known").length}</b>
        </div>
      </header>
      <section className="content">
        {(tab === "study" || tab === "repeat") && StudyView()}
        {tab === "sections" && SectionsView()}
        {tab === "library" && LibraryView()}
        {tab === "add" && AddView()}
        {tab === "progress" && ProgressView()}
      </section>
      <nav className="bottomNav" aria-label="Основное меню">
        <NavButton name="study" icon="cards" label="Учить" />
        <NavButton
          name="repeat"
          icon="wave"
          label="Повторить"
          badge={hardCount}
        />
        <NavButton name="sections" icon="map" label="Разделы" />
        <NavButton name="library" icon="book" label="Словарь" />
        <NavButton name="progress" icon="route" label="Прогресс" />
      </nav>
    </main>
  );

  function NavButton({
    name,
    icon,
    label,
    badge,
  }: {
    name: Tab;
    icon: string;
    label: string;
    badge?: number;
  }) {
    return (
      <button
        className={tab === name ? "active" : ""}
        onClick={() => {
          setTab(name);
          setIndex(0);
          setRevealed(false);
          if (name === "study") {
            setStudySessionActive(false);
            setStudyMessage("");
          }
        }}
      >
        <span className={`navIcon icon-${icon}`} />
        {label}
        {badge ? <i className="navBadge">{badge}</i> : null}
      </button>
    );
  }

  function StudyView() {
    if (!repeatOnly && !studySessionActive)
      return (
        <section className="studySetup">
          <p className="sectionLabel">Моё занятие</p>
          <h2>Соберите занятие</h2>
          <p className="setupIntro">
            Выберите один или несколько разделов и количество карточек.
          </p>
          <div className="setupBlock">
            <div className="setupBlockHead">
              <b>Разделы</b>
              <button
                onClick={() =>
                  setStudyTopics(
                    studyTopics.length === topics.length - 1
                      ? []
                      : topics.slice(1),
                  )
                }
              >
                {studyTopics.length === topics.length - 1 && topics.length > 1
                  ? "Снять все"
                  : "Выбрать все"}
              </button>
            </div>
            <div className="topicChecks">
              {topics.slice(1).map((item, topicIndex) => {
                const topicCards = cards.filter((card) =>
                  cardMatchesTopic(card, item),
                );
                const count = topicCards.length;
                const previewCard = topicCards[0];
                const scene = previewCard?.association || "book";
                return (
                  <label
                    className={`topicCheck topicTone${(topicIndex % 5) + 1}`}
                    key={item}
                  >
                    <input
                      type="checkbox"
                      checked={studyTopics.includes(item)}
                      onChange={() => toggleStudyTopic(item)}
                    />
                    <span className="topicCheckbox">✓</span>
                    <Visual type={scene} card={previewCard} small />
                    <b>
                      {item}
                      <small>
                        {count} {cardWord(count)}
                      </small>
                    </b>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="setupBlock setupOptions">
            <label>
              Сколько карточек
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={studyAmount}
                onChange={(e) => {
                  setStudyAmount(e.target.value);
                  setStudyMessage("");
                }}
                placeholder="Например, 60"
              />
              <span className="amountPresets" aria-label="Быстрый выбор количества">
                {[10, 20, 30, 40, 60].map((amount) => (
                  <button
                    type="button"
                    className={studyAmount === String(amount) ? "active" : ""}
                    key={amount}
                    onClick={() => {
                      setStudyAmount(String(amount));
                      setStudyMessage("");
                    }}
                  >
                    {amount}
                  </button>
                ))}
              </span>
            </label>
            <label className="includeKnown">
              <input
                type="checkbox"
                checked={includeKnown}
                onChange={(e) => {
                  setIncludeKnown(e.target.checked);
                  setStudyMessage("");
                }}
              />
              <span>✓</span>
              <b>
                Включать уже изученные
                <small>
                  {includeKnown
                    ? "В случайную подборку войдут все карточки"
                    : "Сейчас попадут только ещё не изученные"}
                </small>
              </b>
            </label>
          </div>
          {studyMessage && (
            <p className="setupMessage" role="status">
              {studyMessage}
            </p>
          )}
          <button className="startStudy" onClick={startStudySession}>
            Собрать и начать занятие
          </button>
        </section>
      );
    return (
      <>
        <div className="studyHead">
          <div>
            <p className="sectionLabel">
              {repeatOnly ? "Сложные карточки" : "Сегодня учим"}
            </p>
            <h2>{repeatOnly ? topic : `${studySession.length} карточек`}</h2>
          </div>
          {repeatOnly ? (
            <select
              aria-label="Выбрать раздел"
              value={topic}
              onChange={(e) => openStudy(e.target.value, true)}
            >
              {topics.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          ) : (
            <button
              className="changeSession"
              onClick={() => {
                setStudySessionActive(false);
                setStudyMessage("");
              }}
            >
              Изменить
            </button>
          )}
        </div>
        {!repeatOnly && (
          <>
            <p className="sessionTopics">{studyTopics.join(" · ")}</p>
            {studyMessage && <p className="sessionNotice">{studyMessage}</p>}
          </>
        )}
        <div className="progressRow">
          {repeatOnly ? (
            <>
              <span>{knownCount} уже знаю</span>
              <span>{selectedCards.length} всего</span>
            </>
          ) : (
            <>
              <span>
                Карточка {Math.min(studySessionIndex + 1, studySession.length)}{" "}
                из {studySession.length}
              </span>
              <span>
                Осталось {Math.max(studySession.length - studySessionIndex, 0)}
              </span>
            </>
          )}
        </div>
        <div className="journeyTrack">
          <i
            style={{
              width: `${repeatOnly ? (selectedCards.length ? (knownCount / selectedCards.length) * 100 : 0) : studySession.length ? (studySessionIndex / studySession.length) * 100 : 0}%`,
            }}
          />
          <span
            style={{
              left: `calc(${repeatOnly ? (selectedCards.length ? (knownCount / selectedCards.length) * 100 : 0) : studySession.length ? (studySessionIndex / studySession.length) * 100 : 0}% - 13px)`,
            }}
          >
            ⌁
          </span>
        </div>
        {loading ? (
          <div className="emptyCard">Загружаю твоё путешествие…</div>
        ) : current ? (
          <>
            <div
              className={`flashcard ${revealed ? "revealed" : ""} ${currentConjugation ? "hasConjugation" : ""}`}
              onClick={() => setRevealed(!revealed)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setRevealed(!revealed);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Перевернуть карточку"
            >
              <button
                type="button"
                className={`cardSound ${speakingText === spokenCardText(current.italian) ? "speaking" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  speakItalian(spokenCardText(current.italian));
                }}
                aria-label={`Прослушать: ${current.italian}`}
                title="Прослушать слово по-итальянски"
              >
                <span aria-hidden="true">🔊</span>
              </button>
              <span className="topicPill">
                {current.kind === "word" ? "СЛОВО" : "ФРАЗА"} · {groupedTopic(current.topic)}
              </span>
              {!(revealed && currentConjugation) && (
                <Visual type={current.association} card={current} />
              )}
              <span className="italian">{current.italian}</span>
              <span className="ipa">{current.ipa}</span>
              {!revealed ? (
                <span className="tapHint">
                  Коснись карточки, чтобы перевернуть
                </span>
              ) : (
                <span className="answer">
                  <b>{current.translation}</b>
                  {currentConjugation ? (
                    <span
                      className="conjugationBlock"
                      aria-label={`Спряжение глагола ${current.italian} в настоящем времени`}
                    >
                      <strong>Presente indicativo</strong>
                      <div className="conjugationRows">
                        {currentConjugation.map(({ pronoun, form }) => (
                          <span className="conjugationRow" key={pronoun}>
                            <i>{pronoun}</i>
                            <b>{form}</b>
                          </span>
                        ))}
                      </div>
                    </span>
                  ) : null}
                  {current.example ? (
                    <small>
                      <span className="exampleItalian">
                        {current.example}
                        <button
                          type="button"
                          className={`exampleSound ${speakingText === current.example.trim() ? "speaking" : ""}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            speakItalian(current.example);
                          }}
                          aria-label={`Прослушать пример: ${current.example}`}
                          title="Прослушать пример по-итальянски"
                        >
                          <span aria-hidden="true">🔊</span>
                        </button>
                      </span>
                      <em>{current.exampleTranslation}</em>
                    </small>
                  ) : null}
                </span>
              )}
            </div>
            <div className="actions">
              <button className="repeat" onClick={() => mark("repeat")}>
                <span>↺</span>Повторить
              </button>
              <button className="know" onClick={() => mark("known")}>
                <span>✓</span>Знаю
              </button>
            </div>
          </>
        ) : (
          <div className="emptyCard">
            <div className="miniSun" />
            <span>
              {repeatOnly ? "Пока нет сложных карточек" : "Bravissima!"}
            </span>
            <b>
              {repeatOnly
                ? "Отметь карточки «Повторить» во время занятия"
                : `Занятие из ${studySession.length} карточек завершено`}
            </b>
            {!repeatOnly && (
              <button
                onClick={() => {
                  setStudySessionActive(false);
                  setStudyMessage("");
                }}
              >
                Собрать новое занятие
              </button>
            )}
            <button className="softButton" onClick={() => setTab("sections")}>
              К списку разделов
            </button>
          </div>
        )}
        {repeatOnly && Object.keys(progress).length > 0 && current && (
          <button className="resetLink" onClick={() => resetProgress(true)}>
            Начать этот раздел сначала
          </button>
        )}
      </>
    );
  }

  function SectionsView() {
    return (
      <section>
        <div className="listTitle">
          <div>
            <p className="sectionLabel">Моя Италия</p>
            <h2>Разделы и уроки</h2>
          </div>
          <button onClick={addTopic}>＋ Раздел</button>
        </div>
        <div className="sectionGrid">
          {topics.slice(1).map((item) => {
            const list = cards.filter((card) => cardMatchesTopic(card, item));
            const done = list.filter((c) => progress[c.id] === "known").length;
            const scene = list[0]?.association || "book";
            const isRenaming = renamingTopic === item;
            const canRename = rawTopics.includes(item);
            return (
              <article
                className={item === NEW_TOPIC ? "newSection" : undefined}
                key={item}
              >
                <Visual type={scene} card={list[0]} small />
                <div className="sectionBody">
                  <span>
                    {item === NEW_TOPIC ? "Последнее добавление" : "Раздел"} ·{" "}
                    {list.length} {cardWord(list.length)}
                  </span>
                  {isOwner && isRenaming ? (
                    <div className="renameLine">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameTopic(item);
                          if (e.key === "Escape") setRenamingTopic(null);
                        }}
                      />
                      <button onClick={() => renameTopic(item)}>✓</button>
                      <button
                        className="mutedIcon"
                        onClick={() => setRenamingTopic(null)}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <h3>{item}</h3>
                  )}
                  <div className="sectionProgress">
                    <i
                      style={{
                        width: `${list.length ? (done / list.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <small>
                    {done} из {list.length} изучено
                  </small>
                  <div className="sectionActions">
                    <button onClick={() => openLibrary(item)}>Список</button>
                    {isOwner && canRename && (
                      <button
                        onClick={() => {
                          setRenamingTopic(item);
                          setRenameValue(item);
                        }}
                      >
                        Переименовать
                      </button>
                    )}
                    <button
                      className="primaryMini"
                      onClick={() => openStudy(item)}
                    >
                      Учить
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {isOwner && topics.length === 1 && (
          <div className="emptyCard">
            <span>Создай первый раздел</span>
            <b>Например, «Урок 1. Знакомство»</b>
            <button onClick={addTopic}>Создать раздел</button>
          </div>
        )}
      </section>
    );
  }

  function LibraryView() {
    const visibleIds = libraryCards
      .filter((card) => card.id > 0)
      .map((card) => card.id);
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.includes(id));
    return (
      <section>
        <div className="listTitle">
          <div>
            <p className="sectionLabel">Свободный просмотр</p>
            <h2>Все карточки</h2>
          </div>
        </div>
        <p className="libraryHint">
          Здесь можно спокойно просматривать, раскрывать и распределять карточки
          — прогресс обучения не меняется.
        </p>
        <label className="libraryTopicFilter">
          Показать раздел
          <select
            value={libraryTopic}
            onChange={(e) => {
              setLibraryTopic(e.target.value);
              setSelectedIds([]);
              setLibraryMessage("");
            }}
          >
            {topics.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <div className="filterChips">
          <button
            className={kindFilter === "all" ? "active" : ""}
            onClick={() => setKindFilter("all")}
          >
            Все · {libraryCards.length}
          </button>
          <button
            className={kindFilter === "word" ? "active" : ""}
            onClick={() => setKindFilter("word")}
          >
            Слова
          </button>
          <button
            className={kindFilter === "phrase" ? "active" : ""}
            onClick={() => setKindFilter("phrase")}
          >
            Фразы
          </button>
        </div>
        {isOwner && <div className="bulkBar">
          <button
            onClick={() =>
              setSelectedIds(
                allVisibleSelected
                  ? selectedIds.filter((id) => !visibleIds.includes(id))
                  : Array.from(new Set([...selectedIds, ...visibleIds])),
              )
            }
          >
            {allVisibleSelected ? "Снять выбор" : "Выбрать все"}
          </button>
          <button className="dedupeButton" onClick={removeDuplicates}>
            Убрать дубли
          </button>
          <button
            className="deleteBulk"
            onClick={deleteSelected}
            disabled={!selectedIds.length}
          >
            Удалить выбранные
            {selectedIds.length ? ` · ${selectedIds.length}` : ""}
          </button>
        </div>}
        {libraryMessage && (
          <p className="libraryMessage" role="status">
            {libraryMessage}
          </p>
        )}
        <div className="wordList">
          {libraryCards.map((card) => {
            const expanded = expandedCardId === card.id;
            const selected = selectedIds.includes(card.id);
            return (
              <article
                className={`${expanded ? "expanded " : ""}${selected ? "selected" : ""}`}
                key={card.id}
              >
                {isOwner && <label
                  className="selectCard"
                  aria-label={`Выбрать ${card.italian}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelected(card.id)}
                  />
                  <span>✓</span>
                </label>}
                <Visual type={card.association} card={card} small />
                <button
                  className="wordMain"
                  onClick={() => setExpandedCardId(expanded ? null : card.id)}
                  aria-expanded={expanded}
                >
                  <span>
                    {card.kind === "word" ? "Слово" : "Фраза"} · {groupedTopic(card.topic)}
                  </span>
                  <b>{card.italian}</b>
                  <i>{card.ipa}</i>
                  <p>{card.translation}</p>
                  <em>{expanded ? "Свернуть" : "Подробнее"}</em>
                </button>
                {isOwner && <div className="wordButtons">
                  <button
                    onClick={() => edit(card)}
                    aria-label={`Редактировать ${card.italian}`}
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => remove(card)}
                    aria-label={`Удалить ${card.italian}`}
                  >
                    ×
                  </button>
                </div>}
                {expanded && (
                  <div className="wordDetails">
                    {card.example && (
                      <p>
                        <b>{card.example}</b>
                        <span>{card.exampleTranslation}</span>
                      </p>
                    )}
                    {card.usage && (
                      <p>
                        <span>{card.usage}</span>
                      </p>
                    )}
                    {isOwner && <label>
                      Перенести в раздел
                      <select
                        value={card.topic}
                        onChange={(e) => moveCard(card, e.target.value)}
                      >
                        {rawTopics.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </label>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
        {!libraryCards.length && (
          <div className="emptyList">В этом разделе пока нет карточек.</div>
        )}
      </section>
    );
  }

  function AddView() {
    return (
      <section>
        <p className="sectionLabel">Новые знания</p>
        <h2>{editingId ? "Исправить карточку" : "Добавить материалы"}</h2>
        {!editingId && (
          <div className="modeSwitch">
            <button
              className={addMode === "batch" ? "active" : ""}
              onClick={() => setAddMode("batch")}
            >
              Списком через ChatGPT
            </button>
            <button
              className={addMode === "manual" ? "active" : ""}
              onClick={() => setAddMode("manual")}
            >
              Одну вручную
            </button>
          </div>
        )}
        {addMode === "batch" && !editingId ? (
          <div className="batchFlow">
            <div className="freeNote">
              <span>✦</span>
              <div>
                <b>Полностью бесплатно</b>
                <p>
                  ChatGPT подготовит IPA и переводы, для каждого слова —
                  предложение с переводом, для каждой фразы — пояснение
                  ситуации. Сайт проверит и сохранит результат.
                </p>
              </div>
            </div>
            <label>
              Куда добавить карточки
              <div className="topicLine">
                <select
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                >
                  {rawTopics.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <button onClick={addTopic}>＋ Новый</button>
              </div>
            </label>
            <label>
              1. Вставь слова и фразы — каждый элемент с новой строки
              <textarea
                value={batchWords}
                onChange={(e) => setBatchWords(e.target.value)}
                placeholder={"casa\nmare\nCome stai?\nMolto bene, grazie."}
              />
            </label>
            <button className="copyButton" onClick={copyPrompt}>
              {copied
                ? "✓ Задание скопировано"
                : "Скопировать задание для ChatGPT"}
            </button>
            <p className="flowHint">
              Открой ChatGPT, вставь задание и скопируй полученный JSON.
            </p>
            <label>
              2. Вставь сюда ответ ChatGPT
              <textarea
                className="jsonArea"
                value={batchResult}
                onChange={(e) => {
                  setBatchResult(e.target.value);
                  setImportSucceeded(false);
                  setMessage("");
                }}
                placeholder={'[{"topic":"...","kind":"word", ...}]'}
              />
            </label>
            {message && (
              <p
                className={`formMessage ${importSucceeded ? "success" : ""}`}
                role="status"
              >
                {message}
              </p>
            )}
            <button
              className={`saveButton ${importing ? "loadingButton" : ""}`}
              onClick={importBatch}
              disabled={importing || !batchResult.trim()}
            >
              {importing ? (
                <>
                  <span className="spinner" />
                  Импортирую карточки…
                </>
              ) : (
                "Импортировать карточки"
              )}
            </button>
          </div>
        ) : (
          <form className="cardForm" onSubmit={submit}>
            <label>
              Тип материала
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm({ ...form, kind: e.target.value as CardKind })
                }
              >
                <option value="word">Отдельное слово</option>
                <option value="phrase">Фраза или выражение</option>
              </select>
            </label>
            <label>
              Раздел
              <div className="topicLine">
                <select
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                >
                  {rawTopics.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <button type="button" onClick={addTopic}>
                  ＋
                </button>
              </div>
            </label>
            <label>
              Итальянский текст <b>*</b>
              <input
                lang="it"
                value={form.italian}
                onChange={(e) => setForm({ ...form, italian: e.target.value })}
                placeholder="buongiorno"
              />
            </label>
            <label>
              Транскрипция IPA <b>*</b>
              <input
                value={form.ipa}
                onChange={(e) => setForm({ ...form, ipa: e.target.value })}
                placeholder="/bwɔnˈdʒorno/"
              />
            </label>
            <label>
              Перевод <b>*</b>
              <input
                value={form.translation}
                onChange={(e) =>
                  setForm({ ...form, translation: e.target.value })
                }
                placeholder="добрый день"
              />
            </label>
            <label>
              Жизненный пример на итальянском <b>*</b>
              <input
                lang="it"
                value={form.example}
                onChange={(e) => setForm({ ...form, example: e.target.value, usage: "" })}
              />
            </label>
            <label>
              Перевод примера <b>*</b>
              <input
                value={form.exampleTranslation}
                onChange={(e) => setForm({ ...form, exampleTranslation: e.target.value })}
              />
            </label>
            <label>
              Визуальная ассоциация
              <select
                value={form.association}
                onChange={(e) =>
                  setForm({
                    ...form,
                    association: e.target.value as Association,
                  })
                }
              >
                {associations.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <Visual type={form.association} card={form} />
            {message && <p className="formMessage">{message}</p>}
            <button className="saveButton" type="submit">
              {editingId ? "Сохранить изменения" : "Добавить карточку"}
            </button>
            {editingId && (
              <button
                className="cancelButton"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setTab("library");
                }}
              >
                Отмена
              </button>
            )}
          </form>
        )}
      </section>
    );
  }

  function ProgressView() {
    const totalKnown = cards.filter((c) => progress[c.id] === "known").length;
    const percent = cards.length
      ? Math.round((totalKnown / cards.length) * 100)
      : 0;
    return (
      <section>
        <p className="sectionLabel">Моё путешествие</p>
        <h2>Прогресс</h2>
        <div className="progressHero">
          <div
            className="progressCircle"
            style={
              { "--progress": `${percent * 3.6}deg` } as React.CSSProperties
            }
          >
            <div>
              <b>{percent}%</b>
              <span>маршрута</span>
            </div>
          </div>
          <h3>Bravissima, Наталья!</h3>
          <p>Каждая изученная карточка — ещё один шаг по солнечной Италии.</p>
        </div>
        <div className="statGrid">
          <article>
            <b>{cards.length}</b>
            <span>всего карточек</span>
          </article>
          <article>
            <b>{totalKnown}</b>
            <span>уже знаю</span>
          </article>
          <article>
            <b>{hardCount}</b>
            <span>хочу повторить</span>
          </article>
        </div>
        <div className="topicProgressList">
          {topics.slice(1).map((item) => {
            const list = cards.filter((card) => cardMatchesTopic(card, item));
            const done = list.filter((c) => progress[c.id] === "known").length;
            return (
              <button key={item} onClick={() => openStudy(item)}>
                <span>
                  {item}
                  <small>
                    {done} из {list.length}
                  </small>
                </span>
                <i>
                  <em
                    style={{
                      width: `${list.length ? (done / list.length) * 100 : 0}%`,
                    }}
                  />
                </i>
              </button>
            );
          })}
        </div>
        <button className="resetLink" onClick={() => resetProgress(false)}>
          Сбросить весь прогресс
        </button>
      </section>
    );
  }
}
