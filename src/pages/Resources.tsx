import { RESOURCES } from "../lib/questionBank";

export default function Resources() {
  return (
    <div>
      <h1>Topic resource library</h1>
      <p>
        Every question in this bank is grounded in the FAA's own testing supplement, linked below. It contains the
        sectional chart legend, all figures used throughout the bank, and the weather and performance products
        referenced in explanations.
      </p>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Publisher</th>
              <th>Covers</th>
              <th>Last reviewed</th>
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map((r) => (
              <tr key={r.id}>
                <td>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.title}
                  </a>
                </td>
                <td>{r.publisher}</td>
                <td>{r.topic}</td>
                <td>{r.lastReviewed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
