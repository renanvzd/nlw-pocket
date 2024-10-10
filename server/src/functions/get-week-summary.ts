import dayjs from "dayjs";
import { db } from "../db";
import { goalCompletions, goals } from "../db/schema";
import { sql, and, gte, lte, eq } from "drizzle-orm";

export async function getWeekSummary() {
	const firstDayOfWeek = dayjs().startOf("week").toDate();
	const lastDayOfWeek = dayjs().endOf("week").toDate();

	// Query to select goals created up to the week
	const goalsCreatedUpToWeek = db.$with("goals_created_up_to_week").as(
		db
			.select({
				id: goals.id,
				title: goals.title,
				desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
				createdAt: goals.createdAt,
			})
			.from(goals)
			.where(lte(goals.createdAt, lastDayOfWeek)),
	);

	// Query to select goals completed within the week
	const goalsCompletedInWeek = db.$with("goals_completed_in_week").as(
		db
			.select({
				id: goalCompletions.id,
				title: goals.title,
				completedAt: goalCompletions.createdAt,
				completedAtDate: sql`DATE(${goalCompletions.createdAt})`.as("completedAtDate"),
			})
			.from(goalCompletions)
			.innerJoin(goals, eq(goals.id, goalCompletions.goalId))
			.where(
				and(
					gte(goalCompletions.createdAt, firstDayOfWeek),
					lte(goalCompletions.createdAt, lastDayOfWeek),
				)
			)
	);

	// Aggregating completions by day of the week
	const goalsCompletedByWeekDay = db.$with("goals_completed_by_week_day").as(
		db
			.select({
				completedAtDate: goalsCompletedInWeek.completedAtDate,
				completions: sql`
					JSON_AGG(
						JSON_BUILD_OBJECT(
							'id', ${goalsCompletedInWeek.id},
							'title', ${goalsCompletedInWeek.title},
							'completedAt', ${goalsCompletedInWeek.completedAt}
						)
					)`.as("completions"),
			})
			.from(goalsCompletedInWeek)
			.groupBy(goalsCompletedInWeek.completedAtDate),
	);

	// Selecting final result and counting completed goals
	const result = await db
		.with(goalsCreatedUpToWeek, goalsCompletedInWeek, goalsCompletedByWeekDay)
		.select({
			completed: 
			sql`(SELECT COUNT(*) FROM ${goalsCompletedInWeek})`.mapWith(
				Number
			),
			total: sql /*sql*/`(SELECT SUM(${goalsCreatedUpToWeek.desiredWeeklyFrequency}) FROM ${goalsCreatedUpToWeek})`.mapWith(
				Number,
			),
			goalsPerDay: sql/*sql*/`
			JSON_OBJECT_AGG(
				${goalsCompletedByWeekDay.completedAtDate},
				${goalsCompletedByWeekDay.completions}
			)
			`
		})
		.from(goalsCompletedByWeekDay)

	return {
		summary: result,
	};
}