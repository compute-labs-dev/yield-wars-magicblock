import { Button } from "@/components/ui/Button";

interface SupplyShackTabsProps {
    activeTab: "store" | "inventory";
    onTabChange: (tab: "store" | "inventory") => void;
}

export function SupplyShackTabs({ activeTab, onTabChange }: SupplyShackTabsProps) {
    return (
        <div className="flex flex-row justify-start">
            <Button
                variant="ghost"
                onClick={() => onTabChange("store")}
                className={`text-[#39FF14] px-4 py-2 text-2xl font-medium rounded-md transition-colors ${
                    activeTab === "store"
                        && "underline"
                }`}
            >
                Store
            </Button>
            <Button
                variant="ghost"
                onClick={() => onTabChange("inventory")}
                className={`text-[#39FF14] px-4 py-2 text-2xl font-medium rounded-md transition-colors ${
                    activeTab === "inventory"
                        && "underline"
                }`}
            >
                Inventory
            </Button>
        </div>
    );
} 