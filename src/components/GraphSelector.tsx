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
      backgroundColor: "var(--color-input-bg)",
      borderColor: state.isFocused ? "#5a67d8" : "var(--color-border)",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(90, 103, 216, 0.12)" : "none",
      fontSize: 13,
      fontWeight: 500,
      color: "var(--color-text)",
      cursor: "pointer",
      "&:hover": {
        borderColor: state.isFocused ? "#5a67d8" : "var(--color-border-strong)",
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
      color: "var(--color-muted)",
      paddingRight: 8,
      paddingLeft: 4,
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "var(--color-panel-bg)",
      border: "1px solid var(--color-border)",
      borderRadius: 8,
      overflow: "hidden",
      zIndex: 60,
    }),
    option: (base, state) => ({
      ...base,
      fontSize: 13,
      backgroundColor: state.isSelected
        ? "var(--color-option-selected-bg)"
        : state.isFocused
          ? "var(--color-option-hover-bg)"
          : "var(--color-panel-bg)",
      color: "var(--color-text)",
      cursor: "pointer",
    }),
    singleValue: (base) => ({
      ...base,
      color: "var(--color-text)",
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
