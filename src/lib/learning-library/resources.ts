export type LearnResource = {
  title: string;
  provider: "Khan Academy" | "YouTube" | "ReadWorks" | "Other";
  url: string;
  durationSeconds?: number;
};

/** Curated free resources — Khan Academy, YouTube (Math Antics, etc.), reading sites */
const LIBRARY: Record<string, LearnResource[]> = {
  // ── G3 Math fluency ──
  "Addition Facts to 10": [
    { title: "Adding within 10", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-add-subtract/arith-add-subtract-10/v/addition-within-10" },
    { title: "Addition Facts Song", provider: "YouTube", url: "https://www.youtube.com/watch?v=UqR9L9N3-T0" },
  ],
  "Addition Facts to 20": [
    { title: "Add within 20", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-add-subtract/arith-add-subtract-20/v/adding-within-20" },
    { title: "Doubles & Near Doubles", provider: "YouTube", url: "https://www.youtube.com/watch?v=8td4N3MRPuk" },
  ],
  "Subtraction Facts to 10": [
    { title: "Subtract within 10", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-add-subtract/arith-add-subtract-10/v/subtract-within-10" },
    { title: "Subtraction for Kids", provider: "YouTube", url: "https://www.youtube.com/watch?v=8A5j4LSCQ8E" },
  ],
  "Subtraction Facts to 20": [
    { title: "Subtract within 20", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-add-subtract/arith-add-subtract-20/v/subtracting-within-20" },
    { title: "Subtraction Strategies", provider: "YouTube", url: "https://www.youtube.com/watch?v=Q7matJc8YlE" },
  ],
  "Multiplication ×0, ×1, ×2, ×5": [
    { title: "Intro to Multiplication", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide/arith-mult-2/v/multiplication-as-groups-of-objects" },
    { title: "Multiplication Tables", provider: "YouTube", url: "https://www.youtube.com/watch?v=K6aR9b3JinI" },
  ],
  "Multiplication ×3 & ×4": [
    { title: "Multiply by 3 and 4", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide/arith-mult-2/v/multiplication-on-the-number-line" },
    { title: "Times Tables Trick", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Multiplication ×6 & ×7": [
    { title: "Multiplication Practice", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide/arith-mult-2/v/more-with-mult-of-10" },
    { title: "6 & 7 Times Tables", provider: "YouTube", url: "https://www.youtube.com/watch?v=9os1VUUp5io" },
  ],
  "Multiplication ×8 & ×9": [
    { title: "Multi-digit Patterns", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide/arith-mult-2/v/patterns-in-multiples-of-9" },
    { title: "9 Times Table Finger Trick", provider: "YouTube", url: "https://www.youtube.com/watch?v=ljPKzYWZu1A" },
  ],
  "Multiplication ×10, ×11, ×12": [
    { title: "Multiples of 10", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide/arith-mult-2/v/multiplying-multiples-of-10" },
    { title: "10, 11, 12 Times Tables", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Multiplication Mixed 0–12": [
    { title: "Multiplication & Division", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide" },
    { title: "Multiplication Rap", provider: "YouTube", url: "https://www.youtube.com/watch?v=UqR9L9N3-T0" },
  ],
  "Division ÷2–÷5": [
    { title: "Division Intro", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide/arith-divide-intro/v/basic-division" },
    { title: "Division Explained", provider: "YouTube", url: "https://www.youtube.com/watch?v=KGMf314LUc0" },
  ],
  "Division ÷6–÷9": [
    { title: "Division Facts", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide/arith-divide-intro/v/division-in-context" },
    { title: "Long Division Prep", provider: "YouTube", url: "https://www.youtube.com/watch?v=8Ft5iHhauJ0" },
  ],
  "Division ÷10–÷12": [
    { title: "Divide Multiples of 10", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide/arith-divide-intro/v/dividing-multiples-of-10" },
    { title: "Division Strategies", provider: "YouTube", url: "https://www.youtube.com/watch?v=KGMf314LUc0" },
  ],
  "Division Mixed": [
    { title: "Division Practice", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide/arith-divide-intro" },
    { title: "Division Basics", provider: "YouTube", url: "https://www.youtube.com/watch?v=KGMf314LUc0" },
  ],
  "Place Value": [
    { title: "Place Value", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-place-value/arith-place-value-intro/v/place-value-introduction" },
    { title: "Place Value Song", provider: "YouTube", url: "https://www.youtube.com/watch?v=T5Qf0qSSJFI" },
  ],
  Rounding: [
    { title: "Rounding Numbers", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-place-value/arith-rounding/v/rounding-whole-numbers-1" },
    { title: "Rounding Explained", provider: "YouTube", url: "https://www.youtube.com/watch?v=fd-E18Eqsvk" },
  ],
  "Multi-Digit Addition": [
    { title: "Multi-digit Addition", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-add-subtract/arith-add-subtract-100/v/adding-whole-numbers-by-regrouping" },
    { title: "Addition with Regrouping", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Multi-Digit Subtraction": [
    { title: "Multi-digit Subtraction", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-add-subtract/arith-add-subtract-100/v/subtracting-whole-numbers-by-regrouping" },
    { title: "Subtraction with Borrowing", provider: "YouTube", url: "https://www.youtube.com/watch?v=8A5j4LSCQ8E" },
  ],
  "Basic Fractions": [
    { title: "Intro to Fractions", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-fractions/arith-frac-intro/v/intro-to-fractions" },
    { title: "Fractions Are Parts of a Whole", provider: "YouTube", url: "https://www.youtube.com/watch?v=CA9Rjw2PjsQ" },
  ],
  Perimeter: [
    { title: "Perimeter", provider: "Khan Academy", url: "https://www.khanacademy.org/math/cc-third-grade-math/imp-geometry/imp-perimeter/v/introduction-to-perimeter" },
    { title: "Perimeter Explained", provider: "YouTube", url: "https://www.youtube.com/watch?v=2UEUWK-8bag" },
  ],
  "Telling Time": [
    { title: "Telling Time", provider: "Khan Academy", url: "https://www.khanacademy.org/math/cc-second-grade-math/cc-2nd-measurement-data/cc-2nd-time/v/telling-time-exercise-example-1" },
    { title: "Elapsed Time", provider: "YouTube", url: "https://www.youtube.com/watch?v=zXFZUMjehDU" },
  ],
  "Data & Graphs": [
    { title: "Bar Graphs", provider: "Khan Academy", url: "https://www.khanacademy.org/math/cc-third-grade-math/imp-data/imp-bar-graphs/v/reading-bar-graphs" },
    { title: "Reading Graphs", provider: "YouTube", url: "https://www.youtube.com/watch?v=2UEUWK-8bag" },
  ],
  "One-Step Word Problems": [
    { title: "Word Problems", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-word-problems/arith-add-sub-word-problems/v/adding-within-20-word-problem" },
    { title: "Solving Word Problems", provider: "YouTube", url: "https://www.youtube.com/watch?v=8A5j4LSCQ8E" },
  ],
  "Two-Step Word Problems": [
    { title: "Two-step Word Problems", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-word-problems/arith-add-sub-word-problems/v/two-step-word-problem-with-model" },
    { title: "Multi-step Problems", provider: "YouTube", url: "https://www.youtube.com/watch?v=8A5j4LSCQ8E" },
  ],
  "Multi-Digit Multiplication 2×1": [
    { title: "Multiplying 2-digit by 1-digit", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide/arith-mult-2/v/multiplying-2-digits-by-1-digit-without-regrouping" },
    { title: "Multi-digit Multiplication", provider: "YouTube", url: "https://www.youtube.com/watch?v=K6aR9b3JinI" },
  ],
  "Multi-Digit Multiplication 2×2": [
    { title: "Multiplying 2-digit numbers", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide/arith-mult-2/v/multiplying-2-digit-numbers-without-regrouping" },
    { title: "2×2 Multiplication", provider: "YouTube", url: "https://www.youtube.com/watch?v=K6aR9b3JinI" },
  ],
  "Long Division 1-Digit Divisor": [
    { title: "Long Division", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide/arith-dividing-2-digit-by-1-digit-100/v/introduction-to-division" },
    { title: "Long Division Explained", provider: "YouTube", url: "https://www.youtube.com/watch?v=8Ft5iHhauJ0" },
  ],
  "Long Division with Remainders": [
    { title: "Division with Remainders", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide/arith-remainders/v/division-with-remainders" },
    { title: "Remainders", provider: "YouTube", url: "https://www.youtube.com/watch?v=8Ft5iHhauJ0" },
  ],
  "Factors & Multiples": [
    { title: "Factors & Multiples", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-factors-multiples/pre-algebra-factors-mult/v/factors-and-multiples-intro" },
    { title: "Factors Explained", provider: "YouTube", url: "https://www.youtube.com/watch?v=H_i2H2Hh0Hk" },
  ],
  "Equivalent Fractions": [
    { title: "Equivalent Fractions", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-fractions/arith-frac-equivalent/v/equivalent-fractions" },
    { title: "Equivalent Fractions", provider: "YouTube", url: "https://www.youtube.com/watch?v=HxKu9grgFxI" },
  ],
  "Compare Fractions": [
    { title: "Comparing Fractions", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-fractions/arith-comparing-fractions/v/comparing-fractions-with-like-denominators" },
    { title: "Compare Fractions", provider: "YouTube", url: "https://www.youtube.com/watch?v=CA9Rjw2PjsQ" },
  ],
  "Add Fractions Like Denominators": [
    { title: "Adding Fractions", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-fractions/arith-add-sub-fractions/v/adding-fractions-with-like-denominators" },
    { title: "Add Fractions", provider: "YouTube", url: "https://www.youtube.com/watch?v=5juto2ze8Lg" },
  ],
  "Subtract Fractions Like Denominators": [
    { title: "Subtracting Fractions", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-fractions/arith-add-sub-fractions/v/subtracting-fractions-with-like-denominators" },
    { title: "Subtract Fractions", provider: "YouTube", url: "https://www.youtube.com/watch?v=5juto2ze8Lg" },
  ],
  "Decimal Place Value": [
    { title: "Decimal Place Value", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-decimals/arith-decimals-intro/v/introduction-to-decimals" },
    { title: "Decimals Explained", provider: "YouTube", url: "https://www.youtube.com/watch?v=LCO-I4AwOdo" },
  ],
  "Compare Decimals": [
    { title: "Comparing Decimals", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-decimals/arith-decimals-on-number-line/v/comparing-decimals-on-the-number-line" },
    { title: "Compare Decimals", provider: "YouTube", url: "https://www.youtube.com/watch?v=LCO-I4AwOdo" },
  ],
  "Angles & Lines": [
    { title: "Angles", provider: "Khan Academy", url: "https://www.khanacademy.org/math/basic-geo/basic-geo-angle/angle-intro/v/angle-basics" },
    { title: "Types of Angles", provider: "YouTube", url: "https://www.youtube.com/watch?v=NVuMULQjb3o" },
  ],
  "Area of Rectangles": [
    { title: "Area of Rectangles", provider: "Khan Academy", url: "https://www.khanacademy.org/math/cc-third-grade-math/imp-measurement-and-data/imp-area/v/introduction-to-area" },
    { title: "Area Explained", provider: "YouTube", url: "https://www.youtube.com/watch?v=AfTawqNEJg0" },
  ],
  "Symmetry & Patterns": [
    { title: "Lines of Symmetry", provider: "Khan Academy", url: "https://www.khanacademy.org/math/basic-geo/basic-geo-transformations-congruence/line-of-symmetry/v/intro-to-symmetry" },
    { title: "Patterns", provider: "YouTube", url: "https://www.youtube.com/watch?v=NVuMULQjb3o" },
  ],
  "Measurement Conversions": [
    { title: "Converting Units", provider: "Khan Academy", url: "https://www.khanacademy.org/math/cc-fourth-grade-math/imp-measurement-and-data/imp-converting-units/v/converting-units-of-time" },
    { title: "Customary Units", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Multi-Step Word Problems": [
    { title: "Multi-step Word Problems", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-word-problems/arith-add-sub-word-problems/v/two-step-word-problem-with-model" },
    { title: "Word Problem Strategies", provider: "YouTube", url: "https://www.youtube.com/watch?v=8A5j4LSCQ8E" },
  ],
  "Multiply Fractions": [
    { title: "Multiplying Fractions", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide/arith-multiply-fractions/v/multiplying-fractions-and-whole-numbers" },
    { title: "Multiply Fractions", provider: "YouTube", url: "https://www.youtube.com/watch?v=LU_fIncRrV4" },
  ],
  "Divide Fractions": [
    { title: "Dividing Fractions", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-multiply-divide/arith-divide-fractions/v/dividing-fractions-by-fractions" },
    { title: "Divide Fractions", provider: "YouTube", url: "https://www.youtube.com/watch?v=4lkq3DgvmJo" },
  ],
  "Add Fractions Unlike Denominators": [
    { title: "Adding Unlike Denominators", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-fractions/arith-add-sub-fractions/v/adding-fractions-with-unlike-denominators" },
    { title: "Common Denominators", provider: "YouTube", url: "https://www.youtube.com/watch?v=5juto2ze8Lg" },
  ],
  "Subtract Fractions Unlike Denominators": [
    { title: "Subtract Unlike Denominators", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-fractions/arith-add-sub-fractions/v/subtracting-fractions-with-unlike-denominators" },
    { title: "Subtract Fractions", provider: "YouTube", url: "https://www.youtube.com/watch?v=5juto2ze8Lg" },
  ],
  "Decimal Addition & Subtraction": [
    { title: "Adding Decimals", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-decimals/arith-add-sub-decimals/v/adding-decimals" },
    { title: "Decimal Operations", provider: "YouTube", url: "https://www.youtube.com/watch?v=LCO-I4AwOdo" },
  ],
  "Decimal Multiplication": [
    { title: "Multiplying Decimals", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-decimals/arith-mult-decimals/v/multiplying-decimals" },
    { title: "Multiply Decimals", provider: "YouTube", url: "https://www.youtube.com/watch?v=LCO-I4AwOdo" },
  ],
  "Decimal Division": [
    { title: "Dividing Decimals", provider: "Khan Academy", url: "https://www.khanacademy.org/math/arithmetic-home/arith-decimals/arith-div-decimals/v/dividing-decimals" },
    { title: "Divide Decimals", provider: "YouTube", url: "https://www.youtube.com/watch?v=LCO-I4AwOdo" },
  ],
  Volume: [
    { title: "Volume", provider: "Khan Academy", url: "https://www.khanacademy.org/math/cc-fifth-grade-math/imp-measurement-and-data/imp-volume/v/volume-with-unit-cubes" },
    { title: "Volume Explained", provider: "YouTube", url: "https://www.youtube.com/watch?v=AfTawqNEJg0" },
  ],
  "Coordinate Plane": [
    { title: "Coordinate Plane", provider: "Khan Academy", url: "https://www.khanacademy.org/math/basic-geo/basic-geo-coord-plane/coordinate-plane-quadrant-1/v/graphing-points-in-a-plane" },
    { title: "Plotting Points", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Order of Operations": [
    { title: "Order of Operations", provider: "Khan Academy", url: "https://www.khanacademy.org/math/cc-sixth-grade-math/cc-6th-expressions-and-variables/cc-6th-order-of-operations/v/introduction-to-order-of-operations" },
    { title: "PEMDAS", provider: "YouTube", url: "https://www.youtube.com/watch?v=dAgfnK528ra" },
  ],
  "Numerical Expressions": [
    { title: "Writing Expressions", provider: "Khan Academy", url: "https://www.khanacademy.org/math/cc-sixth-grade-math/cc-6th-expressions-and-variables/cc-6th-writing-expressions/v/writing-expressions-with-variables" },
    { title: "Expressions", provider: "YouTube", url: "https://www.youtube.com/watch?v=dAgfnK528ra" },
  ],
  "Percent Introduction": [
    { title: "Intro to Percents", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-ratios-rates/pre-algebra-percent-intro/v/intro-to-percents" },
    { title: "Percents", provider: "YouTube", url: "https://www.youtube.com/watch?v=JeVSmq1NRPQ" },
  ],
  "Convert Measurements": [
    { title: "Unit Conversion", provider: "Khan Academy", url: "https://www.khanacademy.org/math/cc-fifth-grade-math/imp-measurement-and-data/imp-converting-units/v/converting-units-of-time" },
    { title: "Metric Conversion", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Graphing Patterns": [
    { title: "Patterns & Graphs", provider: "Khan Academy", url: "https://www.khanacademy.org/math/cc-sixth-grade-math/cc-6th-expressions-and-variables/cc-6th-dependent-independent/v/dependent-independent-variables" },
    { title: "Number Patterns", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  Ratios: [
    { title: "Intro to Ratios", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-ratios-rates/pre-algebra-ratios-intro/v/ratios-intro" },
    { title: "Ratios Explained", provider: "YouTube", url: "https://www.youtube.com/watch?v=H_8VqJhQ8ZQ" },
  ],
  "Unit Rates": [
    { title: "Unit Rates", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-ratios-rates/pre-algebra-rates/v/rate-problems" },
    { title: "Unit Rate", provider: "YouTube", url: "https://www.youtube.com/watch?v=H_8VqJhQ8ZQ" },
  ],
  "Percent of a Number": [
    { title: "Percent of a Number", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-ratios-rates/pre-algebra-percent-word-problems/v/percent-word-problems" },
    { title: "Finding Percents", provider: "YouTube", url: "https://www.youtube.com/watch?v=JeVSmq1NRPQ" },
  ],
  "Percent Increase & Decrease": [
    { title: "Percent Change", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-ratios-rates/pre-algebra-percent-word-problems/v/percent-increase-and-decrease" },
    { title: "Percent Increase", provider: "YouTube", url: "https://www.youtube.com/watch?v=JeVSmq1NRPQ" },
  ],
  "GCF & LCM": [
    { title: "GCF & LCM", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-factors-multiples/pre-algebra-gcf/v/greatest-common-factor" },
    { title: "GCF Explained", provider: "YouTube", url: "https://www.youtube.com/watch?v=H_i2H2Hh0Hk" },
  ],
  "Integer Addition & Subtraction": [
    { title: "Adding Negative Numbers", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-negative-numbers/pre-algebra-add-sub-neg/v/adding-negative-numbers-on-number-line" },
    { title: "Integers", provider: "YouTube", url: "https://www.youtube.com/watch?v=H_8VqJhQ8ZQ" },
  ],
  "Integer Multiplication & Division": [
    { title: "Multiplying Negative Numbers", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-negative-numbers/pre-algebra-mult-div-neg/v/multiplying-negative-numbers" },
    { title: "Integer Rules", provider: "YouTube", url: "https://www.youtube.com/watch?v=H_8VqJhQ8ZQ" },
  ],
  "Evaluate Expressions": [
    { title: "Evaluating Expressions", provider: "Khan Academy", url: "https://www.khanacademy.org/math/cc-sixth-grade-math/cc-6th-expressions-and-variables/cc-6th-evaluating-expressions/v/evaluating-expressions-with-two-variables" },
    { title: "Substitution", provider: "YouTube", url: "https://www.youtube.com/watch?v=dAgfnK528ra" },
  ],
  "One-Step Equations": [
    { title: "One-step Equations", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-equations-expressions/pre-algebra-one-step-equations/v/one-step-equations" },
    { title: "Solving Equations", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Inequalities Introduction": [
    { title: "Inequalities", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-equations-expressions/pre-algebra-inequalities/v/introduction-to-inequalities" },
    { title: "Inequalities Basics", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Mean Median Mode": [
    { title: "Mean, Median, Mode", provider: "Khan Academy", url: "https://www.khanacademy.org/math/statistics-probability/summarize-data-central-tendency/v/statistics-intro-mean-median-and-mode" },
    { title: "Central Tendency", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Data Displays": [
    { title: "Dot Plots", provider: "Khan Academy", url: "https://www.khanacademy.org/math/statistics-probability/displaying-describing-data/dot-plot/v/frequency-tables-and-dot-plots" },
    { title: "Histograms", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Coordinate Distance": [
    { title: "Distance on Coordinate Plane", provider: "Khan Academy", url: "https://www.khanacademy.org/math/basic-geo/basic-geo-coord-plane/coordinate-plane-quadrant-1/v/graphing-points-in-a-plane" },
    { title: "Coordinate Distance", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Area of Triangles": [
    { title: "Area of Triangles", provider: "Khan Academy", url: "https://www.khanacademy.org/math/geometry-home/geometry-area-perimeter/geometry-area-triangle/v/intuition-for-area-of-a-triangle" },
    { title: "Triangle Area", provider: "YouTube", url: "https://www.youtube.com/watch?v=AfTawqNEJg0" },
  ],
  "Proportional Relationships": [
    { title: "Proportional Relationships", provider: "Khan Academy", url: "https://www.khanacademy.org/math/cc-seventh-grade-math/cc-7th-ratio-proportion/cc-7th-proportional-relationships/v/proportional-relationships" },
    { title: "Proportions", provider: "YouTube", url: "https://www.youtube.com/watch?v=H_8VqJhQ8ZQ" },
  ],
  "Percent Applications": [
    { title: "Percent Word Problems", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-ratios-rates/pre-algebra-percent-word-problems/v/percent-word-problems" },
    { title: "Tax, Tip, Discount", provider: "YouTube", url: "https://www.youtube.com/watch?v=JeVSmq1NRPQ" },
  ],
  "Operations with Rational Numbers": [
    { title: "Rational Numbers", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-negative-numbers/pre-algebra-add-sub-neg/v/adding-negative-numbers-on-number-line" },
    { title: "Fraction & Decimal Ops", provider: "YouTube", url: "https://www.youtube.com/watch?v=LCO-I4AwOdo" },
  ],
  "Two-Step Equations": [
    { title: "Two-step Equations", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-equations-expressions/pre-algebra-two-step-equations/v/two-step-equations" },
    { title: "Solving 2-step", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Multi-Step Equations": [
    { title: "Multi-step Equations", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-equations-expressions/pre-algebra-multi-step-equations/v/equations-with-variables-on-both-sides" },
    { title: "Multi-step Solving", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  Inequalities: [
    { title: "Solving Inequalities", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-equations-expressions/pre-algebra-inequalities/v/one-step-inequalities" },
    { title: "Graphing Inequalities", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  Probability: [
    { title: "Basic Probability", provider: "Khan Academy", url: "https://www.khanacademy.org/math/statistics-probability/probability-library/basic-probability/v/simple-probability" },
    { title: "Probability Intro", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Statistics & Sampling": [
    { title: "Sampling Methods", provider: "Khan Academy", url: "https://www.khanacademy.org/math/statistics-probability/designing-studies/sampling-methods-stats/v/introduction-to-sampling-methods" },
    { title: "Statistics", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  Circles: [
    { title: "Circumference & Area", provider: "Khan Academy", url: "https://www.khanacademy.org/math/geometry-home/geometry-area-perimeter/geometry-area-circles/v/area-of-a-circle" },
    { title: "Circles", provider: "YouTube", url: "https://www.youtube.com/watch?v=AfTawqNEJg0" },
  ],
  "Angles & Triangles": [
    { title: "Angle Relationships", provider: "Khan Academy", url: "https://www.khanacademy.org/math/geometry-home/geometry-angle/geometry-angles-between-lines/v/proof-vertical-angles-are-equal" },
    { title: "Triangle Angles", provider: "YouTube", url: "https://www.youtube.com/watch?v=NVuMULQjb3o" },
  ],
  "Scale Drawings": [
    { title: "Scale Drawings", provider: "Khan Academy", url: "https://www.khanacademy.org/math/cc-seventh-grade-math/cc-7th-geometry/cc-7th-scale-drawings/v/scale-drawings" },
    { title: "Scale Factor", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Square Roots": [
    { title: "Square Roots", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra/pre-algebra-exponents-radicals/pre-algebra-square-roots/v/introduction-to-square-roots" },
    { title: "Perfect Squares", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Linear Patterns": [
    { title: "Linear Relationships", provider: "Khan Academy", url: "https://www.khanacademy.org/math/cc-seventh-grade-math/cc-7th-ratio-proportion/cc-7th-proportional-relationships/v/proportional-relationships" },
    { title: "Slope Intro", provider: "YouTube", url: "https://www.youtube.com/watch?v=9XzfQUXqiYY" },
  ],
  "Pre-Algebra Mixed Review": [
    { title: "Pre-Algebra Overview", provider: "Khan Academy", url: "https://www.khanacademy.org/math/pre-algebra" },
    { title: "Pre-Algebra Playlist", provider: "YouTube", url: "https://www.youtube.com/watch?v=dAgfnK528ra" },
  ],
  // ── English / Reading ──
  "Main Idea": [
    { title: "Main Idea", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/main-idea/v/main-idea" },
    { title: "Finding Main Idea", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Supporting Details": [
    { title: "Supporting Details", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/main-idea/v/supporting-details" },
    { title: "Details in Reading", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Vocabulary in Context": [
    { title: "Context Clues", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/vocabulary/v/context-clues" },
    { title: "Context Clues Strategy", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Synonyms & Antonyms": [
    { title: "Synonyms & Antonyms", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar/v/introduction-to-synonyms-and-antonyms" },
    { title: "Word Relationships", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Sentence Structure": [
    { title: "Sentences & Fragments", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar/sentence-structure/v/introduction-to-sentences" },
    { title: "Complete Sentences", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Subjects & Predicates": [
    { title: "Subjects & Predicates", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar/sentence-structure/v/subjects-and-predicates" },
    { title: "Parts of a Sentence", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  Capitalization: [
    { title: "Capitalization Rules", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar/punctuation-the-comma-and-the-apostrophe/v/introduction-to-capitalization" },
    { title: "When to Capitalize", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  Punctuation: [
    { title: "Punctuation", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar/punctuation-the-comma-and-the-apostrophe" },
    { title: "Punctuation Basics", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Spelling Patterns": [
    { title: "Spelling Rules", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar/v/spelling" },
    { title: "Spelling Patterns", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Author's Purpose": [
    { title: "Author's Purpose", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/v/author-s-purpose" },
    { title: "PIE: Persuade Inform Entertain", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  Sequence: [
    { title: "Sequence of Events", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/v/sequence" },
    { title: "Order of Events", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Reading Comprehension": [
    { title: "Reading Comprehension", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension" },
    { title: "Reading Strategies", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  Inference: [
    { title: "Making Inferences", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/inference/v/making-inferences" },
    { title: "Inference Skills", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Cause and Effect": [
    { title: "Cause and Effect", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/v/cause-and-effect" },
    { title: "Cause & Effect in Text", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Compare and Contrast": [
    { title: "Compare & Contrast", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/v/compare-and-contrast" },
    { title: "Comparing Texts", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Paragraph Structure": [
    { title: "Paragraph Structure", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/writing/v/introduction-to-paragraphs" },
    { title: "Topic Sentences", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  Grammar: [
    { title: "Grammar Basics", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar" },
    { title: "Parts of Speech", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Verb Tense": [
    { title: "Verb Tenses", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar/parts-of-the-sentence/v/introduction-to-verbs" },
    { title: "Past Present Future", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  Pronouns: [
    { title: "Pronouns", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar/parts-of-the-sentence/v/introduction-to-pronouns" },
    { title: "Pronoun Rules", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  Commas: [
    { title: "Commas", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar/punctuation-the-comma-and-the-apostrophe/v/commas-in-lists" },
    { title: "Comma Rules", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Evidence from Text": [
    { title: "Textual Evidence", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/v/textual-evidence" },
    { title: "Citing Evidence", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Figurative Language": [
    { title: "Figurative Language", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/v/figurative-language" },
    { title: "Similes & Metaphors", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  Theme: [
    { title: "Theme in Literature", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/v/theme" },
    { title: "Finding Theme", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  Summarizing: [
    { title: "Summarizing", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/v/summarizing" },
    { title: "How to Summarize", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Grammar Usage": [
    { title: "Grammar Usage", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar" },
    { title: "Subject-Verb Agreement", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Prefixes & Suffixes": [
    { title: "Prefixes & Suffixes", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar/v/introduction-to-prefixes-and-suffixes" },
    { title: "Word Parts", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Complex Sentences": [
    { title: "Complex Sentences", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar/sentence-structure/v/complex-sentences" },
    { title: "Combining Sentences", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Point of View": [
    { title: "Point of View", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/v/point-of-view" },
    { title: "1st vs 3rd Person", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Text Structure": [
    { title: "Text Structure", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/v/text-structure" },
    { title: "Text Structures", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Short Written Responses": [
    { title: "Short Responses", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/writing/v/introduction-to-paragraphs" },
    { title: "RACE Strategy", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Editing & Revising": [
    { title: "Revising Writing", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/writing/v/revising-writing" },
    { title: "Edit Your Writing", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Argument Structure": [
    { title: "Argument Writing", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/writing/v/introduction-to-argument" },
    { title: "Claims & Evidence", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Text Evidence": [
    { title: "Using Text Evidence", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/v/textual-evidence" },
    { title: "Evidence in Writing", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Author's Craft": [
    { title: "Author's Craft", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/v/author-s-craft" },
    { title: "Word Choice & Tone", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Sentence Correction": [
    { title: "Sentence Correction", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar/sentence-structure" },
    { title: "Fix Grammar Errors", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Parallel Structure": [
    { title: "Parallel Structure", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar/sentence-structure/v/parallel-structure" },
    { title: "Parallelism", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Paragraph Writing": [
    { title: "Paragraph Writing", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/writing/v/introduction-to-paragraphs" },
    { title: "Write a Paragraph", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Active vs Passive Voice": [
    { title: "Active vs Passive Voice", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar/v/active-and-passive-voice" },
    { title: "Voice in Writing", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Research Skills": [
    { title: "Research Skills", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/writing/v/introduction-to-research" },
    { title: "Credible Sources", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Connotation & Denotation": [
    { title: "Connotation & Denotation", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/vocabulary/v/connotation-and-denotation" },
    { title: "Word Meaning", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Analytical Reading": [
    { title: "Analyzing Texts", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension" },
    { title: "Close Reading", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Claims and Evidence": [
    { title: "Claims & Evidence", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/writing/v/introduction-to-argument" },
    { title: "Building Arguments", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  Counterarguments: [
    { title: "Counterarguments", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/writing/v/counterarguments" },
    { title: "Rebuttals", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Grammar Precision": [
    { title: "Advanced Grammar", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/grammar" },
    { title: "Precise Language", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Essay Structure": [
    { title: "Essay Structure", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/writing/v/introduction-to-essays" },
    { title: "5-Paragraph Essay", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Thesis Statements": [
    { title: "Thesis Statements", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/writing/v/thesis-statements" },
    { title: "Writing a Thesis", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Vocabulary Development": [
    { title: "Academic Vocabulary", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/vocabulary" },
    { title: "Word Roots", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
  "Rhetorical Devices": [
    { title: "Rhetorical Devices", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/reading-comprehension/v/rhetorical-devices" },
    { title: "Ethos Pathos Logos", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  Synthesis: [
    { title: "Synthesizing Sources", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/writing/v/synthesizing-sources" },
    { title: "Combining Sources", provider: "YouTube", url: "https://www.youtube.com/watch?v=J7CHvNE3dM8" },
  ],
  "Formal Writing": [
    { title: "Formal Writing", provider: "Khan Academy", url: "https://www.khanacademy.org/humanities/grammar/writing/v/formal-writing" },
    { title: "Academic Tone", provider: "YouTube", url: "https://www.youtube.com/watch?v=2Vajy9Saaoc" },
  ],
};

function fallbackResources(skillTitle: string): LearnResource[] {
  const q = encodeURIComponent(skillTitle);
  const isEnglish =
    /reading|grammar|vocabulary|writing|inference|theme|punctuation|comma|pronoun|essay|text|author|paragraph|summar|spell|capital|synonym|argument|thesis|rhetoric|formal|synthesis|voice|research|connotation|craft|evidence|sequence|purpose|structure|point of view|editing|revising|response|figurative|cause|compare|main idea|supporting|subject|predicate|prefix|suffix|complex|parallel|analytical|counter|claims|formal/i.test(
      skillTitle,
    );

  if (isEnglish) {
    return [
      {
        title: `Learn: ${skillTitle}`,
        provider: "Khan Academy",
        url: `https://www.khanacademy.org/search?page_search_query=${q}`,
      },
      {
        title: "Reading & Grammar",
        provider: "Khan Academy",
        url: "https://www.khanacademy.org/humanities/grammar",
      },
    ];
  }

  return [
    {
      title: `Learn: ${skillTitle}`,
      provider: "Khan Academy",
      url: `https://www.khanacademy.org/search?page_search_query=${q}`,
    },
    {
      title: "Math by Grade",
      provider: "Khan Academy",
      url: "https://www.khanacademy.org/math",
    },
  ];
}

export function getLearningResourcesForSkill(skillTitle: string): LearnResource[] {
  return LIBRARY[skillTitle] ?? fallbackResources(skillTitle);
}

export function allLibrarySkillTitles(): string[] {
  return Object.keys(LIBRARY);
}
