import multiRewindsTab from "../../../assets/tab-multi-rewinds.svg";
import rewindsTab from "../../../assets/tab-rewinds.svg";

type RewindsFilterBarProps = {
  activeTab: "rewinds" | "multi";
  searchTerm: string;
  onTabChange: (tab: "rewinds" | "multi") => void;
  onSearchTermChange: (value: string) => void;
};

export function RewindsFilterBar({
  activeTab,
  searchTerm,
  onTabChange,
  onSearchTermChange,
}: RewindsFilterBarProps) {
  return (
    <>
      <div className="rewinds-tabs">
        <button
          className={`rewinds-tab ${activeTab === "rewinds" ? "rewinds-tab--pink" : ""}`}
          type="button"
          onClick={() => onTabChange("rewinds")}
        >
          <img src={rewindsTab} alt="Rewinds" />
        </button>
        <button
          className={`rewinds-tab ${activeTab === "multi" ? "rewinds-tab--green" : ""}`}
          type="button"
          onClick={() => onTabChange("multi")}
        >
          <img src={multiRewindsTab} alt="Multi-Rewinds" />
        </button>
      </div>

      <div className="rewinds-section-title">
        <h2>{activeTab === "rewinds" ? "Rewinds" : "Multi-Rewinds"}</h2>
      </div>

      <section className="rewinds-search-panel">
        <label className="rewinds-search">
          <span>Search friends</span>
          <input
            placeholder={
              activeTab === "rewinds"
                ? "Search by username"
                : "Search by participant's username"
            }
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
          />
        </label>
      </section>
    </>
  );
}
