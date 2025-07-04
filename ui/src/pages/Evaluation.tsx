import { useState, Fragment } from "react";

const SUS_QUESTIONS = [
  "I think that I would like to use this system frequently.",
  "I found the system unnecessarily complex.",
  "I thought the system was easy to use.",
  "I think that I would need the support of a technical person to be able to use this system.",
  "I found the various functions in this system were well integrated.",
  "I thought there was too much inconsistency in this system.",
  "I would imagine that most people would learn to use this system very quickly.",
  "I found the system very cumbersome to use.",
  "I felt very confident using the system.",
  "I needed to learn a lot of things before I could get going with this system.",
];

const QED_PAIRS: Array<[string,string]> = [
  ["annoying","enjoyable"],
  ["not understandable","understandable"],
  ["creative","dull"],
  ["easy to learn","difficult to learn"],
  ["valuable","inferior"],
  ["boring","exciting"],
  ["not interesting","interesting"],
  ["unpredictable","predictable"],
  ["fast","slow"],
  ["inventive","conventional"],
  ["obstructive","supportive"],
  ["good","bad"],
  ["complicated","easy"],
  ["unlikable","pleasing"],
  ["usual","leading edge"],
  ["unpleasant","pleasant"],
  ["secure","not secure"],
  ["motivating","demotivating"],
  ["meets expectations","does not meet expectations"],
  ["inefficient","efficient"],
  ["clear","confusing"],
  ["impractical","practical"],
  ["organized","cluttered"],
  ["attractive","unattractive"],
  ["friendly","unfriendly"],
  ["conservative","innovative"],
];

function downloadCSV(rows: string[][], filename = "evaluation.csv") {
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


export default function Evaluation() {
  // SUS answers: 1–5
  const [sus, setSus] = useState<Array<number | null>>(
    Array(SUS_QUESTIONS.length).fill(null)
  );
  // QED answers: 1–5
  const [qed, setQed] = useState<Array<number | null>>(
    Array(QED_PAIRS.length).fill(null)
  );
  const handleDownload = () => {
    const header = ["Question Type", "Question", "Number", "Answer"];
    const susRows = SUS_QUESTIONS.map((q, i) => [
      "SUS",
      q,
      (i + 1).toString(),
      sus[i] !== null ? sus[i].toString() : "",
    ]);
    const qedRows = QED_PAIRS.map(([l, r], i) => [
      "QED",
      `${l} - ${r}`,
      (i + 1).toString(),
      qed[i] !== null ? qed[i].toString() : "",
    ]);
    downloadCSV([header, ...susRows, ...qedRows]);
  };

  const handleEmail = () => {
    const id = prompt("Please enter an identifier (your name)");
    if (id === null || id.trim() === "") {
      return;
    }
    const header = ["Question Type", "Number", "Question", "Answer"];
    const susRows = SUS_QUESTIONS.map((q, i) => [
      "SUS",
      q,
      (i + 1).toString(),
      sus[i] !== null ? sus[i].toString() : "",
    ]);
    const qedRows = QED_PAIRS.map(([l, r], i) => [
      "QED",
      `${l} - ${r}`,
      (i + 1).toString(),
      qed[i] !== null ? qed[i].toString() : "",
    ]);
    const rows = [header, ...susRows, ...qedRows];
    const csv = rows.map(r => r.join(",")).join("\n");
    const subject = encodeURIComponent("Evaluation Results");
    const bodyText = `Participant ID: ${id}\n\n${csv}`;
    const body = encodeURIComponent(bodyText);
    window.location.href = 
      `mailto:nils-jonathan.friedrich@informatik.tu-freiberg.de` +
      `?subject=${subject}&body=${body}`;  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Evaluation</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-medium">System Usability Scale (SUS) (1: I don't agree at all, 5: I fully agree)</h2>
        {SUS_QUESTIONS.map((q, i) => (
          <div key={i} className="space-y-1">
            <p className="text-sm">{i + 1}. {q}</p>
            <div className="flex space-x-2">
              {[1,2,3,4,5].map((val) => (
                <label key={val} className="inline-flex items-center">
                  <input
                    type="radio"
                    name={`sus-${i}`}
                    value={val}
                    checked={sus[i] === val}
                    onChange={() => {
                      const copy = [...sus];
                      copy[i] = val;
                      setSus(copy);
                    }}
                  />
                  <span className="ml-1">{val}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium">User Experience Questionnaire (UEQ)</h2>
        <div className="overflow-x-auto">
          <div
            className="
              min-w-max
              grid
              grid-cols-[8rem_repeat(7,2rem)_8rem]
              gap-x-2
              gap-y-4
              text-xs
              text-gray-600
            "
          >
            {/* header row */}
            <div/>
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="text-center">{i + 1}</div>
            ))}
            <div/>

            {/* each bipolar scale row */}
            {QED_PAIRS.map(([left, right], i) => (
              <Fragment key={i}>
                <div className="whitespace-nowrap text-gray-700">{left}</div>
                {Array.from({ length: 7 }, (_, v) => v + 1).map((val) => (
                  <div key={val} className="flex items-center justify-center">
                    <input
                      type="radio"
                      name={`qed-${i}`}
                      value={val}
                      checked={qed[i] === val}
                      onChange={() => {
                        const copy = [...qed];
                        copy[i] = val;
                        setQed(copy);
                      }}
                      className="h-4 w-4 text-brand focus:ring-brand"
                    />
                  </div>
                ))}
                <div className="whitespace-nowrap text-gray-700">{right}</div>
                <hr className="col-span-full border-gray-300" />
              </Fragment>
            ))}
          </div>
        </div>
       </section>

      <div className="flex space-x-2">
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-dark"
        >
          Download Answers (CSV)
        </button>
        <button
          onClick={handleEmail}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Send per mail
        </button>
      </div>
     </div>
  );
}