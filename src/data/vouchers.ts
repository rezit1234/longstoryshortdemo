export type AmountVoucher = {
  id: string;
  amount: number;
};

export type ExperienceVoucher = {
  id: string;
  title: string;
  subtitle?: string;
  price: number;
  description: string;
  suitableFor: string;
};

export const AMOUNT_VOUCHERS: AmountVoucher[] = [
  { id: "amount-500", amount: 500 },
  { id: "amount-1000", amount: 1000 },
  { id: "amount-1500", amount: 1500 },
  { id: "amount-2000", amount: 2000 },
  { id: "amount-3000", amount: 3000 },
];

const CHEFS_TABLE_RESERVATION =
  "Rezervaci na Chef's table si, prosím, vytvořte včas na telefonním čísle Eatery restaurace 727 800 900 nebo e-mailové adrese eatery@longstoryshort.cz.";

export const EXPERIENCE_VOUCHERS: ExperienceVoucher[] = [
  {
    id: "chefs-table",
    title: "Chef's Table",
    subtitle: "Dárkový poukaz",
    price: 1876,
    description: `Pětichodová večeře dle výběru šéfkuchaře bez vinného párování. Tento poukaz je vhodný pro 1 osobu. ${CHEFS_TABLE_RESERVATION}`,
    suitableFor: "1 osobu",
  },
  {
    id: "chefs-table-wine",
    title: "Chef's Table s vinným párováním",
    subtitle: "Dárkový poukaz",
    price: 2543,
    description: `Pětichodová večeře dle výběru šéfkuchaře s vinným párováním. Tento poukaz je vhodný pro 1 osobu. ${CHEFS_TABLE_RESERVATION}`,
    suitableFor: "1 osobu",
  },
  {
    id: "the-arc",
    title: "The Arc | „Výklenek“",
    subtitle: "Noc v privátním pokoji",
    price: 3600,
    description:
      "1 noc v privátním pokoji The Arc | „Výklenek“ s koupelnou. Snídaně je součástí dárkového poukazu. Tento poukaz je vhodný pro 1 nebo 2 osoby.",
    suitableFor: "1 nebo 2 osoby",
  },
  {
    id: "the-nook",
    title: "The Nook | „Koutek“",
    subtitle: "Noc v privátním pokoji",
    price: 4400,
    description:
      "1 noc v privátním pokoji The Nook | „Koutek“ s koupelnou. Snídaně je součástí dárkového poukazu. Tento poukaz je vhodný pro 1 nebo 2 osoby.",
    suitableFor: "1 nebo 2 osoby",
  },
  {
    id: "the-big-one",
    title: "The Big One | „Ten Božský“",
    subtitle: "Noc v privátním pokoji",
    price: 5800,
    description:
      "1 noc v privátním pokoji The Big One | „Ten Božský“. Luxusní a prostorný pokoj s vanou v prostoru a privátní koupelnou. Snídaně je součástí dárkového poukazu. Tento poukaz je vhodný pro 1 nebo 2 osoby.",
    suitableFor: "1 nebo 2 osoby",
  },
  {
    id: "the-flat",
    title: "The Flat | „Byt“",
    subtitle: "Noc v apartmánu",
    price: 5700,
    description:
      "1 noc v „Bytě“ | The Flat. Luxusní, prostorný 2kk apartmán s oddělenou koupelnou a prostornou otevřenou kuchyní. Váš domov na cestách, ve kterém najdete vše, co budete potřebovat. Snídaně je součástí dárkového poukazu. Tento poukaz je vhodný pro 2 osoby nebo rodinu až se třemi dětmi.",
    suitableFor: "2 osoby nebo rodinu až se 3 dětmi",
  },
  {
    id: "the-big-one-chefs-table",
    title: "The Big One & Chef's Table",
    subtitle: "S vinným párováním pro 2",
    price: 9500,
    description: `1 noc v privátním pokoji The Big One | „Ten Božský“ s koupelnou a s vanou v prostoru. Snídaně je součástí dárkového poukazu. Chef's table pro 2 — pětichodová večeře dle výběru šéfkuchaře s vinným párováním. Tento poukaz je vhodný pro 2 osoby. ${CHEFS_TABLE_RESERVATION}`,
    suitableFor: "2 osoby",
  },
  {
    id: "the-nook-chefs-table",
    title: "The Nook & Chef's Table",
    subtitle: "S vinným párováním pro 2",
    price: 8200,
    description: `1 noc v privátním pokoji The Nook | „Koutek“ s koupelnou. Snídaně je součástí dárkového poukazu. Chef's table pro 2 — pětichodová večeře dle výběru šéfkuchaře s vinným párováním. Tento poukaz je vhodný pro 2 osoby.`,
    suitableFor: "2 osoby",
  },
  {
    id: "the-arc-chefs-table",
    title: "The Arc & Chef's Table",
    subtitle: "S vinným párováním pro 2",
    price: 7500,
    description: `1 noc v privátním pokoji The Arc | „Výklenek“ s koupelnou. Snídaně je součástí dárkového poukazu. Chef's table pro 2 — pětichodová večeře dle výběru šéfkuchaře s vinným párováním. Tento poukaz je vhodný pro 2 osoby.`,
    suitableFor: "2 osoby",
  },
];

export function formatCzk(amount: number): string {
  return `${amount.toLocaleString("cs-CZ")} Kč`;
}
