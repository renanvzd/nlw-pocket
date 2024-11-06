import { Dialog } from "./components/ui/dialog";

import { CreateGoal } from "./components/create-goal";
import { Summary } from "./components/summary";
import { useEffect, useState } from "react";
import { EmptyGoals } from "./components/empty-goals";

type SummaryType = {
	completed: number;
	total: number;
	goalsPerDay: Record<string, {
			id: string;
			title: string;
			completedAt: string;
	}[]>;
}

export function App() {
	const [summary, setSummary] = useState<SummaryType | null>(null);

	useEffect(() => {
		fetch("http://localhost:3333/summary")
			.then((response) => {
				return response.json();
			})
			.then((data) => {
				console.log("data", data);
				setSummary(data.summary);
			});
	}, []);

	return (
		<Dialog>
			{(summary && summary.total > 0) ? <Summary /> : <EmptyGoals />}
			<CreateGoal />
		</Dialog>
	);
}
