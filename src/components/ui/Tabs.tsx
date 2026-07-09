interface Tab {
  id: string,
  label: string
}

interface TabsProps {
  tabs: Tab[],
  active: string,
  onChange: (id: string) => void
}

const Tabs = ({ tabs, active, onChange }: TabsProps) => (
  <div>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px ${
          active === tab.id
            ? 'border-[#e3350d] text-[#f0f0f0]'
            : 'border-transparent text-[#888] hover:text-[#f0f0f0]'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default Tabs
