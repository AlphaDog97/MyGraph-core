import { edgeTypeLegendItems } from "../domain/edgeTypes";

export default function EdgeTypeLegend() {
  const items = edgeTypeLegendItems();

  return (
    <div className="legend-panel edge-legend-panel">
      <h3 className="legend-title">Relations</h3>
      <ul className="legend-list">
        {items.map((item) => (
          <li key={item.type} className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: item.color }} />
            <span className="legend-label">{item.type}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
