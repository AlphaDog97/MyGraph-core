import { ManifestCategory, ManifestGraph } from "../domain/types";
import Select, { StylesConfig } from "react-select";

interface Props {
  categories: ManifestCategory[];
  graphs: ManifestGraph[];
  categoryId: string;
  graphId: string;
  onCategoryChange: (categoryId: string) => void;
  onGraphChange: (graphId: string) => void;
}

export default function GraphSelector({
  categories,
  graphs,
  categoryId,
  graphId,
  onCategoryChange,
  onGraphChange,
}: Props) {
  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.label,
  }));
  const graphOptions = graphs.map((graph) => ({
    value: graph.id,
    label: graph.label,
  }));

  const selectStyles: StylesConfig<{ value: string; label: string }, false> = {
    control: (base, state) => ({
      ...base,
      minHeight: 36,
      borderRadius: 8,
      borderColor: state.isFocused ? "#5a67d8" : "#e2e8f0",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(90, 103, 216, 0.12)" : "none",
      fontSize: 13,
      fontWeight: 500,
      color: "#2d3748",
      cursor: "pointer",
      "&:hover": {
        borderColor: state.isFocused ? "#5a67d8" : "#cbd5e0",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "0 10px",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: "#718096",
      paddingRight: 8,
      paddingLeft: 4,
    }),
    menu: (base) => ({
      ...base,
      borderRadius: 8,
      overflow: "hidden",
      zIndex: 60,
    }),
    option: (base, state) => ({
      ...base,
      fontSize: 13,
      backgroundColor: state.isSelected
        ? "rgba(90, 103, 216, 0.12)"
        : state.isFocused
          ? "#edf2f7"
          : "#fff",
      color: "#2d3748",
      cursor: "pointer",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#2d3748",
    }),
  };

  return (
    <div className="graph-selector">
      <Select
        className="selector-dropdown"
        classNamePrefix="selector-react"
        value={categoryOptions.find((option) => option.value === categoryId) ?? null}
        onChange={(option) => {
          if (option) onCategoryChange(option.value);
        }}
        options={categoryOptions}
        isSearchable={false}
        aria-label="Select category"
        styles={selectStyles}
      />

      <span className="selector-sep">/</span>

      <Select
        className="selector-dropdown"
        classNamePrefix="selector-react"
        value={graphOptions.find((option) => option.value === graphId) ?? null}
        onChange={(option) => {
          if (option) onGraphChange(option.value);
        }}
        options={graphOptions}
        isSearchable={false}
        aria-label="Select graph"
        styles={selectStyles}
      />
    </div>
  );
}
