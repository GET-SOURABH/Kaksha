/* Built-in practice sheets — no AI, no cost.
   Maths sheets get fresh numbers every time; reading sheets rotate through a bank of passages per level. */

export interface Sheet {
  title: string;
  intro: string;
  passage: string;
  sections: { heading: string; items: string[] }[];
  source: "ai" | "built-in";
  made: string; // yyyy-mm-dd
  v?: number; // which version this is; "New sheet" moves to the next one
}

type Rand = () => number;
function rng(seed: number): Rand {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r: Rand, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T,>(r: Rand, a: T[]) => a[Math.floor(r() * a.length)];
const NAMES = ["Riya", "Aman", "Sana", "Kabir", "Meena", "Imran", "Pooja", "Arjun", "Fatima", "Ravi"];
const THINGS = ["mangoes", "pencils", "marbles", "bangles", "laddoos", "stickers", "bananas", "books"];

function times(n: number, f: () => string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < n && guard++ < n * 20) {
    const x = f();
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

/* ---------------- Maths ---------------- */
function mathsSheet(level: number, r: Rand): Omit<Sheet, "source" | "made"> {
  const L = Math.floor(level);
  const n1 = pick(r, NAMES),
    n2 = pick(r, NAMES.filter((x) => x !== n1)),
    th = pick(r, THINGS);

  if (L <= 0) {
    const a = between(r, 3, 9);
    return {
      title: "Maths practice · Numbers to 20",
      intro: "Read each question and write your answer in the blank.",
      passage: "",
      sections: [
        { heading: "Write the number that comes next", items: times(5, () => { const x = between(r, 1, 18); return x + ", " + (x + 1) + ", ____"; }) },
        { heading: "Circle the bigger number", items: times(4, () => { const x = between(r, 1, 20); let y = between(r, 1, 20); if (y === x) y = x === 20 ? 19 : x + 1; return x + "   or   " + y; }) },
        { heading: "Count and fill", items: ["2, 4, 6, ____, ____", "5, 10, 15, ____, ____", "Draw " + a + " circles: ____", "Write the number fourteen in digits: ____"] },
        { heading: "Story sums", items: [n1 + " has " + a + " " + th + ". She gets 1 more. How many now? ____", n2 + " has 5 pencils and loses 2. How many are left? ____"] },
      ],
    };
  }
  if (L === 1) {
    return {
      title: "Maths practice · Adding and taking away within 20",
      intro: "Solve each sum. Use your fingers or draw dots if it helps.",
      passage: "",
      sections: [
        { heading: "Add", items: times(6, () => { const a = between(r, 2, 10), b = between(r, 1, 9); return a + " + " + b + " = ____"; }) },
        { heading: "Take away", items: times(5, () => { const a = between(r, 8, 20), b = between(r, 1, 7); return a + " − " + b + " = ____"; }) },
        { heading: "Fill the missing number", items: times(3, () => { const a = between(r, 2, 9), b = between(r, 2, 9); return a + " + ____ = " + (a + b); }) },
        { heading: "Story sums", items: [n1 + " has " + between(r, 6, 9) + " " + th + " and " + n2 + " gives " + between(r, 3, 8) + " more. How many does " + n1 + " have now? ____", "There are " + between(r, 12, 18) + " birds on a tree. " + between(r, 3, 7) + " fly away. How many are left? ____"] },
      ],
    };
  }
  if (L === 2) {
    return {
      title: "Maths practice · Tens and ones",
      intro: "Solve each question. Show your working on the side.",
      passage: "",
      sections: [
        { heading: "Tens and ones", items: times(3, () => { const x = between(r, 21, 98); return x + " = ____ tens and ____ ones"; }) },
        { heading: "Add", items: times(5, () => { const a = between(r, 12, 58), b = between(r, 11, 39); return a + " + " + b + " = ____"; }) },
        { heading: "Subtract", items: times(4, () => { const a = between(r, 40, 99), b = between(r, 11, 38); return a + " − " + b + " = ____"; }) },
        { heading: "Tables and story sums", items: [...times(3, () => { const t = pick(r, [2, 5, 10]); return t + " × " + between(r, 2, 10) + " = ____"; }), n1 + " has ₹" + between(r, 25, 60) + " and spends ₹" + between(r, 10, 20) + " on a notebook. How much is left? ₹____"] },
      ],
    };
  }
  if (L === 3) {
    return {
      title: "Maths practice · Bigger numbers and tables",
      intro: "Solve each question. Write the carry and borrow clearly.",
      passage: "",
      sections: [
        { heading: "Add", items: times(4, () => { const a = between(r, 125, 588), b = between(r, 117, 399); return a + " + " + b + " = ____"; }) },
        { heading: "Subtract", items: times(4, () => { const a = between(r, 400, 950), b = between(r, 128, 389); return a + " − " + b + " = ____"; }) },
        { heading: "Multiply and divide", items: [...times(3, () => between(r, 3, 9) + " × " + between(r, 3, 10) + " = ____"), ...times(3, () => { const d = between(r, 2, 9), q = between(r, 2, 10); return d * q + " ÷ " + d + " = ____"; })] },
        { heading: "Story sums", items: ["A box has " + between(r, 4, 9) + " rows of " + between(r, 5, 9) + " " + th + ". How many in all? ____", "A school has " + between(r, 320, 480) + " students. " + between(r, 120, 190) + " are in the morning shift. How many are in the afternoon shift? ____"] },
      ],
    };
  }
  if (L === 4) {
    return {
      title: "Maths practice · Multiply, divide and fractions",
      intro: "Solve each question. Show your working.",
      passage: "",
      sections: [
        { heading: "Multiply", items: times(4, () => between(r, 12, 89) + " × " + between(r, 3, 9) + " = ____") },
        { heading: "Divide", items: times(4, () => { const d = between(r, 3, 9), q = between(r, 12, 99); return d * q + " ÷ " + d + " = ____"; }) },
        { heading: "Fractions", items: [...times(3, () => { const d = pick(r, [2, 3, 4, 5]); const n = d * between(r, 2, 9); return "1/" + d + " of " + n + " = ____"; }), "Which is bigger: 1/2 or 1/4? ____"] },
        { heading: "Story sums", items: [n1 + " buys " + between(r, 3, 6) + " notebooks for ₹" + between(r, 18, 35) + " each. How much does " + n1 + " pay? ₹____", between(r, 4, 8) * 12 + " " + th + " are shared equally by 12 children. How many does each child get? ____"] },
      ],
    };
  }
  // Level 5 and above
  return {
    title: "Maths practice · Large numbers, fractions and decimals",
    intro: "Solve each question. Show your working.",
    passage: "",
    sections: [
      { heading: "Add and subtract", items: [...times(2, () => between(r, 1200, 6800) + " + " + between(r, 1100, 2900) + " = ____"), ...times(2, () => between(r, 5000, 9800) + " − " + between(r, 1200, 4800) + " = ____")] },
      { heading: "Multiply and divide", items: [...times(2, () => between(r, 112, 489) + " × " + between(r, 12, 38) + " = ____"), ...times(2, () => { const d = between(r, 4, 9), q = between(r, 105, 399); return d * q + " ÷ " + d + " = ____"; })] },
      { heading: "Fractions and decimals", items: [...times(2, () => { const d = pick(r, [5, 7, 8, 9]); const a = between(r, 1, d - 2), b = between(r, 1, d - 1 - a); return a + "/" + d + " + " + b + "/" + d + " = ____"; }), ...times(2, () => (between(r, 11, 89) / 10).toFixed(1) + " + " + (between(r, 11, 89) / 10).toFixed(1) + " = ____")] },
      { heading: "Story sums", items: ["A shop sells " + between(r, 120, 260) + " packets of milk every day. How many packets does it sell in " + between(r, 12, 30) + " days? ____", n2 + " walks " + (between(r, 12, 28) / 10).toFixed(1) + " km to school and the same distance back. How far does " + n2 + " walk in a day? ____ km"] },
    ],
  };
}

/* ---------------- Reading ---------------- */
interface ReadingPage {
  title: string;
  intro: string;
  passage: string;
  sections: { heading: string; items: string[] }[];
}
const READING_A: ReadingPage[] = [
  {
    title: "Reading practice · Letters and sounds",
    intro: "Say each sound out loud, then write.",
    passage: "",
    sections: [
      { heading: "Read these letters aloud", items: ["a   m   s   t   p", "i   n   c   d   b", "o   g   h   r   l"] },
      { heading: "Write the first letter of each word", items: ["____at  (cat)", "____un  (sun)", "____en  (pen)", "____ish  (fish)", "____ag  (bag)"] },
      { heading: "Write the missing letter", items: ["a, b, ____, d", "m, ____, o, p", "s, t, ____, v"] },
      { heading: "Match the sound", items: ["Which word starts like 'ball'?   bat / cup", "Which word starts like 'mango'?   map / dog"] },
    ],
  },
  {
    title: "Reading practice · Small words and sentences",
    intro: "Read each line out loud to a friend, then answer.",
    passage: "I see a cat. The cat is on a mat. The cat is fat. It has a red cap.",
    sections: [
      { heading: "Read these words", items: ["cat   mat   hat   sat", "pen   ten   hen   men", "sun   run   fun   bun"] },
      { heading: "Fill the missing letter", items: ["c___t", "p___n", "s___n", "b___g"] },
      { heading: "Answer from the story", items: ["Where is the cat? ____", "What colour is the cap? ____", "Is the cat big or small? ____"] },
      { heading: "Write", items: ["Write one word that rhymes with 'cat': ____", "Write one word that rhymes with 'sun': ____"] },
    ],
  },
  {
    title: "Reading practice · The lost ball",
    intro: "Read the story two times. Then answer the questions.",
    passage:
      "Ravi has a red ball. He plays with his sister Meena in the park. Ravi kicks the ball very high. The ball falls in the bushes. Meena finds the ball. Ravi says, \"Thank you, Meena.\" They play again till the sun goes down.",
    sections: [
      { heading: "Answer in one word or one line", items: ["What colour is the ball? ____", "Who finds the ball? ____", "Where do they play? ____", "What does Ravi say to Meena? ____"] },
      { heading: "Word work", items: ["Find two words in the story that start with 'b': ____ ____", "Write the opposite of 'high': ____", "Write a word that rhymes with 'ball': ____"] },
      { heading: "Write", items: ["Write one sentence about a game you like: ____"] },
    ],
  },
  {
    title: "Reading practice · Sana's kitchen garden",
    intro: "Read the passage carefully. Then answer the questions.",
    passage:
      "Sana lives in a small house near the river. Behind her house there is a little kitchen garden. Every morning before school, Sana waters the plants. She grows tomatoes, chillies and mint. Her grandmother taught her to put dry leaves around the plants so the soil stays wet. Last month the tomatoes turned red. Sana picked them carefully and her mother made chutney for the whole family. Sana felt proud. Now she wants to grow brinjals too.",
    sections: [
      { heading: "Answer in a full sentence", items: ["When does Sana water the plants? ____", "Name two things Sana grows. ____", "Why does Sana put dry leaves around the plants? ____", "What did her mother make with the tomatoes? ____"] },
      { heading: "Word meanings", items: ["'proud' means ____", "Write the opposite of 'dry': ____", "Write the plural of 'leaf': ____"] },
      { heading: "Think and write", items: ["What would you like to grow in a garden, and why? ____"] },
    ],
  },
  {
    title: "Reading practice · The broken bridge",
    intro: "Read the passage two times. Then answer the questions.",
    passage:
      "The rain had not stopped for three days. On Friday morning, Imran walked to the small wooden bridge on the way to his school and stopped. The middle of the bridge had broken and the water below was moving very fast. A group of younger children were coming down the path behind him, laughing and splashing in the puddles. Imran knew they could not see the broken part from far away. He put down his bag, stood in front of the bridge and waved both arms. \"Stop! Go back to the main road!\" he shouted. The children turned around. Later, the headmaster thanked Imran in the morning assembly and asked the village to repair the bridge.",
    sections: [
      { heading: "Answer in full sentences", items: ["Why was the bridge broken? ____", "Why could the younger children not see the danger? ____", "What did Imran do to stop them? ____", "How did the headmaster thank Imran? ____"] },
      { heading: "Word work", items: ["Find a word in the passage that means 'fixed': ____", "Write two action words from the passage: ____ ____", "Make a sentence with the word 'danger': ____"] },
      { heading: "Think and write", items: ["What would you have done if you were Imran? Write two sentences. ____"] },
    ],
  },
  {
    title: "Reading practice · Saving water in Jaipur",
    intro: "Read the passage carefully. Then answer the questions.",
    passage:
      "Many years ago, people in Rajasthan learned to live with very little rain. They built deep step-wells called baoris, where rainwater was collected and kept cool for months. Today many cities again face water shortage. In one Jaipur school, students decided to act. They counted how many taps were left dripping each day and found more than forty. They made posters, fixed small notes near every tap, and asked the school to collect rainwater from the roof into a large tank. By the end of the year, the school was using less water, and the tank water was used for the garden. The students then visited nearby homes to share what they had learned. Their teacher said the idea was simple, but the change came because everyone did their part.",
    sections: [
      { heading: "Answer in full sentences", items: ["What is a baori? ____", "What problem did the students find in their school? ____", "Name two things the students did to save water. ____", "What does the teacher mean by 'everyone did their part'? ____"] },
      { heading: "Word work", items: ["Find a word that means 'not enough': ____", "Write the past tense of 'build': ____", "Make one sentence using 'collect': ____"] },
      { heading: "Think and write", items: ["Write three ways your family can save water at home. ____"] },
    ],
  },
];
const READING_B: ReadingPage[] = [
  {
    title: "Reading practice · More letters and sounds",
    intro: "Say each sound out loud, then write.",
    passage: "",
    sections: [
      { heading: "Read these letters aloud", items: ["e   f   h   j   k", "l   r   u   w   y", "a   s   m   n   t"] },
      { heading: "Write the first letter of each word", items: ["____og  (dog)", "____an  (fan)", "____op  (top)", "____ilk  (milk)", "____et  (net)"] },
      { heading: "Write the missing letter", items: ["c, d, ____, f", "p, ____, r, s", "w, x, ____, z"] },
      { heading: "Match the sound", items: ["Which word starts like 'apple'?   ant / bus", "Which word starts like 'nose'?   net / cap"] },
    ],
  },
  {
    title: "Reading practice · Ben and his dog",
    intro: "Read each line out loud to a friend, then answer.",
    passage: "Ben has a big dog. The dog can run. It sits in the sun. Ben and the dog have fun.",
    sections: [
      { heading: "Read these words", items: ["big   dig   pig   wig", "dog   log   fog   jog", "hop   top   mop   pop"] },
      { heading: "Fill the missing letter", items: ["d___g", "s___n", "p___g", "h___t"] },
      { heading: "Answer from the story", items: ["Who has a dog? ____", "What can the dog do? ____", "Where does the dog sit? ____"] },
      { heading: "Write", items: ["Write one word that rhymes with 'dog': ____", "Write one word that rhymes with 'big': ____"] },
    ],
  },
  {
    title: "Reading practice · Asha's kite",
    intro: "Read the story two times. Then answer the questions.",
    passage:
      "Asha made a kite with paper and sticks. Her brother Dev gave her a long string. They ran to the roof. The wind was strong and the kite went up, up, up. A bird flew near the kite. Asha laughed and waved at the bird.",
    sections: [
      { heading: "Answer in one word or one line", items: ["What did Asha use to make the kite? ____", "Who gave her the string? ____", "Where did they go? ____", "What flew near the kite? ____"] },
      { heading: "Word work", items: ["Find two words in the story that start with 's': ____ ____", "Write the opposite of 'up': ____", "Write a word that rhymes with 'kite': ____"] },
      { heading: "Write", items: ["Write one sentence about something you made: ____"] },
    ],
  },
  {
    title: "Reading practice · Our new library",
    intro: "Read the passage carefully. Then answer the questions.",
    passage:
      "Our school got a small library this year. It is in a corner of the hall, with two shelves full of storybooks. Every Friday, each class gets thirty minutes there. Farhan likes books about animals, and his friend Gauri likes funny stories. Our teacher made a rule: you can take one book home if you bring it back in a week. At first some children forgot, so the class made a chart with names and dates. Now almost every book comes back on time.",
    sections: [
      { heading: "Answer in a full sentence", items: ["Where is the library? ____", "When does each class visit the library? ____", "What kind of books does Farhan like? ____", "Why did the class make a chart? ____"] },
      { heading: "Word meanings", items: ["'rule' means ____", "Write the opposite of 'forgot': ____", "Write the plural of 'story': ____"] },
      { heading: "Think and write", items: ["Which book would you like to borrow, and why? ____"] },
    ],
  },
  {
    title: "Reading practice · The big match",
    intro: "Read the passage two times. Then answer the questions.",
    passage:
      "Every year, the schools of our block play a football tournament. This year our team reached the final for the first time. On the day of the match it was very hot, and the other team scored in the first ten minutes. At half time our captain, Sneha, did not shout at anyone. She asked everyone to drink water and told the defenders to stay close to the goal. She also asked Om, the fastest runner, to wait near the middle. In the second half, Om got the ball and ran past two players to score. The match ended one-one, and our team lost on penalties. Still, the whole school cheered for them, because they had played fairly and never given up.",
    sections: [
      { heading: "Answer in full sentences", items: ["Why was the day of the match difficult? ____", "What did Sneha do at half time? ____", "How did Om score the goal? ____", "Why did the school cheer even though the team lost? ____"] },
      { heading: "Word work", items: ["Find a word in the passage that means 'a competition with many matches': ____", "Write two describing words from the passage: ____ ____", "Make a sentence with the word 'fairly': ____"] },
      { heading: "Think and write", items: ["Is winning the most important part of a game? Write two sentences. ____"] },
    ],
  },
  {
    title: "Reading practice · Bees and our food",
    intro: "Read the passage carefully. Then answer the questions.",
    passage:
      "When we eat a mango or a bowl of dal, we rarely think about bees. Yet many of the plants that give us food need insects like bees to carry pollen from one flower to another. This is called pollination. Without it, many plants cannot make fruit or seeds. In some parts of India, farmers have noticed fewer bees in their fields. Scientists think that some chemical sprays, cutting down trees and hotter summers may all be reasons. A group of farmers in Maharashtra decided to try something new. They planted flowering plants along the edges of their fields and kept a few wooden bee boxes. Within two seasons they saw more bees and better crops of mustard and sunflower. Some of them also began to sell honey, which gave them extra income.",
    sections: [
      { heading: "Answer in full sentences", items: ["What is pollination? ____", "Give two reasons why there may be fewer bees. ____", "What did the farmers in Maharashtra do? ____", "How did the change help the farmers in two ways? ____"] },
      { heading: "Word work", items: ["What does 'income' mean? ____", "Write the opposite of 'fewer': ____", "Make one sentence using 'notice': ____"] },
      { heading: "Think and write", items: ["Write three things children can do to help bees and other insects. ____"] },
    ],
  },
];
const READING: ReadingPage[][] = READING_A.map((a, i) => [a, READING_B[i]]);

function readingSheet(level: number, turn: number): ReadingPage {
  const L = Math.max(0, Math.min(READING.length - 1, Math.floor(level)));
  const bank = READING[L];
  return bank[turn % bank.length];
}

export function builtInSheet(subject: "lit" | "math", level: number, seed: number, today: string, turn = 0): Sheet {
  const base = subject === "math" ? mathsSheet(level, rng(seed)) : readingSheet(level, turn);
  return { ...base, source: "built-in", made: today, v: turn };
}
