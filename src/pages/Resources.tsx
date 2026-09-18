import { RESOURCES } from "../lib/questionBank";

export default function Resources() {
  return (
    <div>
      <h1>Topic resource library</h1>
      <p>
        The official FAA source material this question bank is grounded in, plus practical guides for actually
        scheduling and taking the real exam.
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
